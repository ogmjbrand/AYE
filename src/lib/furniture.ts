/**
 * Furniture you can buy, place in your home and use. Every home comes
 * furnished for its rent (lib/interiors.ts); the catalogue adds pieces on
 * top. Bought pieces are yours: they're placed in your home if there's room
 * (otherwise kept in storage), move with you when you move house, and can be
 * moved, stored or sold back for half the price.
 *
 * Using a piece takes game time and meets needs (lib/needs.ts): a shower for
 * hygiene, a sofa, TV or bookshelf for fun, a cooker for a cheap home-cooked
 * meal. What a piece does depends on its kind, so the furniture a home comes
 * with works the same way; better pieces (quality above 1) do more.
 * Comfort from placed pieces lifts your mood.
 */
import { bedSpot, doorSpot, type Furniture, type FurnitureKind, type Interior } from './interiors';
import { PLAYER_RADIUS } from './world';
import { NEED_LABEL, type NeedKey, type Needs } from './needs';

export type FurnitureCategory = 'seating' | 'beds' | 'tables' | 'kitchen' | 'bathroom' | 'electronics' | 'lighting' | 'decor' | 'storage';

export const FURNITURE_CATEGORIES: readonly { id: FurnitureCategory; label: string }[] = [
  { id: 'seating', label: 'Seating' },
  { id: 'beds', label: 'Beds' },
  { id: 'tables', label: 'Tables & desks' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'bathroom', label: 'Bathroom' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'lighting', label: 'Lighting' },
  { id: 'decor', label: 'Decor & plants' },
  { id: 'storage', label: 'Storage' },
];

export interface CatalogueItem {
  id: string;
  name: string;
  category: FurnitureCategory;
  price: number;
  /** Decides its 3D shape and what using it does. */
  kind: FurnitureKind;
  /** Width (X), height, depth (Z) in metres, unrotated. */
  size: readonly [number, number, number];
  color: string;
  /** Adds to home comfort, which lifts mood. */
  comfort: number;
  /** Scales what using it gives (1 = the basic piece a home comes with). */
  quality: number;
  description: string;
}

const item = (
  id: string, name: string, category: FurnitureCategory, price: number, kind: FurnitureKind,
  size: readonly [number, number, number], color: string, comfort: number, quality: number, description: string,
): CatalogueItem => ({ id, name, category, price, kind, size, color, comfort, quality, description });

