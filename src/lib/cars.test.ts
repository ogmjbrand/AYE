import { describe, expect, it } from 'vitest';
import { createGameState, gameReducer, type GameAction, type GameState } from './gameState';
import { CARS, CAR_RESALE_SHARE, carById, carResale, carTurnRate, fuelCost, sanitiseCars } from './cars';

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
