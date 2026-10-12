import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setGoal } from '@/db/repo';
import { healthStore } from '@/health/store';
import { connectHealth } from '@/health/sync';
import { DEFAULT_GOAL, GoalPicker } from '@/ui/goal-picker';
import { color, radius, space, type } from '@/ui/theme';

/** First launch: the Goal, then (optionally) the Health Store, then Today. No account, no tour. */
export default function Setup() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [goal, setLocalGoal] = useState(DEFAULT_GOAL);
  const [step, setStep] = useState<'goal' | 'health'>('goal');
  const [healthAvailable, setHealthAvailable] = useState(false);

  useEffect(() => {
    healthStore.availability().then((a) => setHealthAvailable(a === 'available')).catch(() => {});
  }, []);

  const finish = () => router.replace('/');

  const saveGoal = async () => {
    await setGoal(db, goal);
    if (healthAvailable) setStep('health');
    else finish();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.lg }]}>
      {step === 'goal' ? (
        <Animated.View key="goal" exiting={FadeOutLeft} style={styles.step}>
          <View style={{ gap: space.sm }}>
            <Text style={styles.brand}>Graze</Text>
            <Text style={[type.body, { color: color.muted }]}>How much do you want to eat each day?</Text>
          </View>
          <GoalPicker goal={goal} onChange={setLocalGoal} />
          <View style={{ gap: space.md }}>
            <Text style={[type.small, { textAlign: 'center' }]}>You can change this any time in Settings.</Text>
            <Pressable onPress={saveGoal} style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>
              <Text style={[type.bodyStrong, { color: color.bg }]}>Next</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : (
        <Animated.View key="health" entering={FadeInRight} style={styles.step}>
          <View style={{ gap: space.sm }}>
            <Text style={type.title}>{healthStore.name}</Text>
            <Text style={[type.body, { color: color.muted, lineHeight: 22 }]}>
              Connect to see what you burn next to what you eat, keep your weight in one place, and save what you log
              to {healthStore.name}. Graze never reads food from other apps.
            </Text>
          </View>
          <View />
          <View style={{ gap: space.md }}>
            <Pressable
              onPress={async () => {
                await connectHealth(db).catch(() => false);
                finish();
              }}
              style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
            >
              <Text style={[type.bodyStrong, { color: color.bg }]}>Connect {healthStore.name}</Text>
            </Pressable>
            <Pressable onPress={finish} style={styles.secondary}>
              <Text style={[type.body, { color: color.muted }]}>Not now</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg, paddingHorizontal: space.xl },
  step: { flex: 1, justifyContent: 'space-between' },
  brand: { ...type.title, fontSize: 44, letterSpacing: -1.5 },
  button: { backgroundColor: color.text, borderRadius: radius.pill, paddingVertical: space.lg, alignItems: 'center' },
  secondary: { paddingVertical: space.md, alignItems: 'center' },
});
