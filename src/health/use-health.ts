import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useDataVersion, useQuery } from '@/db/changes';
import { isHealthLinked, weighInsSince } from '@/db/repo';
import { dayKeyOf, daysBetween, type DayKey } from '@/domain/day';
import type { WeighIn } from '@/domain/weight';
import { healthStore, type Burned } from './store';

/**
 * Health Store sources (watches, Health Connect apps) can sync hours late, so a Day is
 * only settled once it's this many Days old. Until then it re-reads on resume, like today.
 */
const SETTLED_AFTER_DAYS = 3;

/** Burned for settled Days. Only real readings: failures and empty reads are re-tried. */
const burnedCache = new Map<DayKey, Burned>();

export function useHealthLinked(): boolean | undefined {
  return useQuery(isHealthLinked, []);
}

/** Burned for a Day, or null when not connected or nothing was recorded. Recent Days refresh on resume. */
export function useBurned(day: DayKey): Burned | null | undefined {
  const linked = useHealthLinked();
  const [burned, setBurned] = useState<{ day: DayKey; value: Burned | null }>();
  const [resumes, setResumes] = useState(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setResumes((n) => n + 1));
    return () => sub.remove();
  }, []);

  const settled = daysBetween(day, dayKeyOf(new Date())) >= SETTLED_AFTER_DAYS;
  const cached = settled ? burnedCache.get(day) : undefined;

  useEffect(() => {
    if (!linked || cached) return;
    let cancelled = false;
    healthStore.burned(day).then(
      (value) => {
        if (settled && value) burnedCache.set(day, value);
        if (!cancelled) setBurned({ day, value });
      },
      (e) => {
        console.warn('Reading Burned failed', day, e);
        // Keep what this Day last showed rather than blanking it.
        if (!cancelled) setBurned((b) => (b?.day === day ? b : { day, value: null }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [linked, day, settled, cached, resumes]);

  if (linked === undefined) return undefined;
  if (!linked) return null;
  if (cached) return cached;
  return burned?.day === day ? burned.value : undefined;
}

const near = (a: WeighIn, b: WeighIn) => Math.abs(a.at - b.at) < 120_000 && Math.abs(a.kg - b.kg) < 0.05;

/**
 * Weigh-ins from Graze and, when connected, the Health Store (scales, other apps).
 * Graze's own copies come back from Health too, so near-identical pairs count once.
 */
export function useWeighIns(sinceMs: number): WeighIn[] | undefined {
  const linked = useHealthLinked();
  const local = useQuery((db) => weighInsSince(db, sinceMs), [sinceMs]);
  const version = useDataVersion();
  const [fromHealth, setFromHealth] = useState<WeighIn[]>([]);

  useEffect(() => {
    if (!linked) return;
    let cancelled = false;
    healthStore
      .weighIns(sinceMs)
      .catch(() => [])
      .then((w) => !cancelled && setFromHealth(w));
    return () => {
      cancelled = true;
    };
  }, [linked, sinceMs, version]);

  if (!local) return undefined;
  const merged: WeighIn[] = local.map(({ at, kg }) => ({ at, kg }));
  for (const h of linked ? fromHealth : []) if (!merged.some((m) => near(m, h))) merged.push(h);
  return merged.sort((a, b) => a.at - b.at);
}
