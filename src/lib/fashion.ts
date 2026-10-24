/**
 * Fashion: fabrics, prints and colours the player buys and wears, plus hair
 * dye. With the current Rocketbox models, most items restyle the garment the
 * person already wears (top, bottom, shoes) or their hair. Model-backed CC0
 * hairstyles use separate meshes; clothing still needs rig-compatible assets
 * (see docs/CHARACTER_PIPELINE.md).
 * 
 * Extended to support real 3D garments via modelPath/modelConfig while
 * maintaining backward compatibility with material-based styling.
 */
import { districtById } from './geography';

export type Slot = 'top' | 'bottom' | 'shoes' | 'hair' | 'hairstyle';
export const SLOTS: readonly Slot[] = ['top', 'bottom', 'shoes', 'hair', 'hairstyle'];
export const SLOT_LABEL: Record<Slot, string> = {
  top: 'Tops',
  bottom: 'Bottoms',
  shoes: 'Shoes',
  hair: 'Hair colour',
  hairstyle: 'Hairstyles',
};

/** Shader pattern ids (must match the GLSL in components/outfitShader.ts). */
export const PATTERNS = { solid: 0, stripes: 1, pinstripe: 2, check: 3, ankara: 4, kente: 5, adire: 6, bogolan: 7, houndstooth: 8, batik: 9 } as const;
export type Pattern = keyof typeof PATTERNS;

/** How a fabric catches the light: roughness (0 glossy … 1 matte), weave texture and metallic sheen. */
export interface Fabric {
  name: 'cotton' | 'linen' | 'silk' | 'denim' | 'wool' | 'wax print' | 'handwoven' | 'leather' | 'suede' | 'metallic';
  roughness: number;
  /** 0 none, 1 plain weave, 2 twill (diagonal), 3 handwoven rib. */
  weave: 0 | 1 | 2 | 3;
  metalness: number;
}

export const FABRICS: Record<Fabric['name'], Fabric> = {
  cotton: { name: 'cotton', roughness: 0.85, weave: 1, metalness: 0 },
  linen: { name: 'linen', roughness: 0.92, weave: 1, metalness: 0 },
  silk: { name: 'silk', roughness: 0.52, weave: 0, metalness: 0 },
  denim: { name: 'denim', roughness: 0.85, weave: 2, metalness: 0 },
  wool: { name: 'wool', roughness: 0.9, weave: 1, metalness: 0 },
  'wax print': { name: 'wax print', roughness: 0.62, weave: 1, metalness: 0 },
  handwoven: { name: 'handwoven', roughness: 0.75, weave: 3, metalness: 0 },
  leather: { name: 'leather', roughness: 0.5, weave: 0, metalness: 0 },
  suede: { name: 'suede', roughness: 0.97, weave: 0, metalness: 0 },
  metallic: { name: 'metallic', roughness: 0.28, weave: 0, metalness: 0.75 },
};

/** The fabric an item is made of, from what it is. Hair dye keeps the hair's own finish. */
export function fabricFor(id: string, pattern: Pattern): Fabric | undefined {
  if (id.startsWith('hair-') || id.startsWith('hairstyle-')) return undefined;
  if (id.includes('silk')) return FABRICS.silk;
  if (id.includes('denim')) return FABRICS.denim;
  if (id.includes('linen')) return FABRICS.linen;
  if (id.includes('metallic')) return FABRICS.metallic;
  if (id.includes('suede')) return FABRICS.suede;
  if (id.includes('leather')) return FABRICS.leather;
  if (pattern === 'kente' || id.includes('batakari')) return FABRICS.handwoven;
  if (pattern === 'ankara' || pattern === 'batik' || pattern === 'adire' || pattern === 'bogolan') return FABRICS['wax print'];
  if (pattern === 'houndstooth' || pattern === 'pinstripe') return FABRICS.wool;
  return FABRICS.cotton;
}

