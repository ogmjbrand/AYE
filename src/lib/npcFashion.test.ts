import { describe, expect, it } from 'vitest';
import { itemById } from './fashion';
import { generateNpcAppearance } from './npcFashion';

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

  it('fails loudly rather than returning an empty or unstable outfit for invalid identity', () => {
    expect(() => generateNpcAppearance('   ', 'resident', true)).toThrow(/stable identity/);
  });
});
