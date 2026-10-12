import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery } from '@/db/changes';
import { addEntry, deleteEntry, favourites, getEntry, isFavourite, setFavourite, updateEntry } from '@/db/repo';
import { dayKeyOf, dayLabel, eatenAtFor, type DayKey } from '@/domain/day';
import { formatNumber, signatureOf, type Nutrition, type Relog } from '@/domain/entry';
import { StarIcon } from '@/ui/icons';
import { color, radius, space, type } from '@/ui/theme';

/** "" → null; "12,5" → 12.5; nonsense → NaN. */
function parseAmount(text: string): number | null {
  const t = text.trim().replace(',', '.');
  return t === '' ? null : Number(t);
}

const asText = (n: number | null) => (n === null ? '' : String(n));

function Field({
  label, value, onChangeText, unit, autoFocus, keyboard = 'decimal-pad', placeholder,
}: {
  label: string; value: string; onChangeText: (t: string) => void; unit?: string;
  autoFocus?: boolean; keyboard?: 'decimal-pad' | 'default'; placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={[type.label, styles.fieldLabel]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
        keyboardType={keyboard}
        placeholder={placeholder}
        placeholderTextColor={color.faint}
        selectionColor={color.text}
        keyboardAppearance="dark"
        style={[type.body, styles.input]}
      />
      {unit && <Text style={type.label}>{unit}</Text>}
    </View>
  );
}

/**
 * Quick Add, or edit an existing Entry.
 * Params: `id` to edit; otherwise `day` is the Day to log to.
 */
export default function EntryScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; day?: DayKey }>();
  const editingId = params.id;
  const day = params.day ?? dayKeyOf(new Date());

  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [starred, setStarred] = useState(false);
  const [entryDay, setEntryDay] = useState<DayKey>(day);
  const loaded = useRef(!editingId);

  const favs = useQuery(favourites, []);

  // Android keeps the keyboard up over the previous screen unless it's dismissed first.
  const close = () => {
    Keyboard.dismiss();
    router.back();
  };

  useEffect(() => {
    if (!editingId) return;
    (async () => {
      const e = await getEntry(db, editingId);
      if (!e) return close();
      setName(e.name ?? '');
      setKcal(asText(e.kcal));
      setProtein(asText(e.protein));
      setCarbs(asText(e.carbs));
      setFat(asText(e.fat));
      setEntryDay(e.day);
      const sig = signatureOf(e);
      setStarred(sig ? await isFavourite(db, sig) : false);
      loaded.current = true;
    })();
  }, [db, editingId]);

  const values = {
    kcal: parseAmount(kcal),
    protein: parseAmount(protein),
    carbs: parseAmount(carbs),
    fat: parseAmount(fat),
  };
  const valid =
    values.kcal !== null && values.kcal >= 0 &&
    [values.kcal, values.protein, values.carbs, values.fat].every((v) => v === null || (Number.isFinite(v) && v >= 0));
  const trimmedName = name.trim() || null;

  const save = async () => {
    if (!valid || !loaded.current) return;
    const nutrition = values as Nutrition;
    if (editingId) {
      await updateEntry(db, editingId, { ...nutrition, name: trimmedName });
    } else {
      await addEntry(db, {
        ...nutrition,
        day,
        eatenAt: eatenAtFor(day).getTime(),
        name: trimmedName,
        foodId: null,
        portion: null,
      });
    }
    if (trimmedName) await setFavourite(db, { ...nutrition, name: trimmedName, foodId: null }, starred);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    close();
  };

  const relogFavourite = async (f: Relog) => {
    await addEntry(db, { ...f, day, eatenAt: eatenAtFor(day).getTime() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    close();
  };

  const confirmDelete = () =>
    Alert.alert('Delete this entry?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(db, editingId!);
          close();
        },
      },
    ]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { paddingTop: Platform.OS === 'android' ? insets.top : 0 }]}
    >
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={close}>
          <Text style={[type.body, { color: color.muted }]}>Cancel</Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={type.bodyStrong}>{editingId ? 'Edit' : 'Quick Add'}</Text>
          <Text style={type.small}>{dayLabel(entryDay)}</Text>
        </View>
        <Pressable hitSlop={12} disabled={!valid} onPress={save}>
          <Text style={[type.bodyStrong, !valid && { color: color.faint }]}>Save</Text>
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        {!editingId && favs && favs.length > 0 && (
          <View style={{ gap: space.sm }}>
            <Text style={type.label}>Favourites</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.chips}>
              {favs.map((f) => (
                <Pressable
                  key={f.signature}
                  onPress={() => relogFavourite(f)}
                  style={({ pressed }) => [styles.chip, pressed && { opacity: 0.6 }]}
                >
                  <Text style={type.bodyStrong} numberOfLines={1}>{f.name}</Text>
                  <Text style={type.small}>{formatNumber(f.kcal)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.card}>
          <Field label="Name" value={name} onChangeText={setName} keyboard="default" placeholder="Optional" />
          <View style={styles.divider} />
          <Field label="Calories" value={kcal} onChangeText={setKcal} unit="kcal" autoFocus={!editingId} placeholder="0" />
        </View>

        <View style={styles.card}>
          <Field label="Protein" value={protein} onChangeText={setProtein} unit="g" placeholder="—" />
          <View style={styles.divider} />
          <Field label="Carbs" value={carbs} onChangeText={setCarbs} unit="g" placeholder="—" />
          <View style={styles.divider} />
          <Field label="Fat" value={fat} onChangeText={setFat} unit="g" placeholder="—" />
        </View>

        <Pressable
          disabled={!trimmedName}
          onPress={() => {
            Haptics.selectionAsync();
            setStarred((s) => !s);
          }}
          style={[styles.card, styles.favRow, !trimmedName && { opacity: 0.4 }]}
        >
          <StarIcon filled={starred && !!trimmedName} />
          <Text style={[type.body, { flex: 1 }]}>Favourite</Text>
          {!trimmedName && <Text style={type.small}>Needs a name</Text>}
        </Pressable>

        {editingId && (
          <Pressable onPress={confirmDelete} style={[styles.card, styles.deleteRow]}>
            <Text style={[type.body, { color: color.danger }]}>Delete entry</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  body: { padding: space.lg, gap: space.md },
  card: { backgroundColor: color.card, borderRadius: radius.md, paddingHorizontal: space.lg },
  field: { flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: space.md },
  fieldLabel: { width: 72, color: color.text },
  input: { flex: 1, textAlign: 'right', paddingVertical: space.md, fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: color.hairline },
  chips: { gap: space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    maxWidth: 220,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.pill,
    backgroundColor: color.card,
  },
  favRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52 },
  deleteRow: { minHeight: 52, justifyContent: 'center', alignItems: 'center' },
});
