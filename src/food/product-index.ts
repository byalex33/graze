import { Directory, File, Paths } from 'expo-file-system';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { foodFromOff, type Food } from '@/domain/food';
import { indexMatch } from './product-query';

/**
 * UK products from Open Food Facts, searched on the phone: instant, offline, and ranked our way.
 * A weekly GitHub Action (.github/workflows/products.yml) builds it with scripts/build-products.py
 * and publishes it to this repo's "products" release. The app downloads it once, then swaps in a
 * newer one when the release has moved on. Until it has downloaded, search goes online instead.
 * Data © Open Food Facts contributors, under the Open Database Licence.
 */
const RELEASE = 'https://github.com/byalex33/graze/releases/download/products';
const FOLDER = new Directory(Paths.document, 'products');
const FILE_NAME = /^products-(\d{4}-\d{2}-\d{2})\.db$/;
/** Text relevance, then how often people scan the product (precomputed as ln(1 + scans)). */
const RANK = 'bm25(search, 1.0, 0.75) - p.popularity';

interface Manifest {
  version: string;
  bytes: number;
  md5: string;
}

interface Row {
  code: string;
  name: string;
  brand: string | null;
  quantity: string | null;
  product_quantity: number | null;
  serving_size: string | null;
  serving_quantity: number | null;
  drink: number;
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

function foodFromRow(r: Row): Food | null {
  return foodFromOff({
    code: r.code,
    product_name: r.name,
    brands: r.brand ?? undefined,
    quantity: r.quantity ?? undefined,
    product_quantity: r.product_quantity ?? undefined,
    serving_size: r.serving_size ?? undefined,
    serving_quantity: r.serving_quantity ?? undefined,
    categories_tags: r.drink ? ['en:beverages'] : [],
    nutriments: {
      'energy-kcal_100g': r.kcal,
      proteins_100g: r.protein ?? undefined,
      carbohydrates_100g: r.carbs ?? undefined,
      fat_100g: r.fat ?? undefined,
    },
  });
}

/** Downloaded index files, newest first. */
function installed(): { version: string; file: File }[] {
  if (!FOLDER.exists) return [];
  return FOLDER.list()
    .flatMap((f) => {
      const version = f instanceof File ? FILE_NAME.exec(f.name)?.[1] : undefined;
      return version ? [{ version, file: f as File }] : [];
    })
    .sort((a, b) => b.version.localeCompare(a.version));
}

let opened: { version: string; db: Promise<SQLiteDatabase> } | null = null;

function database(): Promise<SQLiteDatabase> | null {
  const newest = installed()[0];
  if (!newest) return null;
  if (opened?.version !== newest.version) {
    opened = { version: newest.version, db: openDatabaseAsync(newest.file.name, { useNewConnection: true }, FOLDER.uri) };
  }
  return opened.db;
}

/** Products matching every word typed, best first. Null when there's no index yet or it failed. */
export async function searchIndex(query: string, limit = 40): Promise<Food[] | null> {
  const db = database();
  if (!db) return null;
  const match = indexMatch(query);
  if (!match) return [];
  try {
    const rows = await (await db).getAllAsync<Row>(
      `SELECT p.* FROM search JOIN products p ON p.id = search.rowid WHERE search MATCH ? ORDER BY ${RANK} LIMIT ?`,
      [match, limit],
    );
    return rows.map(foodFromRow).filter((f): f is Food => f !== null);
  } catch {
    return null;
  }
}

/** The product with this barcode in the index, allowing for UPC-A codes read with or without a leading 0. */
export async function indexBarcode(code: string): Promise<Food | null> {
  const db = database();
  if (!db) return null;
  const codes = [code, /^\d{12}$/.test(code) ? `0${code}` : null, /^0\d{12}$/.test(code) ? code.slice(1) : null].filter(Boolean);
  try {
    const row = await (await db).getFirstAsync<Row>(`SELECT * FROM products WHERE code IN (${codes.map(() => '?').join(',')})`, codes as string[]);
    return row ? foodFromRow(row) : null;
  } catch {
    return null;
  }
}

let refreshing: Promise<void> | null = null;

/** Downloads the published index if it's newer than the one on the phone. Quietly does nothing offline. */
export function refreshProductIndex(): Promise<void> {
  refreshing ??= update()
    .catch(() => {})
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function update(): Promise<void> {
  const res = await fetch(`${RELEASE}/products.json`, { headers: { Accept: 'application/json' } });
  if (!res.ok) return;
  const manifest = (await res.json()) as Manifest;
  if (!FILE_NAME.test(`products-${manifest.version}.db`)) return;
  const have = installed();
  if (have[0] && have[0].version >= manifest.version) return;

  FOLDER.create({ idempotent: true, intermediates: true });
  const download = new File(FOLDER, `products-${manifest.version}.download`);
  if (download.exists) download.delete();
  await File.downloadFileAsync(`${RELEASE}/products.db`, download, { idempotent: true });
  const info = download.info({ md5: true });
  if (info.size !== manifest.bytes || info.md5 !== manifest.md5) {
    download.delete();
    return; // a half-finished download, or the release changed mid-way; try again next launch
  }
  download.rename(`products-${manifest.version}.db`);

  // Searches now open the new file; close and remove the old ones.
  const previous = opened;
  opened = null;
  await previous?.db.then((db) => db.closeAsync()).catch(() => {});
  for (const old of have) old.file.delete();
}
