import * as Haptics from 'expo-haptics';
import { useEffect, useEffectEvent, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { family } from './theme';

/** Strawberry: ripe and pale flesh, leaf greens, seed yellow. */
const COLOURS = ['#E8344E', '#C21E3A', '#FF5C77', '#FF8FA3', '#FFC2CC', '#3FA34D', '#2E7D32', '#F5D76E'];
const PIECES = 70;
const BERRIES = 8;
const DURATION = 2600;
const GRAVITY = 1400;

interface Piece {
  x0: number;
  vx: number;
  vy: number;
  spin: number;
  size: number;
  colour: string;
  shape: 'rect' | 'dot' | 'seed' | 'berry';
  delay: number;
}

function makePieces(width: number): Piece[] {
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  return Array.from({ length: PIECES + BERRIES }, (_, i) => {
    const berry = i >= PIECES;
    const shapes = ['rect', 'rect', 'dot', 'seed'] as const;
    return {
      x0: width / 2 + rand(-40, 40),
      vx: rand(-420, 420),
      vy: rand(-1250, -700),
      spin: rand(-900, 900),
      size: berry ? rand(20, 28) : rand(7, 12),
      colour: COLOURS[i % COLOURS.length],
      shape: berry ? 'berry' : shapes[i % shapes.length],
      delay: rand(0, 140),
    };
  });
}

function ConfettiPiece({ piece, originY }: { piece: Piece; originY: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(piece.delay, withTiming(1, { duration: DURATION, easing: Easing.linear }));
  }, [piece.delay, t]);

  const style = useAnimatedStyle(() => {
    const s = (t.value * DURATION) / 1000;
    // Air drag: sideways drift slows, so pieces flutter down rather than fly off.
    const x = piece.x0 + piece.vx * (1 - Math.exp(-2.2 * s)) / 2.2;
    const y = originY + piece.vy * s + 0.5 * GRAVITY * s * s;
    return {
      opacity: t.value < 0.75 ? 1 : 1 - (t.value - 0.75) / 0.25,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${piece.spin * s}deg` },
        { rotateX: `${piece.spin * s * 0.7}deg` },
      ],
    };
  });

  if (piece.shape === 'berry') {
    return (
      <Animated.Text style={[styles.piece, { fontSize: piece.size }, style]} allowFontScaling={false}>
        🍓
      </Animated.Text>
    );
  }
  const dims =
    piece.shape === 'rect' ? { width: piece.size, height: piece.size * 0.45, borderRadius: 2 }
    : piece.shape === 'dot' ? { width: piece.size * 0.8, height: piece.size * 0.8, borderRadius: piece.size }
    : { width: piece.size * 0.45, height: piece.size * 0.7, borderRadius: piece.size };
  return <Animated.View style={[styles.piece, dims, { backgroundColor: piece.colour }, style]} />;
}

function PopText({ text, delay, size }: { text: string; delay: number; size: number }) {
  return (
    <View style={styles.textRow}>
      {text.split('').map((ch, i) => (
        <Animated.Text
          key={i}
          entering={ZoomIn.delay(delay + i * 28).springify().damping(9).stiffness(220)}
          style={[styles.headline, { fontSize: size, letterSpacing: -size * 0.02 }]}
        >
          {ch === ' ' ? ' ' : ch}
        </Animated.Text>
      ))}
    </View>
  );
}

/** The once-a-day burst for the first thing logged today. Tap or wait to dismiss. */
export function Celebration({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [pieces] = useState(() => makePieces(width));

  const finish = useEffectEvent(onDone);

  // Runs once per Celebration, however often the parent re-renders.
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const ticks = [140, 260, 380].map((ms) => setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), ms));
    const done = setTimeout(() => finish(), DURATION + 300);
    return () => {
      ticks.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, []);

  return (
    <Animated.View exiting={FadeOut.duration(250)} style={StyleSheet.absoluteFill}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDone} accessibilityLabel="Dismiss">
        {!reduceMotion && pieces.map((p, i) => <ConfettiPiece key={i} piece={p} originY={height * 0.42} />)}
        <View style={[styles.message, { top: height * 0.3 }]} pointerEvents="none">
          <PopText text="Yay!" delay={0} size={52} />
          <PopText text="First log of the day" delay={160} size={22} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', left: 0, top: 0 },
  message: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 6 },
  textRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  headline: {
    color: '#FFFFFF',
    fontFamily: family.semibold,
    textShadowColor: 'rgba(232,52,78,0.6)',
    textShadowRadius: 18,
  },
});
