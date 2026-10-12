import { Linking } from 'react-native';
import {
  aggregateRecord,
  deleteRecordsByUuids,
  getSdkStatus,
  initialize,
  insertRecords,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

import { addDays, startOfDay, type DayKey } from '@/domain/day';
import type { HealthStore } from './store';

// Health Connect upserts a record with the same clientRecordId when its
// clientRecordVersion is higher, which is how edits stay in step.
const PERMISSIONS = [
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'BasalMetabolicRate' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'write', recordType: 'Weight' },
  { accessType: 'write', recordType: 'Nutrition' },
] as const;

let ready: Promise<boolean> | null = null;
const init = () => (ready ??= initialize());

const dayRange = (day: DayKey) => ({
  operator: 'between' as const,
  startTime: startOfDay(day).toISOString(),
  endTime: startOfDay(addDays(day, 1)).toISOString(),
});

const grams = (value: number | null) => (value === null ? undefined : { value, unit: 'grams' as const });

export const healthStore: HealthStore = {
  name: 'Health Connect',

  async availability() {
    const status = await getSdkStatus();
    if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return 'available';
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'needs-install';
    return 'unavailable';
  },

  async connect() {
    if (!(await init())) return false;
    const granted = await requestPermission([...PERMISSIONS]);
    return granted.some((p) => p.accessType === 'read' && p.recordType === 'ActiveCaloriesBurned');
  },

  async burned(day) {
    await init();
    const [active, basal] = await Promise.all([
      aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: dayRange(day) }),
      aggregateRecord({ recordType: 'BasalMetabolicRate', timeRangeFilter: dayRange(day) }),
    ]);
    // Health Connect estimates basal energy even with no data behind it; only trust it
    // when some app actually recorded a basal rate.
    const restingKnown = basal.dataOrigins.length > 0;
    if (active.dataOrigins.length === 0 && !restingKnown) return null;
    return {
      active: Math.round(active.ACTIVE_CALORIES_TOTAL.inKilocalories),
      resting: restingKnown ? Math.round(basal.BASAL_CALORIES_TOTAL.inKilocalories) : null,
    };
  },

  async weighIns(sinceMs) {
    await init();
    const { records } = await readRecords('Weight', {
      timeRangeFilter: { operator: 'after', startTime: new Date(sinceMs).toISOString() },
    });
    return records.map((r) => ({ at: new Date(r.time).getTime(), kg: r.weight.inKilograms }));
  },

  async saveWeighIn(w, id) {
    await init();
    await insertRecords([
      {
        recordType: 'Weight',
        time: new Date(w.at).toISOString(),
        weight: { value: w.kg, unit: 'kilograms' },
        metadata: { clientRecordId: id, clientRecordVersion: 1 },
      },
    ]);
  },

  async deleteWeighIn(id) {
    await init();
    await deleteRecordsByUuids('Weight', [], [id]);
  },

  async saveEntry(entry, version) {
    await init();
    const at = new Date(entry.eatenAt);
    await insertRecords([
      {
        recordType: 'Nutrition',
        startTime: at.toISOString(),
        endTime: new Date(at.getTime() + 60_000).toISOString(),
        name: entry.name ?? undefined,
        mealType: 0,
        energy: { value: entry.kcal, unit: 'kilocalories' },
        protein: grams(entry.protein),
        totalCarbohydrate: grams(entry.carbs),
        totalFat: grams(entry.fat),
        metadata: { clientRecordId: entry.id, clientRecordVersion: version },
      },
    ]);
  },

  async deleteEntry(id) {
    await init();
    await deleteRecordsByUuids('Nutrition', [], [id]);
  },

  openSettings() {
    try {
      openHealthConnectSettings();
    } catch {
      Linking.openSettings();
    }
  },
};
