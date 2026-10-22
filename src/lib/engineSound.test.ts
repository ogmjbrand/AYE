import { describe, expect, it } from 'vitest';
import { engineHz, engineLevel } from './engineSound';

describe('engine sound', () => {
  it('idles low and climbs with speed, topping out at full speed', () => {
    expect(engineHz(0, 12)).toBe(38);
    expect(engineHz(6, 12)).toBeGreaterThan(engineHz(2, 12));
    expect(engineHz(12, 12)).toBe(110);
    expect(engineHz(30, 12)).toBe(110);
    expect(engineHz(-4, 12)).toBe(engineHz(4, 12));
  });

  it('is quieter at idle than under way, and never silent while running', () => {
    expect(engineLevel(0, 12)).toBeCloseTo(0.35);
    expect(engineLevel(12, 12)).toBe(1);
    expect(engineLevel(5, 0)).toBeCloseTo(0.35);
  });
});
