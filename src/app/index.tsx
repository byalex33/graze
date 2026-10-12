import { BlurTargetView } from 'expo-blur';
import { Redirect, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery } from '@/db/changes';
import { addEntry, entriesSince, getGoal } from '@/db/repo';
import { addDays, dayLabel, eatenAtFor, type DayKey } from '@/domain/day';
import type { Relog } from '@/domain/entry';
import { rankRecents } from '@/domain/recents';
import { DayPage } from '@/ui/day-page';
import { FabMenu } from '@/ui/fab-menu';
import { GearIcon } from '@/ui/icons';
import { color, space, type } from '@/ui/theme';
import { useToday } from '@/ui/use-today';

const DAYS_BACK = 730;
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
  const recentEntries = useQuery((d) => entriesSince(d, Date.now() - RECENTS_WINDOW_MS), [today]);
  const recents = useMemo(() => (recentEntries ? rankRecents(recentEntries, new Date(), 3) : []), [recentEntries]);

  // Index 0 is today; the list is inverted so older Days are to the left.
  const days = useMemo(() => Array.from({ length: DAYS_BACK }, (_, i) => addDays(today, -i)), [today]);
  const viewedDay = days[index] ?? today;

  if (goal === null) return <Redirect href="/setup" />;
  if (!goal) return <View style={styles.screen} />;

  const relog = (r: Relog) =>
    addEntry(db, {
      day: viewedDay,
      eatenAt: eatenAtFor(viewedDay).getTime(),
      name: r.name,
      foodId: r.foodId,
      kcal: r.kcal,
      protein: r.protein,
      carbs: r.carbs,
      fat: r.fat,
    });

  return (
    <View style={styles.screen}>
      <BlurTargetView ref={blurTarget} style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
          <Pressable
            disabled={index === 0}
            onPress={() => list.current?.scrollToIndex({ index: 0, animated: true })}
            hitSlop={12}
          >
            <Text style={type.title}>{dayLabel(viewedDay, today)}</Text>
            {index !== 0 && <Text style={type.small}>Tap for today</Text>}
          </Pressable>
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
            <DayPage day={item} goal={goal} width={width} bottomInset={insets.bottom + 120} />
          )}
        />
      </BlurTargetView>
      <FabMenu
        recents={recents}
        onRelog={relog}
        onQuickAdd={() => router.push({ pathname: '/entry', params: { day: viewedDay } })}
        blurTarget={blurTarget}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
});
