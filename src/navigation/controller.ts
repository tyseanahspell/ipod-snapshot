import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { MenuAction, MenuRow } from '../types';
import { playClick } from '../services/clicker';
import { nearestStation, isTuned, STATIONS } from '../services/radio';
import { useLibrary } from '../store/libraryStore';
import { useNav, pushMenu } from '../store/navStore';
import { currentSong, usePlayer } from '../store/playerStore';
import { useSettings } from '../store/settingsStore';
import { useExtras } from '../store/extrasStore';
import { buildMenu, nextBacklight, photosFor, playableSongs, queueFor } from './menus';

const FONT_CYCLE = ['standard', 'large'] as const;

function haptic(): void {
  if (Platform.OS === 'web') return;
  void Haptics.selectionAsync().catch(() => undefined);
}

function click(): void {
  const { clicker, hold } = useSettings.getState();
  if (hold) return;
  playClick(clicker);
  haptic();
}

export function currentRows(): MenuRow[] {
  const nav = useNav.getState();
  const screen = nav.current();
  if (screen.kind !== 'menu' || !screen.menuId) return [];
  const library = useLibrary.getState().library;
  const settings = useSettings.getState();
  const playing = Boolean(currentSong(usePlayer.getState()) || usePlayer.getState().source === 'radio');
  return buildMenu(screen.menuId, library, settings, screen.context, { nowPlaying: playing });
}

export function runAction(action: MenuAction): void {
  const nav = useNav.getState();
  const player = usePlayer.getState();
  const settings = useSettings.getState();
  const library = useLibrary.getState().library;

  switch (action.type) {
    case 'pushMenu':
      pushMenu(action.title, action.menuId, action.context);
      break;
    case 'playSong': {
      const songs = queueFor(library, settings, action.queue, action.contextKey);
      const index = songs.findIndex((s) => s.id === action.songId);
      player.playQueue(songs, Math.max(0, index), settings.shuffle === 'songs');
      nav.push({ title: 'Now Playing', kind: 'nowPlaying' });
      break;
    }
    case 'playAll': {
      const songs = queueFor(library, settings, action.queue, action.contextKey);
      player.playQueue(songs, 0, action.shuffled || settings.shuffle === 'songs');
      nav.push({ title: 'Now Playing', kind: 'nowPlaying' });
      break;
    }
    case 'playVideo':
      nav.push({ title: 'Now Playing', kind: 'video', videoId: action.videoId });
      player.stopRadio();
      player.setPlayback({ isPlaying: true });
      break;
    case 'openPhotos':
      nav.push({ title: action.album ?? 'Photos', kind: 'photos', context: action.album ? { album: action.album } : undefined });
      break;
    case 'openPhoto':
      nav.push({ title: 'Photo', kind: 'photo', photoId: action.photoId, context: action.album ? { album: action.album } : undefined });
      break;
    case 'openRadio':
      nav.push({ title: 'Radio', kind: 'radio' });
      break;
    case 'openCoverFlow':
      nav.push({ title: 'Cover Flow', kind: 'coverFlow' });
      break;
    case 'openNowPlaying':
      nav.push({ title: 'Now Playing', kind: 'nowPlaying' });
      break;
    case 'openSearch':
      nav.push({ title: 'Search', kind: 'search' });
      break;
    case 'openClock':
      nav.push({ title: 'Clock', kind: 'clock' });
      break;
    case 'openStopwatch':
      nav.push({ title: 'Stopwatch', kind: 'stopwatch' });
      break;
    case 'openGame':
      nav.push({ title: 'Brick', kind: 'game', game: action.game });
      break;
    case 'openNotes':
      nav.push({ title: 'Notes', kind: 'notes' });
      break;
    case 'openNote':
      nav.push({ title: 'Note', kind: 'note', noteId: action.noteId });
      break;
    case 'openVoiceMemos':
      nav.push({ title: 'Voice Memos', kind: 'voiceMemo' });
      break;
    case 'openPedometer':
      nav.push({ title: 'Pedometer', kind: 'pedometer' });
      break;
    case 'openAbout':
      nav.push({ title: 'About', kind: 'about' });
      break;
    case 'openBrightness':
      nav.push({ title: 'Brightness', kind: 'brightness' });
      break;
    case 'openLibrary':
      nav.push({ title: 'Library', kind: 'menu', menuId: 'library' });
      break;
    case 'shuffleSongs': {
      const songs = playableSongs(library).filter((s) => s.kind === 'song');
      if (songs.length === 0) return;
      player.playQueue(songs, Math.floor(Math.random() * songs.length), true);
      nav.push({ title: 'Now Playing', kind: 'nowPlaying' });
      break;
    }
    case 'toggleSetting':
      if (action.key === 'previewPanel' || action.key === 'soundCheck' || action.key === 'crossfade' || action.key === 'shakeToShuffle' || action.key === 'coverFlowRotate') {
        settings.toggle(action.key);
      }
      break;
    case 'cycleSetting':
      if (action.key === 'shuffle') settings.cycleShuffle();
      else if (action.key === 'repeat') settings.cycleRepeat();
      else if (action.key === 'clicker') settings.cycleClicker();
      else if (action.key === 'fontSize') {
        const i = FONT_CYCLE.indexOf(settings.fontSize);
        settings.set('fontSize', FONT_CYCLE[(i + 1) % FONT_CYCLE.length]);
      } else if (action.key === 'backlightSeconds') {
        settings.set('backlightSeconds', nextBacklight(settings.backlightSeconds));
      } else if (action.key === 'volumeLimit') {
        const next = settings.volumeLimit >= 0.99 ? 0.4 : Math.round((settings.volumeLimit + 0.2) * 10) / 10;
        settings.set('volumeLimit', next);
        const player = usePlayer.getState();
        if (player.volume > next) player.setVolume(next);
      }
      break;
    case 'setSetting':
      if (action.key === 'eq') settings.set('eq', String(action.value));
      if (action.key === 'color') settings.set('color', action.value as SettingsStateColor);
      if (action.key === 'volumeLimit') settings.set('volumeLimit', Number(action.value));
      break;
    case 'pickFolder':
      void useLibrary.getState().pickFolder();
      break;
    case 'pickComputerFolder':
      void useLibrary.getState().pickComputerFolder();
      break;
    case 'pickBrowserFolder':
      void useLibrary.getState().pickBrowserFolder();
      break;
    case 'scanMediaLibrary':
      void useLibrary.getState().scanDevice();
      break;
    case 'rescan':
      void useLibrary.getState().rescan();
      break;
    case 'resetSettings':
      settings.reset();
      break;
    default:
      break;
  }
}

