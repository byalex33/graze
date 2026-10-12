import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery } from '@/db/changes';
import { addEntry, entriesSince, favourites } from '@/db/repo';
import { dayKeyOf, eatenAtFor, type DayKey } from '@/domain/day';
import { formatNumber, type Relog } from '@/domain/entry';
import type { Food } from '@/domain/food';
import { rankRecents } from '@/domain/recents';
import { searchGeneric } from '@/food/generic';
import { searchProducts } from '@/food/open-food-facts';
import { rememberFood } from '@/food/registry';
import { SearchIcon, StarIcon } from '@/ui/icons';
import { color, radius, space, type } from '@/ui/theme';

const SEARCH_DELAY_MS = 600;

type Row =
  | { kind: 'heading'; key: string; title: string; busy?: boolean }
  | { kind: 'relog'; key: string; relog: Relog; starred: boolean }
  | { kind: 'food'; key: string; food: Food }
  | { kind: 'note'; key: string; text: string };

/** Search UK generic foods and Open Food Facts. Before typing, shows Favourites and Recents. */
export default function Search() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ day?: DayKey }>();
  const day = params.day ?? dayKeyOf(new Date());
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<{ query: string; foods: Food[]; error?: string } | null>(null);

  const favs = useQuery(favourites, []);
  const recentEntries = useQuery((d) => entriesSince(d, Date.now() - 60 * 86_400_000), []);
  const recents = recentEntries ? rankRecents(recentEntries, new Date(), 12) : [];

  const trimmed = query.trim();
  const generic = trimmed.length >= 2 ? searchGeneric(trimmed) : [];
  const searching = trimmed.length >= 3 && products?.query !== trimmed;

  useEffect(() => {
    if (trimmed.length < 3) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      searchProducts(trimmed, abort.signal)
        .then((foods) => setProducts({ query: trimmed, foods }))
        .catch((e: Error) => e.name !== 'AbortError' && setProducts({ query: trimmed, foods: [], error: e.message }));
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [trimmed]);

  const open = (food: Food) => {
    rememberFood(food);
    Keyboard.dismiss();
    router.push({ pathname: '/food', params: { id: food.id, day } });
  };

  const relog = async (r: Relog) => {
    await addEntry(db, { ...r, day, eatenAt: eatenAtFor(day).getTime() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Keyboard.dismiss();
    router.back();
  };

  const rows: Row[] = [];
  if (!trimmed) {
    const favSigs = new Set(favs?.map((f) => f.signature));
    if (favs?.length) {
      rows.push({ kind: 'heading', key: 'h-fav', title: 'Favourites' });
      favs.forEach((f) => rows.push({ kind: 'relog', key: `f-${f.signature}`, relog: f, starred: true }));
    }
    const freshRecents = recents.filter((r) => !favSigs.has(r.signature));
    if (freshRecents.length) {
      rows.push({ kind: 'heading', key: 'h-rec', title: 'Recent' });
      freshRecents.forEach((r) => rows.push({ kind: 'relog', key: `r-${r.signature}`, relog: r, starred: false }));
    }
    if (rows.length === 0) rows.push({ kind: 'note', key: 'n-empty', text: 'Search for a food or a product. Things you log show up here for next time.' });
  } else {
    if (generic.length) {
      rows.push({ kind: 'heading', key: 'h-gen', title: 'UK generic' });
      generic.forEach((f) => rows.push({ kind: 'food', key: f.id, food: f }));
    }
    if (trimmed.length >= 3) {
      rows.push({ kind: 'heading', key: 'h-off', title: 'Products', busy: searching });
      if (!searching && products?.error) rows.push({ kind: 'note', key: 'n-err', text: products.error });
      else if (!searching && products?.foods.length === 0) rows.push({ kind: 'note', key: 'n-none', text: 'No UK products found.' });
      if (!searching) products?.foods.forEach((f) => rows.push({ kind: 'food', key: f.id, food: f }));
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: Platform.OS === 'android' ? insets.top : 0 }]}>
      <View style={styles.header}>
        <View style={styles.field}>
          <SearchIcon tint={color.muted} size={18} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search foods"
            placeholderTextColor={color.faint}
            selectionColor={color.text}
            keyboardAppearance="dark"
            returnKeyType="search"
            autoCorrect={false}
            style={[type.body, styles.input]}
          />
        </View>
        <Pressable hitSlop={12} onPress={() => { Keyboard.dismiss(); router.back(); }}>
          <Text style={[type.body, { color: color.muted }]}>Cancel</Text>
        </Pressable>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          switch (item.kind) {
            case 'heading':
              return (
                <View style={styles.heading}>
                  <Text style={type.eyebrow}>{item.title}</Text>
                  {item.busy && <ActivityIndicator size="small" color={color.muted} />}
                </View>
              );
            case 'note':
              return <Text style={[type.label, styles.note]}>{item.text}</Text>;
            case 'relog':
              return (
                <Pressable onPress={() => relog(item.relog)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text numberOfLines={1} style={type.bodyStrong}>{item.relog.name}</Text>
                    <Text numberOfLines={1} style={type.small}>{item.relog.portion ?? 'Quick Add'}</Text>
                  </View>
                  {item.starred && <StarIcon size={16} filled tint={color.muted} />}
                  <Text style={type.number}>{formatNumber(item.relog.kcal)}</Text>
                </Pressable>
              );
            case 'food':
              return (
                <Animated.View entering={FadeIn.duration(180)}>
                  <Pressable onPress={() => open(item.food)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text numberOfLines={1} style={type.bodyStrong}>{item.food.name}</Text>
                      <Text numberOfLines={1} style={type.small}>
                        {item.food.brand ? `${item.food.brand} · ` : ''}per 100 {item.food.unit}
                      </Text>
                    </View>
                    <Text style={type.number}>{formatNumber(item.food.per100.kcal)}</Text>
                  </Pressable>
                </Animated.View>
              );
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: color.card,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
  },
  input: { flex: 1, paddingVertical: space.md },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  heading: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.lg, marginBottom: space.sm },
  note: { marginTop: space.lg, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.md, borderRadius: radius.md },
  pressed: { backgroundColor: color.card },
});
