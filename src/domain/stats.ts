import { addDays, daysBetween, startOfDay, type DayKey } from './day';

export interface DayStat {
  day: DayKey;
  kcal: number;
  entries: number;
}

/** Eaten per Day for the `length` Days ending on `end`, oldest first. Null where the Day isn't a Logged Day. */
export function series(stats: readonly DayStat[], end: DayKey, length: number): (number | null)[] {
  const byDay = new Map(stats.map((s) => [s.day, s.kcal]));
  return Array.from({ length }, (_, i) => byDay.get(addDays(end, i - length + 1)) ?? null);
}

/** Mean of the non-null values, or null if there are none. Days with nothing logged don't drag it down. */
export function averageLogged(values: readonly (number | null)[]): number | null {
  const logged = values.filter((v): v is number => v !== null);
  return logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : null;
}

/**
 * The heatmap grid: `weeks` columns of seven Days, Monday at the top, ending with the
 * week that contains `today`. Days after `today` are null.
 */
export function heatmapWeeks(today: DayKey, weeks: number): (DayKey | null)[][] {
  const mondayOffset = (startOfDay(today).getDay() + 6) % 7;
  const firstMonday = addDays(today, -mondayOffset - (weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = addDays(firstMonday, w * 7 + d);
      return daysBetween(day, today) >= 0 ? day : null;
    }),
  );
}

/** 0 for a Day with nothing logged, then 1–4 by how many Entries it has. */
export function heatLevel(entries: number): 0 | 1 | 2 | 3 | 4 {
  if (entries <= 0) return 0;
  if (entries === 1) return 1;
  if (entries <= 3) return 2;
  if (entries <= 5) return 3;
  return 4;
}
