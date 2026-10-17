/**
 * Inside your home: one furnished room (or open-plan flat) per tier of rent.
 * Rooms are centred on the origin; the front door is in the middle of the
 * near wall (−Z) and the bed against the far wall. Furniture is solid.
 */
import { buildLayout, type Building, type DistrictLayout } from './world';
import type { Home } from './homes';

export type FurnitureKind = 'bed' | 'sofa' | 'table' | 'counter' | 'wardrobe' | 'tv' | 'rug' | 'plant' | 'desk' | 'lamp' | 'fridge';

export interface Furniture {
  kind: FurnitureKind;
  /** Centre on the floor (x, z) in room coordinates. */
  at: readonly [number, number];
  /** Width (X), height, depth (Z). */
  size: readonly [number, number, number];
  color: string;
}

export interface Interior {
  tier: 'room' | 'flat' | 'apartment' | 'penthouse';
  width: number;
  depth: number;
  wallColor: string;
  floorColor: string;
  /** Big window on the far wall (penthouse: floor to ceiling). */
  window: 'small' | 'wide' | 'full';
  furniture: readonly Furniture[];
}

export const WALL_HEIGHT = 2.9;
/** Use radius for the bed and the door. */
export const USE_RADIUS = 1.4;

const f = (kind: FurnitureKind, x: number, z: number, w: number, h: number, d: number, color: string): Furniture =>
  ({ kind, at: [x, z], size: [w, h, d], color });

export const INTERIORS: Record<Interior['tier'], Interior> = {
  room: {
    tier: 'room', width: 4.5, depth: 4.5, wallColor: '#d9cdb5', floorColor: '#8a6f55', window: 'small',
    furniture: [
      f('bed', -1.25, 1.2, 1.1, 0.5, 2.0, '#4b5d73'),
      f('wardrobe', 1.65, 1.6, 1.0, 2.0, 0.6, '#6b4a33'),
      f('table', 1.5, -0.6, 0.8, 0.75, 0.6, '#7a5a3e'),
      f('rug', -0.2, -0.2, 1.6, 0.01, 1.1, '#a3483a'),
    ],
  },
  flat: {
    tier: 'flat', width: 6.5, depth: 5.5, wallColor: '#e4d8c2', floorColor: '#9a7b5c', window: 'wide',
    furniture: [
      f('bed', -2.1, 1.65, 1.5, 0.55, 2.1, '#3f5a6b'),
      f('wardrobe', -0.6, 2.4, 1.2, 2.0, 0.6, '#5d4330'),
      f('sofa', 2.2, 0.6, 1.0, 0.85, 2.0, '#6d6a62'),
      f('tv', -0.2, -0.2, 1.1, 0.9, 0.35, '#1c1d20'),
      f('counter', 2.4, -2.1, 1.6, 0.92, 0.65, '#cfc6b6'),
      f('fridge', 1.25, -2.15, 0.7, 1.8, 0.65, '#d8d9d6'),
      f('rug', 1.1, 0.6, 1.6, 0.01, 2.0, '#2f6a73'),
      f('plant', -3.0, -2.3, 0.45, 1.1, 0.45, '#3f6b3a'),
    ],
  },
  apartment: {
    tier: 'apartment', width: 9, depth: 7, wallColor: '#ece4d6', floorColor: '#b08d68', window: 'wide',
    furniture: [
      f('bed', -3.2, 2.2, 1.8, 0.55, 2.2, '#2d4a5e'),
      f('wardrobe', -1.3, 3.15, 1.8, 2.1, 0.6, '#4f3a2a'),
      f('desk', 3.4, 2.9, 1.5, 0.75, 0.7, '#6e5038'),
      f('sofa', 2.9, -0.2, 2.4, 0.85, 1.0, '#7a3e3a'),
      f('table', 2.9, 1.25, 1.2, 0.45, 0.7, '#5a4330'),
      f('tv', 2.9, -2.1, 1.6, 1.0, 0.4, '#18191c'),
      f('counter', -3.4, -2.6, 1.8, 0.92, 0.7, '#d5ccbb'),
      f('fridge', -1.95, -3.0, 0.75, 1.85, 0.7, '#dcdcda'),
      f('rug', 2.9, 0.6, 3.0, 0.01, 2.2, '#c8a96a'),
      f('plant', 4.1, -3.0, 0.5, 1.3, 0.5, '#3f6b3a'),
      f('lamp', -0.3, 2.6, 0.4, 1.7, 0.4, '#e8d8b0'),
    ],
  },
  penthouse: {
    tier: 'penthouse', width: 13, depth: 9, wallColor: '#f1ede6', floorColor: '#d9d4cc', window: 'full',
    furniture: [
      f('bed', -4.8, 3.0, 2.2, 0.6, 2.3, '#e7e2d8'),
      f('wardrobe', -2.3, 4.15, 2.2, 2.2, 0.6, '#3a3a3c'),
      f('desk', -5.6, -0.4, 0.8, 0.75, 1.8, '#2b2b2d'),
      f('sofa', 3.5, 1.4, 3.2, 0.85, 1.1, '#3b4250'),
      f('sofa', 5.6, -0.6, 1.0, 0.85, 2.4, '#3b4250'),
      f('table', 3.5, -0.4, 1.6, 0.42, 0.9, '#c9c3b8'),
      f('tv', 3.5, -3.2, 2.2, 1.2, 0.4, '#151517'),
      f('counter', -3.6, -3.5, 3.0, 0.95, 0.8, '#efece6'),
      f('fridge', -1.6, -3.95, 0.8, 1.9, 0.75, '#c4c6c8'),
      f('rug', 3.5, 0.5, 4.0, 0.01, 3.2, '#8a7b66'),
      f('plant', 6.0, 3.8, 0.6, 1.6, 0.6, '#3f6b3a'),
      f('plant', 0.6, 3.9, 0.6, 1.6, 0.6, '#3f6b3a'),
      f('lamp', -6.0, 1.0, 0.4, 1.8, 0.4, '#efe2c0'),
    ],
  },
};

export function interiorFor(home: Home): Interior {
  if (home.rentPerNight < 120) return INTERIORS.room;
  if (home.rentPerNight < 300) return INTERIORS.flat;
  if (home.rentPerNight < 800) return INTERIORS.apartment;
  return INTERIORS.penthouse;
}

/** Where you stand just inside the front door. */
export const doorSpot = (i: Interior) => [0, -i.depth / 2 + 0.7] as const;
/** Where you stand to get into bed: beside it, on the room side. */
export function bedSpot(i: Interior): readonly [number, number] {
  const bed = i.furniture.find((x) => x.kind === 'bed')!;
  return [bed.at[0] + bed.size[0] / 2 + 0.45, bed.at[1]];
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
    // Front wall, either side of the door opening
    wall(-(w / 4 + 0.35), -d / 2 - WALL / 2, w / 2 - 0.7, WALL),
    wall(w / 4 + 0.35, -d / 2 - WALL / 2, w / 2 - 0.7, WALL),
    // The doorway itself: you leave with E, not by walking out
    wall(0, -d / 2 - WALL - 0.1, 1.4, WALL),
    ...i.furniture
      .filter((x) => x.kind !== 'rug')
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
    skyline: { seed: 1, warm: ['#000'], glass: ['#000'], towerChance: 0 },
  });
}
