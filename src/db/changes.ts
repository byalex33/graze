import { useEffect, useState, useSyncExternalStore } from 'react';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';

import type { Entry } from '@/domain/entry';
import type { WeighIn } from '@/domain/weight';

/**
 * Every write bumps a version; every useQuery re-runs when it changes.
 * The data is small enough that re-reading is cheaper than tracking what changed.
 */
let version = 0;
const listeners = new Set<() => void>();

export function notifyChanged(): void {
  version++;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDataVersion(): number {
  return useSyncExternalStore(subscribe, () => version);
}

/** Runs `query` now and after every write. `deps` are the query's own inputs. */
export function useQuery<T>(
  query: (db: SQLiteDatabase) => Promise<T>,
  deps: readonly unknown[],
): T | undefined {
  const db = useSQLiteContext();
  const dataVersion = useDataVersion();
  const [result, setResult] = useState<T>();

  useEffect(() => {
    let cancelled = false;
    query(db).then((value) => {
      if (!cancelled) setResult(value);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, dataVersion, ...deps]);

  return result;
}

/** Fired once a day, when today becomes a Logged Day. */
const firstOfDayListeners = new Set<() => void>();

export function emitFirstOfDay(): void {
  firstOfDayListeners.forEach((l) => l());
}

export function onFirstOfDay(listener: () => void): () => void {
  firstOfDayListeners.add(listener);
  return () => firstOfDayListeners.delete(listener);
}

/** Every Entry and Weigh-in write, so the Health Store can mirror it. */
export type WriteEvent =
  | { kind: 'entry-saved'; entry: Entry; version: number }
  | { kind: 'entry-deleted'; id: string }
  | { kind: 'weigh-in-saved'; id: string; weighIn: WeighIn }
  | { kind: 'weigh-in-deleted'; id: string };

const writeListeners = new Set<(e: WriteEvent) => void>();

export function emitWrite(event: WriteEvent): void {
  writeListeners.forEach((l) => l(event));
}

export function onWrite(listener: (e: WriteEvent) => void): () => void {
  writeListeners.add(listener);
  return () => writeListeners.delete(listener);
}
