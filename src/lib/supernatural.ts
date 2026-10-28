/**
 * Divine Evolution, stage one: the foundation of AYE's supernatural life.
 *
 * Rules (tunable):
 *   - The mode unlocks once your GHAI balance reaches UNLOCK_BALANCE (one
 *     billion). Nothing is deducted, and access stays after you spend.
 *     The check runs on this device until the server exists; the panel says so.
 *   - Once unlocked you can transform whenever you like and return to human
 *     form whenever you like: in or out of a fight, with no battle needed
 *     first. Your appearance, clothes and hair are untouched by it.
 *   - Supernatural energy (0 … max) pays for staying transformed: it drains
 *     each minute you're transformed and slowly recovers in human form. At
 *     zero you can't hold the form and return to human form by yourself.
 *   - Exhaustion (0 … 100) builds while transformed and fades in human form.
 *   - Recovery is gameplay, never money: a night's sleep at home restores
 *     energy and clears exhaustion, and the Spiritual Healing Chamber in your
 *     home does it in a short session.
 *
 * Later stages (powers, paths, the sanctuary's other rooms) build on this
 * state; see docs/DIVINE_EVOLUTION.md.
 */
export const UNLOCK_BALANCE = 1_000_000_000;
export const BASE_MAX_ENERGY = 100;
/** Energy to take on your supernatural form. */
export const TRANSFORM_COST = 10;
/** Energy used per game minute while transformed, and recovered per minute in human form. */
export const DRAIN_PER_MINUTE = 0.5;
export const RECOVER_PER_MINUTE = 0.1;
export const EXHAUSTION_PER_MINUTE = 0.25;
export const EXHAUSTION_RECOVERY_PER_MINUTE = 0.2;
/** A healing-chamber session: how long it takes. */
export const HEALING_MINUTES = 30;

export type Form = 'human' | 'transformed';

export interface Supernatural {
  /** Game minute the mode was unlocked, or null while locked. */
  unlockedAt: number | null;
  form: Form;
  energy: number;
  maxEnergy: number;
  exhaustion: number;
  /** Times you've transformed (for progression and achievements). */
  transformations: number;
  /** Healing-chamber sessions completed. */
  healings: number;
}

export function emptySupernatural(): Supernatural {
  return { unlockedAt: null, form: 'human', energy: BASE_MAX_ENERGY, maxEnergy: BASE_MAX_ENERGY, exhaustion: 0, transformations: 0, healings: 0 };
}

export const isUnlocked = (s: Supernatural) => s.unlockedAt !== null;
export const canUnlock = (s: Supernatural, balance: number) => !isUnlocked(s) && balance >= UNLOCK_BALANCE;

export function unlock(s: Supernatural, balance: number, minute: number): Supernatural {
  return canUnlock(s, balance) ? { ...s, unlockedAt: minute } : s;
}

export type TransformCheck = { ok: true } | { ok: false; reason: string };

export function canTransform(s: Supernatural): TransformCheck {
  if (!isUnlocked(s)) return { ok: false, reason: `Unlocks at ${UNLOCK_BALANCE.toLocaleString()} GHAI.` };
  if (s.form === 'transformed') return { ok: false, reason: 'Already transformed.' };
  if (s.energy < TRANSFORM_COST) return { ok: false, reason: `Needs ${TRANSFORM_COST} energy. Rest or heal first.` };
  return { ok: true };
}

export function transform(s: Supernatural): Supernatural {
  if (!canTransform(s).ok) return s;
  return { ...s, form: 'transformed', energy: s.energy - TRANSFORM_COST, transformations: s.transformations + 1 };
}

/** Back to human form: always allowed, from any state. */
export function returnToHuman(s: Supernatural): Supernatural {
  return s.form === 'human' ? s : { ...s, form: 'human' };
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

/** One game minute passing. */
export function passMinute(s: Supernatural): Supernatural {
  if (!isUnlocked(s)) return s;
  if (s.form === 'transformed') {
    const energy = round2(clamp(s.energy - DRAIN_PER_MINUTE, 0, s.maxEnergy));
    const exhaustion = round2(clamp(s.exhaustion + EXHAUSTION_PER_MINUTE, 0, 100));
    // Out of energy: the form can't be held, so you're human again
    return { ...s, energy, exhaustion, form: energy <= 0 ? 'human' : 'transformed' };
  }
  if (s.energy >= s.maxEnergy && s.exhaustion <= 0) return s;
  return {
    ...s,
    energy: round2(clamp(s.energy + RECOVER_PER_MINUTE, 0, s.maxEnergy)),
    exhaustion: round2(clamp(s.exhaustion - EXHAUSTION_RECOVERY_PER_MINUTE, 0, 100)),
  };
}

/** A night's sleep at home: energy full, exhaustion gone, back in human form. Elsewhere, half the energy back. */
export function sleepRecovery(s: Supernatural, atHome: boolean): Supernatural {
  if (!isUnlocked(s)) return s;
  return atHome
    ? { ...s, form: 'human', energy: s.maxEnergy, exhaustion: 0 }
    : { ...s, form: 'human', energy: round2(Math.min(s.maxEnergy, s.energy + s.maxEnergy / 2)), exhaustion: round2(s.exhaustion / 2) };
}

export type HealCheck = { ok: true } | { ok: false; reason: string };

export function canHeal(s: Supernatural, atHome: boolean): HealCheck {
  if (!isUnlocked(s)) return { ok: false, reason: 'The sanctuary opens with Divine Evolution.' };
  if (!atHome) return { ok: false, reason: 'The healing chamber is in your home.' };
  if (s.energy >= s.maxEnergy && s.exhaustion <= 0) return { ok: false, reason: 'You’re fully recovered.' };
  return { ok: true };
}

/** A healing-chamber session's result (the time it takes is passed by the caller). */
export function heal(s: Supernatural): Supernatural {
  return { ...s, form: 'human', energy: s.maxEnergy, exhaustion: 0, healings: s.healings + 1 };
}

export function sanitiseSupernatural(data: unknown): Supernatural {
  const d = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  const fresh = emptySupernatural();
  const num = (v: unknown, lo: number, hi: number, dflt: number) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : dflt);
  const unlockedAt = typeof d.unlockedAt === 'number' && Number.isInteger(d.unlockedAt) && d.unlockedAt >= 0 ? d.unlockedAt : null;
  const maxEnergy = num(d.maxEnergy, BASE_MAX_ENERGY, 1000, BASE_MAX_ENERGY);
  return {
    unlockedAt,
    form: unlockedAt !== null && d.form === 'transformed' ? 'transformed' : 'human',
    energy: num(d.energy, 0, maxEnergy, fresh.energy),
    maxEnergy,
    exhaustion: num(d.exhaustion, 0, 100, 0),
    transformations: Math.floor(num(d.transformations, 0, 1e9, 0)),
    healings: Math.floor(num(d.healings, 0, 1e9, 0)),
  };
}
