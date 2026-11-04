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
