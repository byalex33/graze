import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useQuery } from '@/db/changes';
import { getReminder, setReminder } from '@/db/repo';
import type { ReminderSettings } from '@/domain/reminder';
import { requestReminderPermission, sendTestReminder, syncReminders } from '@/reminder/scheduler';
import { color, radius, space, type } from './theme';
import { Toggle } from './toggle';
import { range, WheelPicker } from './wheel-picker';

const HOURS = range(0, 23, 1);
const MINUTES = [0, 15, 30, 45];
const pad = (n: number) => String(n).padStart(2, '0');

/** The one optional notification. Off until you turn it on; permission is asked only then. */
export function ReminderSection() {
  const db = useSQLiteContext();
  const saved = useQuery(getReminder, []);
  const [local, setLocal] = useState<ReminderSettings | null>(null);
  const [denied, setDenied] = useState(false);
  const [tested, setTested] = useState(false);
  const reminder = local ?? saved;
  if (!reminder) return null;

  const save = async (next: ReminderSettings) => {
    setLocal(next);
    await setReminder(db, next);
    await syncReminders(db);
  };

  const toggle = async (on: boolean) => {
    if (on && !(await requestReminderPermission())) {
      setDenied(true);
      return;
    }
    setDenied(false);
    save({ ...reminder, enabled: on });
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={type.body}>Daily reminder</Text>
          <Text style={type.small}>Only if you haven&apos;t logged anything that day</Text>
        </View>
        <Toggle value={reminder.enabled} onValueChange={toggle} label="Daily reminder" />
      </View>

      {denied && (
        <Pressable onPress={() => Linking.openSettings()} style={styles.row}>
          <Text style={[type.label, { flex: 1 }]}>Notifications are off for Graze. Turn them on in Settings.</Text>
        </Pressable>
      )}

      {reminder.enabled && (
        <Animated.View entering={FadeIn} exiting={FadeOut}>
          <View style={styles.divider} />
          <View style={styles.wheels}>
            <WheelPicker values={HOURS} value={reminder.hour} format={pad} width={72} onChange={(hour) => save({ ...reminder, hour })} />
            <Text style={[type.title, { color: color.muted }]}>:</Text>
            <WheelPicker values={MINUTES} value={reminder.minute} format={pad} width={72} onChange={(minute) => save({ ...reminder, minute })} />
          </View>
          <View style={styles.divider} />
          <Pressable
            onPress={async () => {
              await sendTestReminder();
              setTested(true);
            }}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.cardRaised }]}
          >
            <Text style={[type.body, { flex: 1 }]}>Send a test</Text>
            <Text style={type.label}>{tested ? 'Arriving in 5 seconds' : ''}</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.card, borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: space.lg, gap: space.md },
  wheels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: space.sm },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: color.hairline, marginLeft: space.lg },
});
