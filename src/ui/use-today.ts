import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { addDays, dayKeyOf, startOfDay, type DayKey } from '@/domain/day';

/** Today's DayKey, kept current across midnight and app resumes. */
export function useToday(): DayKey {
  const [today, setToday] = useState(() => dayKeyOf(new Date()));

  useEffect(() => {
    const refresh = () => setToday(dayKeyOf(new Date()));
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    const msToMidnight = startOfDay(addDays(today, 1)).getTime() - Date.now();
    const timer = setTimeout(refresh, Math.max(1000, msToMidnight + 1000));
    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, [today]);

  return today;
}
