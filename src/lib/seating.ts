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
  /** Where to stand to sit down and where you get up, when not straight in front (a chair pulled up to a table). */
  approach?: { x: number; z: number };
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
export const standSpot = (s: Seat) => s.approach ?? ahead(s, STAND_OFF);
/** How far to lower the character (its origin) so a body of this height rests on the seat. */
export const seatDrop = (s: Pick<Seat, 'height'>, standingHeight: number) => s.height - SEAT_CONTACT_RATIO * standingHeight;

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

// ---------------------------------------------------------------- sitting down and getting up

/** Turning your back to the seat before sitting down, in seconds. */
export const SEAT_TURN_SECONDS = 0.5;
/** Sitting down onto a seat, or standing up from it (the Rocketbox clips, stretched to fit), in seconds. */
export const SEAT_MOVE_SECONDS = 1.8;

/** Sitting down on a seat (or getting up from it), started at `startedAt` seconds, from a body turned `fromYaw`. */
export interface SeatMove { seat: Seat; up: boolean; startedAt: number; fromYaw: number }

/** Which clip the body plays at a moment of a seat move: still on its feet, sitting down or standing up. */
export type SeatMoveClip = 'Stand' | 'SitDown' | 'StandUp';

const easeInOut = (k: number) => {
  const c = Math.min(1, Math.max(0, k));
  return c * c * (3 - 2 * c);
};
const shortest = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

/**
 * Where the body is `t` seconds into a seat move, as people do it: sitting
 * down, turn your back to the seat where you stand, then lower yourself onto
 * it, stepping back as you go (the sit-down clip); getting up, the stand-up
 * clip as you rise and step forward. `done` once it's over.
 */
export function seatMoveFrame(m: SeatMove, t: number): { x: number; z: number; yaw: number; clip: SeatMoveClip; done: boolean } {
  const stand = standSpot(m.seat), sat = seatedSpot(m.seat);
  const lerp = (k: number) => ({ x: stand.x + (sat.x - stand.x) * k, z: stand.z + (sat.z - stand.z) * k });
  if (m.up) {
    const k = easeInOut(t / SEAT_MOVE_SECONDS);
    return { ...lerp(1 - k), yaw: m.seat.facing, clip: 'StandUp', done: t >= SEAT_MOVE_SECONDS };
  }
  if (t < SEAT_TURN_SECONDS) {
    return { ...stand, yaw: m.fromYaw + shortest(m.fromYaw, m.seat.facing) * easeInOut(t / SEAT_TURN_SECONDS), clip: 'Stand', done: false };
  }
  const k = easeInOut((t - SEAT_TURN_SECONDS) / SEAT_MOVE_SECONDS);
  return { ...lerp(k), yaw: m.seat.facing, clip: 'SitDown', done: t >= SEAT_TURN_SECONDS + SEAT_MOVE_SECONDS };
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