export const CATALOGUE: readonly CatalogueItem[] = [
  item('armchair-rattan', 'Rattan armchair', 'seating', 450, 'armchair', [0.8, 0.85, 0.8], '#b08a5a', 1, 1, 'Hand-woven cane on a hardwood frame. Sit back with a cold drink.'),
  item('armchair-velvet', 'Velvet reading chair', 'seating', 1100, 'armchair', [0.85, 0.95, 0.85], '#5a3b52', 2, 1.3, 'Deep, soft and made for long afternoons with a book.'),
  item('sofa-two', 'Two-seater sofa', 'seating', 1600, 'sofa', [1.6, 0.85, 0.85], '#6f7c6a', 2, 1, 'Compact and sturdy, in washable cotton.'),
  item('sofa-ankara', 'Ankara-print sofa', 'seating', 2900, 'sofa', [2.1, 0.85, 0.9], '#a1502e', 3, 1.3, 'A three-seater upholstered in bold wax print.'),
  item('bed-double', 'Double bed', 'beds', 2400, 'bed', [1.5, 0.55, 2.05], '#3d566b', 2, 1, 'A proper mattress on a solid frame.'),
  item('bed-king', 'King bed with headboard', 'beds', 5200, 'bed', [1.9, 0.6, 2.15], '#2e3a4d', 4, 1.2, 'Hotel-grade mattress and a padded headboard.'),
  item('table-coffee', 'Coffee table', 'tables', 380, 'table', [1.0, 0.42, 0.6], '#6a4a32', 1, 1, 'Iroko wood, oiled by hand.'),
  item('table-dining', 'Dining table', 'tables', 1300, 'table', [1.4, 0.75, 0.85], '#7a5638', 1, 1, 'Seats four. Somewhere to eat that isn\'t the sofa.'),
  item('desk-study', 'Study desk', 'tables', 900, 'desk', [1.2, 0.75, 0.6], '#5c4a3a', 1, 1, 'Study or plan your career: time here counts towards promotion.'),
  item('desk-executive', 'Executive desk', 'tables', 2600, 'desk', [1.6, 0.76, 0.75], '#2f2722', 2, 1.4, 'A serious desk for serious plans. Study here counts for more.'),
  item('stove-gas', 'Gas cooker', 'kitchen', 1400, 'stove', [0.6, 0.9, 0.6], '#cfd2d4', 1, 1.2, 'Four burners and an oven. Cook proper meals for less than eating out.'),
  item('fridge-tall', 'Fridge freezer', 'kitchen', 1700, 'fridge', [0.7, 1.85, 0.68], '#dadcdd', 1, 1.2, 'Keeps snacks cold through any power cut (with the generator).'),
  item('shower-cubicle', 'Shower cubicle', 'bathroom', 1200, 'shower', [0.9, 2.1, 0.9], '#b9d3db', 1, 1.1, 'A power shower with a glass screen.'),
  item('bathtub', 'Freestanding bathtub', 'bathroom', 3800, 'bathtub', [1.6, 0.6, 0.8], '#f2f1ee', 3, 1.2, 'A long soak: clean and relaxed at once.'),
  item('tv-43', '43-inch TV', 'electronics', 1500, 'tv', [1.1, 0.95, 0.35], '#1a1b1e', 1, 1, 'Nollywood, football and the news.'),
  item('tv-65', '65-inch smart TV', 'electronics', 4200, 'tv', [1.6, 1.15, 0.4], '#121316', 2, 1.4, 'Cinema at home, with every streaming app.'),
  item('console', 'Games console & TV stand', 'electronics', 2800, 'console', [1.2, 0.95, 0.45], '#22242a', 1, 1.2, 'Play a few matches. Great fun; a little tiring.'),
  item('speaker', 'Bluetooth speaker', 'electronics', 600, 'speaker', [0.35, 0.9, 0.35], '#2c2c2e', 1, 1, 'Afrobeats, highlife or amapiano at the right volume.'),
  item('lamp-floor', 'Floor lamp', 'lighting', 260, 'lamp', [0.4, 1.7, 0.4], '#ecd9b2', 1, 1, 'Warm light for the evenings.'),
  item('lamp-arc', 'Brass arc lamp', 'lighting', 750, 'lamp', [0.5, 1.9, 0.5], '#e6c78a', 2, 1, 'A statement lamp that arches over the sofa.'),
  item('plant-snake', 'Snake plant', 'decor', 120, 'plant', [0.4, 0.9, 0.4], '#486b3a', 1, 1, 'Almost impossible to kill.'),
  item('plant-palm', 'Areca palm', 'decor', 340, 'plant', [0.6, 1.6, 0.6], '#3f6b3a', 2, 1, 'A tall palm that makes any corner feel like a garden.'),
  item('rug-aso', 'Woven rug', 'decor', 420, 'rug', [2.0, 0.01, 1.4], '#8d4b3a', 1, 1, 'Hand-loomed in earthy reds.'),
  item('rug-indigo', 'Adire indigo rug', 'decor', 800, 'rug', [2.4, 0.01, 1.7], '#2f4a7a', 2, 1, 'Resist-dyed indigo patterns from Abeokuta.'),
  item('bookshelf', 'Bookshelf with books', 'storage', 980, 'bookshelf', [1.0, 1.9, 0.35], '#6b4f36', 1, 1, 'Fill it with stories. Reading is good fun.'),
  item('wardrobe-double', 'Double wardrobe', 'storage', 1500, 'wardrobe', [1.2, 2.0, 0.6], '#5d4330', 1, 1, 'Room for every outfit you own.'),
  item('dresser', 'Chest of drawers', 'storage', 700, 'dresser', [1.0, 0.85, 0.5], '#7a5a3e', 1, 1, 'Four deep drawers.'),
];

export const catalogueItem = (id: string | undefined) => CATALOGUE.find((c) => c.id === id);

/** What using a kind of furniture does, before quality. */
export interface Use {
  verb: string;
  minutes: number;
  gains: Partial<Needs>;
  /** Fullness gained (cooking, snacks). */
  fullness?: number;
  /** Ingredients, paid each time. */
  cost?: number;
  /** Study: experience towards promotion, in work minutes. */
  xpMinutes?: number;
}

