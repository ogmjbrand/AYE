import { describe, expect, it } from 'vitest';
import { DIETS, DISHES, dietBadge, dishById, nearestVendor, suitsDiet, whyNot } from './food';
import { DISTRICTS } from './geography';

const FOOD_VENDORS = DISTRICTS.flatMap((d) => d.vendors);

describe('diets', () => {
  const byId = (id: string) => dishById(id)!;

  it('vegans can eat plant-based dishes but not meat, fish, dairy or egg', () => {
    expect(suitsDiet(byId('misir-shiro'), 'vegan')).toBe(true);
    expect(suitsDiet(byId('jollof-chicken'), 'vegan')).toBe(false);
    expect(suitsDiet(byId('thieboudienne'), 'vegan')).toBe(false);
    expect(suitsDiet(byId('chin-chin'), 'vegan')).toBe(false);
    expect(suitsDiet(byId('shakshuka'), 'vegan')).toBe(false);
  });

  it('vegetarians allow egg and dairy, pescatarians also allow fish', () => {
    expect(suitsDiet(byId('shakshuka'), 'vegetarian')).toBe(true);
    expect(suitsDiet(byId('thieboudienne'), 'vegetarian')).toBe(false);
    expect(suitsDiet(byId('thieboudienne'), 'pescatarian')).toBe(true);
    expect(suitsDiet(byId('suya'), 'pescatarian')).toBe(false);
  });

  it('people who eat everything can order anything', () => {
    expect(DISHES.every((d) => suitsDiet(d, 'everything'))).toBe(true);
  });

  it('badges and reasons', () => {
    expect(dietBadge(byId('koshari'))).toBe('Vegan');
    expect(dietBadge(byId('chin-chin'))).toBe('Vegetarian');
    expect(dietBadge(byId('roast-fish'))).toBe('Pescatarian');
    expect(dietBadge(byId('suya'))).toBeNull();
    expect(whyNot(byId('bobotie'), 'vegan')).toBe('Not vegan: contains meat and egg and dairy');
    expect(whyNot(byId('koshari'), 'vegan')).toBeNull();
  });

  it('every diet has a label', () => {
    expect(DIETS.map((d) => d.id).sort()).toEqual(['everything', 'pescatarian', 'vegan', 'vegetarian']);
  });
});

describe('places to eat', () => {
  it('every menu item exists and dish ids are unique', () => {
    expect(new Set(DISHES.map((d) => d.id)).size).toBe(DISHES.length);
    for (const v of FOOD_VENDORS) for (const id of v.menu) expect(dishById(id), id).toBeDefined();
  });

  it('every place has at least three vegan options', () => {
    for (const v of FOOD_VENDORS) {
      const vegan = v.menu.filter((id) => suitsDiet(dishById(id)!, 'vegan'));
      expect(vegan.length, v.name).toBeGreaterThanOrEqual(3);
    }
  });

  it('includes vegan dishes from across Africa, not just Nigeria', () => {
    const origins = new Set(DISHES.filter((d) => suitsDiet(d, 'vegan')).map((d) => d.origin));
    for (const c of ['Nigeria', 'Ethiopia', 'Ghana', 'Kenya', 'Senegal', 'Egypt', 'Morocco', 'South Africa']) {
      expect(origins.has(c), c).toBe(true);
    }
  });

  it('is found by proximity within its own district', () => {
    for (const d of DISTRICTS) {
      for (const v of d.vendors) expect(nearestVendor(d.vendors, v.position[0] + 1, v.position[2])?.id).toBe(v.id);
      expect(nearestVendor(d.vendors, 40, 40)).toBeNull();
    }
  });
});
