import type { Library, MenuAction, MenuContext, MenuRow, PhotoItem, Song, VideoItem } from '../types';
import { albumsOf, photoAlbums, songsByArtist, songsByComposer, songsByGenre, tvShows, videosOfKind } from '../store/libraryStore';
import { BACKLIGHT_OPTIONS, EQ_PRESETS, type SettingsState } from '../store/settingsStore';
import { FINISHES } from '../theme';
import { Platform } from 'react-native';

function row(id: string, label: string, action: MenuAction, extra?: Partial<MenuRow>): MenuRow {
  return { id, label, action, chevron: action.type === 'pushMenu', ...extra };
}

function countValue(n: number): string {
  return String(n);
}

export function albumKeyOf(song: Song): string {
  return `${song.albumArtist || song.artist}:::${song.album}`;
}

export function playableSongs(library: Library): Song[] {
  return library.songs.filter((s) => s.kind === 'song' || s.kind === 'musicVideo');
}

export function artworkForMenu(menuId: string, library: Library, context?: MenuContext): string[] {
  const albums = albumsOf(library);
  const arts = albums.map((a) => a.artworkUri).filter((u): u is string => Boolean(u));
  if (menuId === 'main' || menuId === 'music' || menuId === 'shuffle') return arts.slice(0, 12);
  if (menuId === 'videos') return library.videos.map((v) => v.artworkUri).filter((u): u is string => Boolean(u)).slice(0, 12);
  if (menuId === 'photos') return library.photos.map((p) => p.uri).slice(0, 12);
  if (context?.artist) {
    return albums.filter((a) => a.artist === context.artist).map((a) => a.artworkUri).filter((u): u is string => Boolean(u));
  }
  return arts.slice(0, 8);
}

