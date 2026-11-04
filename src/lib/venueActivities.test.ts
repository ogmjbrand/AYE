import { describe, expect, it } from 'vitest';
import { aroundFurniture, aroundPoint, furnitureActivities } from './venueActivities';
import { OFFICE_INTERIOR } from './officeCareer';
import { USE_RADIUS } from './interiors';

describe('venue activities', () => {
  it('stands you clear of the furniture but within reach of it', () => {
    const f = { at: [2, 3] as const, size: [1.6, 0.8, 0.8] as const };
    for (const [x, z] of aroundFurniture(f)) {
      const dx = Math.max(Math.abs(x - 2) - 0.8, 0), dz = Math.max(Math.abs(z - 3) - 0.4, 0);
      const edge = Math.hypot(dx, dz);
      expect(edge).toBeGreaterThan(0.3);
      expect(edge).toBeLessThanOrEqual(USE_RADIUS);
    }
  });
  it('keeps point activities inside their radius', () => {
    for (const [x, z] of aroundPoint([0, 0], 1.9)) expect(Math.hypot(x, z)).toBeLessThanOrEqual(1.9);
  });
  it('lists every office desk and the reception', () => {
    const acts = furnitureActivities(OFFICE_INTERIOR, { desk: 'Work at a desk', reception: 'Reception' });
    expect(acts.some((a) => a.label === 'Reception')).toBe(true);
    expect(acts.filter((a) => a.label.startsWith('Work at a desk')).length).toBeGreaterThan(0);
  });
});
