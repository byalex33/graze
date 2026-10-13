import { indexMatch, indexTerms, productQueries } from '../product-query';

describe('productQueries', () => {
  it('requires every word in the name or brand, ranks by the words, and keeps to the UK', () => {
    expect(productQueries('Chicken Tikka')).toEqual([
      'chicken tikka (product_name.en:"chicken" OR brands:"chicken") AND (product_name.en:"tikka" OR brands:"tikka") AND countries_tags:"en:united-kingdom"',
    ]);
  });

  it('skips filler words and stray punctuation', () => {
    const [q] = productQueries('bacon and brie, with  chutney!');
    expect(q.startsWith('bacon brie chutney ')).toBe(true);
    expect(q).not.toMatch(/"and"|"with"/);
  });

  it("matches brands however the apostrophe is written", () => {
    const [q] = productQueries('Sainsbury’s brie');
    expect(q).toContain(`brands:"sainsbury's"`);
    expect(q).toContain('brands:"sainsburys"');
    expect(q).toContain('brands:"sainsbury’s"');
    expect(productQueries('sainsburys brie')[0]).toContain(`brands:"sainsbury's"`);
  });

  it('falls back to ranking by supermarket when requiring it finds nothing', () => {
    const queries = productQueries("sainsbury's bacon and brie");
    expect(queries).toHaveLength(2);
    expect(queries[0]).toContain(`product_name.en:"sainsbury's"`);
    expect(queries[1].startsWith("sainsbury's bacon brie ")).toBe(true);
    expect(queries[1]).not.toContain(`product_name.en:"sainsbury's"`);
    expect(queries[1]).toContain('product_name.en:"brie"');
  });

  it('keeps a supermarket name required when it is all that was typed', () => {
    expect(productQueries('tesco')).toHaveLength(1);
  });

  it('keeps names like m&s and co-op whole', () => {
    expect(productQueries('m&s brie')[0]).toContain('brands:"m&s"');
    expect(productQueries('co-op brie')[0]).toContain('brands:"co-op"');
  });

  it('has nothing to search for without words', () => {
    expect(productQueries('  & , ')).toEqual([]);
    expect(productQueries('and the')).toEqual([]);
  });
});

describe('indexTerms', () => {
  it('reads words the way scripts/build-products.py indexes them', () => {
    expect(indexTerms("Sainsbury’s Brie, Bacon & Chilli")).toEqual(['sainsburys', 'brie', 'bacon', 'chilli']);
    expect(indexTerms('M&S Café Crème')).toEqual(['ms', 'cafe', 'creme']);
    expect(indexTerms("Ben & Jerry's  co-op")).toEqual(['ben', 'jerrys', 'co', 'op']);
  });
});

describe('indexMatch', () => {
  it('requires every word typed as a word prefix, skipping filler', () => {
    expect(indexMatch("sainsbury's bacon and bri")).toBe('"sainsburys"* "bacon"* "bri"*');
  });

  it('drops stray letters unless that is all there is', () => {
    expect(indexMatch('m & s brie')).toBe('"brie"*');
    expect(indexMatch('b')).toBe('"b"*');
  });

  it('has nothing to match without words', () => {
    expect(indexMatch(' & ')).toBeNull();
    expect(indexMatch('and')).toBeNull();
  });
});
