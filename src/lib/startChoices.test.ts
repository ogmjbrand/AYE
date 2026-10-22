import { describe, expect, it } from 'vitest';
import { applyStart } from './life';
import { createGameState } from './gameState';
import { homeById, moveInFee } from './homes';
import { hasProgress, parseCharacter, saveCharacter, saveProgress } from './save';
import { buildCharacter, newDraft } from './creator';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 } as Storage;
};

describe('opening choices for a new life', () => {
  it('sets traits and a dream, and moves into the first home paying the move-in fee', () => {
    const home = homeById('marina-court-room')!;
    const s = applyStart(createGameState(5000), { traits: ['thrifty', 'sociable'], dream: 'luxury', homeId: home.id }, 'engineer', 'ordinary');
    expect(s.life.profile.traits).toEqual(['thrifty', 'sociable']);
    expect(s.life.dream?.id).toBe('luxury');
    expect(s.home).toBe(home.id);
    expect(s.today.expenses).toBeGreaterThanOrEqual(moveInFee(home));
  });

  it('puts the background story on the profile', () => {
    const s = applyStart(createGameState(5000), { bio: 'From Ibadan.', traits: [], dream: null, homeId: null }, 'none', 'ordinary');
    expect(s.life.profile.bio).toBe('From Ibadan.');
  });

  it('skips a home the starting money cannot cover', () => {
    const s = applyStart(createGameState(100), { traits: [], dream: null, homeId: 'marina-heights-penthouse' }, 'none', 'student');
    expect(s.home).toBeNull();
    expect(s.balance).toBe(100);
  });

  it('is part of a newly built character, but never saved or loaded', () => {
    const d = { ...newDraft(), name: 'Ada', traits: ['active' as const], dream: 'chef' as const, homeId: null };
    const c = buildCharacter(d, { id: 'c1', now: 1 });
    expect(c.start).toEqual({ bio: '', traits: ['active'], dream: 'chef', homeId: null });
    const storage = memory();
    saveCharacter(c, storage);
    expect(JSON.parse(storage.getItem('aye_character')!).start).toBeUndefined();
    expect(parseCharacter({ ...JSON.parse(storage.getItem('aye_character')!), start: { traits: [], dream: null, homeId: 'x' } })?.start).toBeUndefined();
    expect(hasProgress(c, storage)).toBe(false);
    saveProgress(c.id, createGameState(10), storage);
    expect(hasProgress(c, storage)).toBe(true);
    // Editing appearance keeps an existing character's life as it is
    expect(buildCharacter(d, { existing: { ...c, start: undefined } }).start).toBeUndefined();
  });
});
