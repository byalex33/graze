import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setGoal } from '@/db/repo';
import { DEFAULT_GOAL, GoalPicker } from '@/ui/goal-picker';
import { color, radius, space, type } from '@/ui/theme';

/** First launch: set the Goal, then straight into Today. No account, no tour. */
export default function Setup() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [goal, setLocalGoal] = useState(DEFAULT_GOAL);

  const start = async () => {
    await setGoal(db, goal);
    router.replace('/');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.lg }]}>
      <View style={{ gap: space.sm }}>
        <Text style={type.hero}>Graze</Text>
        <Text style={[type.body, { color: color.muted }]}>How much do you want to eat each day?</Text>
      </View>
      <GoalPicker goal={goal} onChange={setLocalGoal} />
      <View style={{ gap: space.md }}>
        <Text style={[type.small, { textAlign: 'center' }]}>You can change this any time in Settings.</Text>
        <Pressable onPress={start} style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>
          <Text style={[type.bodyStrong, { color: color.bg }]}>Start</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg, paddingHorizontal: space.xl, justifyContent: 'space-between' },
  button: {
    backgroundColor: color.text,
    borderRadius: radius.pill,
    paddingVertical: space.lg,
    alignItems: 'center',
  },
});
