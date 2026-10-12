import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery } from '@/db/changes';
import { addEntry, getUnitOverride, isFavourite, setFavourite, setUnitOverride } from '@/db/repo';
import { dayKeyOf, dayLabel, eatenAtFor, type DayKey } from '@/domain/day';
import { formatNumber } from '@/domain/entry';
import { defaultPortion, entryName, nutritionFor, portionAmount, portionLabel, QUICK_AMOUNTS, withUnit, type Food, type Portion, type Unit } from '@/domain/food';
import { lookupBarcode } from '@/food/open-food-facts';
import { foodById, rememberFood } from '@/food/registry';
import { StarIcon } from '@/ui/icons';
import { RollingNumber } from '@/ui/rolling-number';
import { color, family, radius, space, type } from '@/ui/theme';
import { WheelPicker } from '@/ui/wheel-picker';

const COUNTS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 10];

const formatCount = (n: number) => (n === 0.25 ? '¼' : n === 0.5 ? '½' : n === 0.75 ? '¾' : String(n));

function Macro({ label, value }: { label: string; value: number | null }) {
  return (
    <View style={styles.macro}>
      <Text style={type.eyebrow}>{label}</Text>
      <Text style={styles.macroValue}>
        {value === null ? '—' : formatNumber(value)}
        <Text style={type.small}>{value === null ? '' : ' g'}</Text>
      </Text>
    </View>
  );
}

