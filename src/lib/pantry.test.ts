import { describe, expect, it } from 'vitest';
import { createGameState, createTime, gameReducer } from './gameState';
import { MAX_OF_ONE, sanitisePantry } from './pantry';
import { dishById } from './food';

const act = (s: ReturnType<typeof createGameState>, a: Parameters<typeof gameReducer>[1]) => gameReducer(s, a, 'engineer', 'ordinary');

describe('take-away food', () => {
  it('charges once and puts exactly one dish in the pantry', () => {
    const suya = dishById('suya')!;
    const s0 = { ...createGameState(100, createTime(2, 13, 0)), fullness: 30 };
    const s1 = act(s0, { type: 'buyTakeaway', dishId: 'suya' });
    expect(s1.balance).toBe(100 - suya.price);
    expect(s1.pantry).toEqual({ suya: 1 });
    expect(s1.today.expenses).toBe(s0.today.expenses + suya.price);
    // Bought, not eaten: you're no fuller yet
    expect(s1.fullness).toBe(30);
  });

  it('refuses without the money, and takes nothing', () => {
    const s0 = createGameState(5, createTime(2, 13, 0));
    const s1 = act(s0, { type: 'buyTakeaway', dishId: 'suya' });
    expect(s1).toBe(s0);
    expect(act(s0, { type: 'buyTakeaway', dishId: 'not-a-dish' })).toBe(s0);
  });

  it('eats from the pantry for free, and only what is there', () => {
    const suya = dishById('suya')!;
    let s = { ...createGameState(100, createTime(2, 13, 0)), fullness: 30 };
    s = act(s, { type: 'buyTakeaway', dishId: 'suya' });
    const paid = s.balance;
    s = act(s, { type: 'eatFromPantry', dishId: 'suya' });
    expect(s.balance).toBe(paid);
    expect(s.fullness).toBe(30 + suya.fullness);
    expect(s.pantry).toEqual({});
    // Nothing left: eating again changes nothing
    expect(act(s, { type: 'eatFromPantry', dishId: 'suya' })).toBe(s);
  });

  it('stops at a bagful of one dish', () => {
    let s = createGameState(10_000, createTime(2, 13, 0));
    for (let i = 0; i < MAX_OF_ONE + 3; i++) s = act(s, { type: 'buyTakeaway', dishId: 'suya' });
    expect(s.pantry.suya).toBe(MAX_OF_ONE);
    expect(s.balance).toBe(10_000 - MAX_OF_ONE * dishById('suya')!.price);
  });

  it('loads old saves with an empty pantry and drops made-up dishes', () => {
    expect(sanitisePantry(undefined)).toEqual({});
    expect(sanitisePantry({ suya: 2, fake: 3, kilishi: -1, 'roast-corn': 1.5 })).toEqual({ suya: 2 });
  });
});
