#!/usr/bin/env node
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  openSync,
  readSync,
  closeSync,
  statSync,
  writeFileSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir, tmpdir } from 'node:os';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const PORT = Number(process.env.MEDIA_PORT || 3847);
const ROOT_FILE = join(fileURLToPath(new URL('..', import.meta.url)), '.media-root');
const ART_DIR = join(tmpdir(), 'ipod-snapshot-art');

const AUDIO_EXT = new Set(['.mp3', '.m4a', '.aac', '.wav', '.aiff', '.aif', '.flac', '.ogg', '.oga', '.wma', '.alac', '.m4b', '.mp2', '.opus', '.caf']);
const VIDEO_EXT = new Set(['.mp4', '.m4v', '.mov', '.avi', '.mkv', '.3gp', '.webm', '.mpg', '.mpeg', '.wmv']);
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.heif', '.tif', '.tiff']);
const COVER_NAMES = new Set(['cover.jpg', 'cover.jpeg', 'cover.png', 'folder.jpg', 'folder.jpeg', 'folder.png', 'albumart.jpg', 'albumart.jpeg', 'albumart.png', 'front.jpg', 'front.jpeg', 'front.png', 'artwork.jpg', 'artwork.png']);
const SKIP_DIRS = new Set(['system volume information', '$recycle.bin', '.trash', '.trashes', 'lost+found', 'data', 'obb', 'cache', 'node_modules']);
const MIME = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.m4b': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.m4v': 'video/x-m4v',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.txt': 'text/plain',
};

let rootDir = '';
let catalog = null;

function hashId(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function parseFilename(name) {
  const base = name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
  const match = base.match(/^(\d{1,3})\s*[-.]\s*(.+)$/);
  if (match) return { trackNumber: parseInt(match[1], 10), title: match[2].trim() };
  return { title: base };
}

function classifyAudio(path, ext) {
  const p = path.toLowerCase();
  if (ext === '.m4b' || /audiobook/.test(p)) return 'audiobook';
  if (/podcast/.test(p)) return 'podcast';
  if (/music\s*video/.test(p)) return 'musicVideo';
  return 'song';
}

function classifyVideo(path, parent) {
  const p = `${path}/${parent}`.toLowerCase();
  if (/camera|dcim|recorded/.test(p)) return 'camera';
  if (/music\s*video/.test(p)) return 'musicVideo';
  if (/podcast/.test(p)) return 'podcast';
  if (/tv\s*show|season\s*\d|s\d{1,2}e\d{1,2}/.test(p)) return 'tvShow';
  return 'movie';
}

function decodeLatin1(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]);
  return out;
}

function decodeUtf16(bytes, littleEndian) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let out = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const c = view.getUint16(i, littleEndian);
    if (c === 0) break;
    out += String.fromCharCode(c);
  }
  return out;
}

function decodeText(bytes) {
  if (bytes.length === 0) return '';
  const encoding = bytes[0];
  const data = bytes.subarray(1);
  if (encoding === 0) return decodeLatin1(data).replace(/\0+$/, '');
  if (encoding === 3) return new TextDecoder('utf-8').decode(data).replace(/\0+$/, '');
  if (encoding === 1) {
    const bom = data.length >= 2 ? (data[0] << 8) | data[1] : 0;
    const le = bom === 0xfffe;
    const payload = bom === 0xfeff || bom === 0xfffe ? data.subarray(2) : data;
    return decodeUtf16(payload, le || bom === 0);
  }
  if (encoding === 2) return decodeUtf16(data, false);
  return decodeLatin1(data);
}

function readSynchsafe(b, offset) {
  return ((b[offset] & 0x7f) << 21) | ((b[offset + 1] & 0x7f) << 14) | ((b[offset + 2] & 0x7f) << 7) | (b[offset + 3] & 0x7f);
}

