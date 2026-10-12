import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'graze.db';

const MIGRATIONS: string[] = [
  `
  CREATE TABLE entries (
    id TEXT PRIMARY KEY NOT NULL,
    day TEXT NOT NULL,
    eaten_at INTEGER NOT NULL,
    name TEXT,
    kcal REAL NOT NULL,
    protein REAL,
    carbs REAL,
    fat REAL,
    food_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX entries_day ON entries (day, eaten_at);
  CREATE INDEX entries_eaten_at ON entries (eaten_at);

  CREATE TABLE favourites (
    signature TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    kcal REAL NOT NULL,
    protein REAL,
    carbs REAL,
    fat REAL,
    food_id TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];

/** Applies any migrations newer than the database's user_version. */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let version = current; version < MIGRATIONS.length; version++) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(MIGRATIONS[version]);
      await txn.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
