import { describe, expect, it } from 'vitest';
import { AVERAGE_SHAPE, SHAPE_PRESETS, girthFactors, presetFor, sanitiseShape } from './bodyShape';

describe('body shape', () => {
  it('leaves the average body untouched', () => {
    expect(girthFactors(AVERAGE_SHAPE).size).toBe(0);
  });

  it('makes slim narrower and full wider, symmetrically', () => {
    const slim = girthFactors({ weight: -1, muscle: 0, curves: 0, belly: 0 });
    const full = girthFactors({ weight: 1, muscle: 0, curves: 0, belly: 0 });
    expect(slim.get('L Thigh')![0]).toBeLessThan(1);
    expect(full.get('L Thigh')![0]).toBeGreaterThan(1);
    expect(full.get('L Thigh')).toEqual(full.get('R Thigh'));
  });

  it('targets the right areas', () => {
    const curvy = girthFactors({ weight: 0, muscle: 0, curves: 1, belly: 0 });
    expect(curvy.has('L UpperArm')).toBe(false);
    expect(curvy.get('Pelvis')![1]).toBeGreaterThan(1.2);
    const belly = girthFactors({ weight: 0, muscle: 0, curves: 0, belly: 1 });
    // The stomach pushes forward (depth) more than sideways
    expect(belly.get('Spine1')![0]).toBeGreaterThan(belly.get('Spine1')![1]);
    expect(belly.has('L Calf')).toBe(false);
  });

  it('keeps every factor within a believable range', () => {
    for (const p of SHAPE_PRESETS) {
      for (const [y, z] of girthFactors(p.shape).values()) {
        for (const v of [y, z]) {
          expect(v).toBeGreaterThan(0.7);
          expect(v).toBeLessThan(1.7);
        }
      }
    }
  });

  it('sanitises saved data and recognises presets', () => {
    expect(sanitiseShape(undefined)).toEqual(AVERAGE_SHAPE);
    expect(sanitiseShape({ weight: 5, muscle: -1, curves: 'x', belly: 0.333 })).toEqual({ weight: 1, muscle: 0, curves: 0, belly: 0.33 });
    expect(presetFor(SHAPE_PRESETS[3].shape)?.id).toBe('curvy');
  });
});
