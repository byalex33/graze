import { dayKeyOf, type DayKey } from './day';

export interface Month {
  year: number;
  /** 0-based, like Date. */
  month: number;
}

/** The weeks of a month, Monday first, padded with nulls before the 1st and after the last day. */
export function monthWeeks({ year, month }: Month): (DayKey | null)[][] {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (DayKey | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => dayKeyOf(new Date(year, month, i + 1))),
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/** Months from `newest` back to `oldest` inclusive, newest first. */
export function monthsBack(newest: Month, oldest: Month): Month[] {
  const out: Month[] = [];
  let { year, month } = newest;
  while (year > oldest.year || (year === oldest.year && month >= oldest.month)) {
    out.push({ year, month });
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
  }
  return out;
}

export function monthOf(day: DayKey): Month {
  const [y, m] = day.split('-').map(Number);
  return { year: y, month: m - 1 };
}
