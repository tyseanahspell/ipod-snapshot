import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Accelerometer } from 'expo-sensors';
import * as Battery from 'expo-battery';
import * as NavigationBar from 'expo-navigation-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { PlaybackController } from './src/audio/PlaybackController';
import { IpodChrome } from './src/components/IpodChrome';
import { initClicker } from './src/services/clicker';
import {
  onCenterHold,
  onMenu,
  onMenuHold,
  onPlayPause,
  onSelect,
  onShake,
  onSkip,
  onWheelTick,
} from './src/navigation/controller';
import { useLibrary } from './src/store/libraryStore';
import { useNav } from './src/store/navStore';
import { usePlayer } from './src/store/playerStore';
import { useSettings } from './src/store/settingsStore';

export default function App() {
  const color = useSettings((s) => s.color);
  const hold = useSettings((s) => s.hold);
  const brightness = useSettings((s) => s.brightness);
  const coverFlowRotate = useSettings((s) => s.coverFlowRotate);
  const shuffle = useSettings((s) => s.shuffle);
  const repeat = useSettings((s) => s.repeat);
  const hydrate = useLibrary((s) => s.hydrate);
  const loading = useLibrary((s) => s.loading);
  const bootDone = useNav((s) => s.bootDone);
  const battery = useBattery();

  useEffect(() => {
    void hydrate();
    void initClicker();
    const t = setTimeout(() => useNav.getState().setBootDone(), 1600);
    if (Platform.OS === 'android') {
      NavigationBar.setStyle('dark');
    }
    const settings = useSettings.getState();
    usePlayer.getState().setShuffle(settings.shuffle);
    usePlayer.getState().setRepeat(settings.repeat);
    usePlayer.getState().setVolume(Math.min(settings.volume, settings.volumeLimit));
    if (settings.firstLaunch) settings.set('firstLaunch', false);
    return () => clearTimeout(t);
  }, [hydrate]);

  useEffect(() => {
    usePlayer.getState().setShuffle(shuffle);
    usePlayer.getState().setRepeat(repeat);
  }, [shuffle, repeat]);

  useEffect(() => {
    if (!bootDone || loading) return;
    const library = useLibrary.getState().library;
    if (library.songs.length + library.videos.length + library.photos.length === 0) {
      useNav.getState().push({ title: 'Library', kind: 'menu', menuId: 'library' });
    }
  }, [bootDone, loading]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let last = 0;
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (mag > 1.95 && now - last > 1200) {
        last = now;
        onShake();
      }
      if (coverFlowRotate && Math.abs(x) > 0.85 && Math.abs(y) < 0.35) {
        const screen = useNav.getState().current();
        if (screen.kind === 'coverFlow' || screen.kind === 'boot' || screen.kind === 'video') return;
        if (now - last > 1800) {
          last = now;
          useNav.getState().push({ title: 'Cover Flow', kind: 'coverFlow' });
        }
      }
    });
    Accelerometer.setUpdateInterval(180);
    return () => sub.remove();
  }, [coverFlowRotate]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (useSettings.getState().hold && event.key !== 'h') return;
      const run: Record<string, () => void> = {
        ArrowDown: () => onWheelTick(1),
        ArrowUp: () => onWheelTick(-1),
        j: () => onWheelTick(1),
        k: () => onWheelTick(-1),
        Enter: onSelect,
        Escape: onMenu,
        Backspace: onMenu,
        ' ': onPlayPause,
        ArrowLeft: () => onSkip(-1),
        ArrowRight: () => onSkip(1),
        m: onMenu,
        h: () => useSettings.getState().toggle('hold'),
      };
      const action = run[event.key];
      if (!action) return;
      event.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.fill}>
          <StatusBar style="light" />
          <PlaybackController />
          <IpodChrome
            color={color}
            hold={hold}
            brightness={brightness}
            battery={battery.level}
            charging={battery.charging}
            onHold={() => useSettings.getState().toggle('hold')}
            onTick={onWheelTick}
            onSelect={onSelect}
            onMenu={onMenu}
            onMenuHold={onMenuHold}
            onPlayPause={onPlayPause}
            onSkip={onSkip}
            onCenterHold={onCenterHold}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function useBattery() {
  const [state, setState] = useState({ level: 0.8, charging: false });
  useEffect(() => {
    let mounted = true;
    const apply = (patch: Partial<{ level: number; charging: boolean }>) => {
      if (mounted) setState((s) => ({ ...s, ...patch }));
    };
    if (Platform.OS === 'web') {
      const nav = navigator as Navigator & {
        getBattery?: () => Promise<{
          level: number;
          charging: boolean;
          addEventListener: (name: string, fn: () => void) => void;
        }>;
      };
      if (!nav.getBattery) return;
      void nav.getBattery().then((battery) => {
        apply({ level: battery.level, charging: battery.charging });
        battery.addEventListener('levelchange', () => apply({ level: battery.level }));
        battery.addEventListener('chargingchange', () => apply({ charging: battery.charging }));
      });
      return;
    }
    void Battery.getBatteryLevelAsync().then((level) => apply({ level }));
    void Battery.getBatteryStateAsync().then((batteryState) =>
      apply({
        charging: batteryState === Battery.BatteryState.CHARGING || batteryState === Battery.BatteryState.FULL,
      }),
    );
    const a = Battery.addBatteryLevelListener(({ batteryLevel }) => apply({ level: batteryLevel }));
    const b = Battery.addBatteryStateListener(({ batteryState }) =>
      apply({
        charging: batteryState === Battery.BatteryState.CHARGING || batteryState === Battery.BatteryState.FULL,
      }),
    );
    return () => {
      mounted = false;
      a.remove();
      b.remove();
    };
  }, []);
  return state;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#0b0b0b' },
});
