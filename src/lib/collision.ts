/**
 * AYE's character collision: upright circles (characters, seen from above) against the world's boxes
 * (buildings, walls, vehicles, stalls, furniture: lib/world.ts Obstacle) and against each other.
 *
 * The world is flat ground with box-shaped solids, so this is solved exactly on the ground plane
 * instead of through a general physics engine:
 * - moveCircle sub-steps a move so no step is longer than half a body radius (no tunnelling
 *   through thin lamps, poles or walls, even at a low frame rate);
 * - each step is solved iteratively (solveCircle), so being pushed out of one box can never leave
 *   you inside its neighbour, and the world's edge is one more constraint in the same loop;
 * - pushes run along the contact normal, so walking into a wall at an angle slides along it;
 * - if a step can't be made clear (a closing gap), the character stays where it last stood clear.
 * Broad phase: only obstacles whose box, grown by the move, could touch the character are tested.
 */
import { PLAYER_RADIUS, WORLD_BOUND, type Obstacle } from './world';

/** Another character, as a circle on the ground. */
export interface Body {
  x: number;
  z: number;
  r: number;
}

/** Bodies this close count as touching: the floating-point slack in every test. */
const EPS = 1e-6;
/** Passes of the solver; three boxes meeting at a corner settle in two or three. */
const MAX_PASSES = 8;

/** How far a circle at (x, z) reaches into a box, and the way out: null when it isn't touching. */
function boxPush(x: number, z: number, r: number, o: Obstacle): { dx: number; dz: number } | null {
  const hx = o.size[0] / 2, hz = o.size[2] / 2;
  const minX = o.position[0] - hx, maxX = o.position[0] + hx;
  const minZ = o.position[2] - hz, maxZ = o.position[2] + hz;
  const nx = Math.max(minX, Math.min(x, maxX));
  const nz = Math.max(minZ, Math.min(z, maxZ));
  const dx = x - nx, dz = z - nz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= (r - EPS) * (r - EPS)) return null;
  if (d2 > 1e-12) {
    // Outside the box: straight out from the nearest point on it
    const d = Math.sqrt(d2);
    return { dx: (dx / d) * (r - d), dz: (dz / d) * (r - d) };
  }
  // Centre inside the box: out through the nearest face
  const exits = [
    { d: x - minX, dx: minX - r - x, dz: 0 },
    { d: maxX - x, dx: maxX + r - x, dz: 0 },
    { d: z - minZ, dx: 0, dz: minZ - r - z },
    { d: maxZ - z, dx: 0, dz: maxZ + r - z },
  ];
  // Never out through a face that leads off the edge of the world (a building built against it)
  const inWorld = exits.filter((e) => Math.abs(x + e.dx) <= WORLD_BOUND && Math.abs(z + e.dz) <= WORLD_BOUND);
  const best = (inWorld.length ? inWorld : exits).reduce((a, c) => (c.d < a.d ? c : a));
  return { dx: best.dx, dz: best.dz };
}

/** Whether a circle overlaps any box or body (touching doesn't count). */
export function overlaps(x: number, z: number, r: number, obstacles: readonly Obstacle[], bodies: readonly Body[] = []): boolean {
  if (Math.abs(x) > WORLD_BOUND + EPS || Math.abs(z) > WORLD_BOUND + EPS) return true;
  for (const o of obstacles) if (boxPush(x, z, r, o)) return true;
  for (const b of bodies) {
    const min = r + b.r - 1e-3;
    if ((x - b.x) ** 2 + (z - b.z) ** 2 < min * min) return true;
  }
  return false;
}

/** The obstacles a circle moving from (x0, z0) to (x1, z1) could touch (the broad phase). */
export function nearObstacles(x0: number, z0: number, x1: number, z1: number, r: number, obstacles: readonly Obstacle[]): Obstacle[] {
  const minX = Math.min(x0, x1) - r, maxX = Math.max(x0, x1) + r;
  const minZ = Math.min(z0, z1) - r, maxZ = Math.max(z0, z1) + r;
  return obstacles.filter((o) => {
    const hx = o.size[0] / 2, hz = o.size[2] / 2;
    return o.position[0] + hx >= minX && o.position[0] - hx <= maxX && o.position[2] + hz >= minZ && o.position[2] - hz <= maxZ;
  });
}

/**
 * The nearest clear place to (x, z) for a circle of radius r: pushed out of every box and body it
 * overlaps, repeatedly until nothing overlaps, and kept inside the world. Null if the pushes don't
 * settle (wedged between solids with no room for the body).
 */
export function solveCircle(x: number, z: number, r: number, obstacles: readonly Obstacle[], bodies: readonly Body[] = []): { x: number; z: number } | null {
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let moved = false;
    for (const o of obstacles) {
      const p = boxPush(x, z, r, o);
      if (p) { x += p.dx; z += p.dz; moved = true; }
    }
    for (const b of bodies) {
      const dx = x - b.x, dz = z - b.z;
      const min = r + b.r;
      const d2 = dx * dx + dz * dz;
      if (d2 >= (min - EPS) * (min - EPS)) continue;
      const d = Math.sqrt(d2);
      // Exactly on top of someone: step aside to the east, so the push is never undefined
      const ux = d > 1e-9 ? dx / d : 1, uz = d > 1e-9 ? dz / d : 0;
      x = b.x + ux * min;
      z = b.z + uz * min;
      moved = true;
    }
    const cx = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, x));
    const cz = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, z));
    if (cx !== x || cz !== z) { x = cx; z = cz; moved = true; }
    if (!moved) return { x, z };
  }
  return overlaps(x, z, r - 1e-3, obstacles, bodies) ? null : { x, z };
}

/**
 * Move a circle from (x, z) by (dx, dz), colliding with the boxes and bodies on the way: sub-stepped
 * so it can't pass through anything thin, sliding along whatever it meets. Where a step can't be
 * made clear it stops at the last clear place, so it never ends up inside anything.
 */
export function moveCircle(
  x: number, z: number, dx: number, dz: number,
  r: number = PLAYER_RADIUS, obstacles: readonly Obstacle[] = [], bodies: readonly Body[] = [],
): { x: number; z: number; blocked: boolean } {
  // Starting somewhere overlapping (placed by a script, a moving bus arrived): settle first
  const startBodies = bodies.filter((b) => Math.hypot(b.x - x, b.z - z) < r + b.r + 1);
  const around = nearObstacles(x, z, x, z, r + 1, obstacles);
  if (overlaps(x, z, r, around, startBodies)) {
    const out = solveCircle(x, z, r, nearObstacles(x, z, x, z, r + 3, obstacles), startBodies);
    if (out) { x = out.x; z = out.z; }
  }
  // The broad phase, from where the move really starts
  const near = nearObstacles(x, z, x + dx, z + dz, r + 0.05, obstacles);
  const nearBodies = bodies.filter((b) => Math.hypot(b.x - x, b.z - z) < Math.hypot(dx, dz) + r + b.r + 0.05);
  const length = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(length / (r * 0.5)));
  const sx = dx / steps, sz = dz / steps;
  let blocked = false;
  for (let i = 0; i < steps; i++) {
    const want = { x: x + sx, z: z + sz };
    const got = solveCircle(want.x, want.z, r, near, nearBodies);
    // A step that can't be made clear is not taken: stay where you last stood
    if (!got || overlaps(got.x, got.z, r - 1e-3, near, nearBodies)) { blocked = true; break; }
    if (Math.hypot(got.x - want.x, got.z - want.z) > 1e-4) blocked = true;
    x = got.x; z = got.z;
  }
  return { x, z, blocked };
}
