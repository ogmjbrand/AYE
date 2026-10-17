import { describe, expect, it } from 'vitest';
import { buildWalkGrid, clearLine, findPath, walkGridFor, type Point } from './pathfinding';
import { PLAYER_RADIUS, resolveCollisions, type Obstacle } from './world';
import { DISTRICTS } from './geography';

const box = (x: number, z: number, w: number, d: number): Obstacle => ({ position: [x, 0, z], size: [w, 1, d] });

/** Walks the route in small steps and checks no point is inside an obstacle. */
function routeIsClear(obstacles: readonly Obstacle[], from: Point, path: Point[]) {
  let a = from;
  for (const b of path) {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.1);
    for (let i = 0; i <= n; i++) {
      const p = { x: a.x + ((b.x - a.x) * i) / n, z: a.z + ((b.z - a.z) * i) / n };
      const r = resolveCollisions(p.x, p.z, PLAYER_RADIUS, obstacles);
      if (Math.hypot(r.x - p.x, r.z - p.z) > 1e-6) return false;
    }
    a = b;
  }
  return true;
}

describe('path finding', () => {
  it('goes straight when nothing is in the way', () => {
    const g = buildWalkGrid([box(10, 10, 2, 2)]);
    expect(findPath(g, { x: 0, z: 0 }, { x: 0, z: 8 })).toEqual([{ x: 0, z: 8 }]);
  });

  it('routes around a parked bus instead of into it', () => {
    const bus = [box(0, 5, 2, 5)];
    const g = buildWalkGrid(bus);
    expect(clearLine(g, { x: 0, z: 0 }, { x: 0, z: 10 })).toBe(false);
    const path = findPath(g, { x: 0, z: 0 }, { x: 0, z: 10 })!;
    expect(path.length).toBeGreaterThan(1);
    expect(path[path.length - 1]).toEqual({ x: 0, z: 10 });
    expect(routeIsClear(bus, { x: 0, z: 0 }, path)).toBe(true);
  });

  it('gets through a gap between two buildings, and goes round a wall with no gap', () => {
    const wall = [box(-6, 5, 10, 1), box(6, 5, 10, 1)]; // 2 m gap at x = 0
    const path = findPath(buildWalkGrid(wall), { x: -6, z: 0 }, { x: -6, z: 10 })!;
    expect(routeIsClear(wall, { x: -6, z: 0 }, path)).toBe(true);
    expect(path.some((p) => Math.abs(p.x) < 1.2)).toBe(true);
  });

  it('a click inside a building leads to the nearest spot outside it', () => {
    const shop = [box(0, 10, 6, 6)];
    const path = findPath(buildWalkGrid(shop), { x: 0, z: 0 }, { x: 0, z: 10 })!;
    const end = path[path.length - 1];
    expect(end.z).toBeLessThan(7);
    expect(routeIsClear(shop, { x: 0, z: 0 }, path)).toBe(true);
  });

  it('starting right next to an obstacle, a few centimetres from the goal, still gives a route', () => {
    const chair = [box(0, 0, 0.6, 0.6)];
    const g = buildWalkGrid(chair);
    const path = findPath(g, { x: 0.75, z: 0.05 }, { x: 0.8, z: 0 });
    expect(path).toEqual([{ x: 0.8, z: 0 }]);
  });

  it('says so when there is no way there', () => {
    const pen = [box(0, 3, 8, 1), box(0, -3, 8, 1), box(3, 0, 1, 8), box(-3, 0, 1, 8)];
    expect(findPath(buildWalkGrid(pen), { x: 0, z: 0 }, { x: 20, z: 0 })).toBeNull();
  });

  it('finds clear routes across every district', () => {
    for (const d of DISTRICTS) {
      const obstacles = d.layout.obstacles;
      const g = walkGridFor(obstacles);
      const from = { x: d.spawn[0], z: d.spawn[2] };
      for (const to of [{ x: -6, z: 30 }, { x: 6, z: -30 }, { x: 0, z: 40 }]) {
        const path = findPath(g, from, to);
        expect(path, `${d.id} → ${to.x},${to.z}`).not.toBeNull();
        expect(routeIsClear(obstacles, from, path!), `${d.id} → ${to.x},${to.z}`).toBe(true);
      }
    }
  });
});
