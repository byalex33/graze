import { genericById, searchGeneric } from '../generic';

describe('searchGeneric (real CoFID data)', () => {
  it('puts foods named for the first word first', () => {
    const names = searchGeneric('banana').map((f) => f.name);
    expect(names[0].toLowerCase().startsWith('banana')).toBe(true);
  });

  it('matches every word typed, as word prefixes', () => {
    const names = searchGeneric('chick brea').map((f) => f.name.toLowerCase());
    expect(names.length).toBeGreaterThan(0);
    names.forEach((n) => expect(n).toMatch(/chick/));
    names.forEach((n) => expect(n).toMatch(/brea/));
  });

  it('round-trips by id with per-100 g nutrition', () => {
    const beans = genericById('cofid:13-532');
    expect(beans?.name).toBe('Baked beans, canned in tomato sauce');
    expect(beans?.per100.kcal).toBe(81);
    expect(beans?.unit).toBe('g');
  });

  it('measures drinks in ml but powders in g', () => {
    const find = (name: string) => searchGeneric(name, 200).find((f) => f.name === name);
    expect(find('Orange juice, chilled')?.unit).toBe('ml');
    expect(find('Milk, whole, pasteurised, average')?.unit).toBe('ml');
    expect(find('Lager, standard')?.unit).toBe('ml');
    expect(find('Drinking chocolate, powder')?.unit).toBe('g');
    expect(find('Squash, butternut, raw')?.unit).toBe('g');
  });

  it('finds nothing for nothing', () => {
    expect(searchGeneric('  ')).toEqual([]);
  });
});
