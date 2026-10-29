import { describe, expect, it } from 'vitest';
import type { Career } from '../components/CharacterCreation';
import { createGameState, createTime, type GameState } from './gameState';
import { lifeReducer, type AnyAction } from './life';
import {
  CRITICAL, EMERGENCY, MAX_HIT, MEDIC_HEAL, MEDIC_MINUTES, PROTECTION_MINUTES, RECOVERY_MINUTES, SURVIVAL_FLOOR,
  damage, emptyHealth, healthStatus, medicalItem, passHealthMinute, recoveryPlace, sanitiseHealth, type Health,
} from './health';
import { HOSPITAL } from './hospitalSite';
import { loadProgress, saveProgress } from './save';

const act = (s: GameState, a: AnyAction, career: Career = 'engineer') => lifeReducer(s, a, career, 'ordinary');
const minutes = (s: GameState, n: number) => { for (let i = 0; i < n; i++) s = act(s, { type: 'tick', atWorkplace: false }); return s; };
const ordinary = { supernatural: false, hasSanctuary: false };
const at = (value: number): Health => ({ ...emptyHealth(), value });
const memory = () => {
  const store = new Map<string, string>();
  return { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k), clear: () => store.clear(), key: () => null, length: 0 } as Storage;
};
const unlocked = (s: GameState): GameState => ({ ...s, supernatural: { ...s.supernatural, unlockedAt: 0 } });

