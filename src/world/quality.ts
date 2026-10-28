import { createContext, useContext } from 'react';

/**
 * Render quality tier. 'auto' starts at initialAutoQuality() and drops to 'low' (no ambient
 * occlusion or bloom) when the PerformanceMonitor sees sustained low frame rates (e.g. integrated GPUs).
 */
export type Quality = 'high' | 'low';

export interface QualitySettings {
  quality: Quality;
  shadowMapSize: number;
  contactShadows: boolean;
  maxDpr: number;
  /** Screen-space ambient occlusion (post-processing). */
  ambientOcclusion: boolean;
}

export function settingsFor(quality: Quality): QualitySettings {
  return quality === 'high'
    ? { quality, shadowMapSize: 2048, contactShadows: true, maxDpr: 1.5, ambientOcclusion: true }
    : { quality, shadowMapSize: 1024, contactShadows: false, maxDpr: 1, ambientOcclusion: false };
}

/**
 * Where 'auto' starts. Phones, tablets and machines with little memory or few
 * cores start on the low tier rather than proving it with a few seconds of
 * stutter first; everything else starts high and may still drop.
 */
export function initialAutoQuality(): Quality {
  if (typeof navigator === 'undefined') return 'high';
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  return touch || (memory !== undefined && memory <= 4) || (cores !== undefined && cores <= 4) ? 'low' : 'high';
}

export const QualityContext = createContext<QualitySettings>(settingsFor('high'));
export const useQuality = () => useContext(QualityContext);

/** Live render stats written by FpsMeter (inside the canvas) and read by the HUD. */
export const perfStats = { fps: 0 };
