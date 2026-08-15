import { File, Paths } from 'expo-file-system';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import type { ClickerMode } from '../types';
import { usePlayer } from '../store/playerStore';

let player: AudioPlayer | null = null;
let ready = false;
let clickUri: string | null = null;

function pcmClick(): Uint8Array {
  const sampleRate = 22050;
  const samples = 180;
  const dataSize = samples * 2;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  const str = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(offset + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < samples; i += 1) {
    const env = Math.max(0, 1 - i / samples);
    const sample = Math.sin((i / sampleRate) * 1800 * Math.PI * 2) * env * 0.35;
    view.setInt16(44 + i * 2, sample * 32767, true);
  }
  return new Uint8Array(buf);
}

async function ensureClick(): Promise<string | null> {
  if (clickUri) return clickUri;
  try {
    const file = new File(Paths.cache, 'nano-click.wav');
    if (!file.exists) {
      file.create();
      file.write(pcmClick());
    }
    clickUri = file.uri;
    return clickUri;
  } catch {
    return null;
  }
}

export async function initClicker(): Promise<void> {
  if (ready) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'mixWithOthers',
      allowsRecording: false,
    });
    const uri = await ensureClick();
    if (uri) {
      player = createAudioPlayer({ uri }, { updateInterval: 1000 });
      player.volume = 0.22;
    }
    ready = true;
  } catch {
    ready = true;
  }
}

export function playClick(mode: ClickerMode): void {
  if (mode === 'off' || !player) return;
  try {
    if (usePlayer.getState().isPlaying) return;
    player.volume = mode === 'speaker' ? 0.35 : 0.18;
    void player.seekTo(0).then(() => player?.play());
  } catch {
    /* ignore */
  }
}