function parseId3(buffer) {
  const tags = {};
  if (buffer.length < 10 || buffer[0] !== 0x49 || buffer[1] !== 0x44 || buffer[2] !== 0x33) return tags;
  const version = buffer[3];
  const tagSize = readSynchsafe(buffer, 6);
  const end = Math.min(buffer.length, 10 + tagSize);
  let offset = 10;
  while (offset + 10 < end) {
    const id = version === 2
      ? String.fromCharCode(buffer[offset], buffer[offset + 1], buffer[offset + 2])
      : String.fromCharCode(buffer[offset], buffer[offset + 1], buffer[offset + 2], buffer[offset + 3]);
    if (!id[0] || id[0] === '\u0000') break;
    let size;
    let header = 10;
    if (version === 2) {
      size = (buffer[offset + 3] << 16) | (buffer[offset + 4] << 8) | buffer[offset + 5];
      header = 6;
    } else {
      size = version >= 4 ? readSynchsafe(buffer, offset + 4) : (buffer[offset + 4] << 24) | (buffer[offset + 5] << 16) | (buffer[offset + 6] << 8) | buffer[offset + 7];
    }
    if (size <= 0) break;
    const data = buffer.subarray(offset + header, Math.min(offset + header + size, buffer.length));
    if (id === 'TIT2' || id === 'TT2') tags.title = decodeText(data);
    else if (id === 'TPE1' || id === 'TP1') tags.artist = decodeText(data);
    else if (id === 'TALB' || id === 'TAL') tags.album = decodeText(data);
    else if (id === 'TPE2') tags.albumArtist = decodeText(data);
    else if (id === 'TCON' || id === 'TCO') tags.genre = decodeText(data).replace(/^\(\d+\)/, '').trim();
    else if (id === 'TCOM') tags.composer = decodeText(data);
    else if (id === 'TYER' || id === 'TDRC') {
      const year = parseInt(decodeText(data).slice(0, 4), 10);
      if (Number.isFinite(year)) tags.year = year;
    } else if (id === 'TRCK') {
      const n = parseInt(decodeText(data).split('/')[0] ?? '', 10);
      if (Number.isFinite(n)) tags.trackNumber = n;
    } else if (id === 'APIC' || id === 'PIC') {
      if (data.length > 10) {
        let i = 1;
        while (i < data.length && data[i] !== 0) i += 1;
        const mime = decodeLatin1(data.subarray(1, i)) || 'image/jpeg';
        i += 2;
        while (i < data.length && data[i] !== 0) i += 1;
        i += 1;
        tags.artwork = { mime, bytes: data.subarray(Math.min(i, data.length)) };
      }
    }
    offset += header + size;
  }
  return tags;
}

function readId3Head(filePath) {
  try {
    const fd = openSync(filePath, 'r');
    const buf = Buffer.alloc(256 * 1024);
    const n = readSync(fd, buf, 0, buf.length, 0);
    closeSync(fd);
    return parseId3(buf.subarray(0, n));
  } catch {
    return {};
  }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolvePromise) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'], ...opts });
    let out = '';
    child.stdout.on('data', (d) => {
      out += d.toString();
    });
    child.on('error', () => resolvePromise(''));
    child.on('close', () => resolvePromise(out.trim()));
  });
}

function winToPosix(p) {
  const wsl = p.match(/^\\\\wsl(?:\.localhost)?\\[^\\]+\\(.*)$/i);
  if (wsl) return `/${wsl[1].replace(/\\/g, '/')}`;
  const drive = p.match(/^([A-Za-z]):[\\/](.*)$/);
  if (drive) return `/mnt/${drive[1].toLowerCase()}/${drive[2].replace(/\\/g, '/')}`;
  return p.replace(/\\/g, '/');
}

async function pickFolderDialog({ silent = false } = {}) {
  const ps = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$d = New-Object System.Windows.Forms.FolderBrowserDialog',
    "$d.Description = 'Choose the iPod nano library folder'",
    '$d.ShowNewFolderButton = $true',
    "if ($d.ShowDialog() -eq 'OK') { Write-Output $d.SelectedPath }",
  ].join('; ');
  const fromWindows = await run('powershell.exe', ['-STA', '-NoProfile', '-Command', ps]);
  if (fromWindows) return winToPosix(fromWindows);

  const osa = await run('osascript', ['-e', 'try\nPOSIX path of (choose folder with prompt "Choose the iPod nano library folder")\nend try']);
  if (osa) return osa.replace(/\/$/, '');

  const zenity = await run('zenity', ['--file-selection', '--directory', '--title=Choose the iPod nano library folder']);
  if (zenity) return zenity;

  const kdialog = await run('kdialog', ['--getexistingdirectory', homedir(), 'Choose the iPod nano library folder']);
  if (kdialog) return kdialog;

  if (!silent && process.stdin.isTTY) {
    const rl = createInterface({ input, output });
    const typed = await rl.question('Folder path on this computer: ');
    rl.close();
    return typed.trim();
  }
  return '';
}

function saveRoot(dir) {
  writeFileSync(ROOT_FILE, dir);
}

function loadSavedRoot() {
  try {
    const saved = readFileSync(ROOT_FILE, 'utf8').trim();
    if (saved && existsSync(saved)) return saved;
  } catch {
    /* ignore */
  }
  return '';
}