export function buildMenu(
  menuId: string,
  library: Library,
  settings: SettingsState,
  context?: MenuContext,
  extras?: { nowPlaying: boolean },
): MenuRow[] {
  switch (menuId) {
    case 'main':
      return [
        row('music', 'Music', { type: 'pushMenu', title: 'Music', menuId: 'music' }),
        row('videos', 'Videos', { type: 'pushMenu', title: 'Videos', menuId: 'videos' }),
        row('photos', 'Photos', { type: 'pushMenu', title: 'Photos', menuId: 'photos' }),
        row('radio', 'Radio', { type: 'openRadio' }, { chevron: true }),
        row('extras', 'Extras', { type: 'pushMenu', title: 'Extras', menuId: 'extras' }),
        row('settings', 'Settings', { type: 'pushMenu', title: 'Settings', menuId: 'settings' }),
        row('shuffle', 'Shuffle Songs', { type: 'shuffleSongs' }),
        ...(extras?.nowPlaying
          ? [row('np', 'Now Playing', { type: 'openNowPlaying' }, { chevron: true })]
          : []),
      ];
    case 'music':
      return [
        row('coverflow', 'Cover Flow', { type: 'openCoverFlow' }, { chevron: true }),
        row('playlists', 'Playlists', { type: 'pushMenu', title: 'Playlists', menuId: 'playlists' }),
        row('artists', 'Artists', { type: 'pushMenu', title: 'Artists', menuId: 'artists' }),
        row('albums', 'Albums', { type: 'pushMenu', title: 'Albums', menuId: 'albums' }),
        row('songs', 'Songs', { type: 'pushMenu', title: 'Songs', menuId: 'songs' }),
        row('podcasts', 'Podcasts', { type: 'pushMenu', title: 'Podcasts', menuId: 'podcasts' }),
        row('genres', 'Genres', { type: 'pushMenu', title: 'Genres', menuId: 'genres' }),
        row('composers', 'Composers', { type: 'pushMenu', title: 'Composers', menuId: 'composers' }),
        row('audiobooks', 'Audiobooks', { type: 'pushMenu', title: 'Audiobooks', menuId: 'audiobooks' }),
        row('search', 'Search', { type: 'openSearch' }, { chevron: true }),
      ];
    case 'artists': {
      const map = songsByArtist(library);
      const names = [...map.keys()].sort((a, b) => a.localeCompare(b));
      if (names.length === 0) return [row('empty', 'No songs', { type: 'noop' })];
      return names.map((artist) =>
        row(artist, artist, { type: 'pushMenu', title: artist, menuId: 'artist', context: { artist } }, {
          chevron: true,
          value: countValue(new Set((map.get(artist) ?? []).map((s) => s.album)).size),
        }),
      );
    }
    case 'artist': {
      const artist = context?.artist ?? '';
      const albums = albumsOf(library).filter((a) => a.artist === artist || a.songs.some((s) => s.artist === artist));
      const all = (songsByArtist(library).get(artist) ?? []).sort(
        (a, b) => a.album.localeCompare(b.album) || (a.trackNumber ?? 0) - (b.trackNumber ?? 0),
      );
      return [
        row('all', 'All Songs', { type: 'playAll', queue: 'artist', contextKey: artist }, { chevron: true }),
        ...albums.map((a) =>
          row(a.key, a.album, { type: 'pushMenu', title: a.album, menuId: 'album', context: { albumKey: a.key, artist: a.artist, album: a.album } }),
        ),
        ...(all.length === 0 ? [row('empty', 'No songs', { type: 'noop' })] : []),
      ];
    }
    case 'albums': {
      const albums = albumsOf(library);
      if (albums.length === 0) return [row('empty', 'No albums', { type: 'noop' })];
      return albums.map((a) =>
        row(a.key, a.album, { type: 'pushMenu', title: a.album, menuId: 'album', context: { albumKey: a.key, artist: a.artist, album: a.album } }, {
          value: a.artist,
        }),
      );
    }
    case 'album': {
      const albums = albumsOf(library);
      const album = albums.find((a) => a.key === context?.albumKey);
      const songs = album?.songs ?? [];
      if (songs.length === 0) return [row('empty', 'No songs', { type: 'noop' })];
      return songs.map((s) =>
        row(s.id, s.title, { type: 'playSong', songId: s.id, queue: 'album', contextKey: album?.key }, { chevron: false }),
      );
    }
    case 'songs': {
      const songs = playableSongs(library);
      if (songs.length === 0) return [row('empty', 'No songs', { type: 'noop' })];
      return songs.map((s) =>
        row(s.id, s.title, { type: 'playSong', songId: s.id, queue: 'songs' }, { value: s.artist, chevron: false }),
      );
    }
    case 'genres': {
      const map = songsByGenre(library);
      const names = [...map.keys()].sort((a, b) => a.localeCompare(b));
      if (names.length === 0) return [row('empty', 'No genres', { type: 'noop' })];
      return names.map((genre) =>
        row(genre, genre, { type: 'pushMenu', title: genre, menuId: 'genre', context: { genre } }, {
          value: countValue(map.get(genre)?.length ?? 0),
        }),
      );
    }
    case 'genre': {
      const songs = (songsByGenre(library).get(context?.genre ?? '') ?? []).sort((a, b) => a.title.localeCompare(b.title));
      if (songs.length === 0) return [row('empty', 'No songs', { type: 'noop' })];
      return [
        row('all', 'All Songs', { type: 'playAll', queue: 'genre', contextKey: context?.genre }, { chevron: true }),
        ...songs.map((s) => row(s.id, s.title, { type: 'playSong', songId: s.id, queue: 'genre', contextKey: context?.genre })),
      ];
    }
    case 'composers': {
      const map = songsByComposer(library);
      const names = [...map.keys()].sort((a, b) => a.localeCompare(b));
      if (names.length === 0) return [row('empty', 'No composers', { type: 'noop' })];
      return names.map((composer) =>
        row(composer, composer, { type: 'pushMenu', title: composer, menuId: 'composer', context: { composer } }),
      );
    }
    case 'composer': {
      const songs = (songsByComposer(library).get(context?.composer ?? '') ?? []).sort((a, b) => a.title.localeCompare(b.title));
      return songs.map((s) =>
        row(s.id, s.title, { type: 'playSong', songId: s.id, queue: 'songs' }),
      );
    }
    case 'playlists': {
      const rows: MenuRow[] = [
        row('otg', 'On-The-Go', { type: 'pushMenu', title: 'On-The-Go', menuId: 'onTheGo' }, {
          value: countValue(settings.onTheGo.length),
        }),
      ];
      if (library.songs.length) {
        rows.push(row('all', 'All Songs', { type: 'playAll', queue: 'songs' }, { chevron: true }));
      }
      return rows;
    }
    case 'onTheGo': {
      const songs = settings.onTheGo
        .map((id) => library.songs.find((s) => s.id === id))
        .filter((s): s is Song => Boolean(s));
      if (songs.length === 0) return [row('empty', 'No songs', { type: 'noop' })];
      return [
        row('play', 'Play', { type: 'playAll', queue: 'onTheGo' }, { chevron: true }),
        ...songs.map((s) => row(s.id, s.title, { type: 'playSong', songId: s.id, queue: 'onTheGo' })),
      ];
    }
    case 'podcasts': {
      const songs = library.songs.filter((s) => s.kind === 'podcast');
      if (songs.length === 0) return [row('empty', 'No podcasts', { type: 'noop' })];
      return songs.map((s) => row(s.id, s.title, { type: 'playSong', songId: s.id, queue: 'podcasts' }));
    }
    case 'audiobooks': {
      const songs = library.songs.filter((s) => s.kind === 'audiobook');
      if (songs.length === 0) return [row('empty', 'No audiobooks', { type: 'noop' })];
      return songs.map((s) => row(s.id, s.title, { type: 'playSong', songId: s.id, queue: 'audiobooks' }));
    }
    case 'videos':
      return [
        row('movies', 'Movies', { type: 'pushMenu', title: 'Movies', menuId: 'movies' }),
        row('tv', 'TV Shows', { type: 'pushMenu', title: 'TV Shows', menuId: 'tvShows' }),
        row('mv', 'Music Videos', { type: 'pushMenu', title: 'Music Videos', menuId: 'musicVideos' }),
        row('vp', 'Video Podcasts', { type: 'pushMenu', title: 'Video Podcasts', menuId: 'videoPodcasts' }),
        row('cam', 'Camera Videos', { type: 'pushMenu', title: 'Camera Videos', menuId: 'cameraVideos' }),
        row('allv', 'All Videos', { type: 'pushMenu', title: 'Videos', menuId: 'allVideos' }),
      ];
    case 'movies':
      return videoRows(videosOfKind(library, 'movie'), 'No movies');
    case 'musicVideos':
      return videoRows(videosOfKind(library, 'musicVideo'), 'No music videos');
    case 'videoPodcasts':
      return videoRows(videosOfKind(library, 'podcast'), 'No video podcasts');
    case 'cameraVideos':
      return videoRows(videosOfKind(library, 'camera'), 'No camera videos');
    case 'allVideos':
      return videoRows(library.videos, 'No videos');
    case 'tvShows': {
      const shows = tvShows(library);
      const names = [...shows.keys()].sort((a, b) => a.localeCompare(b));
      if (names.length === 0) return [row('empty', 'No TV shows', { type: 'noop' })];
      return names.map((show) =>
        row(show, show, { type: 'pushMenu', title: show, menuId: 'tvShow', context: { show } }),
      );
    }
    case 'tvShow':
      return videoRows(
        (tvShows(library).get(context?.show ?? '') ?? []).sort(
          (a, b) => (a.season ?? 0) - (b.season ?? 0) || (a.episode ?? 0) - (b.episode ?? 0),
        ),
        'No episodes',
      );
    case 'photos': {
      const albums = photoAlbums(library);
      const names = [...albums.keys()].sort((a, b) => a.localeCompare(b));
      return [
        row('library', 'Photo Library', { type: 'openPhotos' }, { value: countValue(library.photos.length), chevron: true }),
        ...names.map((album) =>
          row(album, album, { type: 'openPhotos', album }, { value: countValue(albums.get(album)?.length ?? 0), chevron: true }),
        ),
      ];
    }
    case 'extras':
      return [
        row('clock', 'Clock', { type: 'openClock' }, { chevron: true }),
        row('games', 'Games', { type: 'pushMenu', title: 'Games', menuId: 'games' }),
        row('notes', 'Notes', { type: 'openNotes' }, { chevron: true }),
        row('voice', 'Voice Memos', { type: 'openVoiceMemos' }, { chevron: true }),
        row('fit', 'Fitness', { type: 'openPedometer' }, { chevron: true }),
        row('stop', 'Stopwatch', { type: 'openStopwatch' }, { chevron: true }),
      ];
    case 'games':
      return [row('brick', 'Brick', { type: 'openGame', game: 'brick' }, { chevron: true })];
    case 'settings':
      return [
        row('about', 'About', { type: 'openAbout' }, { chevron: true }),
        row('library', 'Library', { type: 'openLibrary' }, { chevron: true }),
        row('shuffle', 'Shuffle', { type: 'cycleSetting', key: 'shuffle' }, {
          chevron: false,
          value: cap(settings.shuffle),
        }),
        row('repeat', 'Repeat', { type: 'cycleSetting', key: 'repeat' }, {
          chevron: false,
          value: cap(settings.repeat),
        }),
        row('volume', 'Volume Limit', { type: 'cycleSetting', key: 'volumeLimit' }, {
          value: `${Math.round(settings.volumeLimit * 100)}%`,
          chevron: false,
        }),
        row('eq', 'EQ', { type: 'pushMenu', title: 'EQ', menuId: 'eq' }, { value: settings.eq }),
        row('soundcheck', 'Sound Check', { type: 'toggleSetting', key: 'soundCheck' }, {
          chevron: false,
          value: onOff(settings.soundCheck),
        }),
        row('crossfade', 'Audio Crossfade', { type: 'toggleSetting', key: 'crossfade' }, {
          chevron: false,
          value: onOff(settings.crossfade),
        }),
        row('general', 'General', { type: 'pushMenu', title: 'General', menuId: 'general' }),
        row('playback', 'Playback', { type: 'pushMenu', title: 'Playback', menuId: 'playback' }),
        row('reset', 'Reset Settings', { type: 'resetSettings' }),
      ];
    case 'general':
      return [
        row('preview', 'Preview Panel', { type: 'toggleSetting', key: 'previewPanel' }, {
          chevron: false,
          value: onOff(settings.previewPanel),
        }),
        row('font', 'Font Size', { type: 'cycleSetting', key: 'fontSize' }, {
          chevron: false,
          value: cap(settings.fontSize),
        }),
        row('backlight', 'Backlight', { type: 'cycleSetting', key: 'backlightSeconds' }, {
          chevron: false,
          value: settings.backlightSeconds === 0 ? 'Always On' : `${settings.backlightSeconds}s`,
        }),
        row('bright', 'Brightness', { type: 'openBrightness' }, { chevron: true }),
        row('clicker', 'Clicker', { type: 'cycleSetting', key: 'clicker' }, {
          chevron: false,
          value: cap(settings.clicker),
        }),
        ...(Platform.OS === 'web'
          ? []
          : [
              row('rotate', 'Rotate', { type: 'toggleSetting', key: 'coverFlowRotate' }, {
                chevron: false,
                value: settings.coverFlowRotate ? 'Cover Flow' : 'Off',
              }),
            ]),
        row('finish', 'Finish', { type: 'pushMenu', title: 'Finish', menuId: 'finish' }, {
          value: FINISHES[settings.color].name,
        }),
      ];
    case 'playback':
      return [
        ...(Platform.OS === 'web'
          ? []
          : [
              row('shake', 'Shake', { type: 'toggleSetting', key: 'shakeToShuffle' }, {
                chevron: false,
                value: settings.shakeToShuffle ? 'Shuffle' : 'Off',
              }),
            ]),
        row('shuffle', 'Shuffle', { type: 'cycleSetting', key: 'shuffle' }, {
          chevron: false,
          value: cap(settings.shuffle),
        }),
        row('repeat', 'Repeat', { type: 'cycleSetting', key: 'repeat' }, {
          chevron: false,
          value: cap(settings.repeat),
        }),
      ];
    case 'eq':
      return EQ_PRESETS.map((preset) =>
        row(preset, preset, { type: 'setSetting', key: 'eq', value: preset }, { checked: settings.eq === preset, chevron: false }),
      );
    case 'finish':
      return (Object.keys(FINISHES) as Array<keyof typeof FINISHES>).map((color) =>
        row(color, FINISHES[color].name, { type: 'setSetting', key: 'color', value: color }, {
          checked: settings.color === color,
          chevron: false,
        }),
      );
    case 'library': {
      const computer = library.rootUri?.startsWith('computer://');
      const browser = library.rootUri?.startsWith('browser://');
      const device = library.rootUri?.startsWith('media-library://');
      const phone = Boolean(library.rootUri) && !computer && !browser && !device;
      if (Platform.OS === 'web') {
        return [
          row('computer', 'Server Folder', { type: 'pickComputerFolder' }, {
            value: computer ? library.rootName : undefined,
          }),
          row('browser', 'This Computer', { type: 'pickBrowserFolder' }, {
            value: browser ? library.rootName : undefined,
          }),
          row('rescan', 'Update Library', { type: 'rescan' }),
        ];
      }
      return [
        row('computer', 'Computer Folder', { type: 'pickComputerFolder' }, {
          value: computer ? library.rootName : undefined,
        }),
        row('folder', 'Phone Folder', { type: 'pickFolder' }, {
          value: phone ? library.rootName : undefined,
        }),
        row('device', 'Device Library', { type: 'scanMediaLibrary' }, {
          value: device ? 'On' : undefined,
        }),
        row('rescan', 'Update Library', { type: 'rescan' }),
      ];
    }
    default:
      return [row('empty', 'No items', { type: 'noop' })];
  }
}

