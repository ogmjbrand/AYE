import { describe, expect, it } from 'vitest';
import { CITIES, CURRENT_DISTRICT, allPlaces, placeById } from './geography';
import { COUNTRY_CODES } from './places';
import { resolveCollisions, WORLD_BOUND } from './world';

describe('world registry', () => {
  it('has unique place ids namespaced by their district', () => {
    const ids = allPlaces().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const city of CITIES) for (const d of city.districts) for (const p of d.places) expect(p.id.startsWith(`${d.id}.`)).toBe(true);
  });

  it('every city is in a real country and has a valid time zone', () => {
    for (const city of CITIES) {
      expect(COUNTRY_CODES).toContain(city.country);
      expect(() => new Intl.DateTimeFormat('en', { timeZone: city.timeZone })).not.toThrow();
    }
  });

  it('every place can actually be reached: inside the bounds and not inside anything solid', () => {
    for (const p of [...allPlaces(), { id: 'spawn', position: CURRENT_DISTRICT.spawn }]) {
      const [x, , z] = p.position;
      expect(Math.abs(x), p.id).toBeLessThanOrEqual(WORLD_BOUND);
      expect(Math.abs(z), p.id).toBeLessThanOrEqual(WORLD_BOUND);
      const r = resolveCollisions(x, z);
      expect(Math.hypot(r.x - x, r.z - z), `${p.id} is inside an obstacle`).toBeLessThan(0.01);
    }
  });

  it('every career has a workplace, and the shop and food vendors are indexed', () => {
    const careers = allPlaces().filter((p) => p.kind === 'workplace').map((p) => p.career);
    expect(careers.sort()).toEqual(['artist', 'athlete', 'doctor', 'engineer', 'entrepreneur', 'pilot', 'student']);
    expect(placeById('lagos.marina.fashion-house')?.kind).toBe('shop');
    expect(allPlaces().filter((p) => p.kind === 'food').length).toBe(3);
    expect(allPlaces().filter((p) => p.kind === 'home').length).toBe(4);
  });
});
