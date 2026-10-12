import type { SQLiteDatabase } from 'expo-sqlite';

import { onWrite, type WriteEvent } from '@/db/changes';
import { entriesForMirroring, isHealthLinked, setHealthLinked, weighInsSince } from '@/db/repo';
import { addDays, dayKeyOf } from '@/domain/day';
import { healthStore } from './store';

/** How far back to copy existing Entries when the Health Store is first connected. */
const BACKFILL_DAYS = 7;

async function mirror(db: SQLiteDatabase, event: WriteEvent): Promise<void> {
  if (!(await isHealthLinked(db))) return;
  switch (event.kind) {
    case 'entry-saved':
      return healthStore.saveEntry(event.entry, event.version);
    case 'entry-deleted':
      return healthStore.deleteEntry(event.id);
    case 'weigh-in-saved':
      return healthStore.saveWeighIn(event.weighIn, event.id);
    case 'weigh-in-deleted':
      return healthStore.deleteWeighIn(event.id);
  }
}

/**
 * Mirrors Graze's own writes into the Health Store while it's connected.
 * Failures don't block logging: Graze's copy is the one that matters.
 */
export function startHealthSync(db: SQLiteDatabase): () => void {
  return onWrite((event) => {
    mirror(db, event).catch((e) => console.warn('Health sync failed', event.kind, e));
  });
}

/** Asks for access, remembers the choice, and copies the last week across. */
export async function connectHealth(db: SQLiteDatabase): Promise<boolean> {
  const ok = await healthStore.connect();
  if (!ok) return false;
  await setHealthLinked(db, true);
  const from = addDays(dayKeyOf(new Date()), -BACKFILL_DAYS);
  const [entries, weighIns] = await Promise.all([
    entriesForMirroring(db, from),
    weighInsSince(db, Date.now() - BACKFILL_DAYS * 86_400_000),
  ]);
  for (const { entry, version } of entries) await healthStore.saveEntry(entry, version).catch(() => {});
  for (const w of weighIns) await healthStore.saveWeighIn(w, w.id).catch(() => {});
  return true;
}

export async function disconnectHealth(db: SQLiteDatabase): Promise<void> {
  await setHealthLinked(db, false);
}
