import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import { Pedometer } from 'expo-sensors';
import { SCREEN } from '../theme';
import type { Library, NoteItem } from '../types';
import { MenuList } from './MenuList';

function pad(n: number, len = 2): string {
  return n.toString().padStart(len, '0');
}

export function ClockView() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <View style={styles.center}>
      <Text style={styles.clock}>
        {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
      </Text>
      <Text style={styles.sub}>
        {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </Text>
    </View>
  );
}

export function StopwatchView({ ticks, running }: { ticks: number; running: boolean }) {
  const ms = ticks % 1000;
  const total = Math.floor(ticks / 1000);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  return (
    <View style={styles.center}>
      <Text style={styles.clock}>
        {pad(h)}:{pad(m)}:{pad(s)}.{pad(Math.floor(ms / 10))}
      </Text>
      <Text style={styles.sub}>{running ? 'Play/Pause to stop' : 'Play/Pause to start'}</Text>
    </View>
  );
}

export function AboutView({ library }: { library: Library }) {
  const songs = library.songs.length;
  const videos = library.videos.length;
  const photos = library.photos.length;
  const gb = (library.bytes ?? 0) / (1024 * 1024 * 1024);
  return (
    <View style={styles.about}>
      <Text style={styles.line}>iPod nano</Text>
      <Text style={styles.dim}>5th Generation</Text>
      <Text style={styles.line}>{songs} Songs</Text>
      <Text style={styles.line}>{videos} Videos</Text>
      <Text style={styles.line}>{photos} Photos</Text>
      <Text style={styles.line}>{gb > 0 ? `${gb.toFixed(2)} GB` : 'Capacity unknown'}</Text>
      <Text style={styles.dim}>{library.rootName ?? 'No folder selected'}</Text>
      <Text style={styles.dim}>Software 1.0.2</Text>
    </View>
  );
}

export function BrightnessView({ value }: { value: number }) {
  return (
    <View style={styles.center}>
      <Text style={styles.sub}>Brightness</Text>
      <View style={styles.bar}>
        <View style={[styles.fill, { width: `${value * 100}%` }]} />
      </View>
      <Text style={styles.dim}>{Math.round(value * 100)}%</Text>
    </View>
  );
}

export function NotesList({ notes, index }: { notes: NoteItem[]; index: number }) {
  if (notes.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.dim}>No notes</Text>
        <Text style={styles.dim}>Place .txt files in your storage folder</Text>
      </View>
    );
  }
  return (
    <MenuList
      rows={notes.map((n) => ({ id: n.id, label: n.title, chevron: true, action: { type: 'noop' } }))}
      selectedIndex={index}
      visibleCount={10}
    />
  );
}

export function NoteView({ note }: { note?: NoteItem }) {
  return (
    <View style={styles.note}>
      <Text style={styles.noteTitle}>{note?.title ?? 'Note'}</Text>
      <Text style={styles.noteBody}>{note?.body || 'Empty'}</Text>
    </View>
  );
}

export function SearchView({ query }: { query: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.sub}>Search</Text>
      <Text style={styles.clock}>{query || '_'}</Text>
      <Text style={styles.dim}>Use Songs / Artists menus to browse</Text>
    </View>
  );
}

export function PedometerView() {
  const [steps, setSteps] = useState(0);
  const [ok, setOk] = useState(true);
  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    void (async () => {
      const available = await Pedometer.isAvailableAsync();
      if (!available) {
        setOk(false);
        return;
      }
      sub = Pedometer.watchStepCount((result) => setSteps(result.steps));
    })();
    return () => sub?.remove();
  }, []);
  return (
    <View style={styles.center}>
      <Text style={styles.sub}>Pedometer</Text>
      <Text style={styles.clock}>{ok ? steps : '—'}</Text>
      <Text style={styles.dim}>{ok ? 'steps this session' : 'Not available on this device'}</Text>
    </View>
  );
}

export function VoiceMemoView() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [uri, setUri] = useState<string | null>(null);

  const toggle = async () => {
    if (recording) {
      await recorder.stop();
      setRecording(false);
      setUri(recorder.uri);
      return;
    }
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) return;
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecording(true);
  };

  return (
    <View style={styles.center}>
      <Text style={styles.sub}>Voice Memos</Text>
      <Pressable onPress={() => void toggle()} style={styles.recBtn}>
        <Text style={styles.recText}>{recording ? 'Stop' : 'Record'}</Text>
      </Pressable>
      <Text style={styles.dim}>{recording ? 'Recording…' : uri ? 'Saved memo' : 'Press Record'}</Text>
    </View>
  );
}

