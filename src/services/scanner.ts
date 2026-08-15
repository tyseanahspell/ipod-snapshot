import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import type { Library, NoteItem, PhotoItem, Song, VideoItem } from '../types';
import { computerBaseUrl, localizeLibrary } from './host';
import {
  AUDIO_EXT,
  COVER_NAMES,
  IMAGE_EXT,
  VIDEO_EXT,
  classifyAudio,
  classifyVideo,
  extOf,
  hashId,
  parseFilename,
  parseId3,
  shouldSkipDir,
} from './id3';

export type ScanProgress = {
  phase: 'listing' | 'tagging' | 'done';
  files: number;
  tagged: number;
  message: string;
};

const MAX_FILES = 40000;
const MAX_DEPTH = 14;
const ID3_BYTES = 256 * 1024;

function isDir(entry: Directory | File): entry is Directory {
  return typeof (entry as Directory).list === 'function';
}

function decodeName(uri: string): string {
  const trimmed = uri.replace(/\/+$/, '');
  const last = trimmed.split('/').pop() ?? trimmed;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

function parentFolder(uri: string): string {
  const trimmed = uri.replace(/\/+$/, '');
  const parts = trimmed.split('/');
  parts.pop();
  try {
    return decodeURIComponent(parts.pop() ?? '');
  } catch {
    return parts.pop() ?? '';
  }
}

function pathHint(uri: string): string {
  try {
    return decodeURIComponent(uri);
  } catch {
    return uri;
  }
}

function guessFromPath(uri: string): { artist?: string; album?: string } {
  const hint = pathHint(uri).replace(/\\/g, '/');
  const parts = hint.split('/').filter(Boolean);
  const file = parts[parts.length - 1] ?? '';
  const album = parts[parts.length - 2];
  const artist = parts[parts.length - 3];
  const skip = new Set(['music', 'songs', 'audio', 'download', 'downloads', 'media', 'dcim', 'movies', 'videos', 'photos', 'pictures']);
  const clean = (v?: string) => {
    if (!v) return undefined;
    const n = v.toLowerCase();
    if (skip.has(n) || n.startsWith('f0') || n.startsWith('content:')) return undefined;
    return v;
  };
  return { album: clean(album), artist: clean(artist) };
}

async function writeArtwork(id: string, mime: string, bytes: Uint8Array): Promise<string | undefined> {
  if (Platform.OS === 'web' || bytes.length < 40) return undefined;
  const ext = mime.includes('png') ? 'png' : 'jpg';
  try {
    const file = new File(Paths.cache, `art-${id}.${ext}`);
    if (file.exists) file.delete();
    file.create();
    file.write(bytes);
    return file.uri;
  } catch {
    return undefined;
  }
}

async function readId3Buffer(file: File): Promise<Uint8Array | null> {
  try {
    const handle = file.open();
    const size = handle.size ?? file.size ?? 0;
    const headLen = Math.min(ID3_BYTES, size);
    const head = handle.readBytes(headLen);
    let combined = head;
    if (size > 128 && size > headLen) {
      handle.offset = Math.max(0, size - 128);
      const tail = handle.readBytes(128);
      combined = new Uint8Array(head.length + tail.length);
      combined.set(head, 0);
      combined.set(tail, head.length);
    }
    handle.close();
    return combined;
  } catch {
    try {
      const bytes = await file.bytes();
      if (bytes.length <= ID3_BYTES + 128) return bytes;
      const combined = new Uint8Array(ID3_BYTES + 128);
      combined.set(bytes.subarray(0, ID3_BYTES), 0);
      combined.set(bytes.subarray(bytes.length - 128), ID3_BYTES);
      return combined;
    } catch {
      return null;
    }
  }
}

type RawFile = {
  uri: string;
  name: string;
  folder: string;
  parentUri: string;
  ext: string;
  kind: 'audio' | 'video' | 'image' | 'text';
};

function collectFromDirectory(root: Directory, onList: (n: number) => void): RawFile[] {
  const out: RawFile[] = [];
  const stack: { dir: Directory; depth: number }[] = [{ dir: root, depth: 0 }];

  while (stack.length && out.length < MAX_FILES) {
    const { dir, depth } = stack.pop()!;
    if (depth > MAX_DEPTH) continue;
    let listed: (Directory | File)[] = [];
    try {
      listed = dir.list();
    } catch {
      continue;
    }
    for (const entry of listed) {
      const directory = isDir(entry);
      const name = decodeName(entry.uri);
      if (directory) {
        if (shouldSkipDir(name)) continue;
        stack.push({ dir: entry as Directory, depth: depth + 1 });
        continue;
      }
      const ext = extOf(name);
      let kind: RawFile['kind'] | null = null;
      if (AUDIO_EXT.has(ext)) kind = 'audio';
      else if (VIDEO_EXT.has(ext)) kind = 'video';
      else if (IMAGE_EXT.has(ext)) kind = 'image';
      else if (ext === '.txt') kind = 'text';
      if (!kind) continue;
      out.push({
        uri: entry.uri,
        name,
        folder: parentFolder(entry.uri),
        parentUri: entry.uri.replace(/\/[^/]+\/?$/, ''),
        ext,
        kind,
      });
      if (out.length % 50 === 0) onList(out.length);
    }
  }
  return out;
}

function folderCovers(files: RawFile[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of files) {
    if (f.kind !== 'image') continue;
    if (COVER_NAMES.has(f.name.toLowerCase()) && !map.has(f.parentUri)) {
      map.set(f.parentUri, f.uri);
    }
  }
  for (const f of files) {
    if (f.kind !== 'image') continue;
    if (!map.has(f.parentUri)) map.set(f.parentUri, f.uri);
  }
  return map;
}

function makeSong(file: RawFile, covers: Map<string, string>): Song {
  const parsed = parseFilename(file.name);
  const pathMeta = guessFromPath(file.uri);
  return {
    id: hashId(file.uri),
    uri: file.uri,
    title: parsed.title || file.name,
    artist: pathMeta.artist ?? 'Unknown Artist',
    album: pathMeta.album ?? file.folder ?? 'Unknown Album',
    albumArtist: pathMeta.artist ?? 'Unknown Artist',
    genre: 'Unknown',
    composer: '',
    trackNumber: parsed.trackNumber,
    kind: classifyAudio(file.uri, file.ext),
    playCount: 0,
    rating: 0,
    folder: file.folder,
    artworkUri: covers.get(file.parentUri),
  };
}

function makeVideo(file: RawFile, covers: Map<string, string>): VideoItem {
  const parsed = parseFilename(file.name);
  const tv = file.uri.match(/s(\d{1,2})e(\d{1,2})/i);
  return {
    id: hashId(file.uri),
    uri: file.uri,
    title: parsed.title || file.name,
    kind: classifyVideo(file.uri, file.folder),
    show: tv ? file.folder : undefined,
    season: tv ? parseInt(tv[1], 10) : undefined,
    episode: tv ? parseInt(tv[2], 10) : undefined,
    artworkUri: covers.get(file.parentUri),
    folder: file.folder,
  };
}

function makePhoto(file: RawFile): PhotoItem {
  return {
    id: hashId(file.uri),
    uri: file.uri,
    album: file.folder || 'Photo Library',
    folder: file.folder,
  };
}

function makeNote(file: RawFile, body: string): NoteItem {
  return {
    id: hashId(file.uri),
    title: parseFilename(file.name).title,
    body,
  };
}

async function enrichSongs(songs: Song[], files: RawFile[], onTag: (n: number) => void): Promise<void> {
  const byUri = new Map(files.map((f) => [f.uri, f]));
  let tagged = 0;
  for (const song of songs) {
    const raw = byUri.get(song.uri);
    if (!raw) continue;
    try {
      const file = new File(raw.uri);
      const buf = await readId3Buffer(file);
      if (!buf) continue;
      const tags = parseId3(buf);
      if (tags.title) song.title = tags.title;
      if (tags.artist) song.artist = tags.artist;
      if (tags.album) song.album = tags.album;
      if (tags.albumArtist) song.albumArtist = tags.albumArtist;
      if (tags.genre) song.genre = tags.genre;
      if (tags.composer) song.composer = tags.composer;
      if (tags.year) song.year = tags.year;
      if (tags.trackNumber) song.trackNumber = tags.trackNumber;
      if (tags.discNumber) song.discNumber = tags.discNumber;
      if (tags.lyrics) song.lyrics = tags.lyrics;
      if (tags.artwork) {
        const art = await writeArtwork(song.id, tags.artwork.mime, tags.artwork.bytes);
        if (art) song.artworkUri = art;
      }
    } catch {
      /* keep filename metadata */
    }
    tagged += 1;
    if (tagged % 8 === 0) onTag(tagged);
  }
}

export async function scanDirectory(
  root: Directory,
  onProgress?: (p: ScanProgress) => void,
): Promise<Library> {
  onProgress?.({ phase: 'listing', files: 0, tagged: 0, message: 'Looking for media…' });
  const files = collectFromDirectory(root, (n) =>
    onProgress?.({ phase: 'listing', files: n, tagged: 0, message: `Found ${n} files` }),
  );
  const covers = folderCovers(files);
  const songs = files.filter((f) => f.kind === 'audio').map((f) => makeSong(f, covers));
  const videos = files.filter((f) => f.kind === 'video').map((f) => makeVideo(f, covers));
  const photos = files.filter((f) => f.kind === 'image' && !COVER_NAMES.has(f.name.toLowerCase())).map(makePhoto);
  const notes: NoteItem[] = [];
  for (const f of files.filter((x) => x.kind === 'text')) {
    try {
      const body = await new File(f.uri).text();
      notes.push(makeNote(f, body));
    } catch {
      notes.push(makeNote(f, ''));
    }
  }

  onProgress?.({
    phase: 'tagging',
    files: files.length,
    tagged: 0,
    message: 'Reading song info…',
  });
  await enrichSongs(songs, files, (n) =>
    onProgress?.({
      phase: 'tagging',
      files: files.length,
      tagged: n,
      message: `Reading song info… ${n}/${songs.length}`,
    }),
  );

  songs.sort((a, b) => a.title.localeCompare(b.title) || a.artist.localeCompare(b.artist));
  videos.sort((a, b) => a.title.localeCompare(b.title));
  photos.sort((a, b) => a.album.localeCompare(b.album) || a.uri.localeCompare(b.uri));

  const bytes = files.reduce((sum, f) => {
    try {
      return sum + (new File(f.uri).size ?? 0);
    } catch {
      return sum;
    }
  }, 0);

  onProgress?.({ phase: 'done', files: files.length, tagged: songs.length, message: 'Done' });
  return {
    songs,
    videos,
    photos,
    notes,
    scannedAt: Date.now(),
    rootUri: root.uri,
    rootName: root.name || decodeName(root.uri),
    bytes,
  };
}

export async function pickAndScan(onProgress?: (p: ScanProgress) => void): Promise<Library> {
  if (Platform.OS === 'web') {
    throw new Error('Folder picking is not available in the browser.');
  }
  const picked = await Directory.pickDirectoryAsync();
  return scanDirectory(picked, onProgress);
}

const WEB_CACHE_KEY = 'ipod-library-cache';

function parseCachedLibrary(raw: string): Library | null {
  const parsed = JSON.parse(raw) as Library;
  if (!parsed || !Array.isArray(parsed.songs)) return null;
  if (parsed.rootUri?.startsWith('computer://')) return localizeLibrary(parsed);
  if (parsed.rootUri?.startsWith('browser://')) return null;
  return parsed;
}

export async function saveLibraryCache(library: Library): Promise<void> {
  try {
    const payload = JSON.stringify(library);
    if (Platform.OS === 'web') {
      localStorage.setItem(WEB_CACHE_KEY, payload);
      return;
    }
    const file = new File(Paths.document, 'library-cache.json');
    if (file.exists) file.delete();
    file.create();
    file.write(payload);
  } catch {
    /* ignore quota / filesystem errors */
  }
}

export async function loadLibraryCache(): Promise<Library | null> {
  try {
    if (Platform.OS === 'web') {
      const raw = localStorage.getItem(WEB_CACHE_KEY);
      return raw ? parseCachedLibrary(raw) : null;
    }
    const file = new File(Paths.document, 'library-cache.json');
    if (!file.exists) return null;
    return parseCachedLibrary(await file.text());
  } catch {
    return null;
  }
}

export async function fetchComputerLibrary(pick: boolean, onProgress?: (p: ScanProgress) => void): Promise<Library> {
  const base = computerBaseUrl();
  onProgress?.({
    phase: 'listing',
    files: 0,
    tagged: 0,
    message: pick ? 'Choose a folder on the computer…' : 'Loading computer library…',
  });
  const url = pick ? `${base}/pick` : `${base}/catalog`;
  let res: Response;
  try {
    res = await fetch(url, { method: pick ? 'POST' : 'GET' });
  } catch {
    throw new Error('Cannot reach the media library. Run npm start, or deploy with Docker.');
  }
  const body = (await res.json().catch(() => ({}))) as Library & { error?: string };
  if (!res.ok) {
    throw new Error(body.error || `Computer library failed (${res.status})`);
  }
  if (!Array.isArray(body.songs)) {
    throw new Error('Computer library returned an invalid catalog');
  }
  onProgress?.({ phase: 'done', files: body.songs.length, tagged: body.songs.length, message: 'Done' });
  return localizeLibrary(body);
}

export async function fetchComputerStatus(): Promise<{ ok: boolean; root: string | null; name: string | null }> {
  const base = computerBaseUrl();
  const res = await fetch(`${base}/status`);
  if (!res.ok) throw new Error('Computer library is not running');
  return (await res.json()) as { ok: boolean; root: string | null; name: string | null };
}

type BrowserFile = globalThis.File;

function relativePath(file: BrowserFile): string {
  return (file as BrowserFile & { webkitRelativePath?: string }).webkitRelativePath || file.name;
}

function pickBrowserFileList(): Promise<BrowserFile[]> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Folder picker is only available in the browser'));
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    const finish = (files: BrowserFile[], cancelled: boolean) => {
      input.remove();
      if (cancelled) reject(new Error('cancelled'));
      else resolve(files);
    };
    input.addEventListener('change', () => finish(Array.from(input.files ?? []), false));
    input.addEventListener('cancel', () => finish([], true));
    input.click();
  });
}

