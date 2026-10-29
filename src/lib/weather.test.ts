import { describe, expect, it } from 'vitest';
import { BLOCK_MINUTES, blockKind, weatherAt } from './weather';

const DISTRICTS = ['lagos.marina', 'accra.osu', 'plan.avenue', 'somewhere.new'];

describe('weather', () => {
  it('is the same for the same district and minute (a server can run it too)', () => {
    for (const d of DISTRICTS) for (const m of [0, 600, 4321, 99_999]) expect(weatherAt(d, m)).toEqual(weatherAt(d, m));
  });

  it('keeps every value in range', () => {
    for (const d of DISTRICTS) {
      for (let m = 0; m < 14 * 1440; m += 37) {
        const w = weatherAt(d, m);
        expect(w.rain).toBeGreaterThanOrEqual(0);
        expect(w.rain).toBeLessThanOrEqual(1);
        expect(w.wetness).toBeGreaterThanOrEqual(0);
        expect(w.wetness).toBeLessThanOrEqual(1);
        expect(w.cloud).toBeGreaterThan(0);
        if (w.kind === 'clear' || w.kind === 'cloudy') expect(w.rain).toBe(0);
      }
    }
  });

  it('has a mix of weather over a fortnight: mostly dry, some rain, the odd storm', () => {
    const kinds = new Map<string, number>();
    for (let b = 0; b < 14 * 8; b++) { const k = blockKind('lagos.marina', b); kinds.set(k, (kinds.get(k) ?? 0) + 1); }
    expect((kinds.get('clear') ?? 0) + (kinds.get('cloudy') ?? 0)).toBeGreaterThan(14 * 8 * 0.5);
    expect((kinds.get('rain') ?? 0) + (kinds.get('storm') ?? 0)).toBeGreaterThan(0);
  });

  it('streets stay wet for a while after the rain stops, then dry', () => {
    // Find a rainy block followed by a dry one
    let found = false;
    for (let b = 1; b < 400 && !found; b++) {
      const k = blockKind('lagos.marina', b);
      const next = blockKind('lagos.marina', b + 1);
      if ((k === 'rain' || k === 'storm') && (next === 'clear' || next === 'cloudy') && blockKind('lagos.marina', b + 2) !== 'rain' && blockKind('lagos.marina', b + 2) !== 'storm') {
        const end = (b + 1) * BLOCK_MINUTES;
        expect(weatherAt('lagos.marina', end - 5).wetness).toBeGreaterThan(0.5);
        expect(weatherAt('lagos.marina', end + 30).wetness).toBeGreaterThan(0.1);
        expect(weatherAt('lagos.marina', end + 179).wetness).toBe(0);
        found = true;
      }
    }
    expect(found).toBe(true);
  });
});
