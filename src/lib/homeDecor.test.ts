import { describe, expect, it } from 'vitest';
import { INTERIORS, type Furniture, type Interior } from './interiors';
import {
  HOME_DECOR_ITEMS,
  canPlaceDecor,
  furnitureForHome,
  sanitiseHomeDecor,
} from './homeDecor';

const placement = {
  id: 'decor-1',
  itemId: 'decor-modern-sofa',
  homeId: 'lagos-room',
  at: [1, 2] as const,
  rotation: 0,
};

describe('home décor persistence', () => {
  it('keeps valid purchases, normalizes rotations, and discards invalid or duplicate records', () => {
    expect(sanitiseHomeDecor([
      placement,
      { ...placement, id: 'decor-rotated', rotation: -Math.PI / 2 },
      { ...placement, rotation: 1 },
      { ...placement, id: 'bad-item', itemId: 'unlisted' },
      { ...placement, id: 'bad-position', at: ['north', 1] },
    ])).toEqual([
      placement,
      { ...placement, id: 'decor-rotated', rotation: (Math.PI * 3) / 2 },
    ]);
  });

  it('renders only placed furniture assigned to the requested home', () => {
    expect(furnitureForHome([
      placement,
      { ...placement, id: 'inventory-item', at: null },
      { ...placement, id: 'other-home', homeId: 'another-home' },
    ], 'lagos-room')).toEqual([
      {
        kind: 'sofa',
        at: [1, 2],
        size: HOME_DECOR_ITEMS[0].size,
        color: HOME_DECOR_ITEMS[0].color,
        elevation: 0,
        rotation: 0,
      },
    ]);
  });
});

describe('furniture placement', () => {
  const room: Interior = { ...INTERIORS.room, width: 10, depth: 8, partitions: [], furniture: [] };
  const sofa = HOME_DECOR_ITEMS.find((item) => item.id === 'decor-modern-sofa')!;

  it('allows clear positions and rejects wall overflow or collisions', () => {
    const table: Furniture = { kind: 'table', at: [0, 0], size: [1, 1, 1], color: '#333' };
    expect(canPlaceDecor(room, sofa, [2, 2], 0, [])).toBe(true);
    expect(canPlaceDecor(room, sofa, [4.5, 0], 0, [])).toBe(false);
    expect(canPlaceDecor(room, sofa, [0, 0], 0, [table])).toBe(false);
    expect(canPlaceDecor(room, sofa, [2, 2], 0, [
      { kind: 'rug', at: [2, 2], size: [3, 0.02, 3], color: '#555' },
    ])).toBe(true);
  });

  it('requires wall art to be placed near a wall', () => {
    const art = HOME_DECOR_ITEMS.find((item) => item.id === 'decor-wall-art')!;
    expect(canPlaceDecor(room, art, [0, 0], 0, [])).toBe(false);
    expect(canPlaceDecor(room, art, [0, 3.4], 0, [])).toBe(true);
  });
});
