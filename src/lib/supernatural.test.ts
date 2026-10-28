import { describe, expect, it } from 'vitest';
import { createGameState, createTime, type GameState } from './gameState';
import { lifeReducer, type AnyAction } from './life';
import { DRAIN_PER_MINUTE, HEALING_MINUTES, TRANSFORM_COST, UNLOCK_BALANCE, canTransform, emptySupernatural, sanitiseSupernatural } from './supernatural';

const act = (s: GameState, a: AnyAction) => lifeReducer(s, a, 'engineer', 'ordinary');
const tick = (s: GameState, n = 1) => { for (let i = 0; i < n; i++) s = act(s, { type: 'tick', atWorkplace: false }); return s; };
const rich = () => act(createGameState(UNLOCK_BALANCE, createTime(10, 0)), { type: 'ascendUnlock' });

describe('Divine Evolution: the unlock', () => {
  it('stays locked below a billion GHAI and says what it needs', () => {
    const s = act(createGameState(UNLOCK_BALANCE - 1, createTime(10, 0)), { type: 'ascendUnlock' });
    expect(s.supernatural.unlockedAt).toBeNull();
    expect(canTransform(s.supernatural)).toEqual({ ok: false, reason: 'Unlocks at 1,000,000,000 GHAI.' });
    expect(act(s, { type: 'transform' }).supernatural.form).toBe('human');
  });

  it('unlocks at a billion without taking any of it, and stays unlocked after spending', () => {
    const s = rich();
    expect(s.supernatural.unlockedAt).not.toBeNull();
    // Nothing deducted (achievements for holding the money may even pay out)
    expect(s.balance).toBeGreaterThanOrEqual(UNLOCK_BALANCE);
    const spent = act(s, { type: 'purchase', price: 500_000_000 });
    expect(spent.balance).toBeLessThan(UNLOCK_BALANCE);
    expect(act(spent, { type: 'transform' }).supernatural.form).toBe('transformed');
  });
});

describe('Divine Evolution: forms and energy', () => {
  it('transforms for its cost, drains while transformed, and returns to human form at any time', () => {
    let s = act(rich(), { type: 'transform' });
    expect(s.supernatural.form).toBe('transformed');
    expect(s.supernatural.energy).toBe(100 - TRANSFORM_COST);
    s = tick(s, 10);
    expect(s.supernatural.energy).toBeCloseTo(100 - TRANSFORM_COST - 10 * DRAIN_PER_MINUTE);
    expect(s.supernatural.exhaustion).toBeGreaterThan(0);
    s = act(s, { type: 'returnToHuman' });
    expect(s.supernatural.form).toBe('human');
  });

  it('can’t hold the form with no energy left, and recovers slowly in human form', () => {
    let s = act(rich(), { type: 'transform' });
    let minutes = 0;
    while (s.supernatural.form === 'transformed' && minutes < 500) { s = tick(s); minutes++; }
    expect(minutes).toBe((100 - TRANSFORM_COST) / DRAIN_PER_MINUTE);
    expect(s.supernatural.energy).toBe(0);
    expect(s.supernatural.form).toBe('human');
    expect(act(s, { type: 'transform' }).supernatural.form).toBe('human');
    expect(tick(s, 100).supernatural.energy).toBeGreaterThanOrEqual(TRANSFORM_COST);
  });

  it('a night at home restores everything; the healing chamber does it in half an hour, only at home', () => {
    const drained = tick(act(rich(), { type: 'transform' }), 120);
    const notHome = act(drained, { type: 'sanctuaryHeal', atHome: false });
    expect(notHome.supernatural.energy).toBe(drained.supernatural.energy);
    const healed = act(drained, { type: 'sanctuaryHeal', atHome: true });
    expect(healed.supernatural.energy).toBe(100);
    expect(healed.supernatural.exhaustion).toBe(0);
    expect(healed.supernatural.healings).toBe(1);
    expect(healed.time.totalMinutes - drained.time.totalMinutes).toBe(HEALING_MINUTES);
    const slept = act(drained, { type: 'sleep', atHome: true });
    expect(slept.supernatural.energy).toBe(100);
    expect(slept.supernatural.form).toBe('human');
  });

  it('saves safely: a locked save can’t claim to be transformed, and values stay in range', () => {
    expect(sanitiseSupernatural({ form: 'transformed', energy: 9999 })).toEqual({ ...emptySupernatural() });
    expect(sanitiseSupernatural({ unlockedAt: 5, form: 'transformed', energy: -4, exhaustion: 400 })).toMatchObject({ form: 'transformed', energy: 0, exhaustion: 100 });
  });
});
