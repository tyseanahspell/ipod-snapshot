import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusHeader } from './StatusHeader';
import { MenuList } from './MenuList';
import { PreviewPanel } from './PreviewPanel';
import { NowPlayingView } from './NowPlayingView';
import { CoverFlowView } from './CoverFlowView';
import { VideoScreen } from './VideoScreen';
import { PhotoGrid, PhotoViewer } from './PhotoViews';
import { RadioView } from './RadioView';
import {
  AboutView,
  BootView,
  BrickGame,
  BrightnessView,
  ClockView,
  ContextMenu,
  LoadingView,
  NoteView,
  NotesList,
  PedometerView,
  SearchView,
  StopwatchView,
  VoiceMemoView,
} from './ExtraViews';
import { useLibrary } from '../store/libraryStore';
import { currentSong, usePlayer } from '../store/playerStore';
import { screenOf, useNav } from '../store/navStore';
import { useSettings } from '../store/settingsStore';
import { useExtras } from '../store/extrasStore';
import { artworkForPreview, buildMenu, photosFor } from '../navigation/menus';
import type { PreviewKind } from '../types';

function previewKind(menuId?: string, selectedLabel?: string): PreviewKind {
  if (menuId !== 'main') {
    if (menuId === 'music' || menuId === 'artists' || menuId === 'albums') return 'albums';
    if (menuId === 'videos') return 'videos';
    if (menuId === 'photos') return 'photos';
    return 'albums';
  }
  switch (selectedLabel) {
    case 'Videos':
      return 'videos';
    case 'Photos':
      return 'photos';
    case 'Radio':
      return 'radio';
    case 'Extras':
      return 'extras';
    case 'Settings':
      return 'storage';
    case 'Shuffle Songs':
      return 'shuffle';
    default:
      return 'albums';
  }
}

export function LcdScreen({ battery, charging }: { battery: number; charging?: boolean }) {
  const nav = useNav();
  const screen = screenOf(nav);
  const library = useLibrary((s) => s.library);
  const loading = useLibrary((s) => s.loading);
  const progress = useLibrary((s) => s.progress);
  const error = useLibrary((s) => s.error);
  const settings = useSettings();
  const player = usePlayer();
  const extras = useExtras();
  const song = currentSong(player);
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
      useExtras.getState().tickStopwatch(Date.now());
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    if (screen.kind !== 'menu' || !screen.menuId) return [];
    return buildMenu(screen.menuId, library, settings, screen.context, {
      nowPlaying: Boolean(song || player.source === 'radio'),
    });
  }, [screen.kind, screen.menuId, screen.context, library, settings, song, player.source]);

  const title = screen.kind === 'nowPlaying' ? 'Now Playing' : screen.title;
  const playing = player.isPlaying && (player.source === 'library' || player.source === 'radio');
  const paused = !player.isPlaying && Boolean(song || player.source === 'radio');
  const selected = rows[screen.selectedIndex];
  const pKind = previewKind(screen.menuId, selected?.label);
  const images = artworkForPreview(pKind, library, screen.context);
  const showPreview = settings.previewPanel && screen.kind === 'menu' && screen.menuId === 'main';
  const visibleCount = showPreview ? 6 : 8;
  const gb = ((library.bytes ?? 0) / (1024 * 1024 * 1024)).toFixed(1);

  let body = null;
  if (loading) {
    body = <LoadingView message={progress?.message ?? 'Loading…'} />;
  } else if (nav.contextMenu) {
    body = <ContextMenu index={screen.selectedIndex} />;
  } else if (screen.kind === 'boot') {
    body = <BootView />;
  } else if (screen.kind === 'menu') {
    body = (
      <>
        <MenuList rows={rows} selectedIndex={screen.selectedIndex} large={settings.fontSize === 'large'} visibleCount={visibleCount} />
        {showPreview ? (
          <PreviewPanel
            kind={pKind}
            images={images}
            storageLabel={`${library.songs.length} songs · ${gb} GB`}
            clock={clock}
          />
        ) : null}
      </>
    );
  } else if (screen.kind === 'nowPlaying') {
    body = (
      <NowPlayingView
        song={song}
        position={player.position}
        duration={player.duration}
        page={player.page}
        shuffle={player.shuffle}
        repeat={player.repeat}
        rating={song ? settings.ratings[song.id] ?? 0 : 0}
        volume={player.volume}
      />
    );
  } else if (screen.kind === 'coverFlow') {
    body = <CoverFlowView library={library} index={screen.selectedIndex} />;
  } else if (screen.kind === 'video') {
    const item = library.videos.find((v) => v.id === screen.videoId);
    body = item ? (
      <VideoScreen item={item} playing={player.isPlaying} onEnded={() => useNav.getState().pop()} />
    ) : (
      <LoadingView message="Missing video" />
    );
  } else if (screen.kind === 'photos') {
    body = <PhotoGrid photos={photosFor(library, screen.context?.album)} selectedIndex={screen.selectedIndex} />;
  } else if (screen.kind === 'photo') {
    const photos = photosFor(library, screen.context?.album);
    body = <PhotoViewer photos={photos} index={screen.selectedIndex} />;
  } else if (screen.kind === 'radio') {
    body = <RadioView freq={player.radioFreq} playing={player.isPlaying && player.source === 'radio'} />;
  } else if (screen.kind === 'clock') {
    body = <ClockView />;
  } else if (screen.kind === 'stopwatch') {
    body = <StopwatchView ticks={extras.stopwatchMs} running={extras.stopwatchRunning} />;
  } else if (screen.kind === 'game') {
    body = <BrickGame tickDir={extras.gameDir} seq={extras.gameSeq} />;
  } else if (screen.kind === 'notes') {
    body = <NotesList notes={library.notes} index={screen.selectedIndex} />;
  } else if (screen.kind === 'note') {
    body = <NoteView note={library.notes.find((n) => n.id === screen.noteId)} />;
  } else if (screen.kind === 'voiceMemo') {
    body = <VoiceMemoView />;
  } else if (screen.kind === 'pedometer') {
    body = <PedometerView />;
  } else if (screen.kind === 'about') {
    body = <AboutView library={library} />;
  } else if (screen.kind === 'brightness') {
    body = <BrightnessView value={settings.brightness} />;
  } else if (screen.kind === 'search') {
    body = <SearchView query="" />;
  }

  return (
    <View style={styles.lcd}>
      {screen.kind !== 'boot' ? (
        <StatusHeader
          title={title}
          playing={playing}
          paused={paused}
          hold={settings.hold}
          battery={battery}
          charging={charging}
        />
      ) : null}
      <View style={styles.body}>{body}</View>
      {error && !loading ? (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {nav.letterOverlay && screen.kind === 'menu' && rows.length > 20 ? (
        <View style={styles.letter}>
          <Text style={styles.letterText}>{nav.letterOverlay}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lcd: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  body: { flex: 1 },
  letter: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  letterText: { color: '#fff', fontSize: 64, fontWeight: '700' },
  error: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.82)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  errorText: { color: '#ffb4b4', fontSize: 10, textAlign: 'center' },
});
