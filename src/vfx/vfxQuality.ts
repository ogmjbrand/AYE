/**
 * How much the fire and water effects draw, by tier. The game's own quality setting picks the tier
 * (low → Low, high → High); Medium sits between for mid-range phones, and any tier can be chosen
 * in Settings → Effects. Every effect reads its budget from here, so a tier changes everything at
 * once and nothing compiles a new shader mid-game (counts are fixed per tier).
 */
export type VfxTier = 'low' | 'medium' | 'high';
export const VFX_TIERS: readonly VfxTier[] = ['low', 'medium', 'high'];
export const VFX_TIER_LABEL: Record<VfxTier, string> = { low: 'Low', medium: 'Medium', high: 'High' };

export interface VfxBudget {
  /** Flame billboards per fire (at full size). */
  flames: number;
  /** Smoke puffs per fire. */
  smoke: number;
  /** Embers and sparks per fire. */
  embers: number;
  /** Octaves of noise in flame and smoke shaders. */
  noiseOctaves: 1 | 2 | 3;
  /** Real lights that fires may borrow (from the always-mounted rig, so no recompiles). */
  fireLights: number;
  /** Detail in water normals (octaves) and whether surfaces move as real waves. */
  waterOctaves: 1 | 2 | 3;
  waterWaves: boolean;
  /** Droplets in a hose jet, a splash or a waterfall's base. */
  droplets: number;
  /** Caustics on pool floors. */
  caustics: boolean;
  /** Ripples traced at once on an interactive surface. */
  ripples: number;
  /** Puddles on a wet street. */
  puddles: number;
}

export const VFX_BUDGET: Record<VfxTier, VfxBudget> = {
  low: { flames: 14, smoke: 8, embers: 20, noiseOctaves: 1, fireLights: 0, waterOctaves: 1, waterWaves: false, droplets: 24, caustics: false, ripples: 2, puddles: 6 },
  medium: { flames: 28, smoke: 16, embers: 60, noiseOctaves: 2, fireLights: 1, waterOctaves: 2, waterWaves: true, droplets: 60, caustics: true, ripples: 4, puddles: 12 },
  high: { flames: 48, smoke: 26, embers: 140, noiseOctaves: 3, fireLights: 2, waterOctaves: 3, waterWaves: true, droplets: 120, caustics: true, ripples: 4, puddles: 20 },
};

/** The most ripples any shader holds (the uniform array size). */
export const MAX_RIPPLES = 4;

const STORAGE_KEY = 'aye_vfx_tier';

/** The tier chosen in Settings, if any (null: follow the game's quality). Storage can be missing or blocked. */
export function savedVfxTier(storage: Pick<Storage, 'getItem'> | null = typeof localStorage === 'undefined' ? null : localStorage): VfxTier | null {
  try {
    const v = storage?.getItem(STORAGE_KEY);
    return v && (VFX_TIERS as readonly string[]).includes(v) ? (v as VfxTier) : null;
  } catch {
    return null;
  }
}

export function saveVfxTier(tier: VfxTier | null, storage: Pick<Storage, 'setItem' | 'removeItem'> | null = typeof localStorage === 'undefined' ? null : localStorage) {
  try {
    if (tier) storage?.setItem(STORAGE_KEY, tier);
    else storage?.removeItem(STORAGE_KEY);
  } catch {
    // Blocked storage: the choice just isn't remembered
  }
}

/** The tier to draw at: the saved choice, else the game's quality. */
export function vfxTierFor(quality: 'high' | 'low', saved: VfxTier | null): VfxTier {
  return saved ?? (quality === 'high' ? 'high' : 'low');
}

/** How many of a budget to draw for an effect at this size (0 … 1+), never below one when it's visible. */
export function scaledCount(budget: number, size: number): number {
  if (size <= 0) return 0;
  return Math.max(1, Math.min(budget, Math.round(budget * Math.min(1, size))));
}
