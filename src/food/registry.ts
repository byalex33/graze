import type { Food } from '@/domain/food';
import { genericById } from './generic';

/** Foods seen this session (search results, scans), so screens can pass them by id. */
const seen = new Map<string, Food>();

export function rememberFood(food: Food): void {
  seen.set(food.id, food);
}

export function foodById(id: string): Food | null {
  return seen.get(id) ?? (id.startsWith('cofid:') ? genericById(id) : null);
}
