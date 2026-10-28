import { describe, expect, it } from 'vitest';
import { LAMP_POOL_SIZE, nearestLamps } from './lamps';

const lamp = (x: number, z: number, intensity = 1, distance = 8) => ({ x, z, intensity, distance });

describe('nearestLamps', () => {
  it('lights the nearest lamps first, no more than asked', () => {
    const lamps = [lamp(20, 0), lamp(2, 0), lamp(0, 5), lamp(-9, 0)];
    expect(nearestLamps(lamps, 0, 0, LAMP_POOL_SIZE)).toEqual([lamp(2, 0), lamp(0, 5)]);
  });

  it('skips lamps that are switched off', () => {
    expect(nearestLamps([lamp(1, 0, 0), lamp(6, 0)], 0, 0, 2)).toEqual([lamp(6, 0)]);
  });

  it('skips lamps too far away to light anything near the player', () => {
    expect(nearestLamps([lamp(100, 0)], 0, 0, 2)).toEqual([]);
  });
});
