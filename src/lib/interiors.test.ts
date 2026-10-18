import { describe, expect, it } from 'vitest';
import { INTERIORS, bedSpot, doorSpot, homeInteractionAt, interiorFor, interiorLayout } from './interiors';
import { allHomes } from './homes';
import { PLAYER_RADIUS, resolveCollisions } from './world';
import { standSpot } from './seating';

describe.each(Object.values(INTERIORS).map((i) => [i.tier, i] as const))('%s interior', (_, room) => {
  const layout = interiorLayout(room);
  const free = (x: number, z: number) => {
    const r = resolveCollisions(x, z, PLAYER_RADIUS, layout.obstacles);
    return Math.hypot(r.x - x, r.z - z) < 0.01;
  };

  it('furniture fits inside the walls without overlapping', () => {
    const solid = room.furniture.filter((f) => !['rug', 'cabinet', 'mirror'].includes(f.kind));
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

  it('you can walk from the front door to the bed and sofa', () => {
    const start = doorSpot(room);
    const sofa = room.furniture.find((f) => f.kind === 'sofa')!;
    const sofaStand = standSpot({ id: 'home-sofa', x: sofa.at[0], z: sofa.at[1], facing: Math.PI, height: 0.45 });
    const goals = [
      bedSpot(room),
      [sofaStand.x, sofaStand.z] as const,
    ];
    expect(free(...start)).toBe(true);
    goals.forEach((goal) => expect(free(...goal)).toBe(true));
    // Breadth-first search over a 0.25 m grid of free floor
    const step = 0.25;
    const key = (x: number, z: number) => `${Math.round(x / step)},${Math.round(z / step)}`;
    const seen = new Set([key(...start)]);
    const queue: [number, number][] = [[start[0], start[1]]];
    const reached = new Set<number>();
    while (queue.length && reached.size < goals.length) {
      const [x, z] = queue.shift()!;
      goals.forEach((goal, index) => {
        if (Math.hypot(x - goal[0], z - goal[1]) < step) reached.add(index);
      });
      for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        const nx = x + dx, nz = z + dz;
        if (seen.has(key(nx, nz)) || Math.abs(nx) > room.width / 2 || Math.abs(nz) > room.depth / 2 || !free(nx, nz)) continue;
        seen.add(key(nx, nz));
        queue.push([nx, nz]);
      }
    }
    expect(reached.size, `reached ${[...reached].map((index) => index === 0 ? 'bed' : 'sofa').join(', ')}`).toBe(goals.length);
  });

  it('walls keep you in', () => {
    const r = resolveCollisions(0, -room.depth / 2 - 1, PLAYER_RADIUS, layout.obstacles);
    expect(r.z).toBeLessThan(-room.depth / 2);
    expect(free(0, -room.depth / 2 - 0.05)).toBe(false);
  });

  it('offers contextual interactions for the front door and furnishings', () => {
    expect(homeInteractionAt(room, ...doorSpot(room))).toBe('door');
    for (const [kind, action] of [
      ['bed', 'bed'],
      ['wardrobe', 'wardrobe'],
      ['mirror', 'mirror'],
      ['sofa', 'sofa'],
      ['tv', 'tv'],
      ['counter', 'kitchen'],
      ['shower', 'bathroom'],
    ] as const) {
      const item = room.furniture.find((f) => f.kind === kind)!;
      expect(homeInteractionAt(room, ...item.at), kind).toBe(action);
    }
  });
});

describe('homes have interiors', () => {
  it('bigger rent, bigger home', () => {
    const sizes = allHomes()
      .sort((a, b) => a.rentPerNight - b.rentPerNight)
      .map((h) => { const i = interiorFor(h); return i.width * i.depth; });
    for (let k = 1; k < sizes.length; k++) expect(sizes[k]).toBeGreaterThanOrEqual(sizes[k - 1]);
  });
});
