/**
 * Where every character stands right now, as circles on the ground: the player, residents, passers-by,
 * venue staff and event characters each publish their position every frame they move. The player
 * collides with them (lib/collision.ts); NPCs keep their distance from each other and the player
 * (personalSpaceNudge).
 */
import type { Body } from './collision';

/** A character's radius on the ground: shoulders, not the whole arm span. */
export const BODY_RADIUS = 0.28;
/** Room people keep between them when they pass (on top of both radii). */
export const PERSONAL_SPACE = 0.25;
/** How far ahead a walker looks for someone in their way. */
const LOOK_AHEAD = 2.2;
/** Bodies within this of each other are considered for avoiding: anything further can't matter this frame. */
const NEAR = 2.5;

interface Entry extends Body {
  /** Seated, lying or behind a counter: others go round them, they don't move aside. */
  still: boolean;
}

const bodies = new Map<string, Entry>();

export function setBody(id: string, x: number, z: number, opts: { r?: number; still?: boolean } = {}) {
  const e = bodies.get(id);
  if (e) { e.x = x; e.z = z; e.r = opts.r ?? e.r; e.still = opts.still ?? false; return; }
  bodies.set(id, { x, z, r: opts.r ?? BODY_RADIUS, still: opts.still ?? false });
}

export function removeBody(id: string) {
  bodies.delete(id);
}

export function clearBodies() {
  bodies.clear();
}

/** Everyone near (x, z) except `except`. */
export function bodiesNear(x: number, z: number, except: string, range = NEAR): Body[] {
  const out: Body[] = [];
  for (const [id, b] of bodies) {
    if (id === except) continue;
    if (Math.abs(b.x - x) < range && Math.abs(b.z - z) < range) out.push(b);
  }
  return out;
}

export const bodyOf = (id: string): Readonly<Body> | undefined => bodies.get(id);

/**
 * How far an NPC at (x, z), walking towards (hx, hz) (a unit heading, zero when standing), should
 * step aside to keep its personal space: away from anyone too close, and, for someone ahead in its
 * way, to its right (people pass each other on the same side, so two never mirror each other into a
 * deadlock). The result is a small offset in metres; apply it smoothed (NpcAvoidance).
 */
export function personalSpaceNudge(x: number, z: number, hx: number, hz: number, self: string, others: readonly Body[] = bodiesNear(x, z, self)): { x: number; z: number } {
  let nx = 0, nz = 0;
  const walking = hx !== 0 || hz !== 0;
  for (const b of others) {
    const dx = x - b.x, dz = z - b.z;
    const d = Math.hypot(dx, dz);
    const want = BODY_RADIUS + b.r + PERSONAL_SPACE;
    // Too close already: straight apart
    if (d < want) {
      const push = (want - d) / want;
      if (d > 1e-6) { nx += (dx / d) * push; nz += (dz / d) * push; }
    }
    if (!walking) continue;
    // Someone ahead on your line (within LOOK_AHEAD): start going round them early, on the right
    // (people pass on the same side, so two walking at each other never mirror into a stand-off)
    const along = -(dx * hx + dz * hz);
    const across = Math.abs(dx * hz - dz * hx);
    if (along > 0 && along < LOOK_AHEAD && across < want) {
      const k = (1 - along / LOOK_AHEAD) * (1 - across / want) * 1.5;
      nx += hz * k; nz += -hx * k;
    }
  }
  return { x: nx, z: nz };
}

/** An NPC's current step aside from its own path, carried frame to frame. */
export interface Avoidance { ox: number; oz: number }

/** Furthest an NPC strays from its path to make room. */
const MAX_ASIDE = 0.8;
/** How quickly it steps aside, and drifts back onto its path once clear (per second). */
const ASIDE_RATE = 5;
const RETURN_RATE = 0.9;

/**
 * One frame of an NPC keeping its personal space. (bx, bz) is where its own routine puts it; it steps
 * aside from that by a smoothed offset when someone is too close, and drifts back once clear. The
 * offset is only ever taken where it leaves the NPC clear of walls and furniture (it shrinks, then
 * gives up, rather than push anyone into a solid), so an NPC is never moved off its path into
 * something. Publishes the result as this NPC's body and returns it.
 */
export function avoidStep(
  a: Avoidance, id: string, bx: number, bz: number, hx: number, hz: number, delta: number,
  isClear: (x: number, z: number) => boolean,
): { x: number; z: number } {
  const n = personalSpaceNudge(bx + a.ox, bz + a.oz, hx, hz, id);
  const k = Math.min(1, delta * RETURN_RATE);
  a.ox += n.x * Math.min(1, delta * ASIDE_RATE) - a.ox * k;
  a.oz += n.z * Math.min(1, delta * ASIDE_RATE) - a.oz * k;
  const len = Math.hypot(a.ox, a.oz);
  if (len > MAX_ASIDE) { a.ox *= MAX_ASIDE / len; a.oz *= MAX_ASIDE / len; }
  // Only where the step aside is clear of solids: half of it, else none
  if (!isClear(bx + a.ox, bz + a.oz)) {
    a.ox *= 0.5; a.oz *= 0.5;
    if (!isClear(bx + a.ox, bz + a.oz)) { a.ox = 0; a.oz = 0; }
  }
  const x = bx + a.ox, z = bz + a.oz;
  setBody(id, x, z);
  return { x, z };
}
