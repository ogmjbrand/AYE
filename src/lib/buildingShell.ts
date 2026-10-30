/**
 * Walls for walk-in buildings laid out as data (the hotel, the spa): a wall
 * runs between two points with gaps cut for doors, and its box is what the
 * 3D scene draws and collisions use, so what you see is what you walk into.
 */

/** Wall thickness, in metres. */
export const WALL_T = 0.3;

export interface WallSeg {
  x0: number; z0: number; x1: number; z1: number;
  /** Outer walls get the façade on their outside. */
  outer?: boolean;
  /** Glass instead of plaster (shop-front style). */
  glass?: boolean;
}

/** A wall from a to b along x (at z) or along z (at x), with gaps (centre, width) cut for doors. */
export function run(along: 'x' | 'z', fixed: number, from: number, to: number, gaps: readonly (readonly [number, number])[], extra: Partial<WallSeg> = {}): WallSeg[] {
  const cuts = [...gaps].sort((a, b) => a[0] - b[0]).map(([c, w]) => [c - w / 2, c + w / 2] as const);
  const out: WallSeg[] = [];
  let at = from;
  for (const [a, b] of [...cuts, [to, to] as const]) {
    if (a - at > 0.05) out.push(along === 'x' ? { x0: at, z0: fixed, x1: a, z1: fixed, ...extra } : { x0: fixed, z0: at, x1: fixed, z1: a, ...extra });
    at = Math.max(at, b);
  }
  return out;
}

/** A doorway left in a wall run: its centre, width, and whether the wall runs along x. */
export interface Doorway { x: number; z: number; width: number; alongX: boolean }

/** The doorways a run leaves (the same gaps as `run`), so each can be given a frame, a lintel and a door. */
export function doorways(along: 'x' | 'z', fixed: number, gaps: readonly (readonly [number, number])[]): Doorway[] {
  return gaps.map(([c, width]) => (along === 'x' ? { x: c, z: fixed, width, alongX: true } : { x: fixed, z: c, width, alongX: false }));
}

/** The wall's box: centre and size (x, z), WALL_T thick. */
export function wallBox(w: WallSeg) {
  const alongX = w.z0 === w.z1;
  return {
    x: (w.x0 + w.x1) / 2,
    z: (w.z0 + w.z1) / 2,
    sx: alongX ? Math.abs(w.x1 - w.x0) + (w.outer ? WALL_T : 0) : WALL_T,
    sz: alongX ? WALL_T : Math.abs(w.z1 - w.z0) + (w.outer ? WALL_T : 0),
  };
}
