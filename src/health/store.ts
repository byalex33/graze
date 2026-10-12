import type { DayKey } from '@/domain/day';
import type { Entry } from '@/domain/entry';
import type { WeighIn } from '@/domain/weight';

/** Active and resting energy for a Day. Resting is null when nothing recorded it. */
export interface Burned {
  active: number;
  resting: number | null;
}

export type Availability = 'available' | 'unavailable' | 'needs-install';

/**
 * The phone's Health Store. Apple Health on iPhone (store.ios.ts), Health Connect on
 * Android (store.android.ts). Graze reads energy burned and Weigh-ins, and writes its
 * own Entries and Weigh-ins. It never reads other apps' food.
 */
export interface HealthStore {
  readonly name: string;
  availability(): Promise<Availability>;
  /** Shows the system permission sheet. True if Graze may now read energy. */
  connect(): Promise<boolean>;
  burned(day: DayKey): Promise<Burned | null>;
  weighIns(sinceMs: number): Promise<WeighIn[]>;
  saveWeighIn(w: WeighIn, id: string): Promise<void>;
  deleteWeighIn(id: string): Promise<void>;
  /** Saves or replaces the Entry's copy; a higher `version` wins. */
  saveEntry(entry: Entry, version: number): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  /** Where people manage what Graze can see. */
  openSettings(): void;
}

/** Platforms without a Health Store (web, tests). */
export const healthStore: HealthStore = {
  name: 'Health',
  availability: async () => 'unavailable',
  connect: async () => false,
  burned: async () => null,
  weighIns: async () => [],
  saveWeighIn: async () => {},
  deleteWeighIn: async () => {},
  saveEntry: async () => {},
  deleteEntry: async () => {},
  openSettings: () => {},
};
