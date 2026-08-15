import { create } from 'zustand';

interface ExtrasState {
  stopwatchRunning: boolean;
  stopwatchMs: number;
  gameDir: number;
  gameSeq: number;
  toggleStopwatch: () => void;
  tickStopwatch: (now: number) => void;
  nudgeGame: (dir: number) => void;
}

let startedAt = 0;
let accumulated = 0;

export const useExtras = create<ExtrasState>((set, get) => ({
  stopwatchRunning: false,
  stopwatchMs: 0,
  gameDir: 0,
  gameSeq: 0,
  toggleStopwatch: () => {
    const running = get().stopwatchRunning;
    if (running) {
      accumulated += Date.now() - startedAt;
      set({ stopwatchRunning: false, stopwatchMs: accumulated });
    } else {
      startedAt = Date.now();
      set({ stopwatchRunning: true });
    }
  },
  tickStopwatch: (now) => {
    if (!get().stopwatchRunning) return;
    set({ stopwatchMs: accumulated + (now - startedAt) });
  },
  nudgeGame: (dir) => set({ gameDir: dir, gameSeq: get().gameSeq + 1 }),
}));
