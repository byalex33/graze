import { Stack } from 'expo-router/stack';

import { color } from '@/ui/theme';

/** Settings is one sheet with its own stack: the list, and a page per setting. */
export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }} />;
}
