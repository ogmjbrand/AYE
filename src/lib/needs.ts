/**
 * Needs and mood. Alongside hunger (fullness, in gameState) a person has four
 * needs, each 0 (empty) … 100 (fully met), that run down as time passes and
 * are met by sleeping, washing, relaxing and seeing people:
 *
 *   - energy:  sleep (best in your own bed), relaxing a little
 *   - hygiene: shower or bath at home
 *   - fun:     TV, games, books, music, the park, nights out
 *   - social:  time with friends
 *
 * Mood is a weighted mix of all five plus how comfortable your home is. It
 * changes real outcomes: an exhausted player is paid at half rate (like a
 * hungry one) and a work task's bonus is scaled by mood.
 */

export interface Needs {
  energy: number;
  hygiene: number;
  fun: number;
  social: number;
}

export type NeedKey = keyof Needs;

export const NEED_KEYS: readonly NeedKey[] = ['energy', 'hygiene', 'fun', 'social'];

export const NEED_LABEL: Record<NeedKey, string> = { energy: 'Energy', hygiene: 'Hygiene', fun: 'Fun', social: 'Social' };

export const FULL_NEEDS: Needs = { energy: 100, hygiene: 100, fun: 100, social: 100 };

/** Lost per awake game minute: energy lasts 17 hours, hygiene 22, fun 12, social 28. */
export const NEED_LOSS_PER_MINUTE: Needs = {
  energy: 100 / (17 * 60),
  hygiene: 100 / (22 * 60),
  fun: 100 / (12 * 60),
  social: 100 / (28 * 60),
};

/** Below this energy you're exhausted: work is paid at half rate. */
export const TIRED_THRESHOLD = 15;

/** Where you slept decides how much energy comes back: rough sleep never fully restores you. */
export const SLEEP_ENERGY = { home: 100, friend: 85, rough: 55 } as const;

const clamp = (v: number) => Math.min(100, Math.max(0, v));

/** One awake minute. */
export function decayNeeds(n: Needs): Needs {
  return {
    energy: clamp(n.energy - NEED_LOSS_PER_MINUTE.energy),
    hygiene: clamp(n.hygiene - NEED_LOSS_PER_MINUTE.hygiene),
    fun: clamp(n.fun - NEED_LOSS_PER_MINUTE.fun),
    social: clamp(n.social - NEED_LOSS_PER_MINUTE.social),
  };
}

/** One asleep minute: only hygiene keeps (slowly) running down. Energy is restored on waking. */
export function decayNeedsAsleep(n: Needs): Needs {
  return { ...n, hygiene: clamp(n.hygiene - NEED_LOSS_PER_MINUTE.hygiene / 2) };
}

export function addNeeds(n: Needs, gains: Partial<Needs>): Needs {
  return {
    energy: clamp(n.energy + (gains.energy ?? 0)),
    hygiene: clamp(n.hygiene + (gains.hygiene ?? 0)),
    fun: clamp(n.fun + (gains.fun ?? 0)),
    social: clamp(n.social + (gains.social ?? 0)),
  };
}

/** Home comfort (sum of the furniture's comfort) lifts mood by at most this much. */
export const MAX_COMFORT_BONUS = 10;

/** 0 … 100. Hunger counts as much as the other needs; comfort adds on top. */
export function moodScore(n: Needs, fullness: number, comfort = 0): number {
  const base = 0.24 * n.energy + 0.2 * fullness + 0.16 * n.hygiene + 0.2 * n.fun + 0.2 * n.social;
  return Math.round(clamp(base + Math.min(MAX_COMFORT_BONUS, Math.max(0, comfort))));
}

export type Mood = 'Inspired' | 'Happy' | 'Fine' | 'Low' | 'Miserable';

export function moodLabel(score: number): Mood {
  if (score >= 85) return 'Inspired';
  if (score >= 65) return 'Happy';
  if (score >= 45) return 'Fine';
  if (score >= 25) return 'Low';
  return 'Miserable';
}

/** A work task's bonus is scaled by how you feel. */
export const MOOD_TASK_MULTIPLIER: Record<Mood, number> = { Inspired: 1.25, Happy: 1.1, Fine: 1, Low: 0.85, Miserable: 0.7 };

/** The lowest need, for a hint like "You need a shower". */
export function lowestNeed(n: Needs): NeedKey {
  return NEED_KEYS.reduce((a, b) => (n[b] < n[a] ? b : a));
}

/** Validates saved needs; anything missing (saves from before needs) starts full. */
export function sanitiseNeeds(data: unknown): Needs {
  const s = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  const v = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? clamp(x) : 100);
  return { energy: v(s.energy), hygiene: v(s.hygiene), fun: v(s.fun), social: v(s.social) };
}
