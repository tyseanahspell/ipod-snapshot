import { StyleSheet, Text, View } from 'react-native';
import type { Song } from '../types';
import { SCREEN } from '../theme';
import { Artwork } from './MenuList';
import type { NowPlayingPage } from '../store/playerStore';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function Stars({ rating }: { rating: number }) {
  return (
    <Text style={styles.stars}>
      {Array.from({ length: 5 }, (_, i) => (i < rating ? '★' : '☆')).join(' ')}
    </Text>
  );
}

interface Props {
  song?: Song;
  position: number;
  duration: number;
  page: NowPlayingPage;
  shuffle: string;
  repeat: string;
  rating: number;
  volume: number;
}

export function NowPlayingView({ song, position, duration, page, shuffle, repeat, rating, volume }: Props) {
  const dur = duration || song?.duration || 0;
  const pct = dur > 0 ? Math.min(1, position / dur) : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Artwork uri={song?.artworkUri} size={96} />
        <View style={styles.meta}>
          <Text numberOfLines={2} style={styles.title}>
            {song?.title ?? 'No song'}
          </Text>
          <Text numberOfLines={1} style={styles.sub}>
            {song?.artist ?? ''}
          </Text>
          <Text numberOfLines={1} style={styles.sub}>
            {song?.album ?? ''}
          </Text>
          <View style={styles.icons}>
            {shuffle !== 'off' ? <Text style={styles.glyph}>🔀</Text> : null}
            {repeat !== 'off' ? <Text style={styles.glyph}>{repeat === 'one' ? '🔂' : '🔁'}</Text> : null}
          </View>
        </View>
      </View>

      {page === 'info' ? (
        <View style={styles.block}>
          <View style={styles.times}>
            <Text style={styles.time}>{formatTime(position)}</Text>
            <Text style={styles.time}>-{formatTime(Math.max(0, dur - position))}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct * 100}%` }]} />
            <View style={[styles.knob, { left: `${pct * 100}%` }]} />
          </View>
          <View style={styles.volRow}>
            <Text style={styles.hint}>–</Text>
            <View style={styles.volTrack}>
              <View style={[styles.volFill, { width: `${volume * 100}%` }]} />
            </View>
            <Text style={styles.hint}>+</Text>
          </View>
        </View>
      ) : null}

      {page === 'scrub' ? (
        <View style={styles.block}>
          <Text style={styles.caption}>Scrub</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct * 100}%` }]} />
            <View style={[styles.knob, styles.scrub, { left: `${pct * 100}%` }]} />
          </View>
          <View style={styles.times}>
            <Text style={styles.time}>{formatTime(position)}</Text>
            <Text style={styles.time}>-{formatTime(Math.max(0, dur - position))}</Text>
          </View>
        </View>
      ) : null}

      {page === 'shuffle' ? (
        <View style={styles.block}>
          <Text style={styles.caption}>Shuffle</Text>
          <Text style={styles.value}>{shuffle === 'off' ? 'Off' : shuffle === 'songs' ? 'Songs' : 'Albums'}</Text>
        </View>
      ) : null}

      {page === 'rating' ? (
        <View style={styles.block}>
          <Text style={styles.caption}>Rating</Text>
          <Stars rating={rating} />
        </View>
      ) : null}

      {page === 'lyrics' ? (
        <View style={styles.block}>
          <Text style={styles.caption}>Lyrics</Text>
          <Text numberOfLines={4} style={styles.lyrics}>
            {song?.lyrics || 'No lyrics'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: SCREEN.bg, padding: 8, justifyContent: 'space-between' },
  top: { flexDirection: 'row', gap: 8 },
  meta: { flex: 1, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sub: { color: '#c8c8c8', fontSize: 11, marginTop: 2 },
  icons: { flexDirection: 'row', gap: 6, marginTop: 6 },
  glyph: { fontSize: 11 },
  block: { paddingBottom: 4 },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: '#fff', fontSize: 10, fontVariant: ['tabular-nums'] },
  track: {
    height: 8,
    backgroundColor: SCREEN.progressTrack,
    borderRadius: 4,
    marginTop: 4,
    justifyContent: 'center',
  },
  fill: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  knob: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    marginLeft: -5,
  },
  scrub: { width: 14, height: 14, borderRadius: 7, marginLeft: -7, backgroundColor: '#8ecdf8' },
  volRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  volTrack: { flex: 1, height: 4, backgroundColor: '#444', borderRadius: 2, overflow: 'hidden' },
  volFill: { height: '100%', backgroundColor: '#fff' },
  hint: { color: '#aaa', fontSize: 12 },
  caption: { color: '#9ad0ff', fontSize: 11, textAlign: 'center', marginBottom: 4 },
  value: { color: '#fff', fontSize: 16, textAlign: 'center', fontWeight: '700' },
  stars: { color: '#ffd76a', fontSize: 16, textAlign: 'center' },
  lyrics: { color: '#ddd', fontSize: 11, textAlign: 'center' },
});