export interface Style {
  pattern: Pattern;
  /** Main, second and third colour (hex). */
  colors: readonly [string, string, string];
  /** Repeats across the texture; larger = smaller motif. */
  scale: number;
  fabric?: Fabric;
}

/** Configuration for loading a 3D garment model. */
export interface GarmentModel {
  /** Path to GLB/GLTF model relative to public/assets/, e.g., 'clothing/shoes/heels-01.glb'. */
  path: string;
  /** Expected scale factor to match character proportions (1.0 = no scaling). */
  scale?: number;
  /** Apply the player's avatar height normalization to a source model in avatar space. */
  fitToAvatar?: boolean;
  /** Preserve avatar-root coordinates while parenting the model to its animated attachment bone. */
  preserveWorldTransform?: boolean;
  /** Which bones/sockets to attach this garment to (e.g., ['Shoe_L', 'Shoe_R'] for shoes). */
  attachBones?: readonly string[];
  /** Thumbnail image path for UI display, relative to public/assets/. */
  thumbnail?: string;
}

export interface FashionItem {
  id: string;
  name: string;
  slot: Slot;
  price: number;
  collection: 'Everyday' | 'African prints' | 'Tailored' | 'Luxury' | 'Salon' | 'Rewards';
  style: Style;
  /** Countries (ISO codes) whose boutiques stock it; everywhere if omitted. */
  stockedIn?: readonly string[];
  /** Real 3D garment model; if present, this overrides material-based styling for this item. */
  model?: GarmentModel;
}

const item = (
  id: string, slot: Slot, name: string, price: number, collection: FashionItem['collection'],
  pattern: Pattern, colors: [string, string?, string?], scale = 18, stockedIn?: readonly string[],
): FashionItem => ({
  id, slot, name, price, collection,
  style: { pattern, colors: [colors[0], colors[1] ?? colors[0], colors[2] ?? colors[1] ?? colors[0]], scale, fabric: fabricFor(id, pattern) },
  ...(stockedIn ? { stockedIn } : {}),
});

// Aso-oke and adire eleko in Nigeria, kente and batakari in Ghana
const LAGOS = ['NG'] as const;
const ACCRA = ['GH'] as const;

const HAIRSTYLE_MODELS: Record<string, GarmentModel> = {
  'hairstyle-afro': {
    path: 'hair/afro01.glb',
    fitToAvatar: true,
    preserveWorldTransform: true,
    attachBones: ['Bip01 Head'],
    thumbnail: 'clothing/hair/afro01.png',
  },
  'hairstyle-braids': {
    path: 'hair/braid01.glb',
    fitToAvatar: true,
    preserveWorldTransform: true,
    attachBones: ['Bip01 Head'],
    thumbnail: 'clothing/hair/braid01.png',
  },
  'hairstyle-ponytail': {
    path: 'hair/ponytail01.glb',
    fitToAvatar: true,
    preserveWorldTransform: true,
    attachBones: ['Bip01 Head'],
    thumbnail: 'clothing/hair/ponytail01.png',
  },
  'hairstyle-long': {
    path: 'hair/long01.glb',
    fitToAvatar: true,
    preserveWorldTransform: true,
    attachBones: ['Bip01 Head'],
    thumbnail: 'clothing/hair/long01.png',
  },
};

const hairstyle = (id: string, name: string, price: number): FashionItem => ({
  ...item(id, 'hairstyle', name, price, 'Salon', 'solid', ['#ffffff']),
  model: HAIRSTYLE_MODELS[id],
});

