const DOUBLE_MS = 350;

export function createDoubleTap(delay = DOUBLE_MS) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastId = '';
  let pending: (() => void) | null = null;

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    tap(id: string, single: () => void, double: () => void) {
      if (timer && lastId === id) {
        clearTimer();
        pending = null;
        lastId = '';
        double();
        return;
      }
      if (timer && pending) {
        clearTimer();
        pending();
      }
      lastId = id;
      pending = single;
      timer = setTimeout(() => {
        const fn = pending;
        timer = null;
        pending = null;
        lastId = '';
        fn?.();
      }, delay);
    },
    cancel() {
      clearTimer();
      pending = null;
      lastId = '';
    },
  };
}
