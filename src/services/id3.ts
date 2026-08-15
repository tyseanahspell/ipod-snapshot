export function hashId(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function decodeUtf16(bytes: Uint8Array, littleEndian: boolean): string {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let out = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const c = view.getUint16(i, littleEndian);
    if (c === 0) break;
    out += String.fromCharCode(c);
  }
  return out;
}

export function decodeText(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  const encoding = bytes[0];
  const data = bytes.subarray(1);
  if (encoding === 0) {
    let end = data.length;
    while (end > 0 && data[end - 1] === 0) end -= 1;
    return decodeLatin1(data.subarray(0, end));
  }
  if (encoding === 3) {
    let end = data.length;
    while (end > 0 && data[end - 1] === 0) end -= 1;
    return new TextDecoder('utf-8').decode(data.subarray(0, end));
  }
  if (encoding === 1) {
    const bom = data.length >= 2 ? (data[0] << 8) | data[1] : 0;
    const le = bom === 0xfffe;
    const payload = bom === 0xfeff || bom === 0xfffe ? data.subarray(2) : data;
    return decodeUtf16(payload, le || bom === 0);
  }
  if (encoding === 2) {
    return decodeUtf16(data, false);
  }
  return decodeLatin1(data);
}

function decodeLatin1(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]);
  return out;
}

export interface Id3Tags {
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  genre?: string;
  composer?: string;
  year?: number;
  trackNumber?: number;
  discNumber?: number;
  lyrics?: string;
  artwork?: { mime: string; bytes: Uint8Array };
}

function readSynchsafe(b: Uint8Array, offset: number): number {
  return ((b[offset] & 0x7f) << 21) | ((b[offset + 1] & 0x7f) << 14) | ((b[offset + 2] & 0x7f) << 7) | (b[offset + 3] & 0x7f);
}

function readSize(b: Uint8Array, offset: number, synchsafe: boolean): number {
  if (synchsafe) return readSynchsafe(b, offset);
  return (b[offset] << 24) | (b[offset + 1] << 16) | (b[offset + 2] << 8) | b[offset + 3];
}

function parseFrameValue(id: string, data: Uint8Array): Partial<Id3Tags> {
  if (id === 'TIT2' || id === 'TT2') return { title: decodeText(data) };
  if (id === 'TPE1' || id === 'TP1') return { artist: decodeText(data) };
  if (id === 'TALB' || id === 'TAL') return { album: decodeText(data) };
  if (id === 'TPE2' || id === 'TP2') return { albumArtist: decodeText(data) };
  if (id === 'TCON' || id === 'TCO') {
    const raw = decodeText(data).replace(/^\(\d+\)/, '').trim();
    return { genre: raw };
  }
  if (id === 'TCOM' || id === 'TCM') return { composer: decodeText(data) };
  if (id === 'TYER' || id === 'TDRC' || id === 'TYE') {
    const year = parseInt(decodeText(data).slice(0, 4), 10);
    return Number.isFinite(year) ? { year } : {};
  }
  if (id === 'TRCK' || id === 'TRK') {
    const n = parseInt(decodeText(data).split('/')[0] ?? '', 10);
    return Number.isFinite(n) ? { trackNumber: n } : {};
  }
  if (id === 'TPOS') {
    const n = parseInt(decodeText(data).split('/')[0] ?? '', 10);
    return Number.isFinite(n) ? { discNumber: n } : {};
  }
  if (id === 'USLT' || id === 'ULT') {
    if (data.length < 5) return {};
    const encoding = data[0];
    let offset = 4;
    if (encoding === 1 || encoding === 2) offset = 5;
    return { lyrics: decodeText(Uint8Array.from([encoding, ...data.subarray(offset)])) };
  }
  if (id === 'APIC' || id === 'PIC') {
    if (data.length < 6) return {};
    const encoding = data[0];
    let i = 1;
    while (i < data.length && data[i] !== 0) i += 1;
    const mime = decodeLatin1(data.subarray(1, i)).replace(/\0/g, '') || 'image/jpeg';
    i += 1;
    i += 1;
    if (encoding === 0 || encoding === 3) {
      while (i < data.length && data[i] !== 0) i += 1;
      i += 1;
    } else {
      while (i + 1 < data.length && !(data[i] === 0 && data[i + 1] === 0)) i += 2;
      i += 2;
    }
    return { artwork: { mime, bytes: data.subarray(Math.min(i, data.length)) } };
  }
  return {};
}

