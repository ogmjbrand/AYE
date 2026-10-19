import { describe, expect, it } from 'vitest';
import { fashionShowcaseResult } from './fashionShowcase';

describe('daily fashion showcase', () => {
  it('rewards participation without requiring luxury items', () => {
    const result = fashionShowcaseResult({ owned: [], equipped: {} });
    expect(result).toMatchObject({ score: 20, wornPieces: 0, coordinated: false, tier: 'First steps' });
    expect(result.reward).toBeGreaterThan(0);
  });

  it('scores owned clothes and coordinated looks, never their price', () => {
    const everyday = fashionShowcaseResult({
      owned: ['top-cotton-midnight', 'bottom-denim-classic'],
      equipped: { top: 'top-cotton-midnight', bottom: 'bottom-denim-classic' },
    });
    const luxuryTop = fashionShowcaseResult({
      owned: ['top-silk-burgundy'],
      equipped: { top: 'top-silk-burgundy' },
    });
    const affordableTop = fashionShowcaseResult({
      owned: ['top-cotton-midnight'],
      equipped: { top: 'top-cotton-midnight' },
    });
    const coordinated = fashionShowcaseResult({
      owned: ['top-ankara-sunset', 'bottom-ankara-sunset'],
      equipped: { top: 'top-ankara-sunset', bottom: 'bottom-ankara-sunset' },
    });

    expect(luxuryTop.score).toBe(affordableTop.score);
    expect(everyday.coordinated).toBe(false);
    expect(coordinated.coordinated).toBe(true);
    expect(coordinated.score).toBeGreaterThan(everyday.score);
    expect(coordinated.reward).toBeGreaterThan(everyday.reward);
  });

  it('allows a complete, coordinated outfit to earn a full 100 points', () => {
    const result = fashionShowcaseResult({
      owned: ['top-ankara-sunset', 'bottom-ankara-sunset', 'shoes-clean-white', 'hair-natural-black'],
      equipped: {
        top: 'top-ankara-sunset',
        bottom: 'bottom-ankara-sunset',
        shoes: 'shoes-clean-white',
        hair: 'hair-natural-black',
      },
    });

    expect(result).toMatchObject({ score: 100, wornPieces: 4, coordinated: true, tier: 'Spotlight', reward: 375 });
  });

  it('ignores clothes that are not owned or equipped in their proper slot', () => {
    expect(fashionShowcaseResult({
      owned: ['top-cotton-midnight'],
      equipped: { top: 'top-cotton-midnight', bottom: 'top-cotton-midnight', shoes: 'missing-item' },
    }).wornPieces).toBe(1);
  });
});
