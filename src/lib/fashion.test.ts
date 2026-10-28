import { describe, expect, it } from 'vitest';
import { ADORNMENT_SLOTS, COLOUR_CHOICES, FABRICS, FASHION_ITEMS, GARMENT_MODELS, getGarmentModel, itemById, MAX_OUTFITS, PATTERNS, recolourable, resolveFashionItemId, resolveStyles, sanitiseWardrobe, SLOT_LABEL, SLOTS, stockedIn, styleIn, swatchCss } from './fashion';
import { COUNTRY_CODES } from './places';

describe('fashion catalogue', () => {
  it('has unique ids, valid colours and prices, and items for every slot', () => {
    expect(new Set(FASHION_ITEMS.map((i) => i.id)).size).toBe(FASHION_ITEMS.length);
    for (const i of FASHION_ITEMS) {
      // Collectibles are earned, never sold; everything else has a price
      if (i.collection === 'Rewards') expect(i.stockedIn).toEqual([]);
      else expect(i.price).toBeGreaterThan(0);
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
    expect(resolveFashionItemId(equipped, { shoes: 'shoes-metallic-gold' }, 'shoes')).toBe('shoes-metallic-gold');
    expect(resolveFashionItemId(equipped, { shoes: null }, 'shoes')).toBeNull();
    expect(resolveFashionItemId(equipped, undefined, 'shoes')).toBe('shoes-clean-white');
  });

  it('sanitises saved wardrobes', () => {
    expect(sanitiseWardrobe(null)).toEqual({ owned: [], equipped: {} });
    // Equipped items must be owned and in the right slot
    expect(sanitiseWardrobe({ owned: ['hair-copper'], equipped: { top: 'hair-copper', hair: 'hair-copper' } }))
      .toEqual({ owned: ['hair-copper'], equipped: { hair: 'hair-copper' } });
    expect(sanitiseWardrobe({
      owned: ['hair-copper', 'hairstyle-braids'],
      equipped: { hair: 'hair-copper', hairstyle: 'hairstyle-braids' },
    }).equipped).toEqual({ hair: 'hair-copper', hairstyle: 'hairstyle-braids' });
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
      if (i.slot === 'hair' || i.slot === 'hairstyle') expect(i.style.fabric, i.id).toBeUndefined();
      else expect(i.style.fabric, i.id).toBeDefined();
    }
    expect(itemById('top-silk-burgundy')!.style.fabric!.roughness).toBeLessThan(FABRICS.cotton.roughness);
    expect(itemById('bottom-denim-classic')!.style.fabric!.weave).toBe(2);
    expect(itemById('top-kente-adweneasa')!.style.fabric!.name).toBe('handwoven');
    expect(itemById('shoes-metallic-gold')!.style.fabric!.metalness).toBeGreaterThan(0.5);
  });

  it('keeps model-backed hairstyles separate from hair colour and material styling', () => {
    const hairstyles = FASHION_ITEMS.filter((item) => item.slot === 'hairstyle');
    expect(SLOT_LABEL.hair).toBe('Hair colour');
    expect(SLOT_LABEL.hairstyle).toBe('Hairstyles');
    expect(hairstyles.map((item) => item.id)).toEqual([
      'hairstyle-afro',
      'hairstyle-braids',
      'hairstyle-ponytail',
      'hairstyle-long',
    ]);
    for (const item of hairstyles) {
      const model = getGarmentModel(item.id);
      expect(model?.path, item.id).toMatch(/^hair\/.+\.glb$/);
      expect(model?.thumbnail, item.id).toMatch(/^clothing\/hair\/.+\.png$/);
      expect(model?.attachBones, item.id).toContain('Bip01 Head');
    }
    expect(resolveStyles({ hair: 'hair-copper', hairstyle: 'hairstyle-afro' })).toEqual({
      hair: itemById('hair-copper')!.style,
    });
  });

  it('only registers garment models for catalogue items', () => {
    for (const [id, model] of Object.entries(GARMENT_MODELS)) {
      expect(itemById(id), id).toBeDefined();
      expect(model?.path, id).toMatch(/^[^/\\]+(?:[/\\][^/\\]+)*\.gl(?:b|tf)$/i);
    }
  });
});

