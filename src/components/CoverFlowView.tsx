import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { albumsOf } from '../store/libraryStore';
import type { Library } from '../types';
import { SCREEN } from '../theme';
import { Artwork } from './MenuList';

export function CoverFlowView({ library, index }: { library: Library; index: number }) {
  const albums = useMemo(() => albumsOf(library), [library]);
  if (albums.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No album artwork</Text>
      </View>
    );
  }
  const i = ((index % albums.length) + albums.length) % albums.length;
  const prev = albums[(i - 1 + albums.length) % albums.length];
  const current = albums[i];
  const next = albums[(i + 1) % albums.length];

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        <View style={[styles.side, styles.left]}>
          <Artwork uri={prev?.artworkUri} size={70} />
        </View>
        <View style={styles.center}>
          <Artwork uri={current?.artworkUri} size={118} />
        </View>
        <View style={[styles.side, styles.right]}>
          <Artwork uri={next?.artworkUri} size={70} />
        </View>
      </View>
      <Text numberOfLines={1} style={styles.album}>
        {current?.album}
      </Text>
      <Text numberOfLines={1} style={styles.artist}>
        {current?.artist}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: SCREEN.bg, justifyContent: 'center', paddingBottom: 8 },
  stage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 140 },
  side: { opacity: 0.55, transform: [{ scale: 0.92 }] },
  left: { transform: [{ perspective: 400 }, { rotateY: '55deg' }, { scale: 0.86 }] },
  right: { transform: [{ perspective: 400 }, { rotateY: '-55deg' }, { scale: 0.86 }] },
  center: {
    zIndex: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  album: { color: '#fff', textAlign: 'center', fontWeight: '700', fontSize: 13, marginTop: 10 },
  artist: { color: '#bbb', textAlign: 'center', fontSize: 11, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: SCREEN.bg },
  emptyText: { color: '#aaa' },
});
