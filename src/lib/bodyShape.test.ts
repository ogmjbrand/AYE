import { describe, expect, it } from 'vitest';
import { AVERAGE_SHAPE, FEMININE_SHAPE_PRESETS, SHAPE_PRESETS, girthFactors, presetFor, sanitiseShape, shapeSliders } from './bodyShape';

const only = (s: Partial<typeof AVERAGE_SHAPE>) => ({ ...AVERAGE_SHAPE, ...s });

describe('body shape', () => {
  it('leaves the average body untouched', () => {
    expect(girthFactors(AVERAGE_SHAPE).size).toBe(0);
  });

  it('makes slim narrower and full wider, symmetrically', () => {
    const slim = girthFactors(only({ weight: -1 }));
    const full = girthFactors(only({ weight: 1 }));
    expect(slim.get('L Thigh')![0]).toBeLessThan(1);
    expect(full.get('L Thigh')![0]).toBeGreaterThan(1);
    expect(full.get('L Thigh')).toEqual(full.get('R Thigh'));
  });

  it('targets the right areas', () => {
    const curvy = girthFactors(only({ curves: 1 }));
    expect(curvy.has('L UpperArm')).toBe(false);
    expect(curvy.get('Pelvis')![1]).toBeGreaterThan(1.2);
    const belly = girthFactors(only({ belly: 1 }));
    // The stomach pushes forward (depth) more than sideways
    expect(belly.get('Spine1')![0]).toBeGreaterThan(belly.get('Spine1')![1]);
    expect(belly.has('L Calf')).toBe(false);
  });

  it('keeps every factor within a believable range', () => {
    for (const p of [...SHAPE_PRESETS, ...FEMININE_SHAPE_PRESETS]) {
      for (const [y, z] of girthFactors(p.shape).values()) {
        for (const v of [y, z]) {
          expect(v).toBeGreaterThan(0.7);
          // A full figure's round belly with a full bust is the deepest
          expect(v).toBeLessThan(1.85);
        }
      }
    }
  });

  it('sanitises saved data and recognises presets', () => {
    expect(sanitiseShape(undefined)).toEqual(AVERAGE_SHAPE);
    // Saves from before bust and waist existed come back with both at zero
    expect(sanitiseShape({ weight: 5, muscle: -1, curves: 'x', belly: 0.333 })).toEqual({ weight: 1, muscle: 0, curves: 0, belly: 0.33, bust: 0, waist: 0, shoulders: 0, legs: 0 });
    expect(presetFor(SHAPE_PRESETS[3].shape)?.id).toBe('muscular');
    expect(presetFor(FEMININE_SHAPE_PRESETS.find((p) => p.id === 'hourglass')!.shape, 'feminine')?.id).toBe('hourglass');
  });

  it('grows the bust forward from the chest and pulls in the waist', () => {
    const bust = girthFactors(only({ bust: 1 })).get('Spine2')!;
    expect(bust[0]).toBeGreaterThan(1.25);
    // Shifted forward so the back of the ribcage stays put
    expect(bust[2]).toBeGreaterThan(0);
    expect(-0.1 * bust[0] + bust[2]!).toBeCloseTo(-0.1);
    const waist = girthFactors(only({ waist: 1 })).get('Spine1')!;
    expect(waist[1]).toBeLessThan(0.85);
    expect(waist[1]).toBeLessThan(waist[0]);
  });

  it('offers women six figures and bust and waist sliders', () => {
    expect(FEMININE_SHAPE_PRESETS.map((p) => p.id)).toEqual(['slim', 'average', 'athletic', 'curvy', 'hourglass', 'full', 'plus-curvy']);
    expect(shapeSliders('feminine').map((s) => s.key)).toContain('bust');
    expect(shapeSliders('masculine').map((s) => s.key)).not.toContain('bust');
    const hourglass = girthFactors(FEMININE_SHAPE_PRESETS.find((p) => p.id === 'hourglass')!.shape);
    // Narrow waist between a full bust and wide hips
    expect(hourglass.get('Spine1')![1]).toBeLessThan(hourglass.get('Pelvis')![1]);
    expect(hourglass.get('Spine1')![1]).toBeLessThan(hourglass.get('Spine2')![0]);
  });
});
