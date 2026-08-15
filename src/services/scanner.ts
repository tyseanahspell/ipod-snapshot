import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import type { Library, NoteItem, PhotoItem, Song, VideoItem } from '../types';
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
  if (bytes.length < 40) return undefined;
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
  const pick = (
    Directory as typeof Directory & {
      pickDirectoryAsync: (initialUri?: string) => Promise<{ uri: string }>;
    }
  ).pickDirectoryAsync;
  const picked = await pick();
  return scanDirectory(new Directory(picked.uri), onProgress);
}

export async function scanMediaLibrary(onProgress?: (p: ScanProgress) => void): Promise<Library> {
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Media access was not granted');
  }
  onProgress?.({ phase: 'listing', files: 0, tagged: 0, message: 'Reading device library…' });

  const songs: Song[] = [];
  const videos: VideoItem[] = [];
  const photos: PhotoItem[] = [];

  async function drain(mediaType: MediaLibrary.MediaTypeValue) {
    let after: string | undefined;
    let hasNext = true;
    while (hasNext) {
      const page = await MediaLibrary.getAssetsAsync({
        mediaType,
        first: 200,
        after,
        sortBy: [MediaLibrary.SortBy.creationTime],
      });
      for (const asset of page.assets) {
        const info = await MediaLibrary.getAssetInfoAsync(asset, { shouldDownloadFromNetwork: false });
        const uri = info.localUri ?? info.uri;
        if (!uri) continue;
        if (mediaType === MediaLibrary.MediaType.audio) {
          songs.push({
            id: hashId(uri),
            uri,
            title: info.filename.replace(/\.[^.]+$/, ''),
            artist: 'Unknown Artist',
            album: 'Unknown Album',
            albumArtist: 'Unknown Artist',
            genre: 'Unknown',
            composer: '',
            duration: info.duration || undefined,
            kind: 'song',
            playCount: 0,
            rating: 0,
            folder: 'Media Library',
          });
        } else if (mediaType === MediaLibrary.MediaType.video) {
          videos.push({
            id: hashId(uri),
            uri,
            title: info.filename.replace(/\.[^.]+$/, ''),
            kind: 'movie',
            duration: info.duration || undefined,
            folder: 'Media Library',
          });
        } else {
          photos.push({
            id: hashId(uri),
            uri,
            album: 'Photo Library',
            folder: 'Photo Library',
          });
        }
      }
      hasNext = page.hasNextPage;
      after = page.endCursor;
      onProgress?.({
        phase: 'listing',
        files: songs.length + videos.length + photos.length,
        tagged: 0,
        message: `Found ${songs.length + videos.length + photos.length} items`,
      });
    }
  }

  await drain(MediaLibrary.MediaType.audio);
  await drain(MediaLibrary.MediaType.video);
  await drain(MediaLibrary.MediaType.photo);

  songs.sort((a, b) => a.title.localeCompare(b.title));
  onProgress?.({ phase: 'done', files: songs.length + videos.length + photos.length, tagged: songs.length, message: 'Done' });
  return {
    songs,
    videos,
    photos,
    notes: [],
    scannedAt: Date.now(),
    rootUri: `media-library://${Platform.OS}`,
    rootName: 'Device Library',
  };
}

export async function saveLibraryCache(library: Library): Promise<void> {
  const file = new File(Paths.document, 'library-cache.json');
  try {
    if (file.exists) file.delete();
    file.create();
    file.write(JSON.stringify(library));
  } catch {
    /* ignore */
  }
}

export async function loadLibraryCache(): Promise<Library | null> {
  try {
    const file = new File(Paths.document, 'library-cache.json');
    if (!file.exists) return null;
    const parsed = JSON.parse(await file.text()) as Library;
    if (!parsed || !Array.isArray(parsed.songs)) return null;
    return parsed;
  } catch {
    return null;
  }
}
