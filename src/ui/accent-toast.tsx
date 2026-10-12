import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ACCENTS, useAccent } from './accent';
import { color, radius, space, type } from './theme';

/**
 * "Colour changed to Blue", sliding up from the bottom. Rendered by each screen that can
 * be on top (Today and Settings), since Settings is a separate sheet.
 */
export function AccentToast({ offset = 0 }: { offset?: number }) {
  const { notice } = useAccent();
  const insets = useSafeAreaInsets();
  const shown = useSharedValue(0);

  useEffect(() => {
    const on = notice?.visible ?? false;
    shown.value = withTiming(on ? 1 : 0, { duration: on ? 260 : 220, easing: Easing.out(Easing.cubic) });
  }, [notice, shown]);

  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * 24 }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + space.lg + offset }, style]}>
      {notice && (
        <View style={styles.pill}>
          <View style={[styles.dot, { backgroundColor: ACCENTS[notice.name].value }]} />
          <Text style={type.bodyStrong}>Colour changed to {ACCENTS[notice.name].name}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.pill,
    backgroundColor: color.cardRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
