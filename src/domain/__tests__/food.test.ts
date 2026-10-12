import { defaultPortion, foodFromOff, nutritionFor, portionLabel, type Food } from '../food';
import { reminderTimes } from '../reminder';

const bar: Food = {
  id: 'off:1',
  name: 'Oat bar',
  brand: null,
  unit: 'g',
  per100: { kcal: 450, protein: 10, carbs: 60, fat: 18 },
  servings: [{ label: '1 bar', amount: 40 }],
};

describe('portions', () => {
  it('scales per-100 nutrition to Servings', () => {
    expect(nutritionFor(bar, { kind: 'serving', serving: bar.servings[0], count: 2 })).toEqual({
      kcal: 360, protein: 8, carbs: 48, fat: 14.4,
    });
  });

  it('scales to grams and keeps missing macros missing', () => {
    const plain = { ...bar, per100: { kcal: 52, protein: null, carbs: 14, fat: null } };
    expect(nutritionFor(plain, { kind: 'amount', amount: 150 })).toEqual({ kcal: 78, protein: null, carbs: 21, fat: null });
  });

  it('labels portions', () => {
    expect(portionLabel(bar, { kind: 'serving', serving: bar.servings[0], count: 1 })).toBe('1 bar (40 g)');
    expect(portionLabel(bar, { kind: 'serving', serving: bar.servings[0], count: 1.5 })).toBe('1.5 × 1 bar (60 g)');
    expect(portionLabel(bar, { kind: 'amount', amount: 150 })).toBe('150 g');
  });

  it('defaults to one Serving, or 100 g when there are none', () => {
    expect(defaultPortion(bar)).toEqual({ kind: 'serving', serving: bar.servings[0], count: 1 });
    expect(defaultPortion({ ...bar, servings: [] })).toEqual({ kind: 'amount', amount: 100 });
  });
});

