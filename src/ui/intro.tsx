import * as Haptics from 'expo-haptics';
import { useEffect, useEffectEvent, useState } from 'react';
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { color, family } from './theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const BODY = require('../../assets/images/intro/strawberry-body.png');
const LEAVES = require('../../assets/images/intro/strawberry-leaves.png');

const FOODS = ['🥑', '🍌', '🥦', '🍞', '🧀', '🥚', '🍗', '🥕', '🍎', '🥛', '🍝', '🥐'];
/** The layer art fills ~52% of its canvas; this size lines the strawberry up with the launch screen. */
const ART = 180;
const FLIGHT_MS = 520;
const FIRST_FOOD_MS = 150;
const FOOD_GAP_MS = 95;
const WORD_AT = FIRST_FOOD_MS + FOOD_GAP_MS * FOODS.length + 180;
const REVEAL_AT = WORD_AT + 650;
const REVEAL_MS = 650;

interface Flight {
  emoji: string;
  from: { x: number; y: number };
  bend: { x: number; y: number };
  spin: number;
  delay: number;
}

/** Start points spread around the screen edge, with a sideways bend so each one swoops. */
function plan(width: number, height: number): Flight[] {
  return FOODS.map((emoji, i) => {
    const angle = (i / FOODS.length) * Math.PI * 2 + Math.random() * 0.4;
    const reach = Math.hypot(width, height) * 0.62;
    const from = { x: Math.cos(angle) * reach, y: Math.sin(angle) * reach };
    const side = i % 2 === 0 ? 1 : -1;
    const bend = { x: from.x * 0.45 - from.y * 0.35 * side, y: from.y * 0.45 + from.x * 0.35 * side };
    return { emoji, from, bend, spin: (Math.random() - 0.5) * 540, delay: FIRST_FOOD_MS + i * FOOD_GAP_MS };
  });
}

