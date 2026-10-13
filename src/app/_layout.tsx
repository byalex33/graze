import { useFonts } from 'expo-font';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DATABASE_NAME, migrate } from '@/db/database';
import { startHealthSync } from '@/health/sync';
import { AccentProvider } from '@/ui/accent';
import { Intro } from '@/ui/intro';
import { color, fonts } from '@/ui/theme';

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: color.bg, card: color.bg, text: color.text, border: color.hairline, primary: color.text },
};

/** Mirrors Entries and Weigh-ins to the Health Store for as long as the app runs. */
function HealthSync() {
  const db = useSQLiteContext();
  useEffect(() => startHealthSync(db), [db]);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fonts);

  // The splash screen stays up until the first render with content.
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.bg }}>
      <ThemeProvider value={theme}>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate}>
          <AccentProvider>
          <StatusBar style="light" />
          <HealthSync />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="setup" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="entry" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
            <Stack.Screen name="search" options={{ presentation: 'modal' }} />
            <Stack.Screen name="food" options={{ presentation: 'modal' }} />
            <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            <Stack.Screen name="weigh-in" options={{ presentation: 'modal' }} />
            <Stack.Screen name="calendar" options={{ presentation: 'modal' }} />
          </Stack>
          {/* Plays once per launch over the app as it loads, then hides itself. */}
          <Intro />
          </AccentProvider>
        </SQLiteProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
