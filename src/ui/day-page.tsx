import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { useQuery } from '@/db/changes';
import { deleteEntry, entriesForDay, getTodayLayout, getWeightUnit } from '@/db/repo';
import { DEFAULT_TODAY_LAYOUT, type TodayLayout } from '@/domain/today-layout';
import { addDays, clockTime, dayLabel, startOfDay, type DayKey } from '@/domain/day';
import { formatNumber, totalsOf, type Entry, type Goal } from '@/domain/entry';
import { averageLogged, series, type DayStat } from '@/domain/stats';
import { formatWeight, formatWeightChange, weightTrend } from '@/domain/weight';
import { useBurned, useWeighIns } from '@/health/use-health';
import { DayBar } from './day-bar';
import { Heatmap } from './heatmap';
import { RollingNumber } from './rolling-number';
import { Sparkline } from './sparkline';
import { color, family, radius, space, type } from './theme';

const TREND_DAYS = 14;
const WEIGHT_DAYS = 30;
export const HEATMAP_WEEKS = 20;

/** "620 burned so far" today; "2,340 burned · Net −340" for Completed Days with resting energy. */
function BurnedLine({ day, today, eaten }: { day: DayKey; today: DayKey; eaten: number }) {
  const burned = useBurned(day);
  if (!burned) return null;
  const total = burned.active + (burned.resting ?? 0);
  const completed = day < today;
  const net = Math.round(eaten - total);
  let text: string;
  if (!completed) text = `${formatNumber(total)} burned so far`;
  else if (burned.resting === null) text = `${formatNumber(burned.active)} active burned`;
  else text = `${formatNumber(total)} burned · Net ${net < 0 ? '−' : '+'}${formatNumber(Math.abs(net))}`;
  return (
    <Text style={[type.small, styles.burned]}>{text}</Text>
  );
}

function WeightCard({ day, today }: { day: DayKey; today: DayKey }) {
  const unit = useQuery(getWeightUnit, []);
  const since = startOfDay(addDays(day, -(WEIGHT_DAYS + 60))).getTime();
  const weighIns = useWeighIns(since);
  if (!unit || !weighIns || weighIns.length === 0) return null;

  const trend = weightTrend(weighIns, day, WEIGHT_DAYS);
  const latest = [...trend].reverse().find((v) => v !== null) ?? null;
  const first = trend.find((v) => v !== null) ?? null;
  if (latest === null) return null;
  const labels = trend.map((_, i) => {
    const d = addDays(day, i - WEIGHT_DAYS + 1);
    const label = dayLabel(d, today);
    return label === 'Today' || label === 'Yesterday' ? label : shortDate(d);
  });
  return (
    <Sparkline
      values={trend}
      labels={labels}
      title={`Weight trend · ${WEIGHT_DAYS} days`}
      headline={latest}
      detail={first !== null && first !== latest ? `${formatWeightChange(latest - first, unit)} over ${WEIGHT_DAYS} days` : 'trend'}
      format={(kg) => formatWeight(kg, unit)}
      unit="trend"
      showDots={false}
    />
  );
}

function Hero({ entries, goal, day, today, layout }: { entries: readonly Entry[]; goal: Goal; day: DayKey; today: DayKey; layout: TodayLayout }) {
  const t = totalsOf(entries);
  const left = Math.round(goal.kcal - t.kcal);
  const over = left < 0;
  return (
    <View style={styles.hero}>
      <Text style={type.eyebrow}>{over ? 'Over' : 'Left'}</Text>
      <View style={styles.heroNumber}>
        <RollingNumber value={Math.abs(left)} style={type.hero} />
        <Text style={styles.heroUnit}>kcal</Text>
      </View>
      <Text style={type.small}>
        {formatNumber(t.kcal)} eaten · {formatNumber(goal.kcal)} goal
      </Text>
      {layout.dayBar && (
        <View style={{ marginTop: space.lg }}>
          <DayBar kcals={entries.map((e) => e.kcal)} goal={goal.kcal} />
        </View>
      )}
      {layout.burned && <BurnedLine day={day} today={today} eaten={t.kcal} />}
    </View>
  );
}

function Tile({ label, value, unit, progress }: { label: string; value: number; unit: string; progress?: number }) {
  return (
    <View style={styles.tile}>
      <Text style={type.eyebrow}>{label}</Text>
      <Text style={styles.tileValue}>
        {formatNumber(value)}
        <Text style={type.small}> {unit}</Text>
      </Text>
      {progress !== undefined && (
        <View style={styles.tileTrack}>
          <View style={[styles.tileFill, { width: `${Math.min(1, progress) * 100}%` }]} />
        </View>
      )}
    </View>
  );
}

