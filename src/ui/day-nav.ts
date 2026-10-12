import type { DayKey } from '@/domain/day';

/**
 * Lets other screens (the calendar) send Today to a Day. Today listens while mounted;
 * a request made just before it's back in front is still picked up.
 */
let pending: DayKey | null = null;
const listeners = new Set<(day: DayKey) => void>();

export function goToDay(day: DayKey): void {
  pending = day;
  listeners.forEach((l) => l(day));
}

export function onGoToDay(listener: (day: DayKey) => void): () => void {
  listeners.add(listener);
  if (pending) listener(pending);
  return () => listeners.delete(listener);
}

export function clearGoToDay(): void {
  pending = null;
}
