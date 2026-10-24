/**
 * Fashion: fabrics, prints and colours the player buys and wears, plus hair
 * dye. With the current Rocketbox models every item restyles the garment the
 * person already wears (top, bottom, shoes) or their hair; cut and hairstyle
 * shape need separate clothing/hair meshes (see docs/CHARACTER_PIPELINE.md).
 */
import { districtById } from './geography';

export type Slot = 'top' | 'bottom' | 'shoes' | 'hair' | 'bag' | 'neck' | 'ears' | 'wrist' | 'eyes' | 'nails' | 'rings';
export const SLOTS: readonly Slot[] = ['top', 'bottom', 'shoes', 'hair', 'bag', 'neck', 'ears', 'wrist', 'eyes', 'nails', 'rings'];
export const SLOT_LABEL: Record<Slot, string> = {
  top: 'Tops', bottom: 'Bottoms', shoes: 'Shoes', hair: 'Hair colour', bag: 'Bags',
  neck: 'Necklaces', ears: 'Earrings', wrist: 'Watches & bangles', eyes: 'Sunglasses', nails: 'Nails', rings: 'Rings',
};
/** Worn pieces drawn on the body (world/Adornments.tsx), not restyled fabric. */
export const ADORNMENT_SLOTS: readonly Slot[] = ['neck', 'ears', 'wrist', 'eyes', 'nails', 'rings'];

/** The cut of a worn piece: a necklace, earrings, what's on the wrist, a frame or a nail shape. */
export type NeckKind = 'choker' | 'chain' | 'pearls' | 'collar' | 'layered' | 'snake' | 'roses' | 'charms';
export type Pendant = 'none' | 'cross' | 'heart' | 'drop' | 'flower' | 'bow' | 'clover' | 'knot' | 'sun' | 'solitaire' | 'drops';
export type EarKind = 'stud' | 'hoop' | 'chunky-hoop' | 'drop' | 'tassel' | 'bow' | 'flower' | 'chandelier' | 'clover';
export type WristKind = 'watch' | 'iced-watch' | 'bangle' | 'cuff' | 'stack' | 'coil' | 'knot';
export type EyeKind = 'oval' | 'cat-eye' | 'rect' | 'round' | 'rimless' | 'shield';
export type NailKind = 'almond' | 'stiletto' | 'coffin' | 'square';
export type RingKind = 'band' | 'sphere' | 'cocktail' | 'stack' | 'sculpt' | 'coil' | 'solitaire';
export interface Piece {
  kind: NeckKind | EarKind | WristKind | EyeKind | NailKind | RingKind;
  /** What hangs from a necklace. */
  pendant?: Pendant;
}

/** A handbag's shape (world/HeldBag.tsx draws each): carried in the left hand. */
export type BagShape = 'tote' | 'top-handle' | 'clutch' | 'bucket' | 'mini' | 'flap' | 'barrel' | 'dome' | 'heart' | 'saddle'
  | 'baguette' | 'box' | 'ring' | 'knot' | 'pleat' | 'pouch' | 'kelly' | 'oval' | 'fringe';

/** Shader pattern ids (must match the GLSL in components/outfitShader.ts). */
export const PATTERNS = {
  solid: 0, stripes: 1, pinstripe: 2, check: 3, ankara: 4, kente: 5, adire: 6, bogolan: 7, houndstooth: 8, batik: 9,
  leopard: 10, polka: 11, cherry: 12, floral: 13, lace: 14, swirl: 15,
} as const;
export type Pattern = keyof typeof PATTERNS;

/** How a fabric catches the light: roughness (0 glossy … 1 matte), weave texture and metallic sheen. */
export interface Fabric {
  name: 'cotton' | 'linen' | 'silk' | 'denim' | 'wool' | 'wax print' | 'handwoven' | 'leather' | 'suede' | 'metallic' | 'patent' | 'croc' | 'satin' | 'jersey' | 'velvet'
    | 'glitter' | 'rhinestone' | 'fur' | 'quilted' | 'knit' | 'tweed' | 'mesh' | 'gold' | 'silver' | 'acrylic';
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
  patent: { name: 'patent', roughness: 0.12, weave: 0, metalness: 0.05 },
  croc: { name: 'croc', roughness: 0.3, weave: 0, metalness: 0 },
  satin: { name: 'satin', roughness: 0.35, weave: 0, metalness: 0.08 },
  jersey: { name: 'jersey', roughness: 0.7, weave: 1, metalness: 0 },
  velvet: { name: 'velvet', roughness: 0.98, weave: 0, metalness: 0 },
  glitter: { name: 'glitter', roughness: 0.32, weave: 0, metalness: 0.6 },
  rhinestone: { name: 'rhinestone', roughness: 0.15, weave: 0, metalness: 0.85 },
  fur: { name: 'fur', roughness: 1, weave: 0, metalness: 0 },
  quilted: { name: 'quilted', roughness: 0.45, weave: 0, metalness: 0 },
  knit: { name: 'knit', roughness: 0.95, weave: 3, metalness: 0 },
  tweed: { name: 'tweed', roughness: 0.95, weave: 3, metalness: 0 },
  mesh: { name: 'mesh', roughness: 0.6, weave: 1, metalness: 0 },
  // Jewellery and frames
  gold: { name: 'gold', roughness: 0.22, weave: 0, metalness: 1 },
  silver: { name: 'silver', roughness: 0.18, weave: 0, metalness: 1 },
  acrylic: { name: 'acrylic', roughness: 0.15, weave: 0, metalness: 0 },
};

/** The fabric an item is made of, from what it is. Hair dye keeps the hair's own finish. */
export function fabricFor(id: string, pattern: Pattern): Fabric | undefined {
  if (id.startsWith('hair-')) return undefined;
  if (id.includes('patent')) return FABRICS.patent;
  if (id.includes('rhinestone') || id.includes('crystal')) return FABRICS.rhinestone;
  if (id.includes('glitter') || id.includes('sequin')) return FABRICS.glitter;
  if (id.includes('fur') || id.includes('marabou') || id.includes('feather')) return FABRICS.fur;
  if (id.includes('quilted')) return FABRICS.quilted;
  if (id.includes('tweed')) return FABRICS.tweed;
  if (id.includes('knit') || id.includes('cable')) return FABRICS.knit;
  if (id.includes('mesh') || id.includes('lace') || pattern === 'lace') return FABRICS.mesh;
  if (id.includes('acrylic') || id.includes('marble')) return FABRICS.acrylic;
  if (id.includes('croc')) return FABRICS.croc;
  if (id.includes('satin')) return FABRICS.satin;
  if (id.includes('sport') || id.includes('legging') || id.includes('jogger')) return FABRICS.jersey;
  if (id.includes('velvet')) return FABRICS.velvet;
  if (id.includes('silk')) return FABRICS.silk;
  if (id.includes('denim')) return FABRICS.denim;
  if (id.includes('linen')) return FABRICS.linen;
  if (id.includes('metallic')) return FABRICS.metallic;
  if (id.includes('suede')) return FABRICS.suede;
  if (id.includes('leather')) return FABRICS.leather;
  if (pattern === 'kente' || id.includes('batakari')) return FABRICS.handwoven;
  if (pattern === 'ankara' || pattern === 'batik' || pattern === 'adire' || pattern === 'bogolan') return FABRICS['wax print'];
  if (pattern === 'houndstooth' || pattern === 'pinstripe') return FABRICS.wool;
  if (pattern === 'swirl' || pattern === 'floral' || pattern === 'cherry' || pattern === 'leopard' || pattern === 'polka') return FABRICS.jersey;
  return FABRICS.cotton;
}

export interface Style {
  pattern: Pattern;
  /** Main, second and third colour (hex). */
  colors: readonly [string, string, string];
  /** Repeats across the texture; larger = smaller motif. */
  scale: number;
  fabric?: Fabric;
  /** Bags only: which shape to carry. */
  bag?: BagShape;
  /** Worn pieces only (necklace, earrings, wrist, glasses, nails): their cut. */
  piece?: Piece;
  /** Bags only: a woven surface (real wicker relief) under the colour. */
  woven?: true;
}

export interface FashionItem {
  id: string;
  name: string;
  slot: Slot;
  price: number;
  collection: 'Everyday' | 'African prints' | 'Tailored' | 'Luxury' | 'Salon' | 'Accessories' | 'Rewards' | 'Workout' | 'Joggers' | 'Office' | 'Evening' | 'Gala'
    | 'Couture' | 'Jewellery' | 'Eyewear' | 'Nails';
  style: Style;
  /** Countries (ISO codes) whose boutiques stock it; everywhere if omitted. */
  stockedIn?: readonly string[];
  /** A dress look (on its top): sold with its matching bottom, restyling both in the dress's fabric. */
  dress?: true;
}

const item = (
  id: string, slot: Slot, name: string, price: number, collection: FashionItem['collection'],
  pattern: Pattern, colors: [string, string?, string?], scale = 18, stockedIn?: readonly string[],
): FashionItem => ({
  id, slot, name, price, collection,
  style: { pattern, colors: [colors[0], colors[1] ?? colors[0], colors[2] ?? colors[1] ?? colors[0]], scale, fabric: fabricFor(id, pattern) },
  ...(stockedIn ? { stockedIn } : {}),
});

