/**
 * Keeping house: dirty dishes from cooking, a laundry basket that fills as the days go by, and a
 * home that gets messier until you tidy it. Chores cost time, never money, and nothing is ever
 * blocked: a messy home only makes relaxing there less fun (homeFunFactor).
 */
import type { FurnitureKind } from './interiors';

export interface Chores {
  /** Dirty dishes waiting at the sink. */
  dishes: number;
  /** Days of worn clothes in the basket. */
  laundry: number;
  /** 0 = spotless, 100 = a real mess. */
  mess: number;
}

export const CLEAN_HOME: Chores = { dishes: 0, laundry: 0, mess: 0 };

export const MAX_DISHES = 8;
export const MAX_LAUNDRY = 7;
/** Each meal cooked leaves this many dishes. */
export const DISHES_PER_MEAL = 2;
/** The mess a day of living adds, plus a little for every dirty dish and day of laundry left. */
const MESS_PER_DAY = 12;
const MESS_PER_DISH = 2;
const MESS_PER_LAUNDRY = 2;
const MESS_PER_MEAL = 3;
/** Basket full enough to bother: offered from this many days. */
export const LAUNDRY_DUE = 2;

export type ChoreId = 'dishes' | 'laundry' | 'tidy';

export interface ChoreSpec {
  id: ChoreId;
  verb: string;
  minutes: number;
  /** Where it's done: the nearest of these at home (null: wherever you are). */
  at: readonly FurnitureKind[] | null;
}

export const CHORES: Record<ChoreId, ChoreSpec> = {
  dishes: { id: 'dishes', verb: 'Wash the dishes', minutes: 15, at: ['counter', 'sink'] },
  laundry: { id: 'laundry', verb: 'Do the laundry', minutes: 45, at: ['bathtub', 'shower', 'sink'] },
  tidy: { id: 'tidy', verb: 'Tidy up', minutes: 25, at: null },
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Older saves, or anything malformed, become a clean home. */
export function sanitiseChores(v: unknown): Chores {
  if (!v || typeof v !== 'object') return { ...CLEAN_HOME };
  const o = v as Record<string, unknown>;
  const n = (x: unknown, hi: number) => (typeof x === 'number' && Number.isFinite(x) ? clamp(Math.round(x), 0, hi) : 0);
  return { dishes: n(o.dishes, MAX_DISHES), laundry: n(o.laundry, MAX_LAUNDRY), mess: n(o.mess, 100) };
}

/** After cooking a meal at home. */
export const afterCooking = (c: Chores): Chores => ({
  ...c,
  dishes: Math.min(MAX_DISHES, c.dishes + DISHES_PER_MEAL),
  mess: Math.min(100, c.mess + MESS_PER_MEAL),
});

/** A night passes: today's clothes go in the basket and the home gets messier. */
export const afterDay = (c: Chores): Chores => ({
  ...c,
  laundry: Math.min(MAX_LAUNDRY, c.laundry + 1),
  mess: Math.min(100, c.mess + MESS_PER_DAY + c.dishes * MESS_PER_DISH + c.laundry * MESS_PER_LAUNDRY),
});

/** Doing a chore. */
export function doChore(c: Chores, id: ChoreId): Chores {
  switch (id) {
    case 'dishes': return { ...c, dishes: 0, mess: Math.max(0, c.mess - 10) };
    case 'laundry': return { ...c, laundry: 0, mess: Math.max(0, c.mess - 10) };
    case 'tidy': return { ...c, mess: 0 };
  }
}

/** Whether a chore is worth offering now. */
export function choreDue(c: Chores, id: ChoreId): boolean {
  switch (id) {
    case 'dishes': return c.dishes > 0;
    case 'laundry': return c.laundry >= LAUNDRY_DUE;
    case 'tidy': return c.mess >= 20;
  }
}

/** The chores to offer, most pressing first. */
export function dueChores(c: Chores): ChoreSpec[] {
  const weight = (id: ChoreId) => (id === 'dishes' ? c.dishes * 10 : id === 'laundry' ? c.laundry * 12 : c.mess);
  return (Object.keys(CHORES) as ChoreId[]).filter((id) => choreDue(c, id)).sort((a, b) => weight(b) - weight(a)).map((id) => CHORES[id]);
}

/** A short note for the list: "4 dirty dishes", "3 days of laundry", "Getting messy". */
export function choreNote(c: Chores, id: ChoreId): string {
  switch (id) {
    case 'dishes': return `${c.dishes} dirty dish${c.dishes === 1 ? '' : 'es'}`;
    case 'laundry': return `${c.laundry} days of laundry`;
    case 'tidy': return c.mess >= 70 ? 'A real mess' : c.mess >= 45 ? 'Messy' : 'Getting untidy';
  }
}

/** Relaxing at home is less fun in a mess: 1 when tidy, down to 0.7 at the worst. */
export const homeFunFactor = (c: Chores): number => 1 - 0.3 * (clamp(c.mess, 0, 100) / 100);

/**
 * At the kitchen counter you wash up while there are dirty dishes. Only when the home has no
 * stove: with a stove you cook there and wash up at the counter, so cooking is never blocked.
 */
export const counterWashes = (c: Chores, hasStove: boolean): boolean => hasStove && c.dishes > 0;
