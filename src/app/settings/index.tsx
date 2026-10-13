import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';

import { useQuery } from '@/db/changes';
import { exportCsv } from '@/db/export';
import { deleteAllData, getGoal, getReminder, getTodayLayout, getWeightUnit } from '@/db/repo';
import { formatNumber } from '@/domain/entry';
import { TODAY_SECTIONS } from '@/domain/today-layout';
import { useHealthLinked } from '@/health/use-health';
import { healthStore } from '@/health/store';
import { ACCENTS, useAccent } from '@/ui/accent';
import { BellIcon, ExportIcon, HeartIcon, LayoutIcon, PaletteIcon, ScaleIcon, TargetIcon, TrashIcon } from '@/ui/icons';
import { Group, Row, SettingsPage } from '@/ui/settings-kit';
import { color, space, type } from '@/ui/theme';

const UNIT_LABEL = { st: 'st & lb', kg: 'kg', lb: 'lb' } as const;
const pad = (n: number) => String(n).padStart(2, '0');

/** Every setting on one calm list; each opens its own page. */
export default function Settings() {
  const db = useSQLiteContext();
  const accent = useAccent();
  const goal = useQuery(getGoal, []);
  const layout = useQuery(getTodayLayout, []);
  const reminder = useQuery(getReminder, []);
  const unit = useQuery(getWeightUnit, []);
  const healthLinked = useHealthLinked();

  const shownSections = layout ? TODAY_SECTIONS.filter((s) => layout[s.key]).length : null;

  const confirmDeleteAll = () =>
    Alert.alert(
      'Delete all data?',
      `Every entry, favourite, weigh-in and your goal are removed from this phone. Anything already in ${healthStore.name} stays there.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            await deleteAllData(db);
            router.dismissAll();
            router.replace('/setup');
          },
        },
      ],
    );

  return (
    <SettingsPage title="Settings" root>
      <Group title="You">
        <Row
          icon={<TargetIcon size={17} />}
          label="Daily goal"
          value={goal ? `${formatNumber(goal.kcal)} kcal · ${goal.protein} g` : ''}
          opens
          onPress={() => router.push('/settings/goal')}
        />
        <Row
          icon={<ScaleIcon size={17} />}
          label="Weight unit"
          value={unit ? UNIT_LABEL[unit] : ''}
          opens
          onPress={() => router.push('/settings/units')}
        />
      </Group>

      <Group title="Look">
        <Row
          icon={<PaletteIcon size={17} />}
          label="Accent colour"
          value={
            <View style={styles.accentValue}>
              <View style={[styles.swatch, { backgroundColor: accent.value }]} />
              <Text style={type.label}>{accent.choice === 'random' ? 'Random' : ACCENTS[accent.choice].name}</Text>
            </View>
          }
          opens
          onPress={() => router.push('/settings/appearance')}
        />
        <Row
          icon={<LayoutIcon size={17} />}
          label="Today screen"
          value={shownSections === null ? '' : `${shownSections} of ${TODAY_SECTIONS.length} shown`}
          opens
          onPress={() => router.push('/settings/today')}
        />
      </Group>

      <Group title="Reminders">
        <Row
          icon={<BellIcon size={17} />}
          label="Daily reminder"
          value={reminder ? (reminder.enabled ? `${pad(reminder.hour)}:${pad(reminder.minute)}` : 'Off') : ''}
          opens
          onPress={() => router.push('/settings/reminder')}
        />
      </Group>

      <Group title="Connections">
        <Row
          icon={<HeartIcon size={17} />}
          label={healthStore.name}
          value={healthLinked === undefined ? '' : healthLinked ? 'Connected' : 'Not connected'}
          opens
          onPress={() => router.push('/settings/health')}
        />
      </Group>

      <Group title="Your data">
        <Row icon={<ExportIcon size={17} />} label="Export as CSV" onPress={() => exportCsv(db)} />
        <Row icon={<TrashIcon size={17} tint={color.danger} />} label="Delete all data" danger onPress={confirmDeleteAll} />
      </Group>

      <View style={styles.footer}>
        <Text style={type.small}>Graze {Constants.expoConfig?.version ?? ''}</Text>
        <Text style={type.small}>
          Products from{' '}
          <Text style={styles.link} onPress={() => Linking.openURL('https://world.openfoodfacts.org')} accessibilityRole="link">
            Open Food Facts
          </Text>{' '}
          (ODbL)
        </Text>
        <Text style={type.small}>
          Made with ❤️ by{' '}
          <Text style={styles.link} onPress={() => Linking.openURL('https://alex.codes')} accessibilityRole="link">
            Alex
          </Text>
        </Text>
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  accentValue: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  swatch: { width: 12, height: 12, borderRadius: 6 },
  footer: { alignItems: 'center', gap: 4, marginTop: space.xl },
  link: { color: color.text, textDecorationLine: 'underline' },
});