function walk(dir, files = [], depth = 0) {
  if (depth > 14 || files.length > 40000) return files;
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const name = entry.name;
    const full = join(dir, name);
    if (entry.isDirectory()) {
      if (name.startsWith('.') || SKIP_DIRS.has(name.toLowerCase())) continue;
      walk(full, files, depth + 1);
      continue;
    }
    const ext = extname(name).toLowerCase();
    let kind = null;
    if (AUDIO_EXT.has(ext)) kind = 'audio';
    else if (VIDEO_EXT.has(ext)) kind = 'video';
    else if (IMAGE_EXT.has(ext)) kind = 'image';
    else if (ext === '.txt') kind = 'text';
    if (!kind) continue;
    files.push({ full, name, ext, kind, folder: basename(dirname(full)), parent: dirname(full) });
  }
  return files;
}

function mediaUrl(rel) {
  return `/media/${rel.split(sep).map(encodeURIComponent).join('/')}`;
}

function buildCatalog(dir) {
  mkdirSync(ART_DIR, { recursive: true });
  const files = walk(dir);
  const covers = new Map();
  for (const f of files) {
    if (f.kind !== 'image') continue;
    if (COVER_NAMES.has(f.name.toLowerCase()) && !covers.has(f.parent)) {
      covers.set(f.parent, mediaUrl(relative(dir, f.full)));
    }
  }
  for (const f of files) {
    if (f.kind !== 'image') continue;
    if (!covers.has(f.parent)) covers.set(f.parent, mediaUrl(relative(dir, f.full)));
  }

  const songs = [];
  const videos = [];
  const photos = [];
  const notes = [];
  let bytes = 0;

  for (const f of files) {
    let size = 0;
    try {
      size = statSync(f.full).size;
      bytes += size;
    } catch {
      /* ignore */
    }
    const rel = relative(dir, f.full);
    const uri = mediaUrl(rel);
    const id = hashId(rel);
    if (f.kind === 'audio') {
      const parsed = parseFilename(f.name);
      const parts = rel.split(sep);
      const albumGuess = parts.length > 1 ? parts[parts.length - 2] : f.folder;
      const artistGuess = parts.length > 2 ? parts[parts.length - 3] : 'Unknown Artist';
      const tags = readId3Head(f.full);
      let artworkUri = covers.get(f.parent);
      if (tags.artwork?.bytes?.length > 40) {
        const ext = (tags.artwork.mime || '').includes('png') ? 'png' : 'jpg';
        const artPath = join(ART_DIR, `${id}.${ext}`);
        try {
          writeFileSync(artPath, tags.artwork.bytes);
          artworkUri = `/art/${id}.${ext}`;
        } catch {
          /* keep folder art */
        }
      }
      songs.push({
        id,
        uri,
        title: tags.title || parsed.title || f.name,
        artist: tags.artist || artistGuess || 'Unknown Artist',
        album: tags.album || albumGuess || 'Unknown Album',
        albumArtist: tags.albumArtist || tags.artist || artistGuess || 'Unknown Artist',
        genre: tags.genre || 'Unknown',
        composer: tags.composer || '',
        year: tags.year,
        trackNumber: tags.trackNumber || parsed.trackNumber,
        kind: classifyAudio(rel, f.ext),
        playCount: 0,
        rating: 0,
        folder: f.folder,
        artworkUri,
      });
    } else if (f.kind === 'video') {
      const parsed = parseFilename(f.name);
      const tv = rel.match(/s(\d{1,2})e(\d{1,2})/i);
      videos.push({
        id,
        uri,
        title: parsed.title || f.name,
        kind: classifyVideo(rel, f.folder),
        show: tv ? f.folder : undefined,
        season: tv ? parseInt(tv[1], 10) : undefined,
        episode: tv ? parseInt(tv[2], 10) : undefined,
        artworkUri: covers.get(f.parent),
        folder: f.folder,
      });
    } else if (f.kind === 'image' && !COVER_NAMES.has(f.name.toLowerCase())) {
      photos.push({ id, uri, album: f.folder || 'Photo Library', folder: f.folder });
    } else if (f.kind === 'text') {
      let body = '';
      try {
        body = readFileSync(f.full, 'utf8');
      } catch {
        /* empty */
      }
      notes.push({ id, title: parseFilename(f.name).title, body });
    }
  }

  songs.sort((a, b) => a.title.localeCompare(b.title) || a.artist.localeCompare(b.artist));
  videos.sort((a, b) => a.title.localeCompare(b.title));
  photos.sort((a, b) => a.album.localeCompare(b.album) || a.uri.localeCompare(b.uri));

  return {
    songs,
    videos,
    photos,
    notes,
    scannedAt: Date.now(),
    rootUri: `computer://${dir}`,
    rootName: basename(dir) || dir,
    bytes,
  };
}

function setRoot(dir) {
  const resolved = resolve(dir);
  if (!existsSync(resolved) || !statSync(resolved).isDirectory()) {
    throw new Error(`Not a folder: ${dir}`);
  }
  rootDir = resolved;
  saveRoot(resolved);
  catalog = buildCatalog(resolved);
  return catalog;
}

