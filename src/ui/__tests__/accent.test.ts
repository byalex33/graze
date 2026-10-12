import { pickRandomAccent } from '../accent';

describe('pickRandomAccent', () => {
  it('never picks white', () => {
    for (let i = 0; i < 50; i++) expect(pickRandomAccent(null)).not.toBe('white');
  });

  it('never repeats the previous colour', () => {
    for (let i = 0; i < 50; i++) expect(pickRandomAccent('blue')).not.toBe('blue');
  });

  it('can reach every colour', () => {
    const seen = new Set([0, 0.2, 0.4, 0.6, 0.8, 0.99].map((r) => pickRandomAccent(null, () => r)));
    expect([...seen].sort()).toEqual(['blue', 'green', 'purple', 'red', 'yellow']);
  });
});
