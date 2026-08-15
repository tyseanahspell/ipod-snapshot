import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import type { MenuRow } from '../types';
import { SCREEN, SELECT } from '../theme';

interface Props {
  rows: MenuRow[];
  selectedIndex: number;
  large?: boolean;
  visibleCount?: number;
}

export function MenuList({ rows, selectedIndex, large, visibleCount = 6 }: Props) {
  const count = Math.max(1, visibleCount);
  let start = 0;
  if (rows.length > count) {
    if (selectedIndex >= count - 1) start = Math.min(selectedIndex - (count - 2), rows.length - count);
    start = Math.max(0, start);
  }
  const visible = rows.slice(start, start + count);
  const size = large ? 16 : 13;

  return (
    <View style={styles.list}>
      {visible.map((row, i) => {
        const selected = start + i === selectedIndex;
        return (
          <View key={`${row.id}-${i}`} style={styles.rowWrap}>
            {selected ? (
              <LinearGradient colors={[...SELECT.colors]} locations={[...SELECT.locations]} style={StyleSheet.absoluteFill} />
            ) : null}
            {selected ? <View style={styles.gloss} /> : null}
            <View style={styles.row}>
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  { fontSize: size },
                  selected ? styles.selected : undefined,
                  row.disabled ? styles.disabled : undefined,
                ]}
              >
                {row.checked ? '✓  ' : ''}
                {row.label}
              </Text>
              {row.value ? (
                <Text numberOfLines={1} style={[styles.value, selected && styles.selected, { fontSize: size - 1 }]}>
                  {row.value}
                </Text>
              ) : null}
              {row.chevron ? <Text style={[styles.chevron, selected && styles.selected]}>›</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function Artwork({ uri, size }: { uri?: string; size: number }) {
  if (!uri) {
    return (
      <View style={[styles.placeholder, { width: size, height: size }]}>
        <Text style={styles.note}>♪</Text>
      </View>
    );
  }
  return <Image source={{ uri }} style={{ width: size, height: size, backgroundColor: SCREEN.artworkBg }} contentFit="cover" />;
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: SCREEN.bg },
  rowWrap: { height: 22, justifyContent: 'center' },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: SELECT.gloss,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  label: {
    flex: 1,
    color: SCREEN.text,
    fontWeight: '600',
  },
  value: {
    maxWidth: '42%',
    color: SCREEN.value,
    textAlign: 'right',
  },
  chevron: {
    color: SCREEN.chevron,
    fontSize: 18,
    fontWeight: '300',
    marginTop: -2,
  },
  selected: { color: '#fff' },
  disabled: { opacity: 0.45 },
  placeholder: {
    backgroundColor: SCREEN.artworkBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { color: '#8a8a8a', fontSize: 18 },
});
