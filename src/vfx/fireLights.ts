/**
 * Fires don't add lights of their own: a light appearing in the scene makes every material
 * recompile its shader (a visible stutter). Instead a small rig of lights is always mounted
 * (world/FireLightRig in vfx/FireEffect.tsx) and each fire reports where it is and how hard it's
 * burning here; the rig moves its lights to the strongest fires, flickering, and dims to nothing
 * when none are burning.
 */
export interface FireGlow { x: number; y: number; z: number; intensity: number; colour?: string }

const glows = new Map<string, FireGlow>();

export function reportFireGlow(id: string, glow: FireGlow | null) {
  if (glow && glow.intensity > 0.01) glows.set(id, glow);
  else glows.delete(id);
}

/** The strongest fires first, nearest the camera breaking ties, at most `count`. */
export function brightestGlows(count: number, from?: { x: number; z: number }): FireGlow[] {
  const list = [...glows.values()];
  const score = (g: FireGlow) => g.intensity - (from ? Math.hypot(g.x - from.x, g.z - from.z) * 0.01 : 0);
  return list.sort((a, b) => score(b) - score(a)).slice(0, count);
}

export const clearFireGlows = () => glows.clear();