export const USES: Partial<Record<FurnitureKind, Use>> = {
  sofa: { verb: 'Relax on the sofa', minutes: 30, gains: { fun: 15, energy: 6 } },
  armchair: { verb: 'Sit and unwind', minutes: 30, gains: { fun: 12, energy: 4 } },
  tv: { verb: 'Watch TV', minutes: 60, gains: { fun: 30 } },
  console: { verb: 'Play video games', minutes: 60, gains: { fun: 40, energy: -5 } },
  bookshelf: { verb: 'Read a book', minutes: 45, gains: { fun: 22 } },
  speaker: { verb: 'Listen to music', minutes: 30, gains: { fun: 18 } },
  shower: { verb: 'Take a shower', minutes: 15, gains: { hygiene: 80 } },
  bathtub: { verb: 'Have a bath', minutes: 40, gains: { hygiene: 100, fun: 10, energy: 5 } },
  stove: { verb: 'Cook a meal', minutes: 40, gains: {}, fullness: 50, cost: 25 },
  counter: { verb: 'Cook a meal', minutes: 45, gains: {}, fullness: 45, cost: 25 },
  fridge: { verb: 'Grab a snack', minutes: 5, gains: {}, fullness: 15, cost: 8 },
  desk: { verb: 'Study for your career', minutes: 60, gains: { fun: -5 }, xpMinutes: 20 },
};

/** The use of a piece, with its quality applied (costs aren't scaled). */
export function furnitureUse(kind: FurnitureKind, quality = 1): Use | undefined {
  const u = USES[kind];
  if (!u) return undefined;
  const scale = (v: number) => (v > 0 ? Math.round(v * quality) : v);
  const gains: Partial<Needs> = {};
  for (const [k, v] of Object.entries(u.gains) as [keyof Needs, number][]) gains[k] = scale(v);
  return {
    ...u,
    gains,
    fullness: u.fullness === undefined ? undefined : scale(u.fullness),
    xpMinutes: u.xpMinutes === undefined ? undefined : scale(u.xpMinutes),
  };
}

/** A piece you own. `at` is its centre in your current home, or null if it's in storage. */
export interface OwnedFurniture {
  uid: string;
  itemId: string;
  at: readonly [number, number] | null;
  /** Quarter turns: 1 swaps width and depth. */
  rot: 0 | 1;
}

/** Sold back for this share of the price. */
export const RESALE_SHARE = 0.5;
export const resaleValue = (i: CatalogueItem) => Math.round(i.price * RESALE_SHARE);

/** Width (X) and depth (Z) on the floor, after rotation. */
export const footprint = (i: CatalogueItem, rot: 0 | 1): readonly [number, number] => (rot ? [i.size[2], i.size[0]] : [i.size[0], i.size[2]]);

/** As interior furniture, for drawing and collisions. */
export function asFurniture(o: OwnedFurniture): Furniture | null {
  const i = catalogueItem(o.itemId);
  if (!i || !o.at) return null;
  const [w, d] = footprint(i, o.rot);
  return { kind: i.kind, at: o.at, size: [w, i.size[1], d], color: i.color };
}

/** Gap kept between pieces, so you can walk round them. */
const GAP = 0.15;
/** Kept clear: the doorway and a path into the room. */
const DOOR_CLEAR = { halfWidth: 0.9, depth: 1.6 };

interface Rect { x0: number; x1: number; z0: number; z1: number }
const rectOf = (at: readonly [number, number], w: number, d: number): Rect => ({ x0: at[0] - w / 2, x1: at[0] + w / 2, z0: at[1] - d / 2, z1: at[1] + d / 2 });
const overlaps = (a: Rect, b: Rect, gap: number) => a.x0 < b.x1 + gap && b.x0 < a.x1 + gap && a.z0 < b.z1 + gap && b.z0 < a.z1 + gap;

/**
 * Whether a piece can stand here: inside the walls, clear of the doorway and
 * of the bed's side (where you get in), and not touching other pieces. Rugs
 * only need to fit the floor and keep off other rugs.
 */
