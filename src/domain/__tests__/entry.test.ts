import { entriesToCsv } from '../csv';
import { remainingLabel, signatureOf, totalsOf, type Entry } from '../entry';
import { rankRecents } from '../recents';

const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0).getTime();

function entry(over: Partial<Entry>): Entry {
  return {
    id: Math.random().toString(36),
    day: '2026-10-12',
    eatenAt: at(12, 8),
    name: null,
    foodId: null,
    kcal: 100,
    protein: null,
    carbs: null,
    fat: null,
    ...over,
  };
}

describe('totals', () => {
  it('treats missing macros as zero', () => {
    const t = totalsOf([entry({ kcal: 450, protein: 30 }), entry({ kcal: 200 })]);
    expect(t).toEqual({ kcal: 650, protein: 30, carbs: 0, fat: 0 });
  });

  it('describes going over the Goal as a number, not a judgement', () => {
    expect(remainingLabel(1240, 2200)).toBe('960 left');
    expect(remainingLabel(2450, 2200)).toBe('250 over');
    expect(remainingLabel(2200, 2200)).toBe('0 left');
  });
});

describe('signature', () => {
  it('matches named Quick Adds by name, ignoring case and spaces', () => {
    expect(signatureOf({ name: ' Protein Shake ', foodId: null })).toBe(signatureOf({ name: 'protein shake', foodId: null }));
  });

  it('gives unnamed Quick Adds no identity', () => {
    expect(signatureOf({ name: null, foodId: null })).toBeNull();
    expect(signatureOf({ name: '  ', foodId: null })).toBeNull();
  });

  it('prefers the Food over the name', () => {
    expect(signatureOf({ name: 'Clif Bar', foodId: 'off:123' })).toBe('food:off:123');
  });
});

describe('rankRecents', () => {
  const now = new Date(2026, 9, 12, 8, 0);

  it('never offers unnamed Quick Adds', () => {
    expect(rankRecents([entry({ name: null })], now, 3)).toEqual([]);
  });

  it('favours things eaten around this time of day', () => {
    const entries = [
      entry({ name: 'Oats', eatenAt: at(11, 8) }),
      entry({ name: 'Pasta', eatenAt: at(11, 19) }),
    ];
    expect(rankRecents(entries, now, 3).map((r) => r.name)).toEqual(['Oats', 'Pasta']);
  });

  it('favours frequent over one-off', () => {
    const entries = [
      entry({ name: 'Shake', eatenAt: at(5, 13) }),
      entry({ name: 'Shake', eatenAt: at(7, 13) }),
      entry({ name: 'Shake', eatenAt: at(9, 13) }),
      entry({ name: 'Cake', eatenAt: at(10, 13) }),
    ];
    expect(rankRecents(entries, now, 1)[0].name).toBe('Shake');
  });

  it('re-logs the latest numbers when the same thing was logged differently', () => {
    const entries = [
      entry({ name: 'Shake', kcal: 480, eatenAt: at(10, 8) }),
      entry({ name: 'shake', kcal: 520, eatenAt: at(11, 8) }),
    ];
    const [r] = rankRecents(entries, now, 3);
    expect(r.kcal).toBe(520);
    expect(r.name).toBe('shake');
  });

  it('limits the count', () => {
    const entries = ['A', 'B', 'C', 'D'].map((name) => entry({ name, eatenAt: at(11, 8) }));
    expect(rankRecents(entries, now, 3)).toHaveLength(3);
  });
});

describe('CSV export', () => {
  it('quotes names with commas and leaves missing macros blank', () => {
    const csv = entriesToCsv([entry({ name: 'Toast, butter', kcal: 250, protein: 6 })]);
    const [header, row] = csv.trim().split('\n');
    expect(header).toBe('day,eaten_at,name,kcal,protein_g,carbs_g,fat_g');
    expect(row).toMatch(/^2026-10-12,.*,"Toast, butter",250,6,,$/);
  });
});
