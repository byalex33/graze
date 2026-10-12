import { entriesToCsv } from '../csv';
import type { Entry } from '../entry';

function entry(over: Partial<Entry>): Entry {
  return {
    id: 'e1',
    day: '2026-10-12',
    eatenAt: Date.UTC(2026, 9, 12, 7, 30),
    name: null,
    foodId: null,
    portion: null,
    kcal: 100,
    protein: null,
    carbs: null,
    fat: null,
    ...over,
  };
}

/** The data row for one Entry. */
const rowFor = (over: Partial<Entry>) => entriesToCsv([entry(over)]).split('\n')[1];

describe('entriesToCsv', () => {
  it('writes a header, one row per Entry and a trailing newline', () => {
    expect(entriesToCsv([entry({ name: 'Banana', kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 })])).toBe(
      'day,eaten_at,name,kcal,protein_g,carbs_g,fat_g\n2026-10-12,2026-10-12T07:30:00.000Z,Banana,89,1.1,23,0.3\n',
    );
  });

  it('leaves missing names and macros empty', () => {
    expect(rowFor({ kcal: 250 })).toBe('2026-10-12,2026-10-12T07:30:00.000Z,,250,,,');
  });

  it('quotes commas, quotes and line breaks', () => {
    expect(rowFor({ name: 'Toast, butter' })).toContain(',"Toast, butter",');
    expect(rowFor({ name: 'The "big" one' })).toContain(',"The ""big"" one",');
    expect(entriesToCsv([entry({ name: 'Two\nlines' })])).toContain(',"Two\nlines",');
    expect(entriesToCsv([entry({ name: 'Two\rlines' })])).toContain(',"Two\rlines",');
  });

  it.each(['=1+1', '+44 crisps', '-5 kcal bar', '@SUM(A1)', '\tTab', '\rReturn'])(
    'keeps a name starting %j from running as a formula',
    (name) => {
      const csv = entriesToCsv([entry({ name })]);
      expect(csv).toMatch(new RegExp(`,"?'${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"?,`));
    },
  );

  it('neutralises a formula that also needs quoting', () => {
    expect(rowFor({ name: '=HYPERLINK("http://x", "Click")' })).toContain(`,"'=HYPERLINK(""http://x"", ""Click"")",`);
  });

  it('leaves numbers as numbers, negative ones included', () => {
    expect(rowFor({ name: 'Adjustment', kcal: -120, protein: 0, carbs: -1.5, fat: 2 })).toBe(
      '2026-10-12,2026-10-12T07:30:00.000Z,Adjustment,-120,0,-1.5,2',
    );
  });
});
