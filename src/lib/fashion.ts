/**
 * Fashion: fabrics, prints and colours the player buys and wears, plus hair
 * dye. With the current Rocketbox models every item restyles the garment the
 * person already wears (top, bottom, shoes) or their hair; cut and hairstyle
 * shape need separate clothing/hair meshes (see docs/CHARACTER_PIPELINE.md).
 */

export type Slot = 'top' | 'bottom' | 'shoes' | 'hair';
export const SLOTS: readonly Slot[] = ['top', 'bottom', 'shoes', 'hair'];
export const SLOT_LABEL: Record<Slot, string> = { top: 'Tops', bottom: 'Bottoms', shoes: 'Shoes', hair: 'Hair colour' };

/** Shader pattern ids (must match the GLSL in components/outfitShader.ts). */
export const PATTERNS = { solid: 0, stripes: 1, pinstripe: 2, check: 3, ankara: 4, kente: 5, adire: 6 } as const;
export type Pattern = keyof typeof PATTERNS;

export interface Style {
  pattern: Pattern;
  /** Main, second and third colour (hex). */
  colors: readonly [string, string, string];
  /** Repeats across the texture; larger = smaller motif. */
  scale: number;
}

export interface FashionItem {
  id: string;
  name: string;
  slot: Slot;
  price: number;
  collection: 'Everyday' | 'African prints' | 'Tailored' | 'Luxury' | 'Salon';
  style: Style;
}

const item = (
  id: string, slot: Slot, name: string, price: number, collection: FashionItem['collection'],
  pattern: Pattern, colors: [string, string?, string?], scale = 18,
): FashionItem => ({
  id, slot, name, price, collection,
  style: { pattern, colors: [colors[0], colors[1] ?? colors[0], colors[2] ?? colors[1] ?? colors[0]], scale },
});

export const FASHION_ITEMS: readonly FashionItem[] = [
  // Tops
  item('top-ankara-sunset', 'top', 'Ankara print · Sunset', 450, 'African prints', 'ankara', ['#d8622b', '#12707a', '#f1d6a2'], 16),
  item('top-ankara-royal', 'top', 'Ankara print · Royal', 450, 'African prints', 'ankara', ['#1d3f91', '#f0b33a', '#b8322a'], 16),
  item('top-adire-indigo', 'top', 'Adire · Indigo', 380, 'African prints', 'adire', ['#1f2a5c', '#a9bce0', '#2c3a78'], 26),
  item('top-kente-gold', 'top', 'Kente weave · Gold & indigo', 900, 'African prints', 'kente', ['#d4a12a', '#1f2a5c', '#7a2230'], 10),
  item('top-linen-ivory', 'top', 'Linen · Ivory', 220, 'Everyday', 'solid', ['#ece4d4']),
  item('top-cotton-midnight', 'top', 'Cotton · Midnight', 200, 'Everyday', 'solid', ['#1c2130']),
  item('top-cotton-terracotta', 'top', 'Cotton · Terracotta', 200, 'Everyday', 'solid', ['#a4512f']),
  item('top-breton-navy', 'top', 'Breton stripe · Navy', 260, 'Everyday', 'stripes', ['#ece4d4', '#1d2a4a'], 40),
  item('top-gingham-rose', 'top', 'Gingham · Rose', 280, 'Everyday', 'check', ['#f1e7e4', '#d98a94', '#b9606d'], 36),
  item('top-silk-burgundy', 'top', 'Silk · Burgundy', 1200, 'Luxury', 'solid', ['#6a1d2e']),
  item('top-asooke-champagne', 'top', 'Aso-oke · Champagne', 2400, 'Luxury', 'kente', ['#d9c49b', '#8a5a2b', '#efe6d2'], 12),
  // Bottoms
  item('bottom-denim-classic', 'bottom', 'Denim · Classic blue', 300, 'Everyday', 'solid', ['#3a5883']),
  item('bottom-denim-black', 'bottom', 'Denim · Washed black', 300, 'Everyday', 'solid', ['#2a2b2f']),
  item('bottom-chino-khaki', 'bottom', 'Chino · Khaki', 260, 'Everyday', 'solid', ['#b19867']),
  item('bottom-linen-cream', 'bottom', 'Linen · Cream', 240, 'Everyday', 'solid', ['#e6dcc6']),
  item('bottom-pinstripe-charcoal', 'bottom', 'Pinstripe · Charcoal', 650, 'Tailored', 'pinstripe', ['#33353b', '#a9abb0'], 60),
  item('bottom-ankara-sunset', 'bottom', 'Ankara print · Sunset', 480, 'African prints', 'ankara', ['#d8622b', '#12707a', '#f1d6a2'], 16),
  item('bottom-adire-indigo', 'bottom', 'Adire · Indigo', 400, 'African prints', 'adire', ['#1f2a5c', '#a9bce0', '#2c3a78'], 26),
  // Shoes
  item('shoes-clean-white', 'shoes', 'Clean white', 250, 'Everyday', 'solid', ['#efefea']),
  item('shoes-leather-black', 'shoes', 'Leather · Black', 700, 'Tailored', 'solid', ['#1b1b1d']),
  item('shoes-leather-tan', 'shoes', 'Leather · Tan', 700, 'Tailored', 'solid', ['#94623a']),
  item('shoes-suede-burgundy', 'shoes', 'Suede · Burgundy', 550, 'Everyday', 'solid', ['#5c1f2b']),
  item('shoes-metallic-gold', 'shoes', 'Metallic · Gold', 1500, 'Luxury', 'solid', ['#c7a24f']),
  // Hair dye
  item('hair-natural-black', 'hair', 'Natural black', 150, 'Salon', 'solid', ['#141414']),
  item('hair-dark-brown', 'hair', 'Dark brown', 150, 'Salon', 'solid', ['#3d2617']),
  item('hair-blue-black', 'hair', 'Blue-black', 200, 'Salon', 'solid', ['#152039']),
  item('hair-copper', 'hair', 'Copper', 300, 'Salon', 'solid', ['#8f3f1b']),
  item('hair-burgundy', 'hair', 'Burgundy', 300, 'Salon', 'solid', ['#5b1b26']),
  item('hair-honey-blonde', 'hair', 'Honey blonde', 300, 'Salon', 'solid', ['#b48748']),
  item('hair-platinum', 'hair', 'Platinum', 450, 'Salon', 'solid', ['#d8d2c4']),
];

