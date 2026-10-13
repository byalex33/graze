import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useQuery } from '@/db/changes';
import { getGoal, setGoal } from '@/db/repo';
import type { Goal } from '@/domain/entry';
import { GoalPicker } from '@/ui/goal-picker';
import { SettingsPage } from '@/ui/settings-kit';
import { color, radius, space } from '@/ui/theme';

export default function GoalSettings() {
  const db = useSQLiteContext();
  const saved = useQuery(getGoal, []);
  // Local copy so the wheels don't jump while the save round-trips.
  const [local, setLocal] = useState<Goal | null>(null);
  const goal = local ?? saved;

  return (
    <SettingsPage title="Daily goal" intro="How much you want to eat each day. Burned calories never change it.">
      <View style={styles.card}>
        {goal && (
          <GoalPicker
            goal={goal}
            onChange={(g) => {
              setLocal(g);
              setGoal(db, g).catch((e) => console.warn('Saving the Goal failed', e));
            }}
          />
        )}
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.card, borderRadius: radius.md, paddingVertical: space.lg, minHeight: 260 },
});