const bagItem = (id: string, name: string, price: number, bag: BagShape, color: string, trim?: string): FashionItem => {
  const base = item(id, 'bag', name, price, price >= 1500 ? 'Luxury' : 'Accessories', 'solid', [color, trim ?? color]);
  return { ...base, style: { ...base.style, bag, ...(/woven|wicker|raffia/.test(id) ? { woven: true as const } : {}) } };
};

/** A dress look: the dress's top and its matching bottom (ids "top-x" and "bottom-x"), in one fabric. */
const dress = (key: string, name: string, price: number, collection: FashionItem['collection'], pattern: Pattern, colors: [string, string?, string?], scale = 18): FashionItem[] => [
  { ...item(`top-${key}`, 'top', `${name} · bodice`, Math.round(price * 0.55), collection, pattern, colors, scale), dress: true },
  item(`bottom-${key}`, 'bottom', `${name} · skirt`, Math.round(price * 0.45), collection, pattern, colors, scale),
];

/** Jewellery, sunglasses and nails: colours are [metal or frame, stones or lens, accent]. */
const worn = (id: string, slot: Slot, name: string, price: number, kind: Piece['kind'], colors: [string, string?, string?], pendant?: Pendant): FashionItem => {
  const collection: FashionItem['collection'] = slot === 'eyes' ? 'Eyewear' : slot === 'nails' ? 'Nails' : 'Jewellery';
  const base = item(id, slot, name, price, collection, 'solid', colors);
  const metal = /^#(c|d|b[89a-f]|e)/i.test(colors[0]) && slot !== 'nails' && slot !== 'eyes';
  const fabric = slot === 'nails' ? (id.includes('chrome') ? FABRICS.metallic : FABRICS.patent)
    : slot === 'eyes' ? FABRICS.acrylic
    : id.includes('silver') || id.includes('iced') || id.includes('crystal') ? FABRICS.silver
    : metal || id.includes('gold') ? FABRICS.gold : FABRICS.acrylic;
  return { ...base, style: { ...base.style, fabric, piece: { kind, ...(pendant ? { pendant } : {}) } } };
};

