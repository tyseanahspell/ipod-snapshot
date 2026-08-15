import { useEffect, useRef } from 'react';
import {
  createAudioPlayer,
  setAudioModeAsync,
  useAudioPlayerStatus,
  type AudioPlayer,
} from 'expo-audio';
import { currentSong, usePlayer } from '../store/playerStore';
import { useSettings } from '../store/settingsStore';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

let shared: AudioPlayer | null = null;

function getPlayer(): AudioPlayer {
  if (!shared) {
    shared = createAudioPlayer(null, { updateInterval: 250, keepAudioSessionActive: true });
  }
  return shared;
}

export function PlaybackController() {
  const isPlaying = usePlayer((s) => s.isPlaying);
  const volume = usePlayer((s) => s.volume);
  const repeat = usePlayer((s) => s.repeat);
  const source = usePlayer((s) => s.source);
  const radioUri = usePlayer((s) => s.radioUri);
  const position = usePlayer((s) => s.position);
  const page = usePlayer((s) => s.page);
  const song = usePlayer(currentSong);
  const limit = useSettings((s) => s.volumeLimit);
  const loadedUri = useRef<string | null>(null);
  const finished = useRef(false);
  const player = getPlayer();
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    void (async () => {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });
    })();
  }, []);

  useEffect(() => {
    const store = usePlayer.getState();
    if (store.seeking) return;
    store.setPlayback({
      isPlaying: status.playing,
      position: status.currentTime,
      duration: status.duration,
    });
    if (status.didJustFinish && store.source === 'library') {
      if (!finished.current) {
        finished.current = true;
        store.next();
      }
    } else {
      finished.current = false;
    }
  }, [status]);

  useEffect(() => {
    const uri = source === 'radio' ? radioUri : song?.uri;
    if (!uri) {
      player.pause();
      loadedUri.current = null;
      return;
    }
    if (loadedUri.current !== uri) {
      player.replace({ uri });
      loadedUri.current = uri;
      player.loop = repeat === 'one' && source === 'library';
      player.setActiveForLockScreen(true, {
        title: source === 'radio' ? usePlayer.getState().radioName ?? 'Radio' : song?.title,
        artist: source === 'radio' ? 'FM Radio' : song?.artist,
        albumTitle: song?.album,
        artworkUrl: song?.artworkUri,
      });
    }
    player.volume = Math.min(limit, volume);
    if (isPlaying) {
      player.play();
      void activateKeepAwakeAsync('nano-playback');
    } else {
      player.pause();
      void deactivateKeepAwake('nano-playback');
    }
  }, [player, song?.uri, song?.title, song?.artist, song?.album, song?.artworkUri, isPlaying, volume, limit, source, radioUri, repeat]);

  useEffect(() => {
    player.loop = repeat === 'one' && source === 'library';
  }, [player, repeat, source]);

  useEffect(() => {
    if (page !== 'scrub') return;
    void player.seekTo(position);
  }, [player, position, page]);

  return null;
}
