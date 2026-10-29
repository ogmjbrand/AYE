/**
 * The Character Creator 5 player body (scripts/cc5/build.mjs). It wears its own
 * modelled clothes, so the wardrobe recolours those garments by material
 * instead of the Rocketbox garment maps, and skin tone tints the skin
 * materials. Patterned fabrics show as their main colour.
 */
import type { Slot, Style } from './fashion';

/** Which of the model's materials each wardrobe slot recolours (Character Creator material names). */
export const CC5_SLOT_MATERIALS: Partial<Record<Slot, RegExp>> = {
  top: /^RS_Regular_Fit_Shirt/,
  bottom: /^Slim_Fit_Trousers/,
  shoes: /^Sport_sneakers/i,
  hair: /^Hair_(Transparency|Clap_Transparency)$/,
};
export const CC5_SKIN_MATERIALS = /^Std_(Skin_(Head|Body|Arm|Leg)|Nails)$/;

export const cc5SlotOf = (materialName: string): Slot | null =>
  (Object.entries(CC5_SLOT_MATERIALS) as [Slot, RegExp][]).find(([, re]) => re.test(materialName))?.[0] ?? null;

/** Colour multiplier for a garment wearing this style (its main colour), or null to keep the original. */
export function cc5GarmentColor(style: Style | undefined): string | null {
  return style ? style.colors[0] : null;
}

/**
 * Multiplier for the skin textures: deeper (tone to 1) darkens and warms them,
 * lighter (to -1) brightens them; 0 keeps the modelled skin.
 */
export function cc5SkinMultiplier(tone: number): [number, number, number] {
  const t = Math.max(-1, Math.min(1, tone));
  if (t >= 0) return [1 - 0.5 * t, 1 - 0.56 * t, 1 - 0.6 * t];
  return [1 - 0.3 * t, 1 - 0.32 * t, 1 - 0.34 * t];
}
