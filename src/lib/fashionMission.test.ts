import { describe, expect, it } from 'vitest';
import { fashionMissionStage } from './fashionMission';

describe('first look fashion mission', () => {
  const wardrobe = { owned: ['top-ankara-sunset'], equipped: { top: 'top-ankara-sunset' } };

  it('guides the player from shopping to wearing their purchase and attending the showcase', () => {
    expect(fashionMissionStage(null, false, wardrobe)).toBe('shop');
    expect(fashionMissionStage('top-ankara-sunset', false, { owned: [], equipped: {} })).toBe('shop');
    expect(fashionMissionStage('top-ankara-sunset', false, { owned: wardrobe.owned, equipped: {} })).toBe('wear');
    expect(fashionMissionStage('top-ankara-sunset', false, wardrobe)).toBe('showcase');
    expect(fashionMissionStage('top-ankara-sunset', true, wardrobe)).toBe('complete');
  });

  it('requires the purchased item to be equipped in its correct slot', () => {
    expect(fashionMissionStage('top-ankara-sunset', false, {
      owned: wardrobe.owned,
      equipped: { bottom: 'top-ankara-sunset' },
    })).toBe('wear');
  });
});
