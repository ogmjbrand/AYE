import { describe, expect, it } from 'vitest';
import { migrateOwnedVehicles } from './saveMigration';
import { CARS } from './cars';

describe('cars bought from the earlier vehicle catalogue', () => {
  it('become the dealers’ model of the same class, in the nearest paint', () => {
    const cars = migrateOwnedVehicles([
      { modelId: 'epe-city', colour: 'obsidian' },
      { modelId: 'victoria-coupe', colour: 'copper' },
    ]);
    expect(cars.map((c) => c.id)).toEqual(['hatch', 'coupe']);
    for (const c of cars) expect(CARS.find((m) => m.id === c.id)!.colors).toContain(c.color);
    expect(cars[0].color).toBe('#1f4f8a');
  });

  it('keeps one car per model and skips anything unknown', () => {
    const cars = migrateOwnedVehicles([
      { modelId: 'ikorodu-sport', colour: 'pearl-white' },
      { modelId: 'badagry-workmate', colour: 'obsidian' },
      { modelId: 'no-such-car', colour: 'copper' },
      null,
    ]);
    expect(cars.map((c) => c.id)).toEqual(['suv']);
    expect(migrateOwnedVehicles('nonsense')).toEqual([]);
  });
});
