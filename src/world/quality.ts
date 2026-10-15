import { createContext, useContext } from 'react';

/**
 * Render quality tier. Starts at 'high' and drops to 'low' when the
 * PerformanceMonitor sees sustained low frame rates (e.g. integrated GPUs).
 */
export type Quality = 'high' | 'low';

export interface QualitySettings {
  quality: Quality;
  shadowMapSize: number;
  contactShadows: boolean;
  maxDpr: number;
}

export function settingsFor(quality: Quality): QualitySettings {
  return quality === 'high'
    ? { quality, shadowMapSize: 2048, contactShadows: true, maxDpr: 1.5 }
    : { quality, shadowMapSize: 1024, contactShadows: false, maxDpr: 1 };
}

export const QualityContext = createContext<QualitySettings>(settingsFor('high'));
export const useQuality = () => useContext(QualityContext);

/** Live render stats written by FpsMeter (inside the canvas) and read by the HUD. */
export const perfStats = { fps: 0 };
