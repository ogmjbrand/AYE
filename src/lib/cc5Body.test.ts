import { describe, expect, it } from 'vitest';
import {
  cc5AlbinismMultiplier, cc5GarmentColor, cc5SkinMultiplier, cc5SlotOf, cc5UndertoneMultiplier,
  CC5_BROW_LASH_MATERIALS, CC5_HAS_SPLIT_MATERIALS, CC5_SKIN_MATERIALS,
} from './cc5Body';
import type { Style } from './fashion';

describe('CC5 player body', () => {
  it('maps the modelled garments to wardrobe slots, for both Aaron and Ariana\'s own materials', () => {
    expect(cc5SlotOf('RS_Regular_Fit_Shirt')).toBe('top');
    expect(cc5SlotOf('RS_Regular_Fit_Shirt_Pbr')).toBe('top');
    expect(cc5SlotOf('Slim_Fit_Trousers')).toBe('bottom');
    expect(cc5SlotOf('Sport_sneakers')).toBe('shoes');
    expect(cc5SlotOf('Sport_sneakers_Pbr')).toBe('shoes');
    expect(cc5SlotOf('High_Heels_Pbr')).toBe('shoes');
    expect(cc5SlotOf('Hair_Transparency')).toBe('hair');
    expect(cc5SlotOf('Hair_Transparency_Pbr')).toBe('hair');
    expect(cc5SlotOf('Hair1_Transparency_Pbr')).toBe('hair');
    expect(cc5SlotOf('Scalp_Transparency_Pbr')).toBe('hair');
    expect(cc5SlotOf('Std_Skin_Head')).toBeNull();
    expect(cc5SlotOf('Brows_Hair_Transparency')).toBeNull();
    // Not yet mapped to a wardrobe slot: Ariana's skirt and earring, Aaron's stubble
    expect(cc5SlotOf('HM_with_TR_Skirt_Pbr')).toBeNull();
    expect(cc5SlotOf('Earring_Flower_Pbr')).toBeNull();
  });

  it('recognises the skin materials only, with or without the newer exports\' "_Pbr" suffix', () => {
    for (const m of ['Std_Skin_Head', 'Std_Skin_Body', 'Std_Skin_Arm', 'Std_Skin_Leg', 'Std_Nails',
      'Std_Skin_Head_Pbr', 'Std_Skin_Body_Pbr', 'Std_Skin_Arm_Pbr', 'Std_Skin_Leg_Pbr', 'Std_Nails_Pbr']) {
      expect(CC5_SKIN_MATERIALS.test(m)).toBe(true);
    }
    for (const m of ['Std_Eye_L', 'Std_Upper_Teeth', 'Std_Eyelash', 'Std_Eyelash_Pbr']) expect(CC5_SKIN_MATERIALS.test(m)).toBe(false);
  });

  it('wears a style by its main colour, and keeps the original without one', () => {
    const style = { pattern: 'solid', colors: ['#1d6e52', '#000000', '#ffffff'], scale: 1 } as unknown as Style;
    expect(cc5GarmentColor(style)).toBe('#1d6e52');
    expect(cc5GarmentColor(undefined)).toBeNull();
  });

  it('keeps the modelled skin at 0 and stays in range', () => {
    expect(cc5SkinMultiplier(0)).toEqual([1, 1, 1]);
    for (const [r, g, b] of [cc5SkinMultiplier(1), cc5SkinMultiplier(-1), cc5SkinMultiplier(5)]) {
      for (const v of [r, g, b]) expect(v).toBeGreaterThan(0.3);
    }
    expect(cc5SkinMultiplier(1)[0]).toBeLessThan(1);
    expect(cc5SkinMultiplier(-1)[0]).toBeGreaterThan(1);
  });

  it('keeps undertone at 0 a no-op and stays in range', () => {
    expect(cc5UndertoneMultiplier(0)).toEqual([1, 1, 1]);
    expect(cc5UndertoneMultiplier(1)[0]).toBeGreaterThan(1);
    expect(cc5UndertoneMultiplier(-1)[2]).toBeGreaterThan(1);
  });

  it('only lightens brows and lashes as albinism intensity rises', () => {
    expect(cc5AlbinismMultiplier(0)).toEqual([1, 1, 1]);
    expect(cc5AlbinismMultiplier(1)[0]).toBeGreaterThan(cc5AlbinismMultiplier(0.5)[0]);
    expect(cc5AlbinismMultiplier(-1)).toEqual([1, 1, 1]);
  });

  it('recognises brow and eyelash materials on both split-material bodies, old and new naming', () => {
    for (const m of ['Brows_Hair_Transparency', 'Brows_Base_Transparency', 'Eyelash_Low', 'Eyelash_Up', 'Lash_Thick_Transparency_Pbr', 'Brows_Hair_Transparency_Pbr']) {
      expect(CC5_BROW_LASH_MATERIALS.test(m)).toBe(true);
    }
    expect(CC5_BROW_LASH_MATERIALS.test('Std_Skin_Head')).toBe(false);
    expect(CC5_HAS_SPLIT_MATERIALS.masculine).toBe(true);
    expect(CC5_HAS_SPLIT_MATERIALS.feminine).toBe(true);
  });
});
