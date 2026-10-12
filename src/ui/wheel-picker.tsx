import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { color, radius } from './theme';

const ITEM_HEIGHT = 40;
const VISIBLE = 5;

interface WheelPickerProps {
  values: readonly number[];
  value: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  width?: number;
}

function WheelItem({ index, label, scrollY }: { index: number; label: string; scrollY: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const d = index - scrollY.value / ITEM_HEIGHT;
    return {
      opacity: interpolate(Math.abs(d), [0, 1, 2, 3], [1, 0.55, 0.25, 0], Extrapolation.CLAMP),
      transform: [
        { perspective: 600 },
        { rotateX: `${interpolate(d, [-3, 0, 3], [60, 0, -60], Extrapolation.CLAMP)}deg` },
        { scale: interpolate(Math.abs(d), [0, 2], [1, 0.9], Extrapolation.CLAMP) },
      ],
    };
  });
  return (
    <Animated.View style={[styles.item, style]}>
      <Text style={styles.itemText}>{label}</Text>
    </Animated.View>
  );
}

/** An iOS-style drum. Spins freely, snaps to a value, ticks a haptic on each step. */
export function WheelPicker({ values, value, onChange, format = String, width = 120 }: WheelPickerProps) {
  const initialIndex = Math.max(0, values.indexOf(value));
  const scrollY = useSharedValue(initialIndex * ITEM_HEIGHT);
  const lastIndex = useSharedValue(initialIndex);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  useAnimatedReaction(
    () => Math.round(scrollY.value / ITEM_HEIGHT),
    (index) => {
      if (index !== lastIndex.value && index >= 0 && index < values.length) {
        lastIndex.value = index;
        scheduleOnRN(Haptics.selectionAsync);
      }
    },
  );

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.min(values.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT)));
    if (values[index] !== value) onChange(values[index]);
  };

  return (
    <View style={[styles.frame, { width }]}>
      <View pointerEvents="none" style={styles.band} />
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: initialIndex * ITEM_HEIGHT }}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE / 2) }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={(e) => {
          // A drag released without momentum never fires onMomentumScrollEnd on Android.
          if (!e.nativeEvent.velocity || Math.abs(e.nativeEvent.velocity.y) < 0.05) settle(e);
        }}
      >
        {values.map((v, i) => (
          <WheelItem key={v} index={i} label={format(v)} scrollY={scrollY} />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

export function range(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let v = from; v <= to; v += step) out.push(v);
  return out;
}

const styles = StyleSheet.create({
  frame: { height: ITEM_HEIGHT * VISIBLE, overflow: 'hidden' },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * Math.floor(VISIBLE / 2),
    height: ITEM_HEIGHT,
    borderRadius: radius.sm,
    backgroundColor: color.cardRaised,
  },
  item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  itemText: { color: color.text, fontSize: 22, fontWeight: '500', fontVariant: ['tabular-nums'] },
});
