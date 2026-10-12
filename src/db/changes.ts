import { useEffect, useState, useSyncExternalStore } from 'react';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';

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
