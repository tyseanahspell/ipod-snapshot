import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SCREEN } from '../theme';
import { BatteryIcon } from './BatteryIcon';

interface Props {
  title: string;
  playing?: boolean;
  paused?: boolean;
  hold?: boolean;
  battery: number;
  charging?: boolean;
}

export function StatusHeader({ title, playing, paused, hold, battery, charging }: Props) {
  return (
    <LinearGradient colors={[SCREEN.headerTop, SCREEN.headerMid, SCREEN.headerBot]} style={styles.bar}>
      <View style={styles.left}>
        {playing ? <Text style={styles.icon}>▶</Text> : null}
        {paused ? <Text style={styles.icon}>❚❚</Text> : null}
      </View>
      <Text numberOfLines={1} style={styles.title}>
        {hold ? '🔒 HOLD' : title}
      </Text>
      <BatteryIcon level={battery} charging={charging} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#000',
  },
  left: { width: 22, alignItems: 'flex-start' },
  icon: { color: '#fff', fontSize: 10, fontWeight: '700' },
  title: {
    flex: 1,
    textAlign: 'center',
    color: SCREEN.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
