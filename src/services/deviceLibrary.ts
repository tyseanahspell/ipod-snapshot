import { Platform } from 'react-native';
import { AssetField, MediaType, Query, requestPermissionsAsync } from 'expo-media-library';
import type { Library, PhotoItem, Song, VideoItem } from '../types';
import { hashId } from './id3';
import type { ScanProgress } from './scanner';

export async function scanMediaLibrary(onProgress?: (p: ScanProgress) => void): Promise<Library> {
  const perm = await requestPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new Error('Media access was not granted');
  }
  onProgress?.({ phase: 'listing', files: 0, tagged: 0, message: 'Reading device library…' });

  const songs: Song[] = [];
  const videos: VideoItem[] = [];
  const photos: PhotoItem[] = [];

  async function drain(mediaType: MediaType) {
    const pageSize = 200;
    let offset = 0;
    while (true) {
      const assets = await new Query()
        .eq(AssetField.MEDIA_TYPE, mediaType)
        .orderBy(AssetField.CREATION_TIME)
        .limit(pageSize)
        .offset(offset)
        .exe();
      if (assets.length === 0) break;
      for (const asset of assets) {
        const uri = await asset.getUri();
        const filename = await asset.getFilename();
        if (!uri) continue;
        const title = filename.replace(/\.[^.]+$/, '');
        if (mediaType === MediaType.AUDIO) {
          const durationMs = await asset.getDuration();
          songs.push({
            id: hashId(uri),
            uri,
            title,
            artist: 'Unknown Artist',
            album: 'Unknown Album',
            albumArtist: 'Unknown Artist',
            genre: 'Unknown',
            composer: '',
            duration: durationMs ? durationMs / 1000 : undefined,
            kind: 'song',
            playCount: 0,
            rating: 0,
            folder: 'Media Library',
          });
        } else if (mediaType === MediaType.VIDEO) {
          const durationMs = await asset.getDuration();
          videos.push({
            id: hashId(uri),
            uri,
            title,
            kind: 'movie',
            duration: durationMs ? durationMs / 1000 : undefined,
            folder: 'Media Library',
          });
        } else {
          photos.push({
            id: hashId(uri),
            uri,
            album: 'Photo Library',
            folder: 'Photo Library',
          });
        }
      }
      offset += assets.length;
      if (assets.length < pageSize) break;
    }
  }

  await drain(MediaType.AUDIO);
  await drain(MediaType.VIDEO);
  await drain(MediaType.IMAGE);

  songs.sort((a, b) => a.title.localeCompare(b.title));
  onProgress?.({
    phase: 'done',
    files: songs.length + videos.length + photos.length,
    tagged: songs.length,
    message: 'Done',
  });
  return {
    songs,
    videos,
    photos,
    notes: [],
    scannedAt: Date.now(),
    rootUri: `media-library://${Platform.OS}`,
    rootName: 'Device Library',
  };
}
