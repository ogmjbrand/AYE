import { describe, expect, it } from 'vitest';
import { createGameState, gameReducer } from './gameState';

describe('vehicle purchases and paint', () => {
  const buyEpeCity = { type: 'buyVehicle' as const, modelId: 'epe-city', colour: 'lagoon-blue' };

  it('charges the catalogue price once and records ownership in the daily ledger', () => {
    const start = createGameState(10_000);
    const purchased = gameReducer(start, buyEpeCity, 'none', 'ordinary');
    expect(purchased.balance).toBe(5_500);
    expect(purchased.today.expenses).toBe(4_500);
    expect(purchased.ownedVehicles).toEqual([{ modelId: 'epe-city', colour: 'lagoon-blue' }]);
    expect(gameReducer(purchased, buyEpeCity, 'none', 'ordinary')).toBe(purchased);
  });

  it('rejects unaffordable, unknown, or incompatible-color purchases without charging', () => {
    const poor = createGameState(4_499);
    expect(gameReducer(poor, buyEpeCity, 'none', 'student')).toBe(poor);

    const funded = createGameState(10_000);
    expect(gameReducer(funded, { ...buyEpeCity, modelId: 'not-in-catalogue' }, 'none', 'student')).toBe(funded);
    expect(gameReducer(funded, { ...buyEpeCity, colour: 'not-a-colour' }, 'none', 'student')).toBe(funded);
  });

  it('saves compatible paint changes without charging again', () => {
    const purchased = gameReducer(createGameState(10_000), buyEpeCity, 'none', 'ordinary');
    const painted = gameReducer(purchased, {
      type: 'paintVehicle',
      modelId: 'epe-city',
      colour: 'obsidian',
    }, 'none', 'ordinary');
    expect(painted.balance).toBe(purchased.balance);
    expect(painted.today.expenses).toBe(purchased.today.expenses);
    expect(painted.ownedVehicles[0].colour).toBe('obsidian');
    expect(gameReducer(painted, {
      type: 'paintVehicle',
      modelId: 'victoria-coupe',
      colour: 'obsidian',
    }, 'none', 'ordinary')).toBe(painted);
  });
});
