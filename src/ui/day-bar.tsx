import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { useAccent } from './accent';
import { color, shades } from './theme';

const HEIGHT = 14;
const GAP = 2;

function Segment({ left, width, tint, index }: { left: number; width: number; tint: string; index: number }) {
  const w = useSharedValue(0);
  const x = useSharedValue(left);

  useEffect(() => {
    const ease = { duration: 520, easing: Easing.out(Easing.cubic) };
    w.value = withDelay(index * 70, withTiming(width, ease));
    x.value = withTiming(left, ease);
  }, [width, left, index, w, x]);

  const style = useAnimatedStyle(() => ({ width: w.value, left: x.value }));
  return <Animated.View style={[styles.segment, { backgroundColor: tint }, style]} />;
}

/**
 * The Day as one bar: each Entry is a segment, in the order eaten, against the Goal.
 * When Eaten passes the Goal the bar rescales and a tick marks where the Goal was.
 */
export function DayBar({ kcals, goal }: { kcals: readonly number[]; goal: number }) {
  const accent = useAccent();
  const [width, setWidth] = useState(0);
  const eaten = kcals.reduce((a, b) => a + b, 0);
  const scale = Math.max(goal, eaten);

  let cursor = 0;
  const segments = kcals.map((k, i) => {
    const left = (cursor / scale) * width;
    cursor += k;
    const w = Math.max(2, (k / scale) * width - GAP);
    // The newest Entry wears the accent; earlier ones alternate greys.
    const tint = i === kcals.length - 1 ? accent.value : shades[(i + 1) % shades.length];
    return { left, width: w, tint };
  });

  return (
    <View style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && segments.map((s, i) => <Segment key={i} index={i} {...s} />)}
      {width > 0 && eaten > goal && <View style={[styles.goalTick, { left: (goal / scale) * width - 1 }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: HEIGHT, borderRadius: HEIGHT / 2, backgroundColor: color.track, overflow: 'hidden' },
  segment: { position: 'absolute', top: 0, bottom: 0, borderRadius: 3 },
  goalTick: { position: 'absolute', top: -2, bottom: -2, width: 2, backgroundColor: color.bg },
});
