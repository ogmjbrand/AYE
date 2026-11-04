/**
 * Food you've bought to take away and not eaten yet, by dish id. It's only
 * ever filled by a paid purchase (gameState buyTakeaway) and emptied by
 * eating (eatFromPantry), so nothing appears in it for free.
 */
import { dishById } from './food';

export type Pantry = Readonly<Record<string, number>>;

/** At most this many of one dish, and this many dishes in all (it's a bag, not a warehouse). */
export const MAX_OF_ONE = 5;
export const MAX_ITEMS = 12;

export const pantryCount = (p: Pantry) => Object.values(p).reduce((s, n) => s + n, 0);
export const canStore = (p: Pantry, dishId: string) => (p[dishId] ?? 0) < MAX_OF_ONE && pantryCount(p) < MAX_ITEMS;
export const addToPantry = (p: Pantry, dishId: string): Pantry => ({ ...p, [dishId]: (p[dishId] ?? 0) + 1 });
export function takeFromPantry(p: Pantry, dishId: string): Pantry {
  const n = (p[dishId] ?? 0) - 1;
  const out = { ...p };
  if (n > 0) out[dishId] = n; else delete out[dishId];
  return out;
}

/** A saved pantry, keeping only real dishes and sensible counts. Old saves have none. */
export function sanitisePantry(raw: unknown): Pantry {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [id, n] of Object.entries(raw as Record<string, unknown>)) {
    if (!dishById(id) || typeof n !== 'number' || !Number.isInteger(n) || n < 1) continue;
    out[id] = Math.min(MAX_OF_ONE, n);
  }
  return out;
}
