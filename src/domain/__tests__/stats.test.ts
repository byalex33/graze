import { averageLogged, heatLevel, heatmapWeeks, series } from '../stats';

describe('series', () => {
  it('lines up Days oldest first and leaves gaps where nothing was logged', () => {
    const stats = [
      { day: '2026-10-10', kcal: 1800, entries: 4 },
      { day: '2026-10-12', kcal: 2100, entries: 5 },
    ];
    expect(series(stats, '2026-10-12', 4)).toEqual([null, 1800, null, 2100]);
  });
});

describe('averageLogged', () => {
  it('ignores Days with nothing logged', () => {
    expect(averageLogged([null, 1800, null, 2200])).toBe(2000);
  });

  it('is null when nothing was logged at all', () => {
    expect(averageLogged([null, null])).toBeNull();
  });
});

describe('heatmapWeeks', () => {
  // 12 Oct 2026 is a Monday.
  it('ends with the week containing today, Monday first, future Days empty', () => {
    const grid = heatmapWeeks('2026-10-14', 2);
    expect(grid[0][0]).toBe('2026-10-05');
    expect(grid[1][0]).toBe('2026-10-12');
    expect(grid[1][2]).toBe('2026-10-14');
    expect(grid[1][3]).toBeNull();
  });

  it('handles today being a Sunday', () => {
    const grid = heatmapWeeks('2026-10-18', 1);
    expect(grid[0]).toEqual([
      '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18',
    ]);
  });
});

describe('heatLevel', () => {
  it('scales by number of Entries', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 12].map(heatLevel)).toEqual([0, 1, 2, 2, 3, 3, 4, 4]);
  });
});
