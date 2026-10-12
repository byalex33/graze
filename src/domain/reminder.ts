import { addDays, dayKeyOf, startOfDay, type DayKey } from './day';

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

export const DEFAULT_REMINDER: ReminderSettings = { enabled: false, hour: 20, minute: 0 };

/** How far ahead Reminders are scheduled. Stop opening Graze and they stop too. */
export const REMINDER_HORIZON_DAYS = 14;

/**
 * When the Reminder should fire: once a Day at the chosen time, for the next fortnight,
 * skipping today if it's already a Logged Day or the time has passed.
 */
export function reminderTimes(settings: ReminderSettings, now: Date, todayLogged: boolean): Date[] {
  if (!settings.enabled) return [];
  const today: DayKey = dayKeyOf(now);
  const times: Date[] = [];
  for (let i = 0; i < REMINDER_HORIZON_DAYS; i++) {
    const at = startOfDay(addDays(today, i));
    at.setHours(settings.hour, settings.minute, 0, 0);
    if (i === 0 && (todayLogged || at <= now)) continue;
    times.push(at);
  }
  return times;
}
