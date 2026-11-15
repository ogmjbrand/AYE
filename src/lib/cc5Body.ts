/**
 * The Character Creator 5 player body (scripts/cc5/build.mjs). It wears its own
 * modelled clothes, so the wardrobe recolours those garments by material
 * instead of the Rocketbox garment maps, and skin tone tints the skin
 * materials. Patterned fabrics show as their main colour.
 */
import type { BodyType } from './looks';
import type { Slot, Style } from './fashion';

/**
 * Which of the model's materials each wardrobe slot recolours (Character Creator
 * material names). Shoes and hair differ between Aaron (Sport_sneakers,
 * Classic_Slick_Back) and Ariana (High_Heels, Finger_Wave_Pixie); newer CC5-built
 * exports also add a trailing "_Pbr" and, for Ariana's hairstyle, a numbered
 * "Hair1_"/"Scalp_" material alongside plain "Hair_".
 */
export const CC5_SLOT_MATERIALS: Partial<Record<Slot, RegExp>> = {
  top: /^RS_Regular_Fit_Shirt/,
  bottom: /^Slim_Fit_Trousers/,
  shoes: /^(Sport_sneakers|High_Heels)/i,
  hair: /^(Hair\d*_(Transparency|Clap_Transparency)|Scalp_Transparency)(_Pbr)?$/,
};
/** Trailing "_Pbr" on newer CC5-built exports (Ariana, newer Aaron); older exports have no suffix. */
export const CC5_SKIN_MATERIALS = /^Std_(Skin_(Head|Body|Arm|Leg)|Nails)(_Pbr)?$/;
/**
 * Brows and eyelashes: separate materials only on the split-material bodies;
 * see CC5_HAS_SPLIT_MATERIALS. The older Aaron export names eyelash materials
 * "Eyelash_*"; the newer CC5-built exports (Ariana, and the newer Aaron) use
 * "Lash_*" instead.
 */
export const CC5_BROW_LASH_MATERIALS = /^(Brows|Eyelash|Lash)/i;

/**
 * Whether each body's CC5 model has its skin and garments as separate
 * materials (full per-pixel pigmentation and brow/lash control) or shares one
 * material for her whole body (a ready-dressed ActorScan): skin tone there
 * tints everything she's wearing too, and brows/lashes can't be recoloured
 * independently without the split (see memory: aye-cc5-player-body). Both
 * still support the depth and undertone sliders; only per-pixel vitiligo
 * patches and brow/lash pigmentation need the split. Both bodies (aaron,
 * woman/Ariana) are now built CC5 avatars with a real split, not scans.
 */
export const CC5_HAS_SPLIT_MATERIALS: Record<BodyType, boolean> = { masculine: true, feminine: true };

export const cc5SlotOf = (materialName: string): Slot | null =>
  (Object.entries(CC5_SLOT_MATERIALS) as [Slot, RegExp][]).find(([, re]) => re.test(materialName))?.[0] ?? null;

/**
 * Mesh name(s) making up each CC5 character's own baked-in hairstyle, hidden when a
 * separate modelled hairstyle (lib/fashion.ts's cc5Garment on the 'hairstyle' slot)
 * is equipped instead -- safe to hide (unlike a garment slot) since every CC5
 * character's head reads fine bald (NeutralF/NeutralM already are).
 */
export const CC5_OWN_HAIRSTYLE_MESHES: Partial<Record<string, readonly string[]>> = {
  aaron: ['Classic_Slick_Back'],
  woman: ['Finger_Wave_Pixie'],
};

/** Colour multiplier for a garment wearing this style (its main colour), or null to keep the original. */
export function cc5GarmentColor(style: Style | undefined): string | null {
  return style ? style.colors[0] : null;
}

/**
 * Multiplier for the skin textures: deeper (tone to 1) darkens and warms them,
 * lighter (to -1) brightens them; 0 keeps the modelled skin. Used for the
 * single-material body, where there's no per-pixel shader (see Cc5Styler).
 */
export function cc5SkinMultiplier(tone: number): [number, number, number] {
  const t = Math.max(-1, Math.min(1, tone));
  if (t >= 0) return [1 - 0.5 * t, 1 - 0.56 * t, 1 - 0.6 * t];
  return [1 - 0.3 * t, 1 - 0.32 * t, 1 - 0.34 * t];
}

/** Adds a gentle warm/cool shift on top of cc5SkinMultiplier, for the single-material body. */
export function cc5UndertoneMultiplier(undertone: number): [number, number, number] {
  const t = Math.max(-1, Math.min(1, undertone));
  return t >= 0 ? [1 + 0.07 * t, 1 + 0.015 * t, 1 - 0.1 * t] : [1 + 0.06 * t, 1 + 0.01 * t, 1 - 0.09 * t];
}

/** Lightening multiplier for brow/eyelash materials under albinism (0 natural … 1 fully depigmented). */
export function cc5AlbinismMultiplier(intensity: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, intensity));
  return [1 + 1.6 * t, 1 + 1.55 * t, 1 + 1.5 * t];
}
