import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

let shared: AudioPlayer | null = null;
let loadedUri: string | null = null;

export function getAudioPlayer(): AudioPlayer {
  if (!shared) {
    shared = createAudioPlayer(null, { updateInterval: 250, keepAudioSessionActive: true });
  }
  return shared;
}

export function loadSource(uri: string): void {
  const player = getAudioPlayer();
  if (loadedUri === uri) return;
  player.replace({ uri });
  loadedUri = uri;
}

export function playSource(uri?: string): void {
  const player = getAudioPlayer();
  if (!uri) {
    player.pause();
    loadedUri = null;
    return;
  }
  if (loadedUri !== uri) {
    player.replace({ uri });
    loadedUri = uri;
  } else {
    void player.seekTo(0);
  }
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
