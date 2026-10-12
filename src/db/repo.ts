import type { SQLiteDatabase } from 'expo-sqlite';

import type { DayKey } from '@/domain/day';
import { signatureOf, type Entry, type Goal, type Nutrition, type Relog } from '@/domain/entry';
import { notifyChanged } from './changes';

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

export async function getEntry(db: SQLiteDatabase, id: string): Promise<Entry | null> {
  const row = await db.getFirstAsync<EntryRow>('SELECT * FROM entries WHERE id = ?', id);
  return row ? toEntry(row) : null;
}

export interface NewEntry extends Nutrition {
  day: DayKey;
  eatenAt: number;
  name: string | null;
  foodId: string | null;
}

export async function addEntry(db: SQLiteDatabase, e: NewEntry): Promise<string> {
  const id = newId();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO entries (id, day, eaten_at, name, kcal, protein, carbs, fat, food_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, e.day, e.eatenAt, e.name, e.kcal, e.protein, e.carbs, e.fat, e.foodId, now, now,
  );
  notifyChanged();
  return id;
}

export async function updateEntry(
  db: SQLiteDatabase,
  id: string,
  e: Nutrition & { name: string | null },
): Promise<void> {
  await db.runAsync(
    'UPDATE entries SET name = ?, kcal = ?, protein = ?, carbs = ?, fat = ?, updated_at = ? WHERE id = ?',
    e.name, e.kcal, e.protein, e.carbs, e.fat, Date.now(), id,
  );
  notifyChanged();
}

export async function deleteEntry(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM entries WHERE id = ?', id);
  notifyChanged();
}

// ---- Favourites ----

export async function favourites(db: SQLiteDatabase): Promise<Relog[]> {
  const rows = await db.getAllAsync<{
    signature: string; name: string; kcal: number; protein: number | null;
    carbs: number | null; fat: number | null; food_id: string | null;
  }>('SELECT * FROM favourites ORDER BY name COLLATE NOCASE');
  return rows.map((r) => ({
    signature: r.signature, name: r.name, kcal: r.kcal, protein: r.protein,
    carbs: r.carbs, fat: r.fat, foodId: r.food_id,
  }));
}

export async function isFavourite(db: SQLiteDatabase, signature: string): Promise<boolean> {
  const row = await db.getFirstAsync('SELECT 1 FROM favourites WHERE signature = ?', signature);
  return row !== null;
}

/** Pins the Entry's current name and Nutrition. Returns false for an unnamed Quick Add. */
export async function setFavourite(
  db: SQLiteDatabase,
  e: Nutrition & { name: string | null; foodId: string | null },
  on: boolean,
): Promise<boolean> {
  const signature = signatureOf(e);
  if (!signature) return false;
  if (on) {
    await db.runAsync(
      `INSERT OR REPLACE INTO favourites (signature, name, kcal, protein, carbs, fat, food_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      signature, e.name!.trim(), e.kcal, e.protein, e.carbs, e.fat, e.foodId, Date.now(),
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

/** Removes everything Graze stores on the phone. Health Store data is untouched. */
export async function deleteAllData(db: SQLiteDatabase): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync('DELETE FROM entries; DELETE FROM favourites; DELETE FROM settings;');
  });
  notifyChanged();
}
