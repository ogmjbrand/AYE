import { resolveCollisions, type Obstacle } from './world';

export interface VehicleMotion {
  x: number;
  z: number;
  direction: number;
  speed: number;
}

export function isVehicleSpawnClear(
  position: { x: number; z: number },
  obstacles: readonly Obstacle[],
  pedestrians: readonly { x: number; z: number }[],
): boolean {
  const resolved = resolveCollisions(position.x, position.z, 2.35, obstacles);
  if (Math.hypot(resolved.x - position.x, resolved.z - position.z) > 0.1) return false;
  return pedestrians.every((pedestrian) => Math.hypot(pedestrian.x - position.x, pedestrian.z - position.z) >= 2.8);
}

export function advanceVehicleMotion(
  state: VehicleMotion,
  input: { forward: number; turn: number; delta: number },
  obstacles?: readonly Obstacle[],
): VehicleMotion {
  const delta = Math.min(Math.max(input.delta, 0), 0.1);
  const acceleration = 7;
  const maxForward = 13;
  const maxReverse = 4;
  let speed = input.forward > 0
    ? Math.min(maxForward, state.speed + acceleration * input.forward * delta)
    : input.forward < 0
      ? Math.max(-maxReverse, state.speed + acceleration * input.forward * delta)
      : state.speed * Math.max(0, 1 - 1.8 * delta);
  const direction = state.direction
    + input.turn * 1.15 * Math.min(1, Math.abs(speed) / 3) * Math.sign(speed || 1) * delta;
  const intendedX = state.x + Math.sin(direction) * speed * delta;
  const intendedZ = state.z + Math.cos(direction) * speed * delta;
  const resolved = resolveCollisions(intendedX, intendedZ, 1.2, obstacles);
  if (Math.hypot(resolved.x - intendedX, resolved.z - intendedZ) > 0.05) speed = 0;
  return { x: resolved.x, z: resolved.z, direction, speed };
}
