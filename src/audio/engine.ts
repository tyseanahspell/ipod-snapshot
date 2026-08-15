import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

let shared: AudioPlayer | null = null;
let loadedUri: string | null = null;
let onEnded: (() => void) | null = null;
let endedLock = false;
const wired = new WeakSet<HTMLAudioElement>();

type WebPlayer = AudioPlayer & { media?: HTMLAudioElement; src?: { uri: string } | string | null };

export function getAudioPlayer(): AudioPlayer {
  if (!shared) {
    shared = createAudioPlayer(null, { updateInterval: 250, keepAudioSessionActive: true });
    wireEnded(shared);
  }
  return shared;
}

export function setOnTrackEnded(handler: (() => void) | null): void {
  onEnded = handler;
}

function notifyEnded(): void {
  if (endedLock) return;
  endedLock = true;
  try {
    onEnded?.();
  } finally {
    setTimeout(() => {
      endedLock = false;
    }, 400);
  }
}

function mediaOf(player: AudioPlayer): HTMLAudioElement | undefined {
  const media = (player as WebPlayer).media;
  return media && typeof media.addEventListener === 'function' ? media : undefined;
}

function wireEnded(player: AudioPlayer): void {
  const media = mediaOf(player);
  if (!media || wired.has(media)) return;
  wired.add(media);
  media.addEventListener('ended', notifyEnded);
}

function loadUri(player: AudioPlayer, uri: string): void {
  const media = mediaOf(player);
  if (media) {
    if (loadedUri !== uri) {
      media.src = uri;
      (player as WebPlayer).src = { uri };
      loadedUri = uri;
    } else {
      media.currentTime = 0;
    }
    wireEnded(player);
    return;
  }
  if (loadedUri !== uri) {
    player.replace({ uri });
    loadedUri = uri;
  } else {
    void player.seekTo(0);
  }
}

export function loadSource(uri: string): void {
  loadUri(getAudioPlayer(), uri);
}

export function playSource(uri?: string): void {
  const player = getAudioPlayer();
  if (!uri) {
    player.pause();
    loadedUri = null;
    return;
  }
  loadUri(player, uri);
  player.play();
}

export function resumeSource(): void {
  getAudioPlayer().play();
}

export function pauseSource(): void {
  getAudioPlayer().pause();
}

export function currentSourceUri(): string | null {
  return loadedUri;
}

export function reportTrackEnded(): void {
  notifyEnded();
}
