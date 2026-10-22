import { describe, expect, it } from 'vitest';
import { findPath, walkGridFor } from './pathfinding';
import { resolveCollisions } from './world';
import {
  ARRIVE_SPOT, BENCH_SEATS, DESTINATIONS, HALL_SEATS, LAB_SEATS, LIBRARY_SEATS, ROOMS, SPOTS, WALLS,
  roomAt, routeTo, spotAt, universityLayout,
} from './university';
import { standSpot } from './seating';

const layout = universityLayout();
const grid = walkGridFor(layout.obstacles);
const free = (x: number, z: number) => {
  const r = resolveCollisions(x, z, undefined, layout.obstacles);
  return Math.hypot(r.x - x, r.z - z) < 1e-6;
};
const reach = (x: number, z: number) => findPath(grid, { x: ARRIVE_SPOT[0], z: ARRIVE_SPOT[1] }, { x, z });

describe('campus plan', () => {
  it('starts you on open pavement in front of the gate', () => {
    expect(free(ARRIVE_SPOT[0], ARRIVE_SPOT[1])).toBe(true);
    expect(roomAt(ARRIVE_SPOT[0], ARRIVE_SPOT[1])).toBe('outside');
  });

  it('every room is reachable on foot from the street, through its door', () => {
    for (const [id, r] of Object.entries(ROOMS)) {
      const cx = (r.x0 + r.x1) / 2;
      const inside: [number, number] = [r.door[0], r.door[1] === 12 ? r.door[1] - 1.2 : r.door[1] + 1.2];
      if (id === 'lobby') inside[1] = 5;
      expect(free(inside[0], inside[1]), `${id} entrance`).toBe(true);
      expect(reach(inside[0], inside[1]), `${id} reachable`).not.toBeNull();
      expect(roomAt(inside[0], inside[1])).toBe(id);
      expect(cx).toBeGreaterThan(-30);
    }
  });

  it('door gaps really are gaps in the walls', () => {
    for (const r of Object.values(ROOMS)) expect(free(r.door[0], r.door[1]), `door at ${r.door}`).toBe(true);
  });

  it('walls are axis-aligned with real length', () => {
    for (const w of WALLS) {
      expect(w.x0 === w.x1 || w.z0 === w.z1).toBe(true);
      expect(Math.hypot(w.x1 - w.x0, w.z1 - w.z0)).toBeGreaterThan(0.05);
    }
  });

  it('every interaction spot is on open floor you can walk to', () => {
    for (const s of SPOTS) {
      expect(free(s.x, s.z), s.id).toBe(true);
      expect(reach(s.x, s.z), s.id).not.toBeNull();
      expect(spotAt(s.x, s.z)?.id).toBe(s.id);
    }
  });

  it('every seat you can take has a reachable place to stand', () => {
    for (const seat of [...HALL_SEATS, ...LAB_SEATS, ...LIBRARY_SEATS, ...BENCH_SEATS]) {
      const p = standSpot(seat);
      expect(free(p.x, p.z), seat.id).toBe(true);
      expect(reach(p.x, p.z), seat.id).not.toBeNull();
    }
  });

  it('the directory only lists places that exist, and routes to them through open floor', () => {
    const starts: [number, number][] = [[ARRIVE_SPOT[0], ARRIVE_SPOT[1]], [0, -20], [0, 6], [-20, 24], [20, 5]];
    for (const d of DESTINATIONS) {
      expect(d.room === 'outside' || d.room in ROOMS).toBe(true);
      for (const [x, z] of starts) {
        const pts = routeTo(x, z, d);
        for (const [px, pz] of pts) expect(free(px, pz), `${d.id} from ${x},${z}: waypoint ${px},${pz}`).toBe(true);
      }
    }
  });

  it('knows which room you are in', () => {
    expect(roomAt(0, -10)).toBe('outside');
    expect(roomAt(0, 6)).toBe('lobby');
    expect(roomAt(-15, 7)).toBe('hall-a');
    expect(roomAt(0, 14)).toBe('corridor');
    expect(roomAt(-20, 24)).toBe('library');
    expect(roomAt(20, 6)).toBe('cafeteria');
  });
});
