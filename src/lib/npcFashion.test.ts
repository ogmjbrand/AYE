import { describe, expect, it } from 'vitest';
import { itemById } from './fashion';
import { appearanceCount, generateNpcAppearance } from './npcFashion';

describe('autonomous NPC fashion', () => {
  it('keeps an NPC appearance stable for the same identity and role', () => {
    expect(generateNpcAppearance('resident-adaeze', 'Nurse at General Hospital', true))
      .toEqual(generateNpcAppearance('resident-adaeze', 'Nurse at General Hospital', true));
  });

  it('varies outfit, hair colour, skin tone, and body shape between identities', () => {
    const looks = Array.from({ length: 16 }, (_, i) => generateNpcAppearance(`resident-${i}`, 'City resident', i % 2 === 0));
    expect(new Set(looks.map((look) => Object.values(look.itemIds).join('|'))).size).toBeGreaterThan(8);
    expect(new Set(looks.map((look) => look.skinTone)).size).toBeGreaterThan(1);
    expect(new Set(looks.map((look) => JSON.stringify(look.shape))).size).toBeGreaterThan(1);
    expect(looks.filter((_, i) => i % 2 === 0).every((look) => look.hairstyleItemId !== null)).toBe(true);
    expect(looks.filter((_, i) => i % 2 === 1).every((look) => look.hairstyleItemId === null)).toBe(true);
  });

  it('selects existing role-appropriate catalogue options', () => {
    const nurse = generateNpcAppearance('nurse-1', 'Nurse at General Hospital', true);
    const designer = generateNpcAppearance('designer-1', 'Kente designer', true);
    const athlete = generateNpcAppearance('footballer-1', 'Footballer', false);
    expect(nurse.itemIds.top).toMatch(/^top-(linen-ivory|cotton-midnight|cotton-terracotta)$/);
    expect(designer.itemIds.top).toMatch(/^top-(asooke|kente|batakari|batik|adire|bogolan|silk)/);
    expect(athlete.itemIds.top).toMatch(/^top-(cotton|breton|batik|adire)/);
    for (const look of [nurse, designer, athlete]) {
      for (const [slot, id] of Object.entries(look.itemIds)) {
        expect(itemById(id)?.slot, id).toBe(slot);
      }
    }
  });

  it('every combination of a role\'s outfit pieces and hair colours can come up (choices are independent)', () => {
    const ids = Array.from({ length: 20000 }, (_, i) => `resident-${i}`);
    const outfits = new Set(ids.map((id) => {
      const a = generateNpcAppearance(id, 'City resident', false).itemIds;
      return `${a.top}|${a.bottom}|${a.shoes}|${a.hair}`;
    }));
    // The casual pool: 8 tops × 6 bottoms × 3 shoes × 5 hair colours
    expect(appearanceCount('City resident', false).outfits).toBe(720);
    expect(outfits.size).toBe(720);
  });

  it('gives residents only real skin tones, all six of them', () => {
    const tones = new Set(Array.from({ length: 2000 }, (_, i) => generateNpcAppearance(`r-${i}`, 'City resident', true).skinTone));
    expect(tones.has('custom')).toBe(false);
    expect(tones.has('original')).toBe(false);
    expect(tones.size).toBe(6);
  });

  it('counts the appearances a base model can take, and they multiply out', () => {
    const c = appearanceCount('Nurse at General Hospital', true);
    expect(c.total).toBe(c.outfits * c.tones * c.shapes * c.hairstyles);
    expect(appearanceCount('Nurse', false).hairstyles).toBe(1);
  });

  it('fails loudly rather than returning an empty or unstable outfit for invalid identity', () => {
    expect(() => generateNpcAppearance('   ', 'resident', true)).toThrow(/stable identity/);
  });
});
