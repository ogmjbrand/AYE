import { describe, expect, it } from 'vitest';
import { FASHION_ITEMS, MAX_OUTFITS, itemById, type Wardrobe } from './fashion';
import { changedSlots, itemsForTab, outfitDraft, pick, saveOutfit, STUDIO_TABS, thumbnailNote } from './wardrobeStudio';

const owned = ['top-linen-ivory', 'bottom-denim-classic', 'shoes-clean-white', 'top-aso-satin-marigold-peplum', 'bottom-aso-satin-marigold-peplum', 'bag-tote-leather', 'hairstyle-afro', 'hair-copper', 'neck-pearl-bow'];
const w: Wardrobe = { owned, equipped: { top: 'top-linen-ivory', bottom: 'bottom-denim-classic' }, favourites: ['shoes-clean-white'] };

describe('wardrobe studio', () => {
  it('has the seven tabs from the brief', () => {
    expect(STUDIO_TABS.map((t) => t.label)).toEqual(['Tops', 'Bottoms', 'Dresses', 'Shoes', 'Accessories', 'Hairstyles', 'Complete Outfits']);
  });

  it('sorts what you own into tabs, a dress apart from tops and its skirt apart from bottoms', () => {
    const ids = (tab: Parameters<typeof itemsForTab>[1]) => itemsForTab(w, tab).map((i) => i.id);
    expect(ids('tops')).toEqual(['top-linen-ivory']);
    expect(ids('bottoms')).toEqual(['bottom-denim-classic']);
    expect(ids('dresses')).toEqual(['top-aso-satin-marigold-peplum']);
    expect(ids('accessories').sort()).toEqual(['bag-tote-leather', 'neck-pearl-bow']);
    expect(ids('hairstyles').sort()).toEqual(['hair-copper', 'hairstyle-afro']);
    expect(itemsForTab(w, 'shoes', true).map((i) => i.id)).toEqual(['shoes-clean-white']);
    // Never lists what you don't own
    expect(itemsForTab({ owned: [], equipped: {} }, 'tops')).toEqual([]);
  });

  it('puts a dress on with its skirt, and a plain top takes the skirt off', () => {
    const dress = itemById('top-aso-satin-marigold-peplum')!;
    const d1 = pick(w.equipped, dress, owned);
    expect(d1).toMatchObject({ top: dress.id, bottom: 'bottom-aso-satin-marigold-peplum' });
    const d2 = pick(d1, itemById('top-linen-ivory')!, owned);
    expect(d2.top).toBe('top-linen-ivory');
    expect(d2.bottom).toBeUndefined();
    // Tapping what's on takes it off
    expect(pick(d1, dress, owned)).toEqual({});
  });

  it('confirms only what changed, and saves looks up to the limit', () => {
    expect(changedSlots(w.equipped, { ...w.equipped, shoes: 'shoes-clean-white' })).toEqual(['shoes']);
    let outfits = saveOutfit([], '  Sunday best ', { top: 'top-linen-ivory' });
    expect(outfits[0].name).toBe('Sunday best');
    outfits = saveOutfit(outfits, 'sunday BEST', { top: 'top-aso-satin-marigold-peplum' });
    expect(outfits).toHaveLength(1);
    for (let i = 0; i < MAX_OUTFITS + 2; i++) outfits = saveOutfit(outfits, `L${i}`, {});
    expect(outfits).toHaveLength(MAX_OUTFITS);
    expect(outfitDraft({ name: 'x', equipped: { top: 'top-linen-ivory', shoes: 'shoes-leather-black' } }, owned)).toEqual({ top: 'top-linen-ivory' });
  });

  it('labels every thumbnail for what it is: clothes are fabric swatches, not separate garments', () => {
    for (const i of FASHION_ITEMS) expect(thumbnailNote(i).length).toBeGreaterThan(0);
    expect(thumbnailNote(itemById('top-linen-ivory')!)).toBe('Fabric for your top');
    expect(thumbnailNote(itemById('hairstyle-afro')!)).toBe('3D hairstyle');
  });
});
