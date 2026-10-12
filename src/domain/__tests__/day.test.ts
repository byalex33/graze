import { addDays, dayKeyOf, dayLabel, daysBetween, eatenAtFor, isDayKey } from '../day';

describe('Day', () => {
  it('recognises only real calendar dates as DayKeys', () => {
    expect(isDayKey('2026-10-12')).toBe(true);
    expect(isDayKey('2028-02-29')).toBe(true);
    expect(isDayKey('2026-02-30')).toBe(false);
    expect(isDayKey('2026-1-5')).toBe(false);
    expect(isDayKey('junk')).toBe(false);
    expect(isDayKey(undefined)).toBe(false);
    expect(isDayKey(['2026-10-12'])).toBe(false);
  });

  it('belongs to the local calendar date, so a 00:40 snack is the new Day', () => {
    expect(dayKeyOf(new Date(2026, 9, 12, 0, 40))).toBe('2026-10-12');
    expect(dayKeyOf(new Date(2026, 9, 11, 23, 59))).toBe('2026-10-11');
  });

  it('steps across month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('counts whole days across a DST change', () => {
    // UK clocks go back on 25 Oct 2026.
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
  });

  it('labels Today, Yesterday, then dates', () => {
    expect(dayLabel('2026-10-12', '2026-10-12')).toBe('Today');
    expect(dayLabel('2026-10-11', '2026-10-12')).toBe('Yesterday');
    expect(dayLabel('2026-10-06', '2026-10-12')).toBe('Tue 6 Oct');
    expect(dayLabel('2025-12-24', '2026-10-12')).toBe('Wed 24 Dec 2025');
  });
});

describe('eatenAtFor', () => {
  const now = new Date(2026, 9, 12, 19, 30, 15);

  it('is now when logging to today', () => {
    expect(eatenAtFor('2026-10-12', now)).toBe(now);
  });

  it('is the same clock time on a past Day, so a forgotten dinner lands yesterday', () => {
    const at = eatenAtFor('2026-10-11', now);
    expect(dayKeyOf(at)).toBe('2026-10-11');
    expect([at.getHours(), at.getMinutes()]).toEqual([19, 30]);
  });
});
