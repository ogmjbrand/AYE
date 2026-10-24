import { describe, expect, it } from 'vitest';
import type { Career } from '../components/CharacterCreation';
import { createGameState, createTime, HOURLY_LIVING_COST, type GameState } from './gameState';
import { ACHIEVEMENTS, DAILY_MISSIONS, DREAMS, eventToday, lifeReducer, recogniseExisting, suggestions, type AnyAction } from './life';
import { residentsIn } from './people';
import { itemById } from './fashion';
import { emptyLife, modifiers, sanitiseLife, skillLevel, xpForLevel } from './lifeState';
import { cityDirectory } from './cityDirectory';
import { districtById } from './geography';
import { allHomes, homeById, moveInFee } from './homes';
import { interiorFor } from './interiors';
import { loadProgress, saveProgress } from './save';

const act = (s: GameState, a: AnyAction, career: Career = 'engineer') => lifeReducer(s, a, career, 'ordinary');
const tick = (s: GameState, n = 1, atWorkplace = false) => { for (let i = 0; i < n; i++) s = act(s, { type: 'tick', atWorkplace }); return s; };
const lagos = allHomes().filter((h) => h.district === 'lagos.marina').sort((a, b) => a.rentPerNight - b.rentPerNight);
const housed = (balance = 20_000) => act(act(createGameState(balance + moveInFee(lagos[1]), createTime(8, 0)), { type: 'tick', atWorkplace: false }), { type: 'moveIn', homeId: lagos[1].id });
const withMission = (s: GameState, template: string): GameState => {
  const t = DAILY_MISSIONS.find((m) => m.id === template)!;
  return { ...s, life: { ...s.life, daily: [{ id: `${template}@x`, template, progress: 0, target: t.target, reward: t.reward, done: false }] } };
};
const builtin = (s: GameState, kind: string) => interiorFor(homeById(s.home)!).furniture.findIndex((f) => f.kind === kind);

describe('missions', () => {
  it('are dealt on the first minute of play, the same ones after a reload', () => {
    const a = tick(createGameState(5000, createTime(8, 0)));
    const b = tick(createGameState(5000, createTime(8, 0)));
    expect(a.life.daily).toHaveLength(3);
    expect(a.life.weekly).toHaveLength(2);
    expect(a.life.daily.map((m) => m.id)).toEqual(b.life.daily.map((m) => m.id));
  });

  it('only offer what you can do (no cooking missions without a home)', () => {
    for (let day = 0; day < 30; day++) {
      const s = tick(createGameState(5000, createTime(8, 0, 0)), 1);
      const later = tick({ ...s, time: { ...s.time, totalMinutes: s.time.totalMinutes + day * 1440 } }, 1);
      expect(later.life.daily.some((m) => m.template === 'd-cook' || m.template === 'd-wash')).toBe(false);
    }
  });

  it('progress only through real play, and pay exactly once', () => {
    let s = withMission(housed(), 'd-cook');
    const counter = builtin(s, 'counter');
    expect(counter).toBeGreaterThanOrEqual(0);
    const plain = act({ ...s, life: { ...s.life, daily: [] } }, { type: 'useFurniture', target: { builtin: counter }, near: true });
    s = act(s, { type: 'useFurniture', target: { builtin: counter }, near: true });
    expect(s.life.daily[0].done).toBe(true);
    // Exactly the reward on top of the same meal without the mission; the money history says why
    expect(s.balance - plain.balance).toBe(50);
    expect(s.life.ledger.some((e) => e.label === 'Mission: Cook a meal at home' && e.amount === 50)).toBe(true);
    const again = act(s, { type: 'useFurniture', target: { builtin: counter }, near: true });
    expect(again.life.stats.missionsDone).toBe(1);
    expect(again.life.ledger.filter((e) => e.label.startsWith('Mission:'))).toHaveLength(1);
    // A refused action moves nothing
    const refused = act(withMission(housed(), 'd-cook'), { type: 'useFurniture', target: { builtin: counter }, near: false });
    expect(refused.life.daily[0].progress).toBe(0);
  });

  it('a new day brings new missions', () => {
    const s = tick(createGameState(5000, createTime(23, 58)), 1);
    const next = tick(s, 3);
    expect(next.life.day).toBe(s.life.day + 1);
    expect(next.life.daily.every((m) => !s.life.daily.some((o) => o.id === m.id))).toBe(true);
  });
});

