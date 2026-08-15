import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  ClickerMode,
  FontSize,
  NanoColor,
  RepeatMode,
  ShuffleMode,
} from '../types';

export interface SettingsState {
  shuffle: ShuffleMode;
  repeat: RepeatMode;
  clicker: ClickerMode;
  fontSize: FontSize;
  previewPanel: boolean;
  brightness: number;
  backlightSeconds: number;
  volumeLimit: number;
  volume: number;
  eq: string;
  soundCheck: boolean;
  crossfade: boolean;
  shakeToShuffle: boolean;
  coverFlowRotate: boolean;
  color: NanoColor;
  hold: boolean;
  firstLaunch: boolean;
  onTheGo: string[];
  ratings: Record<string, number>;
  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  toggle: (key: 'previewPanel' | 'soundCheck' | 'crossfade' | 'shakeToShuffle' | 'coverFlowRotate' | 'hold') => void;
  cycleShuffle: () => void;
  cycleRepeat: () => void;
  cycleClicker: () => void;
  setRating: (songId: string, rating: number) => void;
  addToOnTheGo: (songId: string) => void;
  clearOnTheGo: () => void;
  reset: () => void;
}

const defaults: Omit<
  SettingsState,
  | 'set'
  | 'toggle'
  | 'cycleShuffle'
  | 'cycleRepeat'
  | 'cycleClicker'
  | 'setRating'
  | 'addToOnTheGo'
  | 'clearOnTheGo'
  | 'reset'
> = {
  shuffle: 'off',
  repeat: 'off',
  clicker: 'on',
  fontSize: 'standard',
  previewPanel: true,
  brightness: 0.85,
  backlightSeconds: 10,
  volumeLimit: 1,
  volume: 0.7,
  eq: 'Off',
  soundCheck: false,
  crossfade: false,
  shakeToShuffle: true,
  coverFlowRotate: true,
  color: 'silver',
  hold: false,
  firstLaunch: true,
  onTheGo: [],
  ratings: {},
};

export const EQ_PRESETS = [
  'Off',
  'Acoustic',
  'Bass Booster',
  'Bass Reducer',
  'Classical',
  'Dance',
  'Deep',
  'Electronic',
  'Flat',
  'Hip-Hop',
  'Jazz',
  'Latin',
  'Loudness',
  'Lounge',
  'Piano',
  'Pop',
  'R&B',
  'Rock',
  'Small Speakers',
  'Spoken Word',
  'Treble Booster',
  'Treble Reducer',
  'Vocal Booster',
];

export const BACKLIGHT_OPTIONS = [2, 5, 10, 15, 20, 30, 0] as const;

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaults,
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
      toggle: (key) => set({ [key]: !get()[key] } as Partial<SettingsState>),
      cycleShuffle: () => {
        const order: ShuffleMode[] = ['off', 'songs', 'albums'];
        const i = order.indexOf(get().shuffle);
        set({ shuffle: order[(i + 1) % order.length] });
      },
      cycleRepeat: () => {
        const order: RepeatMode[] = ['off', 'all', 'one'];
        const i = order.indexOf(get().repeat);
        set({ repeat: order[(i + 1) % order.length] });
      },
      cycleClicker: () => {
        const order: ClickerMode[] = ['on', 'speaker', 'off'];
        const i = order.indexOf(get().clicker);
        set({ clicker: order[(i + 1) % order.length] });
      },
      setRating: (songId, rating) =>
        set({ ratings: { ...get().ratings, [songId]: rating } }),
      addToOnTheGo: (songId) => {
        if (get().onTheGo.includes(songId)) return;
        set({ onTheGo: [...get().onTheGo, songId] });
      },
      clearOnTheGo: () => set({ onTheGo: [] }),
      reset: () =>
        set({
          ...defaults,
          firstLaunch: false,
          onTheGo: get().onTheGo,
          ratings: get().ratings,
          color: get().color,
        }),
    }),
    {
      name: 'nano-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => {
        const { set: _s, toggle: _t, cycleShuffle: _cs, cycleRepeat: _cr, cycleClicker: _cc, setRating: _sr, addToOnTheGo: _a, clearOnTheGo: _c, reset: _r, hold, ...rest } = s;
        return rest;
      },
    },
  ),
);
