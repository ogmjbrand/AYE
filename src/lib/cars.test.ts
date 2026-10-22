import { describe, expect, it } from 'vitest';
import { createGameState, gameReducer, type GameAction, type GameState } from './gameState';
import { CARS, CAR_RESALE_SHARE, PICKUP_RADIUS, carById, carResale, carToDrive, carTurnRate, fuelCost, sanitiseCars } from './cars';
import { carFootprint } from './world';

const act = (s: GameState, a: GameAction) => gameReducer(s, a, 'engineer', 'ordinary');
const hatch = carById('hatch')!;

describe('cars', () => {
  it('buys a car once, in one of its colours, only if you can afford it', () => {
    let s = act(createGameState(20000), { type: 'buyCar', id: 'hatch', color: hatch.colors[1] });
    expect(s.cars).toEqual([{ id: 'hatch', color: hatch.colors[1] }]);
    expect(s.balance).toBe(20000 - hatch.price);
    expect(s.today.expenses).toBe(hatch.price);
    expect(act(s, { type: 'buyCar', id: 'hatch', color: hatch.colors[0] }).cars).toHaveLength(1);
    expect(act(createGameState(100), { type: 'buyCar', id: 'hatch', color: hatch.colors[0] }).cars).toEqual([]);
    // An unknown colour falls back to the first
    s = act(createGameState(50000), { type: 'buyCar', id: 'saloon', color: '#123456' });
    expect(s.cars[0].color).toBe(carById('saloon')!.colors[0]);
  });

  it('sells back for the resale share', () => {
    let s = act(createGameState(20000), { type: 'buyCar', id: 'hatch', color: hatch.colors[0] });
    const before = s.balance;
    s = act(s, { type: 'sellCar', id: 'hatch' });
    expect(s.cars).toEqual([]);
    expect(s.balance).toBe(before + Math.round(hatch.price * CAR_RESALE_SHARE));
    expect(carResale(hatch)).toBe(Math.round(hatch.price * CAR_RESALE_SHARE));
    expect(act(s, { type: 'sellCar', id: 'hatch' }).balance).toBe(s.balance);
  });

  it('charges fuel per kilometre, only for a car you own', () => {
    let s = act(createGameState(20000), { type: 'buyCar', id: 'hatch', color: hatch.colors[0] });
    const before = s.balance;
    s = act(s, { type: 'fuel', carId: 'hatch', metres: 1000 });
    expect(before - s.balance).toBe(fuelCost(hatch, 1000));
    expect(fuelCost(hatch, 1000)).toBe(hatch.fuelPerKm);
    expect(act(createGameState(1000), { type: 'fuel', carId: 'hatch', metres: 1000 }).balance).toBe(1000);
  });

  it('cleans saved cars and turns more slowly at a standstill', () => {
    expect(sanitiseCars([{ id: 'hatch', color: 'x' }, { id: 'nope' }, { id: 'hatch' }, 5])).toHaveLength(1);
    expect(sanitiseCars(undefined)).toEqual([]);
    expect(carTurnRate(0)).toBeLessThan(carTurnRate(10));
    expect(CARS.every((c) => c.colors.length > 0 && c.price > 0)).toBe(true);
  });
});

describe('parking', () => {
  const spot = { districtId: 'lagos.marina', x: 3, z: -10, heading: Math.PI / 2 };
  const owned = () => act(createGameState(400000), { type: 'buyCar', id: 'hatch', color: hatch.colors[0] });

  it('leaves the car where you parked it, and takes it with you when you drive off', () => {
    let s = act(owned(), { type: 'parkCar', carId: 'hatch', spot });
    expect(s.cars[0].parked).toEqual(spot);
    s = act(s, { type: 'parkCar', carId: 'hatch', spot: null });
    expect(s.cars[0]).toEqual({ id: 'hatch', color: hatch.colors[0] });
  });

  it("won't park a car you don't own, or at a spot that isn't a number", () => {
    const s = owned();
    expect(act(s, { type: 'parkCar', carId: 'coupe', spot })).toBe(s);
    expect(act(s, { type: 'parkCar', carId: 'hatch', spot: { ...spot, x: Number.NaN } })).toBe(s);
  });

  it('gets you into a parked car only within reach; otherwise the newest car that is with you', () => {
    const parked = { id: 'hatch', color: '#fff', parked: spot };
    const withYou = { id: 'suv', color: '#000' };
    expect(carToDrive([parked], spot.districtId, spot.x + PICKUP_RADIUS - 0.1, spot.z)?.id).toBe('hatch');
    expect(carToDrive([parked], spot.districtId, spot.x + PICKUP_RADIUS + 1, spot.z)).toBeNull();
    expect(carToDrive([parked], 'accra.osu', spot.x, spot.z)).toBeNull();
    expect(carToDrive([parked, withYou], spot.districtId, 40, 40)?.id).toBe('suv');
    expect(carToDrive([withYou, parked], spot.districtId, spot.x, spot.z)?.id).toBe('hatch');
  });

  it('keeps a saved parking spot, and drops one that is broken or in a district that no longer exists', () => {
    expect(sanitiseCars([{ id: 'hatch', color: hatch.colors[0], parked: spot }])[0].parked).toEqual(spot);
    expect(sanitiseCars([{ id: 'hatch', parked: { ...spot, z: 'far' } }])[0].parked).toBeUndefined();
    expect(sanitiseCars([{ id: 'hatch', parked: spot }], (id) => id !== spot.districtId)[0].parked).toBeUndefined();
  });

  it("blocks the car's footprint, turned the way it faces", () => {
    expect(carFootprint(0, 0, 0, 4.4).size).toEqual([1.85, 1.4, 4.4]);
    const side = carFootprint(0, 0, Math.PI / 2, 4.4).size;
    expect(side[0]).toBeCloseTo(4.4);
    expect(side[2]).toBeCloseTo(1.85);
  });
});
