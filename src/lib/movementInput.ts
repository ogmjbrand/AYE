/**
 * Turns raw input into a movement intent. Keyboard is digital, the touch
 * stick is analog; when any key is held the keyboard wins so the two never
 * fight.
 */

export interface StickInput {
  /** -1 (pull back) … 1 (push forward). */
  forward: number;
  /** -1 (right) … 1 (left), matching A = +1. */
  turn: number;
}

export interface MovementIntent {
  /** Signed fraction of the chosen speed, -1 … 1. */
  forward: number;
  /** Signed fraction of the turn rate, -1 … 1. */
  turn: number;
  /** True when the player asked to walk instead of jog. */
  walk: boolean;
}

/** Stick deflection below this is ignored so a resting thumb doesn't drift. */
export const STICK_DEAD_ZONE = 0.15;

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

function applyDeadZone(v: number): number {
  const a = Math.abs(v);
  if (a < STICK_DEAD_ZONE) return 0;
  // Rescale so movement starts from 0 just outside the dead zone
  return Math.sign(v) * ((a - STICK_DEAD_ZONE) / (1 - STICK_DEAD_ZONE));
}

export function movementIntent(keys: Record<string, boolean>, stick: StickInput): MovementIntent {
  const keyForward = (keys['w'] ? 1 : 0) - (keys['s'] ? 1 : 0);
  const keyTurn = (keys['a'] ? 1 : 0) - (keys['d'] ? 1 : 0);
  if (keyForward !== 0 || keyTurn !== 0) {
    return { forward: keyForward, turn: keyTurn, walk: !!keys['shift'] };
  }
  return {
    forward: applyDeadZone(clamp(stick.forward)),
    turn: applyDeadZone(clamp(stick.turn)),
    walk: false,
  };
}

/**
 * Converts a thumb offset from the stick's centre (screen pixels, y down)
 * into stick input. `radius` is how far the knob can travel.
 */
export function stickFromOffset(dx: number, dy: number, radius: number): StickInput {
  const len = Math.hypot(dx, dy);
  const scale = len > radius ? radius / len : 1;
  return { forward: clamp((-dy * scale) / radius), turn: clamp((-dx * scale) / radius) };
}