type SettingsStateColor = 'silver' | 'black' | 'purple' | 'blue' | 'green' | 'yellow' | 'orange' | 'pink' | 'red';

export function onWheelTick(delta: number): void {
  if (useSettings.getState().hold) return;
  click();
  const nav = useNav.getState();
  const screen = nav.current();
  const player = usePlayer.getState();
  const settings = useSettings.getState();

  if (nav.contextMenu) {
    nav.move(delta, 4);
    return;
  }

  if (screen.kind === 'menu') {
    const rows = currentRows();
    nav.move(delta, rows.length);
    const next = rows[(nav.current().selectedIndex + rows.length) % Math.max(rows.length, 1)];
    if (next?.label) nav.setLetter(next.label.charAt(0).toUpperCase());
    setTimeout(() => {
      if (useNav.getState().letterOverlay) useNav.getState().setLetter(undefined);
    }, 700);
    return;
  }

  if (screen.kind === 'nowPlaying') {
    if (player.page === 'info') {
      const next = player.volume + delta * 0.04;
      const capped = Math.min(settings.volumeLimit, Math.max(0, next));
      player.setVolume(capped);
      settings.set('volume', capped);
    } else if (player.page === 'scrub') {
      const dur = player.duration || 1;
      player.seekTo(Math.min(dur, Math.max(0, player.position + delta * dur * 0.02)));
    } else if (player.page === 'shuffle') {
      if (delta > 0) {
        if (player.shuffle === 'off') player.setShuffle('songs');
        else if (player.shuffle === 'songs') player.setShuffle('albums');
      } else if (player.shuffle === 'albums') player.setShuffle('songs');
      else if (player.shuffle === 'songs') player.setShuffle('off');
      settings.set('shuffle', player.shuffle);
    } else if (player.page === 'rating') {
      const song = currentSong(player);
      if (!song) return;
      const current = settings.ratings[song.id] ?? song.rating ?? 0;
      settings.setRating(song.id, Math.min(5, Math.max(0, current + delta)));
    }
    return;
  }

  if (screen.kind === 'coverFlow') {
    const albums = new Set(playableSongs(useLibrary.getState().library).map((s) => `${s.albumArtist || s.artist}:::${s.album}`));
    nav.move(delta, Math.max(albums.size, 1));
    return;
  }

  if (screen.kind === 'radio') {
    const freq = Math.min(108, Math.max(87.5, Math.round((player.radioFreq + delta * 0.2) * 10) / 10));
    const station = nearestStation(freq);
    if (station && isTuned(freq, station)) player.tuneRadio(freq, station);
    else player.tuneRadio(freq);
    return;
  }

  if (screen.kind === 'photos') {
    const photos = photosFor(useLibrary.getState().library, screen.context?.album);
    nav.move(delta, Math.max(photos.length, 1));
    return;
  }

  if (screen.kind === 'photo') {
    const photos = photosFor(useLibrary.getState().library, screen.context?.album);
    nav.move(delta, Math.max(photos.length, 1));
    return;
  }

  if (screen.kind === 'search' || screen.kind === 'notes') {
    nav.move(delta, 20);
    return;
  }

  if (screen.kind === 'brightness') {
    settings.set('brightness', Math.min(1, Math.max(0.2, settings.brightness + delta * 0.05)));
    return;
  }

  if (screen.kind === 'game') {
    useExtras.getState().nudgeGame(delta);
    return;
  }

  if (screen.kind === 'about' || screen.kind === 'clock' || screen.kind === 'stopwatch' || screen.kind === 'voiceMemo' || screen.kind === 'pedometer' || screen.kind === 'note') {
    return;
  }
}

