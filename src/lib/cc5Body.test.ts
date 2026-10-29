import { describe, expect, it } from 'vitest';
import { cc5GarmentColor, cc5SkinMultiplier, cc5SlotOf, CC5_SKIN_MATERIALS } from './cc5Body';
import type { Style } from './fashion';

describe('CC5 player body', () => {
  it('maps the modelled garments to wardrobe slots', () => {
    expect(cc5SlotOf('RS_Regular_Fit_Shirt')).toBe('top');
    expect(cc5SlotOf('Slim_Fit_Trousers')).toBe('bottom');
    expect(cc5SlotOf('Sport_sneakers')).toBe('shoes');
    expect(cc5SlotOf('Hair_Transparency')).toBe('hair');
    expect(cc5SlotOf('Std_Skin_Head')).toBeNull();
    expect(cc5SlotOf('Brows_Hair_Transparency')).toBeNull();
  });

  it('recognises the skin materials only', () => {
    for (const m of ['Std_Skin_Head', 'Std_Skin_Body', 'Std_Skin_Arm', 'Std_Skin_Leg', 'Std_Nails']) expect(CC5_SKIN_MATERIALS.test(m)).toBe(true);
    for (const m of ['Std_Eye_L', 'Std_Upper_Teeth', 'Std_Eyelash']) expect(CC5_SKIN_MATERIALS.test(m)).toBe(false);
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
});
