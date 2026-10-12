import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

import { entriesForDay, getReminder } from '@/db/repo';
import { dayKeyOf } from '@/domain/day';
import { reminderTimes } from '@/domain/reminder';

const ID_PREFIX = 'graze-reminder-';
const CONTENT = { title: 'Graze', body: 'Nothing logged today.' };

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/** Asks for permission, only ever from the Reminder switch. Returns whether we may notify. */
export async function requestReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Replaces the scheduled Reminders with a fresh fortnight. Cheap enough to call after
 * every write and on every app open, which is how today's gets cancelled once you log.
 */
export async function syncReminders(db: SQLiteDatabase): Promise<void> {
  const settings = await getReminder(db);
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!settings.enabled || !(await Notifications.getPermissionsAsync()).granted) return;

  const now = new Date();
  const todayLogged = (await entriesForDay(db, dayKeyOf(now))).length > 0;
  await Promise.all(
    reminderTimes(settings, now, todayLogged).map((date) =>
      Notifications.scheduleNotificationAsync({
        identifier: `${ID_PREFIX}${dayKeyOf(date)}`,
        content: CONTENT,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      }),
    ),
  );
}

/** Shows what the Reminder looks like, five seconds from now. */
export async function sendTestReminder(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: CONTENT,
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
  });
}
