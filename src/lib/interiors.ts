/**
 * Inside your home: one furnished room (or open-plan flat) per tier of rent.
 * Rooms are centred on the origin; the front door is in the middle of the
 * near wall (−Z) and the bed against the far wall. Furniture is solid.
 * Every home has somewhere to wash. Furniture you buy (lib/furniture.ts)
 * stands alongside these pieces.
 */
import { buildLayout, type Building, type DistrictLayout } from './world';
import type { Home } from './homes';
import { VEHICLE_CATALOG } from './vehicleCatalog';

export type FurnitureKind =
  | 'bed' | 'sofa' | 'table' | 'counter' | 'wardrobe' | 'tv' | 'rug' | 'plant' | 'desk' | 'lamp' | 'fridge'
  | 'armchair' | 'shower' | 'bathtub' | 'bookshelf' | 'stove' | 'speaker' | 'console' | 'dresser' | 'art'
  | 'cabinet' | 'mirror' | 'sink' | 'toilet'
  | 'computer' | 'file-cabinet' | 'conference-table' | 'reception' | 'chair' | 'whiteboard'
  | 'dining-table' | 'dining-chair' | 'host-stand' | 'clothing-rack' | 'mannequin' | 'display-shelf' | 'checkout-counter'
  | 'wall-art';

export type HomeAction = 'door' | 'bed' | 'wardrobe' | 'mirror' | 'sofa' | 'tv' | 'kitchen' | 'bathroom';

export interface InteriorWall {
  position: readonly [number, number, number];
  size: readonly [number, number, number];
  material?: 'solid' | 'glass';
}

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
  /** Height off the floor (wall cabinets, mirrors). */
  elevation?: number;
  /** Turn about the vertical, in radians. */
  rotation?: number;
}

