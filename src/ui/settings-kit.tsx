import { router } from 'expo-router';
import { Children, Fragment, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccentToast } from './accent-toast';
import { ChevronIcon } from './icons';
import { color, radius, space, type } from './theme';

/** A Settings page: back arrow (or Done at the top level), a title, an optional line of explanation. */
export function SettingsPage({ title, intro, root, children }: { title: string; intro?: string; root?: boolean; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingTop: (Platform.OS === 'android' ? insets.top : 0) + space.md, paddingBottom: insets.bottom + space.xxl * 2 },
        ]}
      >
        <View style={styles.nav}>
          {root ? (
            <View />
          ) : (
            <Pressable hitSlop={12} onPress={() => router.back()} accessibilityLabel="Back" style={styles.back}>
              <ChevronIcon direction="left" tint={color.text} size={22} />
            </Pressable>
          )}
          {root && (
            <Pressable hitSlop={12} onPress={() => router.back()}>
              <Text style={type.bodyStrong}>Done</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.title}>{title}</Text>
        {intro && <Text style={[type.label, styles.intro]}>{intro}</Text>}
        <View style={{ gap: space.xl }}>{children}</View>
      </ScrollView>
      <AccentToast />
    </View>
  );
}

/** A titled card of rows, with hairlines between them. */
export function Group({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: space.sm }}>
      {title && <Text style={[type.eyebrow, styles.groupTitle]}>{title}</Text>}
      <View style={styles.card}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={styles.divider} />}
            {row}
          </Fragment>
        ))}
      </View>
      {footer && <Text style={[type.small, styles.groupFooter]}>{footer}</Text>}
    </View>
  );
}

interface RowProps {
  icon?: ReactNode;
  label: string;
  value?: ReactNode;
  onPress?: () => void;
  /** Rows that open another page get a chevron. */
  opens?: boolean;
  danger?: boolean;
}

export function Row({ icon, label, value, onPress, opens, danger }: RowProps) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.cardRaised }]}
    >
      {icon && <View style={styles.iconWell}>{icon}</View>}
      <Text style={[type.body, { flex: 1 }, danger && { color: color.danger }]} numberOfLines={1}>
        {label}
      </Text>
      {typeof value === 'string' ? <Text style={type.label}>{value}</Text> : value}
      {opens && <ChevronIcon size={16} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  body: { paddingHorizontal: space.lg },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 32 },
  back: { marginLeft: -4 },
  title: { ...type.title, fontSize: 32, letterSpacing: -1, marginTop: space.md },
  intro: { marginTop: space.xs, lineHeight: 19 },
  groupTitle: { marginLeft: space.sm, marginTop: space.lg },
  groupFooter: { marginHorizontal: space.sm, lineHeight: 17 },
  card: { backgroundColor: color.card, borderRadius: radius.md, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: color.hairline, marginLeft: 56 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 54, paddingHorizontal: space.lg, gap: space.md },
  iconWell: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: color.cardRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
  },
});
