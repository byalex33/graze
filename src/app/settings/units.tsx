import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';

import { useQuery } from '@/db/changes';
import { getWeightUnit, setWeightUnit } from '@/db/repo';
import type { WeightUnit } from '@/domain/weight';
import { useAccent } from '@/ui/accent';
import { CheckIcon } from '@/ui/icons';
import { Group, Row, SettingsPage } from '@/ui/settings-kit';

const UNITS: { unit: WeightUnit; label: string }[] = [
  { unit: 'st', label: 'Stones and pounds' },
  { unit: 'kg', label: 'Kilograms' },
  { unit: 'lb', label: 'Pounds' },
];

export default function UnitSettings() {
  const db = useSQLiteContext();
  const accent = useAccent();
  const unit = useQuery(getWeightUnit, []);

  return (
    <SettingsPage title="Weight unit" intro="How weigh-ins are shown. They're stored the same way whichever you pick.">
      <Group>
        {UNITS.map((u) => (
          <Row
            key={u.unit}
            label={u.label}
            value={unit === u.unit ? <CheckIcon size={18} tint={accent.value} /> : undefined}
            onPress={() => {
              Haptics.selectionAsync();
              setWeightUnit(db, u.unit);
            }}
          />
        ))}
      </Group>
    </SettingsPage>
  );
}
