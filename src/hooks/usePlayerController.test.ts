import { beforeEach, describe, expect, it } from 'vitest';
import { enterVehicle, exitVehicle, placePlayer } from './usePlayerController';
import { setActiveLayout } from '../lib/world';
import { districtById } from '../lib/geography';

describe('vehicle enter and exit controls', () => {
  beforeEach(() => {
    setActiveLayout(districtById('lagos.marina').layout);
    placePlayer([0, 0, 0]);
  });

  it('enters the selected car once and exits beside it', () => {
    expect(enterVehicle('epe-city', [0, 0, 0], 0)).toBe(true);
    expect(enterVehicle('marina-sedan')).toBe(false);
    expect(exitVehicle()).toBe(true);
    expect(exitVehicle()).toBe(false);
  });
});