// Aso-oke and adire eleko in Nigeria, kente and batakari in Ghana
const LAGOS = ['NG'] as const;
const ACCRA = ['GH'] as const;

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
  // Bags: original designs, no brand marks; you choose the colour
  bagItem('bag-tote-leather', 'Leather tote', 900, 'tote', '#94623a'),
  bagItem('bag-tophandle-leather', 'Structured top-handle', 1800, 'top-handle', '#1b1b1d'),
  bagItem('bag-clutch-metallic', 'Evening clutch · Metallic', 1200, 'clutch', '#c7a24f'),
  bagItem('bag-bucket-suede', 'Suede bucket bag', 750, 'bucket', '#5c1f2b'),
  bagItem('bag-mini-leather', 'Mini bag', 650, 'mini', '#e9dccb'),
  // OGM Atelier: the game's own house brand (gold OGM plate on every bag, no real brands)
  bagItem('bag-flap-croc', 'OGM Atelier croc flap bag · Emerald', 3200, 'flap', '#1f4a32'),
  bagItem('bag-flap-tweed', 'OGM Atelier tweed flap bag · Noir', 1500, 'flap', '#1b1b1d'),
  bagItem('bag-flap-embossed', 'OGM Atelier embossed messenger · Burgundy', 2400, 'flap', '#5a1a24'),
  bagItem('bag-flap-patent-blush', 'OGM Atelier patent chain bag · Blush', 1100, 'flap', '#e7a9b6'),
  bagItem('bag-flap-metallic-gold', 'OGM Atelier chain shoulder bag · Gold', 1300, 'flap', '#c9a24f'),
  bagItem('bag-barrel-leather', 'OGM Atelier barrel bag · Tangerine', 1600, 'barrel', '#d4521e'),
  bagItem('bag-dome-leather', 'OGM Atelier dome bag · Slate', 2100, 'dome', '#6b6d72'),
  bagItem('bag-tote-shopper-leather', 'OGM Atelier shopper tote · Black', 1900, 'tote', '#141416'),
  bagItem('bag-heart-patent', 'OGM Atelier heart bag · Red', 1400, 'heart', '#b3141c'),
  bagItem('bag-tophandle-croc', 'OGM Atelier croc top-handle · Navy', 4800, 'top-handle', '#16213e'),
  bagItem('bag-tophandle-patent-wine', 'OGM Atelier patent top-handle · Wine', 2300, 'top-handle', '#5a1420'),
  bagItem('bag-saddle-leather', 'OGM Atelier saddle bag · Black', 2200, 'saddle', '#18181a'),
  bagItem('bag-mini-leather-ivory', 'OGM Atelier mini top-handle · Ivory', 1200, 'mini', '#f0ebe0'),
  // Workout sets (wear the top and bottom together)
  item('top-sport-plum', 'top', 'Seamless sports bra · Plum', 280, 'Workout', 'solid', ['#4a1830']),
  item('bottom-legging-plum', 'bottom', 'Seamless leggings · Plum', 320, 'Workout', 'solid', ['#4a1830']),
  item('top-sport-magenta', 'top', 'Panel crop top · Magenta', 300, 'Workout', 'solid', ['#a8169a']),
  item('bottom-legging-magenta', 'bottom', 'Panel leggings · Magenta & black', 360, 'Workout', 'stripes', ['#a8169a', '#141416'], 6),
  item('top-sport-black-lilac', 'top', 'Run bra · Black & lilac', 300, 'Workout', 'stripes', ['#141416', '#c49be6'], 8),
  item('bottom-legging-black-lilac', 'bottom', 'Run tights · Black & lilac', 380, 'Workout', 'stripes', ['#141416', '#c49be6'], 5),
  item('top-sport-black', 'top', 'Halter sports top · Black', 260, 'Workout', 'solid', ['#141416']),
  item('bottom-legging-black', 'bottom', 'Drawcord leggings · Black', 300, 'Workout', 'solid', ['#141416']),
  item('top-sport-navy', 'top', 'Strappy sports bra · Navy & lilac', 280, 'Workout', 'stripes', ['#1a1c3a', '#c9b3ec'], 4),
  item('bottom-legging-navy', 'bottom', 'Shine leggings · Navy', 320, 'Workout', 'solid', ['#1a1c3a']),
  // Joggers outfits: rope-tie joggers with a fitted top
  item('top-rib-emerald', 'top', 'Ribbed long sleeve · Emerald', 240, 'Joggers', 'solid', ['#1d4d33']),
  item('bottom-jogger-emerald', 'bottom', 'Rope-tie joggers · Emerald', 320, 'Joggers', 'solid', ['#1d4d33']),
  item('top-tank-white', 'top', 'Embellished tank · White', 260, 'Joggers', 'solid', ['#f3f1ec']),
  item('bottom-jogger-tangerine', 'bottom', 'Rope-tie joggers · Tangerine', 320, 'Joggers', 'solid', ['#d4341e']),
  item('top-tank-black', 'top', 'Ruched tank · Black', 220, 'Joggers', 'solid', ['#141416']),
  item('bottom-jogger-charcoal', 'bottom', 'Rope-tie joggers · Charcoal', 320, 'Joggers', 'solid', ['#55575c']),
  item('top-bodysuit-white', 'top', 'Racer bodysuit · White', 280, 'Joggers', 'solid', ['#f3f1ec']),
  item('bottom-jogger-black', 'bottom', 'Rope-tie joggers · Black', 320, 'Joggers', 'solid', ['#141416']),
  item('top-rib-burgundy', 'top', 'Ribbed long sleeve · Burgundy', 240, 'Joggers', 'solid', ['#4c1420']),
  item('bottom-jogger-burgundy', 'bottom', 'Rope-tie joggers · Burgundy', 320, 'Joggers', 'solid', ['#4c1420']),
  // Office: tailored separates
  item('top-jacket-burgundy-print', 'top', 'Peplum jacket · Burgundy print', 1600, 'Office', 'stripes', ['#6e1426', '#f1ece4', '#1b1b1d'], 14),
  item('bottom-flare-burgundy', 'bottom', 'Wide trousers · Burgundy', 700, 'Office', 'solid', ['#5a1624']),
  item('top-vest-burgundy', 'top', 'Button vest · Burgundy', 650, 'Office', 'solid', ['#5a1624']),
  item('bottom-flare-cream', 'bottom', 'Draped wide trousers · Cream', 750, 'Office', 'solid', ['#e8e0d0']),
  item('top-shirt-white', 'top', 'Pearl-collar shirt · White', 520, 'Office', 'solid', ['#f5f3ee']),
  item('bottom-maxi-charcoal', 'bottom', 'Pencil maxi · Charcoal', 680, 'Office', 'solid', ['#2b2c30']),
  item('top-shirt-navy-pinstripe', 'top', 'Pinstripe shirt & tie · Navy', 560, 'Office', 'pinstripe', ['#1b2346', '#c9cbd8'], 70),
  item('bottom-skirt-red-leather', 'bottom', 'Leather pencil skirt · Red', 1400, 'Office', 'solid', ['#b5121b']),
  item('top-shirtdress-plaid', 'top', 'Belted shirt dress · Lilac plaid', 680, 'Office', 'check', ['#e9e6ee', '#9b8cc4', '#d6a8c6'], 30),
  item('bottom-shirtdress-plaid', 'bottom', 'Belted shirt dress skirt · Lilac plaid', 520, 'Office', 'check', ['#e9e6ee', '#9b8cc4', '#d6a8c6'], 30),
  // Evening: night-out looks
  item('top-ruched-black', 'top', 'Ruched mini dress top · Black lace', 900, 'Evening', 'check', ['#141416', '#2a2a2e'], 60),
  item('bottom-ruched-black', 'bottom', 'Ruched mini · Black lace', 700, 'Evening', 'check', ['#141416', '#2a2a2e'], 60),
  item('top-satin-red', 'top', 'Satin slip dress · Red', 1300, 'Evening', 'solid', ['#a8111c']),
  item('bottom-satin-red', 'bottom', 'Satin slip skirt · Red', 900, 'Evening', 'solid', ['#a8111c']),
  item('top-halter-black', 'top', 'Plunge halter · Black', 520, 'Evening', 'solid', ['#141416']),
  item('bottom-denim-mini-acid', 'bottom', 'Acid-wash denim mini', 480, 'Evening', 'solid', ['#5e5a48']),
  item('top-satin-halter-navy', 'top', 'Satin cross halter · Navy', 780, 'Evening', 'solid', ['#16204a']),
  item('bottom-ruched-white', 'bottom', 'Ruched mini · White', 520, 'Evening', 'solid', ['#f3f1ec']),
  item('top-cowl-floral', 'top', 'Cowl halter · White & pink bloom', 680, 'Evening', 'batik', ['#f6f2ee', '#e06aa0', '#f2c3d8'], 6),
  item('top-halter-skater-black', 'top', 'Halter skater dress · Black', 740, 'Evening', 'solid', ['#121214']),
  item('top-chiffon-navy', 'top', 'Chiffon cape top · Navy', 720, 'Evening', 'solid', ['#1b1f4a']),
  item('bottom-draped-navy', 'bottom', 'Draped mini · Navy', 520, 'Evening', 'solid', ['#1b1f4a']),
  item('top-metallic-gold-halter', 'top', 'Liquid metallic halter · Gold', 980, 'Evening', 'solid', ['#c9a24f']),
  item('bottom-cargo-mini-white', 'bottom', 'Cargo mini · White denim', 460, 'Evening', 'solid', ['#f1eee8']),
  item('top-corset-bow-pink', 'top', 'Bow corset top · Pink', 640, 'Evening', 'solid', ['#e8a4b4']),
  // Gala gowns: our own couture colourways
  item('top-gala-emerald', 'top', 'Gala bodice · Emerald crystal', 4200, 'Gala', 'check', ['#0f6b5a', '#c9d3d0', '#0a4a3e'], 50),
  item('bottom-gala-emerald', 'bottom', 'Mermaid skirt · Emerald crystal', 4800, 'Gala', 'check', ['#0f6b5a', '#c9d3d0', '#0a4a3e'], 50),
  item('top-gala-fuchsia', 'top', 'Pleated bodice · Fuchsia & pearl', 4400, 'Gala', 'pinstripe', ['#b0186f', '#f3eef0'], 90),
  item('bottom-gala-fuchsia', 'bottom', 'Pleated mermaid skirt · Fuchsia', 4600, 'Gala', 'pinstripe', ['#b0186f', '#f3eef0'], 90),
  item('top-gala-green-satin', 'top', 'Spiral satin bodice · Green', 4000, 'Gala', 'stripes', ['#0f6a2a', '#28b04a'], 60),
  item('bottom-gala-green-satin', 'bottom', 'Spiral satin gown skirt · Green', 4500, 'Gala', 'stripes', ['#0f6a2a', '#28b04a'], 60),
  item('top-gala-cream', 'top', 'Sculpted top · Cream & caramel', 3200, 'Gala', 'solid', ['#efe5cc']),
  item('bottom-gala-teal', 'bottom', 'Buttoned pencil skirt · Deep teal', 2600, 'Gala', 'solid', ['#0f3f3a']),
  // Shoes
  item('shoes-pump-patent-black', 'shoes', 'Patent pumps · Black', 900, 'Evening', 'solid', ['#0e0e10']),
  item('shoes-heel-patent-red', 'shoes', 'Patent heels · Red', 950, 'Evening', 'solid', ['#a8111c']),
  item('shoes-heel-blush', 'shoes', 'Strappy heels · Blush', 820, 'Evening', 'solid', ['#ecc3c8']),
  item('shoes-sandal-metallic-gold', 'shoes', 'Strappy sandals · Gold', 880, 'Evening', 'solid', ['#c9a24f']),
  item('shoes-pump-patent-navy', 'shoes', 'Patent pumps · Navy', 900, 'Evening', 'solid', ['#16204a']),
  item('shoes-slide-velvet-emerald', 'shoes', 'Velvet buckle slides · Emerald', 600, 'Joggers', 'solid', ['#1d4d33']),
  item('shoes-boot-suede-black', 'shoes', 'Slouch knee boots · Black suede', 1300, 'Evening', 'solid', ['#141416']),
  item('shoes-trainer-lilac', 'shoes', 'Court trainers · Lilac', 520, 'Workout', 'solid', ['#c9b3ec']),
  item('shoes-pump-burgundy-patent', 'shoes', 'Pointed pumps · Burgundy patent', 900, 'Office', 'solid', ['#5a1624']),
  // Hair colour
  item('hair-ash-blonde', 'hair', 'Ash blonde', 450, 'Salon', 'solid', ['#cfc6b4']),
  item('hair-auburn', 'hair', 'Auburn', 300, 'Salon', 'solid', ['#6a2a1a']),
  item('hair-ginger', 'hair', 'Ginger', 320, 'Salon', 'solid', ['#a8461c']),
  // ---------------------------------------------------------------- OGM Atelier: the street-style collection
  // Each piece from the looks, sold on its own. Dresses restyle your top and bottom in the dress's fabric.
  // Tops
  item('top-oneshoulder-stone', 'top', 'One-shoulder ruched rib top · Stone', 420, 'Couture', 'solid', ['#d8d0ba']),
  item('top-oneshoulder-cutout-black', 'top', 'One-shoulder cut-out rib top · Black', 400, 'Couture', 'solid', ['#121214']),
  item('top-suede-bomber-tan', 'top', 'Suede bomber jacket · Tan', 1500, 'Couture', 'solid', ['#a8703c']),
  item('top-mockneck-crop-white', 'top', 'Mock-neck cropped tank · White', 260, 'Couture', 'solid', ['#f4f2ee']),
  item('top-trench-crop-stone', 'top', 'Cropped double-breasted trench · Stone', 1400, 'Couture', 'solid', ['#c2bba4']),
  item('top-corset-cami-white', 'top', 'Sweetheart corset cami · White', 380, 'Couture', 'solid', ['#f6f4f0']),
  item('top-cable-knit-cardigan-grey', 'top', 'Cable-knit long cardigan · Grey', 1100, 'Couture', 'solid', ['#a9abad']),
  item('top-corset-plaid-mustard', 'top', 'Lace-up corset top · Mustard & royal plaid', 560, 'Couture', 'check', ['#e2a52a', '#2b4cb3', '#c23a2c'], 24),
  item('top-bell-stripe-rust', 'top', 'Bell-sleeve lace-up crop · Rust stripe', 620, 'Couture', 'stripes', ['#c65a2a', '#8c5a5c', '#e08a3c'], 40),
  item('top-lace-corset-burgundy', 'top', 'Lace-sleeve corset bodysuit · Burgundy', 680, 'Couture', 'lace', ['#4c0f1c', '#6e1a2a'], 26),
  item('top-ruched-blouse-olive', 'top', 'Ruched balloon-sleeve blouse · Olive', 540, 'Couture', 'solid', ['#7c8a1c']),
  item('top-stripe-knit-shirt', 'top', 'Striped knit shirt · Black & white', 520, 'Couture', 'stripes', ['#f2f0ea', '#18181a', '#9a9a9a'], 46),
  item('top-rib-tank-white', 'top', 'Scoop rib tank · White', 180, 'Couture', 'solid', ['#f5f3ef']),
  item('top-denim-jacket-lilac', 'top', 'Oversized denim jacket · Lilac grey', 900, 'Couture', 'solid', ['#7a7f9e']),
  item('top-satin-lace-halter-rust', 'top', 'Satin & lace halter · Rust', 620, 'Couture', 'solid', ['#a8582c']),
  item('top-leather-peplum-chocolate', 'top', 'Leather peplum jacket · Chocolate', 1600, 'Couture', 'solid', ['#3a221a']),
  item('top-bra-top-white', 'top', 'Square bra top · White', 220, 'Couture', 'solid', ['#f6f4f0']),
  item('top-blazer-camel', 'top', 'Relaxed blazer · Camel', 1200, 'Couture', 'solid', ['#b8915e']),
  item('top-chiffon-halter-butter', 'top', 'Chiffon handkerchief halter · Butter', 640, 'Couture', 'solid', ['#ece0a2']),
  item('top-polka-scarf-halter', 'top', 'Polka scarf halter · White & black', 480, 'Couture', 'polka', ['#f4f2ee', '#141416'], 22),
  item('top-silk-scarf-halter-rose', 'top', 'Silk scarf halter · Rose print', 560, 'Couture', 'floral', ['#e3a8b4', '#5a2a3a', '#f6e6ea'], 8),
  item('top-fur-jacket-white', 'top', 'Faux-fur jacket · White', 1800, 'Couture', 'solid', ['#f3f1ec']),
  item('top-cowl-halter-ivory', 'top', 'Cowl-neck halter · Ivory', 480, 'Couture', 'solid', ['#efe9da']),
  item('top-cape-blazer-white', 'top', 'Cape blazer · White', 1500, 'Couture', 'solid', ['#f5f3ee']),
  item('top-offshoulder-knot-olive', 'top', 'Off-shoulder knot top · Olive', 620, 'Couture', 'solid', ['#5f6f2c']),
  item('top-shirt-gold-discs', 'top', 'Shirt with mirror discs · White & gold', 980, 'Couture', 'polka', ['#f4f2ee', '#c9a24f'], 9),
  // Bottoms
  item('bottom-pleat-suede-moss', 'bottom', 'Pleated suede mini with faux-fur belt · Moss', 780, 'Couture', 'solid', ['#6b5236']),
  item('bottom-pleat-patent-black', 'bottom', 'Pleated patent micro skirt · Black', 520, 'Couture', 'solid', ['#0e0e10']),
  item('bottom-legging-sculpt-black', 'bottom', 'Sculpt leggings · Black', 260, 'Couture', 'solid', ['#121214']),
  item('bottom-denim-skinny-indigo', 'bottom', 'High-rise skinny jeans · Dark indigo', 450, 'Couture', 'solid', ['#1c2848']),
  item('bottom-denim-sailor-indigo', 'bottom', 'Sailor-button skinny jeans · Indigo', 520, 'Couture', 'solid', ['#1a2444']),
  item('bottom-denim-skinny-mid', 'bottom', 'Skinny jeans · Mid blue', 420, 'Couture', 'solid', ['#2f4f86']),
  item('bottom-denim-skinny-black', 'bottom', 'High-waist skinny jeans · Black', 420, 'Couture', 'solid', ['#141416']),
  item('bottom-stripe-knit-trouser', 'bottom', 'Striped knit trousers · Black & white', 520, 'Couture', 'stripes', ['#f2f0ea', '#18181a', '#9a9a9a'], 46),
  item('bottom-denim-bermuda-light', 'bottom', 'Wide denim bermudas · Light wash', 420, 'Couture', 'solid', ['#a9c0d8']),
  item('bottom-legging-capri-black', 'bottom', 'Capri leggings · Black', 240, 'Couture', 'solid', ['#121214']),
  item('bottom-drape-maxi-olive', 'bottom', 'Draped maxi skirt with gold knot · Olive', 700, 'Couture', 'solid', ['#5f6f2c']),
  // Dresses: each a top and bottom in one fabric
  ...dress('ruched-mesh-red', 'Ruched mesh mini dress · Red', 1200, 'Couture', 'solid', ['#c0121c']),
  ...dress('strapless-jumpsuit-black', 'Strapless jumpsuit · Black', 900, 'Couture', 'solid', ['#121214']),
  ...dress('cowl-rosette-pink', 'Cowl slip dress with rosettes · Pink', 1300, 'Couture', 'solid', ['#f2c2cc']),
  ...dress('floral-ruffle-lilac', 'Floral ruffle dress · Lilac', 1250, 'Couture', 'floral', ['#ece4f2', '#b08ad0', '#e48aa8'], 9),
  ...dress('rose-blur-mesh', 'One-shoulder rose mesh dress', 1350, 'Couture', 'floral', ['#efd6cc', '#b8262c', '#5a1218'], 4),
  ...dress('lace-ruffle-white', 'Lace ruffle corset dress · White', 1600, 'Couture', 'lace', ['#f6f4f0', '#e6e2da'], 28),
  ...dress('cherry-ruffle-cream', 'Cherry ruffle halter dress · Cream', 1100, 'Couture', 'cherry', ['#f4ead2', '#c0161c', '#2c6a2a'], 10),
  ...dress('halter-bubble-white', 'Cross-halter bubble dress · White & black trim', 1400, 'Couture', 'solid', ['#f3f0e8']),
  ...dress('halter-bow-rust', 'Halter bow dress · Rust', 1200, 'Couture', 'solid', ['#b4582a']),
  ...dress('bow-mini-black', 'Bow mini dress · Black', 1150, 'Couture', 'solid', ['#121214']),
  ...dress('damask-halter-brown', 'Damask halter dress · Brown & white', 1250, 'Couture', 'batik', ['#6e2a1c', '#f4ece0', '#f4ece0'], 7),
  ...dress('satin-cowl-gold', 'Satin cowl halter dress · Gold', 1500, 'Couture', 'solid', ['#c9a23c']),
  ...dress('ribbon-bubble-black', 'Strapless ribbon bubble dress · Black', 1500, 'Couture', 'solid', ['#121214']),
  ...dress('polka-corset-black', 'Polka corset button dress · Black', 1300, 'Couture', 'polka', ['#121214', '#f2f0ea'], 20),
  ...dress('floral-corset-puff', 'Floral corset puff dress', 1450, 'Couture', 'floral', ['#e8eadc', '#d2463c', '#e6a43c'], 7),
  ...dress('velvet-bow-burgundy', 'Velvet bubble dress with bows · Burgundy', 1600, 'Couture', 'solid', ['#5a0f1c']),
  ...dress('swirl-halter-teal', 'Tie-dye halter dress · Teal & flame', 1200, 'Couture', 'swirl', ['#0f8a8a', '#d2462a', '#1a2a2a'], 5),
  ...dress('lace-halter-black', 'Lace halter ruffle dress · Black', 1300, 'Couture', 'lace', ['#121214', '#2a2a2e'], 26),
  ...dress('pleat-drop-red', 'Pleated drop-waist dress · Red', 1350, 'Couture', 'solid', ['#b8101c']),
  ...dress('feather-corset-gown-red', 'Feather corset gown · Red', 3800, 'Gala', 'solid', ['#b8101c']),
  ...dress('satin-halter-gown-gold', 'Satin halter gown · Gold', 3600, 'Gala', 'solid', ['#d2a42e']),
  ...dress('ruffle-bodycon-lime', 'Bell-sleeve ruffle bodycon · Lime', 1250, 'Couture', 'solid', ['#8fbf22']),
  ...dress('swirl-asym-brown', 'Asymmetric tie-dye dress · Brown', 1200, 'Couture', 'swirl', ['#6a3a22', '#e8d6c0', '#2a1810'], 5),
  ...dress('stripe-rosette-corset', 'Striped rosette corset dress · Black & white', 1700, 'Couture', 'stripes', ['#f4f2ee', '#121214', '#f4f2ee'], 9),
  ...dress('feather-tie-white', 'Feather-trim tie dress · White', 1500, 'Couture', 'solid', ['#f4f1ea']),
  ...dress('lace-halter-black-mini', 'Lace plunge halter mini · Black', 1100, 'Couture', 'lace', ['#121214', '#2a2a2e'], 30),
  ...dress('sweetheart-midi-black', 'Sweetheart satin midi gown · Black', 3200, 'Gala', 'solid', ['#0e0e10']),
  ...dress('corset-gown-chocolate', 'Off-shoulder corset gown · Chocolate', 3400, 'Gala', 'solid', ['#4a1c18']),
  ...dress('halter-ruffle-maxi-black', 'Halter ruffle maxi · Black', 2800, 'Gala', 'solid', ['#121214']),
  ...dress('tweed-button-pink', 'Tweed button dress · Pink & black trim', 1500, 'Couture', 'solid', ['#f2b6c4']),
  ...dress('ruffle-offshoulder-burgundy', 'Ruffle off-shoulder dress · Burgundy', 1300, 'Couture', 'solid', ['#7a1424']),
  ...dress('maxi-bodycon-black', 'Long-sleeve maxi bodycon · Black', 900, 'Couture', 'solid', ['#121214']),
  ...dress('leopard-halter-ruffle', 'Leopard halter ruffle dress', 1150, 'Couture', 'leopard', ['#d8b06a', '#1a1410', '#8a5a2a'], 10),
  // Shoes
  item('shoes-western-buckle-cream', 'shoes', 'Western buckle mules · Cream & gold', 1100, 'Couture', 'solid', ['#e6dac0']),
  item('shoes-strappy-stiletto-pink-patent', 'shoes', 'Ankle-strap stilettos · Pink patent', 950, 'Couture', 'solid', ['#f0a8c0']),
  item('shoes-lock-sandal-metallic-red', 'shoes', 'Lock-charm sandals · Metallic red', 1000, 'Couture', 'solid', ['#b8121c']),
  item('shoes-wrap-boot-suede-tan', 'shoes', 'Wrap-strap knee boots · Tan suede', 1500, 'Couture', 'solid', ['#a8703c']),
  item('shoes-slouch-boot-suede-sage', 'shoes', 'Slouch knee boots · Sage suede', 1400, 'Couture', 'solid', ['#9a9a7c']),
  item('shoes-buckle-slide-mustard', 'shoes', 'Buckle slides · Mustard leather', 480, 'Couture', 'solid', ['#d2a020']),
  item('shoes-cutout-slide-orange', 'shoes', 'Cut-out slides · Orange leather', 480, 'Couture', 'solid', ['#e2742a']),
  item('shoes-buckle-slide-burgundy', 'shoes', 'Buckle slides · Burgundy leather', 480, 'Couture', 'solid', ['#7a1424']),
  item('shoes-croc-slide-olive', 'shoes', 'Gold-buckle slides · Olive croc', 620, 'Couture', 'solid', ['#7c8a3c']),
  item('shoes-marabou-mule-pink', 'shoes', 'Marabou mules with clear heel · Pink', 680, 'Couture', 'solid', ['#f4b8c8']),
  item('shoes-crystal-coil-lilac', 'shoes', 'Crystal coil sandals · Lilac', 1600, 'Couture', 'solid', ['#c8b4e4']),
  item('shoes-crystal-coil-red', 'shoes', 'Crystal coil sandals · Red', 1600, 'Couture', 'solid', ['#b8121c']),
  item('shoes-flower-sandal-burgundy', 'shoes', 'Flower appliqué sandals · Burgundy', 1400, 'Couture', 'solid', ['#7a1a2c']),
  item('shoes-butterfly-coil-butter', 'shoes', 'Butterfly coil sandals · Butter', 1500, 'Couture', 'solid', ['#f0e2a0']),
  item('shoes-fur-chain-mule-white', 'shoes', 'Fur mules with gold chain · White', 1300, 'Couture', 'solid', ['#f4f1ec']),
  item('shoes-chain-pump-black-patent', 'shoes', 'Chain-anklet pumps · Black patent', 1100, 'Couture', 'solid', ['#0e0e10']),
  item('shoes-lace-butterfly-black', 'shoes', 'Lace butterfly heels · Black', 1400, 'Couture', 'lace', ['#121214', '#2e2a2c'], 40),
  item('shoes-crystal-leaf-black', 'shoes', 'Crystal leaf heels · Black', 1500, 'Couture', 'solid', ['#121214']),
  item('shoes-cutout-slide-white', 'shoes', 'Cut-out slides · White leather', 480, 'Couture', 'solid', ['#f2efe8']),
  item('shoes-ballet-red-patent', 'shoes', 'Bow ballet flats · Red patent', 420, 'Couture', 'solid', ['#b8121c']),
  item('shoes-clear-mule-black-red', 'shoes', 'Clear-vamp mules · Black & red', 900, 'Couture', 'solid', ['#141416']),
  item('shoes-slingback-gold-heel-black', 'shoes', 'Gold-heel slingbacks · Black', 1200, 'Couture', 'solid', ['#121214']),
  item('shoes-ribbon-slingback-nude', 'shoes', 'Ribbon slingbacks · Nude mesh', 1100, 'Couture', 'solid', ['#d8bc9c']),
  item('shoes-knot-sandal-crystal-ice', 'shoes', 'Crystal knot sandals · Ice blue', 1500, 'Couture', 'solid', ['#a8c0d8']),
  item('shoes-quilted-slide-grey', 'shoes', 'Quilted slides · Grey', 520, 'Couture', 'solid', ['#8e8f92']),
  item('shoes-twist-mule-metallic-gold', 'shoes', 'Twist mules · Gold metallic', 1000, 'Couture', 'solid', ['#d2aa48']),
  item('shoes-pointed-mule-black-red', 'shoes', 'Pointed mules · Black with red lining', 950, 'Couture', 'solid', ['#121214']),
  item('shoes-studded-slingback-red-patent', 'shoes', 'Studded slingbacks · Red patent', 1300, 'Couture', 'solid', ['#c0101c']),
  item('shoes-pump-nude-patent', 'shoes', 'Pointed pumps · Nude patent', 900, 'Couture', 'solid', ['#d6b496']),
  item('shoes-flower-strappy-lime', 'shoes', 'Flower strappy heels · Lime', 900, 'Couture', 'solid', ['#d8e6a0']),
  item('shoes-pump-chocolate-patent', 'shoes', 'Pointed pumps · Chocolate patent', 900, 'Couture', 'solid', ['#4a2416']),
  item('shoes-crystal-strap-heel-black', 'shoes', 'Crystal-strap heels · Black suede', 1000, 'Couture', 'solid', ['#121214']),
  item('shoes-brooch-pump-emerald-satin', 'shoes', 'Brooch pumps · Emerald satin', 1300, 'Couture', 'solid', ['#0f5a3e']),
  item('shoes-wave-pump-pink-patent', 'shoes', 'Wave-edge pumps · Pink patent', 1100, 'Couture', 'solid', ['#f2a8bc']),
  item('shoes-kitten-thong-tan', 'shoes', 'Clear kitten thongs · Tan', 520, 'Couture', 'solid', ['#c08a62']),
  item('shoes-mule-black-patent', 'shoes', 'Stiletto mules · Black patent', 850, 'Couture', 'solid', ['#0e0e10']),
  item('shoes-bow-mule-black', 'shoes', 'Bow mules · Black', 700, 'Couture', 'solid', ['#121214']),
  item('shoes-crystal-mule-gold', 'shoes', 'Crystal-bow mules · Gold satin', 1100, 'Couture', 'solid', ['#b8a050']),
  item('shoes-kitten-thong-black', 'shoes', 'Kitten thong mules · Black', 520, 'Couture', 'solid', ['#121214']),
  item('shoes-buckle-mule-burgundy', 'shoes', 'Pointed buckle mules · Burgundy', 900, 'Couture', 'solid', ['#7a1a2c']),
  item('shoes-buckle-strappy-red-patent', 'shoes', 'Buckle strappy sandals · Red patent', 1000, 'Couture', 'solid', ['#c0101c']),
  item('shoes-crystal-coil-burgundy', 'shoes', 'Crystal coil sandals · Burgundy', 1600, 'Couture', 'solid', ['#6e1424']),
  item('shoes-strappy-burgundy-patent', 'shoes', 'Strappy sandals · Burgundy patent', 900, 'Couture', 'solid', ['#6e1424']),
  item('shoes-slide-burgundy-patent', 'shoes', 'Cut-out slides · Burgundy patent', 520, 'Couture', 'solid', ['#6e1424']),
  item('shoes-fur-strap-heel-black', 'shoes', 'Fur-strap heels · Black', 950, 'Couture', 'solid', ['#121214']),
  // Hair colour (the salon dyes your own hair; the cut stays yours)
  item('hair-honey-highlights', 'hair', 'Honey blonde highlights', 520, 'Salon', 'stripes', ['#6a4628', '#c8a066'], 70),
  item('hair-jet-black', 'hair', 'Jet black', 260, 'Salon', 'solid', ['#0c0c0e']),
  item('hair-cherry-red', 'hair', 'Cherry red', 480, 'Salon', 'stripes', ['#a8101a', '#e0303a'], 60),
  item('hair-wine-burgundy', 'hair', 'Wine burgundy', 420, 'Salon', 'solid', ['#4a0e1a']),
  item('hair-copper-streak', 'hair', 'Burgundy with copper streaks', 520, 'Salon', 'stripes', ['#4a1418', '#c4743a'], 50),
  item('hair-red-streak-black', 'hair', 'Black with red streaks', 480, 'Salon', 'stripes', ['#160c0e', '#9a1424'], 50),
  item('hair-silver-grey', 'hair', 'Silver grey', 560, 'Salon', 'solid', ['#9a9c9e']),
  item('hair-emerald', 'hair', 'Emerald green', 560, 'Salon', 'solid', ['#0f4a32']),
  item('hair-chestnut', 'hair', 'Chestnut brown', 320, 'Salon', 'solid', ['#5a3420']),
  item('hair-mocha-balayage', 'hair', 'Mocha balayage', 560, 'Salon', 'stripes', ['#6a4a3a', '#c8aa8a'], 60),
  item('hair-copper-glow', 'hair', 'Copper glow', 420, 'Salon', 'solid', ['#a84a1e']),
  // Bags
  bagItem('bag-baguette-canvas-tan', 'Canvas shoulder bag · Ecru & tan', 1400, 'baguette', '#e8e0cc', '#9a5a2a'),
  bagItem('bag-pouch-marabou-black', 'Marabou fur shoulder bag · Black', 900, 'pouch', '#141416'),
  bagItem('bag-dome-ribbed-metallic-red', 'Ribbed ring-handle bag · Metallic red', 1100, 'ring', '#b8121c'),
  bagItem('bag-barrel-canvas-cognac', 'Canvas barrel bag · Cognac', 1300, 'barrel', '#6a3e22', '#d2a070'),
  bagItem('bag-kelly-clutch-black', 'Turn-lock clutch · Black leather', 1800, 'kelly', '#121214'),
  bagItem('bag-flap-quilted-black', 'Quilted chain flap bag · Black', 2200, 'flap', '#121214'),
  bagItem('bag-kelly-painted-tan', 'Painted top-handle bag · Tan', 2600, 'kelly', '#c49a5c', '#e8b030'),
  bagItem('bag-kelly-orange', 'Turn-lock top-handle · Orange', 2400, 'kelly', '#e2621c'),
  bagItem('bag-clutch-burgundy-leather', 'Turn-lock clutch · Burgundy leather', 1200, 'kelly', '#6e1424'),
  bagItem('bag-flap-croc-olive', 'Chain flap bag · Olive croc', 2400, 'flap', '#6e7c2a'),
  bagItem('bag-box-glitter-pink', 'Glitter box clutch with pearl strap · Pink', 900, 'box', '#e8a0b4'),
  bagItem('bag-oval-acrylic-lilac', 'Marble acrylic clutch · Lilac', 850, 'oval', '#c4b0dc'),
  bagItem('bag-fringe-velvet-burgundy', 'Velvet fringe bag with gold hook · Burgundy', 1600, 'fringe', '#6e0f1e'),
  bagItem('bag-clutch-knit-fur-burgundy', 'Knit clutch with fur trim · Burgundy', 700, 'clutch', '#6e1424', '#f2ece0'),
  bagItem('bag-top-handle-leather-butter', 'Top-handle bag with flower charm · Butter leather', 1900, 'top-handle', '#ece0a8'),
  bagItem('bag-pebble-metallic-gold', 'Molten pebble clutch · Gold', 1200, 'oval', '#c9a03a'),
  bagItem('bag-fringe-rhinestone-silver', 'Rhinestone fringe clutch · Silver', 1100, 'fringe', '#c8ccd0'),
  bagItem('bag-box-rope-black', 'Rope-handle box bag · Black & gold', 950, 'box', '#121214', '#c9a03a'),
  bagItem('bag-ring-leather-white', 'Ring-handle pouch · White leather', 1300, 'ring', '#f2efe8'),
  bagItem('bag-box-sequin-black', 'Sequin clutch · Black', 850, 'box', '#1a1820'),
  bagItem('bag-flap-quilted-sky', 'Quilted mini flap · Sky blue', 1600, 'flap', '#7aa4dc'),
  bagItem('bag-top-handle-black-cream', 'Top-handle bag · Black & cream', 1800, 'top-handle', '#141416', '#ece4d0'),
  bagItem('bag-top-handle-grey-chain', 'Top-handle bag with chains · Dove grey', 2100, 'top-handle', '#c8c8c4'),
  bagItem('bag-baguette-plum', 'Long shoulder bag · Plum', 900, 'baguette', '#4a1428'),
  bagItem('bag-pleat-satin-cream', 'Pleated shell clutch · Cream satin', 850, 'pleat', '#ece2cc'),
  bagItem('bag-flap-quilted-grey', 'Quilted flap bag · Grey', 1500, 'flap', '#8e8f92'),
  bagItem('bag-clutch-woven-metallic-gold', 'Woven clutch · Gold', 1700, 'clutch', '#d2a83c'),
  bagItem('bag-top-handle-red-woven', 'Top-handle bag with woven trim · Red', 2200, 'top-handle', '#b8121c', '#d8c49a'),
  bagItem('bag-flap-studded-red-patent', 'Studded flap bag · Red patent', 2000, 'flap', '#c0101c'),
  bagItem('bag-clutch-tassel-nude', 'Tassel flap clutch · Nude', 1300, 'clutch', '#e2ccb4'),
  bagItem('bag-clutch-woven-sage', 'Woven clutch · Sage', 1200, 'clutch', '#5a8a74'),
  bagItem('bag-tote-chocolate-patent', 'Structured tote · Chocolate patent', 1500, 'tote', '#4a2416'),
  bagItem('bag-tote-buckle-black', 'Buckle shoulder bag · Black', 1100, 'tote', '#121214'),
  bagItem('bag-top-handle-emerald', 'Top-handle bag · Emerald', 2000, 'top-handle', '#0f4a32'),
  bagItem('bag-kelly-grey-scarf', 'Turn-lock bag with scarf · Taupe', 2400, 'kelly', '#8a8478', '#f2a8c8'),
  bagItem('bag-baguette-flower-blush', 'Flower-studded baguette · Blush', 1300, 'baguette', '#ecd2c8'),
  bagItem('bag-pouch-suede-chocolate', 'Suede pouch clutch · Chocolate', 950, 'pouch', '#3e2418'),
  bagItem('bag-bucket-black-leather', 'Drawstring bucket · Black leather', 1200, 'bucket', '#121214'),
  bagItem('bag-kelly-clutch-croc-black', 'Croc clutch · Black', 1600, 'kelly', '#121214'),
  bagItem('bag-pouch-polka', 'Slouch bag · Cream polka', 900, 'pouch', '#f2ece0', '#121214'),
  bagItem('bag-pouch-knot-black', 'Knot hobo · Black leather', 1100, 'pouch', '#121214'),
  bagItem('bag-kelly-croc-red', 'Croc turn-lock bag · Red', 2600, 'kelly', '#b8101c'),
  bagItem('bag-knot-rhinestone-red', 'Crystal knot bag · Red', 1500, 'knot', '#c0101c'),
  bagItem('bag-top-handle-burgundy-embossed', 'Embossed top-handle bag · Burgundy', 2200, 'top-handle', '#5a1420'),
  bagItem('bag-top-handle-black-pearl', 'Top-handle bag with pearl wrap · Black', 1700, 'top-handle', '#121214', '#f2ece0'),
  bagItem('bag-tote-pompom-pink', 'Tote with pompom charm · Pink', 900, 'tote', '#f2b6c4'),
  bagItem('bag-top-handle-black-scarf', 'Top-handle bag with scarf · Black', 1800, 'top-handle', '#121214', '#f2ece0'),
  bagItem('bag-pleat-leather-burgundy', 'Pleated pouch with chain · Burgundy', 1400, 'pleat', '#5a1424'),
  bagItem('bag-tote-buckle-black-suede', 'Buckle tote · Black suede', 1200, 'tote', '#141416'),
  // Necklaces
  worn('neck-layered-pearl-cross-gold', 'neck', 'Layered pearl & chain with cross · Gold', 650, 'layered', ['#d2b06a', '#f2ece0', '#ece6f2'], 'cross'),
  worn('neck-charms-enamel-silver', 'neck', 'Enamel charm choker · Silver & rainbow', 900, 'charms', ['#c8ccd0', '#e8323c', '#2a8ae8']),
  worn('neck-iced-cross-ruby', 'neck', 'Iced cross with rubies · Silver', 1200, 'chain', ['#d6d8dc', '#b8121c', '#f2f4f8'], 'cross'),
  worn('neck-crystal-pink', 'neck', 'Pink crystal collar & drop', 1500, 'collar', ['#d6d8dc', '#f2a0b8', '#f2f4f8'], 'drop'),
  worn('neck-pearl-bow', 'neck', 'Pearl strand with bow', 700, 'pearls', ['#f2ece0', '#f2ece0', '#d2b06a'], 'bow'),
  worn('neck-rose-choker-red', 'neck', 'Rose choker · Red & gold', 800, 'roses', ['#d2b06a', '#b8121c', '#f2f4f8']),
  worn('neck-ruby-collar-silver', 'neck', 'Ruby & crystal collar · Silver', 2200, 'collar', ['#d6d8dc', '#a8101c', '#f2f4f8'], 'drop'),
  worn('neck-flower-pendant-gold', 'neck', 'Flower pendant with pearl · Gold', 600, 'snake', ['#d8b048', '#f2ece0', '#d8b048'], 'flower'),
  worn('neck-snake-lariat-gold', 'neck', 'Snake chain lariat · Gold', 700, 'snake', ['#d8b048', '#d8b048', '#d8b048'], 'drop'),
  worn('neck-heart-snake-gold', 'neck', 'Heart pendant snake chain · Gold', 650, 'snake', ['#d8b048', '#d8b048', '#d8b048'], 'heart'),
  worn('neck-heart-snake-silver', 'neck', 'Heart pendant snake chain · Silver', 600, 'snake', ['#d6d8dc', '#d6d8dc', '#d6d8dc'], 'heart'),
  worn('neck-black-crystal-collar', 'neck', 'Black crystal collar & teardrop', 1400, 'collar', ['#c8ccd0', '#141418', '#2a2a30'], 'drop'),
  worn('neck-knot-rings-gold', 'neck', 'Interlocking rings · Gold', 550, 'chain', ['#d8b048', '#d8b048', '#d8b048'], 'knot'),
  worn('neck-droplet-charm-gold', 'neck', 'Droplet charm necklace · Gold', 750, 'chain', ['#d8b048', '#f2f4f8', '#d8b048'], 'drops'),
  worn('neck-solitaire-gold', 'neck', 'Solitaire pendant · Gold', 1300, 'chain', ['#d8b048', '#f2f4f8', '#d8b048'], 'solitaire'),
  worn('neck-clover-black-gold', 'neck', 'Clover pendant · Black & gold', 700, 'chain', ['#d8b048', '#141416', '#d8b048'], 'clover'),
  worn('neck-ruby-pendant-silver', 'neck', 'Ruby teardrop necklace · Silver', 1800, 'collar', ['#d6d8dc', '#b8121c', '#f2f4f8'], 'drop'),
  worn('neck-double-heart-gold', 'neck', 'Double heart necklace · Gold', 600, 'chain', ['#d8b048', '#f2f4f8', '#d8b048'], 'heart'),
  worn('neck-sun-pearl', 'neck', 'Pearl strand with sun charm', 650, 'pearls', ['#f2ece0', '#f2ece0', '#d8b048'], 'sun'),
  // Earrings
  worn('ears-pave-huggie-gold', 'ears', 'Pavé huggie hoops · Gold', 500, 'hoop', ['#d8b048', '#f2f4f8']),
  worn('ears-crystal-stud-gold', 'ears', 'Crystal studs · Gold', 450, 'stud', ['#d8b048', '#f2f4f8']),
  worn('ears-crystal-stud-silver', 'ears', 'Crystal studs · Silver', 420, 'stud', ['#d6d8dc', '#f2f4f8']),
  worn('ears-drop-pink-crystal', 'ears', 'Pink crystal drops', 700, 'drop', ['#d6d8dc', '#f2a0b8']),
  worn('ears-bow-pearl', 'ears', 'Pearl bow studs', 450, 'bow', ['#f2ece0', '#f2ece0', '#d2b06a']),
  worn('ears-chandelier-ruby', 'ears', 'Ruby chandelier earrings', 1100, 'chandelier', ['#d6d8dc', '#a8101c']),
  worn('ears-flower-gold', 'ears', 'Flower studs with pearl · Gold', 450, 'flower', ['#d8b048', '#f2ece0']),
  worn('ears-bow-gold', 'ears', 'Sculpted bow studs · Gold', 480, 'bow', ['#d8b048', '#d8b048']),
  worn('ears-drop-black-crystal', 'ears', 'Black crystal teardrops', 650, 'drop', ['#c8ccd0', '#141418']),
  worn('ears-garnet-stud-gold', 'ears', 'Garnet studs · Gold', 520, 'stud', ['#d8b048', '#8a1420']),
  worn('ears-onyx-stud-gold', 'ears', 'Onyx studs · Gold', 520, 'stud', ['#d8b048', '#141416']),
  worn('ears-tassel-coral', 'ears', 'Tassel earrings · Coral', 380, 'tassel', ['#d8b048', '#f0503c']),
  worn('ears-chunky-hoop-gold', 'ears', 'Chunky J hoops · Gold', 600, 'chunky-hoop', ['#d8b048', '#d8b048']),
  worn('ears-clover-black-gold', 'ears', 'Clover studs · Black & gold', 450, 'clover', ['#d8b048', '#141416']),
  worn('ears-ruby-drop-silver', 'ears', 'Ruby teardrops · Silver', 900, 'drop', ['#d6d8dc', '#b8121c']),
  // Watches and bangles
  worn('wrist-iced-tonneau-black', 'wrist', 'Iced tonneau watch · Black strap', 2600, 'iced-watch', ['#d6d8dc', '#f2f4f8', '#121214']),
  worn('wrist-iced-red-dial', 'wrist', 'Iced bracelet watch · Red dial', 2200, 'iced-watch', ['#d6d8dc', '#b8121c', '#d6d8dc']),
  worn('wrist-chrono-gold', 'wrist', 'Chronograph watch · Gold', 2400, 'watch', ['#d8b048', '#d8b048', '#d8b048']),
  worn('wrist-tank-gold', 'wrist', 'Square tank watch · Gold', 1900, 'watch', ['#d8b048', '#f2ece0', '#d8b048']),
  worn('wrist-silver-tennis-stack', 'wrist', 'Silver watch & tennis bracelet', 2300, 'stack', ['#d6d8dc', '#121214', '#f2f4f8']),
  worn('wrist-gold-coil', 'wrist', 'Coil bangle stack · Gold', 900, 'coil', ['#d8b048', '#d8b048', '#d8b048']),
  worn('wrist-knot-rose-gold', 'wrist', 'Pavé knot bangle · Rose gold', 1600, 'knot', ['#d8a088', '#f2f4f8', '#d8a088']),
  worn('wrist-gold-watch-set', 'wrist', 'Crystal watch & bangle set · Gold', 1100, 'stack', ['#d8b048', '#e8d8a0', '#f2f4f8']),
  worn('wrist-gold-stack-clover', 'wrist', 'Watch, nail bangle & clover bracelet · Gold', 1800, 'stack', ['#d8b048', '#f2ece0', '#d8b048']),
  worn('wrist-resin-bangle', 'wrist', 'Resin & gold bangles', 450, 'bangle', ['#d8b048', '#8a2a1c', '#f2ece0']),
  worn('wrist-gold-cuff', 'wrist', 'Sculpted cuff · Gold', 900, 'cuff', ['#d8b048', '#d8b048', '#d8b048']),
  worn('wrist-open-bangle-gold', 'wrist', 'Open teardrop bangle · Gold', 600, 'bangle', ['#d8b048', '#d8b048', '#d8b048']),
  worn('wrist-clover-watch-rose', 'wrist', 'Starry watch & clover set · Rose gold', 900, 'watch', ['#d8a088', '#141416', '#121214']),
  // Rings (the right hand; a stack goes across two fingers)
  worn('rings-sphere-gold', 'rings', 'Triple sphere ring · Gold', 650, 'sphere', ['#d8b048', '#d8b048', '#d8b048']),
  worn('rings-chunky-dome-gold', 'rings', 'Chunky dome ring · Gold', 550, 'sculpt', ['#d8b048', '#d8b048', '#d8b048']),
  worn('rings-molten-gold', 'rings', 'Molten wave ring · Gold', 600, 'sculpt', ['#d8b048', '#d8b048', '#d8b048']),
  worn('rings-coil-gold', 'rings', 'Spring coil ring · Gold', 500, 'coil', ['#d8b048', '#d8b048', '#d8b048']),
  worn('rings-pave-stack-gold', 'rings', 'Pavé stacking rings · Gold', 900, 'stack', ['#d8b048', '#f2f4f8', '#d8b048']),
  worn('rings-pave-stack-rose', 'rings', 'Pavé stacking rings · Rose gold', 900, 'stack', ['#d8a088', '#f2f4f8', '#d8a088']),
  worn('rings-eternity-band-gold', 'rings', 'Eternity band · Gold', 1200, 'band', ['#d8b048', '#f2f4f8', '#d8b048']),
  worn('rings-solitaire-gold', 'rings', 'Solitaire ring · Gold', 1800, 'solitaire', ['#d8b048', '#f2f4f8', '#d8b048']),
  worn('rings-cocktail-ruby-silver', 'rings', 'Ruby cocktail ring · Silver', 1100, 'cocktail', ['#d6d8dc', '#b8121c', '#f2f4f8']),
  worn('rings-cocktail-emerald-gold', 'rings', 'Emerald cocktail ring · Gold', 1100, 'cocktail', ['#d8b048', '#1d6e52', '#f2f4f8']),
  worn('rings-band-silver', 'rings', 'Plain band · Silver', 300, 'band', ['#d6d8dc', '#d6d8dc', '#d6d8dc']),
  // Sunglasses
  worn('eyes-oval-cream', 'eyes', 'Oval sunglasses · Cream & brown', 480, 'oval', ['#e2cfa6', '#5a3c22']),
  worn('eyes-rect-black-pink', 'eyes', 'Rectangle sunglasses · Black & pink', 450, 'rect', ['#121214', '#f0a0b8']),
  worn('eyes-cateye-red', 'eyes', 'Cat-eye sunglasses · Red & mirror', 450, 'cat-eye', ['#c0121c', '#c8ccd0']),
  worn('eyes-rimless-gold', 'eyes', 'Rimless ovals · Gold & smoke', 520, 'rimless', ['#d8b048', '#2a2a2c']),
  worn('eyes-oval-black-white', 'eyes', 'Bold ovals · Black & white', 480, 'oval', ['#121214', '#2a2624']),
  worn('eyes-shield-gold', 'eyes', 'Shield sunglasses · Gold', 520, 'shield', ['#d8b048', '#6a5a8a']),
  worn('eyes-round-tortoise', 'eyes', 'Round sunglasses · Tortoise', 420, 'round', ['#6a3a1c', '#3a2a1c']),
  // Nails (done at the salon; long nails on your own hands)
  worn('nails-pearl-almond', 'nails', 'Pearl chrome almonds', 350, 'almond', ['#f2ece2', '#f2ece2']),
  worn('nails-criss-cross-coffin', 'nails', 'Criss-cross coffins · Black & pink', 450, 'coffin', ['#1a1416', '#f2a8bc']),
  worn('nails-red-stiletto', 'nails', 'Glossy stilettos · Red', 380, 'stiletto', ['#c0101c', '#c0101c']),
  worn('nails-pink-flower-square', 'nails', '3D flower squares · Pink', 420, 'square', ['#f4bccc', '#ffffff']),
  worn('nails-lilac-french', 'nails', 'Lilac French with bows', 400, 'square', ['#f2d8d0', '#b8a0e4']),
  worn('nails-red-ombre-square', 'nails', 'Red ombré squares', 380, 'square', ['#f2c8c0', '#c0101c']),
  worn('nails-burgundy-flower-almond', 'nails', 'Burgundy flower almonds', 420, 'almond', ['#f2c8c0', '#6e1424']),
  worn('nails-cherry-bow-almond', 'nails', 'Cherry & bow almonds · Butter', 420, 'almond', ['#f2e2a0', '#c0101c']),
  worn('nails-black-gold-coffin', 'nails', 'Black & gold French coffins', 450, 'coffin', ['#f2d8cc', '#121214']),
  worn('nails-smiley-coffin', 'nails', 'Smiley coffins · White & black', 420, 'coffin', ['#f4f2ee', '#121214']),
  worn('nails-black-bow-coffin', 'nails', 'Black bow French coffins', 450, 'coffin', ['#f2c8c0', '#121214']),
  worn('nails-gold-swirl-stiletto', 'nails', 'Gold swirl stilettos', 480, 'stiletto', ['#f2d8cc', '#d8b048']),
  worn('nails-red-ombre-coffin', 'nails', 'Red ombré coffins', 380, 'coffin', ['#f2c8c0', '#c0101c']),
  worn('nails-green-marble-almond', 'nails', 'Green marble almonds', 450, 'almond', ['#e8cfba', '#3a7a5a']),
  worn('nails-sage-ombre-coffin', 'nails', 'Sage ombré coffins', 380, 'coffin', ['#f0c8b0', '#8ac4a0']),
  worn('nails-chocolate-almond', 'nails', 'Chocolate glaze almonds', 350, 'almond', ['#5a2a16', '#5a2a16']),
  worn('nails-bronze-chrome-square', 'nails', 'Bronze chrome squares', 400, 'square', ['#8a5a3a', '#8a5a3a']),
  worn('nails-camo-french-coffin', 'nails', 'Emerald camo French coffins', 420, 'coffin', ['#f2c8c0', '#1d5a3a']),
  worn('nails-pink-french-square', 'nails', 'Pink French squares', 350, 'square', ['#f2c4d0', '#ffffff']),
  worn('nails-pink-heart-square', 'nails', 'Pink hearts & bows', 380, 'square', ['#f4b8c8', '#ffffff']),
  worn('nails-burgundy-heart-french', 'nails', 'Burgundy heart French', 380, 'square', ['#f2c8c0', '#6e1424']),
  worn('nails-burgundy-flower-stiletto', 'nails', 'Burgundy flower stilettos', 450, 'stiletto', ['#f2c8c0', '#7a1424']),
  worn('nails-black-swirl-coffin', 'nails', 'Black swirl French coffins', 420, 'coffin', ['#3a2a2a', '#121214']),
  worn('nails-gold-chrome-almond', 'nails', 'Gold chrome almonds', 420, 'almond', ['#d8b048', '#d8b048']),
  // Collectibles: earned through achievements (lib/life.ts), never sold in shops
  item('top-explorer-kente', 'top', "Explorer's kente", 0, 'Rewards', 'kente', ['#1f6b4f', '#d4a85a', '#13202a'], 10, []),
  item('top-gogetter-silk', 'top', 'Go-getter silk · Emerald', 0, 'Rewards', 'solid', ['#1d6e52'], 18, []),
  item('top-festival-adire', 'top', 'Festival adire · Gold resist', 0, 'Rewards', 'adire', ['#2b1d4f', '#e3c27a', '#3a2a6e'], 22, []),
  item('top-friendship-ankara', 'top', 'Friendship ankara', 0, 'Rewards', 'ankara', ['#b8463a', '#1f6b4f', '#f0d6a0'], 16, []),
  item('shoes-trail-emerald', 'shoes', 'Trail runners · Emerald', 0, 'Rewards', 'solid', ['#2f8f6b'], 18, []),
  item('hair-rose-gold', 'hair', 'Rose gold', 0, 'Rewards', 'solid', ['#b9776a'], 18, []),
];

