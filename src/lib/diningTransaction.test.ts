import { describe, expect, it } from 'vitest';
import {
  cancelDiningTransaction,
  createDiningTransaction,
  settleDiningTransaction,
  transitionDiningTransaction,
} from './diningTransaction';

describe('restaurant dining transactions', () => {
  it('only allows service and eating once and charges once at settlement', () => {
    const ordered = createDiningTransaction('order-1', 'jollof-rice');
    const served = transitionDiningTransaction(ordered, 'served')!;
    const eating = transitionDiningTransaction(served, 'eating')!;

    expect(transitionDiningTransaction(ordered, 'eating')).toBeNull();
    expect(transitionDiningTransaction(served, 'served')).toBeNull();
    expect(transitionDiningTransaction(eating, 'eating')).toBeNull();

    const settled = settleDiningTransaction(eating, 32);
    expect(settled).toEqual({
      transaction: { ...eating, status: 'paid' },
      payment: 32,
    });
    expect(settleDiningTransaction(settled.transaction, 32)).toEqual({
      transaction: settled.transaction,
      payment: 0,
    });
  });

  it('cancels an interrupted meal without taking payment', () => {
    const eating = transitionDiningTransaction(
      transitionDiningTransaction(createDiningTransaction('order-2', 'egusi'), 'served')!,
      'eating',
    )!;
    const cancelled = cancelDiningTransaction(eating)!;

    expect(cancelled.status).toBe('cancelled');
    expect(settleDiningTransaction(cancelled, 45)).toEqual({ transaction: cancelled, payment: 0 });
    expect(cancelDiningTransaction(cancelled)).toBe(cancelled);
  });

  it('keeps a served meal available when an eating attempt cannot be paid', () => {
    const eating = transitionDiningTransaction(
      transitionDiningTransaction(createDiningTransaction('order-3', 'suya'), 'served')!,
      'eating',
    )!;
    const paused = transitionDiningTransaction(eating, 'served')!;

    expect(settleDiningTransaction(eating, 0)).toEqual({ transaction: eating, payment: 0 });
    expect(paused.status).toBe('served');
    expect(transitionDiningTransaction(paused, 'eating')?.status).toBe('eating');
  });
});
