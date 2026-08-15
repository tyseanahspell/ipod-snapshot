export type ShuffleMode = 'off' | 'songs' | 'albums';
export type RepeatMode = 'off' | 'all' | 'one';
export type FontSize = 'standard' | 'large';
export type ClickerMode = 'on' | 'off' | 'speaker';

export type VideoKind = 'movie' | 'tvShow' | 'musicVideo' | 'podcast' | 'camera';
export type AudioKind = 'song' | 'podcast' | 'audiobook' | 'musicVideo';

export type NanoColor =
  | 'silver'
  | 'black'
  | 'purple'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'pink'
  | 'red';

export interface Song {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  genre: string;
  composer: string;
  year?: number;
  trackNumber?: number;
  discNumber?: number;
  duration?: number;
  artworkUri?: string;
  lyrics?: string;
  kind: AudioKind;
  playCount: number;
  rating: number;
  folder: string;
}

export interface VideoItem {
  id: string;
  uri: string;
  title: string;
  kind: VideoKind;
  show?: string;
  season?: number;
  episode?: number;
  duration?: number;
  artworkUri?: string;
  folder: string;
}

export interface PhotoItem {
  id: string;
  uri: string;
  album: string;
  folder: string;
}

export interface NoteItem {
  id: string;
  title: string;
  body: string;
}

export interface Library {
  songs: Song[];
  videos: VideoItem[];
  photos: PhotoItem[];
  notes: NoteItem[];
  scannedAt?: number;
  rootUri?: string;
  rootName?: string;
  bytes?: number;
}

export type PreviewKind =
  | 'albums'
  | 'videos'
  | 'photos'
  | 'radio'
  | 'extras'
  | 'storage'
  | 'shuffle'
  | 'none';

export interface MenuRow {
  id: string;
  label: string;
  chevron?: boolean;
  value?: string;
  checked?: boolean;
  disabled?: boolean;
  action: MenuAction;
}

export type MenuAction =
  | { type: 'pushMenu'; title: string; menuId: string; context?: MenuContext }
  | { type: 'playSong'; songId: string; queue: 'songs' | 'album' | 'artist' | 'genre' | 'playlist' | 'onTheGo' | 'podcasts' | 'audiobooks'; contextKey?: string }
  | { type: 'playAll'; queue: 'songs' | 'album' | 'artist' | 'genre' | 'playlist' | 'onTheGo' | 'podcasts' | 'audiobooks'; contextKey?: string; shuffled?: boolean }
  | { type: 'playVideo'; videoId: string }
  | { type: 'openPhotos'; album?: string }
  | { type: 'openPhoto'; photoId: string; album?: string }
  | { type: 'openRadio' }
  | { type: 'openCoverFlow' }
  | { type: 'openNowPlaying' }
  | { type: 'openSearch' }
  | { type: 'openClock' }
  | { type: 'openStopwatch' }
  | { type: 'openGame'; game: 'brick' }
  | { type: 'openNotes' }
  | { type: 'openNote'; noteId: string }
  | { type: 'openVoiceMemos' }
  | { type: 'openPedometer' }
  | { type: 'openAbout' }
  | { type: 'openBrightness' }
  | { type: 'openLibrary' }
  | { type: 'shuffleSongs' }
  | { type: 'toggleSetting'; key: string }
  | { type: 'cycleSetting'; key: string }
  | { type: 'setSetting'; key: string; value: string | number | boolean }
  | { type: 'pickFolder' }
  | { type: 'scanMediaLibrary' }
  | { type: 'rescan' }
  | { type: 'resetSettings' }
  | { type: 'noop' };

export interface MenuContext {
  artist?: string;
  album?: string;
  genre?: string;
  composer?: string;
  playlist?: string;
  show?: string;
  albumKey?: string;
}

export interface IpodScreen {
  id: string;
  title: string;
  kind:
    | 'menu'
    | 'nowPlaying'
    | 'coverFlow'
    | 'video'
    | 'photos'
    | 'photo'
    | 'radio'
    | 'search'
    | 'clock'
    | 'stopwatch'
    | 'game'
    | 'notes'
    | 'note'
    | 'voiceMemo'
    | 'pedometer'
    | 'about'
    | 'brightness'
    | 'library'
    | 'boot';
  menuId?: string;
  context?: MenuContext;
  selectedIndex: number;
  videoId?: string;
  photoId?: string;
  noteId?: string;
  game?: 'brick';
}

export const EMPTY_LIBRARY: Library = {
  songs: [],
  videos: [],
  photos: [],
  notes: [],
};