export const FASHION_ITEMS: readonly FashionItem[] = [
  // Tops
  item('top-ankara-sunset', 'top', 'Ankara print · Sunset', 450, 'African prints', 'ankara', ['#d8622b', '#12707a', '#f1d6a2'], 16),
  item('top-ankara-royal', 'top', 'Ankara print · Royal', 450, 'African prints', 'ankara', ['#1d3f91', '#f0b33a', '#b8322a'], 16),
  item('top-adire-indigo', 'top', 'Adire · Indigo', 380, 'African prints', 'adire', ['#1f2a5c', '#a9bce0', '#2c3a78'], 26),
  item('top-kente-gold', 'top', 'Kente weave · Gold & indigo', 900, 'African prints', 'kente', ['#d4a12a', '#1f2a5c', '#7a2230'], 10, ACCRA),
  item('top-linen-ivory', 'top', 'Linen · Ivory', 220, 'Everyday', 'solid', ['#ece4d4']),
  item('top-cotton-midnight', 'top', 'Cotton · Midnight', 200, 'Everyday', 'solid', ['#1c2130']),
  item('top-cotton-terracotta', 'top', 'Cotton · Terracotta', 200, 'Everyday', 'solid', ['#a4512f']),
  item('top-breton-navy', 'top', 'Breton stripe · Navy', 260, 'Everyday', 'stripes', ['#ece4d4', '#1d2a4a'], 40),
  item('top-gingham-rose', 'top', 'Gingham · Rose', 280, 'Everyday', 'check', ['#f1e7e4', '#d98a94', '#b9606d'], 36),
  item('top-silk-burgundy', 'top', 'Silk · Burgundy', 1200, 'Luxury', 'solid', ['#6a1d2e']),
  item('top-asooke-champagne', 'top', 'Aso-oke · Champagne', 2400, 'Luxury', 'kente', ['#d9c49b', '#8a5a2b', '#efe6d2'], 12, LAGOS),
  item('top-asooke-wine', 'top', 'Aso-oke · Wine & gold', 2200, 'Luxury', 'kente', ['#5a1830', '#c9a45c', '#3a0f1f'], 12, LAGOS),
  item('top-adire-eleko', 'top', 'Adire eleko · Deep indigo', 520, 'African prints', 'adire', ['#1a2550', '#c9d3ea', '#25356e'], 22, LAGOS),
  item('top-kente-adweneasa', 'top', 'Kente · Adweneasa', 1100, 'Luxury', 'kente', ['#2a7a3a', '#e0b030', '#a8282a'], 10, ACCRA),
  item('top-batakari-stripe', 'top', 'Batakari smock · Indigo stripe', 700, 'African prints', 'stripes', ['#2a2f5a', '#d9d2c0'], 30, ACCRA),
  item('top-bogolan-earth', 'top', 'Bogolan mud cloth · Earth', 520, 'African prints', 'bogolan', ['#3b2a1e', '#e8dcc4', '#8a5a32'], 16),
  item('top-batik-ocean', 'top', 'Batik · Ocean', 420, 'African prints', 'batik', ['#1d4f73', '#e9e2cf', '#2f7fa3'], 14),
  item('top-houndstooth-mono', 'top', 'Houndstooth · Monochrome', 600, 'Tailored', 'houndstooth', ['#1b1b1d', '#efece6'], 40),
  // Bottoms
  item('bottom-denim-classic', 'bottom', 'Denim · Classic blue', 300, 'Everyday', 'solid', ['#3a5883']),
  item('bottom-denim-black', 'bottom', 'Denim · Washed black', 300, 'Everyday', 'solid', ['#2a2b2f']),
  item('bottom-chino-khaki', 'bottom', 'Chino · Khaki', 260, 'Everyday', 'solid', ['#b19867']),
  item('bottom-linen-cream', 'bottom', 'Linen · Cream', 240, 'Everyday', 'solid', ['#e6dcc6']),
  item('bottom-pinstripe-charcoal', 'bottom', 'Pinstripe · Charcoal', 650, 'Tailored', 'pinstripe', ['#33353b', '#a9abb0'], 60),
  item('bottom-ankara-sunset', 'bottom', 'Ankara print · Sunset', 480, 'African prints', 'ankara', ['#d8622b', '#12707a', '#f1d6a2'], 16),
  item('bottom-adire-indigo', 'bottom', 'Adire · Indigo', 400, 'African prints', 'adire', ['#1f2a5c', '#a9bce0', '#2c3a78'], 26),
  item('bottom-kente-adweneasa', 'bottom', 'Kente · Adweneasa', 1150, 'Luxury', 'kente', ['#2a7a3a', '#e0b030', '#a8282a'], 10, ACCRA),
  item('bottom-bogolan-earth', 'bottom', 'Bogolan mud cloth · Earth', 540, 'African prints', 'bogolan', ['#3b2a1e', '#e8dcc4', '#8a5a32'], 16),
  item('bottom-batik-ocean', 'bottom', 'Batik · Ocean', 440, 'African prints', 'batik', ['#1d4f73', '#e9e2cf', '#2f7fa3'], 14),
  item('bottom-houndstooth-mono', 'bottom', 'Houndstooth · Monochrome', 620, 'Tailored', 'houndstooth', ['#1b1b1d', '#efece6'], 40),
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
  hairstyle('hairstyle-afro', 'Natural afro', 650),
  hairstyle('hairstyle-braids', 'Long braids', 850),
  hairstyle('hairstyle-ponytail', 'Ponytail', 600),
  hairstyle('hairstyle-long', 'Long waves', 700),
  // Collectibles: earned through achievements (lib/life.ts), never sold in shops
  item('top-explorer-kente', 'top', "Explorer's kente", 0, 'Rewards', 'kente', ['#1f6b4f', '#d4a85a', '#13202a'], 10, []),
  item('top-gogetter-silk', 'top', 'Go-getter silk · Emerald', 0, 'Rewards', 'solid', ['#1d6e52'], 18, []),
  item('top-festival-adire', 'top', 'Festival adire · Gold resist', 0, 'Rewards', 'adire', ['#2b1d4f', '#e3c27a', '#3a2a6e'], 22, []),
  item('top-friendship-ankara', 'top', 'Friendship ankara', 0, 'Rewards', 'ankara', ['#b8463a', '#1f6b4f', '#f0d6a0'], 16, []),
  item('shoes-trail-emerald', 'shoes', 'Trail runners · Emerald', 0, 'Rewards', 'solid', ['#2f8f6b'], 18, []),
  item('hair-rose-gold', 'hair', 'Rose gold', 0, 'Rewards', 'solid', ['#b9776a'], 18, []),
];

