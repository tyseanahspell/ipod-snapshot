import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SCREEN } from '../theme';
import type { PreviewKind } from '../types';

interface Props {
  kind: PreviewKind;
  images: string[];
  storageLabel?: string;
  clock?: string;
}

const THUMB = 54;
const GAP = 4;
const ITEM = THUMB + GAP;
const MS_PER_COVER = 2200;

function carouselSet(images: string[]): string[] {
  const set = [...images];
  while (set.length > 0 && set.length < 6) set.push(...images);
  return set;
}

const VISIBLE = 12;

function ArtworkCarousel({ images }: { images: string[] }) {
  const signature = images.join('\0');
  const set = useMemo(() => carouselSet(images), [signature]);
  const [shift, setShift] = useState(0);

  useEffect(() => {
    if (set.length === 0) return undefined;
    const width = set.length * ITEM;
    let pos = 0;
    let last = performance.now();
    let raf = 0;
    const speed = ITEM / MS_PER_COVER;
    const tick = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      pos = (pos + speed * dt) % width;
      setShift(pos);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [set.length, signature]);

  if (set.length === 0) {
    return (
      <View style={styles.strip}>
        {Array.from({ length: 5 }, (_, i) => (
          <View key={`p-${i}`} style={[styles.thumb, styles.ph]}>
            <Text style={styles.phText}>♪</Text>
          </View>
        ))}
      </View>
    );
  }

  const start = Math.floor(shift / ITEM);
  const tiles = Array.from({ length: Math.min(VISIBLE, set.length + 2) }, (_, i) => {
    const index = (start + i) % set.length;
    return { uri: set[index], x: (start + i) * ITEM - shift, key: `${start + i}` };
  });

  return (
    <View style={styles.viewport}>
      {tiles.map((tile) => (
        <Image
          key={tile.key}
          source={{ uri: tile.uri }}
          style={[styles.thumb, styles.floating, { left: tile.x + 6 }]}
          contentFit="cover"
        />
      ))}
    </View>
  );
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
      <ArtworkCarousel images={images} />
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
    overflow: 'hidden',
  },
  viewport: {
    height: THUMB,
    overflow: 'hidden',
    position: 'relative',
  },
  floating: {
    position: 'absolute',
    top: 0,
  },
  strip: { flexDirection: 'row', gap: GAP, justifyContent: 'center', paddingHorizontal: 6 },
  thumb: { width: THUMB, height: THUMB, backgroundColor: SCREEN.artworkBg },
  ph: { alignItems: 'center', justifyContent: 'center' },
  phText: { color: '#777', fontSize: 16 },
  caption: { color: '#ddd', fontSize: 11, textAlign: 'center', marginBottom: 6 },
  barTrack: { height: 10, backgroundColor: '#333', borderRadius: 2, overflow: 'hidden', marginHorizontal: 6 },
  barFill: { height: '100%', backgroundColor: '#5aa8e8' },
  radio: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  clock: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] },
});