function videoRows(items: VideoItem[], empty: string): MenuRow[] {
  if (items.length === 0) return [row('empty', empty, { type: 'noop' })];
  return items.map((v) =>
    row(v.id, v.title, { type: 'playVideo', videoId: v.id }, { chevron: false, value: v.show }),
  );
}

function cap(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function onOff(v: boolean): string {
  return v ? 'On' : 'Off';
}

export function backlightLabel(seconds: number): string {
  return seconds === 0 ? 'Always On' : `${seconds} s`;
}

export function nextBacklight(current: number): number {
  const i = BACKLIGHT_OPTIONS.indexOf(current as (typeof BACKLIGHT_OPTIONS)[number]);
  return BACKLIGHT_OPTIONS[(i + 1) % BACKLIGHT_OPTIONS.length];
}

export function queueFor(
  library: Library,
  settings: SettingsState,
  queue: 'songs' | 'album' | 'artist' | 'genre' | 'playlist' | 'onTheGo' | 'podcasts' | 'audiobooks',
  contextKey?: string,
): Song[] {
  switch (queue) {
    case 'playlist':
    case 'songs':
      return playableSongs(library);
    case 'album':
      return albumsOf(library).find((a) => a.key === contextKey)?.songs ?? [];
    case 'artist':
      return songsByArtist(library).get(contextKey ?? '') ?? [];
    case 'genre':
      return songsByGenre(library).get(contextKey ?? '') ?? [];
    case 'onTheGo':
      return settings.onTheGo.map((id) => library.songs.find((s) => s.id === id)).filter((s): s is Song => Boolean(s));
    case 'podcasts':
      return library.songs.filter((s) => s.kind === 'podcast');
    case 'audiobooks':
      return library.songs.filter((s) => s.kind === 'audiobook');
    default:
      return playableSongs(library);
  }
}

export function photosFor(library: Library, album?: string): PhotoItem[] {
  if (!album) return library.photos;
  return library.photos.filter((p) => p.album === album);
}