function safeJoin(rel) {
  const decoded = rel.split('/').map(decodeURIComponent).join(sep);
  const full = resolve(rootDir, decoded);
  if (!full.startsWith(rootDir + sep) && full !== rootDir) return null;
  return full;
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Range',
    'Access-Control-Expose-Headers': 'Content-Range,Accept-Ranges,Content-Length',
  });
  res.end(data);
}

function sendFile(req, res, filePath) {
  let stat;
  try {
    stat = statSync(filePath);
  } catch {
    res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
    res.end('Not found');
    return;
  }
  const ext = extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const range = req.headers.range;
  const headers = {
    'Content-Type': type,
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'Content-Range,Accept-Ranges,Content-Length',
    'Cache-Control': 'public, max-age=3600',
  };
  if (range) {
    const match = range.match(/bytes=(\d*)-(\d*)/);
    let start = match?.[1] ? Number(match[1]) : 0;
    let end = match?.[2] ? Number(match[2]) : stat.size - 1;
    if (Number.isNaN(start)) start = 0;
    if (Number.isNaN(end) || end >= stat.size) end = stat.size - 1;
    if (start > end || start >= stat.size) {
      res.writeHead(416, { ...headers, 'Content-Range': `bytes */${stat.size}` });
      res.end();
      return;
    }
    res.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Content-Length': end - start + 1,
    });
    createReadStream(filePath, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...headers, 'Content-Length': stat.size });
  createReadStream(filePath).pipe(res);
}

async function handlePick() {
  const chosen = await pickFolderDialog({ silent: true });
  if (!chosen) throw new Error('No folder selected');
  return setRoot(chosen);
}

function handler(req, res) {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Range',
    });
    res.end();
    return;
  }

  if (url.pathname === '/status') {
    sendJson(res, 200, {
      ok: true,
      root: rootDir || null,
      name: rootDir ? basename(rootDir) : null,
      songs: catalog?.songs.length ?? 0,
      videos: catalog?.videos.length ?? 0,
      photos: catalog?.photos.length ?? 0,
    });
    return;
  }

  if (url.pathname === '/catalog') {
    if (!catalog) {
      sendJson(res, 409, { error: 'No computer folder selected yet. Choose Computer Folder from the iPod, or run npm run media -- /path/to/folder' });
      return;
    }
    sendJson(res, 200, catalog);
    return;
  }

  if (url.pathname === '/pick' && (req.method === 'POST' || req.method === 'GET')) {
    handlePick()
      .then((lib) => sendJson(res, 200, lib))
      .catch((e) => sendJson(res, 400, { error: e instanceof Error ? e.message : 'Pick failed' }));
    return;
  }

  if (url.pathname.startsWith('/media/')) {
    if (!rootDir) {
      res.writeHead(409, { 'Access-Control-Allow-Origin': '*' });
      res.end('No folder');
      return;
    }
    const rel = url.pathname.slice('/media/'.length);
    const full = safeJoin(rel);
    if (!full) {
      res.writeHead(403, { 'Access-Control-Allow-Origin': '*' });
      res.end('Forbidden');
      return;
    }
    sendFile(req, res, full);
    return;
  }

  if (url.pathname.startsWith('/art/')) {
    const name = basename(url.pathname);
    sendFile(req, res, join(ART_DIR, name));
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--background');
  const wantPick = args.includes('--pick');
  const pathArg = args.find((a) => !a.startsWith('--'));
  const fromEnv = process.env.MEDIA_ROOT;
  const initial = pathArg || fromEnv || loadSavedRoot();

  if (wantPick || !initial) {
    if (wantPick || process.stdin.isTTY) {
      try {
        const chosen = await pickFolderDialog();
        if (chosen) setRoot(chosen);
      } catch (e) {
        console.error(e instanceof Error ? e.message : e);
      }
    }
  } else {
    try {
      setRoot(initial);
    } catch (e) {
      console.error(e instanceof Error ? e.message : e);
    }
  }

  const server = createServer(handler);
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.log(`Computer library server already running on port ${PORT}`);
      if (process.argv.includes('--background')) return;
      process.exit(0);
    }
    throw err;
  });
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Computer library server: http://0.0.0.0:${PORT}`);
    if (rootDir) console.log(`Serving ${rootDir} (${catalog?.songs.length ?? 0} songs, ${catalog?.videos.length ?? 0} videos)`);
    else console.log('No folder yet. Choose Computer Folder on the iPod, or: npm run media -- /path/to/folder');
    try {
      const proc = readFileSync('/proc/version', 'utf8');
      if (/microsoft/i.test(proc)) {
        console.log('WSL2: set EXPO_PUBLIC_MEDIA_HOST to your Windows LAN IP if the phone cannot connect.');
      }
    } catch {
      /* not Linux */
    }
  });
}

await main();
