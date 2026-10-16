import { describe, expect, it } from 'vitest';
import type { Character } from '../components/CharacterCreation';
import { createGameState, createTime } from './gameState';
import { loadCharacter, loadProgress, parseCharacter, saveCharacter, saveProgress } from './save';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(k: string) { return this.data.get(k) ?? null; }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  removeItem(k: string) { this.data.delete(k); }
  setItem(k: string, v: string) { this.data.set(k, v); }
}

const character: Character = {
  id: 'abc', name: 'Ada', lifestyle: 'ordinary', career: 'doctor', diet: 'vegan',
  colorR: 1, colorG: 2, colorB: 3, balance: 5000, createdAt: 1, lastBalanceUpdate: 1,
  gender: 'woman', heritage: 'black-african', ethnicGroup: 'Igbo', country: 'NG', region: 'Enugu',
  body: 'feminine', lookId: 'female-adult-10', heightCm: 168, shape: { weight: 0.3, muscle: 0, curves: 0.9, belly: 0.15 },
  wardrobe: { owned: ['top-ankara-sunset', 'hair-copper'], equipped: { top: 'top-ankara-sunset' } },
};

describe('character save', () => {
  it('round-trips a valid character', () => {
    const s = new MemoryStorage();
    saveCharacter(character, s);
    expect(loadCharacter(s)).toEqual(character);
  });

  it.each([
    ['not json', '{oops'],
    ['wrong shape', '{"name":"x"}'],
    ['bad lifestyle', JSON.stringify({ ...character, lifestyle: 'royal' })],
    ['bad colour', JSON.stringify({ ...character, colorR: 999 })],
    ['negative balance', JSON.stringify({ ...character, balance: -1 })],
  ])('ignores a corrupted save (%s)', (_, raw) => {
    const s = new MemoryStorage();
    s.setItem('aye_character', raw);
    expect(loadCharacter(s)).toBeNull();
  });

  it('rejects null', () => expect(parseCharacter(null)).toBeNull());

  it('characters saved before identity existed get neutral defaults and the original look', () => {
    const { gender, heritage, ethnicGroup, country, region, body, lookId, heightCm, ...old } = character;
    void gender; void heritage; void ethnicGroup; void country; void region; void body; void lookId; void heightCm;
    const c = parseCharacter(old)!;
    expect(c).toMatchObject({
      gender: 'unspecified', heritage: 'unspecified', ethnicGroup: '', country: 'NG', region: '',
      body: 'masculine', lookId: 'male-adult-12', heightCm: 177,
    });
  });

  it('characters saved before the wardrobe existed own nothing and wear their original clothes', () => {
    const { wardrobe, ...old } = character;
    void wardrobe;
    expect(parseCharacter(old)!.wardrobe).toEqual({ owned: [], equipped: {} });
  });

  it('characters saved before body shape existed are average', () => {
    const { shape, ...old } = character;
    void shape;
    expect(parseCharacter(old)!.shape).toEqual({ weight: 0, muscle: 0, curves: 0, belly: 0 });
  });

  it('drops unknown or unowned wardrobe items', () => {
    const c = parseCharacter({
      ...character,
      wardrobe: { owned: ['top-ankara-sunset', 'ghost-item', 'top-ankara-sunset'], equipped: { top: 'top-ankara-sunset', shoes: 'shoes-metallic-gold', hair: 'ghost-item' } },
    })!;
    expect(c.wardrobe).toEqual({ owned: ['top-ankara-sunset'], equipped: { top: 'top-ankara-sunset' } });
  });

  it('repairs invalid identity fields instead of discarding the save', () => {
    const c = parseCharacter({
      ...character, gender: 'robot', heritage: 'martian', country: 'ZZ', heightCm: 400,
      lookId: 'male-adult-18', ethnicGroup: 'x'.repeat(100),
    })!;
    expect(c.gender).toBe('unspecified');
    expect(c.heritage).toBe('unspecified');
    expect(c.country).toBe('NG');
    expect(c.heightCm).toBe(165);
    // A masculine look with a feminine body falls back to a feminine look
    expect(c.lookId).toBe('female-adult-08');
    expect(c.ethnicGroup.length).toBe(40);
  });

  it('characters saved before diets existed default to eating everything', () => {
    const { diet: _omit, ...old } = character;
    void _omit;
    expect(parseCharacter(old)?.diet).toBe('everything');
  });

  it('rejects an unknown diet', () => {
    expect(parseCharacter({ ...character, diet: 'carnivore-only' })).toBeNull();
  });
});

describe('progress save', () => {
  it('restores balance and clock for the same character', () => {
    const s = new MemoryStorage();
    const state = { ...createGameState(4321, createTime(13, 5, 4)), today: { income: 10, expenses: 3, minutesWorked: 90 }, minutesWorkedThisHour: 12 };
    saveProgress('abc', state, s);
    expect(loadProgress(character, s)).toEqual(state);
  });

  it('loads progress saved before work shifts existed', () => {
    const s = new MemoryStorage();
    s.setItem('aye_progress', JSON.stringify({
      characterId: 'abc', balance: 100, today: { income: 1, expenses: 2 },
      time: { hour: 10, minute: 0, totalMinutes: 600, dayOfWeek: 1 },
    }));
    const p = loadProgress(character, s);
    expect(p.balance).toBe(100);
    expect(p.today.minutesWorked).toBe(0);
    expect(p.minutesWorkedThisHour).toBe(0);
    expect(p.fullness).toBe(100);
  });

  it('starts fresh for a different character or corrupted data', () => {
    const s = new MemoryStorage();
    saveProgress('someone-else', createGameState(1), s);
    expect(loadProgress(character, s).balance).toBe(5000);
    s.setItem('aye_progress', '{"characterId":"abc","balance":"lots"}');
    expect(loadProgress(character, s).balance).toBe(5000);
  });
});
