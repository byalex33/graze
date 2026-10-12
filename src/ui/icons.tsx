import Svg, { Circle, Path } from 'react-native-svg';

import { color } from './theme';

interface IconProps {
  size?: number;
  tint?: string;
}

const stroke = (tint: string) => ({
  stroke: tint,
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

export function PlusIcon({ size = 24, tint = color.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 5v14M5 12h14" {...stroke(tint)} strokeWidth={2.2} />
    </Svg>
  );
}

export function GearIcon({ size = 22, tint = color.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={3} {...stroke(tint)} />
      <Path
        d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
        {...stroke(tint)}
      />
    </Svg>
  );
}

export function PencilIcon({ size = 20, tint = color.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" {...stroke(tint)} />
    </Svg>
  );
}

export function StarIcon({ size = 22, tint = color.text, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z"
        {...stroke(tint)}
        fill={filled ? tint : 'none'}
      />
    </Svg>
  );
}

export function ChevronIcon({ size = 18, tint = color.muted, direction = 'right' }: IconProps & { direction?: 'left' | 'right' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={direction === 'right' ? 'M9 5l7 7-7 7' : 'M15 5l-7 7 7 7'} {...stroke(tint)} />
    </Svg>
  );
}

export function SearchIcon({ size = 20, tint = color.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={11} cy={11} r={6.5} {...stroke(tint)} />
      <Path d="M16 16l4.5 4.5" {...stroke(tint)} />
    </Svg>
  );
}

export function BarcodeIcon({ size = 20, tint = color.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2" {...stroke(tint)} />
      <Path d="M8 8v8M11 8v8M14 8v8M16.5 8v8" {...stroke(tint)} />
    </Svg>
  );
}

export function BellIcon({ size = 20, tint = color.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 20.5a2 2 0 0 0 4 0" {...stroke(tint)} />
    </Svg>
  );
}

export function ScaleIcon({ size = 20, tint = color.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" {...stroke(tint)} />
      <Path d="M8.5 9a5 5 0 0 1 7 0M12 9.5l1.2-2" {...stroke(tint)} />
    </Svg>
  );
}
