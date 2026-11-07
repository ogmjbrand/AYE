/** The kinds of fire and how big each is at full intensity (vfx/FireEffect.tsx). */
export type FireKind = 'building' | 'vehicle' | 'small';

/** Size of each kind of fire at full intensity: width, depth and flame height (m), smoke column height (m). */
export const FIRE_PRESETS: Record<FireKind, { width: number; depth: number; height: number; smoke: number; embers: number }> = {
  building: { width: 2.4, depth: 0.6, height: 2.8, smoke: 16, embers: 1 },
  vehicle: { width: 1.6, depth: 1.2, height: 1.8, smoke: 11, embers: 0.8 },
  small: { width: 0.6, depth: 0.5, height: 0.9, smoke: 4, embers: 0.4 },
};

