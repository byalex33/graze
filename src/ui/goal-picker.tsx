import { StyleSheet, Text, View } from 'react-native';

import type { Goal } from '@/domain/entry';
import { formatNumber } from '@/domain/entry';
import { color, space, type } from './theme';
import { range, WheelPicker } from './wheel-picker';

const KCAL_VALUES = range(1200, 4500, 50);
const PROTEIN_VALUES = range(40, 300, 5);

export const DEFAULT_GOAL: Goal = { kcal: 2000, protein: 120 };

export function GoalPicker({ goal, onChange }: { goal: Goal; onChange: (goal: Goal) => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.column}>
        <Text style={type.label}>Calories</Text>
        <WheelPicker
          values={KCAL_VALUES}
          value={goal.kcal}
          format={formatNumber}
          onChange={(kcal) => onChange({ ...goal, kcal })}
        />
        <Text style={styles.unit}>kcal</Text>
      </View>
      <View style={styles.column}>
        <Text style={type.label}>Protein</Text>
        <WheelPicker
          values={PROTEIN_VALUES}
          value={goal.protein}
          onChange={(protein) => onChange({ ...goal, protein })}
        />
        <Text style={styles.unit}>g</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: space.xxl },
  column: { alignItems: 'center', gap: space.sm },
  unit: { color: color.faint, fontSize: 13 },
});
