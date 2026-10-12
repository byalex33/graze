import { signatureOf, type Entry, type Relog } from './entry';

const HALF_LIFE_DAYS = 14;
const TIME_WINDOW_HOURS = 4;

function hourOfDay(epochMs: number): number {
  const d = new Date(epochMs);
  return d.getHours() + d.getMinutes() / 60;
}

/** 1 at the same clock time, falling to 0 at TIME_WINDOW_HOURS apart (wrapping midnight). */
function timeOfDayCloseness(a: number, b: number): number {
  const diff = Math.abs(a - b);
  const wrapped = Math.min(diff, 24 - diff);
  return Math.max(0, 1 - wrapped / TIME_WINDOW_HOURS);
}

/**
 * Recents, best first: things logged often, lately, and around this time of day.
 * Each Recent carries the Nutrition of its most recent Entry.
 */
export function rankRecents(entries: readonly Entry[], now: Date, limit: number): Relog[] {
  const nowHour = hourOfDay(now.getTime());
  const groups = new Map<string, { score: number; latest: Entry }>();

  for (const e of entries) {
    const signature = signatureOf(e);
    if (!signature || e.eatenAt > now.getTime()) continue;
    const ageDays = (now.getTime() - e.eatenAt) / 86_400_000;
    const recency = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
    const score = recency * (1 + 2 * timeOfDayCloseness(hourOfDay(e.eatenAt), nowHour));

    const group = groups.get(signature);
    if (!group) groups.set(signature, { score, latest: e });
    else {
      group.score += score;
      if (e.eatenAt > group.latest.eatenAt) group.latest = e;
    }
  }

  return [...groups.entries()]
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, limit)
    .map(([signature, { latest }]) => ({
      signature,
      name: latest.name ?? '',
      foodId: latest.foodId,
      portion: latest.portion,
      kcal: latest.kcal,
      protein: latest.protein,
      carbs: latest.carbs,
      fat: latest.fat,
    }));
}
