import * as Haptics from 'expo-haptics';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { startOfDay, type DayKey } from '@/domain/day';
import { heatLevel, heatmapWeeks, type DayStat } from '@/domain/stats';
import { color, heat, radius, space, type } from './theme';

/**
 * One week's column, fading in after `delay`. Its own animation rather than a Reanimated
 * entering animation, which on Android can stay invisible if it mounts behind another screen.
 */
function WeekColumn({ delay, children }: { delay: number; children: ReactNode }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 260 }));
  }, [delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ gap: GAP }, style]}>{children}</Animated.View>;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const GAP = 3;

interface HeatmapProps {
  stats: readonly DayStat[];
  today: DayKey;
  selected: DayKey;
  weeks: number;
  onSelect: (day: DayKey) => void;
}

/**
 * Logged Days at a glance, sweeping in week by week. A dark square is just a Day
 * with nothing logged: there is no streak and no score.
 */
export function Heatmap({ stats, today, selected, weeks, onSelect }: HeatmapProps) {
  const [width, setWidth] = useState(0);
  const grid = heatmapWeeks(today, weeks);
  const entriesByDay = new Map(stats.map((s) => [s.day, s.entries]));
  const cell = width > 0 ? (width - GAP * (weeks - 1)) / weeks : 0;
  const logged = grid.flat().filter((d) => d && entriesByDay.has(d)).length;

  return (
    <View style={styles.card}>
      <Text style={type.eyebrow}>Logged days</Text>
      <View style={styles.header}>
        <Text style={styles.headline}>{logged}</Text>
        <Text style={type.small}>in {weeks} weeks</Text>
      </View>

      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {cell > 0 && (
          <>
            <View style={[styles.months, { height: 14 }]}>
              {grid.map((week, w) => {
                const first = week[0] && startOfDay(week[0]);
                const showMonth = first && (w === 0 || first.getDate() <= 7);
                return showMonth && w < weeks - 1 ? (
                  <Text key={w} style={[type.small, styles.month, { left: w * (cell + GAP) }]}>
                    {MONTHS[first.getMonth()]}
                  </Text>
                ) : null;
              })}
            </View>
            <View style={styles.grid}>
              {grid.map((week, w) => (
                <WeekColumn key={w} delay={w * 22}>
                  {week.map((day, d) => {
                    if (!day) return <View key={d} style={{ width: cell, height: cell }} />;
                    const level = heatLevel(entriesByDay.get(day) ?? 0);
                    return (
                      <Pressable
                        key={d}
                        hitSlop={1}
                        onPress={() => {
                          Haptics.selectionAsync();
                          onSelect(day);
                        }}
                        style={[
                          styles.cell,
                          { width: cell, height: cell, backgroundColor: heat[level] },
                          day === selected && styles.selected,
                        ]}
                      />
                    );
                  })}
                </WeekColumn>
              ))}
            </View>
          </>
        )}
      </View>

      <View style={styles.legend}>
        <Text style={type.small}>Less</Text>
        {heat.map((c) => (
          <View key={c} style={[styles.legendCell, { backgroundColor: c }]} />
        ))}
        <Text style={type.small}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.card, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginBottom: space.xs },
  headline: { ...type.number, fontSize: 30, letterSpacing: -1.2 },
  months: { position: 'relative', marginBottom: space.xs },
  month: { position: 'absolute', top: 0, fontSize: 10 },
  grid: { flexDirection: 'row', gap: GAP },
  cell: { borderRadius: 3 },
  selected: { borderWidth: 1.5, borderColor: color.text },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: space.xs },
  legendCell: { width: 10, height: 10, borderRadius: 2 },
});