export interface Interior {
  /** Rented: room to penthouse. Bought through OGM Homes: house (lower), family (middle class), villa (luxury), the lofts. */
  tier: 'room' | 'flat' | 'apartment' | 'penthouse' | 'house' | 'family' | 'villa' | 'loft' | 'warehouse';
  architecture: 'residential' | 'office' | 'restaurant' | 'boutique' | 'dealership';
  width: number;
  depth: number;
  wallColor: string;
  floorColor: string;
  /** Big window on the far wall (penthouse: floor to ceiling). */
  window: 'small' | 'wide' | 'full';
  /** Non-load-bearing interior walls, with central openings between rooms. */
  partitions: readonly InteriorWall[];
  furniture: readonly Furniture[];
  /** Exposed brick walls (the lofts) instead of plaster. */
  brick?: boolean;
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
    tier: 'room', architecture: 'residential', partitions: [], width: 4.5, depth: 4.5, wallColor: '#d9cdb5', floorColor: '#8a6f55', window: 'small',
    furniture: [
      f('bed', -1.25, 1.2, 1.1, 0.5, 2.0, '#4b5d73'),
      f('wardrobe', 1.65, 1.6, 1.0, 2.0, 0.6, '#6b4a33'),
      f('table', 1.5, -0.6, 0.8, 0.75, 0.6, '#7a5a3e'),
      f('rug', -0.2, -0.2, 1.6, 0.01, 1.1, '#a3483a'),
      f('shower', -1.75, -1.75, 0.9, 2.1, 0.9, '#b9c9cf'),
    ],
  },
  flat: {
    tier: 'flat', architecture: 'residential', partitions: [], width: 6.5, depth: 5.5, wallColor: '#e4d8c2', floorColor: '#9a7b5c', window: 'wide',
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
    tier: 'apartment', architecture: 'residential', partitions: [], width: 9, depth: 7, wallColor: '#ece4d6', floorColor: '#b08d68', window: 'wide',
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
    tier: 'penthouse', architecture: 'residential', partitions: [], width: 13, depth: 9, wallColor: '#ece6dc', floorColor: '#e8e2d8', window: 'full',
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
    tier: 'house', architecture: 'residential', partitions: [], width: 7, depth: 6, wallColor: '#e8e0d0', floorColor: '#a07e5a', window: 'wide',
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
    tier: 'family', architecture: 'residential', partitions: [], width: 11, depth: 9, wallColor: '#dedad5', floorColor: '#c8ae8a', window: 'wide',
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
  // The attic loft studio: exposed brick, oak floor, the Studio collection
  loft: {
    tier: 'loft', architecture: 'residential', partitions: [], width: 8, depth: 6.5, wallColor: '#d9cfc2', floorColor: '#b08d68', window: 'wide', brick: true,
    furniture: [
      f('bed', -2.95, 2.0, 1.6, 0.5, 2.1, '#e9e3d8', 'luxe'),
      f('rug', 1.4, 0.4, 2.4, 0.01, 1.8, '#c8b89c', 'luxe'),
      f('sofa', 1.4, 2.6, 2.2, 0.8, 0.95, '#ece6da', undefined, 'studio-sofa'),
      f('table', 1.4, 1.05, 0.9, 0.42, 0.55, '#c9c3b8', 'luxe'),
      f('tv', 1.4, -1.0, 1.6, 0.9, 0.42, '#2b2622', 'luxe'),
      f('armchair', 3.4, 0.4, 0.85, 1.1, 0.85, '#e8e2d6', undefined, 'studio-egg-chair'),
      f('lamp', 3.55, 2.75, 0.45, 1.6, 0.45, '#efe6d4', undefined, 'studio-tripod-lamp'),
      f('speaker', -0.7, 2.95, 0.5, 1.5, 0.4, '#c58a4a', undefined, 'studio-guitar'),
      f('art', 1.4, 3.2, 1.3, 0.4, 0.06, '#1b1b1d', undefined, 'studio-records'),
      f('bookshelf', -3.25, -0.6, 0.35, 0.8, 1.4, '#b58a5a', undefined, 'studio-low-shelf'),
      f('counter', -2.4, -2.88, 1.8, 0.92, 0.65, '#d9d2c6'),
      f('fridge', -0.95, -2.9, 0.7, 1.8, 0.6, '#dadcdd'),
      f('shower', 3.45, -2.6, 0.9, 2.1, 0.9, '#b9c9cf'),
      f('dresser', 2.3, -2.95, 0.45, 1.8, 0.45, '#5a3a24', undefined, 'studio-coat-stand'),
      f('plant', 3.55, -1.0, 0.45, 1.3, 0.45, '#e6d6b8', undefined, 'studio-pampas'),
    ],
  },
  // The warehouse loft: a big brick-walled open plan, the Studio collection and Luxe pieces
  warehouse: {
    tier: 'warehouse', architecture: 'residential', partitions: [], width: 12, depth: 8.5, wallColor: '#d9cfc2', floorColor: '#b08d68', window: 'wide', brick: true,
    furniture: [
      f('bed', -4.3, 3.0, 2.0, 0.6, 2.2, '#3b3c41', 'luxe', 'arch'),
      f('dresser', -5.65, 3.95, 0.5, 0.55, 0.45, '#8d8f93', 'luxe', 'nightstand'),
      f('dresser', -2.95, 3.95, 0.5, 0.55, 0.45, '#8d8f93', 'luxe', 'nightstand'),
      f('dresser', -1.6, 3.95, 0.8, 0.7, 0.4, '#d9cdb6', undefined, 'studio-boxes'),
      f('rug', 2.5, 0.8, 3.0, 0.01, 2.4, '#c8b89c', 'luxe'),
      f('sofa', 2.5, 2.85, 2.6, 0.8, 1.05, '#ece6da', undefined, 'studio-sofa'),
      f('table', 2.5, 1.0, 1.1, 0.4, 1.1, '#f1ede6', 'luxe'),
      f('tv', 2.5, -1.05, 2.0, 1.45, 0.45, '#2b2622', 'luxe'),
      f('armchair', 4.9, 0.9, 0.85, 1.1, 0.85, '#e8e2d6', undefined, 'studio-egg-chair'),
      f('armchair', 0.1, 0.9, 0.85, 0.8, 0.85, '#1f5a47', 'luxe'),
      f('lamp', 5.45, 3.75, 0.45, 1.6, 0.45, '#efe6d4', undefined, 'studio-tripod-lamp'),
      f('speaker', -0.6, 3.85, 0.5, 1.5, 0.4, '#c58a4a', undefined, 'studio-guitar'),
      f('art', 2.5, 4.2, 1.45, 0.5, 0.06, '#b58a5a', undefined, 'studio-prints'),
      f('art', -5.97, 0.6, 0.06, 0.4, 1.3, '#1b1b1d', undefined, 'studio-records'),
      f('counter', -3.6, -2.7, 2.0, 0.95, 0.9, '#efece6', 'luxe'),
      f('fridge', -5.6, -3.85, 0.8, 1.9, 0.75, '#c4c6c8'),
      f('table', -1.3, -1.9, 1.8, 0.76, 1.6, '#f1ede6', 'luxe'),
      f('bookshelf', 5.8, -1.6, 0.35, 0.8, 1.4, '#b58a5a', undefined, 'studio-low-shelf'),
      f('bathtub', 5.2, -3.6, 1.4, 0.6, 0.8, '#f2f1ee', 'luxe'),
      f('dresser', 3.6, -3.95, 0.45, 1.8, 0.45, '#5a3a24', undefined, 'studio-coat-stand'),
      f('plant', -2.3, 0.9, 0.45, 1.3, 0.45, '#e6d6b8', undefined, 'studio-pampas'),
      f('plant', 5.6, 2.0, 0.6, 1.6, 0.6, '#3f6b3a', 'luxe'),
    ],
  },
  // Luxury: the villa. Marble floor, floor-to-ceiling glass, a fireplace in the
  // living room, dining for six, a study, and a bathtub
  villa: {
    tier: 'villa', architecture: 'residential', partitions: [], width: 14, depth: 10, wallColor: '#ece6dc', floorColor: '#e8e2d8', window: 'full',
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

/** Furniture for the walk-in venues below: an optional height off the floor and a turn. */
const fx = (
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

export interface RestaurantTable {
  id: string;
  at: readonly [number, number];
  seats: readonly {
    id: string;
    x: number;
    z: number;
    facing: number;
    height: number;
  }[];
}

export const RESTAURANT_TABLES: readonly RestaurantTable[] = [
  { id: 'table-1', at: [-4, 0.5], seats: [
    { id: 'table-1-west', x: -6, z: 0.5, facing: Math.PI / 2, height: 0.45 },
    { id: 'table-1-east', x: -2, z: 0.5, facing: -Math.PI / 2, height: 0.45 },
  ] },
  { id: 'table-2', at: [4, 0.5], seats: [
    { id: 'table-2-west', x: 2, z: 0.5, facing: Math.PI / 2, height: 0.45 },
    { id: 'table-2-east', x: 6, z: 0.5, facing: -Math.PI / 2, height: 0.45 },
  ] },
  { id: 'table-3', at: [-4, 4.5], seats: [
    { id: 'table-3-west', x: -6, z: 4.5, facing: Math.PI / 2, height: 0.45 },
    { id: 'table-3-east', x: -2, z: 4.5, facing: -Math.PI / 2, height: 0.45 },
  ] },
  { id: 'table-4', at: [4, 4.5], seats: [
    { id: 'table-4-west', x: 2, z: 4.5, facing: Math.PI / 2, height: 0.45 },
    { id: 'table-4-east', x: 6, z: 4.5, facing: -Math.PI / 2, height: 0.45 },
  ] },
];

export const RESTAURANT_INTERIOR: Interior = {
  tier: 'flat',
  architecture: 'restaurant',
  width: 18,
  depth: 14,
  wallColor: '#302721',
  floorColor: '#b7a98f',
  window: 'wide',
  partitions: [],
  furniture: [
    fx('host-stand', 0, -3, 2.2, 1.05, 0.75, '#4a3324'),
    fx('counter', -7, 6.1, 3.2, 0.92, 0.9, '#49372a'),
    fx('cabinet', -7, 6.1, 3.0, 0.78, 0.82, '#49372a', 0.98),
    ...RESTAURANT_TABLES.map(({ id, at }): Furniture => ({
      kind: 'dining-table',
      at,
      size: [1.65, 0.78, 0.95],
      color: id === 'table-1' || id === 'table-4' ? '#684a31' : '#795a3b',
      rotation: 0,
    })),
    ...RESTAURANT_TABLES.flatMap(({ seats }) => seats.map((seat): Furniture => ({
      kind: 'dining-chair',
      at: [seat.x, seat.z],
      size: [0.68, 0.92, 0.68],
      color: '#47362c',
      rotation: seat.facing,
    }))),
    fx('plant', -7.4, -4.2, 0.65, 1.5, 0.65, '#55734b'),
    fx('plant', 7.4, 5.8, 0.65, 1.5, 0.65, '#55734b'),
  ],
};

export type RestaurantInteraction = 'door' | 'host';

export const FASHION_HOUSE_INTERIOR: Interior = {
  tier: 'flat',
  architecture: 'boutique',
  width: 18,
  depth: 14,
  wallColor: '#211b19',
  floorColor: '#d2c9bb',
  window: 'wide',
  partitions: [
    { position: [-5.8, 1.25, -4.05], size: [2.1, 2.5, 0.12] },
    { position: [5.8, 1.25, -4.05], size: [2.1, 2.5, 0.12] },
  ],
  furniture: [
    fx('checkout-counter', 0, 4.45, 3.1, 1.0, 0.82, '#332a25'),
    fx('clothing-rack', -4.1, -0.7, 2.7, 1.7, 0.7, '#c9a35e'),
    fx('clothing-rack', 4.1, -0.7, 2.7, 1.7, 0.7, '#c9a35e'),
    fx('clothing-rack', -4.1, 3.5, 2.7, 1.7, 0.7, '#c9a35e'),
    fx('mannequin', -7.1, 1.8, 0.62, 1.9, 0.62, '#d8c7b2'),
    fx('mannequin', 7.1, 1.8, 0.62, 1.9, 0.62, '#d8c7b2'),
    fx('display-shelf', 0, 6.2, 5.2, 2.15, 0.54, '#3c3028'),
    fx('mirror', -8.15, -1.15, 0.1, 2.35, 1.25, '#c9a35e', 0.08),
    fx('plant', -7.7, -5.1, 0.55, 1.3, 0.55, '#486b45'),
    fx('plant', 7.7, -5.1, 0.55, 1.3, 0.55, '#486b45'),
  ],
};

export const CAR_DEALERSHIP_INTERIOR: Interior = {
  tier: 'apartment',
  architecture: 'dealership',
  width: 22,
  depth: 18,
  wallColor: '#293237',
  floorColor: '#c6c3bb',
  window: 'wide',
  partitions: [
    { position: [-7.2, 1.35, 4.2], size: [6, 2.7, 0.12], material: 'glass' },
    { position: [7.2, 1.35, 4.2], size: [6, 2.7, 0.12], material: 'glass' },
  ],
  furniture: [
    fx('reception', 0, -4.8, 4.2, 1.05, 1.0, '#3c3832'),
    fx('display-shelf', -8.2, 0.5, 0.5, 1.65, 2.2, '#5d5547'),
    fx('display-shelf', 8.2, 0.5, 0.5, 1.65, 2.2, '#5d5547'),
    fx('plant', -9.1, -6.4, 0.75, 1.5, 0.75, '#517247'),
    fx('plant', 9.1, -6.4, 0.75, 1.5, 0.75, '#517247'),
  ],
};

export type DealershipInteraction = 'door' | 'salesperson' | { type: 'vehicle'; modelId: string };

export function dealershipInteractionAt(x: number, z: number): DealershipInteraction | null {
  const [doorX, doorZ] = doorSpot(CAR_DEALERSHIP_INTERIOR);
  if (Math.hypot(x - doorX, z - doorZ) <= USE_RADIUS) return 'door';
  const displayed = VEHICLE_CATALOG.slice(0, 3).find((_, index) =>
    Math.hypot(x - (index * 6 - 6), z - 1.4) <= USE_RADIUS + 1.2,
  );
  if (displayed) return { type: 'vehicle', modelId: displayed.id };
  const desk = CAR_DEALERSHIP_INTERIOR.furniture.find((item) => item.kind === 'reception');
  if (!desk) return null;
  const dx = Math.max(Math.abs(x - desk.at[0]) - desk.size[0] / 2, 0);
  const dz = Math.max(Math.abs(z - desk.at[1]) - desk.size[2] / 2, 0);
  return Math.hypot(dx, dz) <= USE_RADIUS ? 'salesperson' : null;
}

export type FashionHouseInteraction = 'door' | 'catalogue';

export function fashionHouseInteractionAt(x: number, z: number): FashionHouseInteraction | null {
  const [doorX, doorZ] = doorSpot(FASHION_HOUSE_INTERIOR);
  if (Math.hypot(x - doorX, z - doorZ) <= USE_RADIUS) return 'door';
  const fixtures = FASHION_HOUSE_INTERIOR.furniture.filter((item) =>
    item.kind === 'clothing-rack' || item.kind === 'checkout-counter',
  );
  let nearest = Infinity;
  for (const item of fixtures) {
    const dx = Math.max(Math.abs(x - item.at[0]) - item.size[0] / 2, 0);
    const dz = Math.max(Math.abs(z - item.at[1]) - item.size[2] / 2, 0);
    nearest = Math.min(nearest, Math.hypot(dx, dz));
  }
  return nearest <= USE_RADIUS ? 'catalogue' : null;
}

export function restaurantInteractionAt(x: number, z: number): RestaurantInteraction | null {
  const [doorX, doorZ] = doorSpot(RESTAURANT_INTERIOR);
  if (Math.hypot(x - doorX, z - doorZ) <= USE_RADIUS) return 'door';
  const host = RESTAURANT_INTERIOR.furniture.find((item) => item.kind === 'host-stand');
  if (!host) return null;
  const dx = Math.max(Math.abs(x - host.at[0]) - host.size[0] / 2, 0);
  const dz = Math.max(Math.abs(z - host.at[1]) - host.size[2] / 2, 0);
  return Math.hypot(dx, dz) <= USE_RADIUS ? 'host' : null;
}

export function restaurantTableById(id: string): RestaurantTable | undefined {
  return RESTAURANT_TABLES.find((table) => table.id === id);
}

export function interiorFor(home: Home): Interior {
  if (home.tier) return INTERIORS[home.tier];
  if (home.rentPerNight < 120) return INTERIORS.room;
  if (home.rentPerNight < 300) return INTERIORS.flat;
  if (home.rentPerNight < 800) return INTERIORS.apartment;
  return INTERIORS.penthouse;
}

/** Where you stand just inside the front door. */
export const doorSpot = (i: Interior) => [0, -i.depth / 2 + 0.7] as const;
/** Where you stand to get into bed: in the clear aisle beside it. */
export function bedSpot(i: Interior): readonly [number, number] {
  const bed = i.furniture.find((x) => x.kind === 'bed')!;
  return [bed.at[0] + bed.size[0] / 2 + 0.45, bed.at[1]];
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

/** Walls and furniture (plus any pieces you've placed) as a collision layout (no streets: the floor is flat). */
export function interiorLayout(i: Interior, extra: readonly Furniture[] = []): DistrictLayout {
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
    wall(0, -d / 2 - WALL - 0.1, 1.4, WALL),
    ...i.partitions.map((p): Building => ({
      position: p.position,
      size: p.size,
      color: i.wallColor,
      style: 'residential',
    })),
    ...[...i.furniture, ...extra]
      .filter((x) => !['rug', 'art', 'cabinet', 'mirror', 'computer', 'whiteboard', 'chair', 'dining-chair', 'wall-art'].includes(x.kind))
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