describe('the survival boundary', () => {
  it('never goes below the floor, whatever the harm', () => {
    for (const start of [100, 50, 11, CRITICAL, 7, 6, EMERGENCY]) {
      for (const hit of [0.01, 1, 5, 20, MAX_HIT, 1000, 1e12]) {
        expect(damage(at(start), hit, 'test', 0, ordinary).value).toBeGreaterThanOrEqual(SURVIVAL_FLOOR);
      }
    }
  });

  it('caps one hit, so no event can skip the critical stage from full health', () => {
    const h = damage(at(100), 1e9, 'a huge hit', 0, ordinary);
    expect(h.value).toBe(100 - MAX_HIT);
    expect(h.recovery).toBeNull();
  });

  it('ignores bad values: negative, zero, NaN and infinite harm', () => {
    for (const bad of [-50, 0, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(damage(at(60), bad, 'cheat', 0, ordinary).value).toBe(60);
    }
  });

  it('at 10% is critical: further harm is halved and the warning status shows', () => {
    const h = at(CRITICAL);
    expect(healthStatus(h)).toBe('critical');
    expect(damage(h, 2, 'graze', 0, ordinary).value).toBe(CRITICAL - 1);
  });

  it('at 5% starts emergency recovery by itself, and is then fully protected', () => {
    const h = damage(at(8), 20, 'a fall', 100, ordinary);
    expect(h.value).toBe(EMERGENCY);
    expect(h.recovery).toMatchObject({ place: 'hospital', reason: 'a fall', startedAt: 100, until: 100 + RECOVERY_MINUTES.hospital });
    expect(damage(h, 30, 'again', 101, ordinary)).toBe(h);
  });

  it('many simultaneous hits still stop at the floor and start one recovery', () => {
    let h = at(40);
    for (let i = 0; i < 50; i++) h = damage(h, MAX_HIT, `hit ${i}`, 10, ordinary);
    expect(h.value).toBe(SURVIVAL_FLOOR);
    expect(h.rescues.hospital).toBe(1);
  });
});

describe('where you recover', () => {
  it('ordinary players go to hospital; Divine Evolution players with a home go to their sanctuary; field medics treat on missions', () => {
    expect(recoveryPlace(ordinary)).toBe('hospital');
    expect(recoveryPlace({ supernatural: true, hasSanctuary: true })).toBe('sanctuary');
    expect(recoveryPlace({ supernatural: false, hasSanctuary: true, fieldMedic: true })).toBe('field');
  });

  it('falls back to hospital when the sanctuary isn’t available', () => {
    expect(recoveryPlace({ supernatural: true, hasSanctuary: false })).toBe('hospital');
  });

  it('restores you steadily and discharges you at full health, then protects you for a while', () => {
    let h = damage(at(6), 10, 'collapse', 0, ordinary);
    const mid = passHealthMinute(h, RECOVERY_MINUTES.hospital / 2, { ...ordinary, starving: true, exhausted: true, resting: false });
    expect(mid.value).toBeGreaterThan(SURVIVAL_FLOOR);
    expect(mid.value).toBeLessThan(100);
    h = passHealthMinute(mid, RECOVERY_MINUTES.hospital, { ...ordinary, starving: true, exhausted: true, resting: false });
    expect(h.recovery).toBeNull();
    expect(h.value).toBe(100);
    expect(damage(h, 30, 'too soon', RECOVERY_MINUTES.hospital + PROTECTION_MINUTES - 1, ordinary)).toBe(h);
  });
});

describe('in the game', () => {
  it('starving long enough ends in hospital, never in death, and costs nothing', () => {
    let s: GameState = { ...createGameState(500, createTime(9, 0)), fullness: 0, districtId: 'plan.avenue' };
    const before = s.balance;
    let lowest = 100;
    for (let i = 0; i < 20 * 60 && !s.health.recovery; i++) {
      s = act(s, { type: 'tick', atWorkplace: false });
      lowest = Math.min(lowest, s.health.value);
    }
    expect(lowest).toBeGreaterThanOrEqual(SURVIVAL_FLOOR);
    expect(s.health.recovery?.place).toBe('hospital');
    expect(s.districtId).toBe(HOSPITAL.districtId);
    expect(s.balance).toBeLessThanOrEqual(before);
    expect(s.life.ledger.some((l) => /hospital|emergency/i.test(l.label))).toBe(false);
  });

  it('a supernatural player with a home recovers in their sanctuary, back in human form, energy restored', () => {
    let s = unlocked({ ...createGameState(500, createTime(9, 0)), home: 'osu-heights-flat', districtId: 'plan.avenue' });
    s = { ...s, supernatural: { ...s.supernatural, form: 'transformed', energy: 3 } };
    s = act(s, { type: 'hurt', amount: 35, reason: 'a fight' });
    s = act(s, { type: 'hurt', amount: 35, reason: 'a fight' });
    s = act(s, { type: 'hurt', amount: 35, reason: 'a fight' });
    expect(s.health.recovery?.place).toBe('sanctuary');
    expect(s.supernatural.form).toBe('human');
    expect(s.districtId).toBe('accra.osu');
    s = act(s, { type: 'restToRecover' });
    expect(s.health.recovery).toBeNull();
    expect(s.health.value).toBe(100);
    expect(s.supernatural.energy).toBe(s.supernatural.maxEnergy);
  });

  it('while recovering you stay put (no trips), and resting through it discharges you', () => {
    let s = act(createGameState(5000, createTime(9, 0)), { type: 'hurt', amount: 35, reason: 'x' });
    s = act(s, { type: 'hurt', amount: 35, reason: 'x' });
    s = act(s, { type: 'hurt', amount: 35, reason: 'x' });
    expect(s.health.recovery).not.toBeNull();
    expect(act(s, { type: 'travel', to: 'accra.osu', mode: 'flight' }).districtId).toBe(s.districtId);
    const done = act({ ...s, fullness: 0 }, { type: 'restToRecover' });
    expect(done.health.recovery).toBeNull();
    // Discharged fed and rested, so you're not sent straight back
    expect(done.fullness).toBeGreaterThanOrEqual(70);
    expect(done.needs.energy).toBeGreaterThanOrEqual(60);
    expect(done.health.value).toBe(100);
    expect(done.time.totalMinutes - s.time.totalMinutes).toBeLessThanOrEqual(RECOVERY_MINUTES.hospital);
  });

  it('an empty kit and no money still get full emergency care', () => {
    let s: GameState = { ...createGameState(0, createTime(9, 0)) };
    for (let i = 0; i < 5; i++) s = act(s, { type: 'hurt', amount: 35, reason: 'x' });
    expect(s.health.recovery).not.toBeNull();
    s = act(s, { type: 'restToRecover' });
    expect(s.health.value).toBe(100);
    expect(s.balance).toBe(0);
  });

  it('buying and using a first-aid kit: priced, recorded, used up, heals its amount', () => {
    const kit = medicalItem('med-first-aid')!;
    let s = act(createGameState(1000, createTime(9, 0)), { type: 'buyMedical', itemId: kit.id });
    expect(s.health.kit[kit.id]).toBe(1);
    expect(s.life.ledger.some((l) => l.label === `Pharmacy: ${kit.name}` && l.amount === -kit.price)).toBe(true);
    s = act(s, { type: 'hurt', amount: 30, reason: 'x' });
    const before = s.health.value;
    s = act(s, { type: 'useMedical', itemId: kit.id });
    expect(s.health.kit[kit.id]).toBeUndefined();
    expect(s.health.value).toBeGreaterThanOrEqual(before + kit.heal);
    // None left: nothing happens
    expect(act(s, { type: 'useMedical', itemId: kit.id }).health.value).toBe(s.health.value);
  });

  it('the restorative is for Divine Evolution players only', () => {
    const s = act(createGameState(5000, createTime(9, 0)), { type: 'buyMedical', itemId: 'med-spirit' });
    expect(s.health.kit['med-spirit']).toBeUndefined();
    expect(act(unlocked(createGameState(5000, createTime(9, 0))), { type: 'buyMedical', itemId: 'med-spirit' }).health.kit['med-spirit']).toBe(1);
  });

  it('a medic comes for free when you’re hurt and treats you on arrival', () => {
    let s = act(createGameState(100, createTime(9, 0)), { type: 'hurt', amount: 35, reason: 'x' });
    s = act(s, { type: 'hurt', amount: 20, reason: 'x' });
    expect(s.health.value).toBe(45);
    s = act(s, { type: 'callMedic' });
    expect(s.health.medicAt).not.toBeNull();
    s = minutes(s, MEDIC_MINUTES);
    expect(s.health.medicAt).toBeNull();
    expect(s.health.value).toBeGreaterThanOrEqual(45 + MEDIC_HEAL);
    expect(s.balance).toBe(100);
  });
});

describe('saves and interruptions', () => {
  it('a recovery interrupted by closing the game carries on after reloading', () => {
    const storage = memory();
    let s = createGameState(100, createTime(9, 0));
    for (let i = 0; i < 4; i++) s = act(s, { type: 'hurt', amount: 35, reason: 'x' });
    saveProgress('c1', s, storage);
    const back = loadProgress({ id: 'c1', career: 'engineer', lifestyle: 'ordinary' } as Parameters<typeof loadProgress>[0], storage);
    expect(back.health.recovery).toEqual(s.health.recovery);
    expect(act(back, { type: 'restToRecover' }).health.value).toBe(100);
  });

  it('a save stuck at the floor with no recovery starts one; edited values are clamped', () => {
    expect(sanitiseHealth({ value: 2 }, 500).recovery?.place).toBe('hospital');
    expect(sanitiseHealth({ value: -100 }, 0).value).toBe(SURVIVAL_FLOOR);
    expect(sanitiseHealth({ value: 9999 }, 0).value).toBe(100);
    expect(sanitiseHealth(undefined, 0).value).toBe(100);
    // A recovery can't be stretched out, and fake items or counts are dropped
    const edited = sanitiseHealth({ value: 5, recovery: { place: 'hospital', from: 5, startedAt: 0, until: 1e9 }, kit: { 'med-first-aid': 99, fake: 3 } }, 10);
    expect(edited.recovery!.until).toBe(RECOVERY_MINUTES.hospital);
    expect(edited.kit).toEqual({ 'med-first-aid': medicalItem('med-first-aid')!.max });
  });
});

describe('the building fire', () => {
  it('rescuing someone from the smoke hurts but never kills, and the rescue is paid', async () => {
    const { districtById } = await import('./geography');
    const { siteFor } = await import('./liveEvents');
    const { seeded } = await import('./world');
    const site = siteFor('building-fire', districtById('lagos.marina'), seeded(3))!;
    expect(site).not.toBeNull();
    let s = createGameState(1000, createTime(10, 0));
    const now = s.time.totalMinutes;
    s = { ...s, districtId: 'lagos.marina', health: { ...s.health, value: 20 }, world: { ...s.world, active: { id: `building-fire@${now}`, kind: 'building-fire', districtId: 'lagos.marina', startedAt: now, endsAt: now + 55, scene: site.scene, responding: true, dismissed: false, done: [], earned: 0, rep: {} } } };
    s = act(s, { type: 'eventAct', objectiveId: 'evacuate', at: site.scene });
    const before = s.balance;
    s = act(s, { type: 'eventAct', objectiveId: 'rescue', at: site.scene });
    expect(s.world.active?.done).toContain('rescue');
    expect(s.balance).toBeGreaterThan(before);
    // 20 health minus 30 of smoke: caught at the floor and taken to hospital, alive
    expect(s.health.value).toBeGreaterThanOrEqual(SURVIVAL_FLOOR);
    expect(s.health.recovery?.place).toBe('hospital');
  });
});
