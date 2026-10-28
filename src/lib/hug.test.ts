import { describe, expect, it } from 'vitest';
import {
  canResidentAcceptHug,
  findHugPlan,
  HUG_APPROACH_MS,
  HUG_DURATION_MS,
  HUG_RELEASE_MS,
  HUG_SEPARATION,
  hugBlend,
  hugPathPose,
  hugPositionBlend,
  hugSessionDurationMs,
  hugTargets,
} from './hug';
import { FRIENDSHIP_LEVELS, RESIDENTS, isAdultResident } from './people';
import { districtById } from './geography';
import { resolveCollisions } from './world';

describe('consensual resident hugs', () => {
  it('requires an adult and an acquaintance-level relationship to accept', () => {
    expect(canResidentAcceptHug(true, FRIENDSHIP_LEVELS[1].points)).toBe(true);
    expect(canResidentAcceptHug(true, FRIENDSHIP_LEVELS[1].points - 1)).toBe(false);
    expect(canResidentAcceptHug(false, FRIENDSHIP_LEVELS[4].points)).toBe(false);
    expect(RESIDENTS.every(isAdultResident)).toBe(true);
  });

  it('forms a face-to-face pair at a bounded separation, including coincident starts', () => {
    for (const [player, resident] of [
      [{ x: 0, z: 0 }, { x: 0, z: 2 }],
      [{ x: 3, z: -2 }, { x: -1, z: 1 }],
      [{ x: 2, z: 2 }, { x: 2, z: 2 }],
    ] as const) {
      const pair = hugTargets(player, resident);
      expect(Math.hypot(pair.player.x - pair.resident.x, pair.player.z - pair.resident.z)).toBeCloseTo(HUG_SEPARATION);
      expect(Math.sin(pair.player.facing) * (pair.resident.x - pair.player.x)
        + Math.cos(pair.player.facing) * (pair.resident.z - pair.player.z)).toBeGreaterThan(0);
      expect(Math.sin(pair.resident.facing) * (pair.player.x - pair.resident.x)
        + Math.cos(pair.resident.facing) * (pair.player.z - pair.resident.z)).toBeGreaterThan(0);
    }
  });

  it('blends into and holds the embrace target without overshooting', () => {
    expect(hugBlend(-1)).toBe(0);
    expect(hugBlend(275)).toBeCloseTo(0.5);
    expect(hugBlend(550)).toBe(1);
    expect(hugBlend(1000)).toBe(1);
  });

  it('smoothly releases both characters back to their starting positions', () => {
    expect(hugPositionBlend(0)).toBe(0);
    expect(hugPositionBlend(HUG_APPROACH_MS, HUG_APPROACH_MS)).toBe(1);
    expect(hugPositionBlend(HUG_APPROACH_MS + HUG_DURATION_MS, HUG_APPROACH_MS)).toBe(1);
    expect(hugPositionBlend(HUG_APPROACH_MS + HUG_DURATION_MS + HUG_RELEASE_MS / 2, HUG_APPROACH_MS)).toBeCloseTo(0.5);
    expect(hugPositionBlend(hugSessionDurationMs(HUG_APPROACH_MS), HUG_APPROACH_MS)).toBe(0);
  });

  it('routes both characters around tight sidewalk obstacles and returns on the same paths', () => {
    const obstacles = districtById('lagos.marina').layout.obstacles;
    const player = { x: 5.67, z: -2.81, facing: 2.82 };
    const resident = { x: 5.2, z: -3.4, facing: Math.PI / 2 };
    const plan = findHugPlan(player, resident, obstacles);

    expect(plan).not.toBeNull();
    expect(plan!.approachMs).toBeGreaterThanOrEqual(HUG_APPROACH_MS);
    expect(Math.hypot(plan!.player.x - plan!.resident.x, plan!.player.z - plan!.resident.z)).toBeCloseTo(HUG_SEPARATION);
    expect(hugPathPose(player, plan!.player, plan!.playerPath, 0)).toEqual(player);
    expect(hugPathPose(player, plan!.player, plan!.playerPath, 1)).toEqual(plan!.player);
    const returning = hugPathPose(player, plan!.player, plan!.playerPath, 0.25, true);
    const approaching = hugPathPose(player, plan!.player, plan!.playerPath, 0.25);
    expect(returning.x).toBeCloseTo(approaching.x);
    expect(returning.z).toBeCloseTo(approaching.z);
    expect(plan!.playerPath.length).toBeGreaterThan(0);
    expect(plan!.residentPath.length).toBeGreaterThan(0);
    for (let i = 0; i <= 100; i++) {
      const progress = i / 100;
      const playerPose = hugPathPose(player, plan!.player, plan!.playerPath, progress);
      const residentPose = hugPathPose(resident, plan!.resident, plan!.residentPath, progress);
      expect(Math.hypot(playerPose.x - residentPose.x, playerPose.z - residentPose.z)).toBeGreaterThanOrEqual(0.64);
      expect(resolveCollisions(playerPose.x, playerPose.z, 0.32, obstacles)).toEqual({ x: playerPose.x, z: playerPose.z });
      expect(resolveCollisions(residentPose.x, residentPose.z, 0.32, obstacles)).toEqual({ x: residentPose.x, z: residentPose.z });
    }
  });

  it('rejects hugs that require crossing an impassable obstacle', () => {
    const wall = [{ position: [0, 0, 0] as const, size: [4, 2, 0.5] as const }];
    const plan = findHugPlan(
      { x: 0, z: -0.7 },
      { x: 0, z: 0.7 },
      wall,
    );
    expect(plan).toBeNull();
  });
});
