/**
 * Static layout of the city block, shared by rendering and collision.
 * Units are metres. The main boulevard runs north–south along Z, crossed by
 * one east–west street. Buildings sit back from the pavements.
 */

export type BuildingStyle = 'tower' | 'office' | 'residential' | 'shop';

export interface Building {
  /** Centre of the footprint at ground level (y is ignored by collision). */
  position: readonly [number, number, number];
  /** Width (X), height (Y), depth (Z). */
  size: readonly [number, number, number];
  color: string;
  style: BuildingStyle;
  /** Shown on signage for shops and landmark buildings. */
  name?: string;
}

/** Any solid, axis-aligned footprint the player cannot walk through. */
export interface Obstacle {
  position: readonly [number, number, number];
  size: readonly [number, number, number];
}

export const WORLD_BOUND = 45;
export const PLAYER_RADIUS = 0.3;

// Street grid
export const ROAD_HALF_WIDTH = 4; // boulevard: x in [-4, 4]
export const PAVEMENT_WIDTH = 3; // pavements: 4 <= |x| <= 7
export const CROSS_STREET = { minZ: -24, maxZ: -16 } as const;
export const STREET_LENGTH = 130;

const b = (
  x: number, z: number, w: number, d: number, h: number,
  style: BuildingStyle, color: string, name?: string,
): Building => ({ position: [x, 0, z], size: [w, h, d], style, color, name });

export const BUILDINGS: readonly Building[] = [
  // West side, north of the cross street
  b(-11, -6, 6, 12, 7, 'shop', '#d9c7a3', 'Mama Put'),
  b(-11, 9, 6, 12, 14, 'residential', '#e8d9b5'),
  b(-22, 0, 12, 14, 42, 'tower', '#5f7f8f'),
  b(-11, 24, 6, 12, 17, 'residential', '#d8a47f'),
  b(-23, 24, 10, 12, 22, 'office', '#c9ccc8', 'Tech Campus'),
  b(-11, 38, 6, 10, 7, 'shop', '#c7d3c0', 'Pharmacy'),
  // West side, south of the cross street
  b(-13, -36, 10, 12, 18, 'office', '#d6cdbd', 'University'),
  b(-26, -36, 10, 10, 13, 'residential', '#e3cf9a'),
  // East side, north of the cross street
  b(13, -6, 10, 12, 16, 'office', '#eceae4', 'General Hospital'),
  b(14, 12, 12, 12, 38, 'tower', '#486a7e'),
  b(11, 27, 6, 10, 7, 'shop', '#e0b98f', 'Art Studio'),
  b(24, 27, 10, 10, 15, 'residential', '#efe3c8'),
  b(25, -2, 10, 10, 24, 'office', '#b9c2c4'),
  b(11, 3, 6, 5, 6, 'shop', '#e9d3b0', 'Taste of Africa'),
  b(11, 39, 6, 8, 6, 'shop', '#d7c4e0', 'Fashion House'),
  // East side, south of the cross street
  b(14, -36, 12, 12, 46, 'tower', '#3f5f73'),
  b(28, -36, 8, 10, 12, 'residential', '#dcc2a2'),
];

export const PAVEMENT_HEIGHT = 0.12;

/** Height of the walkable surface (pavements are raised above the road). */
export function groundHeightAt(x: number, z: number): number {
  const ax = Math.abs(x);
  const onBoulevardPavement = ax >= ROAD_HALF_WIDTH && ax <= ROAD_HALF_WIDTH + PAVEMENT_WIDTH && !(z > CROSS_STREET.minZ && z < CROSS_STREET.maxZ);
  const onCrossPavement =
    ax >= ROAD_HALF_WIDTH &&
    ((z >= CROSS_STREET.minZ - PAVEMENT_WIDTH && z <= CROSS_STREET.minZ) ||
      (z >= CROSS_STREET.maxZ && z <= CROSS_STREET.maxZ + PAVEMENT_WIDTH));
  return onBoulevardPavement || onCrossPavement ? PAVEMENT_HEIGHT : 0;
}

/** Deterministic pseudo-random numbers so the city is identical on every load. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const inCrossStreet = (z: number, margin = 0) =>
  z > CROSS_STREET.minZ - PAVEMENT_WIDTH - margin && z < CROSS_STREET.maxZ + PAVEMENT_WIDTH + margin;

/** Pavement positions every `spacing` metres along both sides of the boulevard. */
function alongBoulevard(x: number, spacing: number, offset: number) {
  const out: [number, number, number][] = [];
  for (let z = -WORLD_BOUND + offset; z <= WORLD_BOUND; z += spacing) {
    if (!inCrossStreet(z, 1)) {
      out.push([x, 0, z], [-x, 0, z]);
    }
  }
  return out;
}

