import type { DayKey } from './day';

/** Calories and macros. Macros are optional on a Quick Add. */
export interface Nutrition {
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

/**
 * One thing eaten. Holds its own copy of Nutrition, taken when it was
 * logged, so later changes to a Food never alter it.
 */
export interface Entry extends Nutrition {
  id: string;
  day: DayKey;
  eatenAt: number;
  /** Optional on a Quick Add. */
  name: string | null;
  /** Set when the Entry was made from a Food; null for a Quick Add. */
  foodId: string | null;
}

/** Something that can be re-logged in one tap: a Recent or a Favourite. */
export interface Relog extends Nutrition {
  signature: string;
  name: string;
  foodId: string | null;
}

export interface Goal {
  kcal: number;
  protein: number;
}

/**
 * Identifies "the same thing" across Entries, for Recents and Favourites.
 * Unnamed Quick Adds have no identity and are never offered for re-logging.
 */
export function signatureOf(e: { name: string | null; foodId: string | null }): string | null {
  if (e.foodId) return `food:${e.foodId}`;
  const name = e.name?.trim().toLowerCase();
  return name ? `quick:${name}` : null;
}

export interface DayTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function totalsOf(entries: readonly Nutrition[]): DayTotals {
  return entries.reduce<DayTotals>(
    (t, e) => ({
      kcal: t.kcal + e.kcal,
      protein: t.protein + (e.protein ?? 0),
      carbs: t.carbs + (e.carbs ?? 0),
      fat: t.fat + (e.fat ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/** "960 left" or "250 over" — a number, never a judgement. */
export function remainingLabel(eaten: number, goal: number): string {
  const diff = Math.round(goal - eaten);
  return diff >= 0 ? `${formatNumber(diff)} left` : `${formatNumber(-diff)} over`;
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-GB');
}