describe('choosing colours', () => {
  const tote = itemById('bag-tote-leather')!;
  const shoes = itemById('shoes-clean-white')!;
  const ankara = itemById('top-ankara-royal')!;
  const navy = COLOUR_CHOICES.find((c) => c.name === 'Navy')!.hex;

  it('lets you pick the colour of plain pieces, but not prints, hair dye or rewards', () => {
    expect(recolourable(tote)).toBe(true);
    expect(recolourable(shoes)).toBe(true);
    expect(recolourable(ankara)).toBe(false);
    expect(recolourable(itemById('hair-copper')!)).toBe(false);
    expect(recolourable(itemById('shoes-trail-emerald')!)).toBe(false);
  });

  it('wears the colour you chose, keeping the fabric and the bag shape', () => {
    const s = styleIn(tote, navy);
    expect(s.colors).toEqual([navy, navy, navy]);
    expect(s.fabric).toBe(tote.style.fabric);
    expect(s.bag).toBe('tote');
    expect(styleIn(tote, '#123456')).toBe(tote.style);
    expect(styleIn(ankara, navy)).toBe(ankara.style);
    const styles = resolveStyles({ bag: tote.id, shoes: shoes.id }, undefined, { [tote.id]: navy });
    expect(styles.bag?.colors[0]).toBe(navy);
    expect(styles.shoes).toBe(shoes.style);
  });

  it('keeps chosen colours on load, dropping ones not on offer or for pieces that cannot change', () => {
    const w = sanitiseWardrobe({ owned: [tote.id], equipped: { bag: tote.id }, colours: { [tote.id]: navy, [ankara.id]: navy, [shoes.id]: '#000001', nope: navy } });
    expect(w.equipped.bag).toBe(tote.id);
    expect(w.colours).toEqual({ [tote.id]: navy });
    expect(sanitiseWardrobe({ owned: [], equipped: {} }).colours).toBeUndefined();
  });

  it('every bag has a shape and is sold in every country', () => {
    const bags = FASHION_ITEMS.filter((i) => i.slot === 'bag');
    expect(bags.length).toBe(67);
    for (const b of bags) {
      expect(b.style.bag).toBeTruthy();
      expect(b.stockedIn).toBeUndefined();
    }
  });
});

describe('jewellery, sunglasses and nails', () => {
  const worn = FASHION_ITEMS.filter((i) => ADORNMENT_SLOTS.includes(i.slot));
  it('every worn piece has its cut, and necklaces say what hangs from them', () => {
    expect(worn.length).toBeGreaterThanOrEqual(70);
    for (const i of worn) expect(i.style.piece?.kind, i.id).toBeTruthy();
    expect(itemById('neck-layered-pearl-cross-gold')!.style.piece).toEqual({ kind: 'layered', pendant: 'cross' });
    expect(itemById('eyes-cateye-red')!.style.piece!.kind).toBe('cat-eye');
  });
  it('jewellery keeps its metal and stones; a plain set of nails can be any polish', () => {
    for (const i of worn.filter((w) => w.slot !== 'nails')) expect(recolourable(i), i.id).toBe(false);
    expect(recolourable(itemById('nails-red-stiletto')!)).toBe(true);
    expect(recolourable(itemById('nails-lilac-french')!)).toBe(false);
    expect(itemById('neck-iced-cross-ruby')!.style.fabric!.name).toBe('silver');
    expect(itemById('ears-chunky-hoop-gold')!.style.fabric!.name).toBe('gold');
  });
  it('the new prints have a swatch of their own', () => {
    for (const p of ['leopard', 'polka', 'cherry', 'floral', 'lace', 'swirl'] as const) {
      const it = FASHION_ITEMS.find((i) => i.style.pattern === p)!;
      expect(it, p).toBeTruthy();
      expect(swatchCss(it.style), p).not.toBe(it.style.colors[0]);
    }
  });
  it('a saved wardrobe keeps worn pieces in their own slots', () => {
    const w = sanitiseWardrobe({ owned: ['neck-solitaire-gold', 'nails-red-stiletto'], equipped: { neck: 'neck-solitaire-gold', ears: 'nails-red-stiletto', nails: 'nails-red-stiletto' } });
    expect(w.equipped).toEqual({ neck: 'neck-solitaire-gold', nails: 'nails-red-stiletto' });
  });
});
