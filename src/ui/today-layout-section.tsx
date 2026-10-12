import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { Fragment, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useQuery } from '@/db/changes';
import { getTodayLayout, setTodayLayout } from '@/db/repo';
import { TODAY_SECTIONS, type TodayLayout, type TodaySection } from '@/domain/today-layout';
import { color, radius, space, type } from './theme';

/** Switch the optional sections of the Today screen on and off. */
export function TodayLayoutSection() {
  const db = useSQLiteContext();
  const saved = useQuery(getTodayLayout, []);
  const [local, setLocal] = useState<TodayLayout | null>(null);
  const layout = local ?? saved;
  if (!layout) return <View style={styles.card} />;

  const toggle = (key: TodaySection, on: boolean) => {
    Haptics.selectionAsync();
    const next = { ...layout, [key]: on };
    setLocal(next);
    setTodayLayout(db, next);
  };

  return (
    <View style={styles.card}>
      {TODAY_SECTIONS.map((s, i) => (
        <Fragment key={s.key}>
          {i > 0 && <View style={styles.divider} />}
          <View style={styles.row}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={type.body}>{s.label}</Text>
              <Text style={type.small}>{s.detail}</Text>
            </View>
            <Switch
              value={layout[s.key]}
              onValueChange={(on) => toggle(s.key, on)}
              trackColor={{ false: color.track, true: color.text }}
              thumbColor={layout[s.key] ? color.bg : color.muted}
              ios_backgroundColor={color.track}
            />
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.card, borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: space.lg, gap: space.md },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: color.hairline, marginLeft: space.lg },
});