function Food({ flight, onArrive }: { flight: Flight; onArrive: () => void }) {
  const t = useSharedValue(0);
  const arrived = useEffectEvent(onArrive);

  // Flies once; re-renders of the intro mustn't restart it.
  useEffect(() => {
    // Defined here on the JS thread so the animation callback can hand it back by reference.
    const land = () => arrived();
    t.set(
      withDelay(
        flight.delay,
        withTiming(1, { duration: FLIGHT_MS, easing: Easing.in(Easing.quad) }, (done) => {
          if (done) scheduleOnRN(land);
        }),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => {
    // A quadratic curve from the edge, through the bend, into the centre.
    const u = t.value;
    const x = (1 - u) * (1 - u) * flight.from.x + 2 * (1 - u) * u * flight.bend.x;
    const y = (1 - u) * (1 - u) * flight.from.y + 2 * (1 - u) * u * flight.bend.y;
    return {
      opacity: interpolate(u, [0, 0.08, 0.85, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${flight.spin * u}deg` },
        { scale: interpolate(u, [0, 0.7, 1], [1.15, 0.9, 0.25]) },
      ],
    };
  });

  return (
    <Animated.Text allowFontScaling={false} style={[styles.food, style]}>
      {flight.emoji}
    </Animated.Text>
  );
}

function Letter({ ch, index, start }: { ch: string; index: number; start: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, start.value * 5 - index * 0.55));
    return {
      opacity: p,
      transform: [{ translateY: (1 - p) * 18 }, { scale: 0.85 + p * 0.15 }],
    };
  });
  return <Animated.Text style={[styles.letter, style]}>{ch}</Animated.Text>;
}

/**
 * The launch intro: foods swoop into the strawberry, which grows with each one, "Graze"
 * springs up, then a circle opens from the strawberry onto the app. About 2.6 s; tap to skip.
 */
export function Intro() {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [flights] = useState(() => plan(width, height));

  // Once the circle starts opening the intro must never catch a touch, and it must go
  // away even if the animation's own "finished" callback never arrives.
  const [revealing, setRevealing] = useState(false);
  // The intro hides itself when it's finished. It used to be removed by its parent, but on
  // Android that update never reached it and it stayed, invisible, over the whole app.
  const [hidden, setHidden] = useState(false);
  const onDone = () => setHidden(true);

  const grow = useSharedValue(1);
  const gulp = useSharedValue(0);
  const wiggle = useSharedValue(0);
  const glow = useSharedValue(0);
  const word = useSharedValue(0);
  const reveal = useSharedValue(0);
  const fade = useSharedValue(1);

  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.hypot(width, height);

  const arrive = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    grow.set(withSpring(grow.get() + 0.045, { damping: 14, stiffness: 180 }));
    gulp.set(withSequence(withTiming(1, { duration: 70 }), withSpring(0, { damping: 9, stiffness: 260 })));
    wiggle.set(withSequence(withTiming(1, { duration: 80 }), withSpring(0, { damping: 6, stiffness: 300 })));
  };

  const startReveal = (afterMs: number) => {
    reveal.set(
      withDelay(
        afterMs,
        withTiming(1, { duration: REVEAL_MS, easing: Easing.inOut(Easing.cubic) }, (done) => {
          if (done) scheduleOnRN(onDone);
        }),
      ),
    );
  };

  useEffect(() => {
    const backstop = setTimeout(onDone, (reduceMotion ? 550 : REVEAL_AT + REVEAL_MS) + 500);
    if (reduceMotion) {
      fade.set(withDelay(250, withTiming(0, { duration: 300 }, (done) => done && scheduleOnRN(onDone))));
      return () => clearTimeout(backstop);
    }
    const lettingGo = setTimeout(() => setRevealing(true), REVEAL_AT);
    glow.set(withDelay(WORD_AT - 200, withTiming(1, { duration: 600 })));
    word.set(withDelay(WORD_AT, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) })));
    const t = setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), WORD_AT + 150);
    startReveal(REVEAL_AT);
    return () => {
      clearTimeout(t);
      clearTimeout(lettingGo);
      clearTimeout(backstop);
    };
    // Runs once; the shared values are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const skip = () => {
    if (revealing || reduceMotion) return;
    setRevealing(true);
    word.set(withTiming(1, { duration: 150 }));
    startReveal(0);
    setTimeout(onDone, REVEAL_MS + 500);
  };

  const berry = useAnimatedStyle(() => ({
    opacity: interpolate(reveal.value, [0, 0.55], [1, 0], 'clamp'),
    transform: [
      { scale: grow.value * (1 + gulp.value * 0.08) * interpolate(reveal.value, [0, 1], [1, 7]) },
      { translateY: -gulp.value * 4 },
    ],
  }));
  const leaves = useAnimatedStyle(() => ({ transform: [{ rotate: `${wiggle.value * 9}deg` }, { translateY: -wiggle.value * 6 }] }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * interpolate(reveal.value, [0, 0.4], [1, 0], 'clamp'),
    transform: [{ scale: 0.8 + glow.value * 0.4 }],
  }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: interpolate(reveal.value, [0, 0.35], [1, 0], 'clamp') }));
  const overlay = useAnimatedStyle(() => ({ opacity: fade.value }));

  // The backdrop is a rectangle with a growing circular hole, so the app shows through
  // from the strawberry outwards.
  const holeProps = useAnimatedProps(() => {
    const r = reveal.value * maxRadius;
    return {
      d:
        `M0,0 H${width} V${height} H0 Z ` +
        (r > 0.5 ? `M${cx - r},${cy} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0 Z` : ''),
    };
  });

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, overlay, hidden && styles.gone]}
      pointerEvents={revealing || hidden ? 'none' : 'auto'}
      accessibilityElementsHidden={revealing || hidden}
      importantForAccessibility={revealing || hidden ? 'no-hide-descendants' : 'auto'}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={skip} disabled={revealing} accessibilityLabel="Skip intro">
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <AnimatedPath animatedProps={holeProps} fill={color.bg} fillRule="evenodd" />
        </Svg>

        <View style={[styles.centre, { left: cx, top: cy }]} pointerEvents="none">
          <Animated.View style={[styles.glow, glowStyle]}>
            <Svg width={ART * 2} height={ART * 2}>
              <Defs>
                <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#FF4D63" stopOpacity={0.38} />
                  <Stop offset="1" stopColor="#FF4D63" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect width={ART * 2} height={ART * 2} fill="url(#glow)" />
            </Svg>
          </Animated.View>

          {!reduceMotion && flights.map((f, i) => <Food key={i} flight={f} onArrive={arrive} />)}

          <Animated.View style={[styles.art, berry]}>
            <Image source={BODY} style={styles.layer} />
            <Animated.Image source={LEAVES} style={[styles.layer, leaves]} />
          </Animated.View>

          <Animated.View style={[styles.word, wordStyle]}>
            {'Graze'.split('').map((ch, i) => (
              <Letter key={i} ch={ch} index={i} start={word} />
            ))}
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gone: { display: 'none' },
  centre: { position: 'absolute', width: 0, height: 0, alignItems: 'center', justifyContent: 'center' },
  art: { position: 'absolute', width: ART, height: ART },
  layer: { position: 'absolute', width: ART, height: ART },
  glow: { position: 'absolute', width: ART * 2, height: ART * 2 },
  // Absolute children of the zero-size centre are already centred on it, so no offsets here.
  food: { position: 'absolute', fontSize: 34, width: 48, height: 48, textAlign: 'center', lineHeight: 48 },
  word: { position: 'absolute', top: ART * 0.5, flexDirection: 'row', width: 300, justifyContent: 'center' },
  letter: { color: color.text, fontFamily: family.semibold, fontSize: 40, letterSpacing: -1.2 },
});
