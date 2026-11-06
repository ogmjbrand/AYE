import { describe, expect, it } from 'vitest';
import { compoundDoor, compoundObstacles } from './compound';
import { homesForSale, homeById } from './homes';
import { districtById } from './geography';
import { resolveCollisions, PLAYER_RADIUS } from './world';
import { interiorFor } from './interiors';

const lagoon = districtById('lagos.marina');
const crown = lagoon.layout.compounds!.find((c) => c.id === 'crown-residence')!;

describe('the Crown Residence', () => {
  it('is the most expensive home to buy in AYE, by a distance', () => {
    const forSale = homesForSale();
    const top = forSale[forSale.length - 1];
    expect(top.id).toBe('crown-residence');
    expect(top.price).toBeGreaterThanOrEqual(2 * forSale[forSale.length - 2].price!);
    expect(top.price).toBeLessThan(1_000_000_000); // far below the supernatural unlock
  });

  it('has its front door on the porch, and its own interior with a bed, a bath and the kitchen', () => {
    const home = homeById('crown-residence')!;
    expect(Math.hypot(home.door[0] - compoundDoor(crown)[0], home.door[2] - compoundDoor(crown)[2])).toBeLessThan(0.2);
    const kinds = interiorFor(home).furniture.map((f) => f.kind);
    for (const k of ['bed', 'bathtub', 'counter', 'sofa', 'tv'] as const) expect(kinds).toContain(k);
  });

  it('is walled all round except the open gate, and the house is solid', () => {
    const obstacles = compoundObstacles(crown);
    const blocked = (x: number, z: number) => {
      const r = resolveCollisions(x, z, PLAYER_RADIUS, obstacles);
      return Math.hypot(r.x - x, r.z - z) > 0.01;
    };
    expect(blocked(crown.maxX, (crown.gate.z0 + crown.gate.z1) / 2)).toBe(false); // the gate
    expect(blocked(crown.maxX, crown.minZ + 2)).toBe(true); // the east wall south of it
    expect(blocked(crown.minX, 10)).toBe(true);
    expect(blocked((crown.house.minX + crown.house.maxX) / 2, (crown.house.minZ + crown.house.maxZ) / 2)).toBe(true);
  });

  it('can be walked into from the lane: in at the gate and along the drive to the porch', () => {
    const { obstacles } = lagoon.layout;
    let x = -28.5, z = (crown.gate.z0 + crown.gate.z1) / 2;
    const door = compoundDoor(crown);
    // Straight west through the gate, then along the drive to the door
    for (const [tx, tz] of [[-35, z], [door[0], door[2]]] as const) {
      for (let i = 0; i < 400; i++) {
        const dx = tx - x, dz = tz - z, dist = Math.hypot(dx, dz);
        if (dist < 0.05) break;
        const step = Math.min(0.05, dist);
        const r = resolveCollisions(x + (dx / dist) * step, z + (dz / dist) * step, PLAYER_RADIUS, obstacles);
        x = r.x; z = r.z;
      }
    }
    expect(Math.hypot(x - door[0], z - door[2])).toBeLessThan(0.5);
  });
});
