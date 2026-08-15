import { create } from 'zustand';
import type { RepeatMode, ShuffleMode, Song } from '../types';
import { pauseSource, playSource, resumeSource } from '../audio/engine';

export type NowPlayingPage = 'info' | 'scrub' | 'shuffle' | 'rating' | 'lyrics';
export const NOW_PLAYING_PAGES: NowPlayingPage[] = ['info', 'scrub', 'shuffle', 'rating', 'lyrics'];

export interface PlayerState {
  queue: Song[];
  index: number;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  shuffle: ShuffleMode;
  repeat: RepeatMode;
  page: NowPlayingPage;
  seeking: boolean;
  source: 'library' | 'radio' | null;
  radioFreq: number;
  radioUri?: string;
  radioName?: string;
  setPlayback: (patch: Partial<Pick<PlayerState, 'isPlaying' | 'position' | 'duration'>>) => void;
  setVolume: (volume: number) => void;
  setShuffle: (shuffle: ShuffleMode) => void;
  setRepeat: (repeat: RepeatMode) => void;
  cyclePage: () => void;
  setPage: (page: NowPlayingPage) => void;
  playQueue: (songs: Song[], index: number, shuffled?: boolean) => void;
  playIndex: (index: number) => void;
  next: () => void;
  prev: () => void;
  skip: (delta: number) => void;
  seekTo: (position: number) => void;
  setSeeking: (seeking: boolean) => void;
  togglePlay: () => void;
  stop: () => void;
  tuneRadio: (freq: number, station?: { name: string; uri: string }) => void;
  stopRadio: () => void;
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function shuffleSongs(songs: Song[], start: Song): Song[] {
  const rest = shuffleArray(songs.filter((s) => s.id !== start.id));
  return [start, ...rest];
}

function shuffleByAlbum(songs: Song[], start: Song): Song[] {
  const groups = new Map<string, Song[]>();
  for (const song of songs) {
    const key = `${song.albumArtist || song.artist}:::${song.album}`;
    const list = groups.get(key) ?? [];
    list.push(song);
    groups.set(key, list);
  }
  const albums = [...groups.values()].map((list) =>
    [...list].sort((a, b) => (a.trackNumber ?? 999) - (b.trackNumber ?? 999)),
  );
  const startKey = `${start.albumArtist || start.artist}:::${start.album}`;
  const startAlbum = albums.find((a) => `${a[0]?.albumArtist || a[0]?.artist}:::${a[0]?.album}` === startKey) ?? [start];
  const others = shuffleArray(albums.filter((a) => a !== startAlbum));
  return [...startAlbum, ...others.flat()];
}

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  index: 0,
  isPlaying: false,
  position: 0,
  duration: 0,
  volume: 0.7,
  shuffle: 'off',
  repeat: 'off',
  page: 'info',
  seeking: false,
  source: null,
  radioFreq: 87.9,
  setPlayback: (patch) => set(patch),
  setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
  setShuffle: (shuffle) => set({ shuffle }),
  setRepeat: (repeat) => set({ repeat }),
  cyclePage: () => {
    const i = NOW_PLAYING_PAGES.indexOf(get().page);
    set({ page: NOW_PLAYING_PAGES[(i + 1) % NOW_PLAYING_PAGES.length] });
  },
  setPage: (page) => set({ page }),
  playQueue: (songs, index, shuffled) => {
    if (songs.length === 0) return;
    const mode = shuffled ? 'songs' : get().shuffle;
    let queue = [...songs];
    let startIndex = Math.max(0, Math.min(index, songs.length - 1));
    const start = songs[startIndex];
    if (mode === 'songs') {
      queue = shuffleSongs(songs, start);
      startIndex = 0;
    } else if (mode === 'albums') {
      queue = shuffleByAlbum(songs, start);
      startIndex = 0;
    }
    set({
      queue,
      index: startIndex,
      isPlaying: true,
      position: 0,
      source: 'library',
      page: 'info',
      radioUri: undefined,
      radioName: undefined,
    });
    playSource(queue[startIndex]?.uri);
  },
  playIndex: (index) => {
    const { queue } = get();
    if (queue.length === 0) return;
    const next = (index + queue.length) % queue.length;
    set({ index: next, position: 0, isPlaying: true, source: 'library' });
    playSource(queue[next]?.uri);
  },
  next: () => {
    const { queue, index, repeat } = get();
    if (queue.length === 0) return;
    if (repeat === 'one') {
      set({ position: 0, isPlaying: true });
      playSource(queue[index]?.uri);
      return;
    }
    const last = index >= queue.length - 1;
    if (last && repeat === 'off') {
      set({ isPlaying: false, position: 0 });
      pauseSource();
      return;
    }
    const next = last ? 0 : index + 1;
    set({ index: next, position: 0, isPlaying: true });
    playSource(queue[next]?.uri);
  },
  prev: () => {
    const { queue, index, position } = get();
    if (queue.length === 0) return;
    if (position > 3) {
      set({ position: 0 });
      playSource(queue[index]?.uri);
      return;
    }
    const prev = (index - 1 + queue.length) % queue.length;
    set({ index: prev, position: 0, isPlaying: true });
    playSource(queue[prev]?.uri);
  },
  skip: (delta) => {
    if (delta > 0) get().next();
    else get().prev();
  },
  seekTo: (position) => set({ position: Math.max(0, position) }),
  setSeeking: (seeking) => set({ seeking }),
  togglePlay: () => {
    const state = get();
    if (state.source === 'radio') {
      const next = !state.isPlaying;
      set({ isPlaying: next });
      if (next) resumeSource();
      else pauseSource();
      return;
    }
    if (state.queue.length === 0) return;
    const next = !state.isPlaying;
    set({ isPlaying: next });
    if (next) resumeSource();
    else pauseSource();
  },
  stop: () => {
    pauseSource();
    set({ isPlaying: false, source: null, radioUri: undefined });
  },
  tuneRadio: (freq, station) => {
    set({
      radioFreq: Math.round(freq * 10) / 10,
      radioUri: station?.uri,
      radioName: station?.name,
      source: 'radio',
      isPlaying: Boolean(station),
      queue: [],
      index: 0,
    });
    if (station?.uri) playSource(station.uri);
    else pauseSource();
  },
  stopRadio: () => {
    pauseSource();
    set({ source: null, radioUri: undefined, radioName: undefined, isPlaying: false });
  },
}));

export function currentSong(state: PlayerState): Song | undefined {
  return state.queue[state.index];
}
