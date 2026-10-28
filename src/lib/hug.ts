import { FRIENDSHIP_LEVELS } from './people';
import { findPath, walkGridFor, type Point } from './pathfinding';
import { resolveCollisions, type Obstacle } from './world';

export const HUG_DURATION_MS = 3400;
export const HUG_APPROACH_MS = 550;
export const HUG_APPROACH_SPEED = 1.4;
export const HUG_RELEASE_MS = 450;
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
  playerPath: readonly Point[];
  residentPath: readonly Point[];
  approachMs: number;
  startedAt: number;
}

export interface HugPlan {
  player: HugPoint;
  resident: HugPoint;
  playerPath: readonly Point[];
  residentPath: readonly Point[];
  approachMs: number;
}

export function canResidentAcceptHug(isAdult: boolean, relationshipPoints: number): boolean {
  return isAdult && relationshipPoints >= FRIENDSHIP_LEVELS[1].points;
}

export function hugTargets(
  player: Pick<HugPoint, 'x' | 'z'>,
  resident: Pick<HugPoint, 'x' | 'z'>,
  facing = Math.atan2(resident.x - player.x, resident.z - player.z),
): { player: HugPoint; resident: HugPoint } {
  const dx = Math.sin(facing);
  const dz = Math.cos(facing);
  const midpointX = (player.x + resident.x) / 2;
  const midpointZ = (player.z + resident.z) / 2;
  const half = HUG_SEPARATION / 2;
  return {
    player: { x: midpointX - dx * half, z: midpointZ - dz * half, facing },
    resident: { x: midpointX + dx * half, z: midpointZ + dz * half, facing: facing + Math.PI },
  };
}

function clearPhysicalPath(from: Point, to: Point, obstacles: readonly Obstacle[]): boolean {
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  const steps = Math.max(1, Math.ceil(distance / 0.1));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = from.x + (to.x - from.x) * t;
    const z = from.z + (to.z - from.z) * t;
    const clear = resolveCollisions(x, z, 0.32, obstacles);
    if (Math.hypot(clear.x - x, clear.z - z) > 0.001) return false;
  }
  return true;
}

function pathLength(from: Point, path: readonly Point[]): number {
  let length = 0;
  let previous: Point = from;
  for (const point of path) {
    length += Math.hypot(point.x - previous.x, point.z - previous.z);
    previous = point;
  }
  return length;
}

function pointAlongPath(from: Point, path: readonly Point[], progress: number): Point {
  const total = pathLength(from, path);
  let remaining = total * Math.max(0, Math.min(1, progress));
  let previous = from;
  for (const point of path) {
    const length = Math.hypot(point.x - previous.x, point.z - previous.z);
    if (remaining <= length || point === path[path.length - 1]) {
      const t = length === 0 ? 1 : Math.min(1, remaining / length);
      return { x: previous.x + (point.x - previous.x) * t, z: previous.z + (point.z - previous.z) * t };
    }
    remaining -= length;
    previous = point;
  }
  return { ...from };
}

function routeToTarget(
  from: Point,
  target: Point,
  grid: ReturnType<typeof walkGridFor>,
  obstacles: readonly Obstacle[],
): Point[] | null {
  let path = clearPhysicalPath(from, target, obstacles) ? [target] : findPath(grid, from, target);
  if (!path?.length) return null;

  const last = path[path.length - 1];
  const gap = Math.hypot(last.x - target.x, last.z - target.z);
  if (gap > 0.01) {
    if (gap > 0.75 || !clearPhysicalPath(last, target, obstacles)) return null;
    path = [...path, target];
  }
  if (!clearPhysicalPath(from, path[0], obstacles)) return null;
  for (let i = 1; i < path.length; i++) {
    if (!clearPhysicalPath(path[i - 1], path[i], obstacles)) return null;
  }
  return path;
}

function approachesStaySeparate(
  player: Point,
  resident: Point,
  playerPath: readonly Point[],
  residentPath: readonly Point[],
): boolean {
  for (let i = 0; i <= 100; i++) {
    const progress = i / 100;
    const p = pointAlongPath(player, playerPath, progress);
    const r = pointAlongPath(resident, residentPath, progress);
    if (Math.hypot(p.x - r.x, p.z - r.z) < 0.64) return false;
  }
  return true;
}

