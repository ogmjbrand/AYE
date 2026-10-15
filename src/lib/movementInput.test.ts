import { describe, expect, it } from 'vitest';
import { movementIntent, stickFromOffset, STICK_DEAD_ZONE } from './movementInput';

const still = { forward: 0, turn: 0 };

describe('movementIntent', () => {
  it('reads WASD as full-strength input', () => {
    expect(movementIntent({ w: true, a: true }, still)).toEqual({ forward: 1, turn: 1, walk: false });
    expect(movementIntent({ s: true, d: true, shift: true }, still)).toEqual({ forward: -1, turn: -1, walk: true });
  });

  it('lets held keys override the stick', () => {
    expect(movementIntent({ w: true }, { forward: -1, turn: 1 })).toEqual({ forward: 1, turn: 0, walk: false });
  });

  it('passes analog stick values through, outside the dead zone', () => {
    const intent = movementIntent({}, { forward: 1, turn: -1 });
    expect(intent.forward).toBeCloseTo(1);
    expect(intent.turn).toBeCloseTo(-1);
    const half = movementIntent({}, { forward: 0.5, turn: 0 });
    expect(half.forward).toBeGreaterThan(0.3);
    expect(half.forward).toBeLessThan(0.5);
  });

  it('ignores small stick drift', () => {
    expect(movementIntent({}, { forward: STICK_DEAD_ZONE * 0.9, turn: -0.1 })).toEqual({ forward: 0, turn: 0, walk: false });
  });

  it('clamps out-of-range stick values', () => {
    expect(movementIntent({}, { forward: 3, turn: 0 }).forward).toBe(1);
  });
});

describe('stickFromOffset', () => {
  it('maps up to forward and left to a left turn', () => {
    expect(stickFromOffset(0, -40, 40)).toEqual({ forward: 1, turn: -0 });
    expect(stickFromOffset(-40, 0, 40)).toEqual({ forward: -0, turn: 1 });
  });

  it('caps travel at the radius', () => {
    const s = stickFromOffset(0, 400, 40);
    expect(s.forward).toBe(-1);
  });
});
