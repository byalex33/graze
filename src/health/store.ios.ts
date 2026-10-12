import {
  ComparisonPredicateOperator,
  deleteObjects,
  isHealthDataAvailable,
  queryQuantitySamples,
  queryStatisticsForQuantity,
  requestAuthorization,
  saveQuantitySample,
} from '@kingstinct/react-native-healthkit';
import { Linking } from 'react-native';

import { startOfDay, addDays, type DayKey } from '@/domain/day';
import type { Entry } from '@/domain/entry';
import type { HealthStore } from './store';

// HealthKit replaces a sample when one with the same sync identifier and a higher
// sync version is saved, which is how edits stay in step without duplicates.
const SYNC_ID = 'HKMetadataKeySyncIdentifier';
const SYNC_VERSION = 'HKMetadataKeySyncVersion';
const FOOD_TYPE = 'HKFoodType';

const NUTRIENTS = [
  ['HKQuantityTypeIdentifierDietaryEnergyConsumed', 'kcal', (e: Entry) => e.kcal],
  ['HKQuantityTypeIdentifierDietaryProtein', 'g', (e: Entry) => e.protein],
  ['HKQuantityTypeIdentifierDietaryCarbohydrates', 'g', (e: Entry) => e.carbs],
  ['HKQuantityTypeIdentifierDietaryFatTotal', 'g', (e: Entry) => e.fat],
] as const;

const WEIGHT = 'HKQuantityTypeIdentifierBodyMass';

const bySyncId = (id: string) => ({
  metadata: { withMetadataKey: SYNC_ID, operatorType: ComparisonPredicateOperator.equalTo, value: id },
});

async function sumKcal(
  identifier: 'HKQuantityTypeIdentifierActiveEnergyBurned' | 'HKQuantityTypeIdentifierBasalEnergyBurned',
  day: DayKey,
): Promise<number | null> {
  const stats = await queryStatisticsForQuantity(identifier, ['cumulativeSum'], {
    filter: { date: { startDate: startOfDay(day), endDate: startOfDay(addDays(day, 1)) } },
    unit: 'kcal',
  });
  return stats.sumQuantity?.quantity ?? null;
}

export const healthStore: HealthStore = {
  name: 'Apple Health',

  availability: async () => (isHealthDataAvailable() ? 'available' : 'unavailable'),

  async connect() {
    await requestAuthorization({
      toRead: [
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKQuantityTypeIdentifierBasalEnergyBurned',
        WEIGHT,
      ],
      toShare: [...NUTRIENTS.map(([id]) => id), WEIGHT],
    });
    // iOS never says whether reading was allowed; a denied read just returns nothing.
    return true;
  },

  async burned(day) {
    const [active, resting] = await Promise.all([
      sumKcal('HKQuantityTypeIdentifierActiveEnergyBurned', day),
      sumKcal('HKQuantityTypeIdentifierBasalEnergyBurned', day),
    ]);
    if (active === null && resting === null) return null;
    return { active: Math.round(active ?? 0), resting: resting === null ? null : Math.round(resting) };
  },

  async weighIns(sinceMs) {
    const samples = await queryQuantitySamples(WEIGHT, {
      limit: 0,
      unit: 'kg',
      filter: { date: { startDate: new Date(sinceMs) } },
    });
    return samples.map((s) => ({ at: s.startDate.getTime(), kg: s.quantity }));
  },

  async saveWeighIn(w, id) {
    const at = new Date(w.at);
    await saveQuantitySample(WEIGHT, 'kg', w.kg, at, at, { [SYNC_ID]: id, [SYNC_VERSION]: 1 });
  },

  async deleteWeighIn(id) {
    await deleteObjects(WEIGHT, bySyncId(id));
  },

  async saveEntry(entry, version) {
    const at = new Date(entry.eatenAt);
    const metadata = { [SYNC_ID]: entry.id, [SYNC_VERSION]: version, ...(entry.name ? { [FOOD_TYPE]: entry.name } : {}) };
    for (const [identifier, unit, read] of NUTRIENTS) {
      const value = read(entry);
      if (value === null) {
        await deleteObjects(identifier, bySyncId(entry.id));
      } else {
        await saveQuantitySample(identifier, unit, value, at, at, metadata);
      }
    }
  },

  async deleteEntry(id) {
    for (const [identifier] of NUTRIENTS) await deleteObjects(identifier, bySyncId(id));
  },

  openSettings() {
    Linking.openURL('x-apple-health://').catch(() => Linking.openSettings());
  },
};
