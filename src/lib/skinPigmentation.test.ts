import { describe, expect, it } from 'vitest';
import {
  categoryById, isSkinCategoryId, pigmentationForCategory, sanitisePigmentation, SKIN_CATEGORIES,
  clampAlbinismIntensity, clampCoverage, clampDepth, clampPatchScale, clampUndertone,
} from './skinPigmentation';

describe('skin pigmentation categories', () => {
  it('lists exactly the eight required categories', () => {
    const ids = SKIN_CATEGORIES.map((c) => c.id);
    expect(ids).toEqual(['light', 'lightBrown', 'caramel', 'chocolate', 'darkBrown', 'ebony', 'vitiligo', 'albinism']);
  });

  it('recognises category ids, including custom', () => {
    expect(isSkinCategoryId('custom')).toBe(true);
    expect(isSkinCategoryId('ebony')).toBe(true);
    expect(isSkinCategoryId('not-a-category')).toBe(false);
    expect(isSkinCategoryId(42)).toBe(false);
  });

  it('finds a preset by id', () => {
    expect(categoryById('caramel')?.label).toBe('Caramel');
    expect(categoryById(undefined)).toBeUndefined();
  });

  it('starts vitiligo enabled with its own coverage and scale, leaving the base tone adjustable', () => {
    const { depth, pigmentation } = pigmentationForCategory('vitiligo', { category: 'custom', undertone: 0, vitiligo: { enabled: false, coverage: 0, scale: 1, seed: 1 }, albinismIntensity: 0 });
    expect(pigmentation.vitiligo.enabled).toBe(true);
    expect(pigmentation.vitiligo.coverage).toBeGreaterThan(0);
    expect(depth).toBeCloseTo(categoryById('vitiligo')!.depth);
  });

  it('starts albinism very light with no vitiligo patches', () => {
    const { depth, pigmentation } = pigmentationForCategory('albinism', { category: 'custom', undertone: 0, vitiligo: { enabled: true, coverage: 0.5, scale: 1, seed: 3 }, albinismIntensity: 0 });
    expect(depth).toBeLessThan(0);
    expect(pigmentation.albinismIntensity).toBeGreaterThan(0);
    expect(pigmentation.vitiligo.enabled).toBe(false);
  });

  it('custom only clears the category label, keeping the rest of the draft as it is', () => {
    const current = { category: 'ebony' as const, undertone: 0.4, vitiligo: { enabled: true, coverage: 0.2, scale: 1.3, seed: 7 }, albinismIntensity: 0 };
    const { pigmentation } = pigmentationForCategory('custom', current);
    expect(pigmentation).toEqual({ ...current, category: 'custom' });
  });

  it('clamps every slider into its valid range', () => {
    expect(clampDepth(5)).toBe(1);
    expect(clampDepth(-5)).toBe(-1);
    expect(clampUndertone(5)).toBe(1);
    expect(clampCoverage(-1)).toBe(0);
    expect(clampCoverage(2)).toBe(1);
    expect(clampPatchScale(0)).toBeGreaterThanOrEqual(0.4);
    expect(clampPatchScale(99)).toBeLessThanOrEqual(2.5);
    expect(clampAlbinismIntensity(-1)).toBe(0);
    expect(clampAlbinismIntensity(2)).toBe(1);
  });
});

describe('sanitisePigmentation', () => {
  it('defaults a missing or corrupted value to fully neutral', () => {
    expect(sanitisePigmentation(undefined)).toEqual({ category: 'custom', undertone: 0, vitiligo: { enabled: false, coverage: 0.35, scale: 1, seed: 1 }, albinismIntensity: 0 });
    expect(sanitisePigmentation(null)).toEqual(sanitisePigmentation(undefined));
    expect(sanitisePigmentation('not an object')).toEqual(sanitisePigmentation(undefined));
  });

  it('keeps a valid saved value, including vitiligo pattern fields', () => {
    const saved = { category: 'vitiligo', undertone: 0.2, vitiligo: { enabled: true, coverage: 0.6, scale: 1.8, seed: 42 }, albinismIntensity: 0 };
    expect(sanitisePigmentation(saved)).toEqual(saved);
  });

  it('drops an unknown category rather than trusting it', () => {
    expect(sanitisePigmentation({ category: 'invented-category' }).category).toBe('custom');
  });

  it('clamps out-of-range saved numbers instead of rejecting the whole value', () => {
    const result = sanitisePigmentation({ category: 'ebony', undertone: 9, vitiligo: { enabled: true, coverage: -3, scale: 100, seed: 2 }, albinismIntensity: 9 });
    expect(result.undertone).toBe(1);
    expect(result.vitiligo.coverage).toBe(0);
    expect(result.vitiligo.scale).toBeLessThanOrEqual(2.5);
    expect(result.albinismIntensity).toBe(1);
  });
});
