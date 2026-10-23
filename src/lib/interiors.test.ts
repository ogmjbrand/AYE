import { describe, expect, it } from 'vitest';
import { INTERIORS, bedSpot, doorSpot, interiorFor, interiorLayout } from './interiors';
import { allHomes, forSale } from './homes';
import { PLAYER_RADIUS, resolveCollisions } from './world';

describe.each(Object.values(INTERIORS).map((i) => [i.tier, i] as const))('%s interior', (_, room) => {
  const layout = interiorLayout(room);
  const free = (x: number, z: number) => {
    const r = resolveCollisions(x, z, PLAYER_RADIUS, layout.obstacles);
    return Math.hypot(r.x - x, r.z - z) < 0.01;
  };

  it('furniture fits inside the walls without overlapping', () => {
    const solid = room.furniture.filter((f) => f.kind !== 'rug');
    for (const f of room.furniture) {
      expect(Math.abs(f.at[0]) + f.size[0] / 2, f.kind).toBeLessThanOrEqual(room.width / 2);
      expect(Math.abs(f.at[1]) + f.size[2] / 2, f.kind).toBeLessThanOrEqual(room.depth / 2);
    }
    for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
      const a = solid[i], b = solid[j];
      const overlap = Math.abs(a.at[0] - b.at[0]) < (a.size[0] + b.size[0]) / 2 && Math.abs(a.at[1] - b.at[1]) < (a.size[2] + b.size[2]) / 2;
      expect(overlap, `${a.kind} overlaps ${b.kind}`).toBe(false);
    }
  });

  it('you can walk from the front door to the bed', () => {
    const start = doorSpot(room);
    const goal = bedSpot(room);
    expect(free(...start)).toBe(true);
    expect(free(...goal)).toBe(true);
    // Breadth-first search over a 0.25 m grid of free floor
    const step = 0.25;
    const key = (x: number, z: number) => `${Math.round(x / step)},${Math.round(z / step)}`;
    const seen = new Set([key(...start)]);
    const queue: [number, number][] = [[start[0], start[1]]];
    let reached = false;
    while (queue.length && !reached) {
      const [x, z] = queue.shift()!;
      if (Math.hypot(x - goal[0], z - goal[1]) < step) { reached = true; break; }
      for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        const nx = x + dx, nz = z + dz;
        if (seen.has(key(nx, nz)) || Math.abs(nx) > room.width / 2 || Math.abs(nz) > room.depth / 2 || !free(nx, nz)) continue;
        seen.add(key(nx, nz));
        queue.push([nx, nz]);
      }
    }
    expect(reached).toBe(true);
  });

  it('walls keep you in', () => {
    const r = resolveCollisions(0, -room.depth / 2 - 1, PLAYER_RADIUS, layout.obstacles);
    expect(r.z).toBeLessThan(-room.depth / 2);
    expect(free(0, -room.depth / 2 - 0.05)).toBe(false);
  });
});

describe('homes have interiors', () => {
  it('bigger rent, bigger home', () => {
    const sizes = allHomes().filter((h) => !forSale(h))
      .sort((a, b) => a.rentPerNight - b.rentPerNight)
      .map((h) => { const i = interiorFor(h); return i.width * i.depth; });
    for (let k = 1; k < sizes.length; k++) expect(sizes[k]).toBeGreaterThanOrEqual(sizes[k - 1]);
  });
});