export function BrickGame({ tickDir, seq }: { tickDir: number; seq: number }) {
  const [paddle, setPaddle] = useState(0.5);
  const [ball, setBall] = useState({ x: 0.5, y: 0.7, vx: 0.006, vy: -0.008 });
  const [bricks, setBricks] = useState(() => Array.from({ length: 18 }, () => true));
  const [score, setScore] = useState(0);
  const [live, setLive] = useState(true);

  useEffect(() => {
    if (!tickDir) return;
    setPaddle((p) => Math.min(0.92, Math.max(0.08, p + tickDir * 0.04)));
  }, [tickDir, seq]);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      setBall((b) => {
        let { x, y, vx, vy } = b;
        x += vx;
        y += vy;
        if (x < 0.03 || x > 0.97) vx *= -1;
        if (y < 0.04) vy *= -1;
        const px = paddle;
        if (y > 0.88 && Math.abs(x - px) < 0.12 && vy > 0) {
          vy *= -1;
          vx += (x - px) * 0.04;
        }
        if (y > 1.05) {
          setLive(false);
          return b;
        }
        const col = Math.min(5, Math.max(0, Math.floor(x * 6)));
        const row = Math.min(2, Math.max(0, Math.floor((y - 0.08) / 0.08)));
        const idx = row * 6 + col;
        setBricks((prev) => {
          if (y > 0.08 && y < 0.32 && prev[idx]) {
            const next = [...prev];
            next[idx] = false;
            vy *= -1;
            setScore((s) => s + 10);
            return next;
          }
          return prev;
        });
        return { x, y, vx, vy };
      });
    }, 16);
    return () => clearInterval(t);
  }, [live, paddle]);

  return (
    <View style={styles.game}>
      <Text style={styles.dim}>Score {score}</Text>
      <View style={styles.field}>
        {bricks.map((on, i) =>
          on ? (
            <View
              key={i}
              style={[
                styles.brick,
                {
                  left: `${(i % 6) * 16.2 + 1.5}%`,
                  top: 8 + Math.floor(i / 6) * 14,
                },
              ]}
            />
          ) : null,
        )}
        <View style={[styles.ball, { left: `${ball.x * 100}%`, top: `${ball.y * 100}%` }]} />
        <View style={[styles.paddle, { left: `${paddle * 100}%` }]} />
      </View>
      {!live ? <Text style={styles.sub}>Game Over</Text> : <Text style={styles.dim}>Scroll to move</Text>}
    </View>
  );
}

export function BootView() {
  return (
    <View style={styles.boot}>
      <Text style={styles.apple}></Text>
    </View>
  );
}

export function ContextMenu({ index }: { index: number }) {
  return (
    <View style={styles.context}>
      <MenuList
        rows={[
          { id: 'g', label: 'Start Genius', action: { type: 'noop' } },
          { id: 'o', label: 'Add to On-The-Go', action: { type: 'noop' } },
          { id: 'a', label: 'Browse Album', action: { type: 'noop' } },
          { id: 'c', label: 'Cancel', action: { type: 'noop' } },
        ]}
        selectedIndex={index}
        visibleCount={4}
      />
    </View>
  );
}

export function LoadingView({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.sub}>Loading</Text>
      <Text style={styles.dim}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: SCREEN.bg, alignItems: 'center', justifyContent: 'center', padding: 12 },
  about: { flex: 1, backgroundColor: SCREEN.bg, padding: 14, justifyContent: 'center', gap: 6 },
  clock: { color: '#fff', fontSize: 28, fontWeight: '200', fontVariant: ['tabular-nums'] },
  sub: { color: '#fff', fontSize: 13, marginTop: 8, fontWeight: '600' },
  dim: { color: '#aaa', fontSize: 11, textAlign: 'center' },
  line: { color: '#fff', fontSize: 14, fontWeight: '600' },
  bar: { width: '80%', height: 10, backgroundColor: '#333', borderRadius: 4, overflow: 'hidden', marginTop: 12 },
  fill: { height: '100%', backgroundColor: '#fff' },
  note: { flex: 1, backgroundColor: SCREEN.bg, padding: 10 },
  noteTitle: { color: '#fff', fontWeight: '700', marginBottom: 8 },
  noteBody: { color: '#ddd', fontSize: 12, lineHeight: 18 },
  recBtn: { marginTop: 12, borderWidth: 1, borderColor: '#fff', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
  recText: { color: '#fff', fontWeight: '700' },
  game: { flex: 1, backgroundColor: SCREEN.bg, padding: 6 },
  field: { flex: 1, marginTop: 6, backgroundColor: '#050505', overflow: 'hidden' },
  brick: { position: 'absolute', width: '14.5%', height: 10, backgroundColor: '#4aa3ea' },
  ball: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', marginLeft: -4, marginTop: -4 },
  paddle: { position: 'absolute', bottom: 8, width: 48, height: 6, backgroundColor: '#ddd', marginLeft: -24 },
  boot: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  apple: { color: '#d0d0d0', fontSize: 64, fontWeight: '300' },
  context: { flex: 1, backgroundColor: SCREEN.bg },
});
