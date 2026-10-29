import { SHAPE_PRESETS } from './bodyShape';
import { itemById, type Slot, type Style } from './fashion';
import { SKIN_TONES, type SkinToneId } from './skinTone';
import type { BodyShape } from './bodyShape';

export interface NpcAppearance {
  styles: Partial<Record<Slot, Style>>;
  hairstyleItemId: string | null;
  skinTone: SkinToneId;
  shape: BodyShape;
  itemIds: Partial<Record<Slot, string>>;
}

interface OutfitPool {
  tops: readonly string[];
  bottoms: readonly string[];
  shoes: readonly string[];
  hair: readonly string[];
}

const OUTFIT_POOLS: Record<'casual' | 'professional' | 'medical' | 'service' | 'creative' | 'athletic' | 'premium', OutfitPool> = {
  casual: {
    tops: ['top-cotton-midnight', 'top-cotton-terracotta', 'top-breton-navy', 'top-gingham-rose', 'top-batik-ocean', 'top-adire-indigo', 'top-bogolan-earth', 'top-ankara-sunset'],
    bottoms: ['bottom-denim-classic', 'bottom-denim-black', 'bottom-chino-khaki', 'bottom-linen-cream', 'bottom-ankara-sunset', 'bottom-adire-indigo'],
    shoes: ['shoes-clean-white', 'shoes-leather-tan', 'shoes-suede-burgundy'],
    hair: ['hair-natural-black', 'hair-dark-brown', 'hair-blue-black', 'hair-copper', 'hair-burgundy'],
  },
  professional: {
    tops: ['top-linen-ivory', 'top-cotton-midnight', 'top-houndstooth-mono', 'top-silk-burgundy', 'top-adire-eleko'],
    bottoms: ['bottom-pinstripe-charcoal', 'bottom-chino-khaki', 'bottom-linen-cream', 'bottom-denim-black'],
    shoes: ['shoes-leather-black', 'shoes-leather-tan', 'shoes-metallic-gold'],
    hair: ['hair-natural-black', 'hair-dark-brown', 'hair-blue-black', 'hair-burgundy'],
  },
  medical: {
    tops: ['top-linen-ivory', 'top-cotton-midnight', 'top-cotton-terracotta'],
    bottoms: ['bottom-chino-khaki', 'bottom-linen-cream', 'bottom-denim-black'],
    shoes: ['shoes-clean-white', 'shoes-leather-black'],
    hair: ['hair-natural-black', 'hair-dark-brown', 'hair-blue-black'],
  },
  service: {
    tops: ['top-cotton-midnight', 'top-cotton-terracotta', 'top-linen-ivory', 'top-bogolan-earth', 'top-batik-ocean'],
    bottoms: ['bottom-denim-classic', 'bottom-denim-black', 'bottom-chino-khaki', 'bottom-linen-cream'],
    shoes: ['shoes-clean-white', 'shoes-leather-black', 'shoes-leather-tan'],
    hair: ['hair-natural-black', 'hair-dark-brown', 'hair-blue-black', 'hair-copper'],
  },
  creative: {
    tops: ['top-asooke-champagne', 'top-asooke-wine', 'top-kente-adweneasa', 'top-batakari-stripe', 'top-batik-ocean', 'top-adire-eleko', 'top-bogolan-earth', 'top-silk-burgundy'],
    bottoms: ['bottom-kente-adweneasa', 'bottom-batik-ocean', 'bottom-bogolan-earth', 'bottom-pinstripe-charcoal', 'bottom-denim-black'],
    shoes: ['shoes-leather-tan', 'shoes-suede-burgundy', 'shoes-metallic-gold'],
    hair: ['hair-natural-black', 'hair-copper', 'hair-burgundy', 'hair-honey-blonde', 'hair-platinum'],
  },
  athletic: {
    tops: ['top-cotton-midnight', 'top-cotton-terracotta', 'top-breton-navy', 'top-batik-ocean', 'top-adire-indigo'],
    bottoms: ['bottom-denim-classic', 'bottom-denim-black', 'bottom-chino-khaki'],
    shoes: ['shoes-clean-white', 'shoes-leather-black'],
    hair: ['hair-natural-black', 'hair-dark-brown', 'hair-blue-black'],
  },
  premium: {
    tops: ['top-silk-burgundy', 'top-asooke-champagne', 'top-asooke-wine', 'top-kente-adweneasa', 'top-houndstooth-mono'],
    bottoms: ['bottom-pinstripe-charcoal', 'bottom-kente-adweneasa', 'bottom-linen-cream', 'bottom-denim-black'],
    shoes: ['shoes-metallic-gold', 'shoes-leather-black', 'shoes-leather-tan'],
    hair: ['hair-natural-black', 'hair-burgundy', 'hair-honey-blonde', 'hair-platinum'],
  },
};

