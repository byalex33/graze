import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery } from '@/db/changes';
import { addWeighIn, deleteWeighIn, getWeightUnit, setWeightUnit, weighInsSince } from '@/db/repo';
import { clockTime, dayKeyOf, dayLabel } from '@/domain/day';
import { formatWeight, fromWheel, toWheel, type WeightUnit } from '@/domain/weight';
import { useHealthLinked } from '@/health/use-health';
import { healthStore } from '@/health/store';
import { color, radius, space, type } from '@/ui/theme';
import { range, WheelPicker } from '@/ui/wheel-picker';

const UNITS: { unit: WeightUnit; label: string }[] = [
  { unit: 'st', label: 'st & lb' },
  { unit: 'kg', label: 'kg' },
  { unit: 'lb', label: 'lb' },
];

const WHEELS: Record<WeightUnit, [number[], number[] | null, string, string]> = {
  kg: [range(30, 250, 1), range(0, 9, 1), '.', 'kg'],
  st: [range(4, 40, 1), range(0, 13, 1), 'st', 'lb'],
  lb: [range(60, 550, 1), null, '', 'lb'],
};

const DEFAULT_KG = 75;

/** One body-weight measurement, saved in Graze and, when connected, the Health Store. */
export default function WeighInScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const savedUnit = useQuery(getWeightUnit, []);
  const last = useQuery((d) => weighInsSince(d, 0), []);
  const linked = useHealthLinked();
  const [unit, setUnit] = useState<WeightUnit | null>(null);
  const [kg, setKg] = useState<number | null>(null);

  const shownUnit = unit ?? savedUnit;
  const lastKg = last?.length ? last[last.length - 1].kg : DEFAULT_KG;
  const shownKg = kg ?? lastKg;
  if (!shownUnit || !last) return <View style={styles.screen} />;

  const [majors, minors, sep, minorUnit] = WHEELS[shownUnit];
  const [major, minor] = toWheel(shownKg, shownUnit);

  const save = async () => {
    await addWeighIn(db, { at: Date.now(), kg: Math.round(shownKg * 100) / 100 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const switchUnit = (u: WeightUnit) => {
    Haptics.selectionAsync();
    setUnit(u);
    setWeightUnit(db, u);
  };

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + space.lg }]}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Text style={[type.body, { color: color.muted }]}>Cancel</Text>
        </Pressable>
        <Text style={type.bodyStrong}>Weigh-in</Text>
        <View style={{ width: 52 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.segmented}>
          {UNITS.map(({ unit: u, label }) => (
            <Pressable key={u} onPress={() => switchUnit(u)} style={[styles.segment, shownUnit === u && styles.segmentOn]}>
              <Text style={[type.bodyStrong, { color: shownUnit === u ? color.bg : color.muted }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.wheels} key={shownUnit}>
          <WheelPicker
            values={majors}
            value={major}
            width={96}
            onChange={(a) => setKg(fromWheel(a, minors ? minor : 0, shownUnit))}
          />
          {minors && (
            <>
              <Text style={[type.title, { color: color.muted }]}>{sep}</Text>
              <WheelPicker values={minors} value={minor} width={72} onChange={(b) => setKg(fromWheel(major, b, shownUnit))} />
            </>
          )}
          <Text style={[type.label, { marginLeft: space.xs }]}>{minorUnit}</Text>
        </View>

        <Text style={[type.small, { textAlign: 'center' }]}>
          {last.length ? `Last: ${formatWeight(lastKg, shownUnit)}` : 'Your first weigh-in'}
          {linked ? ` · saved to ${healthStore.name} too` : ''}
        </Text>

        {last.length > 0 && (
          <View style={styles.history}>
            {[...last].reverse().slice(0, 5).map((w) => (
              <View key={w.id} style={styles.historyRow}>
                <Text style={[type.small, { flex: 1 }]}>
                  {dayLabel(dayKeyOf(new Date(w.at)))} · {clockTime(w.at)}
                </Text>
                <Text style={type.number}>{formatWeight(w.kg, shownUnit)}</Text>
                <Pressable
                  hitSlop={8}
                  accessibilityLabel="Delete weigh-in"
                  onPress={() =>
                    Alert.alert('Delete this weigh-in?', undefined, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteWeighIn(db, w.id) },
                    ])
                  }
                >
                  <Text style={[type.small, { color: color.danger }]}>Delete</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      <Pressable onPress={save} style={({ pressed }) => [styles.save, pressed && { opacity: 0.85 }]}>
        <Text style={[type.bodyStrong, { color: color.bg }]}>Save {formatWeight(shownKg, shownUnit)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: space.lg, gap: space.xl },
  segmented: { flexDirection: 'row', backgroundColor: color.card, borderRadius: radius.pill, padding: 4 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: space.sm, borderRadius: radius.pill },
  segmentOn: { backgroundColor: color.text },
  wheels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs },
  history: { backgroundColor: color.card, borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: space.sm },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  save: { marginHorizontal: space.lg, backgroundColor: color.text, borderRadius: radius.pill, paddingVertical: space.lg, alignItems: 'center' },
});
