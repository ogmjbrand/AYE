import { describe, expect, it } from 'vitest';
import { FULL_NEEDS, NEED_LOSS_PER_MINUTE, addNeeds, decayNeeds, decayNeedsAsleep, lowestNeed, moodLabel, moodScore, sanitiseNeeds } from './needs';

describe('needs', () => {
  it('run down while awake, and only hygiene runs down (slowly) in your sleep', () => {
    const awake = decayNeeds(FULL_NEEDS);
    expect(awake.energy).toBeCloseTo(100 - NEED_LOSS_PER_MINUTE.energy);
    expect(awake.fun).toBeLessThan(100);
    const asleep = decayNeedsAsleep(FULL_NEEDS);
    expect(asleep.energy).toBe(100);
    expect(asleep.fun).toBe(100);
    expect(asleep.hygiene).toBeCloseTo(100 - NEED_LOSS_PER_MINUTE.hygiene / 2);
  });

  it('stay between 0 and 100', () => {
    expect(addNeeds(FULL_NEEDS, { fun: 50 }).fun).toBe(100);
    expect(addNeeds({ ...FULL_NEEDS, energy: 3 }, { energy: -10 }).energy).toBe(0);
  });

  it('mood follows needs and hunger, and a comfortable home helps', () => {
    expect(moodLabel(moodScore(FULL_NEEDS, 100))).toBe('Inspired');
    const low = { energy: 10, hygiene: 10, fun: 10, social: 10 };
    expect(moodLabel(moodScore(low, 10))).toBe('Miserable');
    expect(moodScore(low, 50, 8)).toBeGreaterThan(moodScore(low, 50));
    // Comfort can't buy happiness beyond a point
    expect(moodScore(low, 50, 500) - moodScore(low, 50)).toBeLessThanOrEqual(10);
  });

  it('names the most pressing need', () => {
    expect(lowestNeed({ ...FULL_NEEDS, hygiene: 20 })).toBe('hygiene');
  });

  it('old saves start with every need met; bad values are fixed', () => {
    expect(sanitiseNeeds(undefined)).toEqual(FULL_NEEDS);
    expect(sanitiseNeeds({ energy: -5, hygiene: 'x', fun: 250, social: 40 })).toEqual({ energy: 0, hygiene: 100, fun: 100, social: 40 });
  });
});
