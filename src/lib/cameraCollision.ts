/**
 * Keeping the third-person camera out of buildings, walls and vehicles.
 *
 * Each frame the camera wants to sit `want` metres from the player's upper body along the view
 * direction. clearCameraDistance sweeps a sphere (the camera's near-plane clearance) from the focus
 * point to that position against every solid box tall enough to block the view, and returns how
 * far it can go before touching one. CameraDistance then eases the camera: in at once when
 * something blocks it (so it never clips), back out gently once the way is clear.
 */
import type { Obstacle } from './world';

/** The camera's clearance: a sphere this big must fit where it stands. */
export const CAMERA_RADIUS = 0.3;
/** Closer than this the camera would be inside the character's head. */
export const CAMERA_MIN_DISTANCE = 1.1;
/** Boxes lower than this (benches, bins, chairs, the floor-level parts of palms) are looked over, not dodged. */
export const CAMERA_BLOCK_HEIGHT = 1.5;
/** How quickly the camera returns to its distance once clear (per second, as a share of the gap). */
const RETURN_RATE = 2.5;

export interface Vec3 { x: number; y: number; z: number }

/**
 * The distance (≤ want) the camera can be from `focus` along unit direction `dir` without its sphere
 * entering any blocking box. Boxes that already contain the focus (you're in a doorway) are ignored,
 * so standing in a doorway doesn't pull the camera onto your head.
 */
export function clearCameraDistance(focus: Vec3, dir: Vec3, want: number, obstacles: readonly Obstacle[], radius = CAMERA_RADIUS, groundY = 0): number {
  let best = want;
  for (const o of obstacles) {
    const h = o.size[1];
    if (h < CAMERA_BLOCK_HEIGHT) continue;
    const base = groundY + (o.position[1] ?? 0);
    const min = [o.position[0] - o.size[0] / 2 - radius, base - radius, o.position[2] - o.size[2] / 2 - radius];
    const max = [o.position[0] + o.size[0] / 2 + radius, base + h + radius, o.position[2] + o.size[2] / 2 + radius];
    const p = [focus.x, focus.y, focus.z], d = [dir.x, dir.y, dir.z];
    if (p[0] > min[0] && p[0] < max[0] && p[1] > min[1] && p[1] < max[1] && p[2] > min[2] && p[2] < max[2]) continue;
    // Slab test: where the ray enters the grown box
    let tEnter = 0, tExit = best;
    let hit = true;
    for (let a = 0; a < 3; a++) {
      if (Math.abs(d[a]) < 1e-9) {
        if (p[a] <= min[a] || p[a] >= max[a]) { hit = false; break; }
        continue;
      }
      let t0 = (min[a] - p[a]) / d[a], t1 = (max[a] - p[a]) / d[a];
      if (t0 > t1) [t0, t1] = [t1, t0];
      tEnter = Math.max(tEnter, t0);
      tExit = Math.min(tExit, t1);
      if (tEnter > tExit) { hit = false; break; }
    }
    if (hit && tEnter < best) best = tEnter;
  }
  return Math.max(0, best);
}

/**
 * The camera's actual distance, frame to frame: never further than is clear (it moves in at once,
 * so it never passes through a wall), and drifting back out to where you want it once it can.
 */
export function nextCameraDistance(current: number, want: number, clear: number, delta: number): number {
  const limit = Math.min(want, Math.max(CAMERA_MIN_DISTANCE, clear));
  if (current >= limit) return limit;
  return Math.min(limit, current + (limit - current) * Math.min(1, delta * RETURN_RATE));
}

/**
 * When there isn't room for the camera even at its closest (you're against a wall with it behind
 * you), it rises up over your shoulder instead: the view direction is tipped towards straight up
 * until the camera fits at `need` metres. Returns how far it was tipped (0 = not at all, 1 = right
 * above you) and the new direction; above your head is always clear unless something overhangs.
 */
export function liftCameraClear(focus: Vec3, dir: Vec3, need: number, obstacles: readonly Obstacle[], radius = CAMERA_RADIUS): { lift: number; dir: Vec3 } {
  for (let i = 0; i <= LIFT_STEPS; i++) {
    const lift = (i / LIFT_STEPS) * MAX_LIFT;
    const d = tipUp(dir, lift);
    if (clearCameraDistance(focus, d, need, obstacles, radius) >= need - 1e-3) return { lift, dir: d };
  }
  return { lift: MAX_LIFT, dir: tipUp(dir, MAX_LIFT) };
}
const LIFT_STEPS = 12;
/** Never quite straight overhead, where looking down has no up direction. */
const MAX_LIFT = 0.92;

/** `dir` tipped `lift` of the way towards straight up, still a unit vector. */
export function tipUp(dir: Vec3, lift: number): Vec3 {
  const x = dir.x * (1 - lift), y = dir.y * (1 - lift) + lift, z = dir.z * (1 - lift);
  const l = Math.hypot(x, y, z) || 1;
  return { x: x / l, y: y / l, z: z / l };
}
