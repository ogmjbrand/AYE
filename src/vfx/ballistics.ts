/** Flight under gravity, for jets, droplets and splashes (vfx/WaterFx.tsx). */
export const GRAVITY = 9.81;

/** The launch velocity that carries something from `a` to `b` in `t` seconds under gravity. */
export function ballisticVelocity(a: readonly [number, number, number], b: readonly [number, number, number], t: number): [number, number, number] {
  return [(b[0] - a[0]) / t, (b[1] - a[1]) / t + 0.5 * GRAVITY * t, (b[2] - a[2]) / t];
}

/** Where a droplet launched from `a` at velocity `v` is after `t` seconds. */
export function ballisticPoint(a: readonly [number, number, number], v: readonly [number, number, number], t: number): [number, number, number] {
  return [a[0] + v[0] * t, a[1] + v[1] * t - 0.5 * GRAVITY * t * t, a[2] + v[2] * t];
}

