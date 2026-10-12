import { addDays, dayKeyOf, type DayKey } from './day';

/** How weight is shown. Stored and synced in kg either way. */
export type WeightUnit = 'kg' | 'st' | 'lb';

export const KG_PER_LB = 0.45359237;
const LB_PER_ST = 14;

export interface WeighIn {
  /** Epoch ms. */
  at: number;
  kg: number;
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  if (unit === 'kg') return `${(Math.round(kg * 10) / 10).toFixed(1)} kg`;
  const totalLb = Math.round(kg / KG_PER_LB);
  if (unit === 'lb') return `${totalLb} lb`;
  const st = Math.floor(totalLb / LB_PER_ST);
  return `${st} st ${totalLb - st * LB_PER_ST} lb`;
}

/** A change in weight, with its sign: "−0.6 kg", "+2 lb". Stones show as lb for small changes. */
export function formatWeightChange(deltaKg: number, unit: WeightUnit): string {
  const sign = deltaKg < 0 ? '−' : '+';
  const abs = Math.abs(deltaKg);
  if (unit === 'kg') return `${sign}${(Math.round(abs * 10) / 10).toFixed(1)} kg`;
  return `${sign}${Math.round(abs / KG_PER_LB)} lb`;
}

/** The parts a wheel shows: kg as whole + tenth, stones as st + lb, or whole lb. */
export function toWheel(kg: number, unit: WeightUnit): [number, number] {
  if (unit === 'kg') {
    const tenths = Math.round(kg * 10);
    return [Math.floor(tenths / 10), tenths % 10];
  }
  const totalLb = Math.round(kg / KG_PER_LB);
  if (unit === 'lb') return [totalLb, 0];
  return [Math.floor(totalLb / LB_PER_ST), totalLb % LB_PER_ST];
}

export function fromWheel(a: number, b: number, unit: WeightUnit): number {
  if (unit === 'kg') return a + b / 10;
  if (unit === 'lb') return a * KG_PER_LB;
  return (a * LB_PER_ST + b) * KG_PER_LB;
}

/** UK phones default to stones, US to pounds, everyone else to kg. */
export function defaultWeightUnit(measurementSystem: string | null | undefined): WeightUnit {
  return measurementSystem === 'uk' ? 'st' : measurementSystem === 'us' ? 'lb' : 'kg';
}

const SMOOTHING = 0.25;

/**
 * A smoothed trend, one value per Day for `length` Days ending on `end`: an exponential
 * moving average of each Day's last Weigh-in, carried across Days with none, so water
 * and salt swings don't read as gain or loss. Null before the first Weigh-in.
 */
export function weightTrend(weighIns: readonly WeighIn[], end: DayKey, length: number, lookbackDays = 60): (number | null)[] {
  const start = addDays(end, -(length - 1));
  const lastPerDay = new Map<DayKey, WeighIn>();
  for (const w of [...weighIns].sort((a, b) => a.at - b.at)) lastPerDay.set(dayKeyOf(new Date(w.at)), w);

  let trend: number | null = null;
  const out: (number | null)[] = [];
  for (let i = -lookbackDays; i < length; i++) {
    const day = addDays(start, i);
    const w = lastPerDay.get(day);
    if (w) trend = trend === null ? w.kg : trend + SMOOTHING * (w.kg - trend);
    if (i >= 0) out.push(trend === null ? null : Math.round(trend * 100) / 100);
  }
  return out;
}
