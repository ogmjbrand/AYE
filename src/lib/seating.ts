/**
 * Seats: where a person can sit (two places on each park bench, the chairs
 * on a lounge's terrace) and how a seated body lines up with them. The
 * seated pose is Rocketbox motion capture (*_sit_chair_idle_neutral_01):
 * measured on the looks, the body rests on the seat at about a quarter of
 * standing height, with the pelvis right above the character's origin.
 */
import type { ParkLayout } from './world';

export interface Seat {
  id: string;
  /** Centre of the seat cushion on the ground plan. */
  x: number;
  z: number;
  /** Which way someone sitting there faces (0 = +z, π/2 = +x). */
  facing: number;
  /** Top of the seat above the ground, in metres. */
  height: number;
}

/** Seat-contact height of the seated pose as a share of standing height (measured: 0.25 on male and female looks). */
export const SEAT_CONTACT_RATIO = 0.25;
/** The pelvis sits this far behind the cushion's centre, against the backrest. */
export const SEAT_BACK = 0.08;
/** Where you stand to sit down and where you get up: in front of the seat. */
export const STAND_OFF = 0.8;
export const BENCH_SEAT_HEIGHT = 0.45;
export const CHAIR_SEAT_HEIGHT = 0.45;

const ahead = (s: { x: number; z: number; facing: number }, d: number) => ({ x: s.x + Math.sin(s.facing) * d, z: s.z + Math.cos(s.facing) * d });

/** Where the character's origin goes when seated: just behind the cushion centre. */
export const seatedSpot = (s: Seat) => ahead(s, -SEAT_BACK);
/** Where to walk to before sitting, and where you end up when you get up. */
export const standSpot = (s: Seat) => ahead(s, STAND_OFF);
/** How far to lower the character (its origin) so a body of this height rests on the seat. */
export const seatDrop = (s: Seat, standingHeight: number) => s.height - SEAT_CONTACT_RATIO * standingHeight;

/** Two places on every park bench, a little either side of its middle. */
export function benchSeats(park: ParkLayout | null): Seat[] {
  if (!park) return [];
  return park.benches.flatMap((b, i) => [-0.4, 0.4].map((along, j) => ({
    id: `bench-${i}-${j}`,
    // Along the bench is the facing direction turned a quarter
    x: b.x + Math.cos(b.facing) * along,
    z: b.z - Math.sin(b.facing) * along,
    facing: b.facing,
    height: BENCH_SEAT_HEIGHT,
  })));
}

export function chairSeats(chairs: readonly { x: number; z: number; facing: number }[]): Seat[] {
  return chairs.map((c, i) => ({ id: `chair-${i}`, x: c.x, z: c.z, facing: c.facing, height: CHAIR_SEAT_HEIGHT }));
}

/** The seat whose standing spot is nearest to where you are. */
export function nearestSeat(seats: readonly Seat[], x: number, z: number): Seat | undefined {
  let best: Seat | undefined;
  let bestD = Infinity;
  for (const s of seats) {
    const p = standSpot(s);
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

/** Game minutes that pass per real second while you sit and wait. */
export const SIT_MINUTES_PER_SECOND = 15;

/**
 * Splits a wait into the minutes to add on this step: never more than what's
 * left, so standing up early charges exactly the time you actually sat.
 */
export function waitStep(remaining: number, seconds: number): number {
  if (remaining <= 0) return 0;
  return Math.min(remaining, Math.max(1, Math.round(seconds * SIT_MINUTES_PER_SECOND)));
}
