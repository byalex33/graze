import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { useQuery } from '@/db/changes';
import { entriesForDay } from '@/db/repo';
import { clockTime, type DayKey } from '@/domain/day';
import { formatNumber, remainingLabel, totalsOf, type Entry, type Goal } from '@/domain/entry';
import { Rings } from './rings';
import { color, radius, space, type } from './theme';

function Summary({ entries, goal }: { entries: readonly Entry[]; goal: Goal }) {
  const t = totalsOf(entries);
  return (
    <View style={styles.card}>
      <View style={styles.summaryRow}>
        <Rings kcalProgress={t.kcal / goal.kcal} proteinProgress={t.protein / goal.protein} />
        <View style={styles.summaryNumbers}>
          <Text style={type.hero}>{formatNumber(t.kcal)}</Text>
          <Text style={type.label}>
            of {formatNumber(goal.kcal)} kcal · {remainingLabel(t.kcal, goal.kcal)}
          </Text>
          <View style={styles.proteinLine}>
            <View style={styles.dot} />
            <Text style={type.number}>{formatNumber(t.protein)}</Text>
            <Text style={type.label}> / {formatNumber(goal.protein)} g protein</Text>
          </View>
        </View>
      </View>
      <View style={styles.macros}>
        <Text style={type.small}>Carbs {formatNumber(t.carbs)} g</Text>
        <Text style={type.small}>Fat {formatNumber(t.fat)} g</Text>
      </View>
    </View>
  );
}

function EntryRow({ entry }: { entry: Entry }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/entry', params: { id: entry.id } })}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.cardRaised }]}
    >
      <Text style={[type.small, styles.time]}>{clockTime(entry.eatenAt)}</Text>
      <Text numberOfLines={1} style={[type.body, styles.name, !entry.name && { color: color.muted }]}>
        {entry.name || 'Quick Add'}
      </Text>
      <View style={styles.rowNumbers}>
        <Text style={type.number}>{formatNumber(entry.kcal)}</Text>
        {entry.protein !== null && <Text style={type.small}>{formatNumber(entry.protein)} g</Text>}
      </View>
    </Pressable>
  );
}

/** One Day: its totals against the Goal, then its Entries in the order they were eaten. */
export function DayPage({ day, goal, width, bottomInset }: { day: DayKey; goal: Goal; width: number; bottomInset: number }) {
  const entries = useQuery((db) => entriesForDay(db, day), [day]);

  return (
    <ScrollView style={{ width }} contentContainerStyle={[styles.page, { paddingBottom: bottomInset }]}>
      {entries && <Summary entries={entries} goal={goal} />}
      {entries && entries.length === 0 && (
        <Animated.Text entering={FadeIn} style={[type.label, styles.empty]}>
          Nothing logged
        </Animated.Text>
      )}
      {entries && entries.length > 0 && (
        <View style={[styles.card, styles.list]}>
          {entries.map((e) => (
            <Animated.View key={e.id} entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} layout={LinearTransition}>
              <EntryRow entry={e} />
            </Animated.View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.lg, gap: space.md },
  card: { backgroundColor: color.card, borderRadius: radius.lg, padding: space.lg },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: space.xl },
  summaryNumbers: { flex: 1, gap: 2 },
  proteinLine: { flexDirection: 'row', alignItems: 'center', marginTop: space.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.muted, marginRight: space.sm },
  macros: {
    flexDirection: 'row',
    gap: space.lg,
    marginTop: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.hairline,
  },
  list: { paddingVertical: space.xs, paddingHorizontal: 0 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.md },
  time: { width: 42 },
  name: { flex: 1 },
  rowNumbers: { alignItems: 'flex-end' },
  empty: { textAlign: 'center', marginTop: space.xxl },
});
