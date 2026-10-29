import { describe, expect, it } from 'vitest';
import { FRIENDSHIP_LEVELS, RESIDENTS, STROLL_PAUSE, STROLL_SPEED, friendshipLevel, residentById, residentNear, residentPose, routineNow, sanitiseRelationships } from './people';
import { DISTRICTS, districtById, isDistrictId } from './geography';
import { lookById } from './looks';
import { PLAYER_RADIUS, resolveCollisions } from './world';

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
    expect(sanitiseRelationships({ tunde: { points: 500, lastDay: 3 }, ghost: { points: 5 }, adaeze: 'x' }))
      .toEqual({ tunde: { points: 100, lastDay: 3, lastHugDay: -1 } });
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

describe('a neighbour with a daily routine (Emeka at Palm View)', () => {
  const emeka = residentById('emeka-exec')!;
  const at = (h: number, m = 0) => h * 60 + m;
  const WED = 2, SAT = 5;

  it('is on the front step for morning coffee, away at work, and home in the evening', () => {
    expect(routineNow(emeka, at(3), WED)!.present).toBe(false);
    const coffee = routineNow(emeka, at(7), WED)!;
    expect(coffee.present).toBe(true);
    expect(coffee.pose!.moving).toBe(false);
    expect(coffee.doing).toMatch(/coffee/);
    expect(routineNow(emeka, at(12), WED)).toMatchObject({ present: false, doing: 'At work at the office' });
    expect(routineNow(emeka, at(19), WED)).toMatchObject({ present: true, doing: 'Chatting on the front step' });
    expect(routineNow(emeka, at(23), WED)!.present).toBe(false);
  });

  it('walks to work smoothly along the pavement, from his step to the far end', () => {
    const start = routineNow(emeka, at(7, 30), WED)!.pose!;
    const mid = routineNow(emeka, at(7, 40), WED)!.pose!;
    const later = routineNow(emeka, at(7, 40.5), WED)!.pose!;
    expect(Math.hypot(start.x + 6.2, start.z - 22)).toBeLessThan(0.01);
    expect(mid.moving).toBe(true);
    // Half a game minute (1.5 s of play) moves him a short, walking-pace step
    const stride = Math.hypot(later.x - mid.x, later.z - mid.z);
    expect(stride).toBeGreaterThan(0.5);
    expect(stride).toBeLessThan(2.5);
    expect(routineNow(emeka, at(7, 49.99), WED)!.pose!.z).toBeLessThan(-29);
  });

  it('every point of the commute is open pavement', () => {
    const { obstacles } = districtById('lagos.marina').layout;
    for (let m = at(7, 30); m < at(7, 50); m += 0.25) {
      const p = routineNow(emeka, m, WED)!.pose!;
      const r = resolveCollisions(p.x, p.z, PLAYER_RADIUS, obstacles);
      expect(Math.hypot(r.x - p.x, r.z - p.z), `blocked at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`).toBeLessThan(0.05);
    }
  });

  it('keeps a different day at the weekend: no commute', () => {
    expect(routineNow(emeka, at(7, 40), SAT)!.present).toBe(false);
    expect(routineNow(emeka, at(10), SAT)).toMatchObject({ present: true });
  });

  it('residents without a routine are unaffected', () => {
    expect(routineNow(residentById('officer-musa')!, at(12), WED)).toBeNull();
  });
});
