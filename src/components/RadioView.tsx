import { StyleSheet, Text, View } from 'react-native';
import { isTuned, nearestStation } from '../services/radio';
import { SCREEN } from '../theme';

export function RadioView({ freq, playing }: { freq: number; playing: boolean }) {
  const station = nearestStation(freq);
  const locked = station ? isTuned(freq, station) : false;
  const pct = (freq - 87.5) / (108 - 87.5);

  return (
    <View style={styles.wrap}>
      <Text style={styles.band}>FM Radio</Text>
      <Text style={styles.freq}>{freq.toFixed(1)}</Text>
      <View style={styles.dial}>
        <View style={styles.track} />
        <View style={[styles.needle, { left: `${Math.min(100, Math.max(0, pct * 100))}%` }]} />
      </View>
      <Text style={styles.scale}>87.5                    108.0</Text>
      {locked && station ? (
        <>
          <Text style={styles.name}>{station.name}</Text>
          <Text style={styles.meta}>
            {station.city}  ·  {station.genre}
          </Text>
          <Text style={styles.live}>{playing ? 'Live' : 'Paused'}</Text>
        </>
      ) : (
        <Text style={styles.meta}>Tune with the Click Wheel</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: SCREEN.bg, alignItems: 'center', justifyContent: 'center', padding: 12 },
  band: { color: '#9ad0ff', fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  freq: { color: '#fff', fontSize: 36, fontWeight: '200', marginVertical: 6, fontVariant: ['tabular-nums'] },
  dial: { width: '100%', height: 18, justifyContent: 'center' },
  track: { height: 2, backgroundColor: '#888' },
  needle: {
    position: 'absolute',
    width: 2,
    height: 16,
    backgroundColor: '#ff3b30',
    marginLeft: -1,
    top: 1,
  },
  scale: { color: '#888', fontSize: 9, marginTop: 4, width: '100%', textAlign: 'center' },
  name: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 14 },
  meta: { color: '#bbb', fontSize: 11, marginTop: 4 },
  live: { color: '#7CFF7C', fontSize: 11, marginTop: 8, fontWeight: '700' },
});
