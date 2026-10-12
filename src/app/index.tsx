import { BlurTargetView } from 'expo-blur';
import { Redirect, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { onFirstOfDay, useDataVersion, useQuery } from '@/db/changes';
import { addEntry, dayStatsSince, entriesSince, getGoal } from '@/db/repo';
import { addDays, dayLabel, daysBetween, eatenAtFor, startOfDay, type DayKey } from '@/domain/day';
import type { Relog } from '@/domain/entry';
import { rankRecents } from '@/domain/recents';
import { syncReminders } from '@/reminder/scheduler';
import { AccentToast } from '@/ui/accent-toast';
import { Celebration } from '@/ui/celebration';
import { DayPage, HEATMAP_WEEKS } from '@/ui/day-page';
import { Dock } from '@/ui/dock';
import { clearGoToDay, onGoToDay } from '@/ui/day-nav';
import { CalendarIcon, GearIcon } from '@/ui/icons';
import { color, space, type } from '@/ui/theme';
import { useToday } from '@/ui/use-today';

const DAYS_BACK = 730;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (day: DayKey) => {
  const d = startOfDay(day);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
const RECENTS_WINDOW_MS = 60 * 86_400_000;

export default function Today() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const today = useToday();
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList<DayKey>>(null);
  const blurTarget = useRef<View>(null);

  const goal = useQuery(getGoal, []);
  const dataVersion = useDataVersion();

  // Re-plan the Reminder whenever anything is logged and when the Day rolls over,
  // so today's is cancelled once today is a Logged Day.
  useEffect(() => {
    syncReminders(db).catch(() => {});
  }, [db, dataVersion, today]);

  // Wait for whichever sheet you logged from to slide away, then celebrate.
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = onFirstOfDay(() => {
      timer = setTimeout(() => setCelebrating(true), 450);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, []);
  const recentEntries = useQuery((d) => entriesSince(d, Date.now() - RECENTS_WINDOW_MS), [today]);
  // Enough history for the heatmap plus the sparkline on the oldest heatmap Day.
  const stats = useQuery((d) => dayStatsSince(d, addDays(today, -(HEATMAP_WEEKS * 7 + 14))), [today]);
  const recents = useMemo(() => (recentEntries ? rankRecents(recentEntries, new Date(), 3) : []), [recentEntries]);

  // Index 0 is today; the list is inverted so older Days are to the left.
  const days = useMemo(() => Array.from({ length: DAYS_BACK }, (_, i) => addDays(today, -i)), [today]);
  const viewedDay = days[index] ?? today;

  // The calendar sends us to a Day. Jump without animating; it may be months away.
  useEffect(
    () =>
      onGoToDay((day) => {
        clearGoToDay();
        const i = daysBetween(day, today);
        if (i < 0 || i >= DAYS_BACK) return;
        setIndex(i);
        requestAnimationFrame(() => list.current?.scrollToIndex({ index: i, animated: false }));
      }),
    [today],
  );

  if (goal === null) return <Redirect href="/setup" />;
  if (!goal || !stats) return <View style={styles.screen} />;

  const jumpTo = (day: DayKey) => {
    const i = daysBetween(day, today);
    if (i >= 0 && i < days.length) {
      list.current?.scrollToIndex({ index: i, animated: Math.abs(i - index) <= 3 });
      setIndex(i);
    }
  };

  const relog = (r: Relog) =>
    addEntry(db, {
      day: viewedDay,
      eatenAt: eatenAtFor(viewedDay).getTime(),
      name: r.name,
      foodId: r.foodId,
      portion: r.portion,
      kcal: r.kcal,
      protein: r.protein,
      carbs: r.carbs,
      fat: r.fat,
    });

  return (
    <View style={styles.screen}>
      <BlurTargetView ref={blurTarget} style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
          <View style={styles.headerLeft}>
            <Pressable
              accessibilityLabel="Calendar"
              hitSlop={10}
              onPress={() => router.push({ pathname: '/calendar', params: { day: viewedDay } })}
              style={({ pressed }) => [styles.calendarButton, pressed && { opacity: 0.6 }]}
            >
              <CalendarIcon />
            </Pressable>
            <Pressable disabled={index === 0} onPress={() => jumpTo(today)} hitSlop={12}>
              <Text style={type.title}>{dayLabel(viewedDay, today)}</Text>
              <Text style={type.small}>{index === 0 ? longDate(viewedDay) : 'Tap for today'}</Text>
            </Pressable>
          </View>
          <Pressable accessibilityLabel="Settings" hitSlop={12} onPress={() => router.push('/settings')}>
            <GearIcon />
          </Pressable>
        </View>
        <FlatList
          ref={list}
          data={days}
          keyExtractor={(d) => d}
          horizontal
          inverted
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialNumToRender={2}
          windowSize={3}
          maxToRenderPerBatch={2}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <DayPage
              day={item}
              today={today}
              goal={goal}
              stats={stats}
              width={width}
              bottomInset={insets.bottom + 120}
              onSelectDay={jumpTo}
            />
          )}
        />
      </BlurTargetView>
      <Dock
        recents={recents}
        onRelog={relog}
        onQuickAdd={() => router.push({ pathname: '/entry', params: { day: viewedDay } })}
        onSearch={() => router.push({ pathname: '/search', params: { day: viewedDay } })}
        onScan={() => router.push({ pathname: '/scan', params: { day: viewedDay } })}
        onWeighIn={() => router.push('/weigh-in')}
      />
      <AccentToast offset={76} />
      {celebrating && <Celebration onDone={() => setCelebrating(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  calendarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
});