export async function pickAndScanBrowser(onProgress?: (p: ScanProgress) => void): Promise<Library> {
  const files = await pickBrowserFileList();
  if (files.length === 0) throw new Error('cancelled');
  return scanBrowserFiles(files, onProgress);
}

export async function scanBrowserFiles(files: BrowserFile[], onProgress?: (p: ScanProgress) => void): Promise<Library> {
  onProgress?.({ phase: 'listing', files: files.length, tagged: 0, message: 'Reading folder…' });
  const covers = new Map<string, string>();
  for (const file of files) {
    const rel = relativePath(file);
    const parent = rel.split('/').slice(0, -1).join('/');
    const ext = extOf(file.name);
    if (IMAGE_EXT.has(ext) && COVER_NAMES.has(file.name.toLowerCase()) && !covers.has(parent)) {
      covers.set(parent, URL.createObjectURL(file));
    }
  }
  for (const file of files) {
    const rel = relativePath(file);
    const parent = rel.split('/').slice(0, -1).join('/');
    const ext = extOf(file.name);
    if (IMAGE_EXT.has(ext) && !covers.has(parent)) covers.set(parent, URL.createObjectURL(file));
  }

  const songs: Song[] = [];
  const videos: VideoItem[] = [];
  const photos: PhotoItem[] = [];
  const notes: NoteItem[] = [];
  let bytes = 0;
  let tagged = 0;
  const top = files.length ? relativePath(files[0]).split('/')[0] || 'Library' : 'Library';

  for (const file of files) {
    bytes += file.size;
    const rel = relativePath(file);
    const parts = rel.split('/');
    const folder = parts[parts.length - 2] || top;
    const parent = parts.slice(0, -1).join('/');
    const ext = extOf(file.name);
    const id = hashId(rel);
    const parsed = parseFilename(file.name);
    tagged += 1;
    if (tagged % 25 === 0) {
      onProgress?.({ phase: 'tagging', files: files.length, tagged, message: `Reading ${file.name}` });
    }
    if (AUDIO_EXT.has(ext)) {
      let tags: ReturnType<typeof parseId3> = {};
      try {
        tags = parseId3(new Uint8Array(await file.slice(0, ID3_BYTES).arrayBuffer()));
      } catch {
        tags = {};
      }
      let artworkUri = covers.get(parent);
      if (tags.artwork?.bytes && tags.artwork.bytes.length > 40) {
        const mime = tags.artwork.mime || 'image/jpeg';
        const bytes = tags.artwork.bytes;
        const copy = new Uint8Array(bytes.byteLength);
        copy.set(bytes);
        artworkUri = URL.createObjectURL(new Blob([copy.buffer as ArrayBuffer], { type: mime }));
      }
      const albumGuess = parts.length > 1 ? parts[parts.length - 2] : folder;
      const artistGuess = parts.length > 2 ? parts[parts.length - 3] : 'Unknown Artist';
      songs.push({
        id,
        uri: URL.createObjectURL(file),
        title: tags.title || parsed.title || file.name,
        artist: tags.artist || artistGuess || 'Unknown Artist',
        album: tags.album || albumGuess || 'Unknown Album',
        albumArtist: tags.albumArtist || tags.artist || artistGuess || 'Unknown Artist',
        genre: tags.genre || 'Unknown',
        composer: tags.composer || '',
        year: tags.year,
        trackNumber: tags.trackNumber || parsed.trackNumber,
        kind: classifyAudio(rel, ext),
        playCount: 0,
        rating: 0,
        folder,
        artworkUri,
      });
    } else if (VIDEO_EXT.has(ext)) {
      const tv = rel.match(/s(\d{1,2})e(\d{1,2})/i);
      videos.push({
        id,
        uri: URL.createObjectURL(file),
        title: parsed.title || file.name,
        kind: classifyVideo(rel, folder),
        show: tv ? folder : undefined,
        season: tv ? parseInt(tv[1], 10) : undefined,
        episode: tv ? parseInt(tv[2], 10) : undefined,
        artworkUri: covers.get(parent),
        folder,
      });
    } else if (IMAGE_EXT.has(ext) && !COVER_NAMES.has(file.name.toLowerCase())) {
      photos.push({ id, uri: URL.createObjectURL(file), album: folder || 'Photo Library', folder });
    } else if (ext === '.txt') {
      notes.push({ id, title: parsed.title, body: await file.text() });
    }
  }

  songs.sort((a, b) => a.title.localeCompare(b.title) || a.artist.localeCompare(b.artist));
  videos.sort((a, b) => a.title.localeCompare(b.title));
  photos.sort((a, b) => a.album.localeCompare(b.album) || a.uri.localeCompare(b.uri));
  onProgress?.({ phase: 'done', files: files.length, tagged, message: 'Done' });
  return {
    songs,
    videos,
    photos,
    notes,
    scannedAt: Date.now(),
    rootUri: `browser://${top}`,
    rootName: top,
    bytes,
  };
}
