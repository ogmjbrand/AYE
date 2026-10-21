import { describe, expect, it } from 'vitest';
import meta from '../../public/assets/characters/mh/female-body.json';
import { MH_MORPHS, mhInfluences, mhSkinColor } from './mhBody';
import { FEMININE_SHAPE_PRESETS, AVERAGE_SHAPE } from './bodyShape';

describe('MakeHuman body', () => {
  it('every body type maps to morph weights within MakeHuman\'s designed range', () => {
    for (const p of FEMININE_SHAPE_PRESETS) {
      const inf = mhInfluences(p.shape);
      for (const k of MH_MORPHS) {
        expect(inf[k], `${p.id} ${k}`).toBeGreaterThanOrEqual(0);
        expect(inf[k], `${p.id} ${k}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('body types look different: fuller figures gain weight, curves and arm room', () => {
    const slim = mhInfluences(FEMININE_SHAPE_PRESETS.find((p) => p.id === 'slim')!.shape);
    const plus = mhInfluences(FEMININE_SHAPE_PRESETS.find((p) => p.id === 'plus-curvy')!.shape);
    const hourglass = mhInfluences(FEMININE_SHAPE_PRESETS.find((p) => p.id === 'hourglass')!.shape);
    expect(slim.weightDown).toBeGreaterThan(0);
    expect(plus.weightUp).toBeGreaterThan(0.5);
    expect(plus.armsOut).toBeGreaterThan(slim.armsOut);
    expect(hourglass.waistIn).toBeGreaterThan(0.5);
    expect(hourglass.cupUp).toBeGreaterThan(slim.cupUp);
    expect(mhInfluences(AVERAGE_SHAPE).weightUp).toBe(0);
  });

  it('the built model has every morph the game sets', () => {
    expect(meta.morphs).toEqual([...MH_MORPHS]);
  });

  it('skin colours run from lighter to deeper', () => {
    const lum = (t: number) => mhSkinColor(t).reduce((a, b) => a + b);
    expect(lum(1)).toBeLessThan(lum(0));
    expect(lum(0)).toBeLessThan(lum(-1));
  });
});
