import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery } from '@/db/changes';
import { dayStatsSince } from '@/db/repo';
import { monthOf, monthsBack, monthWeeks, type Month } from '@/domain/calendar';
import { addDays, dayKeyOf, type DayKey } from '@/domain/day';
import { useAccent } from '@/ui/accent';
import { goToDay } from '@/ui/day-nav';
import { color, family, radius, space, type } from '@/ui/theme';

/** As far back as Today can swipe. */
const DAYS_BACK = 730;
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface MonthProps {
  month: Month;
  logged: ReadonlySet<DayKey>;
  today: DayKey;
  selected: DayKey | null;
  oldest: DayKey;
}

function MonthBlock({ month, logged, today, selected, oldest }: MonthProps) {
  const accent = useAccent();
  const weeks = monthWeeks(month);
  const count = weeks.flat().filter((d) => d && logged.has(d)).length;

  return (
    <View style={styles.month}>
      <View style={styles.monthHeader}>
        <Text style={type.title}>
          {MONTHS[month.month]} <Text style={{ color: color.muted }}>{month.year}</Text>
        </Text>
        <Text style={type.small}>{count === 0 ? 'nothing logged' : `${count} day${count === 1 ? '' : 's'} logged`}</Text>
      </View>
      {weeks.map((week, w) => (
        <View key={w} style={styles.week}>
          {week.map((day, d) => {
            if (!day) return <View key={d} style={styles.cell} />;
            const future = day > today;
            const tooOld = day < oldest;
            const isLogged = logged.has(day);
            const isToday = day === today;
            const isSelected = day === selected;
            const date = Number(day.slice(8));
            return (
              <Pressable
                key={d}
                disabled={future || tooOld}
                accessibilityLabel={`${date} ${MONTHS[month.month]}${isLogged ? ', logged' : ''}`}
                onPress={() => {
                  Haptics.selectionAsync();
                  goToDay(day);
                  router.back();
                }}
                style={styles.cell}
              >
                {({ pressed }) => (
                  // Never flattened, and opacity always set: on Android, a press changing whether
                  // this view gets flattened, while the sheet is closing, crashed the app.
                  <View
                    collapsable={false}
                    style={[
                      styles.dot,
                      isLogged && { backgroundColor: accent.value },
                      isToday && !isLogged && { borderWidth: 1.5, borderColor: color.muted },
                      isSelected && styles.selected,
                      { opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.date,
                        isLogged && { color: accent.on, fontFamily: family.monoSemibold },
                        (future || tooOld) && { color: color.faint },
                      ]}
                    >
                      {date}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Every Day, newest month first. Logged Days wear the accent; tap one to open it. Params: `day` (the one being viewed). */
export default function Calendar() {
  const insets = useSafeAreaInsets();
  const accent = useAccent();
  const params = useLocalSearchParams<{ day?: string }>();
  const today = dayKeyOf(new Date());
  const oldest = addDays(today, -(DAYS_BACK - 1));
  const selected = typeof params.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : null;

  const stats = useQuery((db) => dayStatsSince(db, oldest), [oldest]);
  const logged = new Set((stats ?? []).map((s) => s.day));
  // From this month back to the first month with anything in it (at least six months).
  const firstLogged = stats?.length ? stats.reduce((a, s) => (s.day < a ? s.day : a), today) : today;
  const sixMonthsAgo = monthOf(addDays(today, -183));
  const firstMonth = monthOf(firstLogged);
  const oldestMonth =
    firstMonth.year * 12 + firstMonth.month < sixMonthsAgo.year * 12 + sixMonthsAgo.month ? firstMonth : sixMonthsAgo;
  const months = monthsBack(monthOf(today), oldestMonth);

  return (
    <View style={[styles.screen, { paddingTop: Platform.OS === 'android' ? insets.top : 0 }]}>
      <View style={styles.header}>
        <View style={{ gap: 2 }}>
          <Text style={styles.title}>Calendar</Text>
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: accent.value }]} />
            <Text style={type.small}>logged · {logged.size} day{logged.size === 1 ? '' : 's'} in total</Text>
          </View>
        </View>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Text style={type.bodyStrong}>Done</Text>
        </Pressable>
      </View>
      <View style={styles.weekdays}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={[type.small, styles.weekday]}>
            {d}
          </Text>
        ))}
      </View>
      <FlatList
        data={stats ? months : []}
        keyExtractor={(m) => `${m.year}-${m.month}`}
        renderItem={({ item }) => <MonthBlock month={item} logged={logged} today={today} selected={selected} oldest={oldest} />}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + space.xxl }}
        initialNumToRender={3}
        windowSize={5}
      />
    </View>
  );
}

const CELL = 44;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: space.lg, paddingTop: space.lg },
  title: { ...type.title, fontSize: 32, letterSpacing: -1 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  weekdays: {
    flexDirection: 'row',
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.hairline,
  },
  weekday: { flex: 1, textAlign: 'center' },
  month: { paddingTop: space.xl, gap: 4 },
  monthHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: space.sm },
  week: { flexDirection: 'row' },
  cell: { flex: 1, height: CELL, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 38, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  selected: { borderWidth: 2, borderColor: color.text },
  date: { color: color.text, fontFamily: family.mono, fontSize: 15 },
});
