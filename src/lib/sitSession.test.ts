import { describe, expect, it } from 'vitest';
import { LINGER_SECONDS, SitRunner } from './sitSession';
import type { Seat } from './seating';

const seat: Seat = { id: 'bench-0-0', x: 0, z: 0, facing: 0, height: 0.45 };

function setup() {
  const log = { waited: 0, sat: 0, stood: 0 };
  const r = new SitRunner({ onWait: (m) => { log.waited += m; }, sitAt: () => { log.sat++; }, standUp: () => { log.stood++; } });
  return { r, log };
}

describe('a sit, step by step', () => {
  it('sits on arrival, lets exactly the chosen time pass, lingers, then gets up', () => {
    const { r, log } = setup();
    r.begin({ seat, place: 'Park', minutes: 60 }, 7);
    expect(r.step(1)).toBe(0); // still walking: no time passes
    expect(r.tripEnded(7, 'arrived')).toBe(true);
    expect(log.sat).toBe(1);
    while (r.state?.done !== 60) r.step(0.25);
    expect(log.waited).toBe(60);
    expect(log.stood).toBe(0);
    for (let t = 0; t < LINGER_SECONDS + 0.5; t += 0.25) r.step(0.25);
    expect(log.stood).toBe(1);
    expect(r.state).toBeNull();
    expect(r.step(1)).toBe(0);
    expect(log.waited).toBe(60);
  });

  it('getting up early charges only what was sat, and nothing after', () => {
    const { r, log } = setup();
    r.begin({ seat, place: 'Park', minutes: 120 }, 1);
    r.tripEnded(1, 'arrived');
    for (let i = 0; i < 5; i++) r.step(0.25);
    const sat = log.waited;
    expect(sat).toBeGreaterThan(0);
    expect(sat).toBeLessThan(120);
    expect(r.stoodUp()).toBe(true); // a direction key or a click got them up
    for (let i = 0; i < 40; i++) r.step(0.25);
    expect(log.waited).toBe(sat);
  });

  it('Stand up / Cancel works on the way and on the seat', () => {
    const { r, log } = setup();
    r.begin({ seat, place: 'Park', minutes: 30 }, 2);
    r.cancel();
    expect(r.tripEnded(2, 'arrived')).toBe(false); // the walk finishing later doesn't sit you down
    expect(log.sat).toBe(0);
    r.begin({ seat, place: 'Park', minutes: 30 }, 3);
    r.tripEnded(3, 'arrived');
    r.step(0.25);
    r.cancel();
    expect(log.stood).toBe(1);
    const sat = log.waited;
    for (let i = 0; i < 20; i++) r.step(0.25);
    expect(log.waited).toBe(sat);
  });

  it('a stopped or blocked walk sits nobody down and charges nothing', () => {
    for (const status of ['cancelled', 'blocked'] as const) {
      const { r, log } = setup();
      r.begin({ seat, place: 'Park', minutes: 60 }, 4);
      r.tripEnded(4, status);
      for (let i = 0; i < 20; i++) r.step(0.25);
      expect(log).toEqual({ waited: 0, sat: 0, stood: 0 });
    }
  });

  it('choosing again replaces the first sit, so time is never added twice', () => {
    const { r, log } = setup();
    r.begin({ seat, place: 'Park', minutes: 60 }, 5);
    r.begin({ seat, place: 'Park', minutes: 30 }, 6);
    expect(r.tripEnded(5, 'arrived')).toBe(false); // the old walk is ignored
    r.tripEnded(6, 'arrived');
    expect(r.tripEnded(6, 'arrived')).toBe(false); // and an echo of the same arrival too
    for (let i = 0; i < 100; i++) r.step(0.25);
    expect(log.waited).toBe(30);
    expect(log.sat).toBe(1);
  });

  it('a terrace sit with no waiting gets up after its hold, and one without a hold stays put', () => {
    const { r, log } = setup();
    r.begin({ seat, place: 'Lounge', minutes: 0, holdSeconds: 6 }, 8);
    r.tripEnded(8, 'arrived');
    for (let t = 0; t < 5.5; t += 0.25) r.step(0.25);
    expect(log.stood).toBe(0);
    for (let t = 0; t < 1; t += 0.25) r.step(0.25);
    expect(log.stood).toBe(1);
    expect(log.waited).toBe(0);

    const free = setup();
    free.r.begin({ seat, place: 'Lounge', minutes: 0 }, 9);
    free.r.tripEnded(9, 'arrived');
    for (let i = 0; i < 400; i++) free.r.step(0.25);
    expect(free.log.stood).toBe(0);
    expect(free.r.state?.phase).toBe('seated');
  });
});