/** Finds a short, collision-free face-to-face formation and routes both approaches. */
export function findHugPlan(
  player: Pick<HugPoint, 'x' | 'z'>,
  resident: Pick<HugPoint, 'x' | 'z'>,
  obstacles: readonly Obstacle[],
): HugPlan | null {
  const initialFacing = Math.atan2(resident.x - player.x, resident.z - player.z);
  const offsets = [0];
  for (let step = 1; step < 8; step++) offsets.push(step * Math.PI / 8, -step * Math.PI / 8);
  offsets.push(Math.PI);
  const grid = walkGridFor(obstacles);

  for (const offset of offsets) {
    const targets = hugTargets(player, resident, initialFacing + offset);
    const playerClear = resolveCollisions(targets.player.x, targets.player.z, 0.32, obstacles);
    const residentClear = resolveCollisions(targets.resident.x, targets.resident.z, 0.32, obstacles);
    if (
      Math.hypot(playerClear.x - targets.player.x, playerClear.z - targets.player.z) > 0.001
      || Math.hypot(residentClear.x - targets.resident.x, residentClear.z - targets.resident.z) > 0.001
    ) continue;
    const playerPath = routeToTarget(player, targets.player, grid, obstacles);
    const residentPath = routeToTarget(resident, targets.resident, grid, obstacles);
    if (!playerPath || !residentPath) continue;
    const playerLength = pathLength(player, playerPath);
    const residentLength = pathLength(resident, residentPath);
    if (
      Math.max(playerLength, residentLength) > 3
      || !approachesStaySeparate(player, resident, playerPath, residentPath)
    ) continue;
    return {
      ...targets,
      playerPath,
      residentPath,
      approachMs: Math.max(HUG_APPROACH_MS, Math.ceil(Math.max(playerLength, residentLength) / HUG_APPROACH_SPEED * 1000)),
    };
  }
  return null;
}

export function hugBlend(elapsedMs: number): number {
  const t = Math.max(0, Math.min(1, elapsedMs / HUG_APPROACH_MS));
  return t * t * (3 - 2 * t);
}

export function hugPositionBlend(elapsedMs: number, approachMs = HUG_APPROACH_MS): number {
  if (elapsedMs <= approachMs) {
    const t = Math.max(0, elapsedMs / approachMs);
    return t * t * (3 - 2 * t);
  }
  if (elapsedMs <= approachMs + HUG_DURATION_MS) return 1;
  const t = Math.max(0, Math.min(1, (elapsedMs - approachMs - HUG_DURATION_MS) / HUG_RELEASE_MS));
  const release = t * t * (3 - 2 * t);
  return 1 - release;
}

export function hugSessionDurationMs(approachMs: number): number {
  return approachMs + HUG_DURATION_MS + HUG_RELEASE_MS;
}

function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function interpolateAngle(from: number, to: number, t: number): number {
  return from + wrapAngle(to - from) * t;
}

/** Pose along a routed approach; progress reverses along the same clear route on release. */
export function hugPathPose(
  from: HugPoint,
  target: HugPoint,
  path: readonly Point[],
  progress: number,
  reverse = false,
): HugPoint {
  const t = Math.max(0, Math.min(1, progress));
  if (t === 0) return from;
  if (t === 1) return target;
  const total = pathLength(from, path);
  const travelled = total * t;
  const position = pointAlongPath(from, path, t);
  let previous: Point = from;
  let travelledBefore = 0;
  let tangent = target.facing;
  for (const point of path) {
    const length = Math.hypot(point.x - previous.x, point.z - previous.z);
    if (travelled <= travelledBefore + length || point === path[path.length - 1]) {
      tangent = Math.atan2(point.x - previous.x, point.z - previous.z) + (reverse ? Math.PI : 0);
      break;
    }
    travelledBefore += length;
    previous = point;
  }
  const endBlend = Math.max(0, Math.min(1, (travelled - Math.max(0, total - 0.35)) / 0.35));
  const startBlend = Math.max(0, Math.min(1, travelled / 0.35));
  const facing = interpolateAngle(from.facing, tangent, startBlend);
  return {
    ...position,
    facing: interpolateAngle(facing, target.facing, endBlend),
  };
}
