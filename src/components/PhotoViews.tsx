import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import type { PhotoItem } from '../types';
import { SCREEN } from '../theme';
import { MenuList } from './MenuList';

export function PhotoGrid({
  photos,
  selectedIndex,
}: {
  photos: PhotoItem[];
  selectedIndex: number;
}) {
  if (photos.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No photos</Text>
      </View>
    );
  }
  return (
    <MenuList
      rows={photos.map((p, i) => ({
        id: p.id,
        label: p.uri.split('/').pop() ?? `Photo ${i + 1}`,
        chevron: true,
        action: { type: 'noop' },
      }))}
      selectedIndex={selectedIndex}
      visibleCount={15}
    />
  );
}

export function PhotoViewer({ photos, index }: { photos: PhotoItem[]; index: number }) {
  const photo = photos[((index % photos.length) + photos.length) % photos.length];
  if (!photo) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No photos</Text>
      </View>
    );
  }
  return (
    <View style={styles.viewer}>
      <Image source={{ uri: photo.uri }} style={styles.image} contentFit="contain" />
      <Text style={styles.caption}>
        {index + 1} of {photos.length}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: SCREEN.bg },
  emptyText: { color: '#aaa' },
  viewer: { flex: 1, backgroundColor: '#000' },
  image: { flex: 1 },
  caption: { color: '#ddd', textAlign: 'center', fontSize: 10, paddingVertical: 4 },
});
