import { describe, expect, it } from 'vitest';
import { FRIENDSHIP_LEVELS, RESIDENTS, STROLL_PAUSE, STROLL_SPEED, friendshipLevel, residentNear, residentPose, sanitiseRelationships } from './people';
import { DISTRICTS, districtById, isDistrictId } from './geography';
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
    for (const d of DISTRICTS) expect(RESIDENTS.filter((r) => r.district === d.id).length, d.id).toBeGreaterThanOrEqual(3);
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

describe('strolling', () => {
  it('every route stays clear of buildings, lamps, trees and parked buses', () => {
    for (const r of RESIDENTS) {
      if (!r.route) continue;
      expect(r.route[0], r.id).toEqual([r.position[0], r.position[2]]);
      const obstacles = districtById(r.district).layout.obstacles;
      for (let t = 0; t < 120; t += 0.25) {
        const p = residentPose(r, t);
        const fixed = resolveCollisions(p.x, p.z, 0.3, obstacles);
        expect(Math.hypot(fixed.x - p.x, fixed.z - p.z), `${r.id} at t=${t}`).toBeLessThan(0.01);
      }
    }
  });

  it('walks there and back, pausing at each end', () => {
    const tunde = RESIDENTS.find((r) => r.id === 'tunde')!;
    const [a, b] = tunde.route!;
    const leg = Math.hypot(b[0] - a[0], b[1] - a[1]) / STROLL_SPEED;
    expect(residentPose(tunde, 0)).toMatchObject({ x: a[0], z: a[1], moving: true });
    const mid = residentPose(tunde, leg / 2);
    expect(mid.z).toBeCloseTo((a[1] + b[1]) / 2);
    expect(residentPose(tunde, leg + STROLL_PAUSE / 2)).toMatchObject({ x: b[0], z: b[1], moving: false });
    // A whole cycle later, back where they started
    const cycle = 2 * (leg + STROLL_PAUSE);
    expect(residentPose(tunde, cycle).z).toBeCloseTo(a[1]);
  });
});
