/** The optional parts of the Today screen. The rings and the Entries are always shown. */
export const TODAY_SECTIONS = [
  { key: 'macros', label: 'Carbs and fat', detail: 'In the line under the rings' },
  { key: 'burned', label: 'Burned and Net', detail: 'Needs Apple Health or Health Connect' },
  { key: 'trend', label: 'Daily average', detail: 'Last 14 days as a sparkline' },
  { key: 'weight', label: 'Weight trend', detail: 'Shown once you have a weigh-in' },
  { key: 'heatmap', label: 'Logged days', detail: '20 weeks at a glance' },
] as const;

export type TodaySection = (typeof TODAY_SECTIONS)[number]['key'];
export type TodayLayout = Record<TodaySection, boolean>;

export const DEFAULT_TODAY_LAYOUT: TodayLayout = {
  burned: true,
  macros: true,
  trend: true,
  weight: true,
  heatmap: true,
};
