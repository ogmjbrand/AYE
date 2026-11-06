/**
 * A walled private compound in a district: a stone boundary wall with a sliding gate, lawns, an
 * asphalt drive and parking under a canopy carport, and a two-storey house with a pillared porch
 * (world/Compound.tsx draws it). The house is a home you can buy (lib/homes.ts): its front door
 * is on the porch, and inside is its own interior (lib/interiors.ts).
 *
 * Coordinates are district coordinates; the compound is axis-aligned, its house at the north
 * end (+z) facing south down the drive, the gate in the east wall.
 */
import type { Obstacle } from './world';

export interface CompoundSpec {
  id: string;
  name: string;
  /** The wall's rectangle. */
  minX: number; maxX: number; minZ: number; maxZ: number;
  /** The gate's opening in the east wall: from z to z (it stands open, slid north along the inside). */
  gate: { z0: number; z1: number };
  /** The house's footprint. */
  house: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** The canopy carport over the parking: its rectangle (posts stand on its south edge). */
  carport: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export const COMPOUND_WALL = { height: 1.9, thickness: 0.35 } as const;
export const HOUSE_STOREY = 3.3;
/** The porch out in front of the house's door, under the first-floor balcony. */
export const PORCH_DEPTH = 2.2;

/** Everything solid in a compound: the wall either side of the gate, the house, the porch pillars and the carport posts (its parked cars are the district's own parked vehicles). */
export function compoundObstacles(c: CompoundSpec): Obstacle[] {
  const t: number = COMPOUND_WALL.thickness, h: number = COMPOUND_WALL.height;
  const box = (x0: number, x1: number, z0: number, z1: number, height = h): Obstacle =>
    ({ position: [(x0 + x1) / 2, 0, (z0 + z1) / 2], size: [x1 - x0, height, z1 - z0] });
  const out: Obstacle[] = [
    box(c.minX, c.maxX, c.maxZ - t / 2, c.maxZ + t / 2),
    box(c.minX, c.maxX, c.minZ - t / 2, c.minZ + t / 2),
    box(c.minX - t / 2, c.minX + t / 2, c.minZ, c.maxZ),
    // East wall either side of the gate
    box(c.maxX - t / 2, c.maxX + t / 2, c.minZ, c.gate.z0),
    box(c.maxX - t / 2, c.maxX + t / 2, c.gate.z1, c.maxZ),
    box(c.house.minX, c.house.maxX, c.house.minZ, c.house.maxZ, HOUSE_STOREY * 2),
    // The porch's two front pillars
    ...porchPillars(c).map(([x, z]) => box(x - 0.2, x + 0.2, z - 0.2, z + 0.2, HOUSE_STOREY)),
    // The carport's posts along its south edge
    ...carportPosts(c).map(([x, z]) => box(x - 0.08, x + 0.08, z - 0.08, z + 0.08, 2.6)),
  ];
  return out;
}

/** The porch's front pillars: either side of the door, out in front of the house. */
export function porchPillars(c: CompoundSpec): (readonly [number, number])[] {
  const cx = (c.house.minX + c.house.maxX) / 2, z = c.house.minZ - PORCH_DEPTH;
  return [[cx - 2.4, z], [cx + 2.4, z]];
}

/** The carport's posts, every few metres along its south edge. */
export function carportPosts(c: CompoundSpec): (readonly [number, number])[] {
  const n = Math.max(2, Math.round((c.carport.maxX - c.carport.minX) / 4) + 1);
  return Array.from({ length: n }, (_, i) => [c.carport.minX + 0.2 + (i * (c.carport.maxX - c.carport.minX - 0.4)) / (n - 1), c.carport.minZ + 0.2] as const);
}

/** Where you stand to go in: on the porch, in front of the door. */
export function compoundDoor(c: CompoundSpec): readonly [number, number, number] {
  return [(c.house.minX + c.house.maxX) / 2, 0, c.house.minZ - 0.9];
}

/** Whether a district point is within a compound's walls. */
export function insideCompound(c: CompoundSpec, p: readonly [number, number, number]): boolean {
  const inside = (x: number, z: number) => x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ;
  return inside(p[0], p[2]);
}
