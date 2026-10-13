import type { Entry } from './entry';

/** Text a spreadsheet would run as a formula (OWASP CSV injection). */
const FORMULA_START = /^[=+\-@\t\r]/;

/** Text is quoted when needed and kept from running as a formula; numbers are left as numbers. */
function cell(value: string | number | null): string {
  if (value === null) return '';
  if (typeof value === 'number') return String(value);
  const s = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function entriesToCsv(entries: readonly Entry[]): string {
  const header = ['day', 'eaten_at', 'name', 'kcal', 'protein_g', 'carbs_g', 'fat_g'];
  const rows = entries.map((e) =>
    [e.day, new Date(e.eatenAt).toISOString(), e.name, e.kcal, e.protein, e.carbs, e.fat].map(cell).join(','),
  );
  return [header.join(','), ...rows].join('\n') + '\n';
}