export const itemById = (id: string | null | undefined) => FASHION_ITEMS.find((i) => i.id === id);

/** Returns true if this item is rendered as a 3D garment model. */
export const usesGarmentModel = (item: FashionItem | undefined) => !!item?.model?.path;

/** A saved look: a name and what to wear in each slot. */
export interface Outfit {
  name: string;
  equipped: Partial<Record<Slot, string>>;
}

export const MAX_OUTFITS = 6;

/** What a character owns and has on. An empty slot means the look's original clothes or hair. */
export interface Wardrobe {
  owned: string[];
  equipped: Partial<Record<Slot, string>>;
  /** Saved looks (absent until the player saves one). */
  outfits?: Outfit[];
  /** Pieces and sets hearted in the boutique, by id (absent until the player hearts one). */
  favourites?: string[];
}

/** Items a district's boutique sells: the basics, plus what's made in its country. */
export function stockedIn(districtId: string) {
  const country = districtById(districtId).city.country;
  return FASHION_ITEMS.filter((i) => !i.stockedIn || i.stockedIn.includes(country));
}

export const EMPTY_WARDROBE: Wardrobe = { owned: [], equipped: {} };

/** Drops unknown items and anything equipped that isn't owned or is in the wrong slot. */
export function sanitiseWardrobe(data: unknown): Wardrobe {
  if (typeof data !== 'object' || data === null) return { owned: [], equipped: {} };
  const w = data as { owned?: unknown; equipped?: unknown };
  const owned = Array.isArray(w.owned) ? [...new Set(w.owned.filter((id): id is string => typeof id === 'string' && !!itemById(id)))] : [];
  const cleanEquipped = (data: unknown) => {
    const out: Partial<Record<Slot, string>> = {};
    const eq = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
    for (const slot of SLOTS) {
      const id = eq[slot];
      if (typeof id === 'string' && owned.includes(id) && itemById(id)?.slot === slot) out[slot] = id;
    }
    return out;
  };
  const outfits = (Array.isArray((w as { outfits?: unknown }).outfits) ? (w as { outfits: unknown[] }).outfits : [])
    .filter((o): o is { name: string; equipped: unknown } => typeof o === 'object' && o !== null && typeof (o as { name?: unknown }).name === 'string' && (o as { name: string }).name.trim() !== '')
    .slice(0, MAX_OUTFITS)
    .map((o) => ({ name: o.name.trim().slice(0, 24), equipped: cleanEquipped(o.equipped) }));
  // Hearted items and sets (a set's id is "set-" and its top's id without "top-")
  const favourites = (Array.isArray((w as { favourites?: unknown }).favourites) ? (w as { favourites: unknown[] }).favourites : [])
    .filter((id): id is string => typeof id === 'string' && (!!itemById(id) || (id.startsWith('set-') && !!itemById(`top-${id.slice(4)}`))))
    .slice(0, 200);
  return { owned, equipped: cleanEquipped(w.equipped), ...(outfits.length ? { outfits } : {}), ...(favourites.length ? { favourites: [...new Set(favourites)] } : {}) };
}

