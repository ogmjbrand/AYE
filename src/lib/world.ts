/** Static layout of the early city block, shared by rendering and collision. */

export interface Building {
  position: readonly [number, number, number];
  size: readonly [number, number, number];
  color: string;
}

export const BUILDINGS: readonly Building[] = [
  { position: [-7, 2, -5], size: [3, 4, 3], color: '#c7a17a' },
  { position: [-3, 3, -7], size: [3, 6, 3], color: '#aab5b7' },
  { position: [4, 2, -7], size: [4, 4, 3], color: '#d8c8ad' },
  { position: [8, 3, -4], size: [3, 6, 4], color: '#b9a18d' },
  { position: [-8, 2, 4], size: [3, 4, 4], color: '#c8b49b' },
  { position: [8, 2, 5], size: [3, 4, 4], color: '#d0c5b3' },
];

export const WORLD_BOUND = 45;
export const PLAYER_RADIUS = 0.3;

/**
 * Pushes a circle (the player's footprint) out of every building it overlaps.
 * Works on the XZ plane; returns the corrected position.
 */
export function resolveCollisions(
  x: number,
  z: number,
  radius = PLAYER_RADIUS,
  buildings: readonly Building[] = BUILDINGS,
): { x: number; z: number } {
  for (const b of buildings) {
    const halfW = b.size[0] / 2;
    const halfD = b.size[2] / 2;
    const minX = b.position[0] - halfW;
    const maxX = b.position[0] + halfW;
    const minZ = b.position[2] - halfD;
    const maxZ = b.position[2] + halfD;

    const nearestX = Math.max(minX, Math.min(x, maxX));
    const nearestZ = Math.max(minZ, Math.min(z, maxZ));
    const dx = x - nearestX;
    const dz = z - nearestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq >= radius * radius) continue;

    if (distSq > 1e-9) {
      // Centre is outside the box: push straight away from the nearest edge point.
      const dist = Math.sqrt(distSq);
      x = nearestX + (dx / dist) * radius;
      z = nearestZ + (dz / dist) * radius;
    } else {
      // Centre is inside the box: exit through the closest face.
      const exits = [
        { d: x - minX, x: minX - radius, z },
        { d: maxX - x, x: maxX + radius, z },
        { d: z - minZ, x, z: minZ - radius },
        { d: maxZ - z, x, z: maxZ + radius },
      ];
      const best = exits.reduce((a, c) => (c.d < a.d ? c : a));
      x = best.x;
      z = best.z;
    }
  }

  x = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, x));
  z = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, z));
  return { x, z };
}
