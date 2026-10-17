import { describe, expect, it } from 'vitest';
import { createGameState, createTime, gameReducer, type GameState } from './gameState';
import { DISTRICTS, counterAt } from './geography';
import { nearestVendor } from './food';
import { homeAtDoor } from './homes';
import { venueAt } from './nightlife';
import { PARK_RADIUS, parkAt } from './parks';
import { findPath, walkGridFor } from './pathfinding';
import { PLAYER_RADIUS, resolveCollisions } from './world';

const wait = (s: GameState, minutes: number) => gameReducer(s, { type: 'wait', minutes }, 'doctor', 'ordinary');

describe('sitting in the park', () => {
  it('lets 30 minutes, an hour or two hours pass, with the usual costs and hunger', () => {
    const s = createGameState(3000, createTime(14, 0, 2));
    const after = wait(s, 60);
    expect(after.time.totalMinutes - s.time.totalMinutes).toBe(60);
    expect(after.balance).toBeLessThan(s.balance); // an hour's living cost
    expect(after.fullness).toBeLessThan(s.fullness);
    expect(wait(s, 120).time.totalMinutes - s.time.totalMinutes).toBe(120);
  });

  it('never pays wages, even in working hours, and refuses odd lengths', () => {
    const s = createGameState(3000, createTime(10, 0, 2));
    expect(wait(s, 60).today.income).toBe(0);
    expect(wait(s, 999)).toBe(s);
    expect(wait(s, -30)).toBe(s);
  });
});

describe.each(DISTRICTS.map((d) => [d.id, d] as const))('the park in %s', (_, d) => {
  const park = d.layout.park!;
  const inArea = (x: number, z: number) => x >= park.area.minX && x <= park.area.maxX && z >= park.area.minZ && z <= park.area.maxZ;

  it('is off the roads and pavements, and clear of every building', () => {
    const { roadHalfWidth: R, pavementWidth: P, crossStreet: C } = d.layout;
    expect(park.area.minX >= R + P || park.area.maxX <= -R - P).toBe(true);
    expect(park.area.maxZ <= C.minZ - P || park.area.minZ >= C.maxZ + P).toBe(true);
    for (const b of d.layout.buildings) {
      const overlapX = b.position[0] + b.size[0] / 2 > park.area.minX && b.position[0] - b.size[0] / 2 < park.area.maxX;
      const overlapZ = b.position[2] + b.size[2] / 2 > park.area.minZ && b.position[2] - b.size[2] / 2 < park.area.maxZ;
      expect(overlapX && overlapZ, b.name ?? 'building').toBe(false);
    }
  });

  it('keeps its trees and benches inside, and you can stand at the benches', () => {
    for (const [x, z] of park.trees) expect(inArea(x, z), `tree ${x},${z}`).toBe(true);
    for (const b of park.benches) expect(inArea(b.x, b.z), `bench ${b.x},${b.z}`).toBe(true);
    const [sx, , sz] = d.park.position;
    const r = resolveCollisions(sx, sz, PLAYER_RADIUS, d.layout.obstacles);
    expect(Math.hypot(r.x - sx, r.z - sz)).toBeLessThan(1e-6);
    expect(park.benches.some((b) => Math.hypot(b.x - sx, b.z - sz) < 5)).toBe(true);
  });

  it('can be walked to from the arrival point, and E there means the park, nothing else', () => {
    const path = findPath(walkGridFor(d.layout.obstacles), { x: d.spawn[0], z: d.spawn[2] }, { x: d.park.position[0], z: d.park.position[2] });
    expect(path).not.toBeNull();
    const end = path![path!.length - 1];
    expect(parkAt(d.park, end.x, end.z)?.id).toBe(d.park.id);
    expect(Math.hypot(end.x - d.park.position[0], end.z - d.park.position[2])).toBeLessThanOrEqual(PARK_RADIUS);
    expect(counterAt(d, end.x, end.z)).toBeNull();
    expect(nearestVendor(d.vendors, end.x, end.z)).toBeNull();
    expect(homeAtDoor(d.id, end.x, end.z)).toBeUndefined();
    expect(venueAt(d.nightlife, end.x, end.z)).toBeUndefined();
  });
});
