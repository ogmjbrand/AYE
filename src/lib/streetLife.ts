/**
 * Street life: passers-by who walk the boulevard's pavements between the real shops, stalls and
 * restaurants of the district, stopping at each door for a while as if looking in or buying, then
 * moving on. More people are out by day than at night. Pure: world/StreetLife.tsx draws them.
 */
import type { Place } from './geography';

export interface StreetLayout {
  roadHalfWidth: number;
  pavementWidth: number;
  crossStreet: { minZ: number; maxZ: number };
}

/** A stop on a walk: [x, z, pause in seconds, facing while there]. */
export type WalkStop = readonly [number, number, number, number];

export interface Shopper {
  id: string;
  lookId: string;
  /** What they're up to (their role, for their outfit). */
  doing: string;
  route: readonly WalkStop[];
}

/** Everyday looks for the crowd (lib/looks.ts). */
export const CROWD_LOOKS = [
  'female-adult-03', 'female-adult-04', 'female-adult-08', 'female-adult-10', 'female-adult-06', 'female-adult-11',
  'male-adult-01', 'male-adult-12', 'male-adult-04', 'male-adult-10', 'male-adult-15', 'male-adult-18',
] as const;

const DOING = ['Shopping', 'Running errands', 'Buying lunch', 'Window shopping', 'On the way home', 'Meeting a friend'] as const;

/** How many people are out on the street at this hour (before any quality limit). */
export function crowdSize(hour: number): number {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h < 6) return 0;
  if (h < 9) return 4;
  if (h < 20) return 8;
  if (h < 23) return 5;
  return 2;
}

/** The line people walk along on each pavement, clear of lamp posts at the kerb and of the shop fronts. */
export const walkLine = (l: StreetLayout) => l.roadHalfWidth + l.pavementWidth * 0.35;

/** Places along the boulevard where someone might stop: shops, food, nightlife, travel; not homes or workplaces. */
export function streetStops(places: readonly Place[], l: StreetLayout): Place[] {
  return places.filter((p) => {
    if (p.kind === 'home' || p.kind === 'workplace') return false;
    const ax = Math.abs(p.position[0]);
    return ax >= l.roadHalfWidth && ax <= l.roadHalfWidth + l.pavementWidth + 1.5;
  });
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The crowd for a district: each person keeps to one stretch of pavement and loops between three of its
 * stops, facing the shop while they're there. The same district always gets the same crowd.
 */
export function shoppersFor(districtId: string, places: readonly Place[], l: StreetLayout, count: number): Shopper[] {
  const stops = streetStops(places, l);
  // One stretch of pavement each: a side of the boulevard, before or after the cross street (no pavement across it)
  const C = l.crossStreet;
  const segment = (z: number) => (z <= C.minZ ? 0 : z >= C.maxZ ? 1 : -1);
  const sides = [1, -1].flatMap((side) => [0, 1].map((seg) => stops.filter((p) => Math.sign(p.position[0]) === side && segment(p.position[2]) === seg)))
    .filter((s) => s.length >= 2);
  if (!sides.length || count <= 0) return [];
  let seed = 0;
  for (const ch of districtId) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const r = rng(seed);
  const line = walkLine(l);
  return Array.from({ length: count }, (_, i) => {
    const pool = sides[i % sides.length];
    const side = Math.sign(pool[0].position[0]);
    const picks = [...pool].sort(() => r() - 0.5).slice(0, Math.min(3, pool.length));
    // Walk the stops in order along the street, then back, so the loop never doubles back on itself mid-way
    picks.sort((a, b) => a.position[2] - b.position[2]);
    const facing = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    const route: WalkStop[] = picks.map((p) => [side * line, p.position[2], 5 + Math.round(r() * 9), facing] as const);
    // A stroll on past the last stop before turning back, so not everyone turns at a door
    const last = route[route.length - 1];
    let on = last[1] + 4 + r() * 6;
    if (last[1] <= C.minZ && on > C.minZ - 0.5) on = C.minZ - 0.5;
    route.push([side * line, on, 1, 0]);
    return {
      id: `${districtId}.passer-${i}`,
      lookId: CROWD_LOOKS[(i * 5 + Math.floor(r() * CROWD_LOOKS.length)) % CROWD_LOOKS.length],
      doing: DOING[Math.floor(r() * DOING.length)],
      route,
    };
  });
}

/**
 * How many of the day's passers-by stay out in this weather (1 = all). Rain sends people indoors:
 * a shower keeps about half the street, a thunderstorm only the few who have to be out.
 */
export const outInWeather = (rain: number, thunder: number) => Math.max(0.15, 1 - 0.55 * Math.min(1, rain) - 0.3 * Math.min(1, thunder));
