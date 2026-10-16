import { describe, expect, it } from 'vitest';
import type { Career, Lifestyle } from '../components/CharacterCreation';
import {
  FULLNESS_LOSS_PER_MINUTE,
  HUNGRY_THRESHOLD,
  HOURLY_LIVING_COST,
  HOURLY_WAGE,
  createGameState,
  createTime,
  gameReducer,
  type GameState,
} from './gameState';

const run = (
  state: GameState,
  minutes: number,
  career: Career = 'doctor',
  lifestyle: Lifestyle = 'ordinary',
  atWorkplace = true,
) => {
  for (let i = 0; i < minutes; i++) state = gameReducer(state, { type: 'tick', atWorkplace }, career, lifestyle);
  return state;
};

describe('clock', () => {
  it('advances one minute per tick and rolls over hours and days', () => {
    let s = createGameState(0, createTime(23, 59, 6));
    s = run(s, 1);
    expect(s.time).toMatchObject({ hour: 0, minute: 0, dayOfWeek: 0, period: 'night' });
  });
});

describe('economy', () => {
  it('pays the hourly wage during working hours and charges living costs', () => {
    const s = run(createGameState(5000, createTime(9, 0)), 60);
    expect(s.balance).toBe(5000 + HOURLY_WAGE.doctor - HOURLY_LIVING_COST.ordinary);
    expect(s.today).toEqual({ income: HOURLY_WAGE.doctor, expenses: HOURLY_LIVING_COST.ordinary, minutesWorked: 60 });
  });

  it('pays no wage outside working hours', () => {
    const s = run(createGameState(5000, createTime(20, 0)), 60);
    expect(s.balance).toBe(5000 - HOURLY_LIVING_COST.ordinary);
    expect(s.today.income).toBe(0);
  });

  it('only settles when an hour ends', () => {
    const s = run(createGameState(5000, createTime(9, 0)), 59);
    expect(s.balance).toBe(5000);
  });

  it('never lets the balance go negative and records only what was paid', () => {
    const s = run(createGameState(5, createTime(20, 0)), 60, 'doctor', 'luxury');
    expect(s.balance).toBe(0);
    expect(s.today.expenses).toBe(5);
  });

  it('a full working day for an ordinary-life doctor nets money', () => {
    const s = run(createGameState(5000, createTime(7, 0)), 24 * 60);
    expect(s.balance).toBe(5000 + 8 * HOURLY_WAGE.doctor - 24 * HOURLY_LIVING_COST.ordinary);
  });
});

describe('work shifts', () => {
  it('pays nothing when away from the workplace during working hours', () => {
    const s = run(createGameState(5000, createTime(9, 0)), 60, 'doctor', 'ordinary', false);
    expect(s.today).toEqual({ income: 0, expenses: HOURLY_LIVING_COST.ordinary, minutesWorked: 0 });
  });

  it('pays per minute worked: arriving 15 minutes late earns 45 minutes', () => {
    let s = run(createGameState(5000, createTime(9, 0)), 15, 'doctor', 'ordinary', false);
    s = run(s, 45, 'doctor', 'ordinary', true);
    expect(s.today.minutesWorked).toBe(45);
    expect(s.today.income).toBe(Math.round((HOURLY_WAGE.doctor * 45) / 60));
  });

  it('does not count time at the workplace outside working hours', () => {
    const s = run(createGameState(5000, createTime(17, 0)), 60, 'doctor', 'ordinary', true);
    expect(s.today.minutesWorked).toBe(0);
    expect(s.today.income).toBe(0);
  });

  it('players with no career never count as working', () => {
    const s = run(createGameState(5000, createTime(9, 0)), 60, 'none', 'ordinary', true);
    expect(s.today.minutesWorked).toBe(0);
  });
});

describe('rest', () => {
  it('sleeps to the next 07:00, settles every hour and reports the day', () => {
    let s = run(createGameState(5000, createTime(9, 0, 2)), 8 * 60); // work 09:00-17:00
    s = gameReducer(s, { type: 'sleep' }, 'doctor', 'ordinary');
    expect(s.time).toMatchObject({ hour: 7, minute: 0, dayOfWeek: 3 });
    expect(s.summary).toEqual({
      minutesWorked: 8 * 60,
      income: 8 * HOURLY_WAGE.doctor,
      expenses: 22 * HOURLY_LIVING_COST.ordinary, // 09:00 -> 07:00 next day
      netChange: 8 * HOURLY_WAGE.doctor - 22 * HOURLY_LIVING_COST.ordinary,
      wakeDayOfWeek: 3,
    });
    expect(s.today).toEqual({ income: 0, expenses: 0, minutesWorked: 0 });
    expect(s.balance).toBe(5000 + s.summary!.netChange);
  });

  it('resting before dawn wakes the same morning', () => {
    const s = gameReducer(createGameState(100, createTime(2, 30, 4)), { type: 'sleep' }, 'none', 'student');
    expect(s.time).toMatchObject({ hour: 7, minute: 0, dayOfWeek: 4 });
  });

  it('pauses the clock until the summary is dismissed', () => {
    let s = gameReducer(createGameState(100), { type: 'sleep' }, 'none', 'student');
    const paused = run(s, 30);
    expect(paused.time).toEqual(s.time);
    s = gameReducer(s, { type: 'dismissSummary' }, 'none', 'student');
    expect(run(s, 1).time.minute).toBe(1);
  });
});

describe('hunger and eating', () => {
  it('fullness falls over time and empties in 16 game hours', () => {
    const s = run(createGameState(5000, createTime(20, 0)), 60);
    expect(s.fullness).toBeCloseTo(100 - 60 * FULLNESS_LOSS_PER_MINUTE);
    expect(run(createGameState(5000, createTime(20, 0)), 16 * 60 + 5).fullness).toBe(0);
  });

  it('eating costs money, counts as an expense and raises fullness (capped at 100)', () => {
    let s = { ...createGameState(100), fullness: 30 };
    s = gameReducer(s, { type: 'eat', price: 25, fullness: 45 }, 'doctor', 'ordinary');
    expect(s.balance).toBe(75);
    expect(s.fullness).toBe(75);
    expect(s.today.expenses).toBe(25);
    s = gameReducer(s, { type: 'eat', price: 25, fullness: 45 }, 'doctor', 'ordinary');
    expect(s.fullness).toBe(100);
  });

  it("can't buy a meal you can't afford", () => {
    const s = { ...createGameState(10), fullness: 30 };
    expect(gameReducer(s, { type: 'eat', price: 25, fullness: 45 }, 'doctor', 'ordinary')).toBe(s);
  });

  it('very hungry workers are paid half', () => {
    const s = run({ ...createGameState(5000, createTime(9, 0)), fullness: HUNGRY_THRESHOLD - 10 }, 60);
    expect(s.today.minutesWorked).toBe(60);
    expect(s.today.income).toBe(Math.round(HOURLY_WAGE.doctor / 2));
  });
});

describe('shopping', () => {
  it('a purchase costs money and counts as an expense', () => {
    const s = gameReducer(createGameState(1000), { type: 'purchase', price: 450 }, 'doctor', 'ordinary');
    expect(s.balance).toBe(550);
    expect(s.today.expenses).toBe(450);
  });

  it("can't buy what you can't afford, or nothing", () => {
    const s = createGameState(100);
    expect(gameReducer(s, { type: 'purchase', price: 450 }, 'doctor', 'ordinary')).toBe(s);
    expect(gameReducer(s, { type: 'purchase', price: 0 }, 'doctor', 'ordinary')).toBe(s);
  });
});
