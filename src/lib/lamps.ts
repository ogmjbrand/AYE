/** How many real point lights the city's doorway and street lamps share (world/LampPool.tsx). */
export const LAMP_POOL_SIZE = 2;

/** The lamps worth lighting for someone at (x, z): lit, in reach, nearest first. */
export function nearestLamps<T extends { x: number; z: number; intensity: number; distance: number }>(all: T[], x: number, z: number, count: number): T[] {
  return all
    .filter((l) => l.intensity > 0 && Math.hypot(l.x - x, l.z - z) < l.distance + 25)
    .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))
    .slice(0, count);
}
