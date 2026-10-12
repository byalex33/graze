import { useEffect } from 'react';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { color } from './theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RingProps {
  size: number;
  stroke: number;
  /** 0..1; anything above 1 shows a full ring. */
  progress: number;
  tint: string;
}

function Ring({ size, stroke, progress, tint }: RingProps) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const shown = useSharedValue(0);

  useEffect(() => {
    shown.value = withTiming(Math.min(Math.max(progress, 0), 1), {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, shown]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - shown.value),
  }));

  return (
    <>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={color.track} strokeWidth={stroke} fill="none" />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={tint}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        animatedProps={animatedProps}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </>
  );
}

interface RingsProps {
  size?: number;
  kcalProgress: number;
  proteinProgress: number;
}

/** Outer ring: calories against the Goal. Inner ring: protein against the Goal. */
export function Rings({ size = 132, kcalProgress, proteinProgress }: RingsProps) {
  const stroke = 12;
  const gap = 6;
  const inner = size - 2 * (stroke + gap);
  return (
    <Svg width={size} height={size}>
      <Ring size={size} stroke={stroke} progress={kcalProgress} tint={color.text} />
      <Svg x={stroke + gap} y={stroke + gap} width={inner} height={inner}>
        <Ring size={inner} stroke={stroke} progress={proteinProgress} tint={color.muted} />
      </Svg>
    </Svg>
  );
}