export function onSelect(): void {
  if (useSettings.getState().hold) return;
  click();
  const nav = useNav.getState();
  const screen = nav.current();

  if (nav.contextMenu) {
    const song = currentSong(usePlayer.getState());
    const options = ['Start Genius', 'Add to On-The-Go', 'Browse Album', 'Cancel'];
    const choice = options[screen.selectedIndex] ?? 'Cancel';
    nav.setContextMenu(false);
    if (!song) return;
    if (choice === 'Add to On-The-Go') useSettings.getState().addToOnTheGo(song.id);
    if (choice === 'Browse Album') {
      pushMenu(song.album, 'album', { albumKey: `${song.albumArtist || song.artist}:::${song.album}`, artist: song.artist, album: song.album });
    }
    if (choice === 'Start Genius') {
      const library = useLibrary.getState().library;
      const related = playableSongs(library).filter((s) => s.genre === song.genre || s.artist === song.artist);
      usePlayer.getState().playQueue(related.length ? related : [song], related.findIndex((s) => s.id === song.id), true);
    }
    return;
  }

  if (screen.kind === 'menu') {
    const rows = currentRows();
    const row = rows[screen.selectedIndex];
    if (row && !row.disabled) runAction(row.action);
    return;
  }
  if (screen.kind === 'nowPlaying') {
    usePlayer.getState().cyclePage();
    return;
  }
  if (screen.kind === 'coverFlow') {
    const library = useLibrary.getState().library;
    const albums = [...new Map(playableSongs(library).map((s) => [`${s.albumArtist || s.artist}:::${s.album}`, s])).keys()];
    const key = albums[screen.selectedIndex];
    if (key) {
      const [artist, album] = key.split(':::');
      pushMenu(album ?? 'Album', 'album', { albumKey: key, artist, album });
    }
    return;
  }
  if (screen.kind === 'photos') {
    const photos = photosFor(useLibrary.getState().library, screen.context?.album);
    const photo = photos[screen.selectedIndex];
    if (photo) {
      nav.push({ title: 'Photo', kind: 'photo', photoId: photo.id, context: screen.context, selectedIndex: screen.selectedIndex });
    }
    return;
  }
  if (screen.kind === 'radio') {
    const player = usePlayer.getState();
    const station = STATIONS.find((s) => isTuned(player.radioFreq, s));
    if (station) player.tuneRadio(player.radioFreq, station);
    else player.togglePlay();
    return;
  }
  if (screen.kind === 'notes') {
    const note = useLibrary.getState().library.notes[screen.selectedIndex];
    if (note) nav.push({ title: note.title, kind: 'note', noteId: note.id });
    return;
  }
  if (screen.kind === 'search') {
    return;
  }
  if (screen.kind === 'boot') {
    useNav.getState().setBootDone();
  }
}

export function onMenu(): void {
  if (useSettings.getState().hold) return;
  click();
  useNav.getState().pop();
}

export function onMenuHold(): void {
  if (useSettings.getState().hold) return;
  click();
  useNav.getState().popToMain();
}

export function onPlayPause(): void {
  if (useSettings.getState().hold) return;
  click();
  const nav = useNav.getState();
  const player = usePlayer.getState();
  const screen = nav.current();
  if (screen.kind === 'stopwatch') {
    useExtras.getState().toggleStopwatch();
    return;
  }
  if (screen.kind === 'video') {
    player.togglePlay();
    return;
  }
  if (player.queue.length === 0 && player.source !== 'radio') {
    const songs = playableSongs(useLibrary.getState().library);
    if (songs.length) player.playQueue(songs, 0, useSettings.getState().shuffle === 'songs');
    return;
  }
  player.togglePlay();
}

export function onSkip(dir: 1 | -1): void {
  if (useSettings.getState().hold) return;
  click();
  const screen = useNav.getState().current();
  if (screen.kind === 'radio') {
    const player = usePlayer.getState();
    const ordered = [...STATIONS].sort((a, b) => a.frequency - b.frequency);
    const i = ordered.findIndex((s) => isTuned(player.radioFreq, s));
    const next = ordered[(i + dir + ordered.length) % ordered.length] ?? ordered[0];
    if (next) player.tuneRadio(next.frequency, next);
    return;
  }
  if (screen.kind === 'photo') {
    const photos = photosFor(useLibrary.getState().library, screen.context?.album);
    useNav.getState().move(dir, Math.max(photos.length, 1));
    return;
  }
  usePlayer.getState().skip(dir);
}

export function onCenterHold(): void {
  if (useSettings.getState().hold) return;
  const screen = useNav.getState().current();
  if (screen.kind === 'nowPlaying' || screen.kind === 'menu') {
    useNav.getState().setContextMenu(true);
    useNav.getState().setIndex(0);
    click();
  }
}

export function onShake(): void {
  const settings = useSettings.getState();
  if (settings.hold || !settings.shakeToShuffle) return;
  const player = usePlayer.getState();
  if (player.source !== 'library' || player.queue.length < 2) return;
  player.next();
}
