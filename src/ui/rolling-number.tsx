import { useEffect } from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { formatNumber } from '@/domain/entry';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

function DigitColumn({ digit, lineHeight, style, delay }: { digit: number; lineHeight: number; style: TextStyle; delay: number }) {
  const position = useSharedValue(0);

  useEffect(() => {
    const t = setTimeout(() => {
      position.value = withSpring(digit, { damping: 20, stiffness: 140, mass: 0.9 });
    }, delay);
    return () => clearTimeout(t);
  }, [digit, delay, position]);

  const reel = useAnimatedStyle(() => ({ transform: [{ translateY: -position.value * lineHeight }] }));

  return (
    <View style={{ height: lineHeight, overflow: 'hidden' }}>
      <Animated.View style={reel}>
        {DIGITS.map((d) => (
          <Text key={d} style={[style, { lineHeight, height: lineHeight }]}>
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

/**
 * A number whose digits roll to their new value, odometer-style.
 * Columns are keyed from the right so the units stay put when the number grows a digit.
 * Needs a monospaced font in `style`.
 */
export function RollingNumber({ value, style }: { value: number; style: TextStyle }) {
  const fontSize = style.fontSize ?? 16;
  const lineHeight = Math.round(fontSize * 1.08);
  const chars = formatNumber(Math.max(0, value)).split('');

  return (
    <View style={styles.row} accessible accessibilityLabel={formatNumber(value)}>
      {chars.map((c, i) => {
        const fromRight = chars.length - i;
        return /\d/.test(c) ? (
          <DigitColumn key={`d${fromRight}`} digit={Number(c)} lineHeight={lineHeight} style={style} delay={fromRight * 40} />
        ) : (
          <Text key={`s${fromRight}`} style={[style, { lineHeight, height: lineHeight }]}>
            {c}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
});
