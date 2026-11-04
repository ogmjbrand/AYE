/**
 * How each food business serves you. Street stalls serve at the window and you
 * eat standing at the stall, out on the pavement; local eateries (a buka, a
 * chop bar, a waakye joint) have their own bright counter-service room; kitchens
 * seat you in a dining room; the luxury restaurants (The Palms, the cantina)
 * have their own buildings. Nothing sends a suya stand to a dining room.
 */
import type { FoodVendor } from './food';

export type FoodService = 'street' | 'eatery' | 'kitchen';

/** Minutes you spend eating at a street stall. */
export const STALL_MINUTES = 12;

export function serviceOf(vendor: Pick<FoodVendor, 'kind' | 'name'>): FoodService {
  const k = `${vendor.kind} ${vendor.name}`.toLowerCase();
  if (/suya|street|snack|stand|corner|stall|tea and|juice|accara|grill corner|kiosk|market|bakery|breakfast|tea|truck|convenience|bread|falafel|coffee|chai|hawker|bazaar|fried/.test(k) && !/kitchen/.test(k)) return 'street';
  if (/buka|chop bar|joint|tuwo|soup kitchen|shisa nyama|waakye|mama put/.test(k)) return 'eatery';
  return 'kitchen';
}

/** What the place is called on the plate at the top of the screen. */
export const SERVICE_LABEL: Record<FoodService, string> = { street: 'Street food', eatery: 'Local eatery', kitchen: 'Dining' };

/**
 * Which way to face when you order at a street stall: toward the food cart or
 * market stall the vendor works from (the nearest within reach), or null if
 * there's none there to turn to. Same convention as the player's direction
 * (0 = +z, atan2 of x over z).
 */
export function faceStall(at: { x: number; z: number }, carts: readonly { x: number; z: number }[], stalls: readonly (readonly [number, number, number] | { position: readonly [number, number, number] })[], reach = 3.5): number | null {
  const points = [
    ...carts.map((c) => ({ x: c.x, z: c.z })),
    ...stalls.map((s) => ('position' in s ? { x: s.position[0], z: s.position[2] } : { x: s[0], z: s[2] })),
  ];
  let best: { x: number; z: number } | null = null, bestD = reach;
  for (const p of points) { const d = Math.hypot(p.x - at.x, p.z - at.z); if (d < bestD && d > 0.05) { best = p; bestD = d; } }
  return best ? Math.atan2(best.x - at.x, best.z - at.z) : null;
}