function EntryRow({ entry }: { entry: Entry }) {
  const db = useSQLiteContext();
  return (
    <ReanimatedSwipeable
      friction={1.6}
      rightThreshold={48}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          accessibilityLabel={`Delete ${entry.name || 'Quick Add'}`}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteEntry(db, entry.id);
          }}
          style={styles.deleteAction}
        >
          <Text style={[type.bodyStrong, { color: color.danger }]}>Delete</Text>
        </Pressable>
      )}
    >
      <Pressable
        onPress={() => router.push({ pathname: '/entry', params: { id: entry.id } })}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.cardRaised }]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={[type.bodyStrong, !entry.name && { color: color.muted }]}>
            {entry.name || 'Quick Add'}
          </Text>
          <Text style={type.small}>
            {clockTime(entry.eatenAt)}
            {entry.portion ? ` · ${entry.portion}` : ''}
            {entry.protein !== null ? ` · ${formatNumber(entry.protein)} g protein` : ''}
          </Text>
        </View>
        <Text style={styles.rowKcal}>{formatNumber(entry.kcal)}</Text>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

const shortDate = (day: DayKey) => {
  const d = startOfDay(day);
  return `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}`;
};

interface DayPageProps {
  day: DayKey;
  today: DayKey;
  goal: Goal;
  stats: readonly DayStat[];
  width: number;
  bottomInset: number;
  onSelectDay: (day: DayKey) => void;
}

/** One Day: what's left, what it was made of, then how it sits in the last few weeks. */
export function DayPage({ day, today, goal, stats, width, bottomInset, onSelectDay }: DayPageProps) {
  const entries = useQuery((db) => entriesForDay(db, day), [day]);
  const layout = useQuery(getTodayLayout, []) ?? DEFAULT_TODAY_LAYOUT;
  if (!entries) return <View style={{ width }} />;

  const t = totalsOf(entries);
  const trend = series(stats, day, TREND_DAYS);
  const thisWeek = averageLogged(trend.slice(-7));
  const lastWeek = averageLogged(trend.slice(0, 7));
  const delta = thisWeek !== null && lastWeek !== null ? Math.round(thisWeek - lastWeek) : null;
  const labels = trend.map((_, i) => {
    const d = addDays(day, i - TREND_DAYS + 1);
    const label = dayLabel(d, today);
    return label === 'Today' || label === 'Yesterday' ? label : shortDate(d);
  });

  return (
    <ScrollView style={{ width }} contentContainerStyle={[styles.page, { paddingBottom: bottomInset }]}>
      <Hero entries={entries} goal={goal} day={day} today={today} layout={layout} />

      {layout.macros && (
        <View style={styles.tiles}>
          <Tile label="Protein" value={t.protein} unit={`/ ${goal.protein} g`} progress={t.protein / goal.protein} />
          <Tile label="Carbs" value={t.carbs} unit="g" />
          <Tile label="Fat" value={t.fat} unit="g" />
        </View>
      )}

      {entries.length === 0 ? (
        <View style={[styles.card, styles.empty]}>
          <Text style={type.bodyStrong}>Nothing logged</Text>
          <Text style={type.label}>Tap + to add something.</Text>
        </View>
      ) : (
        <View style={[styles.card, styles.list]}>
          {entries.map((e, i) => (
            // No layout animations here: on Android they can leave rows invisible when this
            // page re-renders behind another screen.
            <View key={e.id}>
              {i > 0 && <View style={styles.divider} />}
              <EntryRow entry={e} />
            </View>
          ))}
        </View>
      )}

      {layout.trend && <Sparkline
        values={trend}
        labels={labels}
        goal={goal.kcal}
        title="Daily average · last 7 days"
        headline={thisWeek === null ? null : Math.round(thisWeek)}
        detail={delta === null ? 'kcal' : `kcal · ${delta >= 0 ? '+' : '−'}${formatNumber(Math.abs(delta))} vs week before`}
      />}

      {layout.weight && <WeightCard day={day} today={today} />}

      {layout.heatmap && <Heatmap stats={stats} today={today} selected={day} weeks={HEATMAP_WEEKS} onSelect={onSelectDay} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.lg, gap: space.md },
  hero: { paddingTop: space.md, paddingBottom: space.sm },
  heroNumber: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginVertical: space.xs },
  heroUnit: { ...type.small, fontSize: 15, marginBottom: 12 },
  burned: { marginTop: space.sm },
  tiles: { flexDirection: 'row', gap: space.sm },
  tile: { flex: 1, backgroundColor: color.card, borderRadius: radius.md, padding: space.md, gap: 6 },
  tileValue: { ...type.number, fontSize: 20, letterSpacing: -0.8 },
  tileTrack: { height: 4, borderRadius: 2, backgroundColor: color.track, overflow: 'hidden', marginTop: 2 },
  tileFill: { height: 4, borderRadius: 2, backgroundColor: color.text },
  card: { backgroundColor: color.card, borderRadius: radius.lg },
  list: { overflow: 'hidden' },
  empty: { padding: space.xl, alignItems: 'center', gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: 14, gap: space.md, backgroundColor: color.card },
  rowKcal: { ...type.number, fontSize: 17, fontFamily: family.monoMedium },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: color.hairline, marginLeft: space.lg },
  deleteAction: { width: 96, justifyContent: 'center', alignItems: 'center', backgroundColor: color.cardRaised },
});
