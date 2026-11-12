import { describe, expect, it } from 'vitest';
import { CHORES, CLEAN_HOME, DISHES_PER_MEAL, MAX_DISHES, afterCooking, afterDay, choreDue, counterWashes, doChore, dueChores, homeFunFactor, sanitiseChores } from './chores';
import { createGameState, gameReducer, type GameState } from './gameState';
import { allHomes, forSale, homeById, moveInFee } from './homes';
import { findSpot } from './furniture';
import { interiorFor } from './interiors';

const act = (s: GameState, a: Parameters<typeof gameReducer>[1]) => gameReducer(s, a, 'engineer', 'ordinary');
// The cheapest rented home with a kitchen counter
const home = allHomes().filter((h) => !forSale(h) && interiorFor(h).furniture.some((f) => f.kind === 'counter')).sort((a, b) => a.rentPerNight - b.rentPerNight)[0];
const housed = () => act(createGameState(100_000 + moveInFee(homeById(home.id)!)), { type: 'moveIn', homeId: home.id });
const room = interiorFor(home);
const counter = room.furniture.findIndex((f) => f.kind === 'counter');
const withStove = (s: GameState) => {
  const bought = act(s, { type: 'buyFurniture', itemId: 'stove-gas' });
  const uid = bought.furniture.at(-1)!.uid;
  const spot = findSpot(room, [], { id: 'stove-gas', size: [0.6, 0.9, 0.6] } as never)!;
  return act(bought, { type: 'placeFurniture', uid, at: spot.at, rot: spot.rot });
};

describe('chores', () => {
  it('cooking leaves dishes, a night fills the basket and the home gets messier', () => {
    const c = afterCooking(CLEAN_HOME);
    expect(c.dishes).toBe(DISHES_PER_MEAL);
    const d = afterDay(c);
    expect(d.laundry).toBe(1);
    expect(d.mess).toBeGreaterThan(c.mess);
    // Dirty dishes left overnight make it messier than a clean kitchen does
    expect(afterDay(c).mess - c.mess).toBeGreaterThan(afterDay(CLEAN_HOME).mess);
    // Never past the limits
    let full = CLEAN_HOME;
    for (let i = 0; i < 20; i++) full = afterDay(afterCooking(full));
    expect(full.dishes).toBe(MAX_DISHES);
    expect(full.mess).toBe(100);
  });

  it('each chore clears what it should, and is offered only when due', () => {
    const messy = { dishes: 4, laundry: 3, mess: 60 };
    expect(doChore(messy, 'dishes').dishes).toBe(0);
    expect(doChore(messy, 'laundry').laundry).toBe(0);
    expect(doChore(messy, 'tidy').mess).toBe(0);
    expect(dueChores(CLEAN_HOME)).toEqual([]);
    expect(choreDue({ ...CLEAN_HOME, laundry: 1 }, 'laundry')).toBe(false);
    expect(dueChores(messy).map((c) => c.id).sort()).toEqual(['dishes', 'laundry', 'tidy']);
  });

  it('a mess makes relaxing at home less fun, but never stops it', () => {
    expect(homeFunFactor(CLEAN_HOME)).toBe(1);
    expect(homeFunFactor({ ...CLEAN_HOME, mess: 100 })).toBeCloseTo(0.7);
  });

  it('old or broken saves load as a clean home', () => {
    expect(sanitiseChores(undefined)).toEqual(CLEAN_HOME);
    expect(sanitiseChores({ dishes: 'x', laundry: -4, mess: 999 })).toEqual({ dishes: 0, laundry: 0, mess: 100 });
  });

  it('the counter washes up only when there is a stove to cook on', () => {
    expect(counterWashes({ ...CLEAN_HOME, dishes: 2 }, true)).toBe(true);
    expect(counterWashes({ ...CLEAN_HOME, dishes: 2 }, false)).toBe(false);
    expect(counterWashes(CLEAN_HOME, true)).toBe(false);
  });
});

describe('chores in the game', () => {
  it('a new game starts with a clean home', () => {
    expect(createGameState(100).chores).toEqual(CLEAN_HOME);
  });

  it('cooking at home leaves dishes; with only a counter you can always cook again', () => {
    const s = housed();
    const once = act(s, { type: 'useFurniture', target: { builtin: counter }, near: true });
    expect(once.chores.dishes).toBe(DISHES_PER_MEAL);
    const twice = act(once, { type: 'useFurniture', target: { builtin: counter }, near: true });
    expect(twice.balance).toBeLessThan(once.balance); // paid for ingredients again: it cooked, it didn't wash up
    expect(twice.chores.dishes).toBe(2 * DISHES_PER_MEAL);
  });

  it('with a stove, the counter washes up: no charge, 15 minutes, dishes gone', () => {
    const s = withStove(housed());
    expect(s.furniture.at(-1)!.at).not.toBeNull();
    const dirty = { ...s, chores: { ...CLEAN_HOME, dishes: 4, mess: 30 } };
    const washed = act(dirty, { type: 'useFurniture', target: { builtin: counter }, near: true });
    expect(washed.chores.dishes).toBe(0);
    expect(washed.balance).toBe(dirty.balance);
    expect(washed.time.totalMinutes - dirty.time.totalMinutes).toBe(CHORES.dishes.minutes);
  });

  it('chores take their time, cost nothing, and need you at home', () => {
    const s = { ...housed(), chores: { dishes: 2, laundry: 3, mess: 50 } };
    const done = act(s, { type: 'chore', id: 'laundry', near: true });
    expect(done.chores.laundry).toBe(0);
    expect(done.balance).toBe(s.balance);
    expect(done.time.totalMinutes - s.time.totalMinutes).toBe(CHORES.laundry.minutes);
    expect(act(s, { type: 'chore', id: 'tidy', near: false })).toBe(s);
    const homeless = { ...createGameState(100), chores: s.chores };
    expect(act(homeless, { type: 'chore', id: 'tidy', near: true })).toBe(homeless);
  });

  it('sleeping at home adds a day of laundry', () => {
    const s = housed();
    const slept = act(s, { type: 'sleep', atHome: true });
    expect(slept.chores.laundry).toBe(1);
    expect(slept.chores.mess).toBeGreaterThan(0);
  });
});