function hashText(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * An independent number per choice: each salt is mixed into the seed and
 * scrambled (the murmur3 finaliser). Adding the salt alone moved every choice
 * in step, so tops, trousers, shoes and hair colour only ever came in a third
 * of their combinations.
 */
function mix(seed: number, salt: number): number {
  let h = (seed ^ Math.imul(salt + 1, 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

function choose<T>(values: readonly T[], seed: number, salt: number): T {
  return values[mix(seed, salt) % values.length];
}

/** The skin tones a resident can have: every real swatch (not 'original', which is the model's own, nor 'custom'). */
const RESIDENT_TONES = SKIN_TONES.filter((t) => t.id !== 'original' && t.id !== 'custom');

function outfitPool(role: string): OutfitPool {
  if (/doctor|nurse|medical|hospital|clinic/i.test(role)) return OUTFIT_POOLS.medical;
  if (/office|engineer|developer|lawyer|accountant|pilot|manager/i.test(role)) return OUTFIT_POOLS.professional;
  if (/waiter|waitress|chef|cook|host|barista|conductor|driver|bus|transport|security|construction|worker/i.test(role)) return OUTFIT_POOLS.service;
  if (/designer|artist|fashion|creator|musician/i.test(role)) return OUTFIT_POOLS.creative;
  if (/football|athlete|coach|trainer|sport/i.test(role)) return OUTFIT_POOLS.athletic;
  if (/luxury|executive|wealthy|celebrity/i.test(role)) return OUTFIT_POOLS.premium;
  return OUTFIT_POOLS.casual;
}

function itemStyle(id: string): Style {
  const item = itemById(id);
  if (!item) throw new Error(`NPC outfit references missing fashion item: ${id}`);
  return item.style;
}

export function generateNpcAppearance(identity: string, role: string, feminine: boolean): NpcAppearance {
  if (!identity.trim()) throw new Error('NPC appearance requires a stable identity');
  const seed = hashText(`${identity}|${role}`);
  const pool = outfitPool(role);
  const top = choose(pool.tops, seed, 1);
  const bottom = choose(pool.bottoms, seed, 2);
  const shoes = choose(pool.shoes, seed, 3);
  const hair = choose(pool.hair, seed, 4);
  const tone = choose(RESIDENT_TONES, seed, 6);
  const shape = choose(SHAPE_PRESETS, seed, 7).shape;
  const hairstyleItemId = feminine
    ? choose(['hairstyle-afro', 'hairstyle-braids', 'hairstyle-ponytail', 'hairstyle-long'] as const, seed, 5)
    : null;

  return {
    itemIds: { top, bottom, shoes, hair, ...(hairstyleItemId ? { hairstyle: hairstyleItemId } : {}) },
    styles: { top: itemStyle(top), bottom: itemStyle(bottom), shoes: itemStyle(shoes), hair: itemStyle(hair) },
    hairstyleItemId,
    skinTone: tone.id,
    shape,
  };
}

/** Feminine residents also get one of these 3D hairstyles. */
const RESIDENT_HAIRSTYLES = 4;

/**
 * How many different appearances the generator can give one base model in
 * this role: outfit pieces × hair colours × skin tones × body shapes (× 3D
 * hairstyles for feminine looks). These are real recolours, refabrics and
 * reshapes of the same person, not new people.
 */
export function appearanceCount(role: string, feminine: boolean): { outfits: number; tones: number; shapes: number; hairstyles: number; total: number } {
  const p = outfitPool(role);
  const outfits = p.tops.length * p.bottoms.length * p.shoes.length * p.hair.length;
  const hairstyles = feminine ? RESIDENT_HAIRSTYLES : 1;
  return { outfits, tones: RESIDENT_TONES.length, shapes: SHAPE_PRESETS.length, hairstyles, total: outfits * RESIDENT_TONES.length * SHAPE_PRESETS.length * hairstyles };
}