/** Pick how much of a Food you had, see what that comes to, log it. Params: `id`, `day`. */
export default function FoodScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; day?: DayKey }>();
  const day = params.day ?? dayKeyOf(new Date());
  // Search results lack serving and pack sizes; the full product record has them.
  const [fresh, setFresh] = useState<Food | null>(null);
  useEffect(() => {
    if (!params.id.startsWith('off:')) return;
    let cancelled = false;
    lookupBarcode(params.id.slice(4))
      .then((full) => {
        if (full && !cancelled) {
          rememberFood(full);
          setFresh(full);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [params.id]);
  const found = fresh ?? foodById(params.id);
  const savedUnit = useQuery((d) => getUnitOverride(d, params.id), [params.id]);
  const [chosenUnit, setChosenUnit] = useState<Unit | null>(null);
  const unit = chosenUnit ?? savedUnit ?? found?.unit;
  const food = found && unit ? withUnit(found, unit) : null;

  const [chosenPortion, setPortion] = useState<Portion | null>(null);
  const portion = chosenPortion ?? (food ? defaultPortion(food) : null);
  const [amountText, setAmountText] = useState<string | null>(null);
  const shownAmount = amountText ?? (portion?.kind === 'amount' ? String(portion.amount) : String(QUICK_AMOUNTS[food?.unit ?? 'g'][1]));
  const starredInDb = useQuery((d) => isFavourite(d, `food:${params.id}`), [params.id]);
  const [starred, setStarred] = useState<boolean | null>(null);
  const isStarred = starred ?? starredInDb ?? false;

  if (savedUnit === undefined && found) return <View style={styles.screen} />;
  if (!food || !portion) {
    return (
      <View style={[styles.screen, styles.centre]}>
        <Text style={type.body}>That food isn&apos;t available any more.</Text>
        <Pressable onPress={() => router.back()}><Text style={[type.bodyStrong, { marginTop: space.lg }]}>Go back</Text></Pressable>
      </View>
    );
  }

  const n = nutritionFor(food, portion);

  const log = async () => {
    Keyboard.dismiss();
    const entry = { ...n, name: entryName(food), foodId: food.id, portion: portionLabel(food, portion) };
    await addEntry(db, { ...entry, day, eatenAt: eatenAtFor(day).getTime() });
    if (starred !== null) await setFavourite(db, entry, starred);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.dismissAll();
  };

  const switchUnit = () => {
    const next: Unit = food.unit === 'g' ? 'ml' : 'g';
    Haptics.selectionAsync();
    setChosenUnit(next);
    setUnitOverride(db, food.id, next);
    setAmountText(null);
    setPortion(defaultPortion(withUnit(food, next)));
  };

  const setAmount = (text: string) => {
    setAmountText(text);
    const v = Number(text.replace(',', '.'));
    if (Number.isFinite(v) && v > 0) setPortion({ kind: 'amount', amount: v });
  };

  return (
    <View style={[styles.screen, { paddingTop: Platform.OS === 'android' ? insets.top : 0, paddingBottom: insets.bottom + space.lg }]}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Text style={[type.body, { color: color.muted }]}>Back</Text>
        </Pressable>
        <Text style={type.small}>{dayLabel(day)}</Text>
        <Pressable
          hitSlop={12}
          accessibilityLabel={isStarred ? 'Remove from favourites' : 'Add to favourites'}
          onPress={() => {
            Haptics.selectionAsync();
            const next = !isStarred;
            setStarred(next);
            setFavourite(db, { ...n, name: entryName(food), foodId: food.id, portion: portionLabel(food, portion) }, next);
          }}
        >
          <StarIcon filled={isStarred} />
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <View style={{ gap: space.xs }}>
          {food.brand && <Text style={type.eyebrow}>{food.brand}</Text>}
          <Text style={type.title}>{food.name}</Text>
          <View style={styles.perRow}>
            <Text style={type.small}>
              {formatNumber(food.per100.kcal)} kcal per 100 {food.unit}
              {food.id.startsWith('cofid:') ? ' · UK generic' : ''}
            </Text>
            <Pressable onPress={switchUnit} hitSlop={8} style={styles.unitChip}>
              <Text style={type.small}>{food.unit === 'g' ? 'It’s a drink' : 'It’s food'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.hero}>
          <RollingNumber value={n.kcal} style={type.hero} />
          <Text style={styles.heroUnit}>kcal</Text>
        </View>
        <View style={styles.macros}>
          <Macro label="Protein" value={n.protein} />
          <Macro label="Carbs" value={n.carbs} />
          <Macro label="Fat" value={n.fat} />
        </View>

        {food.servings.length > 0 && (
          <View style={styles.segmented}>
            {[...food.servings.map((sv) => ({ key: sv.label, serving: sv })), { key: food.unit, serving: null }].map(({ key, serving: sv }) => {
              const on = sv ? portion.kind === 'serving' && portion.serving.label === sv.label : portion.kind === 'amount';
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPortion(sv ? { kind: 'serving', serving: sv, count: 1 } : { kind: 'amount', amount: Number(shownAmount) || QUICK_AMOUNTS[food.unit][1] });
                  }}
                  style={[styles.segment, on && styles.segmentOn]}
                >
                  <Text numberOfLines={1} style={[type.bodyStrong, { color: on ? color.bg : color.muted }]}>
                    {key}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {portion.kind === 'serving' ? (
          <View style={styles.wheelRow}>
            <WheelPicker
              values={COUNTS}
              value={portion.count}
              format={formatCount}
              onChange={(count) => setPortion({ ...portion, count })}
            />
            <Text style={type.label}>
              × {portion.serving.label}
              {'\n'}
              <Text style={type.small}>= {formatNumber(portionAmount(portion))} {food.unit}</Text>
            </Text>
          </View>
        ) : (
          <View style={{ gap: space.md }}>
            <View style={styles.amountField}>
              <TextInput
                value={shownAmount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                keyboardAppearance="dark"
                selectionColor={color.text}
                style={styles.amountInput}
              />
              <Text style={type.label}>{food.unit}</Text>
            </View>
            <View style={styles.chips}>
              {QUICK_AMOUNTS[food.unit].map((a) => (
                <Pressable key={a} onPress={() => setAmount(String(a))} style={[styles.chip, portion.amount === a && styles.chipOn]}>
                  <Text style={[type.number, { color: portion.amount === a ? color.bg : color.text }]}>{a}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <Pressable onPress={log} style={({ pressed }) => [styles.logButton, pressed && { opacity: 0.85 }]}>
        <Text style={[type.bodyStrong, { color: color.bg }]}>Log {portionLabel(food, portion)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  centre: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md },
  body: { paddingHorizontal: space.lg, gap: space.xl, paddingBottom: space.xl },
  hero: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  heroUnit: { ...type.small, fontSize: 15, marginBottom: 12 },
  macros: { flexDirection: 'row', gap: space.sm, marginTop: -space.md },
  macro: { flex: 1, backgroundColor: color.card, borderRadius: radius.md, padding: space.md, gap: 6 },
  macroValue: { ...type.number, fontSize: 20, letterSpacing: -0.8 },
  perRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  unitChip: { paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: color.faint },
  segmented: { flexDirection: 'row', backgroundColor: color.card, borderRadius: radius.pill, padding: 4 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: space.sm, borderRadius: radius.pill },
  segmentOn: { backgroundColor: color.text },
  wheelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.lg },
  amountField: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: space.sm },
  amountInput: { color: color.text, fontFamily: family.monoSemibold, fontSize: 44, letterSpacing: -2, minWidth: 80, textAlign: 'center' },
  chips: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  chip: { paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.pill, backgroundColor: color.card },
  chipOn: { backgroundColor: color.text },
  logButton: { marginHorizontal: space.lg, backgroundColor: color.text, borderRadius: radius.pill, paddingVertical: space.lg, alignItems: 'center' },
});