describe('foodFromOff', () => {
  it('reads a typical UK product', () => {
    const food = foodFromOff({
      code: '5000159484695',
      product_name: 'Dairy Milk',
      brands: 'Cadbury, Mondelez',
      quantity: '45 g',
      serving_size: '1 bar (45 g)',
      serving_quantity: '45',
      nutriments: { 'energy-kcal_100g': 534, proteins_100g: 7.3, carbohydrates_100g: 57, fat_100g: 30 },
    });
    expect(food).toEqual({
      id: 'off:5000159484695',
      name: 'Dairy Milk',
      brand: 'Cadbury',
      unit: 'g',
      per100: { kcal: 534, protein: 7.3, carbs: 57, fat: 30 },
      servings: [{ label: '1 bar', amount: 45 }],
    });
  });

  it('works out kcal from kJ when kcal is missing, and spots drinks', () => {
    const food = foodFromOff({ code: '1', product_name: 'Cola', quantity: '330 ml', nutriments: { energy_100g: 180 } });
    expect(food?.per100.kcal).toBe(43);
    expect(food?.unit).toBe('ml');
    expect(food?.servings).toEqual([]);
  });

  it('calls a bare weight serving "1 serving"', () => {
    const food = foodFromOff({ code: '1', product_name: 'Crisps', serving_size: '25 g', serving_quantity: 25, nutriments: { 'energy-kcal_100g': 520 } });
    expect(food?.servings).toEqual([{ label: '1 serving', amount: 25 }]);
  });

  it('reads brands as a list (search results) and "gram" servings', () => {
    const food = foodFromOff({ code: '1', product_name: 'Twix', brands: ['Mars', 'Twix'], serving_size: '43.1 gram', serving_quantity: 43.1, nutriments: { 'energy-kcal_100g': 495 } });
    expect(food?.brand).toBe('Mars');
    expect(food?.servings).toEqual([{ label: '1 serving', amount: 43.1 }]);
  });

  describe('drinks', () => {
    it('measures a can in ml and offers the whole can', () => {
      const coke = foodFromOff({
        code: '5449000000996', product_name: 'Coca-Cola Original', quantity: '330 ml', product_quantity: '330',
        product_quantity_unit: 'ml', serving_size: '1 portion (330 ml)', serving_quantity: '330', serving_quantity_unit: 'ml',
        nutriments: { 'energy-kcal_100g': 42 },
      });
      expect(coke?.unit).toBe('ml');
      expect(coke?.servings).toEqual([{ label: 'Whole pack', amount: 330 }]);
      expect(defaultPortion(coke!)).toEqual({ kind: 'serving', serving: { label: 'Whole pack', amount: 330 }, count: 1 });
    });

    it('spots milk from its serving unit alone', () => {
      const milk = foodFromOff({ code: '1', product_name: 'Whole Milk', serving_size: '1 serving (100 ml)', serving_quantity: 100, serving_quantity_unit: 'ml', nutriments: { 'energy-kcal_100g': 64 } });
      expect(milk?.unit).toBe('ml');
      expect(milk?.servings).toEqual([{ label: '1 serving', amount: 100 }]);
    });

    it('spots a drink from its category', () => {
      expect(foodFromOff({ code: '1', product_name: 'Squash', categories_tags: ['en:beverages'], nutriments: { 'energy-kcal_100g': 10 } })?.unit).toBe('ml');
    });

    it('offers both a serving and the whole bottle when they differ, and defaults to 250 ml without either', () => {
      const juice = foodFromOff({ code: '1', product_name: 'Orange juice', quantity: '1 l', product_quantity: 1000, product_quantity_unit: 'ml', serving_size: '150 ml', serving_quantity: 150, nutriments: { 'energy-kcal_100g': 45 } });
      expect(juice?.servings).toEqual([{ label: '1 serving', amount: 150 }, { label: 'Whole pack', amount: 1000 }]);
      const plain = foodFromOff({ code: '2', product_name: 'Water', quantity: '1.5 l', nutriments: { 'energy-kcal_100g': 0 } });
      expect(defaultPortion(plain!)).toEqual({ kind: 'amount', amount: 250 });
    });
  });

  it("doesn't offer a whole big bag of food as a portion", () => {
    const pasta = foodFromOff({ code: '1', product_name: 'Fusilli', quantity: '1 kg', product_quantity: 1000, product_quantity_unit: 'g', nutriments: { 'energy-kcal_100g': 357 } });
    expect(pasta?.unit).toBe('g');
    expect(pasta?.servings).toEqual([]);
    const crisps = foodFromOff({ code: '2', product_name: 'Crisps', quantity: '25 g', product_quantity: 25, nutriments: { 'energy-kcal_100g': 520 } });
    expect(crisps?.servings).toEqual([{ label: 'Whole pack', amount: 25 }]);
  });

  it('rejects products with no name or no calories', () => {
    expect(foodFromOff({ code: '1', product_name: '', nutriments: { 'energy-kcal_100g': 1 } })).toBeNull();
    expect(foodFromOff({ code: '1', product_name: 'Mystery', nutriments: {} })).toBeNull();
  });
});

describe('reminderTimes', () => {
  const settings = { enabled: true, hour: 20, minute: 0 };

  it('schedules a fortnight of evenings starting today', () => {
    const times = reminderTimes(settings, new Date(2026, 9, 12, 9, 0), false);
    expect(times).toHaveLength(14);
    expect(times[0]).toEqual(new Date(2026, 9, 12, 20, 0));
    expect(times[13]).toEqual(new Date(2026, 9, 25, 20, 0));
  });

  it("skips today once something's logged", () => {
    const times = reminderTimes(settings, new Date(2026, 9, 12, 9, 0), true);
    expect(times[0]).toEqual(new Date(2026, 9, 13, 20, 0));
    expect(times).toHaveLength(13);
  });

  it('skips today when the time has already passed', () => {
    expect(reminderTimes(settings, new Date(2026, 9, 12, 21, 0), false)[0]).toEqual(new Date(2026, 9, 13, 20, 0));
  });

  it('schedules nothing when off', () => {
    expect(reminderTimes({ ...settings, enabled: false }, new Date(), false)).toEqual([]);
  });
});
