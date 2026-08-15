#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const extra = process.argv.slice(2);

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

function shutdown() {
  expo.kill('SIGINT');
  media.kill('SIGINT');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

expo.on('exit', (code) => {
  media.kill('SIGINT');
  process.exit(code ?? 0);
});

media.on('exit', (code, signal) => {
  if (signal === 'SIGINT' || signal === 'SIGTERM') return;
  if (code && code !== 0) {
    console.warn('Computer library server exited. Phone folder and device library still work.');
  }
});
