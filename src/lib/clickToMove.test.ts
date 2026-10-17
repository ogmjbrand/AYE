import { describe, expect, it } from 'vitest';
import { ARRIVE_RADIUS, isClick, makeTarget, steerTowards } from './clickToMove';

/** Runs the steering like the controller does (same turn rate and speeds), returns where it ends. */
function simulate(target: ReturnType<typeof makeTarget>, heading = 0, seconds = 20) {
  let x = 0, z = 0, h = heading;
  for (let t = 0; t < seconds; t += 1 / 30) {
    const s = steerTowards(x, z, h, target);
    if (s.arrived) return { x, z, arrived: true, t };
    h += 3 * s.turn / 30;
    const speed = (s.walk ? 1.4 : 4.2) * s.forward;
    x += Math.sin(h) * speed / 30;
    z += Math.cos(h) * speed / 30;
  }
  return { x, z, arrived: false, t: seconds };
}

describe('click to move', () => {
  it('tells a click from a camera drag', () => {
    expect(isClick(2, 3, 150)).toBe(true);
    expect(isClick(40, 0, 150)).toBe(false);
    expect(isClick(0, 0, 900)).toBe(false);
  });

  it('jogs to far spots and walks short hops or with Shift', () => {
    expect(makeTarget(0, 0, 10, 0, false).walk).toBe(false);
    expect(makeTarget(0, 0, 1, 1, false).walk).toBe(true);
    expect(makeTarget(0, 0, 10, 0, true).walk).toBe(true);
  });

  it('gets there from any starting direction, including straight behind', () => {
    for (const [tx, tz, h] of [[0, 12, 0], [8, -6, 0], [-5, -5, Math.PI / 2], [0, -10, 0]]) {
      const end = simulate(makeTarget(0, 0, tx, tz, false), h);
      expect(end.arrived, `${tx},${tz}`).toBe(true);
      expect(Math.hypot(end.x - tx, end.z - tz)).toBeLessThan(ARRIVE_RADIUS);
    }
  });

  it('turns on the spot before setting off when the target is behind', () => {
    const s = steerTowards(0, 0, 0, makeTarget(0, 0, 0, -10, false));
    expect(s.forward).toBe(0);
    expect(Math.abs(s.turn)).toBe(1);
  });
});
