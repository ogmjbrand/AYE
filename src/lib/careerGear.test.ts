import { describe, expect, it } from 'vitest';
import type { Career } from '../components/CharacterCreation';
import { createGameState, createTime, type GameState } from './gameState';
import { lifeReducer, type AnyAction } from './life';
import { GEAR, gearById, gearFor, gearPay, repairCost, resaleValue, sanitiseGear } from './careerGear';
import { loadProgress, saveProgress } from './save';

const act = (s: GameState, a: AnyAction, career: Career = 'doctor') => lifeReducer(s, a, career, 'ordinary');
const work = (s: GameState, minutes: number, career: Career = 'doctor') => { for (let i = 0; i < minutes; i++) s = act(s, { type: 'tick', atWorkplace: true }, career); return s; };
const memory = () => {
  const store = new Map<string, string>();
  return { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k), clear: () => store.clear(), key: () => null, length: 0 } as Storage;
};

describe('the catalogue', () => {
  it('gives every career its own gear across slots and tiers', () => {
    for (const c of ['student', 'artist', 'entrepreneur', 'athlete', 'engineer', 'doctor', 'pilot'] as const) {
      const items = gearFor(c);
      expect(items.length).toBeGreaterThanOrEqual(3);
      expect(items.some((x) => x.rank === 0)).toBe(true);
      expect(new Set(items.map((x) => x.slot)).size).toBeGreaterThanOrEqual(2);
    }
    expect(new Set(GEAR.map((x) => x.id)).size).toBe(GEAR.length);
  });
});

describe('the vertical slice: buy, earn with it, wear, repair, sell, save and reload', () => {
  const stetho = gearById('gear-stetho-used')!;

  it('buying takes the price once, records the transaction and equips it', () => {
    const s = createGameState(5000, createTime(9, 0));
    const bought = act(s, { type: 'buyGear', itemId: stetho.id });
    expect(bought.gear).toHaveLength(1);
    expect(bought.gear[0]).toMatchObject({ itemId: stetho.id, condition: 100, equipped: true });
    expect(s.balance - bought.balance).toBeGreaterThanOrEqual(stetho.price);
    expect(bought.life.ledger.some((l) => l.label === `Work gear: ${stetho.name}` && l.amount === -stetho.price)).toBe(true);
    // Not twice
    expect(act(bought, { type: 'buyGear', itemId: stetho.id }).gear).toHaveLength(1);
  });

  it('needs the rank and the money, and the right career', () => {
    const s = createGameState(50_000, createTime(9, 0));
    expect(act(s, { type: 'buyGear', itemId: 'gear-trauma-kit' }).gear).toHaveLength(0);
    expect(act(s, { type: 'buyGear', itemId: 'gear-multimeter' }).gear).toHaveLength(0);
    expect(act(createGameState(100, createTime(9, 0)), { type: 'buyGear', itemId: stetho.id }).gear).toHaveLength(0);
  });

  it('equipped gear raises pay at work, and wears with use', () => {
    const plain = work(createGameState(5000, createTime(9, 0)), 60);
    const kitted = work(act(createGameState(5000 + stetho.price, createTime(9, 0)), { type: 'buyGear', itemId: stetho.id }), 60);
    expect(kitted.today.income).toBeGreaterThan(plain.today.income);
    expect(kitted.gear[0].condition).toBeLessThan(100);
    expect(gearPay(kitted.gear, 'doctor')).toBeCloseTo(1 + stetho.payBonus);
    // Put away, it stops helping
    const stored = act(kitted, { type: 'unequipGear', uid: kitted.gear[0].uid });
    expect(gearPay(stored.gear, 'doctor')).toBe(1);
  });

  it('worn out gear stops helping until repaired; repair and sale prices follow condition', () => {
    const owned = act(createGameState(9000, createTime(9, 0)), { type: 'buyGear', itemId: stetho.id });
    const worn = { ...owned, gear: [{ ...owned.gear[0], condition: 0 }] };
    expect(gearPay(worn.gear, 'doctor')).toBe(1);
    const cost = repairCost(worn.gear[0]);
    expect(cost).toBe(Math.ceil(stetho.price * 0.3));
    const fixed = act(worn, { type: 'repairGear', uid: worn.gear[0].uid });
    expect(fixed.gear[0].condition).toBe(100);
    expect(worn.balance - fixed.balance).toBeGreaterThanOrEqual(cost);
    const value = resaleValue(fixed.gear[0]);
    const sold = act(fixed, { type: 'sellGear', uid: fixed.gear[0].uid });
    expect(sold.gear).toHaveLength(0);
    expect(sold.balance - fixed.balance).toBeGreaterThanOrEqual(value - 1);
  });

  it('survives a save and reload exactly, and an edited save can’t equip two in one slot', () => {
    const storage = memory();
    const s = work(act(createGameState(5000, createTime(9, 0)), { type: 'buyGear', itemId: stetho.id }), 30);
    saveProgress('c1', s, storage);
    const back = loadProgress({ id: 'c1', career: 'doctor', lifestyle: 'ordinary' } as Parameters<typeof loadProgress>[0], storage);
    expect(back.gear).toEqual(s.gear);
    const doubled = sanitiseGear([
      { uid: 'a', itemId: 'gear-stetho-used', condition: 50, equipped: true },
      { uid: 'b', itemId: 'gear-stetho-cardio', condition: 80, equipped: true },
      { uid: 'c', itemId: 'not-real', condition: 80, equipped: true },
    ]);
    expect(doubled.map((o) => o.equipped)).toEqual([true, false]);
  });
});
