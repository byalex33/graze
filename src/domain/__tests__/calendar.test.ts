import { monthOf, monthsBack, monthWeeks } from '../calendar';

describe('monthWeeks', () => {
  it('starts weeks on Monday (October 2026 starts on a Thursday)', () => {
    const weeks = monthWeeks({ year: 2026, month: 9 });
    expect(weeks[0]).toEqual([null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    expect(weeks[weeks.length - 1]).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', null]);
    expect(weeks).toHaveLength(5);
  });

  it('handles a month that starts on Monday, and leap February', () => {
    const feb = monthWeeks({ year: 2027, month: 1 }); // 1 Feb 2027 is a Monday
    expect(feb[0][0]).toBe('2027-02-01');
    expect(monthWeeks({ year: 2028, month: 1 }).flat().filter(Boolean)).toHaveLength(29);
  });
});

describe('monthsBack', () => {
  it('lists newest first across a year boundary', () => {
    expect(monthsBack({ year: 2027, month: 1 }, { year: 2026, month: 10 })).toEqual([
      { year: 2027, month: 1 },
      { year: 2027, month: 0 },
      { year: 2026, month: 11 },
      { year: 2026, month: 10 },
    ]);
  });

  it('reads the month of a DayKey', () => {
    expect(monthOf('2026-10-13')).toEqual({ year: 2026, month: 9 });
  });
});
