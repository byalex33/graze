import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useAccent } from './accent';
import { color } from './theme';

const WIDTH = 50;
const HEIGHT = 30;
const THUMB = 24;
const INSET = (HEIGHT - THUMB) / 2;

/**
 * Graze's own on/off switch. The system one is sized differently on every iOS
 * version and never quite lines up with text; this one is the same everywhere.
 */
export function Toggle({ value, onValueChange, label }: { value: boolean; onValueChange: (on: boolean) => void; label: string }) {
  const accent = useAccent();
  const on = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    on.value = withSpring(value ? 1 : 0, { damping: 18, stiffness: 260 });
  }, [value, on]);

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [color.track, accent.value]),
  }));
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: on.value * (WIDTH - THUMB - INSET * 2) }],
    backgroundColor: interpolateColor(on.value, [0, 1], [color.muted, accent.on]),
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      onPress={() => {
        Haptics.selectionAsync();
        onValueChange(!value);
      }}
    >
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.thumb, thumb]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: WIDTH, height: HEIGHT, borderRadius: HEIGHT / 2, padding: INSET },
  thumb: { width: THUMB, height: THUMB, borderRadius: THUMB / 2 },
});
