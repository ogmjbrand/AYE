import { describe, expect, it } from 'vitest';
import { DESK_SPOT, DOOR_SPOT, FITTING_SPOT, NOT_YET, SALON_SPOT, boutiqueLayout, cartTotal, rangeFor, setsIn } from './boutique';
import { FASHION_ITEMS, itemById, sanitiseWardrobe } from './fashion';
import { findPath, walkGridFor } from './pathfinding';

const layout = boutiqueLayout();
const grid = walkGridFor(layout.obstacles);

describe('The Fashion House', () => {
  it('sells matching sets as a top and bottom together, at their combined price', () => {
    const sets = setsIn('lagos.marina');
    const sunset = sets.find((s) => s.id === 'set-ankara-sunset')!;
    expect(sunset.top.id).toBe('top-ankara-sunset');
    expect(sunset.bottom.id).toBe('bottom-ankara-sunset');
    expect(sunset.price).toBe(sunset.top.price + sunset.bottom.price);
    for (const s of sets) expect(s.top.style.colors).toEqual(s.bottom.style.colors);
  });

  it('never sells the rewards you earn, and keeps sections to their slots', () => {
    for (const section of ['clothes', 'shoes', 'hair'] as const) {
      const range = rangeFor('lagos.marina', section);
      expect(range.length).toBeGreaterThan(0);
      expect(range.some((i) => i.collection === 'Rewards')).toBe(false);
    }
    expect(rangeFor('lagos.marina', 'shoes').every((i) => i.slot === 'shoes')).toBe(true);
    expect(rangeFor('lagos.marina', 'clothes', 'tops').every((i) => i.slot === 'top')).toBe(true);
  });

  it('says honestly what it cannot sell yet instead of selling it', () => {
    expect(rangeFor('lagos.marina', 'clothes', 'dresses')).toEqual([]);
    expect(rangeFor('lagos.marina', 'clothes', 'outerwear')).toEqual([]);
    expect(NOT_YET.dresses).toMatch(/aren’t in the game yet/);
    expect(NOT_YET.outerwear).toMatch(/aren’t in the game yet/);
  });

  it('sells bags under accessories, in every city', () => {
    for (const d of ['lagos.marina', 'accra.osu']) {
      const bags = rangeFor(d, 'accessories');
      expect(bags.length).toBe(5);
      expect(bags.every((b) => b.slot === 'bag' && !!b.style.bag)).toBe(true);
    }
    expect(NOT_YET.accessories).toBeUndefined();
  });

  it('charges the cart once, for what you don’t already own', () => {
    const a = itemById('top-linen-ivory')!;
    const b = itemById('bottom-chino-khaki')!;
    expect(cartTotal([a, b], [])).toBe(a.price + b.price);
    expect(cartTotal([a, b], [a.id])).toBe(b.price);
  });

  it('the desk, fitting room and salon can all be reached from the door', () => {
    const from = { x: DOOR_SPOT[0], z: DOOR_SPOT[1] };
    for (const [x, z] of [DESK_SPOT, FITTING_SPOT, SALON_SPOT]) expect(findPath(grid, from, { x, z }), `${x},${z}`).not.toBeNull();
  });

  it('keeps hearted pieces and sets in your wardrobe, and drops anything unknown', () => {
    const w = sanitiseWardrobe({ owned: [], equipped: {}, favourites: ['top-ankara-sunset', 'set-ankara-sunset', 'nope', 'set-nope', 7] });
    expect(w.favourites).toEqual(['top-ankara-sunset', 'set-ankara-sunset']);
    expect(sanitiseWardrobe({ owned: [], equipped: {} }).favourites).toBeUndefined();
    expect(FASHION_ITEMS.length).toBeGreaterThan(0);
  });
});
