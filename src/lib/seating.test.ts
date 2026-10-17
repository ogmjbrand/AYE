import { describe, expect, it } from 'vitest';
import { createGameState, createTime, gameReducer, type GameState } from './gameState';
import { DISTRICTS } from './geography';
import { findPath, walkGridFor } from './pathfinding';
import { PLAYER_RADIUS, resolveCollisions } from './world';
import { BENCH_SEAT_HEIGHT, benchSeats, chairSeats, nearestSeat, seatDrop, seatedSpot, standSpot, waitStep } from './seating';

describe('lining a body up with a seat', () => {
  it('lowers a 1.8 m person so they rest on a 45 cm seat, and a shorter one less', () => {
    const seat = { id: 's', x: 0, z: 0, facing: 0, height: BENCH_SEAT_HEIGHT };
    expect(seatDrop(seat, 1.8)).toBeCloseTo(0, 5);
    expect(seatDrop(seat, 1.6)).toBeCloseTo(0.05, 5);
  });

  it('sits back against the backrest and stands up in front, along the way the seat faces', () => {
    const seat = { id: 's', x: 2, z: 3, facing: Math.PI / 2, height: 0.45 };
    expect(seatedSpot(seat).x).toBeLessThan(2);
    expect(standSpot(seat).x).toBeGreaterThan(2.5);
    expect(standSpot(seat).z).toBeCloseTo(3, 5);
  });
});

describe('waiting while seated', () => {
  it('adds up to exactly the chosen time, whatever the frame timing', () => {
    for (const total of [30, 60, 120]) {
      let left = total, added = 0;
      const steps = [0.25, 0.1, 0.4, 0.016, 0.25, 0.9];
      for (let i = 0; left > 0; i++) { const m = waitStep(left, steps[i % steps.length]); added += m; left -= m; }
      expect(added).toBe(total);
    }
  });

  it('standing up early charges only the minutes actually sat, through the same rules', () => {
    let s: GameState = createGameState(3000, createTime(14, 0, 2));
    const start = s;
    let left = 60;
    for (let i = 0; i < 3; i++) { const m = waitStep(left, 0.25); s = gameReducer(s, { type: 'wait', minutes: m }, 'doctor', 'ordinary'); left -= m; }
    const sat = 60 - left;
    expect(sat).toBeGreaterThan(0);
    expect(sat).toBeLessThan(60);
    expect(s.time.totalMinutes - start.time.totalMinutes).toBe(sat);
    expect(s.today.income).toBe(0);
    expect(waitStep(0, 1)).toBe(0);
  });
});

describe.each(DISTRICTS.map((d) => [d.id, d] as const))('seats in %s', (_, d) => {
  const seats = [...benchSeats(d.layout.park), ...chairSeats(d.layout.terraceChairs)];

  it('has two places per park bench and two terrace chairs at the lounge', () => {
    expect(benchSeats(d.layout.park).length).toBe(d.layout.park!.benches.length * 2);
    expect(chairSeats(d.layout.terraceChairs).length).toBe(2);
  });

  it('every seat can be walked up to: its standing spot is clear and on a route from the arrival point', () => {
    const grid = walkGridFor(d.layout.obstacles);
    for (const s of seats) {
      const p = standSpot(s);
      const r = resolveCollisions(p.x, p.z, PLAYER_RADIUS, d.layout.obstacles);
      expect(Math.hypot(r.x - p.x, r.z - p.z), s.id).toBeLessThan(1e-6);
      const path = findPath(grid, { x: d.spawn[0], z: d.spawn[2] }, p);
      expect(path, s.id).not.toBeNull();
      const end = path![path!.length - 1];
      expect(Math.hypot(end.x - p.x, end.z - p.z), s.id).toBeLessThan(0.5);
    }
  });

  it('the terrace chairs are beside the lounge door, and the nearest bench seat is found from the park', () => {
    for (const c of chairSeats(d.layout.terraceChairs)) {
      expect(Math.hypot(c.x - d.nightlife.position[0], c.z - d.nightlife.position[2])).toBeLessThan(4);
    }
    const near = nearestSeat(benchSeats(d.layout.park), d.park.position[0], d.park.position[2]);
    expect(near).toBeDefined();
  });
});
