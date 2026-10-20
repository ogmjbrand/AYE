/**
 * Inside your home: one furnished room (or open-plan flat) per tier of rent.
 * Rooms are centred on the origin; the front door is in the middle of the
 * near wall (−Z) and the bed against the far wall. Furniture is solid.
 */
import { buildLayout, type Building, type DistrictLayout } from './world';
import type { Home } from './homes';

export type FurnitureKind =
  | 'bed' | 'sofa' | 'table' | 'counter' | 'wardrobe' | 'tv' | 'rug' | 'plant' | 'desk' | 'lamp'
  | 'fridge' | 'cabinet' | 'mirror' | 'sink' | 'toilet' | 'shower'
  | 'computer' | 'file-cabinet' | 'conference-table' | 'reception' | 'chair' | 'whiteboard';

export type HomeAction = 'door' | 'bed' | 'wardrobe' | 'mirror' | 'sofa' | 'tv' | 'kitchen' | 'bathroom';

export interface InteriorWall {
  position: readonly [number, number, number];
  size: readonly [number, number, number];
}

export interface Furniture {
  kind: FurnitureKind;
  /** Centre on the floor (x, z) in room coordinates. */
  at: readonly [number, number];
  /** Width (X), height, depth (Z). */
  size: readonly [number, number, number];
  color: string;
  elevation?: number;
  rotation?: number;
}

export interface Interior {
  tier: 'room' | 'flat' | 'apartment' | 'penthouse';
  width: number;
  depth: number;
  wallColor: string;
  floorColor: string;
  /** Big window on the far wall (penthouse: floor to ceiling). */
  window: 'small' | 'wide' | 'full';
  /** Non-load-bearing interior walls, with central openings between rooms. */
  partitions: readonly InteriorWall[];
  furniture: readonly Furniture[];
}

export const WALL_HEIGHT = 2.9;
/** Use radius for the bed and the door. */
export const USE_RADIUS = 1.4;

const f = (
  kind: FurnitureKind,
  x: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: string,
  elevation = 0,
  rotation = 0,
): Furniture => ({ kind, at: [x, z], size: [w, h, d], color, elevation, rotation });

function makeInterior(
  tier: Interior['tier'],
  width: number,
  depth: number,
  wallColor: string,
  floorColor: string,
  window: Interior['window'],
): Interior {
  const left = -width / 4;
  const right = width / 4;
  const front = -depth / 4;
  const back = depth / 4;
  const wallHeight = WALL_HEIGHT - 0.25;
  const doorway = 1.2;
  const horizontalLength = width / 2 - doorway / 2;
  const partitions: InteriorWall[] = [
    { position: [0, wallHeight / 2, (depth / 2 + doorway) / 2], size: [0.12, wallHeight, depth / 2 - doorway] },
    { position: [-(width / 2 + doorway / 2) / 2, wallHeight / 2, 0], size: [horizontalLength, wallHeight, 0.12] },
    { position: [(width / 2 + doorway / 2) / 2, wallHeight / 2, 0], size: [horizontalLength, wallHeight, 0.12] },
  ];
  const furniture: Furniture[] = [
    f('bed', right - 0.15, back - 0.9, 1.85, 0.55, 2.2, '#52677b'),
    f('wardrobe', width / 2 - 0.75, back + 1.2, 1.1, 2.1, 0.65, '#60452f'),
    f('mirror', width / 2 - 0.14, back - 0.9, 0.08, 1.65, 0.75, '#9dbac0', 0.15),
    f('sofa', right, front + 1.3, 2.4, 0.85, 1.0, '#59646b'),
    f('tv', right, -depth / 2 + 0.45, 1.6, 1.15, 0.38, '#22262b'),
    f('table', right, front - 0.65, 1.1, 0.42, 0.68, '#74543b'),
    f('rug', right, front - 0.35, 3.1, 0.01, 2.25, '#a77f52'),
    f('counter', left, -depth / 2 + 0.55, 2.3, 0.92, 0.72, '#b8aa95'),
    f('cabinet', left, -depth / 2 + 0.55, 2.0, 0.75, 0.48, '#80674f', 1.45),
    f('fridge', -width / 2 + 0.7, front - 0.1, 0.78, 1.9, 0.78, '#c9cdce'),
    f('shower', -width / 2 + 0.8, back + 1.0, 1.15, 2.15, 1.15, '#a8c0c5'),
    f('sink', left, back + 1.15, 0.85, 0.9, 0.58, '#dedbd2'),
    f('toilet', left, back - 0.45, 0.62, 0.78, 0.9, '#e5e5e1'),
    f('plant', width / 2 - 0.55, front - 1.3, 0.48, 1.15, 0.48, '#517247'),
    f('lamp', right - 1.8, front + 1.0, 0.36, 1.7, 0.36, '#e5d7b8'),
  ];

  return { tier, width, depth, wallColor, floorColor, window, partitions, furniture };
}

