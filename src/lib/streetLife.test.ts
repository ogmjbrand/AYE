import { describe, expect, it } from 'vitest';
import { districtById } from './geography';
import { CROWD_LOOKS, crowdSize, shoppersFor, streetStops, walkLine } from './streetLife';
import { lookById } from './looks';

const lagoon = districtById('lagos.marina')!;
const layout = { roadHalfWidth: 4, pavementWidth: 3, crossStreet: { minZ: -24, maxZ: -16 } };

describe('street life', () => {
  it('has more people out by day than at night, and nobody in the small hours', () => {
    expect(crowdSize(3)).toBe(0);
    expect(crowdSize(13)).toBeGreaterThan(crowdSize(7));
    expect(crowdSize(13)).toBeGreaterThan(crowdSize(22));
  });

  it('stops only at shops, food, nightlife and travel along the boulevard', () => {
    const stops = streetStops(lagoon.places, layout);
    expect(stops.length).toBeGreaterThan(3);
    for (const p of stops) expect(['home', 'workplace']).not.toContain(p.kind);
  });

  it('keeps everyone on one stretch of pavement, facing the shop at each stop, the same every load', () => {
    const crowd = shoppersFor(lagoon.id, lagoon.places, layout, 8);
    expect(crowd).toHaveLength(8);
    expect(shoppersFor(lagoon.id, lagoon.places, layout, 8)).toEqual(crowd);
    const line = walkLine(layout);
    for (const s of crowd) {
      expect(lookById(s.lookId).id).toBe(s.lookId);
      expect(CROWD_LOOKS).toContain(s.lookId);
      const xs = new Set(s.route.map((p) => p[0]));
      expect(xs.size).toBe(1);
      expect(Math.abs(s.route[0][0])).toBeCloseTo(line);
      // All before the cross street, or all after it: nobody walks across the road where there's no pavement
      const before = s.route.every((p) => p[1] <= layout.crossStreet.minZ);
      const after = s.route.every((p) => p[1] >= layout.crossStreet.maxZ);
      expect(before || after, s.id).toBe(true);
      for (const p of s.route.slice(0, -1)) {
        expect(p[2]).toBeGreaterThanOrEqual(5);
        expect(p[3]).toBeCloseTo(Math.sign(p[0]) * Math.PI / 2);
      }
    }
  });

  it('has no crowd where there are no stops', () => {
    expect(shoppersFor('nowhere', [], layout, 8)).toEqual([]);
    expect(shoppersFor(lagoon.id, lagoon.places, layout, 0)).toEqual([]);
  });
});
