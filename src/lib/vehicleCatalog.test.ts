import { describe, expect, it } from 'vitest';
import { sanitiseOwnedVehicles } from './vehicleCatalog';

describe('owned vehicle save sanitisation', () => {
  it('keeps the first valid copy of each model and drops incompatible paint', () => {
    expect(sanitiseOwnedVehicles([
      { modelId: 'epe-city', colour: 'lagoon-blue' },
      { modelId: 'epe-city', colour: 'obsidian' },
      { modelId: 'victoria-coupe', colour: 'obsidian' },
      { modelId: 'removed-model', colour: 'pearl-white' },
      null,
    ])).toEqual([{ modelId: 'epe-city', colour: 'lagoon-blue' }]);
  });

  it('treats non-array and malformed save values as empty ownership', () => {
    expect(sanitiseOwnedVehicles(null)).toEqual([]);
    expect(sanitiseOwnedVehicles({ modelId: 'epe-city', colour: 'pearl-white' })).toEqual([]);
    expect(sanitiseOwnedVehicles([{ modelId: 8, colour: 'pearl-white' }])).toEqual([]);
  });
});
