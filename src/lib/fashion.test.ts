import { describe, expect, it } from 'vitest';
import { FABRICS, FASHION_ITEMS, MAX_OUTFITS, PATTERNS, SLOTS, itemById, resolveStyles, sanitiseWardrobe, stockedIn } from './fashion';
import { COUNTRY_CODES } from './places';

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

  it('each boutique has its own range, plus the basics everywhere', () => {
    for (const i of FASHION_ITEMS) for (const c of i.stockedIn ?? []) expect(COUNTRY_CODES, i.id).toContain(c);
    // Every Nigerian city stocks aso-oke, not kente
    expect(stockedIn('kano.sabon-gari').map((i) => i.id)).toContain('top-asooke-champagne');
    expect(stockedIn('kano.sabon-gari').map((i) => i.id)).not.toContain('top-kente-adweneasa');
    const lagos = stockedIn('lagos.marina').map((i) => i.id);
    const accra = stockedIn('accra.osu').map((i) => i.id);
    expect(lagos).toContain('top-asooke-champagne');
    expect(lagos).not.toContain('top-kente-adweneasa');
    expect(accra).toContain('top-kente-adweneasa');
    expect(accra).not.toContain('top-asooke-champagne');
    expect(lagos).toContain('top-linen-ivory');
    expect(accra).toContain('top-linen-ivory');
    for (const slot of SLOTS) {
      expect(lagos.some((id) => itemById(id)!.slot === slot), slot).toBe(true);
      expect(accra.some((id) => itemById(id)!.slot === slot), slot).toBe(true);
    }
  });

  it('keeps saved looks tidy: owned items only, named, at most six', () => {
    const w = sanitiseWardrobe({
      owned: ['top-batik-ocean', 'hair-copper'],
      equipped: {},
      outfits: [
        { name: '  Sunday best  ', equipped: { top: 'top-batik-ocean', hair: 'hair-copper', shoes: 'shoes-leather-tan' } },
        { name: '', equipped: {} },
        ...Array.from({ length: 10 }, (_, i) => ({ name: `Look ${i}`, equipped: {} })),
      ],
    });
    expect(w.outfits![0]).toEqual({ name: 'Sunday best', equipped: { top: 'top-batik-ocean', hair: 'hair-copper' } });
    expect(w.outfits!.length).toBe(MAX_OUTFITS);
    expect(sanitiseWardrobe({ owned: [], equipped: {} }).outfits).toBeUndefined();
  });
  it('every garment has a fabric that suits it; hair dye keeps the hair finish', () => {
    for (const i of FASHION_ITEMS) {
      if (i.slot === 'hair') expect(i.style.fabric, i.id).toBeUndefined();
      else expect(i.style.fabric, i.id).toBeDefined();
    }
    expect(itemById('top-silk-burgundy')!.style.fabric!.roughness).toBeLessThan(FABRICS.cotton.roughness);
    expect(itemById('bottom-denim-classic')!.style.fabric!.weave).toBe(2);
    expect(itemById('top-kente-adweneasa')!.style.fabric!.name).toBe('handwoven');
    expect(itemById('shoes-metallic-gold')!.style.fabric!.metalness).toBeGreaterThan(0.5);
  });
});
