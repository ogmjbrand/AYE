/**
 * The Fashion House: a boutique and salon you walk into from the street, in
 * every city (its counter on the street is the door). Inside: mannequins,
 * clothes rails, shelves of bags and shoes, a lounge, a salon chair, a fitting
 * room and a reception desk where the store assistant (computer-controlled)
 * helps you explore the collections.
 *
 * What you can buy is the district's own range (lib/fashion.ts `stockedIn`).
 * With the current character models, clothes restyle the fabric of what your
 * character already wears; new cuts (dresses, jackets) need new 3D garments,
 * so outerwear says so instead of selling anything; a dress is sold as a look
 * that restyles your top and bottom in its fabric. Accessories are bags
 * carried in the hand (world/HeldBag.tsx), and jewellery, sunglasses and
 * nails drawn on the body (world/Adornments.tsx).
 */
import { buildLayout, type Building, type DistrictLayout } from './world';
import { stockedIn, type FashionItem } from './fashion';

export type BoutiqueSection = 'clothes' | 'shoes' | 'hair' | 'accessories';
export type ClothesTab = 'all' | 'tops' | 'dresses' | 'bottoms' | 'outerwear' | 'sets';

export const CLOTHES_TABS: readonly { id: ClothesTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'tops', label: 'Tops' },
  { id: 'dresses', label: 'Dresses' },
  { id: 'bottoms', label: 'Bottoms' },
  { id: 'outerwear', label: 'Jackets / Outerwear' },
  { id: 'sets', label: 'Sets' },
];

export type AccessoryTab = 'bags' | 'necklaces' | 'earrings' | 'wrist' | 'rings' | 'sunglasses';
export const ACCESSORY_TABS: readonly { id: AccessoryTab; label: string; slot: FashionItem['slot'] }[] = [
  { id: 'bags', label: 'Bags', slot: 'bag' },
  { id: 'necklaces', label: 'Necklaces', slot: 'neck' },
  { id: 'earrings', label: 'Earrings', slot: 'ears' },
  { id: 'wrist', label: 'Watches & bangles', slot: 'wrist' },
  { id: 'rings', label: 'Rings', slot: 'rings' },
  { id: 'sunglasses', label: 'Sunglasses', slot: 'eyes' },
];
export type HairTab = 'colour' | 'nails';
export const HAIR_TABS: readonly { id: HairTab; label: string; slot: FashionItem['slot'] }[] = [
  { id: 'colour', label: 'Hair colour', slot: 'hair' },
  { id: 'nails', label: 'Nails', slot: 'nails' },
];
export type ShopTab = ClothesTab | AccessoryTab | HairTab;

/** What a dress look does on today's characters, shown on the Dresses tab. */
export const DRESS_NOTE = 'A dress restyles your top and bottom together in the dress’s fabric and print. The cut stays your character’s own until new 3D dresses arrive.';

/** Cuts the current characters can't wear yet: these tabs explain instead of selling. */
export const NOT_YET: Partial<Record<ShopTab | BoutiqueSection, string>> = {
  outerwear: 'Jackets and coats need new 3D clothes on your character. They aren’t in the game yet, so none are for sale. A top restyles a jacket you already have on.',
};

/** A matching top and bottom in the same fabric, sold together. */
export interface FashionSet {
  id: string;
  name: string;
  top: FashionItem;
  bottom: FashionItem;
  price: number;
}

/** Every matching top-and-bottom pair this district's boutique stocks (dresses: only the dress looks). */
export function setsIn(districtId: string, dresses?: boolean): FashionSet[] {
  const range = stockedIn(districtId).filter((i) => i.collection !== 'Rewards');
  const out: FashionSet[] = [];
  for (const top of range.filter((i) => i.slot === 'top')) {
    const bottom = range.find((i) => i.slot === 'bottom' && i.id === top.id.replace(/^top-/, 'bottom-'));
    if (!bottom || (dresses !== undefined && !!top.dress !== dresses)) continue;
    // A dress is named as the dress ("Satin cowl halter dress · Gold"), a set by its top
    const name = top.dress ? top.name.replace(/ · bodice$/, '') : `${top.name.split(' · ')[0]} set${top.name.includes(' · ') ? ` · ${top.name.split(' · ')[1]}` : ''}`;
    out.push({ id: `set-${top.id.slice(4)}`, name, top, bottom, price: top.price + bottom.price });
  }
  return out;
}

/** What the boutique sells in a section (never the earned-only rewards). */
export function rangeFor(districtId: string, section: BoutiqueSection, tab: ShopTab = 'all'): FashionItem[] {
  let range = stockedIn(districtId).filter((i) => i.collection !== 'Rewards');
  if (section === 'shoes') return range.filter((i) => i.slot === 'shoes');
  if (section === 'hair') {
    const slot = HAIR_TABS.find((t) => t.id === tab)?.slot;
    return range.filter((i) => (slot ? i.slot === slot : i.slot === 'hair' || i.slot === 'nails'));
  }
  if (section === 'accessories') {
    const slot = ACCESSORY_TABS.find((t) => t.id === tab)?.slot;
    return range.filter((i) => (slot ? i.slot === slot : ['bag', 'neck', 'ears', 'wrist', 'rings', 'eyes'].includes(i.slot)));
  }
  // A dress's two halves are sold together on the Dresses tab, not as separate tops and skirts
  const dressPart = (i: FashionItem) => !!i.dress || (i.slot === 'bottom' && !!range.find((t) => t.id === i.id.replace(/^bottom-/, 'top-'))?.dress);
  range = range.filter((i) => !dressPart(i));
  if (tab === 'tops') return range.filter((i) => i.slot === 'top');
  if (tab === 'bottoms') return range.filter((i) => i.slot === 'bottom');
  if (tab === 'all') return range.filter((i) => i.slot === 'top' || i.slot === 'bottom');
  return [];
}

