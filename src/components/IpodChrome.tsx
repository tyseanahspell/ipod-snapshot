import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FINISHES } from '../theme';
import type { NanoColor } from '../types';
import { ClickWheel } from './ClickWheel';
import { LcdScreen } from './LcdScreen';

interface Props {
  color: NanoColor;
  hold: boolean;
  brightness: number;
  battery: number;
  charging?: boolean;
  onHold: () => void;
  onTick: (d: number) => void;
  onSelect: () => void;
  onMenu: () => void;
  onMenuHold: () => void;
  onPlayPause: () => void;
  onSkip: (dir: 1 | -1) => void;
  onCenterHold: () => void;
}

export function IpodChrome(props: Props) {
  const finish = FINISHES[props.color];
  return (
    <View style={styles.desk}>
      <LinearGradient colors={finish.body} style={[styles.body, { borderColor: finish.edge }]}>
        <View style={styles.topRow}>
          <View style={styles.jack} />
          <Pressable onPress={props.onHold} style={styles.holdHit}>
            <View style={[styles.hold, props.hold && styles.holdOn]}>
              <View style={[styles.holdKnob, props.hold && styles.holdKnobOn]} />
            </View>
            <Text style={[styles.holdLabel, { color: finish.label }]}>{props.hold ? 'HOLD' : 'HOLD'}</Text>
          </Pressable>
        </View>

        <View style={[styles.bezel, { backgroundColor: finish.bezel }]}>
          <View style={[styles.glass, { opacity: 0.35 + props.brightness * 0.65 }]}>
            <LcdScreen battery={props.battery} charging={props.charging} />
          </View>
        </View>

        <View style={styles.wheelArea}>
          <ClickWheel
            color={props.color}
            disabled={props.hold}
            onTick={props.onTick}
            onSelect={props.onSelect}
            onMenu={props.onMenu}
            onMenuHold={props.onMenuHold}
            onPlayPause={props.onPlayPause}
            onSkip={props.onSkip}
            onCenterHold={props.onCenterHold}
          />
        </View>

        <View style={styles.bottom}>
          <View style={styles.dock} />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  desk: {
    flex: 1,
    backgroundColor: '#0b0b0b',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  body: {
    width: '100%',
    maxWidth: 420,
    flex: 1,
    borderRadius: 36,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  jack: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#111',
    opacity: 0.7,
  },
  holdHit: { alignItems: 'flex-end' },
  hold: {
    width: 28,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },
  holdOn: { backgroundColor: '#d35400' },
  holdKnob: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#eee',
    alignSelf: 'flex-start',
  },
  holdKnobOn: { alignSelf: 'flex-end' },
  holdLabel: { fontSize: 8, fontWeight: '700', marginTop: 2, letterSpacing: 0.6 },
  bezel: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: '46%',
    width: '100%',
    borderRadius: 6,
    padding: 5,
    minHeight: 200,
  },
  glass: { flex: 1, backgroundColor: '#000', overflow: 'hidden', borderRadius: 2 },
  wheelArea: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 200,
    maxHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    overflow: 'hidden',
  },
  bottom: { alignItems: 'center' },
  dock: {
    width: 36,
    height: 6,
    borderRadius: 2,
    backgroundColor: '#111',
    opacity: 0.45,
  },
});
