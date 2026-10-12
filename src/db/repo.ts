import type { SQLiteDatabase } from 'expo-sqlite';

import { dayKeyOf, type DayKey } from '@/domain/day';
import { signatureOf, type Entry, type Goal, type Nutrition, type Relog } from '@/domain/entry';
import type { Unit } from '@/domain/food';
import { DEFAULT_REMINDER, type ReminderSettings } from '@/domain/reminder';
import { DEFAULT_TODAY_LAYOUT, type TodayLayout } from '@/domain/today-layout';
import { defaultWeightUnit, type WeighIn, type WeightUnit } from '@/domain/weight';
import { getLocales } from 'expo-localization';

import type { AccentChoice } from '@/ui/accent';
import type { DayStat } from '@/domain/stats';
import { emitFirstOfDay, emitWrite, notifyChanged } from './changes';

interface EntryRow {
  id: string;
  day: string;
  eaten_at: number;
  name: string | null;
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  food_id: string | null;
  portion: string | null;
}

const toEntry = (r: EntryRow): Entry => ({
  id: r.id,
  day: r.day,
  eatenAt: r.eaten_at,
  name: r.name,
  kcal: r.kcal,
  protein: r.protein,
  carbs: r.carbs,
  fat: r.fat,
  foodId: r.food_id,
  portion: r.portion,
});

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

// ---- Entries ----

export async function entriesForDay(db: SQLiteDatabase, day: DayKey): Promise<Entry[]> {
  const rows = await db.getAllAsync<EntryRow>('SELECT * FROM entries WHERE day = ? ORDER BY eaten_at ASC', day);
  return rows.map(toEntry);
}

export async function entriesSince(db: SQLiteDatabase, sinceMs: number): Promise<Entry[]> {
  const rows = await db.getAllAsync<EntryRow>('SELECT * FROM entries WHERE eaten_at >= ?', sinceMs);
  return rows.map(toEntry);
}

export async function allEntries(db: SQLiteDatabase): Promise<Entry[]> {
  const rows = await db.getAllAsync<EntryRow>('SELECT * FROM entries ORDER BY eaten_at ASC');
  return rows.map(toEntry);
}

/** Eaten and Entry count for every Logged Day from `fromDay` on. */
export async function dayStatsSince(db: SQLiteDatabase, fromDay: DayKey): Promise<DayStat[]> {
  return db.getAllAsync<DayStat>(
    'SELECT day, SUM(kcal) AS kcal, COUNT(*) AS entries FROM entries WHERE day >= ? GROUP BY day',
    fromDay,
  );
}

export async function getEntry(db: SQLiteDatabase, id: string): Promise<Entry | null> {
  const row = await db.getFirstAsync<EntryRow>('SELECT * FROM entries WHERE id = ?', id);
  return row ? toEntry(row) : null;
}

export interface NewEntry extends Nutrition {
  day: DayKey;
  eatenAt: number;
  name: string | null;
  foodId: string | null;
  portion: string | null;
}

export async function addEntry(db: SQLiteDatabase, e: NewEntry): Promise<string> {
  const id = newId();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO entries (id, day, eaten_at, name, kcal, protein, carbs, fat, food_id, portion, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, e.day, e.eatenAt, e.name, e.kcal, e.protein, e.carbs, e.fat, e.foodId, e.portion, now, now,
  );
  notifyChanged();
  emitWrite({ kind: 'entry-saved', entry: { ...e, id }, version: now });
  await maybeCelebrate(db, e.day);
  return id;
}

/** Today just became a Logged Day, for the first time today: celebrate once. */
async function maybeCelebrate(db: SQLiteDatabase, day: DayKey): Promise<void> {
  if (day !== dayKeyOf(new Date())) return;
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM entries WHERE day = ?', day);
  if (row?.n !== 1 || (await getSetting(db, 'celebrated')) === day) return;
  await putSetting(db, 'celebrated', day);
  emitFirstOfDay();
}

/** Changes an Entry's name, Nutrition and Portion; its Day, time and Food stay as logged. */
export async function updateEntry(
  db: SQLiteDatabase,
  id: string,
  e: Nutrition & { name: string | null; portion: string | null },
): Promise<void> {
  await db.runAsync(
    'UPDATE entries SET name = ?, kcal = ?, protein = ?, carbs = ?, fat = ?, portion = ?, updated_at = ? WHERE id = ?',
    e.name, e.kcal, e.protein, e.carbs, e.fat, e.portion, Date.now(), id,
  );
  notifyChanged();
  const row = await db.getFirstAsync<EntryRow & { updated_at: number }>('SELECT * FROM entries WHERE id = ?', id);
  if (row) emitWrite({ kind: 'entry-saved', entry: toEntry(row), version: row.updated_at });
}

/** Entries whose copy in the Health Store should exist: everything from `fromDay` on. */
export async function entriesForMirroring(db: SQLiteDatabase, fromDay: DayKey): Promise<{ entry: Entry; version: number }[]> {
  const rows = await db.getAllAsync<EntryRow & { updated_at: number }>('SELECT * FROM entries WHERE day >= ?', fromDay);
  return rows.map((r) => ({ entry: toEntry(r), version: r.updated_at }));
}

export async function deleteEntry(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM entries WHERE id = ?', id);
  notifyChanged();
  emitWrite({ kind: 'entry-deleted', id });
}

// ---- Favourites ----

export async function favourites(db: SQLiteDatabase): Promise<Relog[]> {
  const rows = await db.getAllAsync<{
    signature: string; name: string; kcal: number; protein: number | null;
    carbs: number | null; fat: number | null; food_id: string | null; portion: string | null;
  }>('SELECT * FROM favourites ORDER BY name COLLATE NOCASE');
  return rows.map((r) => ({
    signature: r.signature, name: r.name, kcal: r.kcal, protein: r.protein,
    carbs: r.carbs, fat: r.fat, foodId: r.food_id, portion: r.portion,
  }));
}

