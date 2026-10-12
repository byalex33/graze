import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatNumber, type Relog } from '@/domain/entry';
import { BarcodeIcon, PencilIcon, PlusIcon, SearchIcon } from './icons';
import { color, radius, space, type } from './theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const FAB_SIZE = 60;

interface FabMenuProps {
  /** Top Recents for this time of day, best first. */
  recents: readonly Relog[];
  onRelog: (relog: Relog) => void;
  onQuickAdd: () => void;
  onSearch: () => void;
  onScan: () => void;
  /** Android only: the view the frosted screen blurs. */
  blurTarget: RefObject<View | null>;
}

/**
 * The + folds into a ×, and its actions unfold upward over a frosted screen.
 * Recents sit above the actions so re-logging stays two taps.
 */
export function FabMenu({ recents, onRelog, onQuickAdd, onSearch, onScan, blurTarget }: FabMenuProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const turn = useSharedValue(0);

  useEffect(() => {
    turn.value = withSpring(open ? 1 : 0, { damping: 16, stiffness: 220 });
  }, [open, turn]);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 135}deg` }, { scale: 1 - turn.value * 0.08 }],
  }));

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen((o) => !o);
  };

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  const actions: { key: string; label: string; detail?: string; icon?: ReactNode; onPress: () => void }[] = [
    ...recents.map((r) => ({
      key: r.signature,
      label: r.name,
      detail: `${formatNumber(r.kcal)} kcal`,
      onPress: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onRelog(r);
      },
    })),
    { key: 'search', label: 'Search', icon: <SearchIcon size={18} />, onPress: onSearch },
    { key: 'scan', label: 'Scan barcode', icon: <BarcodeIcon size={18} />, onPress: onScan },
    { key: 'quick-add', label: 'Quick Add', icon: <PencilIcon size={18} tint={color.bg} />, onPress: onQuickAdd },
  ];

  const bottom = insets.bottom + space.lg;

  return (
    <>
      {open && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(160)} style={StyleSheet.absoluteFill}>
          <BlurView
            intensity={40}
            tint="dark"
            blurMethod="dimezisBlurViewSdk31Plus"
            blurTarget={blurTarget}
            style={StyleSheet.absoluteFill}
          />
          <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={() => setOpen(false)} />
          <View style={[styles.stack, { bottom: bottom + FAB_SIZE + space.lg }]} pointerEvents="box-none">
            {recents.length > 0 && (
              <Animated.Text
                entering={FadeInDown.delay(actions.length * 35).duration(200)}
                exiting={FadeOut.duration(100)}
                style={[type.label, styles.heading]}
              >
                Recent
              </Animated.Text>
            )}
            {actions.map((a, i) => (
              <Animated.View
                key={a.key}
                entering={FadeInDown.delay((actions.length - 1 - i) * 35).springify().damping(18)}
                exiting={FadeOutDown.duration(120)}
                style={styles.actionWrap}
              >
                <Pressable
                  onPress={() => choose(a.onPress)}
                  style={({ pressed }) => [
                    styles.action,
                    a.key === 'quick-add' && styles.primaryAction,
                    a.key === 'search' && recents.length > 0 && styles.firstTool,
                    pressed && styles.pressed,
                  ]}
                >
                  {a.icon}
                  <Text
                    numberOfLines={1}
                    style={[type.bodyStrong, a.key === 'quick-add' && { color: color.bg }, styles.actionLabel]}
                  >
                    {a.label}
                  </Text>
                  {a.detail && <Text style={type.small}>{a.detail}</Text>}
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      )}
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={open ? 'Close menu' : 'Log something'}
        onPress={toggle}
        style={[styles.fab, { bottom }, fabStyle]}
      >
        <PlusIcon tint={color.bg} size={26} />
      </AnimatedPressable>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(10,10,10,0.45)' },
  stack: { position: 'absolute', right: space.lg, left: space.xxl * 2, alignItems: 'flex-end', gap: space.sm },
  heading: { marginRight: space.sm, marginBottom: -2 },
  actionWrap: { maxWidth: '100%' },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    maxWidth: '100%',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.pill,
    backgroundColor: color.cardRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
  },
  primaryAction: { backgroundColor: color.text, borderColor: color.text },
  firstTool: { marginTop: space.md },
  actionLabel: { flexShrink: 1 },
  pressed: { opacity: 0.7 },
  fab: {
    position: 'absolute',
    right: space.lg,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: color.text,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
