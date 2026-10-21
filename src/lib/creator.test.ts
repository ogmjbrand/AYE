import { describe, expect, it } from 'vitest';
import type { Character } from '../components/CharacterCreation';
import { EDIT_STAGES, STAGES, STARTER_PRESETS, applyPreset, buildCharacter, draftFrom, isStarter, newDraft, problems, randomise, starterItems, withBody } from './creator';
import { LOOKS, HEIGHT_RANGE, lookById } from './looks';
import { itemById } from './fashion';
import { sanitiseShape } from './bodyShape';
import { parseCharacter } from './save';

/** A seeded random number generator, so random characters are repeatable in tests. */
const seeded = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

describe('character creator', () => {
  it('has the seven stages in order, and editing skips identity', () => {
    expect(STAGES.map((s) => s.id)).toEqual(['identity', 'body', 'proportions', 'face', 'hair', 'clothes', 'review']);
    expect(EDIT_STAGES).not.toContain('identity');
  });

  it('starter clothes are free local and everyday pieces only', () => {
    const ng = starterItems('NG');
    expect(ng.some((i) => i.id === 'top-adire-eleko')).toBe(true);
    expect(ng.some((i) => i.id === 'top-kente-gold')).toBe(false); // sold in Ghana
    expect(ng.every((i) => i.collection !== 'Luxury')).toBe(true);
    expect(isStarter('shoes-metallic-gold', 'NG')).toBe(false);
  });

  it('changing body keeps everything coherent', () => {
    const d = withBody({ ...newDraft(), shape: { ...newDraft().shape, bust: 0.8, waist: 0.5 } }, 'masculine');
    expect(lookById(d.lookId).body).toBe('masculine');
    expect(d.shape.bust).toBe(0);
    expect(d.shape.waist).toBe(0);
  });

  it('presets use real people, real figures and starter clothes', () => {
    for (const p of STARTER_PRESETS) {
      const d = applyPreset(newDraft('NG'), p);
      expect(lookById(d.lookId).id).toBe(p.lookId);
      expect(lookById(d.lookId).body).toBe(p.body);
      for (const id of Object.values(d.outfit)) expect(isStarter(id!, 'NG')).toBe(true);
    }
  });

  it('randomise always gives a valid, coherent character for the chosen body', () => {
    for (const body of ['feminine', 'masculine'] as const) {
      for (let seed = 1; seed < 200; seed++) {
        const d = randomise({ ...newDraft('GH'), body, name: 'Test' }, seeded(seed));
        const look = LOOKS.find((l) => l.id === d.lookId)!;
        expect(look.body).toBe(body);
        expect(d.heightCm).toBeGreaterThanOrEqual(HEIGHT_RANGE.min);
        expect(d.heightCm).toBeLessThanOrEqual(HEIGHT_RANGE.max);
        expect(sanitiseShape(d.shape)).toEqual(d.shape);
        if (body === 'masculine') expect(d.shape.bust).toBe(0);
        expect(Math.abs(d.skinTone)).toBeLessThanOrEqual(1);
        for (const [slot, id] of Object.entries(d.outfit)) {
          if (!id) continue;
          expect(itemById(id)?.slot).toBe(slot);
          expect(isStarter(id, 'GH')).toBe(true);
        }
        // Covered heads never get a hair colour (it would recolour the headwear)
        if (look.covered) expect(d.outfit.hair ?? null).toBeNull();
        expect(problems(d)).toEqual([]);
      }
    }
  });

  it('a new character owns and wears the starter clothes picked, and survives a save round-trip', () => {
    const d = { ...applyPreset(newDraft('NG'), STARTER_PRESETS[0]), name: 'Amaka' };
    const c = buildCharacter(d, { id: 'x', now: 1 });
    expect(c.wardrobe.owned.sort()).toEqual(Object.values(d.outfit).map(String).sort());
    expect(c.wardrobe.equipped).toEqual(d.outfit);
    expect(c.skinTone).toBe(0.9);
    expect(c.balance).toBeGreaterThan(0);
    expect(parseCharacter(JSON.parse(JSON.stringify(c)))).toEqual(c);
  });

  it('editing keeps id, money and owned clothes, and can only wear what you own', () => {
    const existing = buildCharacter({ ...newDraft('NG'), name: 'Ada', outfit: { top: 'top-linen-ivory' } }, { id: 'keep', now: 5 });
    const rich: Character = { ...existing, balance: 123_456, wardrobe: { ...existing.wardrobe, owned: [...existing.wardrobe.owned, 'top-silk-burgundy'] } };
    const d = { ...draftFrom(rich), skinTone: -0.4, outfit: { top: 'top-silk-burgundy', bottom: 'bottom-denim-black' } };
    const edited = buildCharacter(d, { existing: rich });
    expect(edited.id).toBe('keep');
    expect(edited.balance).toBe(123_456);
    expect(edited.wardrobe.owned).toEqual(rich.wardrobe.owned);
    expect(edited.wardrobe.equipped).toEqual({ top: 'top-silk-burgundy' }); // denim isn't owned, so not worn
    expect(edited.skinTone).toBe(-0.4);
  });

  it('needs a name', () => {
    expect(problems(newDraft())).toContain('Enter a name.');
  });
});
