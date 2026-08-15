import type { NanoColor } from './types';

export const SCREEN = {
  bg: '#000000',
  text: '#ffffff',
  textDim: '#b8b8b8',
  headerTop: '#7a7a7a',
  headerMid: '#3a3a3a',
  headerBot: '#1c1c1c',
  headerBorder: '#000000',
  row: '#000000',
  chevron: '#8e8e8e',
  value: '#d0d0d0',
  previewBg: '#050505',
  artworkBg: '#2b2b2b',
  progress: '#ffffff',
  progressTrack: '#4a4a4a',
  overlay: 'rgba(0,0,0,0.55)',
};

export const SELECT = {
  colors: ['#a9d8fb', '#4aa3ea', '#1a73d4', '#0d4fa8'] as const,
  locations: [0, 0.22, 0.55, 1] as const,
  gloss: 'rgba(255,255,255,0.45)',
};

export const FINISHES: Record<
  NanoColor,
  {
    name: string;
    body: [string, string, string, string];
    edge: string;
    wheel: [string, string, string];
    wheelInner: string;
    center: [string, string];
    label: string;
    bezel: string;
  }
> = {
  silver: {
    name: 'Silver',
    body: ['#f4f4f4', '#d5d5d5', '#c8c8c8', '#ebebeb'],
    edge: '#8e8e8e',
    wheel: ['#ececec', '#cfcfcf', '#bdbdbd'],
    wheelInner: '#d8d8d8',
    center: ['#f7f7f7', '#cfcfcf'],
    label: '#5a5a5a',
    bezel: '#111111',
  },
  black: {
    name: 'Black',
    body: ['#3a3a3a', '#161616', '#0c0c0c', '#2a2a2a'],
    edge: '#000000',
    wheel: ['#2f2f2f', '#1a1a1a', '#0e0e0e'],
    wheelInner: '#1c1c1c',
    center: ['#3a3a3a', '#141414'],
    label: '#d0d0d0',
    bezel: '#000000',
  },
  purple: {
    name: 'Purple',
    body: ['#b184d4', '#7a3fa8', '#5a2c86', '#9b68c4'],
    edge: '#3d1a5c',
    wheel: ['#a56fca', '#7a3fa8', '#5c2d88'],
    wheelInner: '#6d3498',
    center: ['#c49ae0', '#6d3498'],
    label: '#f3e6ff',
    bezel: '#1a0a28',
  },
  blue: {
    name: 'Blue',
    body: ['#6ec8f2', '#1f92d4', '#0b6fb0', '#4bb4ea'],
    edge: '#064e7c',
    wheel: ['#5ebced', '#1f92d4', '#0d73b4'],
    wheelInner: '#1684c4',
    center: ['#8fd4f6', '#1684c4'],
    label: '#effaff',
    bezel: '#04283f',
  },
  green: {
    name: 'Green',
    body: ['#b6e05a', '#7cb518', '#5b8c0c', '#9fd13a'],
    edge: '#3d5e08',
    wheel: ['#a6d446', '#7cb518', '#5e900e'],
    wheelInner: '#6da312',
    center: ['#c8ec78', '#6da312'],
    label: '#f4ffe0',
    bezel: '#1a2a04',
  },
  yellow: {
    name: 'Yellow',
    body: ['#ffe566', '#f5c400', '#d4a400', '#ffd83a'],
    edge: '#8a6a00',
    wheel: ['#ffde4a', '#f5c400', '#d8a800'],
    wheelInner: '#e8b800',
    center: ['#fff0a0', '#e8b800'],
    label: '#5a4300',
    bezel: '#2a2000',
  },
  orange: {
    name: 'Orange',
    body: ['#ffb060', '#ff7a18', '#e05a00', '#ff9440'],
    edge: '#9a3a00',
    wheel: ['#ff9a40', '#ff7a18', '#e26008'],
    wheelInner: '#f06a0c',
    center: ['#ffc080', '#f06a0c'],
    label: '#fff4ea',
    bezel: '#2a1200',
  },
  pink: {
    name: 'Pink',
    body: ['#ffb0d4', '#ff6eae', '#e04890', '#ff8ec0'],
    edge: '#9a3068',
    wheel: ['#ff8ec0', '#ff6eae', '#e24c94'],
    wheelInner: '#f0589e',
    center: ['#ffc4e0', '#f0589e'],
    label: '#fff0f6',
    bezel: '#2a1018',
  },
  red: {
    name: '(PRODUCT)RED',
    body: ['#ef5a62', '#c8102e', '#9e0b22', '#e03a44'],
    edge: '#5a0612',
    wheel: ['#e0444c', '#c8102e', '#a00e24'],
    wheelInner: '#b81228',
    center: ['#f87880', '#b81228'],
    label: '#ffe8ea',
    bezel: '#220408',
  },
};

export const FONT = {
  family: 'Helvetica Neue',
  regular: 'System',
};
