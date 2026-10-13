import * as Haptics from 'expo-haptics';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { formatNumber, type Relog } from '@/domain/entry';
import { useAccent } from './accent';
import { BarcodeIcon, ClockIcon, PlusIcon, ScaleIcon, SearchIcon } from './icons';
import { color, family, radius, space, type } from './theme';

const SIZE = 50;
const GAP = 10;
const PAD = 8;
/** How far (px) from the finger an icon still swells, and by how much at most. */
const REACH = 95;
const SWELL = 0.42;

interface DockItem {
  key: string;
  label: string;
  icon: (tint: string) => ReactNode;
  primary?: boolean;
  onPress: () => void;
}

const centreOf = (i: number) => PAD + i * (SIZE + GAP) + SIZE / 2;

function DockButton({
  item,
  index,
  finger,
  press,
  accent,
}: {
  item: DockItem;
  index: number;
  finger: SharedValue<number>;
  press: SharedValue<number>;
  accent: { value: string; on: string };
}) {
  // Worked out here, on the JS thread; the style below runs on the UI thread and can only use plain values.
  const centre = centreOf(index);
  const style = useAnimatedStyle(() => {
    const near = finger.value < 0 ? 0 : Math.max(0, 1 - Math.abs(finger.value - centre) / REACH);
    // Ease the falloff so the icon under the finger leads and its neighbours follow.
    const swell = withSpring(1 + SWELL * near * near, { damping: 16, stiffness: 260 });
    return { transform: [{ translateY: -(near * near * SIZE * SWELL) / 2 }, { scale: swell }, { scale: 1 - press.value * 0.12 }] };
  });

  const bg = item.primary ? accent.value : '#2A2A2A';
  return (
    <Animated.View style={[styles.button, { backgroundColor: bg }, style]}>{item.icon(item.primary ? accent.on : color.text)}</Animated.View>
  );
}

interface DockProps {
  recents: readonly Relog[];
  onRelog: (relog: Relog) => void;
  onQuickAdd: () => void;
  onSearch: () => void;
  onScan: () => void;
  onWeighIn: () => void;
}

/**
 * macOS-style dock for logging. Slide a finger along it and the icons swell under it;
 * lift (or tap) to open one, which gives a small squeeze as it opens.
 */
