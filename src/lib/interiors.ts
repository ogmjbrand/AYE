/**
 * Inside your home: one furnished room (or open-plan flat) per tier of rent.
 * Rooms are centred on the origin; the front door is in the middle of the
 * near wall (−Z) and the bed against the far wall. Furniture is solid.
 * Every home has somewhere to wash. Furniture you buy (lib/furniture.ts)
 * stands alongside these pieces.
 */
import { buildLayout, type Building, type DistrictLayout } from './world';
import type { Home } from './homes';

export type FurnitureKind =
  | 'bed' | 'sofa' | 'table' | 'counter' | 'wardrobe' | 'tv' | 'rug' | 'plant' | 'desk' | 'lamp' | 'fridge'
  | 'armchair' | 'shower' | 'bathtub' | 'bookshelf' | 'stove' | 'speaker' | 'console' | 'dresser' | 'art';

export interface Furniture {
  kind: FurnitureKind;
  /** Centre on the floor (x, z) in room coordinates. */
  at: readonly [number, number];
  /** Width (X), height, depth (Z). */
  size: readonly [number, number, number];
  color: string;
  /** The Luxe collection's designer look (lib/furniture.ts). */
  style?: 'luxe';
  /** Which Luxe design, for kinds that come in several (beds, storage). */
  design?: string;
}

export interface Interior {
  /** Rented: room to penthouse. Bought through OGM Homes: house (lower), family (middle class), villa (luxury). */
  tier: 'room' | 'flat' | 'apartment' | 'penthouse' | 'house' | 'family' | 'villa';
  width: number;
  depth: number;
  wallColor: string;
  floorColor: string;
  /** Big window on the far wall (penthouse: floor to ceiling). */
  window: 'small' | 'wide' | 'full';
  furniture: readonly Furniture[];
  /** Solid decor that isn't usable furniture (dining chairs, the fireplace, the study chair): x, z, width, depth. */
  solids?: readonly (readonly [number, number, number, number])[];
}

export const WALL_HEIGHT = 2.9;
/** Use radius for the bed and the door. */
export const USE_RADIUS = 1.4;

const f = (kind: FurnitureKind, x: number, z: number, w: number, h: number, d: number, color: string, style?: Furniture['style'], design?: string): Furniture =>
  ({ kind, at: [x, z], size: [w, h, d], color, ...(style ? { style } : {}), ...(design ? { design } : {}) });