export function fits(interior: Interior, others: readonly OwnedFurniture[], piece: CatalogueItem, at: readonly [number, number], rot: 0 | 1, ignoreUid?: string): boolean {
  const [w, d] = footprint(piece, rot);
  const r = rectOf(at, w, d);
  const hw = interior.width / 2, hd = interior.depth / 2;
  if (r.x0 < -hw + 0.02 || r.x1 > hw - 0.02 || r.z0 < -hd + 0.02 || r.z1 > hd - 0.02) return false;
  const rug = piece.kind === 'rug';
  const solid = (f: Furniture) => (f.kind === 'rug') === rug;
  if (!rug) {
    const door: Rect = { x0: -DOOR_CLEAR.halfWidth, x1: DOOR_CLEAR.halfWidth, z0: -hd, z1: -hd + DOOR_CLEAR.depth };
    if (overlaps(r, door, 0)) return false;
    const bed = interior.furniture.find((f) => f.kind === 'bed');
    if (bed) {
      const side: Rect = { x0: bed.at[0] + bed.size[0] / 2, x1: bed.at[0] + bed.size[0] / 2 + 0.8, z0: bed.at[1] - 0.5, z1: bed.at[1] + 0.5 };
      if (overlaps(r, side, 0)) return false;
    }
  }
  for (const f of interior.furniture) {
    if (solid(f) && overlaps(r, rectOf(f.at, f.size[0], f.size[2]), rug ? 0 : GAP)) return false;
  }
  for (const o of others) {
    if (o.uid === ignoreUid) continue;
    const f = asFurniture(o);
    if (f && solid(f) && overlaps(r, rectOf(f.at, f.size[0], f.size[2]), rug ? 0 : GAP)) return false;
  }
  return true;
}

/**
 * Whether you can still walk from the front door to the bed and up to every
 * piece you can use, with these pieces placed (a 0.25 m grid search).
 */
export function walkable(interior: Interior, owned: readonly OwnedFurniture[]): boolean {
  const pieces = [...interior.furniture, ...owned.map(asFurniture).filter((f): f is Furniture => !!f)];
  const solid = pieces.filter((f) => f.kind !== 'rug').map((f) => rectOf(f.at, f.size[0], f.size[2]));
  const hw = interior.width / 2, hd = interior.depth / 2, r = PLAYER_RADIUS;
  const step = 0.25;
  const open = (x: number, z: number) =>
    Math.abs(x) <= hw - r && Math.abs(z) <= hd - r &&
    solid.every((b) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.z0 - z, 0, z - b.z1)) >= r);
  const [sx, sz] = doorSpot(interior);
  const cell = (x: number, z: number) => `${Math.round(x / step)},${Math.round(z / step)}`;
  const seen = new Set([cell(sx, sz)]);
  const reached: [number, number][] = [];
  const queue: [number, number][] = [[sx, sz]];
  while (queue.length) {
    const [x, z] = queue.pop()!;
    reached.push([x, z]);
    for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const nx = x + dx, nz = z + dz;
      if (seen.has(cell(nx, nz)) || !open(nx, nz)) continue;
      seen.add(cell(nx, nz));
      queue.push([nx, nz]);
    }
  }
  const bed = interior.furniture.some((f) => f.kind === 'bed') ? bedSpot(interior) : null;
  if (bed && !reached.some(([x, z]) => Math.hypot(x - bed[0], z - bed[1]) <= step)) return false;
  return pieces.every((f) => !USES[f.kind] || reached.some(([x, z]) => nearPiece(f, x, z)));
}

/** Finds a free spot, trying the far side of the room first (away from the door). Null if the room is full. */
export function findSpot(interior: Interior, others: readonly OwnedFurniture[], piece: CatalogueItem): { at: [number, number]; rot: 0 | 1 } | null {
  const step = 0.25;
  const hw = interior.width / 2, hd = interior.depth / 2;
  for (let z = hd; z >= -hd; z -= step) {
    for (let k = 0; k <= Math.ceil(hw / step) * 2; k++) {
      // Outwards from the walls towards the middle, alternating sides
      const x = (k % 2 ? -1 : 1) * (hw - Math.floor(k / 2) * step);
      for (const rot of [0, 1] as const) {
        const [w, d] = footprint(piece, rot);
        const at: [number, number] = [snap(clampTo(x, hw - w / 2 - 0.05)), snap(clampTo(z, hd - d / 2 - 0.05))];
        if (fits(interior, others, piece, at, rot) && walkable(interior, [...others, { uid: '', itemId: piece.id, at, rot }])) return { at, rot };
      }
    }
  }
  return null;
}

