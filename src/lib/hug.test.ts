import { describe, expect, it } from 'vitest';
import { canResidentAcceptHug, HUG_SEPARATION, hugBlend, hugTargets } from './hug';
import { FRIENDSHIP_LEVELS, RESIDENTS, isAdultResident } from './people';

describe('consensual resident hugs', () => {
  it('requires an adult and an acquaintance-level relationship to accept', () => {
    expect(canResidentAcceptHug(true, FRIENDSHIP_LEVELS[1].points)).toBe(true);
    expect(canResidentAcceptHug(true, FRIENDSHIP_LEVELS[1].points - 1)).toBe(false);
    expect(canResidentAcceptHug(false, FRIENDSHIP_LEVELS[4].points)).toBe(false);
    expect(RESIDENTS.every(isAdultResident)).toBe(true);
  });

  it('forms a face-to-face pair at a bounded separation, including coincident starts', () => {
    for (const [player, resident] of [
      [{ x: 0, z: 0 }, { x: 0, z: 2 }],
      [{ x: 3, z: -2 }, { x: -1, z: 1 }],
      [{ x: 2, z: 2 }, { x: 2, z: 2 }],
    ] as const) {
      const pair = hugTargets(player, resident);
      expect(Math.hypot(pair.player.x - pair.resident.x, pair.player.z - pair.resident.z)).toBeCloseTo(HUG_SEPARATION);
      expect(Math.sin(pair.player.facing) * (pair.resident.x - pair.player.x)
        + Math.cos(pair.player.facing) * (pair.resident.z - pair.player.z)).toBeGreaterThan(0);
      expect(Math.sin(pair.resident.facing) * (pair.player.x - pair.resident.x)
        + Math.cos(pair.resident.facing) * (pair.player.z - pair.resident.z)).toBeGreaterThan(0);
    }
  });

  it('blends into and holds the embrace target without overshooting', () => {
    expect(hugBlend(-1)).toBe(0);
    expect(hugBlend(275)).toBeCloseTo(0.5);
    expect(hugBlend(550)).toBe(1);
    expect(hugBlend(1000)).toBe(1);
  });
});
