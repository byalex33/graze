import Constants from 'expo-constants';

import { foodFromOff, type Food, type OffProduct } from '@/domain/food';

/**
 * Open Food Facts: free, crowd-sourced, good UK coverage.
 * Their rules: identify the app in the User-Agent, at most 15 product lookups and
 * 10 searches a minute, and no search-as-you-type against the product API.
 * https://openfoodfacts.github.io/openfoodfacts-server/api/
 */
const USER_AGENT = `Graze/${Constants.expoConfig?.version ?? '0'} (https://github.com/byalex33/graze)`;
const FIELDS =
  'code,product_name,product_name_en,brands,quantity,product_quantity,product_quantity_unit,serving_size,serving_quantity,serving_quantity_unit,categories_tags,nutriments';
const SEARCH_LIMIT_PER_MINUTE = 8;

export class OffError extends Error {}

async function get(url: string, signal?: AbortSignal): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new OffError('No connection');
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new OffError(res.status === 429 || res.status === 503 ? 'Open Food Facts is busy, try again in a minute' : `Open Food Facts error ${res.status}`);
  return res.json();
}

const byBarcode = new Map<string, Food | null>();

/** The product with this barcode, or null if Open Food Facts doesn't have a usable one. */
export async function lookupBarcode(code: string): Promise<Food | null> {
  if (byBarcode.has(code)) return byBarcode.get(code)!;
  const body = (await get(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}?fields=${FIELDS}`)) as
    | { status?: number; product?: OffProduct }
    | null;
  const food = body?.status === 1 && body.product ? foodFromOff({ ...body.product, code }) : null;
  byBarcode.set(code, food);
  return food;
}

const searches = new Map<string, Food[]>();
const recentSearchTimes: number[] = [];

/** UK products matching the query. Cached, and self-limited to stay under their search limit. */
export async function searchProducts(query: string, signal?: AbortSignal): Promise<Food[]> {
  const key = query.trim().toLowerCase();
  if (searches.has(key)) return searches.get(key)!;

  const now = Date.now();
  while (recentSearchTimes.length && now - recentSearchTimes[0] > 60_000) recentSearchTimes.shift();
  if (recentSearchTimes.length >= SEARCH_LIMIT_PER_MINUTE) throw new OffError('Searching too fast, wait a few seconds');
  recentSearchTimes.push(now);

  const q = `${query.trim()} countries_tags:"en:united-kingdom"`;
  const body = (await get(
    `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&langs=en&page_size=25&fields=${FIELDS}`,
    signal,
  )) as { hits?: OffProduct[] } | null;
  const foods = (body?.hits ?? []).map(foodFromOff).filter((f): f is Food => f !== null);
  searches.set(key, foods);
  return foods;
}