const clampTo = (v: number, max: number) => Math.max(-max, Math.min(max, v));
const snap = (v: number) => Math.round(v * 20) / 20;

/** Re-places everything for a (new) home: what fits goes in, the rest into storage. */
export function replaceAll(interior: Interior | null, owned: readonly OwnedFurniture[]): OwnedFurniture[] {
  const out: OwnedFurniture[] = [];
  for (const o of owned) {
    const piece = catalogueItem(o.itemId);
    if (!piece) continue;
    const spot = interior && o.at ? findSpot(interior, out, piece) : null;
    out.push({ ...o, at: spot?.at ?? null, rot: spot?.rot ?? o.rot });
  }
  return out;
}

/** Comfort from everything placed in the home. */
export function homeComfort(owned: readonly OwnedFurniture[]): number {
  return owned.reduce((sum, o) => sum + (o.at ? catalogueItem(o.itemId)?.comfort ?? 0 : 0), 0);
}

/** Next unique id for a bought piece. */
export function nextUid(owned: readonly OwnedFurniture[]): string {
  const n = owned.reduce((m, o) => Math.max(m, Number(o.uid.split('#')[1]) || 0), 0);
  return `f#${n + 1}`;
}

/** Validates saved furniture: unknown items are dropped, bad positions go to storage. */
export function sanitiseFurniture(data: unknown): OwnedFurniture[] {
  if (!Array.isArray(data)) return [];
  const out: OwnedFurniture[] = [];
  const seen = new Set<string>();
  for (const raw of data.slice(0, 200)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const o = raw as Record<string, unknown>;
    if (typeof o.uid !== 'string' || seen.has(o.uid) || !catalogueItem(o.itemId as string)) continue;
    seen.add(o.uid);
    const at = Array.isArray(o.at) && o.at.length === 2 && o.at.every((v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 50)
      ? [o.at[0], o.at[1]] as const : null;
    out.push({ uid: o.uid, itemId: o.itemId as string, at, rot: o.rot === 1 ? 1 : 0 });
  }
  return out;
}

/** Where to stand to use a piece: in front of whichever side faces the middle of the room. */
export function spotToUse(f: Furniture): [number, number] {
  const [x, z] = f.at;
  const [w, , d] = f.size;
  const toCentreX = -x, toCentreZ = -z;
  if (Math.abs(toCentreX) / (w / 2 + 0.01) > Math.abs(toCentreZ) / (d / 2 + 0.01)) return [x + Math.sign(toCentreX || 1) * (w / 2 + 0.45), z];
  return [x, z + Math.sign(toCentreZ || 1) * (d / 2 + 0.45)];
}

/** Whether the player at (px, pz) is close enough to use a piece. */
export function nearPiece(f: Furniture, px: number, pz: number, reach = 0.75): boolean {
  const dx = Math.max(Math.abs(px - f.at[0]) - f.size[0] / 2, 0);
  const dz = Math.max(Math.abs(pz - f.at[1]) - f.size[2] / 2, 0);
  return Math.hypot(dx, dz) <= reach;
}

/** One line on what a piece does: "Watch TV · +30 fun · 1 h". */
export function effectLine(item: CatalogueItem): string {
  const use = furnitureUse(item.kind, item.quality);
  const parts: string[] = [];
  if (use) {
    parts.push(use.verb);
    for (const [k, v] of Object.entries(use.gains) as [NeedKey, number][]) if (v) parts.push(`${v > 0 ? '+' : ''}${v} ${NEED_LABEL[k].toLowerCase()}`);
    if (use.fullness) parts.push(`+${use.fullness} fullness`);
    if (use.xpMinutes) parts.push(`+${use.xpMinutes} min experience`);
    if (use.cost) parts.push(`${use.cost} GHAI ingredients`);
    parts.push(use.minutes >= 60 ? `${use.minutes / 60} h` : `${use.minutes} min`);
  } else {
    parts.push('Decoration');
  }
  parts.push(`comfort +${item.comfort}`);
  return parts.join(' · ');
}