export async function isFavourite(db: SQLiteDatabase, signature: string): Promise<boolean> {
  const row = await db.getFirstAsync('SELECT 1 FROM favourites WHERE signature = ?', signature);
  return row !== null;
}

/** Pins the Entry's current name and Nutrition. Returns false for an unnamed Quick Add. */
export async function setFavourite(
  db: SQLiteDatabase,
  e: Nutrition & { name: string | null; foodId: string | null; portion?: string | null },
  on: boolean,
): Promise<boolean> {
  const signature = signatureOf(e);
  if (!signature) return false;
  if (on) {
    await db.runAsync(
      `INSERT OR REPLACE INTO favourites (signature, name, kcal, protein, carbs, fat, food_id, portion, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      signature, e.name!.trim(), e.kcal, e.protein, e.carbs, e.fat, e.foodId, e.portion ?? null, Date.now(),
    );
  } else {
    await db.runAsync('DELETE FROM favourites WHERE signature = ?', signature);
  }
  notifyChanged();
  return true;
}

// ---- Settings ----

async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

async function putSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
}

/** Null until the user has finished setup. */
export async function getGoal(db: SQLiteDatabase): Promise<Goal | null> {
  const raw = await getSetting(db, 'goal');
  return raw ? (JSON.parse(raw) as Goal) : null;
}

export async function setGoal(db: SQLiteDatabase, goal: Goal): Promise<void> {
  await putSetting(db, 'goal', JSON.stringify(goal));
  notifyChanged();
}

// ---- Weigh-ins ----

export async function addWeighIn(db: SQLiteDatabase, w: WeighIn): Promise<string> {
  const id = newId();
  await db.runAsync('INSERT INTO weigh_ins (id, at, kg, created_at) VALUES (?, ?, ?, ?)', id, w.at, w.kg, Date.now());
  notifyChanged();
  emitWrite({ kind: 'weigh-in-saved', id, weighIn: w });
  return id;
}

export async function weighInsSince(db: SQLiteDatabase, sinceMs: number): Promise<(WeighIn & { id: string })[]> {
  return db.getAllAsync('SELECT id, at, kg FROM weigh_ins WHERE at >= ? ORDER BY at ASC', sinceMs);
}

export async function deleteWeighIn(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM weigh_ins WHERE id = ?', id);
  notifyChanged();
  emitWrite({ kind: 'weigh-in-deleted', id });
}

export async function getWeightUnit(db: SQLiteDatabase): Promise<WeightUnit> {
  return ((await getSetting(db, 'weightUnit')) as WeightUnit | null) ?? defaultWeightUnit(getLocales()[0]?.measurementSystem);
}

export async function setWeightUnit(db: SQLiteDatabase, unit: WeightUnit): Promise<void> {
  await putSetting(db, 'weightUnit', unit);
  notifyChanged();
}

export async function getTodayLayout(db: SQLiteDatabase): Promise<TodayLayout> {
  const raw = await getSetting(db, 'todayLayout');
  // Merge so sections added in later versions default to on.
  return { ...DEFAULT_TODAY_LAYOUT, ...(raw ? (JSON.parse(raw) as Partial<TodayLayout>) : {}) };
}

export async function setTodayLayout(db: SQLiteDatabase, layout: TodayLayout): Promise<void> {
  await putSetting(db, 'todayLayout', JSON.stringify(layout));
  notifyChanged();
}

export async function getAccentChoice(db: SQLiteDatabase): Promise<AccentChoice> {
  return ((await getSetting(db, 'accent')) as AccentChoice | null) ?? 'white';
}

export async function setAccentChoice(db: SQLiteDatabase, choice: AccentChoice): Promise<void> {
  await putSetting(db, 'accent', choice);
  notifyChanged();
}

/** Whether the user chose to connect the Health Store. */
export async function isHealthLinked(db: SQLiteDatabase): Promise<boolean> {
  return (await getSetting(db, 'healthLinked')) === '1';
}

export async function setHealthLinked(db: SQLiteDatabase, linked: boolean): Promise<void> {
  await putSetting(db, 'healthLinked', linked ? '1' : '0');
  notifyChanged();
}

/** Per-Food choice of g or ml, for when the data guessed wrong. */
export async function getUnitOverride(db: SQLiteDatabase, foodId: string): Promise<Unit | null> {
  const raw = await getSetting(db, 'units');
  return raw ? ((JSON.parse(raw) as Record<string, Unit>)[foodId] ?? null) : null;
}

export async function setUnitOverride(db: SQLiteDatabase, foodId: string, unit: Unit): Promise<void> {
  const raw = await getSetting(db, 'units');
  const map = raw ? (JSON.parse(raw) as Record<string, Unit>) : {};
  map[foodId] = unit;
  await putSetting(db, 'units', JSON.stringify(map));
  notifyChanged();
}

export async function getReminder(db: SQLiteDatabase): Promise<ReminderSettings> {
  const raw = await getSetting(db, 'reminder');
  return raw ? { ...DEFAULT_REMINDER, ...(JSON.parse(raw) as Partial<ReminderSettings>) } : DEFAULT_REMINDER;
}

export async function setReminder(db: SQLiteDatabase, reminder: ReminderSettings): Promise<void> {
  await putSetting(db, 'reminder', JSON.stringify(reminder));
  notifyChanged();
}

/** Removes everything Graze stores on the phone. Health Store data is untouched. */
export async function deleteAllData(db: SQLiteDatabase): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync('DELETE FROM entries; DELETE FROM favourites; DELETE FROM weigh_ins; DELETE FROM settings;');
  });
  notifyChanged();
}
