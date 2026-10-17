/**
 * Route finding for click-to-move: A* over a walkability grid built from a
 * layout's obstacles (buildings, parked buses, stalls, palms, lamps, poles;
 * an interior's walls and furniture), then smoothed into a few straight legs.
 * Moving traffic isn't planned around: it moves, so the controller re-plans
 * if it gets stuck behind it.
 */
import { PLAYER_RADIUS, WORLD_BOUND, type Obstacle } from './world';

export interface Point {
  x: number;
  z: number;
}

/** Grid spacing in metres. */
export const CELL = 0.5;
/** Clearance kept from obstacles, beyond the player's own radius. */
const MARGIN = 0.15;
const SIZE = Math.round((2 * WORLD_BOUND) / CELL) + 1;
/** Search budget, so a hopeless click can't stall a frame. */
const MAX_EXPANSIONS = 40000;

export interface WalkGrid {
  blocked: Uint8Array;
}

const toCell = (v: number) => Math.max(0, Math.min(SIZE - 1, Math.round((v + WORLD_BOUND) / CELL)));
const toWorld = (c: number) => c * CELL - WORLD_BOUND;

export function buildWalkGrid(obstacles: readonly Obstacle[]): WalkGrid {
  const blocked = new Uint8Array(SIZE * SIZE);
  const pad = PLAYER_RADIUS + MARGIN;
  for (const o of obstacles) {
    const minX = o.position[0] - o.size[0] / 2 - pad, maxX = o.position[0] + o.size[0] / 2 + pad;
    const minZ = o.position[2] - o.size[2] / 2 - pad, maxZ = o.position[2] + o.size[2] / 2 + pad;
    for (let cz = toCell(minZ); cz <= toCell(maxZ); cz++) {
      const z = toWorld(cz);
      if (z < minZ || z > maxZ) continue;
      for (let cx = toCell(minX); cx <= toCell(maxX); cx++) {
        const x = toWorld(cx);
        if (x >= minX && x <= maxX) blocked[cz * SIZE + cx] = 1;
      }
    }
  }
  return { blocked };
}

const grids = new WeakMap<readonly Obstacle[], WalkGrid>();
/** The grid for a set of obstacles, built once and reused (layouts don't change). */
export function walkGridFor(obstacles: readonly Obstacle[]): WalkGrid {
  let g = grids.get(obstacles);
  if (!g) grids.set(obstacles, (g = buildWalkGrid(obstacles)));
  return g;
}

const free = (g: WalkGrid, cx: number, cz: number) => cx >= 0 && cz >= 0 && cx < SIZE && cz < SIZE && !g.blocked[cz * SIZE + cx];

/** The free cell nearest to a point (ring search), or null if there's none close by. */
function nearestFree(g: WalkGrid, p: Point): number | null {
  const cx = toCell(p.x), cz = toCell(p.z);
  for (let r = 0; r <= 8; r++) {
    let best: number | null = null, bestD = Infinity;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r || !free(g, cx + dx, cz + dz)) continue;
        const d = (toWorld(cx + dx) - p.x) ** 2 + (toWorld(cz + dz) - p.z) ** 2;
        if (d < bestD) { bestD = d; best = (cz + dz) * SIZE + cx + dx; }
      }
    }
    if (best !== null) return best;
  }
  return null;
}

/** True if a straight walk from a to b stays on free cells. */
export function clearLine(g: WalkGrid, a: Point, b: Point): boolean {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.max(1, Math.ceil(len / (CELL / 3)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (!free(g, toCell(a.x + (b.x - a.x) * t), toCell(a.z + (b.z - a.z) * t))) return false;
  }
  return true;
}

/** Minimal binary heap of [priority, node]. */
class Heap {
  private items: [number, number][] = [];
  get size() { return this.items.length; }
  push(p: number, n: number) {
    const a = this.items;
    a.push([p, n]);
    for (let i = a.length - 1; i > 0;) {
      const j = (i - 1) >> 1;
      if (a[j][0] <= a[i][0]) break;
      [a[i], a[j]] = [a[j], a[i]];
      i = j;
    }
  }
  pop(): number {
    const a = this.items;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top[1];
  }
}

const NEIGHBOURS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]] as const;

/**
 * Waypoints from `from` to (as near as possible to) `to`, ending at the
 * reachable spot nearest the click; null when there's no way there.
 */
export function findPath(g: WalkGrid, from: Point, to: Point): Point[] | null {
  const start = nearestFree(g, from);
  const goal = nearestFree(g, to);
  if (start === null || goal === null) return null;
  const end: Point = g.blocked[toCell(to.z) * SIZE + toCell(to.x)] ? { x: toWorld(goal % SIZE), z: toWorld(Math.floor(goal / SIZE)) } : to;
  if (clearLine(g, from, end)) return [end];

  const gx = goal % SIZE, gz = Math.floor(goal / SIZE);
  const h = (n: number) => {
    const dx = Math.abs((n % SIZE) - gx), dz = Math.abs(Math.floor(n / SIZE) - gz);
    return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
  };
  const cost = new Map<number, number>([[start, 0]]);
  const came = new Map<number, number>();
  const open = new Heap();
  open.push(h(start), start);
  let expansions = 0;
  while (open.size && expansions++ < MAX_EXPANSIONS) {
    const n = open.pop();
    if (n === goal) break;
    const cx = n % SIZE, cz = Math.floor(n / SIZE);
    const base = cost.get(n)!;
    for (const [dx, dz, step] of NEIGHBOURS) {
      const nx = cx + dx, nz = cz + dz;
      if (!free(g, nx, nz)) continue;
      // No squeezing diagonally between two blocked corners
      if (dx && dz && (!free(g, cx + dx, cz) || !free(g, cx, cz + dz))) continue;
      const m = nz * SIZE + nx;
      const c = base + step;
      if (c < (cost.get(m) ?? Infinity)) {
        cost.set(m, c);
        came.set(m, n);
        open.push(c + h(m), m);
      }
    }
  }
  if (!came.has(goal) && goal !== start) return null;

  const cells: Point[] = [];
  for (let n: number | undefined = goal; n !== undefined && n !== start; n = came.get(n)) {
    cells.push({ x: toWorld(n % SIZE), z: toWorld(Math.floor(n / SIZE)) });
  }
  cells.reverse();
  cells[cells.length - 1] = end;

  // String-pull: keep only the corners that a straight walk can't skip
  const path: Point[] = [];
  let anchor = from;
  for (let i = 0; i < cells.length; i++) {
    const next = cells[i + 1];
    if (!next || !clearLine(g, anchor, next)) {
      path.push(cells[i]);
      anchor = cells[i];
    }
  }
  return path;
}
