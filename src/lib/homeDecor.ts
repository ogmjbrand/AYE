import type { Furniture, FurnitureKind, Interior } from './interiors';

export interface DecorItem {
  id: string;
  name: string;
  room: 'Living Room' | 'Bedroom' | 'Kitchen' | 'Bathroom';
  price: number;
  kind: FurnitureKind;
  size: readonly [number, number, number];
  color: string;
}

export interface HomeDecorPlacement {
  id: string;
  itemId: string;
  homeId: string;
  at: readonly [number, number] | null;
  rotation: number;
}

export const HOME_DECOR_ITEMS: readonly DecorItem[] = [
  { id: 'decor-modern-sofa', name: 'Modern Sofa', room: 'Living Room', price: 12_000, kind: 'sofa', size: [2.2, 0.85, 1.0], color: '#b9b0a4' },
  { id: 'decor-accent-chair', name: 'Accent Chair', room: 'Living Room', price: 5_500, kind: 'chair', size: [0.82, 0.92, 0.82], color: '#315144' },
  { id: 'decor-coffee-table', name: 'Coffee Table', room: 'Living Room', price: 4_800, kind: 'table', size: [1.1, 0.45, 0.72], color: '#d5c9b5' },
  { id: 'decor-dining-table', name: 'Dining Table', room: 'Kitchen', price: 18_000, kind: 'dining-table', size: [1.6, 0.8, 0.9], color: '#79583d' },
  { id: 'decor-bookshelf', name: 'Bookshelf', room: 'Bedroom', price: 9_500, kind: 'display-shelf', size: [1.15, 2.0, 0.48], color: '#46352b' },
  { id: 'decor-floor-lamp', name: 'Floor Lamp', room: 'Living Room', price: 3_200, kind: 'lamp', size: [0.42, 1.7, 0.42], color: '#e0d0b2' },
  { id: 'decor-wall-art', name: 'Wall Art', room: 'Bedroom', price: 2_400, kind: 'wall-art', size: [1.15, 0.85, 0.08], color: '#c9a35e' },
  { id: 'decor-rug', name: 'Rug', room: 'Living Room', price: 4_000, kind: 'rug', size: [2.4, 0.02, 1.7], color: '#5d5148' },
  { id: 'decor-indoor-plant', name: 'Indoor Plant', room: 'Living Room', price: 2_200, kind: 'plant', size: [0.58, 1.2, 0.58], color: '#496c46' },
  { id: 'decor-tv-console', name: 'TV Console', room: 'Living Room', price: 9_500, kind: 'tv', size: [1.8, 1.1, 0.5], color: '#4b392c' },
  { id: 'decor-bathroom-mirror', name: 'Bathroom Mirror', room: 'Bathroom', price: 3_200, kind: 'mirror', size: [0.9, 1.2, 0.08], color: '#b9c8c8' },
  { id: 'decor-bathroom-sink', name: 'Bathroom Sink', room: 'Bathroom', price: 4_600, kind: 'sink', size: [0.9, 0.9, 0.58], color: '#dedbd2' },
  { id: 'decor-toilet', name: 'Toilet', room: 'Bathroom', price: 5_000, kind: 'toilet', size: [0.62, 0.78, 0.9], color: '#e5e5e1' },
  { id: 'decor-shower', name: 'Shower', room: 'Bathroom', price: 8_500, kind: 'shower', size: [1.15, 2.15, 1.15], color: '#a8c0c5' },
];

export const decorItemById = (id: string | null | undefined) =>
  HOME_DECOR_ITEMS.find((item) => item.id === id);

export function sanitiseHomeDecor(data: unknown): HomeDecorPlacement[] {
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const result: HomeDecorPlacement[] = [];
  for (const entry of data) {
    if (typeof entry !== 'object' || entry === null) continue;
    const value = entry as Record<string, unknown>;
    if (
      typeof value.id !== 'string' || value.id.length === 0 || seen.has(value.id)
      || typeof value.homeId !== 'string' || value.homeId.length === 0
      || typeof value.itemId !== 'string' || !decorItemById(value.itemId)
    ) continue;
    if (value.at !== null && value.at !== undefined && (
      !Array.isArray(value.at) || value.at.length !== 2
      || !value.at.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate))
    )) continue;
    const at = Array.isArray(value.at) ? [value.at[0], value.at[1]] as const : null;
    const rotation = typeof value.rotation === 'number' && Number.isFinite(value.rotation)
      ? ((value.rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
      : 0;
    seen.add(value.id);
    result.push({ id: value.id, itemId: value.itemId, homeId: value.homeId, at, rotation });
  }
  return result;
}

export function furnitureForHome(placements: readonly HomeDecorPlacement[], homeId: string): Furniture[] {
  return placements.flatMap((placement) => {
    const item = decorItemById(placement.itemId);
    if (!item || placement.homeId !== homeId || !placement.at) return [];
    return [{
      kind: item.kind,
      at: placement.at,
      size: item.size,
      color: item.color,
      elevation: item.kind === 'wall-art' ? 1.35 : 0,
      rotation: placement.rotation,
    }];
  });
}

function blocksPlacement(kind: FurnitureKind): boolean {
  return !['rug', 'cabinet', 'mirror', 'computer', 'whiteboard', 'chair', 'dining-chair', 'wall-art'].includes(kind);
}

export function canPlaceDecor(
  interior: Interior,
  item: DecorItem,
  at: readonly [number, number],
  rotation: number,
  existing: readonly Furniture[],
): boolean {
  const quarterTurn = Math.round(rotation / (Math.PI / 2));
  const [width, , depth] = item.size;
  const rotated = Math.abs(quarterTurn) % 2 === 1;
  const itemWidth = rotated ? depth : width;
  const itemDepth = rotated ? width : depth;
  const [x, z] = at;
  if (
    Math.abs(x) + itemWidth / 2 > interior.width / 2 - 0.1
    || Math.abs(z) + itemDepth / 2 > interior.depth / 2 - 0.1
  ) return false;
  if (item.kind === 'wall-art') {
    const distanceToWall = Math.min(
      interior.width / 2 - Math.abs(x),
      interior.depth / 2 - Math.abs(z),
    );
    if (distanceToWall > 1.2) return false;
  }
  if (interior.partitions.some((wall) =>
    Math.abs(x - wall.position[0]) < (itemWidth + wall.size[0]) / 2
    && Math.abs(z - wall.position[2]) < (itemDepth + wall.size[2]) / 2,
  )) return false;
  if (item.kind !== 'rug' && existing.some((other) => {
    if (!blocksPlacement(other.kind) || other.kind === 'rug') return false;
    const rotatedOther = Math.abs(Math.round((other.rotation ?? 0) / (Math.PI / 2))) % 2 === 1;
    const otherWidth = rotatedOther ? other.size[2] : other.size[0];
    const otherDepth = rotatedOther ? other.size[0] : other.size[2];
    return Math.abs(x - other.at[0]) < (itemWidth + otherWidth) / 2
      && Math.abs(z - other.at[1]) < (itemDepth + otherDepth) / 2;
  })) return false;
  return true;
}
