import { describe, expect, it } from 'vitest';
import { FASHION_ITEMS, PATTERNS, SLOTS, itemById, resolveStyles, sanitiseWardrobe } from './fashion';

describe('fashion catalogue', () => {
  it('has unique ids, valid colours and prices, and items for every slot', () => {
    expect(new Set(FASHION_ITEMS.map((i) => i.id)).size).toBe(FASHION_ITEMS.length);
    for (const i of FASHION_ITEMS) {
      expect(i.price).toBeGreaterThan(0);
      expect(PATTERNS[i.style.pattern]).toBeTypeOf('number');
      for (const c of i.style.colors) expect(c).toMatch(/^#[0-9a-f]{6}$/);
      expect(i.id.startsWith(i.slot)).toBe(true);
    }
    for (const slot of SLOTS) expect(FASHION_ITEMS.some((i) => i.slot === slot)).toBe(true);
  });

  it('try-on overrides equipped items, and null shows the original clothes', () => {
    const equipped = { top: 'top-linen-ivory', shoes: 'shoes-clean-white' };
    const styles = resolveStyles(equipped, { top: 'top-ankara-royal', shoes: null });
    expect(styles.top).toBe(itemById('top-ankara-royal')!.style);
    expect(styles.shoes).toBeUndefined();
    expect(styles.bottom).toBeUndefined();
  });

  it('sanitises saved wardrobes', () => {
    expect(sanitiseWardrobe(null)).toEqual({ owned: [], equipped: {} });
    // Equipped items must be owned and in the right slot
    expect(sanitiseWardrobe({ owned: ['hair-copper'], equipped: { top: 'hair-copper', hair: 'hair-copper' } }))
      .toEqual({ owned: ['hair-copper'], equipped: { hair: 'hair-copper' } });
  });

});
