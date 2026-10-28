import { describe, expect, it } from 'vitest';
import { DISTRICTS } from './geography';
import { pedestrianInTrafficPath, TRAFFIC, initTraffic, stepTraffic, type Car } from './traffic';
import { DANFO_SIZE } from './world';

const run = (cars: Car[], lanes: Parameters<typeof stepTraffic>[1], person: Parameters<typeof stepTraffic>[2], seconds: number) => {
  for (let t = 0; t < seconds; t += 0.05) cars = stepTraffic(cars, lanes, person, 0.05);
  return cars;
};

describe.each(DISTRICTS.map((d) => [d.id, d.layout] as const))('traffic in %s', (_, layout) => {
  const lanes = layout.traffic;

  it('drives on the road, clear of parked buses and pavements', () => {
    for (const lane of lanes) {
      expect(Math.abs(lane.x) + DANFO_SIZE[0] / 2).toBeLessThanOrEqual(layout.roadHalfWidth);
      for (const v of layout.vehicles) {
        const gap = Math.abs(v.position[0] - lane.x) - DANFO_SIZE[0];
        expect(gap, `lane ${lane.x} vs parked bus at ${v.position[0]}`).toBeGreaterThan(0);
      }
    }
  });

  it('keeps moving on a clear road and never runs into the car in front', () => {
    let cars = initTraffic(lanes);
    const start = cars.map((c) => c.z);
    for (let t = 0; t < 60; t += 0.05) {
      cars = stepTraffic(cars, lanes, null, 0.05);
      for (const a of cars) for (const b of cars) {
        if (a !== b && a.lane === b.lane) expect(Math.abs(a.z - b.z)).toBeGreaterThan(DANFO_SIZE[2]);
      }
    }
    expect(cars.some((c, i) => Math.abs(c.z - start[i]) > 1)).toBe(true);
  });

  it('stops before a person standing in its lane, then drives on when they leave', () => {
    const lane = lanes[0];
    const person = { x: lane.x, z: 0 };
    const approaching: Car[] = [{ lane: 0, z: -30 * lane.dir, speed: TRAFFIC.maxSpeed }];
    const stopped = run(approaching, lanes, person, 20);
    expect(stopped[0].speed).toBeCloseTo(0, 1);
    const distance = (person.z - stopped[0].z) * lane.dir;
    expect(distance).toBeGreaterThan(DANFO_SIZE[2] / 2);
    const later = run(stopped, lanes, null, 5);
    expect(later[0].speed).toBeGreaterThan(5);
  });

  it('brakes for every pedestrian in the lane, including residents', () => {
    const lane = lanes[0];
    const approaching: Car[] = [{ lane: 0, z: -30 * lane.dir, speed: TRAFFIC.maxSpeed }];
    const stopped = run(approaching, lanes, [{ x: lane.x, z: 0 }, { x: lane.x, z: 12 }], 20);
    expect(stopped[0].speed).toBeCloseTo(0, 1);
    expect((0 - stopped[0].z) * lane.dir).toBeGreaterThan(DANFO_SIZE[2] / 2);
  });

  it('detects a predicted collision and ignores pedestrians outside the vehicle path', () => {
    const lane = lanes[0];
    const approaching: Car[] = [{ lane: 0, z: -7 * lane.dir, speed: TRAFFIC.maxSpeed }];
    expect(pedestrianInTrafficPath({ x: lane.x, z: 0, vx: 0, vz: 0 }, approaching, lanes)).toBe(true);
    expect(pedestrianInTrafficPath({
      x: lane.x + TRAFFIC.laneHalfWidth + 1,
      z: 0,
      vx: 0,
      vz: 0,
    }, approaching, lanes)).toBe(false);
  });

  it('detects a pedestrian moving across a vehicle path', () => {
    const lane = lanes[0];
    const car: Car[] = [{ lane: 0, z: 0, speed: TRAFFIC.maxSpeed }];
    expect(pedestrianInTrafficPath({
      x: lane.x + 2.2,
      z: 0,
      vx: -4,
      vz: 0,
    }, car, lanes)).toBe(true);
  });
});
