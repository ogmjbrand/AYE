import { describe, expect, it } from 'vitest';
import { getPlayerHandle, getTrip, placePlayer, setMoveTarget, walkStraight } from './usePlayerController';
import { setActiveLayout } from '../lib/world';
import { INTERIORS, interiorLayout } from '../lib/interiors';
import { standSpotsFor } from '../lib/furniture';

const walk = (seconds: number) => { for (let i = 0; i < seconds * 30; i++) getPlayerHandle().applyMovement(1 / 30); };

describe('stepping into the shower', () => {
  const flat = INTERIORS.flat;
  const shower = flat.furniture.find((f) => f.kind === 'shower')!;
  const [cx, cz] = shower.at;

  it('walks into the shower, stands under it, and steps back out, after which it is solid again', () => {
    setActiveLayout(interiorLayout(flat));
    const [sx, sz] = standSpotsFor(shower)[0];
    placePlayer([sx, 0, sz], 0);
    const p = getPlayerHandle();
    expect(walkStraight(cx, cz, { x: cx, z: cz })).toBe(true);
    walk(4);
    expect(getTrip()?.status).toBe('arrived');
    expect(Math.hypot(p.position.x - cx, p.position.z - cz)).toBeLessThan(0.4);
    walkStraight(sx, sz, { x: cx, z: cz });
    walk(4);
    expect(Math.hypot(p.position.x - sx, p.position.z - sz)).toBeLessThan(0.4);
    // Back out: a plain walk can't go into it any more
    expect(setMoveTarget({ x: cx, z: cz, walk: true })).toBe(false);
  });

  it('keeps the shower solid when you head somewhere else before stepping in', () => {
    setActiveLayout(interiorLayout(flat));
    const [sx, sz] = standSpotsFor(shower)[0];
    placePlayer([sx, 0, sz], 0);
    walkStraight(cx, cz, { x: cx, z: cz });
    setMoveTarget({ x: 0, z: 0, walk: true });
    walk(3);
    const p = getPlayerHandle();
    // Pushing straight at it by hand leaves you outside
    placePlayer([sx, 0, sz], Math.atan2(cx - sx, cz - sz));
    walkStraight(sx, sz, null);
    p.velocity.set((cx - sx) * 3, 0, (cz - sz) * 3);
    walk(0.5);
    const [w, , d] = shower.size;
    expect(Math.abs(p.position.x - cx) >= w / 2 || Math.abs(p.position.z - cz) >= d / 2).toBe(true);
  });
});
