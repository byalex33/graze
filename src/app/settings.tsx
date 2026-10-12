import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery } from '@/db/changes';
import { allEntries, deleteAllData, getGoal, setGoal } from '@/db/repo';
import { entriesToCsv } from '@/domain/csv';
import { dayKeyOf } from '@/domain/day';
import type { Goal } from '@/domain/entry';
import { GoalPicker } from '@/ui/goal-picker';
import { ChevronIcon } from '@/ui/icons';
import { HealthSection } from '@/ui/health-section';
import { ReminderSection } from '@/ui/reminder-section';
import { TodayLayoutSection } from '@/ui/today-layout-section';
import { color, radius, space, type } from '@/ui/theme';

function Row({ label, detail, onPress, danger }: { label: string; detail?: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.cardRaised }]}>
      <Text style={[type.body, { flex: 1 }, danger && { color: color.danger }]}>{label}</Text>
      {detail && <Text style={type.label}>{detail}</Text>}
    </Pressable>
  );
}

export default function Settings() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const savedGoal = useQuery(getGoal, []);
  const [goal, setLocalGoal] = useState<Goal | null>(null);

  // Local copy so the wheels don't jump while the save round-trips.
  const shownGoal = goal ?? savedGoal;

  const changeGoal = (g: Goal) => {
    setLocalGoal(g);
    setGoal(db, g);
  };

  const exportCsv = async () => {
    const file = new File(Paths.cache, `graze-${dayKeyOf(new Date())}.csv`);
    if (file.exists) file.delete();
    file.create();
    file.write(entriesToCsv(await allEntries(db)));
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export Graze data', UTI: 'public.comma-separated-values-text' });
  };

  const confirmDeleteAll = () =>
    Alert.alert(
      'Delete all data?',
      'Every entry, favourite, weigh-in and your goal are removed from this phone. Anything already in Apple Health or Health Connect stays there.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            await deleteAllData(db);
            router.dismissAll();
            router.replace('/setup');
          },
        },
      ],
    );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.body, { paddingTop: Platform.OS === 'android' ? insets.top + space.lg : space.lg, paddingBottom: insets.bottom + space.xxl }]}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ChevronIcon direction="left" tint={color.text} />
        </Pressable>
        <Text style={type.title}>Settings</Text>
        <View style={{ width: 18 }} />
      </View>

      <Text style={[type.label, styles.section]}>Daily goal</Text>
      <View style={[styles.card, { paddingVertical: space.lg }]}>{shownGoal && <GoalPicker goal={shownGoal} onChange={changeGoal} />}</View>

      <Text style={[type.label, styles.section]}>Today screen</Text>
      <TodayLayoutSection />

      <Text style={[type.label, styles.section]}>Reminder</Text>
      <ReminderSection />

      <Text style={[type.label, styles.section]}>{Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'}</Text>
      <HealthSection />

      <Text style={[type.label, styles.section]}>Your data</Text>
      <View style={styles.card}>
        <Row label="Export as CSV" onPress={exportCsv} />
        <View style={styles.divider} />
        <Row label="Delete all data" danger onPress={confirmDeleteAll} />
      </View>
      <Text style={[type.small, styles.note]}>Graze keeps everything on this phone. Deleting the app deletes your data, so export first.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  body: { paddingHorizontal: space.lg, gap: space.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md },
  section: { marginTop: space.lg, marginLeft: space.sm },
  card: { backgroundColor: color.card, borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: space.lg, gap: space.md },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: color.hairline, marginLeft: space.lg },
  note: { marginHorizontal: space.sm },
});
