import { describe, expect, it } from 'vitest';
import type { Career } from '../components/CharacterCreation';
import { getCareerLocation } from './careers';
import {
  BUILDINGS,
  CROSS_STREET,
  PAVEMENT_WIDTH,
  PLAYER_RADIUS,
  ROAD_HALF_WIDTH,
  WORLD_BOUND,
  resolveCollisions,
} from './world';

const box = { position: [0, 2, 0] as const, size: [4, 4, 2] as const }; // x -2..2, z -1..1

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

describe('city layout', () => {
  it('no two buildings overlap', () => {
    for (let i = 0; i < BUILDINGS.length; i++) {
      for (let j = i + 1; j < BUILDINGS.length; j++) {
        const a = BUILDINGS[i], c = BUILDINGS[j];
        const overlapX = Math.abs(a.position[0] - c.position[0]) < (a.size[0] + c.size[0]) / 2;
        const overlapZ = Math.abs(a.position[2] - c.position[2]) < (a.size[2] + c.size[2]) / 2;
        expect(overlapX && overlapZ, `building ${i} overlaps ${j}`).toBe(false);
      }
    }
  });

  it('buildings stay off the roads and pavements', () => {
    for (const bld of BUILDINGS) {
      const minX = bld.position[0] - bld.size[0] / 2, maxX = bld.position[0] + bld.size[0] / 2;
      const minZ = bld.position[2] - bld.size[2] / 2, maxZ = bld.position[2] + bld.size[2] / 2;
      expect(maxX <= -ROAD_HALF_WIDTH - PAVEMENT_WIDTH || minX >= ROAD_HALF_WIDTH + PAVEMENT_WIDTH).toBe(true);
      const hitsCross = maxZ > CROSS_STREET.minZ - PAVEMENT_WIDTH && minZ < CROSS_STREET.maxZ + PAVEMENT_WIDTH;
      expect(hitsCross).toBe(false);
    }
  });

  it('the player start and every workplace are reachable (not inside an obstacle)', () => {
    const careers: Career[] = ['student', 'artist', 'entrepreneur', 'athlete', 'engineer', 'doctor', 'pilot'];
    const spots = [[1.5, 2], ...careers.map((c) => [getCareerLocation(c).position[0], getCareerLocation(c).position[2]])];
    for (const [x, z] of spots) {
      expect(resolveCollisions(x, z), `spot ${x},${z}`).toEqual({ x, z });
      expect(Math.abs(x) <= WORLD_BOUND && Math.abs(z) <= WORLD_BOUND).toBe(true);
    }
  });
});