describe('skills and perks', () => {
  it('a run builds fitness; reaching level 3 unlocks a perk that really slows energy loss', () => {
    let s = tick(createGameState(5000, createTime(8, 0)));
    s = act(s, { type: 'exercise', minutes: 30, atPark: true });
    expect(s.life.skills.fitness).toBe(20);
    expect(act(s, { type: 'exercise', minutes: 30, atPark: false })).toBe(s);
    const fit = { ...s, life: { ...s.life, skills: { ...s.life.skills, fitness: xpForLevel(3) } } };
    expect(modifiers(fit.life).energyDecay).toBeLessThan(1);
    const a = tick({ ...s, needs: { ...s.needs, energy: 80 } }, 60);
    const b = tick({ ...fit, needs: { ...fit.needs, energy: 80 } }, 60);
    expect(b.needs.energy).toBeGreaterThan(a.needs.energy);
  });

  it('work builds your career skill', () => {
    const s = tick(createGameState(5000, createTime(9, 0)), 60, true);
    expect(s.life.skills.technology).toBeCloseTo(15);
    expect(skillLevel(xpForLevel(4))).toBe(4);
  });

  it('traits are real: a thrifty person pays less to live', () => {
    const base = createGameState(5000, createTime(10, 0));
    const thrifty = act(base, { type: 'setProfile', bio: 'Saving up', traits: ['thrifty', 'active', 'foodie'] });
    expect(thrifty.life.profile.traits).toEqual(['thrifty', 'active']);
    const spentPlain = 5000 - tick(base, 60).balance;
    const spentThrifty = 5000 - tick(thrifty, 60).balance;
    expect(spentPlain).toBe(HOURLY_LIVING_COST.ordinary);
    expect(spentThrifty).toBeLessThan(spentPlain);
  });
});

describe('discovering places', () => {
  it('counts real places once; made-up ids do nothing', () => {
    const s = tick(createGameState(5000, createTime(8, 0)));
    const place = cityDirectory(districtById(s.districtId), 'engineer', null).find((d) => d.position && d.status !== 'planned')!;
    expect(act(s, { type: 'visit', placeId: 'lagos.marina.gold-vault' })).toBe(s);
    const once = act(s, { type: 'visit', placeId: place.id });
    expect(once.life.visited).toEqual([place.id]);
    expect(act(once, { type: 'visit', placeId: place.id })).toBe(once);
  });
});

describe('wishes', () => {
  it('come from your situation and can be dismissed', () => {
    const s = tick(createGameState(5000, createTime(8, 0)));
    expect(s.life.wishes.length).toBe(1);
    expect(s.life.wishes[0].template).toBe('wish-home');
    const gone = act(s, { type: 'dismissWish', id: s.life.wishes[0].id });
    expect(gone.life.wishes).toHaveLength(0);
  });

  it('a home wish is fulfilled by renting one', () => {
    const s = tick(createGameState(50_000, createTime(8, 0)));
    const after = act(s, { type: 'moveIn', homeId: lagos[0].id });
    expect(after.life.wishes.some((w) => w.template === 'wish-home')).toBe(false);
    expect(after.life.stats.wishesDone).toBe(1);
    expect(after.life.celebrations.some((c) => c.kind === 'Wish fulfilled')).toBe(true);
  });
});

describe('dreams and achievements', () => {
  it('milestones pay once, in order; the dream can only change after a week', () => {
    let s = act(tick(createGameState(50_000, createTime(8, 0))), { type: 'setDream', dream: 'luxury' });
    expect(s.life.dream?.id).toBe('luxury');
    s = act(s, { type: 'moveIn', homeId: lagos[0].id });
    expect(s.life.dreamStages).toEqual(['luxury:0']);
    expect(s.life.ledger.some((e) => e.label === 'Dream: Rent a home' && e.amount === DREAMS[1].stages[0].reward)).toBe(true);
    expect(act(s, { type: 'setDream', dream: 'chef' })).toBe(s);
    const weekLater = { ...s, time: { ...s.time, totalMinutes: s.time.totalMinutes + 7 * 1440 } };
    expect(act(weekLater, { type: 'setDream', dream: 'chef' }).life.dream?.id).toBe('chef');
  });

  it('are awarded once, and old saves are recognised without paying again', () => {
    let s = tick(createGameState(50_000, createTime(8, 0)));
    s = act(s, { type: 'moveIn', homeId: lagos[0].id });
    const homeAch = s.life.achievements.filter((x) => x.id === 'home');
    expect(homeAch).toHaveLength(1);
    s = tick(s, 5);
    expect(s.life.achievements.filter((x) => x.id === 'home')).toHaveLength(1);
    const old = { ...createGameState(50_000, createTime(8, 0)), home: lagos[0].id, life: emptyLife() };
    const recognised = recogniseExisting(old, 'engineer');
    expect(recognised.balance).toBe(old.balance);
    expect(recognised.life.achievements.map((x) => x.id)).toEqual(expect.arrayContaining(['home', 'saver-10k']));
    expect(ACHIEVEMENTS.length).toBeGreaterThan(15);
  });
});

