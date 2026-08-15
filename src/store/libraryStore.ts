import { create } from 'zustand';
import { Directory } from 'expo-file-system';
import { Platform } from 'react-native';
import { EMPTY_LIBRARY, type Library, type PhotoItem, type Song, type VideoItem } from '../types';
import {
  fetchComputerLibrary,
  fetchComputerStatus,
  loadLibraryCache,
  pickAndScan,
  pickAndScanBrowser,
  saveLibraryCache,
  scanDirectory,
  scanMediaLibrary,
  type ScanProgress,
} from '../services/scanner';

export interface LibraryState {
  library: Library;
  loading: boolean;
  progress?: ScanProgress;
  error?: string;
  hydrate: () => Promise<void>;
  pickFolder: () => Promise<void>;
  pickComputerFolder: () => Promise<void>;
  pickBrowserFolder: () => Promise<void>;
  scanDevice: () => Promise<void>;
  rescan: () => Promise<void>;
}

function albumKey(song: Song): string {
  return `${song.albumArtist || song.artist}:::${song.album}`;
}

export function songsByArtist(library: Library): Map<string, Song[]> {
  const map = new Map<string, Song[]>();
  for (const song of library.songs.filter((s) => s.kind === 'song' || s.kind === 'musicVideo')) {
    const list = map.get(song.artist) ?? [];
    list.push(song);
    map.set(song.artist, list);
  }
  return map;
}

export function albumsOf(library: Library): { key: string; artist: string; album: string; songs: Song[]; artworkUri?: string }[] {
  const map = new Map<string, Song[]>();
  for (const song of library.songs.filter((s) => s.kind === 'song' || s.kind === 'musicVideo')) {
    const key = albumKey(song);
    const list = map.get(key) ?? [];
    list.push(song);
    map.set(key, list);
  }
  return [...map.entries()]
    .map(([key, songs]) => {
      const sorted = [...songs].sort((a, b) => (a.trackNumber ?? 999) - (b.trackNumber ?? 999) || a.title.localeCompare(b.title));
      return {
        key,
        artist: sorted[0]?.albumArtist || sorted[0]?.artist || 'Unknown Artist',
        album: sorted[0]?.album || 'Unknown Album',
        songs: sorted,
        artworkUri: sorted.find((s) => s.artworkUri)?.artworkUri,
      };
    })
    .sort((a, b) => a.album.localeCompare(b.album) || a.artist.localeCompare(b.artist));
}

export function songsByGenre(library: Library): Map<string, Song[]> {
  const map = new Map<string, Song[]>();
  for (const song of library.songs.filter((s) => s.kind === 'song')) {
    const list = map.get(song.genre || 'Unknown') ?? [];
    list.push(song);
    map.set(song.genre || 'Unknown', list);
  }
  return map;
}

export function songsByComposer(library: Library): Map<string, Song[]> {
  const map = new Map<string, Song[]>();
  for (const song of library.songs) {
    if (!song.composer) continue;
    const list = map.get(song.composer) ?? [];
    list.push(song);
    map.set(song.composer, list);
  }
  return map;
}

export function photoAlbums(library: Library): Map<string, PhotoItem[]> {
  const map = new Map<string, PhotoItem[]>();
  for (const photo of library.photos) {
    const list = map.get(photo.album) ?? [];
    list.push(photo);
    map.set(photo.album, list);
  }
  return map;
}

export function videosOfKind(library: Library, kind: VideoItem['kind']): VideoItem[] {
  return library.videos.filter((v) => v.kind === kind);
}

export function tvShows(library: Library): Map<string, VideoItem[]> {
  const map = new Map<string, VideoItem[]>();
  for (const v of library.videos.filter((x) => x.kind === 'tvShow')) {
    const name = v.show || 'TV Shows';
    const list = map.get(name) ?? [];
    list.push(v);
    map.set(name, list);
  }
  return map;
}

async function runScan(fn: () => Promise<Library>, set: (p: Partial<LibraryState>) => void): Promise<void> {
  set({ loading: true, error: undefined, progress: { phase: 'listing', files: 0, tagged: 0, message: 'Starting…' } });
  try {
    const library = await fn();
    if (!library.rootUri?.startsWith('browser://')) {
      await saveLibraryCache(library);
    }
    set({ library, loading: false, progress: undefined });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Scan failed';
    if (/cancel/i.test(message) || /no folder selected/i.test(message)) {
      set({ loading: false, progress: undefined });
      return;
    }
    set({ loading: false, error: message, progress: undefined });
  }
}

export const useLibrary = create<LibraryState>((set, get) => ({
  library: EMPTY_LIBRARY,
  loading: false,
  hydrate: async () => {
    const cached = await loadLibraryCache();
    if (cached && !cached.rootUri?.startsWith('browser://')) set({ library: cached });
    try {
      const status = await fetchComputerStatus();
      if (status.root) {
        await runScan(
          () => fetchComputerLibrary(false, (progress) => set({ progress })),
          set,
        );
      }
    } catch {
      /* media server optional */
    }
  },
  pickFolder: async () => {
    if (Platform.OS === 'web') {
      await get().pickBrowserFolder();
      return;
    }
    await runScan(
      () =>
        pickAndScan((progress) => set({ progress })),
      set,
    );
  },
  pickComputerFolder: async () => {
    await runScan(
      () => fetchComputerLibrary(true, (progress) => set({ progress })),
      set,
    );
  },
  pickBrowserFolder: async () => {
    await runScan(
      () => pickAndScanBrowser((progress) => set({ progress })),
      set,
    );
  },
  scanDevice: async () => {
    await runScan(
      () => scanMediaLibrary((progress) => set({ progress })),
      set,
    );
  },
  rescan: async () => {
    const uri = get().library.rootUri;
    if (!uri) {
      await get().pickComputerFolder();
      return;
    }
    if (uri.startsWith('computer://')) {
      await runScan(
        () => fetchComputerLibrary(false, (progress) => set({ progress })),
        set,
      );
      return;
    }
    if (uri.startsWith('browser://')) {
      await get().pickBrowserFolder();
      return;
    }
    if (uri.startsWith('media-library://')) {
      await get().scanDevice();
      return;
    }
    await runScan(
      () => scanDirectory(new Directory(uri), (progress) => set({ progress })),
      set,
    );
  },
}));