export const PALMS = alongBoulevard(6.3, 12, 2);
export const STREET_LAMPS = alongBoulevard(4.5, 12, 8);
/** Wooden power poles run down the west pavement only, as is common in Lagos. */
export const POWER_POLES: [number, number, number][] = [-40, -30, -8, 4, 16, 28, 40].map(
  (z) => [-6.7, 0, z],
);

export interface Vehicle {
  position: readonly [number, number, number];
  /** Rotation about Y in radians; 0 faces +Z. */
  heading: number;
  color: string;
}

/** Parked danfo minibuses at the kerbside bus stops. */
export const DANFOS: readonly Vehicle[] = [
  { position: [2.4, 0, 30], heading: 0, color: '#f2b705' },
  { position: [2.4, 0, 36.5], heading: 0, color: '#f2b705' },
  { position: [-2.4, 0, -36], heading: Math.PI, color: '#f2b705' },
  { position: [-2.4, 0, 10], heading: Math.PI, color: '#e9a800' },
];
export const DANFO_SIZE = [2.0, 2.3, 5.0] as const; // width, height, length

/** Market stalls with umbrellas on the pavement outside the shop row. */
export const MARKET_STALLS: [number, number, number][] = [
  [-6.2, 0, -10.5],
  [-6.2, 0, -7.5],
  [-6.2, 0, -1.5],
];
export const STALL_SIZE = [1.4, 1.0, 1.8] as const;

/** Everything solid: buildings, parked buses, stalls, tree and lamp bases. */
export const OBSTACLES: readonly Obstacle[] = [
  ...BUILDINGS,
  ...DANFOS.map((v) => ({
    position: v.position,
    size: [DANFO_SIZE[0], DANFO_SIZE[1], DANFO_SIZE[2]] as const,
  })),
  ...MARKET_STALLS.map((p) => ({ position: p, size: STALL_SIZE })),
  ...PALMS.map((p) => ({ position: p, size: [0.5, 1, 0.5] as const })),
  ...STREET_LAMPS.map((p) => ({ position: p, size: [0.25, 1, 0.25] as const })),
  ...POWER_POLES.map((p) => ({ position: p, size: [0.3, 1, 0.3] as const })),
];

/**
 * Pushes a circle (the player's footprint) out of every obstacle it overlaps.
 * Works on the XZ plane; returns the corrected position.
 */
export function resolveCollisions(
  x: number,
  z: number,
  radius = PLAYER_RADIUS,
  obstacles: readonly Obstacle[] = OBSTACLES,
): { x: number; z: number } {
  for (const o of obstacles) {
    const halfW = o.size[0] / 2;
    const halfD = o.size[2] / 2;
    const minX = o.position[0] - halfW;
    const maxX = o.position[0] + halfW;
    const minZ = o.position[2] - halfD;
    const maxZ = o.position[2] + halfD;

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

/**
 * The wider city seen beyond the walkable block: massing only, not solid
 * (the player can never reach it), deterministic so it never changes.
 * Taller towers sit further out, like a business district behind the street.
 */
export const SKYLINE: readonly Building[] = (() => {
  const rand = seeded(311);
  const out: Building[] = [];
  const CELL = 20;
  const EXTENT = 150;
  const warm = ['#d8c4a2', '#e3d2b4', '#c9b08c', '#d9a982', '#e8dcc6', '#bfb6a6'];
  const glass = ['#4f6f82', '#5d7d8c', '#3f5f73', '#6a8796'];
  for (let cx = -EXTENT + CELL / 2; cx < EXTENT; cx += CELL) {
    for (let cz = -EXTENT + CELL / 2; cz < EXTENT; cz += CELL) {
      // Keep clear of the playable block and its buildings
      if (Math.abs(cx) < 60 && Math.abs(cz) < 64) continue;
      // Leave the boulevard's corridor open so the street recedes into the distance
      if (Math.abs(cx) < 20) continue;
      if (rand() < 0.12) continue; // the odd gap reads as a real city
      const w = 10 + rand() * 6;
      const d = 10 + rand() * 6;
      const x = cx + (rand() - 0.5) * 4;
      const z = cz + (rand() - 0.5) * 4;
      const dist = Math.hypot(cx, cz);
      const towerChance = Math.min(0.55, 0.1 + (dist - 60) / 200);
      const isTower = rand() < towerChance;
      const h = isTower ? 38 + rand() * (40 + dist / 3) : 10 + rand() * 18;
      const style: BuildingStyle = isTower ? 'tower' : rand() < 0.5 ? 'office' : 'residential';
      const palette = isTower ? glass : warm;
      out.push(b(x, z, w, d, h, style, palette[Math.floor(rand() * palette.length)]));
    }
  }
  return out;
})();
