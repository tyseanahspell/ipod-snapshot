/**
 * Standalone `react-devtools` does not auto-attach to Expo web.
 * React Native skips the port 8097 socket when `window.document` exists.
 * Connect before any React import so the Electron app can inspect this page.
 */
declare const __DEV__: boolean;

if (__DEV__) {
  try {
    // Match the installed `react-devtools` UI (7.x), not RN's 6.x copy.
    const {
      initialize,
      connectToDevTools,
    } = require('../node_modules/react-devtools/node_modules/react-devtools-core') as {
      initialize: () => void;
      connectToDevTools: (options: { host: string; port: number }) => void;
    };
    initialize();
    connectToDevTools({
      host: window.location.hostname,
      port: 8097,
    });
  } catch {
    /* DevTools window not running, or backend failed to load */
  }
}
