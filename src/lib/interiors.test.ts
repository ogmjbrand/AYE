import { describe, expect, it } from 'vitest';
import {
  INTERIORS,
  CAR_DEALERSHIP_INTERIOR,
  FASHION_HOUSE_INTERIOR,
  RESTAURANT_INTERIOR,
  RESTAURANT_TABLES,
  bedSpot,
  doorSpot,
  fashionHouseInteractionAt,
  dealershipInteractionAt,
  homeInteractionAt,
  interiorFor,
  interiorLayout,
  lightSwitchSpot,
  restaurantInteractionAt,
} from './interiors';
import { allHomes, forSale } from './homes';
import { spotToUse } from './furniture';
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
    // A one-room home may have no sofa: then the bed is the goal
    const sofa = room.furniture.find((f) => f.kind === 'sofa');
    // Where you stand to use the sofa, as the home's furniture rules say (lib/furniture.ts)
    const goals = [
      bedSpot(room),
      ...(sofa ? [spotToUse(sofa)] : []),
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
      // Every piece of these kinds that the home has offers its action (homes differ in what they have)
      const item = room.furniture.find((f) => f.kind === kind);
      if (!item) continue;
      expect(homeInteractionAt(room, ...item.at), kind).toBe(action);
    }
    // The light switch by the door: you can stand there, and it isn't confused with the door
    const sw = lightSwitchSpot(room);
    expect(free(...sw), 'stand at the switch').toBe(true);
    expect(homeInteractionAt(room, ...sw)).toBe('lights');
    expect(Math.hypot(sw[0] - doorSpot(room)[0], sw[1] - doorSpot(room)[1])).toBeGreaterThan(1);
    // Every home has a bed and somewhere to wash
    expect(room.furniture.some((f) => f.kind === 'bed'), 'bed').toBe(true);
    expect(room.furniture.some((f) => f.kind === 'shower' || f.kind === 'bathtub'), 'wash').toBe(true);
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

describe('restaurant interior', () => {
  const layout = interiorLayout(RESTAURANT_INTERIOR);
  const free = (x: number, z: number) => {
    const resolved = resolveCollisions(x, z, PLAYER_RADIUS, layout.obstacles);
    return Math.hypot(resolved.x - x, resolved.z - z) < 0.01;
  };

  it('has a walkable entrance and a host point that requires approaching the stand', () => {
    const door = doorSpot(RESTAURANT_INTERIOR);
    const host = RESTAURANT_INTERIOR.furniture.find((item) => item.kind === 'host-stand')!;
    expect(free(...door)).toBe(true);
    expect(restaurantInteractionAt(...door)).toBe('door');
    expect(restaurantInteractionAt(...host.at)).toBe('host');
    expect(restaurantInteractionAt(0, -4.8)).toBeNull();
  });

  describe('car dealership interior', () => {
    const layout = interiorLayout(CAR_DEALERSHIP_INTERIOR);
    const free = (x: number, z: number) => {
      const resolved = resolveCollisions(x, z, PLAYER_RADIUS, layout.obstacles);
      return Math.hypot(resolved.x - x, resolved.z - z) < 0.01;
    };

    it('keeps the showroom entrance walkable and exposes salesperson and car interactions', () => {
      const door = doorSpot(CAR_DEALERSHIP_INTERIOR);
      expect(free(...door)).toBe(true);
      expect(dealershipInteractionAt(...door)).toBe('door');
      expect(dealershipInteractionAt(0, -3.6)).toBe('salesperson');
      expect(dealershipInteractionAt(6, 1.4)).toEqual({ type: 'vehicle', modelId: 'ikorodu-sport' });
    });
  });

  describe('Fashion House interior', () => {
    const layout = interiorLayout(FASHION_HOUSE_INTERIOR);
    const free = (x: number, z: number) => {
      const resolved = resolveCollisions(x, z, PLAYER_RADIUS, layout.obstacles);
      return Math.hypot(resolved.x - x, resolved.z - z) < 0.01;
    };

    it('keeps the boutique fixtures inside the room and the walkways clear', () => {
      for (const fixture of FASHION_HOUSE_INTERIOR.furniture) {
        expect(Math.abs(fixture.at[0]) + fixture.size[0] / 2, fixture.kind).toBeLessThanOrEqual(FASHION_HOUSE_INTERIOR.width / 2);
        expect(Math.abs(fixture.at[1]) + fixture.size[2] / 2, fixture.kind).toBeLessThanOrEqual(FASHION_HOUSE_INTERIOR.depth / 2);
      }
      const entry = doorSpot(FASHION_HOUSE_INTERIOR);
      expect(free(...entry)).toBe(true);
      expect(fashionHouseInteractionAt(...entry)).toBe('door');
      expect(fashionHouseInteractionAt(-4.1, -0.7)).toBe('catalogue');
    });

    it('allows the player to walk from the entrance to a clothing display', () => {
      const start = doorSpot(FASHION_HOUSE_INTERIOR);
      const goal = [-6.2, -0.7] as const;
      expect(fashionHouseInteractionAt(...goal)).toBe('catalogue');
      const step = 0.25;
      const key = (x: number, z: number) => `${Math.round(x / step)},${Math.round(z / step)}`;
      const seen = new Set([key(...start)]);
      const queue: [number, number][] = [[start[0], start[1]]];
      while (queue.length) {
        const [x, z] = queue.shift()!;
        if (Math.hypot(x - goal[0], z - goal[1]) < step) return;
        for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
          const nx = x + dx, nz = z + dz;
          if (seen.has(key(nx, nz)) || Math.abs(nx) > FASHION_HOUSE_INTERIOR.width / 2 || Math.abs(nz) > FASHION_HOUSE_INTERIOR.depth / 2 || !free(nx, nz)) continue;
          seen.add(key(nx, nz));
          queue.push([nx, nz]);
        }
      }
      expect.fail('The clothing display cannot be reached from the boutique entrance.');
    });
  });

  it('keeps every dining chair inside the room and its approach spot clear of tables', () => {
    for (const table of RESTAURANT_TABLES) {
      for (const seat of table.seats) {
        expect(Math.abs(seat.x)).toBeLessThan(RESTAURANT_INTERIOR.width / 2);
        expect(Math.abs(seat.z)).toBeLessThan(RESTAURANT_INTERIOR.depth / 2);
        const stand = standSpot(seat);
        expect(free(stand.x, stand.z), `${seat.id} approach`).toBe(true);
      }
    }
  });
});
