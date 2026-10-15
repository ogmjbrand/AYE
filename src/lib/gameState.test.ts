import { describe, expect, it } from 'vitest';
import type { Career, Lifestyle } from '../components/CharacterCreation';
import {
  HOURLY_LIVING_COST,
  HOURLY_WAGE,
  createGameState,
  createTime,
  gameReducer,
  type GameState,
} from './gameState';

const run = (state: GameState, minutes: number, career: Career = 'doctor', lifestyle: Lifestyle = 'ordinary') => {
  for (let i = 0; i < minutes; i++) state = gameReducer(state, { type: 'tick' }, career, lifestyle);
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
    expect(s.today).toEqual({ income: HOURLY_WAGE.doctor, expenses: HOURLY_LIVING_COST.ordinary });
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

describe('rest', () => {
  it('sleeps to the next 07:00, settles every hour and reports the day', () => {
    let s = run(createGameState(5000, createTime(9, 0, 2)), 8 * 60); // work 09:00-17:00
    s = gameReducer(s, { type: 'sleep' }, 'doctor', 'ordinary');
    expect(s.time).toMatchObject({ hour: 7, minute: 0, dayOfWeek: 3 });
    expect(s.summary).toEqual({
      income: 8 * HOURLY_WAGE.doctor,
      expenses: 22 * HOURLY_LIVING_COST.ordinary, // 09:00 -> 07:00 next day
      netChange: 8 * HOURLY_WAGE.doctor - 22 * HOURLY_LIVING_COST.ordinary,
      wakeDayOfWeek: 3,
    });
    expect(s.today).toEqual({ income: 0, expenses: 0 });
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
