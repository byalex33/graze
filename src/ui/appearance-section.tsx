import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { setAccentChoice } from '@/db/repo';
import { ACCENTS, useAccent, type AccentChoice, type AccentName } from './accent';
import { color, radius, space, type } from './theme';

const DOT = 34;
const CHOICES: AccentChoice[] = ['white', 'red', 'blue', 'green', 'yellow', 'purple', 'random'];
const RANDOM_SLICES: AccentName[] = ['red', 'yellow', 'green', 'blue', 'purple'];

/** A dot cut into one slice per colour Random can pick. */
function RandomDot({ size }: { size: number }) {
  const r = size / 2;
  const slice = (2 * Math.PI) / RANDOM_SLICES.length;
  return (
    <Svg width={size} height={size}>
      {RANDOM_SLICES.map((name, i) => {
        const a0 = i * slice - Math.PI / 2;
        const a1 = a0 + slice;
        const d = `M${r},${r} L${r + r * Math.cos(a0)},${r + r * Math.sin(a0)} A${r},${r} 0 0 1 ${r + r * Math.cos(a1)},${r + r * Math.sin(a1)} Z`;
        return <Path key={name} d={d} fill={ACCENTS[name].value} />;
      })}
    </Svg>
  );
}

/** Pick the accent colour. Changes everywhere straight away. */
export function AppearanceSection() {
  const db = useSQLiteContext();
  const accent = useAccent();

  const label =
    accent.choice === 'random' ? `Random · this time ${ACCENTS[accent.name].name.toLowerCase()}` : ACCENTS[accent.choice].name;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={[type.body, { flex: 1 }]}>Accent colour</Text>
        <Text style={type.label}>{label}</Text>
      </View>
      <View style={styles.dots}>
        {CHOICES.map((choice) => {
          const selected = accent.choice === choice;
          return (
            <Pressable
              key={choice}
              accessibilityRole="radio"
              accessibilityLabel={choice === 'random' ? 'Random' : ACCENTS[choice].name}
              accessibilityState={{ selected }}
              hitSlop={4}
              onPress={() => {
                Haptics.selectionAsync();
                setAccentChoice(db, choice);
              }}
              style={[styles.ring, selected && { borderColor: color.text }]}
            >
              {choice === 'random' ? (
                <RandomDot size={DOT} />
              ) : (
                <View style={[styles.dot, { backgroundColor: ACCENTS[choice].value }]} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.card, borderRadius: radius.md, paddingBottom: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: space.lg, gap: space.md },
  dots: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.lg },
  ring: { padding: 3, borderRadius: DOT, borderWidth: 2, borderColor: 'transparent' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
});
