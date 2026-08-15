#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const extra = process.argv.slice(2);
const require = createRequire(join(root, 'package.json'));

const media = spawn(process.execPath, [join(root, 'scripts/media-server.mjs'), '--background'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

const expoCli = join(root, 'node_modules/expo/bin/cli');
const expo = spawn(process.execPath, [expoCli, 'start', ...extra], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

const isWeb = extra.includes('--web');
let devtools = null;
if (isWeb) {
  try {
    const electron = require('electron');
    const app = join(root, 'node_modules/react-devtools/app.js');
    devtools = spawn(electron, [app], {
      cwd: root,
      stdio: 'ignore',
      env: process.env,
    });
    devtools.on('exit', (code) => {
      if (code && code !== 0) {
        console.warn(
          'Standalone React DevTools did not open. For this web app, install the React Developer Tools browser extension and press F12.',
        );
      }
    });
  } catch (error) {
    console.warn(
      'Could not launch React DevTools.',
      error instanceof Error ? error.message : error,
    );
  }
}

function shutdown() {
  expo.kill('SIGINT');
  media.kill('SIGINT');
  devtools?.kill('SIGTERM');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

expo.on('exit', (code) => {
  media.kill('SIGINT');
  devtools?.kill('SIGTERM');
  process.exit(code ?? 0);
});

media.on('exit', (code, signal) => {
  if (signal === 'SIGINT' || signal === 'SIGTERM') return;
  if (code && code !== 0) {
    console.warn('Computer library server exited. Phone folder and device library still work.');
  }
});
