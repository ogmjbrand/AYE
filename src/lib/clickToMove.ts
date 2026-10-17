/**
 * Click (or tap) to move: the player picks a spot on the ground and the
 * character turns and heads there by itself, like a thumb on the stick.
 * Pure rules here; the controller applies them each frame.
 */
import type { MovementIntent } from './movementInput';

export interface MoveTarget {
  x: number;
  z: number;
  /** Walk instead of jog (Shift held when clicking, or a short hop). */
  walk: boolean;
}

/** A waypoint on the way there is passed within this distance, without slowing down. */
export const PASS_RADIUS = 0.6;

/** Close enough to count as there, in metres. */
export const ARRIVE_RADIUS = 0.35;
/** Targets nearer than this are walked to rather than jogged. */
export const WALK_UNDER = 3;
/** A press that moves less than this (pixels) and ends quickly is a click, not a camera drag. */
export const CLICK_SLOP_PX = 6;
export const CLICK_MAX_MS = 400;
/** Give up if the character makes no headway for this long (blocked by a wall or a bus). */
export const STUCK_SECONDS = 1.2;

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function isClick(dxPx: number, dyPx: number, ms: number): boolean {
  return Math.hypot(dxPx, dyPx) <= CLICK_SLOP_PX && ms <= CLICK_MAX_MS;
}

export function makeTarget(fromX: number, fromZ: number, x: number, z: number, shift: boolean): MoveTarget {
  return { x, z, walk: shift || Math.hypot(x - fromX, z - fromZ) < WALK_UNDER };
}

/**
 * Steering toward the target from where the player stands and faces
 * (heading θ faces (sin θ, cos θ)). Turns on the spot when the target is
 * well behind, eases off on arrival (not at waypoints along the way).
 */
export function steerTowards(x: number, z: number, heading: number, target: MoveTarget, final = true): MovementIntent & { arrived: boolean } {
  const dx = target.x - x;
  const dz = target.z - z;
  const dist = Math.hypot(dx, dz);
  if (dist < (final ? ARRIVE_RADIUS : PASS_RADIUS)) return { forward: 0, turn: 0, walk: target.walk, arrived: true };
  const err = wrap(Math.atan2(dx, dz) - heading);
  const turn = Math.max(-1, Math.min(1, err * 2.5));
  // Facing well away: turn first, then go; slow down over the last metre
  const facing = Math.abs(err) > 1.2 ? 0 : Math.max(0, Math.cos(err));
  const forward = facing * (final ? Math.min(1, Math.max(0.35, dist / 1)) : 1);
  return { forward, turn, walk: target.walk, arrived: false };
}
