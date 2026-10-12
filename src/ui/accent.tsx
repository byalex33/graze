import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useQuery } from '@/db/changes';
import { getAccentChoice } from '@/db/repo';
import { color } from './theme';

export const ACCENTS = {
  white: { name: 'White', value: color.text },
  red: { name: 'Red', value: '#FF6B7A' },
  blue: { name: 'Blue', value: '#6FA8FF' },
  green: { name: 'Green', value: '#5FD08A' },
  yellow: { name: 'Yellow', value: '#FFD36B' },
  purple: { name: 'Purple', value: '#B794FF' },
} as const;

export type AccentName = keyof typeof ACCENTS;
export type AccentChoice = AccentName | 'random';

const RANDOM_POOL: AccentName[] = ['red', 'blue', 'green', 'yellow', 'purple'];

/** A colour from the pool, never the same as `previous`. */
export function pickRandomAccent(previous: AccentName | null, rand: () => number = Math.random): AccentName {
  const pool = RANDOM_POOL.filter((a) => a !== previous);
  return pool[Math.floor(rand() * pool.length)];
}

interface Accent {
  choice: AccentChoice;
  /** The colour actually shown; for Random, this opening's pick. */
  name: AccentName;
  value: string;
  /** Text or icons drawn on top of the accent. All accents are light, so this is dark. */
  on: string;
}

const AccentContext = createContext<Accent>({ choice: 'white', name: 'white', value: color.text, on: color.bg });

export const useAccent = () => useContext(AccentContext);

/** Supplies the accent colour. Random re-rolls each time the app comes back to the foreground. */
export function AccentProvider({ children }: { children: ReactNode }) {
  const choice = useQuery(getAccentChoice, []) ?? 'white';
  const [randomPick, setRandomPick] = useState<AccentName>(() => pickRandomAccent(null));

  useEffect(() => {
    let previous = AppState.currentState;
    const sub = AppState.addEventListener('change', (next) => {
      if (previous === 'background' && next === 'active') setRandomPick((last) => pickRandomAccent(last));
      previous = next;
    });
    return () => sub.remove();
  }, []);

  const name = choice === 'random' ? randomPick : choice;
  return (
    <AccentContext.Provider value={{ choice, name, value: ACCENTS[name].value, on: color.bg }}>
      {children}
    </AccentContext.Provider>
  );
}
