import { describe, expect, it } from 'vitest';
import { serviceOf } from './foodService';
import { DISTRICTS } from './geography';

describe('food service', () => {
  it('serves street stalls on the street, bukas at a counter and kitchens at tables', () => {
    expect(serviceOf({ kind: 'Suya grill', name: 'Mallam Sule Suya' })).toBe('street');
    expect(serviceOf({ kind: 'Street food and snacks', name: 'Roadside market' })).toBe('street');
    expect(serviceOf({ kind: 'Tea and snacks', name: 'x' })).toBe('street');
    expect(serviceOf({ kind: 'Nigerian buka', name: 'Mama Put' })).toBe('eatery');
    expect(serviceOf({ kind: 'Ghanaian chop bar', name: 'Osu Chop Bar' })).toBe('eatery');
    expect(serviceOf({ kind: 'Pan-African kitchen', name: 'Taste of Africa' })).toBe('kitchen');
  });

  it('gives every city more than one kind of food place', () => {
    for (const d of DISTRICTS) {
      const kinds = new Set(d.vendors.map(serviceOf));
      expect(kinds.size, d.id).toBeGreaterThan(1);
    }
  });
});

describe('ordering at a stall', () => {
  it('turns you to the cart you are ordering from, and not to one across the street', async () => {
    const { faceStall } = await import('./foodService');
    // The suya cart stands at x 5 with its vendor's customers at x 6.3: face -x
    expect(faceStall({ x: 6.3, z: 7.6 }, [{ x: 5, z: 6 }], [])).toBeCloseTo(Math.atan2(-1.3, -1.6));
    expect(faceStall({ x: 6.3, z: 7.6 }, [{ x: -5, z: 6 }], [])).toBeNull();
  });
});
