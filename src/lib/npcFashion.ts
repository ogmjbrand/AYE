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

function choose<T>(values: readonly T[], seed: number, salt: number): T {
  return values[(seed + salt * 0x9e3779b9 >>> 0) % values.length];
}

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
  const tone = SKIN_TONES[1 + (seed % (SKIN_TONES.length - 1))];
  const shape = SHAPE_PRESETS[(seed >>> 8) % SHAPE_PRESETS.length].shape;
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