export const itemById = (id: string | null | undefined) => FASHION_ITEMS.find((i) => i.id === id);

/** Colours you can choose for a plain (single-colour) piece: shoes, bags and solid tops and bottoms. */
export const COLOUR_CHOICES: readonly { name: string; hex: string }[] = [
  { name: 'Black', hex: '#1b1b1d' },
  { name: 'Ivory', hex: '#ece4d4' },
  { name: 'Camel', hex: '#b48a5a' },
  { name: 'Cognac', hex: '#94623a' },
  { name: 'Chocolate', hex: '#4a2e1f' },
  { name: 'Burgundy', hex: '#5c1f2b' },
  { name: 'Red', hex: '#a8242f' },
  { name: 'Blush', hex: '#e2b4ae' },
  { name: 'Fuchsia', hex: '#b02a6f' },
  { name: 'Emerald', hex: '#1d6e52' },
  { name: 'Navy', hex: '#1d2a4a' },
  { name: 'Sky', hex: '#8ab4d8' },
  { name: 'Lilac', hex: '#a796c8' },
  { name: 'Gold', hex: '#c7a24f' },
  { name: 'Silver', hex: '#b9bcbf' },
];

/** Whether you can choose this piece's colour: single-colour pieces, but not hair dye (each dye is its own shade). */
export const recolourable = (i: FashionItem) => i.style.pattern === 'solid' && i.slot !== 'hair' && i.collection !== 'Rewards'
  // Jewellery and frames are metal and stones; two-tone bags and nail art keep their own colours
  && !['neck', 'ears', 'wrist', 'eyes', 'rings'].includes(i.slot) && ((i.slot !== 'bag' && i.slot !== 'nails') || i.style.colors[1] === i.style.colors[0]);

