import { describe, expect, it } from 'vitest';
import { advanceVehicleMotion, isVehicleSpawnClear } from './vehicleDriving';
import { DISTRICTS } from './geography';
import { residentPosition, residentsIn } from './people';

describe('vehicle motion', () => {
  it('accelerates, caps speed, and reverses at a lower speed', () => {
    const moving = advanceVehicleMotion(
      { x: 0, z: 0, direction: 0, speed: 0 },
      { forward: 1, turn: 0, delta: 0.1 },
      [],
    );
    expect(moving.speed).toBeCloseTo(0.7);
    expect(moving.z).toBeGreaterThan(0);

    const capped = advanceVehicleMotion(
      { x: 0, z: 0, direction: 0, speed: 12.9 },
      { forward: 1, turn: 0, delta: 0.1 },
      [],
    );
    expect(capped.speed).toBe(13);

    const reversing = advanceVehicleMotion(
      { x: 0, z: 0, direction: 0, speed: 0 },
      { forward: -1, turn: 0, delta: 0.1 },
      [],
    );
    expect(reversing.speed).toBeCloseTo(-0.7);
    expect(reversing.z).toBeLessThan(0);
  });

  it('turns while moving and stops when the collision resolver blocks the car', () => {
    const turning = advanceVehicleMotion(
      { x: 0, z: 0, direction: 0, speed: 4 },
      { forward: 0, turn: 1, delta: 0.1 },
      [],
    );
    expect(turning.direction).toBeGreaterThan(0);

    const blocked = advanceVehicleMotion(
      { x: 0, z: 0, direction: 0, speed: 12 },
      { forward: 1, turn: 0, delta: 0.1 },
      [{ position: [0, 0, 2], size: [4, 1, 1] }],
    );
    expect(blocked.speed).toBe(0);
    expect(blocked.z).toBeLessThan(1.5);
  });

  it('keeps the dealership spawn clear in the built Lagos city layout', () => {
    const district = DISTRICTS.find((item) => item.id === 'lagos.marina')!;
    const pedestrians = residentsIn(district.id).map(residentPosition);
    expect(isVehicleSpawnClear({ x: 38.5, z: 20 }, district.layout.obstacles, pedestrians)).toBe(true);
  });

  it('rejects a spawn blocked by a building or nearby pedestrian', () => {
    expect(isVehicleSpawnClear(
      { x: 0, z: 0 },
      [{ position: [0, 0, 0], size: [4, 1, 4] }],
      [],
    )).toBe(false);
    expect(isVehicleSpawnClear(
      { x: 0, z: 0 },
      [],
      [{ x: 2, z: 0 }],
    )).toBe(false);
  });
});
