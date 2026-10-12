import { Platform } from 'react-native';
import {
  isHealthDataAvailable,
  queryStatisticsForQuantity,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';

/**
 * The Health Store: Apple Health on iPhone, Health Connect on Android.
 * Step 1 only proves Apple Health can be reached with this build's signing;
 * reading Burned and Weigh-ins properly, and Health Connect, come in step 3.
 */

export type HealthCheck =
  | { ok: true; activeKcalToday: number | null }
  | { ok: false; reason: string };

export async function checkAppleHealth(): Promise<HealthCheck> {
  if (Platform.OS !== 'ios') return { ok: false, reason: 'Health Connect arrives in step 3.' };
  try {
    if (!isHealthDataAvailable()) return { ok: false, reason: 'Apple Health is not available on this device.' };
    await requestAuthorization({
      toRead: [
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKQuantityTypeIdentifierBasalEnergyBurned',
        'HKQuantityTypeIdentifierBodyMass',
      ],
      toShare: [
        'HKQuantityTypeIdentifierDietaryEnergyConsumed',
        'HKQuantityTypeIdentifierDietaryProtein',
        'HKQuantityTypeIdentifierDietaryCarbohydrates',
        'HKQuantityTypeIdentifierDietaryFatTotal',
        'HKQuantityTypeIdentifierBodyMass',
      ],
    });
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const stats = await queryStatisticsForQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', ['cumulativeSum'], {
      filter: { date: { startDate: startOfToday, endDate: new Date() } },
      unit: 'kcal',
    });
    return { ok: true, activeKcalToday: stats.sumQuantity?.quantity ?? null };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}
