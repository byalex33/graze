import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dayKeyOf, isDayKey } from '@/domain/day';
import { lookupBarcode, OffError } from '@/food/open-food-facts';
import { rememberFood } from '@/food/registry';
import { FlashIcon } from '@/ui/icons';
import { color, radius, space, type } from '@/ui/theme';

type State = { kind: 'scanning' } | { kind: 'looking'; code: string } | { kind: 'missing'; code: string; reason: string };

const FOOD_BARCODES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

/** Point at a barcode; Open Food Facts fills in the rest. Params: `day`. */
export default function Scan() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ day?: string }>();
  const day = isDayKey(params.day) ? params.day : dayKeyOf(new Date());
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<State>({ kind: 'scanning' });
  const [torch, setTorch] = useState(false);
  const busy = useRef(false);

  const onScanned = async ({ data }: BarcodeScanningResult) => {
    if (busy.current) return;
    busy.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState({ kind: 'looking', code: data });
    try {
      const food = await lookupBarcode(data);
      if (food) {
        rememberFood(food);
        router.replace({ pathname: '/food', params: { id: food.id, day } });
        return;
      }
      setState({ kind: 'missing', code: data, reason: "Open Food Facts doesn't have this one yet." });
    } catch (e) {
      setState({ kind: 'missing', code: data, reason: e instanceof OffError ? e.message : 'Something went wrong.' });
    }
  };

  const scanAgain = () => {
    busy.current = false;
    setState({ kind: 'scanning' });
  };

  if (!permission) return <View style={styles.screen} />;

  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.centre, { padding: space.xl }]}>
        <Text style={[type.title, { textAlign: 'center' }]}>Camera access</Text>
        <Text style={[type.label, styles.centreText]}>Graze uses the camera only to read barcodes. Nothing is recorded.</Text>
        <Pressable
          onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
          style={styles.primary}
        >
          <Text style={[type.bodyStrong, { color: color.bg }]}>{permission.canAskAgain ? 'Allow camera' : 'Open Settings'}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: space.lg }}>
          <Text style={[type.body, { color: color.muted }]}>Not now</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: [...FOOD_BARCODES] }}
        onBarcodeScanned={state.kind === 'scanning' ? onScanned : undefined}
      />
      <View style={styles.shade} pointerEvents="none">
        <View style={styles.window} />
      </View>

      <View style={[styles.top, { paddingTop: insets.top + space.md }]}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Text style={type.bodyStrong}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Torch"
          accessibilityState={{ checked: torch }}
          hitSlop={10}
          onPress={() => {
            Haptics.selectionAsync();
            setTorch((on) => !on);
          }}
          style={[styles.torch, torch && styles.torchOn]}
        >
          <FlashIcon size={20} tint={torch ? color.bg : color.text} filled={torch} />
        </Pressable>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.xl }]}>
        {state.kind === 'scanning' && (
          <Animated.Text entering={FadeIn} style={[type.label, { color: color.soft }]}>
            Point at a barcode
          </Animated.Text>
        )}
        {state.kind === 'looking' && (
          <Animated.View entering={FadeInDown.springify()} style={styles.card}>
            <ActivityIndicator color={color.text} />
            <Text style={type.bodyStrong}>Looking up {state.code}</Text>
          </Animated.View>
        )}
        {state.kind === 'missing' && (
          <Animated.View entering={FadeInDown.springify()} style={[styles.card, { flexDirection: 'column', alignItems: 'stretch' }]}>
            <Text style={type.bodyStrong}>Not found</Text>
            <Text style={type.label}>{state.reason}</Text>
            <View style={styles.actions}>
              <Pressable onPress={scanAgain} style={styles.secondary}>
                <Text style={type.bodyStrong}>Scan again</Text>
              </Pressable>
              <Pressable onPress={() => router.replace({ pathname: '/entry', params: { day } })} style={[styles.primary, { flex: 1, marginTop: 0 }]}>
                <Text style={[type.bodyStrong, { color: color.bg }]}>Quick Add</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const WINDOW_W = 280;
const WINDOW_H = 170;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  centre: { alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg },
  centreText: { textAlign: 'center', marginTop: space.sm, marginBottom: space.xl },
  shade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  window: {
    width: WINDOW_W,
    height: WINDOW_H,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'rgba(250,250,250,0.9)',
    // A huge shadow-coloured border darkens everything outside the window.
    boxShadow: '0 0 0 2000px rgba(10,10,10,0.55)',
  },
  top: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  torch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,10,10,0.55)' },
  torchOn: { backgroundColor: color.text },
  bottom: { position: 'absolute', left: space.lg, right: space.lg, bottom: 0, alignItems: 'center' },
  card: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: color.card,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  primary: { backgroundColor: color.text, borderRadius: radius.pill, paddingVertical: space.md, paddingHorizontal: space.xl, alignItems: 'center', marginTop: space.md },
  secondary: { flex: 1, backgroundColor: color.cardRaised, borderRadius: radius.pill, paddingVertical: space.md, alignItems: 'center' },
});
