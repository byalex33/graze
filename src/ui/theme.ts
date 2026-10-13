import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
} from '@expo-google-fonts/geist';
import { GeistMono_400Regular, GeistMono_500Medium, GeistMono_600SemiBold } from '@expo-google-fonts/geist-mono';
import { StyleSheet } from 'react-native';

/** Dark-only, monochrome. */
export const color = {
  bg: '#0A0A0A',
  card: '#111111',
  cardRaised: '#191919',
  hairline: '#1F1F1F',
  track: '#1C1C1C',
  text: '#FAFAFA',
  soft: '#B5B5B5',
  muted: '#7A7A7A',
  faint: '#3F3F3F',
  danger: '#FF6B6B',
} as const;

/** Heatmap levels, from nothing logged to the busiest days. */
export const heat = ['#161616', '#3A3A3A', '#6E6E6E', '#B0B0B0', '#FAFAFA'] as const;

export const fonts = {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  GeistMono_400Regular,
  GeistMono_500Medium,
  GeistMono_600SemiBold,
};

export const family = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
  monoSemibold: 'GeistMono_600SemiBold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;

export const type = StyleSheet.create({
  hero: { color: color.text, fontFamily: family.monoSemibold, fontSize: 64, letterSpacing: -3 },
  title: { color: color.text, fontFamily: family.semibold, fontSize: 22, letterSpacing: -0.5 },
  body: { color: color.text, fontFamily: family.regular, fontSize: 16 },
  bodyStrong: { color: color.text, fontFamily: family.medium, fontSize: 16 },
  label: { color: color.muted, fontFamily: family.regular, fontSize: 13 },
  eyebrow: { color: color.muted, fontFamily: family.medium, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  number: { color: color.text, fontFamily: family.monoMedium, fontSize: 15, letterSpacing: -0.3 },
  small: { color: color.muted, fontFamily: family.mono, fontSize: 12, letterSpacing: -0.2 },
});
