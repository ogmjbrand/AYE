/**
 * Browser save data. Everything read back is validated, so a corrupted or
 * outdated save is ignored instead of crashing the game.
 */
import type { Career, Character, Lifestyle } from '../components/CharacterCreation';
import { createGameState, getPeriod, type GameState } from './gameState';

const CHARACTER_KEY = 'aye_character';
const PROGRESS_KEY = 'aye_progress';

const LIFESTYLES: readonly Lifestyle[] = ['student', 'ordinary', 'middle-class', 'luxury'];
const CAREERS: readonly Career[] = [
  'none', 'student', 'artist', 'entrepreneur', 'athlete', 'engineer', 'doctor', 'pilot',
];

const isNum = (v: unknown, min = -Infinity, max = Infinity): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const isInt = (v: unknown, min: number, max: number): v is number => isNum(v, min, max) && Number.isInteger(v);

function readJson(storage: Storage, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function parseCharacter(data: unknown): Character | null {
  if (typeof data !== 'object' || data === null) return null;
  const c = data as Record<string, unknown>;
  if (
    typeof c.id !== 'string' ||
    typeof c.name !== 'string' || c.name.trim() === '' ||
    !LIFESTYLES.includes(c.lifestyle as Lifestyle) ||
    !CAREERS.includes(c.career as Career) ||
    !isInt(c.colorR, 0, 255) || !isInt(c.colorG, 0, 255) || !isInt(c.colorB, 0, 255) ||
    !isNum(c.balance, 0) || !isNum(c.createdAt) || !isNum(c.lastBalanceUpdate)
  ) {
    return null;
  }
  return c as unknown as Character;
}

export function loadCharacter(storage: Storage = localStorage): Character | null {
  return parseCharacter(readJson(storage, CHARACTER_KEY));
}

export function saveCharacter(character: Character, storage: Storage = localStorage) {
  storage.setItem(CHARACTER_KEY, JSON.stringify(character));
}

export function clearSave(storage: Storage = localStorage) {
  storage.removeItem(CHARACTER_KEY);
  storage.removeItem(PROGRESS_KEY);
}

/** Restores clock, balance and today's ledger for this character, or starts fresh. */
export function loadProgress(character: Character, storage: Storage = localStorage): GameState {
  const fresh = createGameState(character.balance);
  const data = readJson(storage, PROGRESS_KEY);
  if (typeof data !== 'object' || data === null) return fresh;
  const p = data as Record<string, unknown>;
  const time = p.time as Record<string, unknown> | undefined;
  const today = p.today as Record<string, unknown> | undefined;
  if (
    p.characterId !== character.id ||
    !isNum(p.balance, 0) ||
    !time || !isInt(time.hour, 0, 23) || !isInt(time.minute, 0, 59) ||
    !isInt(time.dayOfWeek, 0, 6) || !isInt(time.totalMinutes, 0, Number.MAX_SAFE_INTEGER) ||
    !today || !isNum(today.income, 0) || !isNum(today.expenses, 0)
  ) {
    return fresh;
  }
  return {
    time: {
      hour: time.hour,
      minute: time.minute,
      dayOfWeek: time.dayOfWeek,
      totalMinutes: time.totalMinutes,
      period: getPeriod(time.hour),
    },
    balance: p.balance,
    today: { income: today.income, expenses: today.expenses },
    summary: null,
  };
}

export function saveProgress(characterId: string, state: GameState, storage: Storage = localStorage) {
  const { time, balance, today } = state;
  storage.setItem(PROGRESS_KEY, JSON.stringify({ characterId, time, balance, today }));
}
