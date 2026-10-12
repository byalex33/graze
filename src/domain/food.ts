import type { Nutrition } from './entry';

/** Foods are measured by weight or by volume. */
export type Unit = 'g' | 'ml';

/** A named portion a Food defines, e.g. "1 bar" = 40 g. */
export interface Serving {
  label: string;
  amount: number;
}

/** A product (Open Food Facts) or a generic UK food (CoFID). Nutrition is per 100 g or ml. */
export interface Food {
  id: string;
  name: string;
  brand: string | null;
  unit: Unit;
  per100: Nutrition;
  servings: Serving[];
}

/** How much of a Food was eaten: a number of Servings, or a weight/volume. */
export type Portion =
  | { kind: 'serving'; serving: Serving; count: number }
  | { kind: 'amount'; amount: number };

export function portionAmount(p: Portion): number {
  return p.kind === 'serving' ? p.serving.amount * p.count : p.amount;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The Nutrition of a Portion, which an Entry keeps as its own copy. */
export function nutritionFor(food: Food, portion: Portion): Nutrition {
  const f = portionAmount(portion) / 100;
  const scale = (v: number | null) => (v === null ? null : round1(v * f));
  return {
    kcal: Math.round(food.per100.kcal * f),
    protein: scale(food.per100.protein),
    carbs: scale(food.per100.carbs),
    fat: scale(food.per100.fat),
  };
}

const trimNumber = (n: number) => String(round1(n));

export function portionLabel(food: Food, p: Portion): string {
  if (p.kind === 'amount') return `${trimNumber(p.amount)} ${food.unit}`;
  const count = p.count === 1 ? '' : `${trimNumber(p.count)} × `;
  return `${count}${p.serving.label} (${trimNumber(portionAmount(p))} ${food.unit})`;
}

/** Quick amounts offered when weighing or measuring. */
export const QUICK_AMOUNTS: Record<Unit, number[]> = { g: [50, 100, 150, 200, 250], ml: [150, 250, 330, 500] };

/** A drink starts at the whole can or bottle when there is one; anything else at its first Serving. */
export function defaultPortion(food: Food): Portion {
  const wholeDrink = food.unit === 'ml' ? food.servings.find((s) => s.label === 'Whole pack') : undefined;
  const serving = wholeDrink ?? food.servings[0];
  return serving ? { kind: 'serving', serving, count: 1 } : { kind: 'amount', amount: food.unit === 'ml' ? 250 : 100 };
}

/**
 * One pack's size from Open Food Facts' free-text quantity: "330 ml" → 330, "1.5 l" → 1500,
 * "7 x 250 ml" → 250 (one can of the multipack). Null when it can't tell.
 */
export function packFromQuantity(quantity: string | undefined): number | null {
  const m = (quantity ?? '').trim().match(/^(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|l)$/i);
  if (!m) return null;
  const value = Number(m[2].replace(',', '.'));
  const scale = { g: 1, kg: 1000, ml: 1, cl: 10, l: 1000 }[m[3].toLowerCase() as 'g' | 'kg' | 'ml' | 'cl' | 'l'];
  return value > 0 ? Math.round(value * scale * 10) / 10 : null;
}

/** The name an Entry gets: brand first, unless the product name already includes it. */
export function entryName(food: Food): string {
  if (!food.brand || food.name.toLowerCase().includes(food.brand.toLowerCase())) return food.name;
  return `${food.brand} ${food.name}`;
}

// ---- Open Food Facts ----

type OffNutriments = Record<string, number | string | undefined>;
export interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  /** A comma-separated string from the product API, a list from search. */
  brands?: string | string[];
  quantity?: string;
  product_quantity?: number | string;
  product_quantity_unit?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  serving_quantity_unit?: string;
  categories_tags?: string[];
  nutriments?: OffNutriments;
}

