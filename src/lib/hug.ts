import { FRIENDSHIP_LEVELS } from './people';

export const HUG_DURATION_MS = 3400;
export const HUG_APPROACH_MS = 550;
export const HUG_SEPARATION = 0.82;

export interface HugPoint {
  x: number;
  z: number;
  facing: number;
}

export interface HugSession {
  residentId: string;
  playerFrom: HugPoint;
  residentFrom: HugPoint;
  playerTarget: HugPoint;
  residentTarget: HugPoint;
  startedAt: number;
}

export function canResidentAcceptHug(isAdult: boolean, relationshipPoints: number): boolean {
  return isAdult && relationshipPoints >= FRIENDSHIP_LEVELS[1].points;
}

export function hugTargets(
  player: Pick<HugPoint, 'x' | 'z'>,
  resident: Pick<HugPoint, 'x' | 'z'>,
): { player: HugPoint; resident: HugPoint } {
  let dx = resident.x - player.x;
  let dz = resident.z - player.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.001) {
    dx = 0;
    dz = 1;
  } else {
    dx /= distance;
    dz /= distance;
  }
  const midpointX = (player.x + resident.x) / 2;
  const midpointZ = (player.z + resident.z) / 2;
  const half = HUG_SEPARATION / 2;
  const playerFacing = Math.atan2(dx, dz);
  const residentFacing = Math.atan2(-dx, -dz);
  return {
    player: { x: midpointX - dx * half, z: midpointZ - dz * half, facing: playerFacing },
    resident: { x: midpointX + dx * half, z: midpointZ + dz * half, facing: residentFacing },
  };
}

export function hugBlend(elapsedMs: number): number {
  const t = Math.max(0, Math.min(1, elapsedMs / HUG_APPROACH_MS));
  return t * t * (3 - 2 * t);
}