export const INTERIORS: Record<Interior['tier'], Interior> = {
  room: makeInterior('room', 10, 8, '#d9cdb5', '#8a6f55', 'small'),
  flat: makeInterior('flat', 12, 9, '#e4d8c2', '#9a7b5c', 'wide'),
  apartment: makeInterior('apartment', 14, 10, '#ece4d6', '#b08d68', 'wide'),
  penthouse: makeInterior('penthouse', 16, 12, '#f1ede6', '#d9d4cc', 'full'),
};

export function interiorFor(home: Home): Interior {
  if (home.rentPerNight < 120) return INTERIORS.room;
  if (home.rentPerNight < 300) return INTERIORS.flat;
  if (home.rentPerNight < 800) return INTERIORS.apartment;
  return INTERIORS.penthouse;
}

/** Where you stand just inside the front door. */
export const doorSpot = (i: Interior) => [0, -i.depth / 2 + 0.7] as const;
/** Where you stand to get into bed: in the clear aisle beside its left edge. */
export function bedSpot(i: Interior): readonly [number, number] {
  const bed = i.furniture.find((x) => x.kind === 'bed')!;
  return [bed.at[0] - bed.size[0] / 2 - 0.45, bed.at[1]];
}

const ACTION_FOR_FURNITURE: Partial<Record<FurnitureKind, HomeAction>> = {
  bed: 'bed',
  wardrobe: 'wardrobe',
  mirror: 'mirror',
  sofa: 'sofa',
  tv: 'tv',
  counter: 'kitchen',
  fridge: 'kitchen',
  cabinet: 'kitchen',
  shower: 'bathroom',
  sink: 'bathroom',
  toilet: 'bathroom',
};

/** Contextual action for the nearest object, measured from its walkable edge. */
export function homeInteractionAt(i: Interior, x: number, z: number): HomeAction | null {
  const [doorX, doorZ] = doorSpot(i);
  if (Math.hypot(x - doorX, z - doorZ) <= USE_RADIUS) return 'door';

  let nearest: { action: HomeAction; distance: number } | null = null;
  for (const item of i.furniture) {
    const action = ACTION_FOR_FURNITURE[item.kind];
    if (!action) continue;
    const dx = Math.max(Math.abs(x - item.at[0]) - item.size[0] / 2, 0);
    const dz = Math.max(Math.abs(z - item.at[1]) - item.size[2] / 2, 0);
    const distance = Math.hypot(dx, dz);
    if (distance <= USE_RADIUS && (!nearest || distance < nearest.distance)) nearest = { action, distance };
  }
  return nearest?.action ?? null;
}

const WALL = 0.2;

/** Walls and furniture as a collision layout (no streets: the floor is flat). */
export function interiorLayout(i: Interior): DistrictLayout {
  const { width: w, depth: d } = i;
  const wall = (x: number, z: number, sx: number, sz: number): Building =>
    ({ position: [x, 0, z], size: [sx, WALL_HEIGHT, sz], color: i.wallColor, style: 'residential' });
  const buildings: Building[] = [
    wall(0, d / 2 + WALL / 2, w + 2 * WALL, WALL),
    wall(-w / 2 - WALL / 2, 0, WALL, d),
    wall(w / 2 + WALL / 2, 0, WALL, d),
    wall(0, -d / 2 - WALL / 2, 1.4, WALL),
    // Front wall, either side of the door opening
    wall(-(w / 4 + 0.35), -d / 2 - WALL / 2, w / 2 - 0.7, WALL),
    wall(w / 4 + 0.35, -d / 2 - WALL / 2, w / 2 - 0.7, WALL),
    // The doorway itself: you leave with E, not by walking out
    ...i.partitions.map((p): Building => ({
      position: p.position,
      size: p.size,
      color: i.wallColor,
      style: 'residential',
    })),
    ...i.furniture
      .filter((x) => !['rug', 'cabinet', 'mirror', 'computer', 'whiteboard'].includes(x.kind))
      .map((x): Building => ({ position: [x.at[0], 0, x.at[1]], size: x.size, color: x.color, style: 'residential' })),
  ];
  return buildLayout({
    id: `interior.${i.tier}`,
    // A very wide "road" means no raised pavement anywhere: the floor is flat
    roadHalfWidth: 1000,
    pavementWidth: 0,
    crossStreet: { minZ: 5000, maxZ: 5001 },
    buildings,
    palms: null,
    lamps: { x: 0, spacing: 1000, offset: 5000 },
    powerPoles: [],
    vehicles: [],
    stalls: [],
    traffic: [],
    billboard: null,
    park: null,
    terraceChairs: [],
    skyline: { seed: 1, warm: ['#000'], glass: ['#000'], towerChance: 0 },
  });
}