const LIQUID = /\b\d+(?:[.,]\d+)?\s*(?:ml|cl|l)\b/i;
const SOLID = /\b\d+(?:[.,]\d+)?\s*(?:g|kg)\b/i;
const DRINK_WORDS =
  /\b(water|juice|drink|squash|cordial|cola|lemonade|soda|tonic|still|sparkling|smoothie|milkshake|shake|tea|coffee|latte|cappuccino|lager|beer|ale|stout|cider|wine|prosecco|gin|vodka|kombucha|kefir)\b/i;
const NOT_DRINK_WORDS =
  /\b(cake|cakes|bar|bars|biscuits?|cookies?|chocolate|crisps|ice cream|lolly|lollies|sweets|gum|powder|bags?|granules|beans|pods|capsules|jelly|pastilles|loaf|bread|crackers?)\b/i;

/** For products with no units or category at all: does the name read like a drink? */
export function soundsLikeDrink(name: string): boolean {
  return DRINK_WORDS.test(name) && !NOT_DRINK_WORDS.test(name);
}

/**
 * Drinks are measured in ml. Trust Open Food Facts' units and category when it has them;
 * many UK products have neither, so fall back to the name.
 */
export function isDrink(p: OffProduct, name: string): boolean {
  if (
    p.product_quantity_unit === 'ml' ||
    p.serving_quantity_unit === 'ml' ||
    (p.categories_tags ?? []).includes('en:beverages') ||
    LIQUID.test(p.quantity ?? '') ||
    LIQUID.test(p.serving_size ?? '')
  ) {
    return true;
  }
  const saysSolid = p.product_quantity_unit === 'g' || p.serving_quantity_unit === 'g' || SOLID.test(p.quantity ?? '');
  return !saysSolid && soundsLikeDrink(name);
}

/** The same Food measured the other way; per-100 values carry over (100 g of a drink ≈ 100 ml). */
export function withUnit(food: Food, unit: Unit): Food {
  return food.unit === unit ? food : { ...food, unit };
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** A usable Food from an Open Food Facts product, or null if it lacks a name or calories. */
export function foodFromOff(p: OffProduct): Food | null {
  const name = (p.product_name_en || p.product_name || '').trim();
  const n = p.nutriments ?? {};
  const kcal = num(n['energy-kcal_100g']) ?? (num(n['energy_100g']) !== null ? num(n['energy_100g'])! / 4.184 : null);
  if (!p.code || !name || kcal === null) return null;

  const unit: Unit = isDrink(p, name) ? 'ml' : 'g';
  const servingAmount = num(p.serving_quantity);
  const packAmount = num(p.product_quantity) ?? packFromQuantity(p.quantity);
  const servingLabel = (p.serving_size ?? '').replace(/\s*\(.*\)\s*$/, '').trim();
  const generic = !servingLabel || /^(1\s+)?(portion|serving)$/i.test(servingLabel) || /^\d+([.,]\d+)?\s*(g|grams?|ml|cl|l)$/i.test(servingLabel);
  const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(a, b) * 0.05;

  const servings: Serving[] = [];
  if (servingAmount && servingAmount > 0) {
    const isWholePack = packAmount !== null && near(servingAmount, packAmount);
    servings.push({ label: isWholePack && generic ? 'Whole pack' : generic ? '1 serving' : servingLabel, amount: servingAmount });
  }
  // A whole can, bottle or snack bag is a natural portion; a 1.5 l bottle or a 1 kg bag of pasta isn't.
  const packIsPortion = packAmount !== null && packAmount > 0 && packAmount <= (unit === 'ml' ? 750 : 250);
  if (packIsPortion && !servings.some((s) => near(s.amount, packAmount))) {
    servings.push({ label: 'Whole pack', amount: packAmount });
  }

  return {
    id: `off:${p.code}`,
    name,
    brand: (Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(',')[0])?.trim() || null,
    unit,
    per100: {
      kcal: Math.round(kcal),
      protein: num(n['proteins_100g']),
      carbs: num(n['carbohydrates_100g']),
      fat: num(n['fat_100g']),
    },
    servings,
  };
}
