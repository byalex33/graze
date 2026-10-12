/**
 * A Day is identified by its local calendar date, "YYYY-MM-DD".
 * An Entry's Day is fixed when it is logged, using the phone's local time
 * at that moment, so travelling later never moves it.
 */
export type DayKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function dayKeyOf(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight at the start of the Day. */
export function startOfDay(day: DayKey): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(day: DayKey, n: number): DayKey {
  const date = startOfDay(day);
  date.setDate(date.getDate() + n);
  return dayKeyOf(date);
}

/** Whole Days from `a` to `b` (positive when b is later). DST-safe. */
export function daysBetween(a: DayKey, b: DayKey): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/**
 * The moment to stamp on an Entry logged while viewing `day`.
 * Today: now. Another Day: that Day at the current clock time.
 */
export function eatenAtFor(day: DayKey, now: Date = new Date()): Date {
  if (dayKeyOf(now) === day) return now;
  const date = startOfDay(day);
  date.setHours(now.getHours(), now.getMinutes(), 0, 0);
  return date;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dayLabel(day: DayKey, today: DayKey = dayKeyOf(new Date())): string {
  const diff = daysBetween(day, today);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  const date = startOfDay(day);
  const base = `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === startOfDay(today).getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

export function clockTime(epochMs: number): string {
  const d = new Date(epochMs);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
