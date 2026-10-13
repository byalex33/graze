import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { color } from './theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function Ring({ box, size, stroke, progress, tint }: { box: number; size: number; stroke: number; progress: number; tint: string }) {
  const r = (size - stroke) / 2;
  const c = box / 2;
  const circumference = 2 * Math.PI * r;
  const shown = useSharedValue(0);

  useEffect(() => {
    shown.set(withTiming(Math.min(Math.max(progress, 0), 1), { duration: 800, easing: Easing.out(Easing.cubic) }));
  }, [progress, shown]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - shown.value) }));

  return (
    <>
      <Circle cx={c} cy={c} r={r} stroke={color.track} strokeWidth={stroke} fill="none" />
      <AnimatedCircle
        cx={c}
        cy={c}
        r={r}
        stroke={tint}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        animatedProps={animatedProps}
        transform={`rotate(-90 ${c} ${c})`}
      />
    </>
  );
}

interface RingsProps {
  size: number;
  /** Outer ring: calories against the Goal. */
  outer: { progress: number; tint: string };
  /** Inner ring: protein against the Goal. */
  inner: { progress: number; tint: string };
  /** Shown in the middle. */
  children?: ReactNode;
}

/** Two concentric progress rings with something in the middle. */
export function Rings({ size, outer, inner, children }: RingsProps) {
  const outerStroke = Math.round(size * 0.068);
  const innerStroke = Math.round(size * 0.05);
  const gap = Math.round(size * 0.03);
  const innerSize = size - 2 * (outerStroke + gap);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Ring box={size} size={size} stroke={outerStroke} progress={outer.progress} tint={outer.tint} />
        <Ring box={size} size={innerSize} stroke={innerStroke} progress={inner.progress} tint={inner.tint} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.centre]} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center', justifyContent: 'center' },
});
