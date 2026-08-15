import { create } from 'zustand';
import type { IpodScreen, MenuContext } from '../types';

let seq = 1;
function nextId(): string {
  seq += 1;
  return `s${seq}`;
}

const MAIN: IpodScreen = {
  id: 'main',
  title: 'iPod',
  kind: 'menu',
  menuId: 'main',
  selectedIndex: 0,
};

export interface NavState {
  stack: IpodScreen[];
  bootDone: boolean;
  letterOverlay?: string;
  contextMenu: boolean;
  push: (screen: Omit<IpodScreen, 'id' | 'selectedIndex'> & Partial<Pick<IpodScreen, 'selectedIndex'>>) => void;
  pop: () => void;
  popToMain: () => void;
  replaceTop: (patch: Partial<IpodScreen>) => void;
  setIndex: (index: number) => void;
  move: (delta: number, count: number) => void;
  setBootDone: () => void;
  setLetter: (letter?: string) => void;
  setContextMenu: (open: boolean) => void;
  current: () => IpodScreen;
}

export const useNav = create<NavState>((set, get) => ({
  stack: [{ ...MAIN, kind: 'boot' }],
  bootDone: false,
  contextMenu: false,
  push: (screen) =>
    set({
      contextMenu: false,
      stack: [
        ...get().stack,
        {
          selectedIndex: 0,
          ...screen,
          id: nextId(),
        },
      ],
    }),
  pop: () => {
    const { stack, contextMenu } = get();
    if (contextMenu) {
      set({ contextMenu: false });
      return;
    }
    if (stack.length <= 1) return;
    set({ stack: stack.slice(0, -1), letterOverlay: undefined });
  },
  popToMain: () =>
    set({
      stack: [{ ...MAIN }],
      contextMenu: false,
      letterOverlay: undefined,
    }),
  replaceTop: (patch) => {
    const stack = [...get().stack];
    const top = stack[stack.length - 1];
    if (!top) return;
    stack[stack.length - 1] = { ...top, ...patch };
    set({ stack });
  },
  setIndex: (index) => {
    const stack = [...get().stack];
    const top = stack[stack.length - 1];
    if (!top) return;
    stack[stack.length - 1] = { ...top, selectedIndex: Math.max(0, index) };
    set({ stack });
  },
  move: (delta, count) => {
    if (count <= 0) return;
    const top = get().stack[get().stack.length - 1];
    if (!top) return;
    const next = (top.selectedIndex + delta + count) % count;
    get().setIndex(next);
  },
  setBootDone: () => set({ bootDone: true, stack: [{ ...MAIN }] }),
  setLetter: (letter) => set({ letterOverlay: letter }),
  setContextMenu: (open) => set({ contextMenu: open }),
  current: () => get().stack[get().stack.length - 1] ?? MAIN,
}));

export function screenOf(state: NavState): IpodScreen {
  return state.stack[state.stack.length - 1] ?? MAIN;
}

export function pushMenu(title: string, menuId: string, context?: MenuContext): void {
  useNav.getState().push({ title, kind: 'menu', menuId, context });
}
