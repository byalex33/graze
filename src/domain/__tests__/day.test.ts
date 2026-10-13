import { addDays, dayKeyOf, dayLabel, daysBetween, eatenAtFor, notInFuture } from '../day';

describe('Day', () => {
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

describe('notInFuture', () => {
  const now = new Date(2026, 9, 13, 0, 5);

  it('leaves today and the past alone', () => {
    const past = new Date(2026, 9, 12, 19, 0).getTime();
    expect(notInFuture('2026-10-12', past, now)).toEqual({ day: '2026-10-12', eatenAt: past });
  });

  it('pulls a future Day back to today, at now', () => {
    const later = new Date(2026, 9, 14, 9, 0).getTime();
    expect(notInFuture('2026-10-14', later, now)).toEqual({ day: '2026-10-13', eatenAt: now.getTime() });
  });

  it('pulls a time later today back to now', () => {
    const tonight = new Date(2026, 9, 13, 23, 0).getTime();
    expect(notInFuture('2026-10-13', tonight, now)).toEqual({ day: '2026-10-13', eatenAt: now.getTime() });
  });
});
