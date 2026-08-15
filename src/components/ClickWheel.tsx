import { useMemo, useRef } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { FINISHES, WHEEL } from '../theme';
import type { NanoColor } from '../types';

type Zone = 'center' | 'menu' | 'play' | 'prev' | 'next' | 'wheel';

interface Props {
  color: NanoColor;
  disabled?: boolean;
  onTick: (delta: number) => void;
  onSelect: () => void;
  onMenu: () => void;
  onMenuHold: () => void;
  onPlayPause: () => void;
  onSkip: (dir: 1 | -1) => void;
  onCenterHold: () => void;
}

const TICK = (Math.PI * 2) / 20;

function zoneAt(x: number, y: number, size: number): Zone {
  const c = size / 2;
  const dx = x - c;
  const dy = y - c;
  const r = Math.sqrt(dx * dx + dy * dy);
  const inner = size * 0.16;
  const ring = size * 0.48;
  if (r < inner) return 'center';
  if (r > ring) return 'wheel';
  const ang = Math.atan2(dy, dx);
  const deg = (ang * 180) / Math.PI;
  if (deg > -135 && deg <= -45) return 'menu';
  if (deg > 45 && deg <= 135) return 'play';
  if (deg > 135 || deg <= -135) return 'prev';
  return 'next';
}

export function ClickWheel({
  color,
  disabled,
  onTick,
  onSelect,
  onMenu,
  onMenuHold,
  onPlayPause,
  onSkip,
  onCenterHold,
}: Props) {
  const finish = FINISHES[color];
  const sizeRef = useRef(200);
  const lastAngle = useRef<number | null>(null);
  const acc = useRef(0);
  const start = useRef({ x: 0, y: 0, t: 0, zone: 'wheel' as Zone });
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moved = useRef(false);

  const clearHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          const { locationX, locationY } = e.nativeEvent;
          const size = sizeRef.current;
          const zone = zoneAt(locationX, locationY, size);
          start.current = { x: locationX, y: locationY, t: Date.now(), zone };
          moved.current = false;
          lastAngle.current = Math.atan2(locationY - size / 2, locationX - size / 2);
          acc.current = 0;
          clearHold();
          if (zone === 'menu') {
            holdTimer.current = setTimeout(onMenuHold, 900);
          } else if (zone === 'center') {
            holdTimer.current = setTimeout(onCenterHold, 700);
          }
        },
        onPanResponderMove: (e) => {
          if (disabled) return;
          const { locationX, locationY } = e.nativeEvent;
          const size = sizeRef.current;
          const dx = locationX - start.current.x;
          const dy = locationY - start.current.y;
          if (dx * dx + dy * dy > 36) {
            moved.current = true;
            clearHold();
          }
          const angle = Math.atan2(locationY - size / 2, locationX - size / 2);
          if (lastAngle.current == null) {
            lastAngle.current = angle;
            return;
          }
          let delta = angle - lastAngle.current;
          if (delta > Math.PI) delta -= Math.PI * 2;
          if (delta < -Math.PI) delta += Math.PI * 2;
          lastAngle.current = angle;
          acc.current += delta;
          while (acc.current > TICK) {
            acc.current -= TICK;
            onTick(1);
          }
          while (acc.current < -TICK) {
            acc.current += TICK;
            onTick(-1);
          }
        },
        onPanResponderRelease: () => {
          clearHold();
          lastAngle.current = null;
          if (moved.current || disabled) return;
          const { zone } = start.current;
          if (zone === 'center') onSelect();
          else if (zone === 'menu') onMenu();
          else if (zone === 'play') onPlayPause();
          else if (zone === 'prev') onSkip(-1);
          else if (zone === 'next') onSkip(1);
        },
        onPanResponderTerminate: () => {
          clearHold();
          lastAngle.current = null;
        },
      }),
    [disabled, onTick, onSelect, onMenu, onMenuHold, onPlayPause, onSkip, onCenterHold],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    sizeRef.current = e.nativeEvent.layout.width;
  };

  return (
    <View style={styles.wrap} onLayout={onLayout} {...responder.panHandlers}>
      <LinearGradient colors={[...WHEEL.colors]} style={styles.wheel}>
        <View style={[styles.ring, { borderColor: WHEEL.edge }]} />
        <Text style={[styles.label, styles.menu, { color: WHEEL.label }]}>MENU</Text>
        <Text style={[styles.label, styles.prev, { color: WHEEL.label }]}>{'|<<'}</Text>
        <Text style={[styles.label, styles.next, { color: WHEEL.label }]}>{'>>|'}</Text>
        <Text style={[styles.label, styles.play, { color: WHEEL.label }]}>{'▶❚❚'}</Text>
        <LinearGradient colors={finish.center} style={[styles.center, { borderColor: finish.edge }]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Circle cx="50" cy="50" r="46" fill="none" stroke={finish.edge} strokeOpacity={0.25} strokeWidth="2" />
          </Svg>
        </LinearGradient>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    aspectRatio: 1,
    width: '70%',
    maxWidth: 196,
    maxHeight: '100%',
    alignSelf: 'center',
  },
  wheel: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 6px 12px rgba(0,0,0,0.35)',
  },
  ring: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 999,
    borderWidth: 1,
    opacity: 0.55,
  },
  center: {
    width: '34%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  label: {
    position: 'absolute',
    fontWeight: '700',
    letterSpacing: 1.2,
    fontSize: 11,
  },
  menu: { top: '8%' },
  play: { bottom: '8%', fontSize: 12, letterSpacing: 0 },
  prev: { left: '7%', fontSize: 13 },
  next: { right: '7%', fontSize: 13 },
});
