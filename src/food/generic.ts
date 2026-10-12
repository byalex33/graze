import type { Food, Unit } from '@/domain/food';

/**
 * Generic UK foods from McCance and Widdowson's Composition of Foods Integrated Dataset
 * (CoFID 2021, Public Health England, Open Government Licence v3.0). Bundled, so search
 * works offline. Rows: [code, name, kcal, protein, carbs, fat, unit] per 100 g or ml.
 * Regenerate with scripts/build-cofid.py.
 */
type Row = [string, string, number, number | null, number | null, number | null, Unit];
const ROWS: Row[] = require('./cofid.json');

let foods: (Food & { words: string[] })[] | null = null;

function all() {
  foods ??= ROWS.map(([code, name, kcal, protein, carbs, fat, unit]) => ({
    id: `cofid:${code}`,
    name,
    brand: null,
    unit,
    per100: { kcal, protein, carbs, fat },
    servings: [],
    words: name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
  }));
  return foods;
}

/** Generic foods whose name has a word starting with every word typed. Shorter names first. */
export function searchGeneric(query: string, limit = 20): Food[] {
  const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (terms.length === 0) return [];
  return all()
    .filter((f) => terms.every((t) => f.words.some((w) => w.startsWith(t))))
    .sort((a, b) => Number(!a.words[0].startsWith(terms[0])) - Number(!b.words[0].startsWith(terms[0])) || a.name.length - b.name.length)
    .slice(0, limit)
    .map(({ words: _words, ...food }) => food);
}

export function genericById(id: string): Food | null {
  const food = all().find((f) => f.id === id);
  if (!food) return null;
  const { words: _words, ...rest } = food;
  return rest;
}
