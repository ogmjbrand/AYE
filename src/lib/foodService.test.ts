import { describe, expect, it } from 'vitest';
import { cartStations, serviceOf } from './foodService';
import { FOOD_CART_SIZE } from './world';
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

describe('people at a street-food cart', () => {
  // Lagoon Boulevard's suya grill: at the kerb, its working side facing the pavement (+x)
  const cart = { x: 5, z: 6, facing: Math.PI / 2 };
  const s = cartStations(cart, FOOD_CART_SIZE);
  it('puts the seller on the working side, at the grill, facing it (not out in the road)', () => {
    expect(s.seller.x).toBeGreaterThan(cart.x + FOOD_CART_SIZE.depth / 2);
    expect(Math.abs(s.seller.z - cart.z)).toBeLessThan(FOOD_CART_SIZE.length / 2);
    expect(Math.sin(s.seller.facing)).toBeCloseTo(-1); // looking at the cart (-x)
  });
  it('has the customer order at the end of the counter, facing the seller, clear of the cart', () => {
    expect(s.counter.x).toBeGreaterThan(cart.x + FOOD_CART_SIZE.depth / 2);
    expect(Math.abs(s.counter.z - cart.z)).toBeGreaterThan(FOOD_CART_SIZE.length / 2);
    const toSeller = Math.atan2(s.seller.x - s.counter.x, s.seller.z - s.counter.z);
    expect(s.counter.facing).toBeCloseTo(toSeller);
    expect(Math.hypot(s.seller.x - s.counter.x, s.seller.z - s.counter.z)).toBeLessThan(2.5);
  });
  it('the vendor on the map is where you order', () => {
    const v = DISTRICTS.find((d) => d.id === 'lagos.marina')!.vendors.find((x) => x.id === 'suya-spot')!;
    expect(Math.hypot(v.position[0] - s.counter.x, v.position[2] - s.counter.z)).toBeLessThan(0.3);
  });
});
