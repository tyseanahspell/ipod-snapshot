import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
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

function ArtworkCarousel({ images }: { images: string[] }) {
  const offset = useRef(new Animated.Value(0)).current;
  const signature = images.join('\0');
  const set = useMemo(() => carouselSet(images), [signature]);
  const track = useMemo(() => (set.length ? [...set, ...set] : []), [set]);

  useEffect(() => {
    offset.setValue(0);
    if (set.length === 0) return undefined;
    const anim = Animated.loop(
      Animated.timing(offset, {
        toValue: -(set.length * ITEM),
        duration: set.length * MS_PER_COVER,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => {
      anim.stop();
      offset.stopAnimation();
    };
  }, [offset, set.length, signature]);

  if (track.length === 0) {
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

  return (
    <View style={styles.viewport}>
      <Animated.View style={[styles.track, { transform: [{ translateX: offset }] }]}>
        {track.map((uri, i) => (
          <Image key={`${uri}-${i}`} source={{ uri }} style={styles.thumb} contentFit="cover" />
        ))}
      </Animated.View>
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
  },
  track: {
    flexDirection: 'row',
    gap: GAP,
    paddingLeft: 6,
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
