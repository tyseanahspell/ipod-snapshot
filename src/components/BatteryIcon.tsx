import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

export function BatteryIcon({ level, charging }: { level: number; charging?: boolean }) {
  const pct = Math.max(0.05, Math.min(1, level));
  const fill = charging ? '#7CFF7C' : '#ffffff';
  return (
    <View style={styles.wrap}>
      <Svg width={22} height={12} viewBox="0 0 22 12">
        <Rect x="0.5" y="1.5" width="18" height="9" rx="1.5" fill="none" stroke="#fff" strokeWidth="1.2" />
        <Rect x="19.2" y="4" width="2" height="4" rx="0.6" fill="#fff" />
        <Rect x="2" y="3" width={14.8 * pct} height="6" rx="0.8" fill={fill} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center' },
});
