import { useEffect, useRef } from 'react';
import { setAudioModeAsync, useAudioPlayerStatus } from 'expo-audio';
import { currentSong, usePlayer } from '../store/playerStore';
import { useSettings } from '../store/settingsStore';
import { activateKeepAwakeAsync, deactivateKeepAwake, isAvailableAsync } from 'expo-keep-awake';
import { currentSourceUri, getAudioPlayer, loadSource, pauseSource, playSource } from './engine';

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
  const finished = useRef(false);
  const player = getAudioPlayer();
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
      pauseSource();
      return;
    }
    if (currentSourceUri() !== uri) {
      if (isPlaying) playSource(uri);
      else loadSource(uri);
    } else if (!isPlaying) {
      pauseSource();
    }
    player.loop = repeat === 'one' && source === 'library';
    player.volume = Math.min(limit, volume);
    player.setActiveForLockScreen(true, {
      title: source === 'radio' ? usePlayer.getState().radioName ?? 'Radio' : song?.title,
      artist: source === 'radio' ? 'FM Radio' : song?.artist,
      albumTitle: song?.album,
      artworkUrl: song?.artworkUri,
    });
  }, [player, song?.uri, song?.title, song?.artist, song?.album, song?.artworkUri, isPlaying, volume, limit, source, radioUri, repeat]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    let cancelled = false;
    void (async () => {
      try {
        if (!(await isAvailableAsync()) || cancelled) return;
        await activateKeepAwakeAsync('nano-playback');
      } catch {
        /* Screen Wake Lock is optional on web. */
      }
    })();
    return () => {
      cancelled = true;
      void deactivateKeepAwake('nano-playback').catch(() => {});
    };
  }, [isPlaying]);

  useEffect(() => {
    player.loop = repeat === 'one' && source === 'library';
  }, [player, repeat, source]);

  useEffect(() => {
    if (page !== 'scrub') return;
    void player.seekTo(position);
  }, [player, position, page]);

  return null;
}