export const INTERIORS: Record<Interior['tier'], Interior> = {
  room: {
    tier: 'room', width: 4.5, depth: 4.5, wallColor: '#d9cdb5', floorColor: '#8a6f55', window: 'small',
    furniture: [
      f('bed', -1.25, 1.2, 1.1, 0.5, 2.0, '#4b5d73'),
      f('wardrobe', 1.65, 1.6, 1.0, 2.0, 0.6, '#6b4a33'),
      f('table', 1.5, -0.6, 0.8, 0.75, 0.6, '#7a5a3e'),
      f('rug', -0.2, -0.2, 1.6, 0.01, 1.1, '#a3483a'),
      f('shower', -1.75, -1.75, 0.9, 2.1, 0.9, '#b9c9cf'),
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
      f('shower', -2.8, -0.6, 0.9, 2.1, 0.9, '#b9c9cf'),
    ],
  },
  apartment: {
    tier: 'apartment', width: 9, depth: 7, wallColor: '#ece4d6', floorColor: '#b08d68', window: 'wide',
    furniture: [
      f('bed', -3.2, 2.2, 1.8, 0.55, 2.2, '#2d4a5e'),
      f('wardrobe', -1.3, 3.15, 1.8, 2.1, 0.6, '#4f3a2a'),
      f('desk', 3.4, 2.9, 1.5, 0.75, 0.7, '#6e5038'),
      f('sofa', 2.9, -0.2, 2.4, 0.85, 1.0, '#e9e3d8', 'luxe'),
      f('table', 2.9, 1.25, 1.2, 0.45, 0.7, '#5a4330'),
      f('tv', 2.9, -2.1, 1.6, 1.0, 0.4, '#18191c'),
      f('counter', -3.4, -2.6, 1.8, 0.92, 0.7, '#d5ccbb'),
      f('fridge', -1.95, -3.0, 0.75, 1.85, 0.7, '#dcdcda'),
      f('rug', 2.9, 0.6, 3.0, 0.01, 2.2, '#c8a96a', 'luxe'),
      f('plant', 4.1, -3.0, 0.5, 1.3, 0.5, '#3f6b3a', 'luxe'),
      f('lamp', -0.3, 2.6, 0.4, 1.7, 0.4, '#e8d8b0'),
      f('shower', -4.0, -0.6, 0.9, 2.1, 0.9, '#b9c9cf'),
    ],
  },
  penthouse: {
    tier: 'penthouse', width: 13, depth: 9, wallColor: '#ece6dc', floorColor: '#e8e2d8', window: 'full',
    furniture: [
      f('bed', -4.8, 3.0, 2.2, 0.6, 2.3, '#e9e3d8', 'luxe', 'chevron'),
      // Gold-handled nightstands either side, and a marble wardrobe
      f('dresser', -6.2, 4.2, 0.5, 0.55, 0.45, '#8d8f93', 'luxe', 'nightstand'),
      f('dresser', -3.4, 4.2, 0.5, 0.55, 0.45, '#8d8f93', 'luxe', 'nightstand'),
      f('wardrobe', -1.85, 4.15, 2.2, 2.2, 0.6, '#f3f1ec', 'luxe', 'marble'),
      f('desk', -5.6, -0.4, 0.8, 0.75, 1.8, '#2b2b2d'),
      f('sofa', 3.5, 1.4, 3.2, 0.85, 1.1, '#e9e3d8', 'luxe'),
      f('sofa', 5.6, -0.6, 1.0, 0.85, 2.4, '#e9e3d8', 'luxe'),
      f('table', 3.5, -0.4, 1.6, 0.42, 0.9, '#c9c3b8', 'luxe'),
      f('tv', 3.5, -3.2, 2.2, 1.2, 0.4, '#2b2622', 'luxe'),
      f('counter', -3.6, -3.5, 3.0, 0.95, 0.8, '#efece6', 'luxe'),
      f('fridge', -1.6, -3.95, 0.8, 1.9, 0.75, '#c4c6c8'),
      f('rug', 3.5, 0.5, 4.0, 0.01, 3.2, '#8a7b66', 'luxe'),
      f('plant', 6.0, 3.8, 0.6, 1.6, 0.6, '#3f6b3a', 'luxe'),
      f('plant', 0.6, 3.9, 0.6, 1.6, 0.6, '#3f6b3a', 'luxe'),
      f('lamp', -6.0, 1.0, 0.4, 1.8, 0.4, '#efe2c0', 'luxe'),
      // Dining for four between the kitchen and the living room
      f('table', -1.4, -0.5, 2.0, 0.76, 1.7, '#f1ede6', 'luxe'),
      f('bathtub', -5.7, -2.2, 1.4, 0.6, 0.8, '#f2f1ee', 'luxe'),
    ],
  },
  // ---- Homes bought through OGM Homes (lib/homes.ts)
  // Starter home: a bright one-bedroom house, kitchen and table for two
  house: {
    tier: 'house', width: 7, depth: 6, wallColor: '#e8e0d0', floorColor: '#a07e5a', window: 'wide',
    furniture: [
      f('bed', -2.35, 1.85, 1.4, 0.55, 2.1, '#5b6f7f'),
      f('wardrobe', -0.75, 2.65, 1.2, 2.0, 0.6, '#6b4a33'),
      f('sofa', 2.75, 0.9, 0.95, 0.85, 1.9, '#8b7d70', 'luxe'),
      f('tv', 0.95, 0.9, 0.4, 0.9, 1.1, '#1c1d20'),
      f('rug', 1.85, 0.9, 1.5, 0.01, 1.8, '#a3483a'),
      f('table', 2.3, -1.7, 1.1, 0.75, 0.75, '#7a5a3e'),
      f('counter', -2.6, -2.62, 1.6, 0.92, 0.65, '#cfc6b6'),
      f('fridge', -1.4, -2.65, 0.7, 1.8, 0.6, '#d8d9d6'),
      f('shower', -3.0, -0.5, 0.9, 2.1, 0.9, '#b9c9cf'),
      f('plant', 3.15, -2.6, 0.45, 1.1, 0.45, '#3f6b3a', 'luxe'),
    ],
    // The two chairs at the table
    solids: [[1.55, -1.7, 0.45, 0.45], [3.05, -1.7, 0.45, 0.45]],
  },
  // Middle class: the family house. A living room round a brick fireplace with red
  // curtains, white sofa and armchairs; dining for six under wire pendants; a study
  // with an L-shaped desk, bookcase and framed certificates; the bed at the back
  family: {
    tier: 'family', width: 11, depth: 9, wallColor: '#dedad5', floorColor: '#c8ae8a', window: 'wide',
    furniture: [
      // Living room, facing the fireplace on the east wall
      f('sofa', 1.9, 1.5, 1.0, 0.85, 2.5, '#eceae6', 'luxe'),
      f('armchair', 4.0, 3.35, 0.95, 0.85, 0.95, '#eceae6', 'luxe'),
      f('armchair', 4.0, -0.35, 0.95, 0.85, 0.95, '#eceae6', 'luxe'),
      f('table', 3.15, 1.5, 0.75, 0.45, 1.35, '#5a3b28', 'luxe'),
      f('rug', 3.1, 1.5, 2.2, 0.01, 3.0, '#8e8c8a', 'luxe'),
      // Dining for six
      f('table', 3.1, -2.75, 1.9, 0.76, 0.95, '#5a3b28'),
      // Study by the front wall
      f('desk', -4.15, -3.85, 2.2, 0.76, 0.75, '#5a3424'),
      f('bookshelf', -5.25, -1.6, 0.45, 2.0, 1.6, '#5a3424', 'luxe'),
      // Bedroom at the back
      f('bed', -3.6, 3.3, 1.8, 0.55, 2.2, '#e8e2d8', 'luxe'),
      f('wardrobe', -1.35, 4.15, 1.5, 2.1, 0.6, '#5c4130'),
      f('dresser', -5.2, 4.2, 0.5, 0.6, 0.45, '#5c4130'),
      // Kitchen along the back wall
      f('counter', 1.05, 4.13, 2.0, 0.92, 0.65, '#d9d2c6'),
      f('fridge', 2.5, 4.15, 0.75, 1.85, 0.65, '#dcdcda'),
      f('shower', -5.0, 0.7, 0.9, 2.1, 0.9, '#b9c9cf'),
      f('plant', 5.1, -4.05, 0.5, 1.4, 0.5, '#3f6b3a', 'luxe'),
      f('plant', -0.35, 0.4, 0.45, 1.1, 0.45, '#3f6b3a', 'luxe'),
    ],
    solids: [
      // The fireplace's chimney breast and hearth
      [5.2, 1.5, 0.6, 2.0],
      // Six dining chairs
      ...[2.45, 3.1, 3.75].flatMap((x) => [[x, -3.55, 0.48, 0.48], [x, -1.95, 0.48, 0.48]] as const),
      // The desk's return, the study chair and the coat stand
      [-5.1, -2.95, 0.65, 1.05], [-4.0, -3.0, 0.6, 0.6], [-1.6, -4.1, 0.5, 0.5],
    ],
  },
  // Luxury: the villa. Marble floor, floor-to-ceiling glass, a fireplace in the
  // living room, dining for six, a study, and a bathtub
  villa: {
    tier: 'villa', width: 14, depth: 10, wallColor: '#ece6dc', floorColor: '#e8e2d8', window: 'full',
    furniture: [
      f('bed', -5.3, 3.6, 2.2, 0.6, 2.3, '#e9e3d8', 'luxe', 'chevron'),
      f('dresser', -6.7, 4.6, 0.5, 0.55, 0.45, '#8d8f93', 'luxe', 'nightstand'),
      f('dresser', -3.9, 4.6, 0.5, 0.55, 0.45, '#8d8f93', 'luxe', 'nightstand'),
      f('wardrobe', -2.2, 4.65, 2.2, 2.2, 0.6, '#f3f1ec', 'luxe', 'marble'),
      f('desk', -6.1, -0.9, 0.8, 0.75, 1.8, '#2b2b2d'),
      f('bookshelf', -6.75, 1.05, 0.4, 2.0, 1.4, '#3a2c22', 'luxe'),
      f('lamp', -6.7, 2.05, 0.4, 1.8, 0.4, '#efe2c0', 'luxe'),
      f('sofa', 3.9, 1.9, 3.2, 0.85, 1.1, '#e9e3d8', 'luxe'),
      f('sofa', 6.2, -0.4, 1.0, 0.85, 2.4, '#e9e3d8', 'luxe'),
      f('table', 3.9, 0.15, 1.6, 0.42, 0.9, '#c9c3b8', 'luxe'),
      f('rug', 3.9, 0.7, 4.2, 0.01, 3.4, '#8a7b66', 'luxe'),
      f('counter', -3.4, -4.0, 3.0, 0.95, 0.8, '#efece6', 'luxe'),
      f('fridge', -1.4, -4.45, 0.8, 1.9, 0.75, '#c4c6c8'),
      f('table', 2.0, -2.2, 2.4, 0.76, 1.8, '#f1ede6', 'luxe'),
      f('bathtub', -6.1, -3.6, 1.4, 0.6, 0.8, '#f2f1ee', 'luxe'),
      f('plant', 6.5, 4.4, 0.6, 1.6, 0.6, '#3f6b3a', 'luxe'),
      f('plant', 0.6, 4.4, 0.6, 1.6, 0.6, '#3f6b3a', 'luxe'),
    ],
    // The fireplace on the east wall
    solids: [[6.7, -3.6, 0.6, 2.0]],
  },
};

export function interiorFor(home: Home): Interior {
  if (home.tier) return INTERIORS[home.tier];
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

/** Walls and furniture (plus any pieces you've placed) as a collision layout (no streets: the floor is flat). */
export function interiorLayout(i: Interior, extra: readonly Furniture[] = []): DistrictLayout {
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
    ...[...i.furniture, ...extra]
      .filter((x) => x.kind !== 'rug' && x.kind !== 'art')
      .map((x): Building => ({ position: [x.at[0], 0, x.at[1]], size: x.size, color: x.color, style: 'residential' })),
    ...(i.solids ?? []).map(([x, z, sx, sz]): Building => ({ position: [x, 0, z], size: [sx, 1, sz], color: i.wallColor, style: 'residential' })),
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