export function Dock({ recents, onRelog, onQuickAdd, onSearch, onScan, onWeighIn }: DockProps) {
  const insets = useSafeAreaInsets();
  const accent = useAccent();
  const [recentOpen, setRecentOpen] = useState(false);

  const items: DockItem[] = [
    { key: 'recent', label: 'Recent', icon: (t) => <ClockIcon size={21} tint={t} />, onPress: () => setRecentOpen((o) => !o) },
    { key: 'search', label: 'Search', icon: (t) => <SearchIcon size={21} tint={t} />, onPress: onSearch },
    { key: 'add', label: 'Quick Add', icon: (t) => <PlusIcon size={24} tint={t} />, primary: true, onPress: onQuickAdd },
    { key: 'scan', label: 'Scan', icon: (t) => <BarcodeIcon size={21} tint={t} />, onPress: onScan },
    { key: 'weigh', label: 'Weigh-in', icon: (t) => <ScaleIcon size={21} tint={t} />, onPress: onWeighIn },
  ];
  const width = PAD * 2 + items.length * SIZE + (items.length - 1) * GAP;

  const finger = useSharedValue(-1);
  const presses = [useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0)];

  const indexAt = (x: number) => {
    'worklet';
    const i = Math.round((x - PAD - SIZE / 2) / (SIZE + GAP));
    return i >= 0 && i < items.length ? i : -1;
  };

  const launch = (i: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // A quick squeeze and spring back, like pressing a button.
    presses[i].set(withSequence(withTiming(1, { duration: 70 }), withSpring(0, { damping: 12, stiffness: 320 })));
    const item = items[i];
    if (item.key !== 'recent') setRecentOpen(false);
    item.onPress();
  };

  const tick = () => Haptics.selectionAsync();

  useAnimatedReaction(
    () => (finger.value < 0 ? -1 : indexAt(finger.value)),
    (i, prev) => {
      if (i !== prev && i >= 0) scheduleOnRN(tick);
    },
  );

  // A tap opens straight away. A slide swells the icons under the finger and opens the one
  // you lift off. Touch-down starts the swell either way, so it feels immediate.
  const tap = Gesture.Tap()
    .maxDistance(12)
    .onEnd((e, success) => {
      const i = indexAt(e.x);
      if (success && i >= 0) scheduleOnRN(launch, i);
    });

  const slide = Gesture.Pan()
    .minDistance(12)
    .onBegin((e) => {
      finger.set(e.x);
    })
    .onUpdate((e) => {
      finger.set(e.x);
    })
    .onEnd((e) => {
      const i = indexAt(e.x);
      if (i >= 0 && e.y > -SIZE && e.y < SIZE * 2) scheduleOnRN(launch, i);
    })
    .onFinalize(() => {
      finger.set(-1);
    });

  const gesture = Gesture.Simultaneous(slide, tap);

  const bottom = insets.bottom + space.md;

  return (
    <>
      {recentOpen && (
        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)} style={StyleSheet.absoluteFill}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setRecentOpen(false)} accessibilityLabel="Close recents" />
        </Animated.View>
      )}
      {recentOpen && (
        <Animated.View
          entering={FadeInDown.springify().damping(18)}
          exiting={FadeOutDown.duration(140)}
          style={[styles.recents, { bottom: bottom + SIZE + PAD * 2 + 18 + space.md }]}
        >
          <Text style={[type.eyebrow, { marginLeft: space.sm, marginBottom: 2 }]}>Recent</Text>
          {recents.length === 0 && <Text style={[type.label, styles.recentEmpty]}>Things you log show up here.</Text>}
          {recents.map((r) => (
            <Pressable
              key={r.signature}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setRecentOpen(false);
                onRelog(r);
              }}
              style={({ pressed }) => [styles.recentRow, pressed && { backgroundColor: color.cardRaised }]}
            >
              <Text style={[type.bodyStrong, { flex: 1 }]} numberOfLines={1}>
                {r.name}
              </Text>
              <Text style={type.small}>{formatNumber(r.kcal)} kcal</Text>
            </Pressable>
          ))}
        </Animated.View>
      )}

      <GestureDetector gesture={gesture}>
        <View
          style={[styles.dock, { bottom, width }]}
          accessibilityRole="toolbar"
          accessible={false}
        >
          {items.map((item, i) => (
            // Taps and slides both come through the pan gesture; this View only speaks to VoiceOver.
            <View
              key={item.key}
              accessible
              accessibilityLabel={item.label}
              accessibilityRole="button"
              onAccessibilityTap={() => launch(i)}
              style={styles.slot}
            >
              <DockButton item={item} index={i} finger={finger} press={presses[i]} accent={accent} />
              <Text style={styles.caption} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: GAP,
    padding: PAD,
    paddingBottom: PAD - 2,
    borderRadius: 34,
    // A step lighter than the cards, with a visible edge, so it stands out over any of them.
    backgroundColor: 'rgba(28,28,28,0.97)',
    borderWidth: 1,
    borderColor: '#2E2E2E',
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  button: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  slot: { width: SIZE, alignItems: 'center', gap: 4 },
  caption: { color: color.muted, fontFamily: family.medium, fontSize: 10, width: SIZE + GAP, textAlign: 'center' },
  recents: {
    position: 'absolute',
    alignSelf: 'center',
    width: 300,
    padding: space.sm,
    borderRadius: radius.lg,
    backgroundColor: color.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    gap: 2,
  },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.md, borderRadius: radius.md },
  recentEmpty: { paddingHorizontal: space.md, paddingVertical: space.sm },
});
