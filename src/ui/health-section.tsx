import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { connectHealth, disconnectHealth } from '@/health/sync';
import { healthStore, type Availability } from '@/health/store';
import { useHealthLinked } from '@/health/use-health';
import { color, radius, space, type } from './theme';

const HEALTH_CONNECT_STORE = 'market://details?id=com.google.android.apps.healthdata';

/** Connect, check, or stop syncing with the Health Store. */
export function HealthSection() {
  const db = useSQLiteContext();
  const linked = useHealthLinked();
  const [availability, setAvailability] = useState<Availability>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    healthStore.availability().then(setAvailability).catch(() => setAvailability('unavailable'));
  }, []);

  if (linked === undefined || availability === undefined) return <View style={styles.card} />;

  const connect = async () => {
    setBusy(true);
    setFailed(false);
    const ok = await connectHealth(db).catch(() => false);
    setBusy(false);
    setFailed(!ok);
    if (ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (availability === 'unavailable') {
    return (
      <View style={[styles.card, styles.row]}>
        <Text style={type.label}>{healthStore.name} isn&apos;t available on this phone.</Text>
      </View>
    );
  }

  if (availability === 'needs-install') {
    return (
      <Pressable onPress={() => Linking.openURL(HEALTH_CONNECT_STORE)} style={[styles.card, styles.row]}>
        <Text style={[type.body, { flex: 1 }]}>Install Health Connect</Text>
        <Text style={type.label}>Play Store</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      {linked ? (
        <>
          <View style={styles.row}>
            <View style={styles.dot} />
            <Text style={[type.body, { flex: 1 }]}>Connected to {healthStore.name}</Text>
          </View>
          <View style={styles.divider} />
          <Pressable onPress={() => healthStore.openSettings()} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <Text style={[type.body, { flex: 1 }]}>Manage permissions</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable onPress={() => disconnectHealth(db)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <Text style={[type.body, { flex: 1, color: color.muted }]}>Stop syncing</Text>
          </Pressable>
        </>
      ) : (
        <Pressable disabled={busy} onPress={connect} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={type.body}>Connect {healthStore.name}</Text>
            <Text style={type.small}>See what you burn, keep your weight in one place, and save what you log</Text>
          </View>
          <Text style={type.label}>{busy ? '…' : ''}</Text>
        </Pressable>
      )}
      {failed && (
        <Text style={[type.small, styles.note]}>
          {healthStore.name} didn&apos;t give access. You can allow it in Manage permissions.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.card, borderRadius: radius.md, overflow: 'hidden', minHeight: 56 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: space.lg, gap: space.md },
  pressed: { backgroundColor: color.cardRaised },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: color.hairline, marginLeft: space.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.text },
  note: { paddingHorizontal: space.lg, paddingBottom: space.md },
});
