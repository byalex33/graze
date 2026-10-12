/** The optional sections of the Today screen. Calories left and the Entries are always shown. */
export const TODAY_SECTIONS = [
  { key: 'dayBar', label: 'Day bar', detail: 'What your day was made of, against the Goal' },
  { key: 'burned', label: 'Burned and Net', detail: 'Needs Apple Health or Health Connect' },
  { key: 'macros', label: 'Protein, carbs and fat', detail: 'The three tiles under the bar' },
  { key: 'trend', label: 'Daily average', detail: 'Last 14 days as a sparkline' },
  { key: 'weight', label: 'Weight trend', detail: 'Shown once you have a weigh-in' },
  { key: 'heatmap', label: 'Logged days', detail: '20 weeks at a glance' },
] as const;

export type TodaySection = (typeof TODAY_SECTIONS)[number]['key'];
export type TodayLayout = Record<TodaySection, boolean>;

export const DEFAULT_TODAY_LAYOUT: TodayLayout = {
  dayBar: true,
  burned: true,
  macros: true,
  trend: true,
  weight: true,
  heatmap: true,
};
