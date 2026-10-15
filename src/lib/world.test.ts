import { describe, expect, it } from 'vitest';
import { BUILDINGS, PLAYER_RADIUS, WORLD_BOUND, resolveCollisions } from './world';

const box = { position: [0, 2, 0] as const, size: [4, 4, 2] as const, color: '#fff' }; // x -2..2, z -1..1

describe('resolveCollisions', () => {
  it('leaves a free position alone', () => {
    expect(resolveCollisions(5, 5, PLAYER_RADIUS, [box])).toEqual({ x: 5, z: 5 });
  });

  it('pushes the player out of a wall', () => {
    const r = resolveCollisions(2.1, 0, PLAYER_RADIUS, [box]);
    expect(r.x).toBeCloseTo(2 + PLAYER_RADIUS);
    expect(r.z).toBe(0);
  });

  it('exits through the nearest face when the centre is inside', () => {
    const r = resolveCollisions(0.5, 0.9, PLAYER_RADIUS, [box]);
    expect(r).toEqual({ x: 0.5, z: 1 + PLAYER_RADIUS });
  });

  it('keeps the player inside the world', () => {
    expect(resolveCollisions(99, -99, PLAYER_RADIUS, [])).toEqual({ x: WORLD_BOUND, z: -WORLD_BOUND });
  });

  it('blocks every real building in the city', () => {
    for (const b of BUILDINGS) {
      const r = resolveCollisions(b.position[0], b.position[2]);
      const inside =
        Math.abs(r.x - b.position[0]) < b.size[0] / 2 && Math.abs(r.z - b.position[2]) < b.size[2] / 2;
      expect(inside).toBe(false);
    }
  });
});
