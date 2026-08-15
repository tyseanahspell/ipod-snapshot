import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { SCREEN } from '../theme';
import type { PreviewKind } from '../types';

interface Props {
  kind: PreviewKind;
  images: string[];
  storageLabel?: string;
  clock?: string;
}

export function PreviewPanel({ kind, images, storageLabel, clock }: Props) {
  if (kind === 'none') return null;
  if (kind === 'storage') {
    return (
      <View style={styles.panel}>
        <Text style={styles.caption}>{storageLabel ?? 'Capacity'}</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: '62%' }]} />
        </View>
      </View>
    );
  }
  if (kind === 'radio') {
    return (
      <View style={styles.panel}>
        <Text style={styles.radio}>FM</Text>
        <Text style={styles.caption}>Radio</Text>
      </View>
    );
  }
  if (kind === 'extras') {
    return (
      <View style={styles.panel}>
        <Text style={styles.clock}>{clock}</Text>
      </View>
    );
  }
  return (
    <View style={styles.panel}>
      <View style={styles.strip}>
        {(images.length ? images : [undefined, undefined, undefined, undefined, undefined]).slice(0, 6).map((uri, i) =>
          uri ? (
            <Image key={`${uri}-${i}`} source={{ uri }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View key={`p-${i}`} style={[styles.thumb, styles.ph]}>
              <Text style={styles.phText}>♪</Text>
            </View>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    height: 72,
    backgroundColor: SCREEN.previewBg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#222',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  strip: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  thumb: { width: 54, height: 54, backgroundColor: SCREEN.artworkBg },
  ph: { alignItems: 'center', justifyContent: 'center' },
  phText: { color: '#777', fontSize: 16 },
  caption: { color: '#ddd', fontSize: 11, textAlign: 'center', marginBottom: 6 },
  barTrack: { height: 10, backgroundColor: '#333', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#5aa8e8' },
  radio: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  clock: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] },
});
