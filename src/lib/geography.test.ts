import { describe, expect, it } from 'vitest';
import { COUNTER_RADIUS, DISTRICTS, allPlaces, counterAt, districtById, placeById } from './geography';
import { nearestVendor } from './food';
import { homeAtDoor } from './homes';
import { COUNTRY_CODES } from './places';
import { WORLD_BOUND, resolveCollisions } from './world';

describe('world registry', () => {
  it('has at least two cities in different countries', () => {
    expect(new Set(DISTRICTS.map((d) => d.city.country)).size).toBeGreaterThanOrEqual(2);
  });

  it('has unique place ids namespaced by their district', () => {
    const ids = allPlaces().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of DISTRICTS) for (const p of d.places) expect(p.id.startsWith(`${d.id}.`)).toBe(true);
  });

  it('every city is in a real country and has a valid time zone', () => {
    for (const { city } of DISTRICTS) {
      expect(COUNTRY_CODES).toContain(city.country);
      expect(() => new Intl.DateTimeFormat('en', { timeZone: city.timeZone })).not.toThrow();
    }
  });

  it('falls back to the first district for unknown ids', () => {
    expect(districtById('atlantis').id).toBe('lagos.marina');
  });
});

describe.each(DISTRICTS.map((d) => [d.id, d] as const))('district %s', (_, d) => {
  it('every place and the arrival point can actually be reached: inside the bounds and not inside anything solid', () => {
    for (const p of [...d.places, { id: 'spawn', position: d.spawn }]) {
      const [x, , z] = p.position;
      expect(Math.abs(x), p.id).toBeLessThanOrEqual(WORLD_BOUND);
      expect(Math.abs(z), p.id).toBeLessThanOrEqual(WORLD_BOUND);
      const r = resolveCollisions(x, z, undefined, d.layout.obstacles);
      expect(Math.hypot(r.x - x, r.z - z), `${p.id} is inside an obstacle`).toBeLessThan(0.01);
    }
  });

  it('has a workplace for every career, shops, a travel desk, food and homes', () => {
    const careers = d.places.filter((p) => p.kind === 'workplace').map((p) => p.career);
    expect(careers.sort()).toEqual(['artist', 'athlete', 'doctor', 'engineer', 'entrepreneur', 'pilot', 'student']);
    expect(placeById(`${d.id}.fashion`)?.kind).toBe('shop');
    expect(placeById(`${d.id}.gadgets`)?.kind).toBe('shop');
    expect(placeById(`${d.id}.travel`)?.kind).toBe('public');
    expect(d.vendors.length).toBeGreaterThanOrEqual(3);
    expect(d.homes.length).toBeGreaterThanOrEqual(3);
    for (const h of d.homes) expect(h.district).toBe(d.id);
  });

  it('places do not overlap: standing at one never triggers another', () => {
    for (const v of d.vendors) expect(nearestVendor(d.vendors, v.position[0], v.position[2])?.id).toBe(v.id);
    for (const [kind, c] of [['fashion', d.fashionHouse], ['gadgets', d.gadgetHub], ['travel', d.travelDesk]] as const) {
      expect(counterAt(d, c.position[0], c.position[2])).toBe(kind);
      for (const v of d.vendors) {
        expect(Math.hypot(v.position[0] - c.position[0], v.position[2] - c.position[2]), `${v.name} vs ${c.name}`).toBeGreaterThan(COUNTER_RADIUS * 2);
      }
    }
    for (const h of d.homes) expect(homeAtDoor(d.id, h.door[0], h.door[2])?.id).toBe(h.id);
  });

  it('every building named by a home exists in the layout', () => {
    for (const h of d.homes) expect(d.layout.buildings.some((b) => b.name === h.building), h.building).toBe(true);
  });
});