export function parseId3(buffer: Uint8Array): Id3Tags {
  const tags: Id3Tags = {};
  if (buffer.length >= 128) {
    const tail = buffer.subarray(buffer.length - 128);
    if (tail[0] === 0x54 && tail[1] === 0x41 && tail[2] === 0x47) {
      const str = (start: number, len: number) => {
        let s = '';
        for (let i = 0; i < len; i += 1) {
          const c = tail[start + i];
          if (c === 0) break;
          s += String.fromCharCode(c);
        }
        return s.trim();
      };
      tags.title = tags.title ?? str(3, 30);
      tags.artist = tags.artist ?? str(33, 30);
      tags.album = tags.album ?? str(63, 30);
      const year = parseInt(str(93, 4), 10);
      if (Number.isFinite(year)) tags.year = tags.year ?? year;
    }
  }

  if (buffer.length < 10 || buffer[0] !== 0x49 || buffer[1] !== 0x44 || buffer[2] !== 0x33) {
    return tags;
  }

  const version = buffer[3];
  const tagSize = readSynchsafe(buffer, 6);
  const end = Math.min(buffer.length, 10 + tagSize);
  let offset = 10;
  if (buffer[5] & 0x40) {
    if (end - offset < 4) return tags;
    offset += readSynchsafe(buffer, offset);
  }

  while (offset + 10 < end) {
    const id =
      version === 2
        ? String.fromCharCode(buffer[offset], buffer[offset + 1], buffer[offset + 2])
        : String.fromCharCode(buffer[offset], buffer[offset + 1], buffer[offset + 2], buffer[offset + 3]);
    if (id[0] === '\u0000' || id.trim().length === 0) break;
    let size: number;
    let header = 10;
    if (version === 2) {
      size = (buffer[offset + 3] << 16) | (buffer[offset + 4] << 8) | buffer[offset + 5];
      header = 6;
    } else {
      size = readSize(buffer, offset + 4, version >= 4);
    }
    if (size <= 0 || offset + header + size > buffer.length + 1024) break;
    const data = buffer.subarray(offset + header, Math.min(offset + header + size, buffer.length));
    Object.assign(tags, parseFrameValue(id, data));
    offset += header + size;
  }
  return tags;
}

export function parseFilename(name: string): { trackNumber?: number; title: string } {
  const base = name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
  const match = base.match(/^(\d{1,3})\s*[-.]\s*(.+)$/);
  if (match) {
    return { trackNumber: parseInt(match[1], 10), title: match[2].trim() };
  }
  return { title: base };
}

export const AUDIO_EXT = new Set([
  '.mp3',
  '.m4a',
  '.aac',
  '.wav',
  '.aiff',
  '.aif',
  '.flac',
  '.ogg',
  '.oga',
  '.wma',
  '.alac',
  '.m4b',
  '.mp2',
  '.opus',
  '.caf',
]);

export const VIDEO_EXT = new Set([
  '.mp4',
  '.m4v',
  '.mov',
  '.avi',
  '.mkv',
  '.3gp',
  '.webm',
  '.mpg',
  '.mpeg',
  '.wmv',
]);

export const IMAGE_EXT = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.webp',
  '.heic',
  '.heif',
  '.tif',
  '.tiff',
]);

export const COVER_NAMES = new Set([
  'cover.jpg',
  'cover.jpeg',
  'cover.png',
  'folder.jpg',
  'folder.jpeg',
  'folder.png',
  'albumart.jpg',
  'albumart.jpeg',
  'albumart.png',
  'front.jpg',
  'front.jpeg',
  'front.png',
  'artwork.jpg',
  'artwork.png',
]);

export function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

export function classifyAudio(path: string, ext: string): 'song' | 'podcast' | 'audiobook' | 'musicVideo' {
  const p = path.toLowerCase();
  if (ext === '.m4b' || /audiobook/.test(p)) return 'audiobook';
  if (/podcast/.test(p)) return 'podcast';
  if (/music\s*video/.test(p)) return 'musicVideo';
  return 'song';
}

export function classifyVideo(path: string, parent: string): 'movie' | 'tvShow' | 'musicVideo' | 'podcast' | 'camera' {
  const p = `${path}/${parent}`.toLowerCase();
  if (/camera|dcim|recorded/.test(p)) return 'camera';
  if (/music\s*video/.test(p)) return 'musicVideo';
  if (/podcast/.test(p)) return 'podcast';
  if (/tv\s*show|season\s*\d|s\d{1,2}e\d{1,2}/.test(p)) return 'tvShow';
  return 'movie';
}

const SKIP_DIRS = new Set([
  'system volume information',
  '$recycle.bin',
  '.trash',
  '.trashes',
  'lost+found',
  'data',
  'obb',
  'cache',
]);

export function shouldSkipDir(name: string): boolean {
  const n = name.toLowerCase();
  return n.startsWith('.') || SKIP_DIRS.has(n);
}