/** The styles to draw for each slot (equipped items, overridden by anything being tried on). */
export function resolveStyles(equipped: Partial<Record<Slot, string>>, tryOn?: Partial<Record<Slot, string | null>>) {
  const out: Partial<Record<Slot, Style>> = {};
  for (const slot of SLOTS) {
    if (slot === 'hairstyle') continue;
    const id = resolveFashionItemId(equipped, tryOn, slot);
    const it = itemById(id);
    if (it) out[slot] = it.style;
  }
  return out;
}

/** Resolve the visible item for a slot, including an explicit null try-on that removes it. */
export function resolveFashionItemId(
  equipped: Partial<Record<Slot, string>>,
  tryOn: Partial<Record<Slot, string | null>> | undefined,
  slot: Slot,
): string | null {
  return tryOn && slot in tryOn ? tryOn[slot] ?? null : equipped[slot] ?? null;
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
    case 'bogolan': return `linear-gradient(90deg, transparent 45%, ${b} 45% 55%, transparent 55%) 0 0 / 14px 14px, radial-gradient(circle, ${b} 0 18%, transparent 22%) 7px 7px / 14px 14px, ${a}`;
    case 'houndstooth': return `repeating-linear-gradient(45deg, ${a} 0 3px, ${b} 3px 6px), conic-gradient(${a} 25%, ${b} 0 50%, ${a} 0 75%, ${b} 0) 0 0 / 12px 12px`;
    case 'batik': return `radial-gradient(circle, ${b} 0 22%, transparent 26%) 0 0 / 18px 18px, repeating-linear-gradient(70deg, transparent 0 9px, ${c}88 9px 10px), ${a}`;
    default: return a;
  }
}

/**
 * Mapping of fashion item IDs to 3D garment models.
 * These override material-based styling when specified.
 * Models should be in GLB/GLTF format at public/assets/clothing/<path>.
 */
export const GARMENT_MODELS: Partial<Record<string, GarmentModel>> = { ...HAIRSTYLE_MODELS };

/** Get the 3D model configuration for a fashion item, if it exists. */
export function getGarmentModel(itemId: string): GarmentModel | undefined {
  return GARMENT_MODELS[itemId];
}