/** Cart total, skipping anything already owned. */
export const cartTotal = (items: readonly FashionItem[], owned: readonly string[]) =>
  items.filter((i) => !owned.includes(i.id)).reduce((sum, i) => sum + i.price, 0);

// ---------------------------------------------------------------- the room

export const ROOM = { width: 15, depth: 11 } as const;
export const ROOM_HEIGHT = 3.8;
export const DOOR_SPOT = [0, -ROOM.depth / 2 + 0.8] as const;

/** Reception desk on the right as you come in; the assistant stands behind it. */
export const DESK = { x: 3.6, z: -2.2, w: 2.2, d: 0.75, h: 1.05 } as const;
export const DESK_SPOT = [DESK.x, DESK.z - 0.95] as const;
/** The fitting room (curtained) in the back-left corner, and its curtain. */
export const FITTING = { x: -6.2, z: 3.9, w: 2.2, d: 2.6 } as const;
export const FITTING_SPOT = [FITTING.x + FITTING.w / 2 + 0.6, FITTING.z - 0.4] as const;
/** The salon chair and mirror on the back wall. */
export const SALON = { x: 1.2, z: ROOM.depth / 2 - 1.1 } as const;
export const SALON_SPOT = [SALON.x, SALON.z - 1.0] as const;

export const STAFF = {
  assistant: { lookId: 'female-adult-06', name: 'Kemi', role: 'Store Assistant', x: DESK.x, z: DESK.z + 0.75, facing: Math.PI },
  stylist: { lookId: 'female-adult-03', name: 'Bisi', role: 'Hair Stylist', x: SALON.x + 0.95, z: SALON.z - 0.3, facing: -Math.PI / 2 },
} as const;

/** Rails of clothes, shelves of bags and shoes, mannequins and the lounge. */
export const RAILS: readonly { x: number; z: number; len: number; along: 'x' | 'z' }[] = [
  { x: -6.9, z: -1.6, len: 3.6, along: 'z' },
  { x: 6.9, z: 2.0, len: 3.6, along: 'z' },
  { x: -2.4, z: 2.6, len: 2.4, along: 'x' },
];
export const SHELVES: readonly { x: number; z: number; len: number; kind: 'bags' | 'shoes' }[] = [
  { x: -3.4, z: ROOM.depth / 2 - 0.3, len: 3.0, kind: 'bags' },
  { x: 4.6, z: ROOM.depth / 2 - 0.3, len: 3.0, kind: 'shoes' },
];
export const MANNEQUINS: readonly { x: number; z: number; facing: number; dress: string; trim: string }[] = [
  { x: -2.2, z: -3.6, facing: 0.2, dress: '#1f5a47', trim: '#c9a052' },
  { x: -0.9, z: -3.9, facing: 0, dress: '#b4543a', trim: '#f0d6a0' },
  { x: 0.6, z: 0.4, facing: -0.3, dress: '#2a2f5a', trim: '#d9b66a' },
  { x: -4.4, z: 0.8, facing: 0.5, dress: '#e9e3d8', trim: '#1f5a47' },
];
export const LOUNGE = { x: 3.2, z: 1.6 } as const;

const WALL = 0.2;

/** Walls and fittings as a collision layout (flat floor, no streets). */
export function boutiqueLayout(): DistrictLayout {
  const { width: w, depth: d } = ROOM;
  const solid = (x: number, z: number, sx: number, sz: number, h = 2.2): Building =>
    ({ position: [x, 0, z], size: [sx, h, sz], color: '#000', style: 'residential' });
  const buildings: Building[] = [
    solid(0, d / 2 + WALL / 2, w + 2 * WALL, WALL, ROOM_HEIGHT),
    solid(-w / 2 - WALL / 2, 0, WALL, d, ROOM_HEIGHT),
    solid(w / 2 + WALL / 2, 0, WALL, d, ROOM_HEIGHT),
    solid(-(w / 4 + 0.4), -d / 2 - WALL / 2, w / 2 - 0.8, WALL, ROOM_HEIGHT),
    solid(w / 4 + 0.4, -d / 2 - WALL / 2, w / 2 - 0.8, WALL, ROOM_HEIGHT),
    solid(0, -d / 2 - WALL - 0.1, 1.6, WALL),
    solid(DESK.x, DESK.z, DESK.w, DESK.d, DESK.h),
    // Behind the desk is staff only
    solid(DESK.x, DESK.z + 1.25, DESK.w + 0.4, 0.3, 1),
    ...RAILS.map((r) => (r.along === 'x' ? solid(r.x, r.z, r.len, 0.6) : solid(r.x, r.z, 0.6, r.len))),
    ...SHELVES.map((s) => solid(s.x, s.z, s.len, 0.5)),
    ...MANNEQUINS.map((m) => solid(m.x, m.z, 0.5, 0.5)),
    // The lounge: a sofa and a coffee table
    solid(LOUNGE.x, LOUNGE.z + 0.9, 2.4, 0.9, 0.8),
    solid(LOUNGE.x, LOUNGE.z - 0.2, 0.9, 0.9, 0.45),
    // Fitting room walls (open on the side you walk in from)
    solid(FITTING.x, FITTING.z - FITTING.d / 2, FITTING.w, 0.1, 2.4),
    // Salon station on the back wall
    solid(SALON.x, SALON.z + 0.45, 1.6, 0.4, 1.0),
  ];
  return buildLayout({
    id: 'venue.fashion-house',
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
