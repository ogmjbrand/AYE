import { describe, expect, it } from 'vitest';
import { createGameState, createTime, gameReducer } from './gameState';
import { dailyGoals, emptyFlags, formatGameDate, goalDay, parseFlags, updateFlags } from './dailyGoals';

const ledger = { income: 0, expenses: 0, minutesWorked: 0 };

describe('daily goals', () => {
  it('starts with every goal open', () => {
    expect(dailyGoals(emptyFlags(0), ledger, false, false).every((goal) => !goal.done)).toBe(true);
  });

  it('completes goals only from real actions', () => {
    const goals = dailyGoals({ day: 0, outfit: '', dressed: true, downtown: true }, { ...ledger, income: 40, purchases: 1 }, false, false);
    expect(goals.map((goal) => goal.done)).toEqual([true, true, true, true, false]);
  });

  it('counts an outfit change and entering Downtown, and resets on a new day', () => {
    let flags = updateFlags(null, 0, 'a', false);
    expect(flags).toMatchObject({ dressed: false, downtown: false });
    flags = updateFlags(flags, 0, 'a', true);
    expect(flags.downtown).toBe(true);
    flags = updateFlags(flags, 0, 'b', false);
    expect(flags).toMatchObject({ dressed: true, downtown: true });
    expect(updateFlags(flags, 1, 'b', false)).toMatchObject({ day: 1, dressed: false, downtown: false });
  });

  it('ignores malformed stored flags', () => {
    expect(parseFlags('nope')).toBeNull();
    expect(parseFlags(JSON.stringify({ day: 2 }))).toBeNull();
    expect(parseFlags(JSON.stringify({ day: 2, outfit: 'x', dressed: false, downtown: true }))).toMatchObject({ day: 2, downtown: true });
  });

  it('counts a shift as being ready for work and a summary as ending the day', () => {
    const goals = dailyGoals(emptyFlags(0), ledger, true, true);
    expect(goals.find((goal) => goal.id === 'ready')?.done).toBe(true);
    expect(goals.find((goal) => goal.id === 'rest')?.done).toBe(true);
  });

  it('records a fashion purchase in the day ledger', () => {
    const state = createGameState(1000);
    const next = gameReducer(state, { type: 'purchase', price: 50 }, 'none', 'ordinary');
    expect(next.today.purchases).toBe(1);
    expect(dailyGoals(emptyFlags(0), next.today, false, false).find((goal) => goal.id === 'buy')?.done).toBe(true);
  });

  it('rolls the goal day over at the 07:00 wake time', () => {
    expect(goalDay({ totalMinutes: 6 * 60 })).toBe(-1);
    expect(goalDay(createTime(8))).toBe(0);
    expect(goalDay({ totalMinutes: 1440 + 8 * 60 })).toBe(1);
  });

  it('formats the in-game calendar date', () => {
    expect(formatGameDate(createTime(8))).toBe('Wed 14 Oct 2026');
    expect(formatGameDate({ totalMinutes: 1440 * 5 })).toBe('Mon 19 Oct 2026');
  });
});