describe('money history and suggestions', () => {
  it('wages and living costs merge into one line per day', () => {
    const s = tick(createGameState(5000, createTime(9, 0)), 180, true);
    const wages = s.life.ledger.filter((e) => e.label === 'Wages');
    expect(wages).toHaveLength(1);
    expect(wages[0].amount).toBe(75 * 3);
  });

  it('suggest the most pressing thing first', () => {
    const s = { ...createGameState(5000, createTime(10, 0)), fullness: 10 };
    expect(suggestions(s, 'engineer')[0]).toMatchObject({ text: 'Eat something', urgent: true });
  });
});

describe('saving', () => {
  it('round-trips the whole life; saves from before Life OS load with a fresh one', () => {
    const storage = new Map<string, string>();
    const st = { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v), removeItem: (k: string) => void storage.delete(k) } as unknown as Storage;
    const character = { id: 'c1', career: 'engineer', balance: 5000 } as never;
    let s = tick(createGameState(5000, createTime(8, 0)));
    s = act(s, { type: 'setProfile', bio: 'Lagos born', traits: ['creative'] });
    saveProgress('c1', s, st);
    const back = loadProgress(character, st);
    expect(back.life.profile).toEqual({ bio: 'Lagos born', traits: ['creative'] });
    expect(back.life.daily).toEqual(s.life.daily);
    expect(sanitiseLife(undefined)).toEqual(emptyLife());
    expect(sanitiseLife({ skills: { cooking: 'lots' }, dream: { id: 'emperor' } }).dream).toBeNull();
  });
});

describe('people, events and collectibles', () => {
  it('meeting someone new counts once, and every visit goes into the history', () => {
    let s = tick(createGameState(5000, createTime(10, 0)));
    s = { ...s, life: { ...s.life, daily: [{ id: 'd-meet@x', template: 'd-meet', progress: 0, target: 1, reward: 50, done: false }] } };
    const who = residentsIn(s.districtId)[0];
    s = act(s, { type: 'socialise', residentId: who.id, activity: 'chat' });
    expect(s.life.stats.met).toBe(1);
    expect(s.life.daily[0].done).toBe(true);
    expect(s.life.history.at(-1)).toMatchObject({ who: who.id, what: 'Chat' });
    // The next day, the same person isn't new any more
    const later = tick({ ...s, time: createTime(10, 0, 3) });
    const again = act({ ...later, time: { ...later.time, totalMinutes: later.time.totalMinutes + 1440 } }, { type: 'socialise', residentId: who.id, activity: 'chat' });
    expect(again.life.stats.met).toBe(1);
  });

  it('city events are stable for a day and give their bonus only while on', () => {
    const day = 4;
    const ev = (() => { for (let d = 0; d < 50; d++) { const e = eventToday('lagos.marina', d); if (e?.id === 'run-club') return d; } return -1; })();
    expect(eventToday('lagos.marina', day)).toEqual(eventToday('lagos.marina', day));
    expect(ev).toBeGreaterThanOrEqual(0);
    const at = (hour: number) => tick({ ...createGameState(5000), time: { ...createTime(hour, 0), totalMinutes: ev * 1440 + hour * 60 } });
    const during = act(at(7), { type: 'exercise', minutes: 30, atPark: true });
    const after = act(at(11), { type: 'exercise', minutes: 30, atPark: true });
    expect(during.life.skills.fitness).toBe(40);
    expect(after.life.skills.fitness).toBe(20);
    expect(during.life.stats.events).toBe(1);
  });

  it('some achievements unlock collectible clothes that no shop sells', () => {
    for (const a of ACHIEVEMENTS.filter((x) => x.unlock)) {
      const item = itemById(a.unlock)!;
      expect(item, a.id).toBeDefined();
      expect(item.stockedIn).toEqual([]);
    }
  });
});
