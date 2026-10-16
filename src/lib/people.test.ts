import { describe, expect, it } from 'vitest';
import { FRIENDSHIP_LEVELS, RESIDENTS, friendshipLevel, residentNear, sanitiseRelationships } from './people';
import { districtById, isDistrictId } from './geography';
import { lookById } from './looks';
import { resolveCollisions } from './world';

describe('residents', () => {
  it('live in real districts, standing somewhere reachable, with a real look', () => {
    expect(new Set(RESIDENTS.map((r) => r.id)).size).toBe(RESIDENTS.length);
    for (const r of RESIDENTS) {
      expect(isDistrictId(r.district), r.id).toBe(true);
      expect(lookById(r.lookId).id, r.id).toBe(r.lookId);
      const [x, , z] = r.position;
      const pos = resolveCollisions(x, z, undefined, districtById(r.district).layout.obstacles);
      expect(Math.hypot(pos.x - x, pos.z - z), r.id).toBeLessThan(0.01);
      expect(residentNear(r.district, x + 1, z)?.id).toBe(r.id);
      expect(r.lines).toHaveLength(FRIENDSHIP_LEVELS.length);
    }
  });

  it('every city has people to meet', () => {
    for (const d of ['lagos.marina', 'accra.osu']) expect(RESIDENTS.filter((r) => r.district === d).length).toBeGreaterThanOrEqual(3);
  });

  it('levels follow points', () => {
    expect(friendshipLevel(0)).toBe(0);
    expect(friendshipLevel(30)).toBe(2);
    expect(friendshipLevel(100)).toBe(4);
  });

  it('sanitises saved relationships', () => {
    expect(sanitiseRelationships({ tunde: { points: 500, lastDay: 3 }, ghost: { points: 5 }, adaeze: 'x' })).toEqual({ tunde: { points: 100, lastDay: 3 } });
  });
});