export const itemById = (id: string | null | undefined) => FASHION_ITEMS.find((i) => i.id === id);

/** What a character owns and has on. An empty slot means the look's original clothes or hair. */
export interface Wardrobe {
  owned: string[];
  equipped: Partial<Record<Slot, string>>;
}

export const EMPTY_WARDROBE: Wardrobe = { owned: [], equipped: {} };

/** Drops unknown items and anything equipped that isn't owned or is in the wrong slot. */
export function sanitiseWardrobe(data: unknown): Wardrobe {
  if (typeof data !== 'object' || data === null) return { owned: [], equipped: {} };
  const w = data as { owned?: unknown; equipped?: unknown };
  const owned = Array.isArray(w.owned) ? [...new Set(w.owned.filter((id): id is string => typeof id === 'string' && !!itemById(id)))] : [];
  const equipped: Partial<Record<Slot, string>> = {};
  const eq = (typeof w.equipped === 'object' && w.equipped !== null ? w.equipped : {}) as Record<string, unknown>;
  for (const slot of SLOTS) {
    const id = eq[slot];
    if (typeof id === 'string' && owned.includes(id) && itemById(id)?.slot === slot) equipped[slot] = id;
  }
  return { owned, equipped };
}

/** The styles to draw for each slot (equipped items, overridden by anything being tried on). */
export function resolveStyles(equipped: Partial<Record<Slot, string>>, tryOn?: Partial<Record<Slot, string | null>>) {
  const out: Partial<Record<Slot, Style>> = {};
  for (const slot of SLOTS) {
    const id = tryOn && slot in tryOn ? tryOn[slot] : equipped[slot];
    const it = itemById(id);
    if (it) out[slot] = it.style;
  }
  return out;
}

/** A CSS background that previews an item's pattern in the shop. */
export function swatchCss(style: Style): string {
  const [a, b, c] = style.colors;
  switch (style.pattern) {
    case 'stripes': return `repeating-linear-gradient(90deg, ${a} 0 6px, ${b} 6px 12px)`;
    case 'pinstripe': return `repeating-linear-gradient(90deg, ${a} 0 7px, ${b} 7px 8px)`;
    case 'check': return `repeating-linear-gradient(0deg, transparent 0 6px, ${b}99 6px 12px), repeating-linear-gradient(90deg, ${a} 0 6px, ${c}99 6px 12px)`;
    case 'ankara': return `radial-gradient(circle at 50% 50%, ${c} 0 18%, ${b} 19% 34%, transparent 35%) 0 0 / 22px 22px, ${a}`;
    case 'kente': return `repeating-linear-gradient(90deg, ${a} 0 10px, ${b} 10px 14px, ${c} 14px 18px, ${a} 18px 22px), ${a}`;
    case 'adire': return `radial-gradient(circle, ${b} 0 25%, transparent 45%) 0 0 / 16px 16px, ${a}`;
    default: return a;
  }
}