/** An item's style in the colour you chose for it (its own colour if none, or if the choice isn't one on offer). */
export function styleIn(i: FashionItem, colour?: string): Style {
  if (!colour || !recolourable(i) || !COLOUR_CHOICES.some((c) => c.hex === colour)) return i.style;
  return { ...i.style, colors: [colour, colour, colour] };
}

/** The name of a colour choice, if it is one. */
export const colourName = (hex: string | undefined) => COLOUR_CHOICES.find((c) => c.hex === hex)?.name;

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
  /** The colour you chose for a plain piece, by item id (also for a piece you're about to buy). */
  colours?: Record<string, string>;
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
  const colours: Record<string, string> = {};
  const rawColours = (w as { colours?: unknown }).colours;
  if (typeof rawColours === 'object' && rawColours !== null) {
    for (const [id, hex] of Object.entries(rawColours as Record<string, unknown>).slice(0, 200)) {
      const it = itemById(id);
      if (it && recolourable(it) && typeof hex === 'string' && COLOUR_CHOICES.some((c) => c.hex === hex)) colours[id] = hex;
    }
  }
  return {
    owned, equipped: cleanEquipped(w.equipped), ...(outfits.length ? { outfits } : {}), ...(favourites.length ? { favourites: [...new Set(favourites)] } : {}),
    ...(Object.keys(colours).length ? { colours } : {}),
  };
}

