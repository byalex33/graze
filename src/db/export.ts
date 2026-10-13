import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Alert } from 'react-native';

import { entriesToCsv } from '@/domain/csv';
import { dayKeyOf } from '@/domain/day';
import { allEntries } from './repo';

/**
 * Writes every Entry to a CSV in the cache and opens the share sheet.
 * Never rejects: a failure shows an alert. Dismissing the sheet isn't a failure.
 */
export async function exportCsv(db: SQLiteDatabase): Promise<void> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("Can't export", "Sharing isn't available on this device.");
      return;
    }
    const file = new File(Paths.cache, `graze-${dayKeyOf(new Date())}.csv`);
    file.create({ overwrite: true });
    file.write(entriesToCsv(await allEntries(db)));
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export Graze data', UTI: 'public.comma-separated-values-text' });
  } catch (e) {
    // iOS and Android resolve when the sheet is dismissed; the web share sheet rejects.
    if (e instanceof Error && e.name === 'AbortError') return;
    console.warn('CSV export failed', e);
    Alert.alert("Couldn't export", 'Something went wrong making the CSV. Please try again.');
  }
}
