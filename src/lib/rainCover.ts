import type { Obstacle } from './world';

/**
 * The highest roof over (x, z) among `boxes` (buildings, buses, shelters: anything solid and tall),
 * or -Infinity in the open. Rain stops there, so it never falls through a roof or inside a doorway.
 */
export function roofOver(x: number, z: number, boxes: readonly Obstacle[]): number {
  let top = -Infinity;
  for (const o of boxes) {
    if (Math.abs(x - o.position[0]) <= o.size[0] / 2 && Math.abs(z - o.position[2]) <= o.size[2] / 2) top = Math.max(top, (o.position[1] ?? 0) + o.size[1]);
  }
  return top;
}