/** The styles to draw for each slot (equipped items, overridden by anything being tried on), in the colours you chose. */
export function resolveStyles(equipped: Partial<Record<Slot, string>>, tryOn?: Partial<Record<Slot, string | null>>, colours?: Record<string, string>) {
  const out: Partial<Record<Slot, Style>> = {};
  for (const slot of SLOTS) {
    const id = tryOn && slot in tryOn ? tryOn[slot] : equipped[slot];
    const it = itemById(id);
    if (it) out[slot] = styleIn(it, colours?.[it.id]);
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
    case 'bogolan': return `linear-gradient(90deg, transparent 45%, ${b} 45% 55%, transparent 55%) 0 0 / 14px 14px, radial-gradient(circle, ${b} 0 18%, transparent 22%) 7px 7px / 14px 14px, ${a}`;
    case 'houndstooth': return `repeating-linear-gradient(45deg, ${a} 0 3px, ${b} 3px 6px), conic-gradient(${a} 25%, ${b} 0 50%, ${a} 0 75%, ${b} 0) 0 0 / 12px 12px`;
    case 'batik': return `radial-gradient(circle, ${b} 0 22%, transparent 26%) 0 0 / 18px 18px, repeating-linear-gradient(70deg, transparent 0 9px, ${c}88 9px 10px), ${a}`;
    case 'leopard': return `radial-gradient(ellipse 30% 25% at 50% 50%, ${c} 0 45%, ${b} 46% 70%, transparent 72%) 0 0 / 18px 15px, ${a}`;
    case 'polka': return `radial-gradient(circle, ${b} 0 22%, transparent 25%) 0 0 / 12px 12px, ${a}`;
    case 'cherry': return `radial-gradient(circle at 40% 60%, ${b} 0 10%, transparent 12%) 0 0 / 18px 18px, radial-gradient(circle at 62% 64%, ${b} 0 10%, transparent 12%) 0 0 / 18px 18px, ${a}`;
    case 'floral': return `radial-gradient(circle, ${b} 0 20%, transparent 32%) 0 0 / 20px 20px, radial-gradient(circle, ${c} 0 16%, transparent 26%) 10px 10px / 20px 20px, ${a}`;
    case 'lace': return `repeating-linear-gradient(45deg, ${a} 0 1px, transparent 1px 4px), repeating-linear-gradient(-45deg, ${a} 0 1px, transparent 1px 4px), radial-gradient(circle, ${a} 0 25%, transparent 28%) 0 0 / 14px 14px, ${b}`;
    case 'swirl': return `conic-gradient(from 30deg at 30% 40%, ${a}, ${b}, ${c}, ${a}, ${b}, ${a})`;
    default: return a;
  }
}
