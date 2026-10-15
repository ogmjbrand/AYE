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
  id: 'abc', name: 'Ada', lifestyle: 'ordinary', career: 'doctor',
  colorR: 1, colorG: 2, colorB: 3, balance: 5000, createdAt: 1, lastBalanceUpdate: 1,
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
});

describe('progress save', () => {
  it('restores balance and clock for the same character', () => {
    const s = new MemoryStorage();
    const state = { ...createGameState(4321, createTime(13, 5, 4)), today: { income: 10, expenses: 3 } };
    saveProgress('abc', state, s);
    expect(loadProgress(character, s)).toEqual(state);
  });

  it('starts fresh for a different character or corrupted data', () => {
    const s = new MemoryStorage();
    saveProgress('someone-else', createGameState(1), s);
    expect(loadProgress(character, s).balance).toBe(5000);
    s.setItem('aye_progress', '{"characterId":"abc","balance":"lots"}');
    expect(loadProgress(character, s).balance).toBe(5000);
  });
});
