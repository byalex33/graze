import type { Entry } from './entry';

function cell(value: string | number | null): string {
  if (value === null) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function entriesToCsv(entries: readonly Entry[]): string {
  const header = ['day', 'eaten_at', 'name', 'kcal', 'protein_g', 'carbs_g', 'fat_g'];
  const rows = entries.map((e) =>
    [e.day, new Date(e.eatenAt).toISOString(), e.name, e.kcal, e.protein, e.carbs, e.fat].map(cell).join(','),
  );
  return [header.join(','), ...rows].join('\n') + '\n';
}
