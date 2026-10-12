import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { formatNumber } from '@/domain/entry';
import { color, radius, space, type } from './theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const HEIGHT = 96;
const PAD_Y = 10;

interface Point { x: number; y: number; i: number }

/** Line through logged Days only; a Day with nothing logged breaks the line. */
function buildPaths(points: (Point | null)[], bottom: number) {
  let line = '';
  let area = '';
  let length = 0;
  let run: Point[] = [];
  const flush = () => {
    if (run.length === 0) return;
    line += run.map((p, k) => `${k === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' ';
    if (run.length > 1) {
      area += `M${run[0].x},${bottom} ` + run.map((p) => `L${p.x},${p.y}`).join(' ') + ` L${run[run.length - 1].x},${bottom} Z `;
    }
    for (let k = 1; k < run.length; k++) length += Math.hypot(run[k].x - run[k - 1].x, run[k].y - run[k - 1].y);
    run = [];
  };
  for (const p of points) {
    if (p) run.push(p);
    else flush();
  }
  flush();
  return { line, area, length: Math.max(1, length) };
}

interface SparklineProps {
  values: readonly (number | null)[];
  labels: readonly string[];
  goal: number;
  title: string;
  headline: number | null;
  detail: string;
}

/**
 * Draws itself in, then press and hold to scrub to any Day.
 * The dashed line is the Goal.
 */
export function Sparkline({ values, labels, goal, title, headline, detail }: SparklineProps) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const scrubIndex = useSharedValue(-1);
  const drawn = useSharedValue(0);

  const logged = values.filter((v): v is number => v !== null);
  const max = Math.max(goal, ...logged) * 1.08;
  const min = Math.min(goal, ...logged) * 0.75;
  const yOf = (v: number) => PAD_Y + (1 - (v - min) / (max - min || 1)) * (HEIGHT - PAD_Y * 2);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values.map((v, i) => (v === null ? null : { x: i * step, y: yOf(v), i }));
  const { line, area, length } = buildPaths(points, HEIGHT);
  const signature = values.join(',') + width;

  useEffect(() => {
    drawn.value = 0;
    drawn.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [signature, drawn]);

  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - drawn.value) }));
  const areaProps = useAnimatedProps(() => ({ opacity: drawn.value }));

  const count = values.length;
  const select = (i: number | null) => {
    if (i !== null) Haptics.selectionAsync();
    setActive(i);
  };

  // Work out the Day under the finger on the UI thread; only cross to JS when it changes.
  const scrub = Gesture.Pan()
    .activateAfterLongPress(140)
    .onStart((e) => {
      const i = Math.min(count - 1, Math.max(0, Math.round(e.x / (step || 1))));
      scrubIndex.value = i;
      scheduleOnRN(select, i);
    })
    .onUpdate((e) => {
      const i = Math.min(count - 1, Math.max(0, Math.round(e.x / (step || 1))));
      if (i !== scrubIndex.value) {
        scrubIndex.value = i;
        scheduleOnRN(select, i);
      }
    })
    .onFinalize(() => {
      scrubIndex.value = -1;
      scheduleOnRN(setActive, null);
    });

  const activeValue = active === null ? null : values[active];
  const activePoint = active === null ? null : points[active];

  return (
    <View style={styles.card}>
      <Text style={type.eyebrow}>{active === null ? title : labels[active]}</Text>
      <View style={styles.header}>
        <Text style={styles.headline}>
          {active === null
            ? headline === null ? '—' : formatNumber(headline)
            : activeValue === null ? '—' : formatNumber(activeValue)}
        </Text>
        <Text style={type.small}>{active === null ? detail : activeValue === null ? 'nothing logged' : 'kcal'}</Text>
      </View>
      <GestureDetector gesture={scrub}>
        <View style={{ height: HEIGHT }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 && (
            <Svg width={width} height={HEIGHT}>
              <Defs>
                <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={color.text} stopOpacity={0.16} />
                  <Stop offset="1" stopColor={color.text} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Line x1={0} x2={width} y1={yOf(goal)} y2={yOf(goal)} stroke={color.faint} strokeWidth={1} strokeDasharray="3 5" />
              <AnimatedPath d={area} fill="url(#fill)" animatedProps={areaProps} />
              <AnimatedPath
                d={line}
                stroke={color.text}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={`${length} ${length}`}
                animatedProps={lineProps}
              />
              {points.map((p) => p && values.length <= 31 && (
                <Circle key={p.i} cx={p.x} cy={p.y} r={p.i === values.length - 1 ? 3.5 : 1.5} fill={color.text} />
              ))}
              {active !== null && (
                <>
                  <Line x1={active * step} x2={active * step} y1={0} y2={HEIGHT} stroke={color.faint} strokeWidth={1} />
                  {activePoint && <Circle cx={activePoint.x} cy={activePoint.y} r={5} fill={color.bg} stroke={color.text} strokeWidth={2} />}
                </>
              )}
            </Svg>
          )}
        </View>
      </GestureDetector>
      <View style={styles.axis}>
        <Text style={type.small}>{labels[0]}</Text>
        <Text style={type.small}>{labels[labels.length - 1]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.card, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginBottom: space.sm },
  headline: { ...type.number, fontSize: 30, letterSpacing: -1.2 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
});
