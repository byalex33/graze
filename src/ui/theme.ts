import { StyleSheet } from 'react-native';

/** Dark-only, monochrome. */
export const color = {
  bg: '#0A0A0A',
  card: '#111111',
  cardRaised: '#171717',
  hairline: '#1F1F1F',
  track: '#222222',
  text: '#FFFFFF',
  muted: '#8A8A8A',
  faint: '#4A4A4A',
  danger: '#FF6B6B',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

export const type = StyleSheet.create({
  hero: { color: color.text, fontSize: 44, fontWeight: '600', letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
  title: { color: color.text, fontSize: 22, fontWeight: '600', letterSpacing: -0.4 },
  body: { color: color.text, fontSize: 16 },
  bodyStrong: { color: color.text, fontSize: 16, fontWeight: '500' },
  label: { color: color.muted, fontSize: 13 },
  number: { color: color.text, fontSize: 16, fontVariant: ['tabular-nums'] },
  small: { color: color.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
});
