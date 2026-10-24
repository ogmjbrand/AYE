/**
 * The MakeHuman body (CC0, built by scripts/makehuman/build-body.mjs): a
 * real 3D female body whose shape comes from MakeHuman's morph targets, not
 * from scaling bones. It's used where the player picks a body type, shown in
 * a plain black two-piece like a body-type chart.
 *
 * This module turns a BodyShape (lib/bodyShape.ts) into morph-target
 * weights, so the same choice drives the chart figure and the in-game
 * character.
 */
import type { BodyShape } from './bodyShape';

export const MH_BODY_URL = 'characters/mh/female-body.glb';

export const MH_MORPHS = [
  'weightUp', 'weightDown', 'muscleUp', 'muscleDown', 'cupUp', 'cupDown', 'bust', 'waistIn', 'waistOut',
  'hips', 'hipWidth', 'belly', 'buttocks', 'armsOut',
] as const;
export type MhMorph = (typeof MH_MORPHS)[number];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Morph weights (0 … 1) for a body shape. Every weight stays within the range MakeHuman designed the target for. */
export function mhInfluences(s: BodyShape): Record<MhMorph, number> {
  const w = s.weight;
  return {
    weightUp: clamp01(w * 0.9),
    weightDown: clamp01(-w * 0.8),
    muscleUp: clamp01(s.muscle * 0.7),
    muscleDown: clamp01(-w * 0.2),
    cupUp: clamp01(s.bust * 0.9 + Math.max(0, w) * 0.25),
    cupDown: clamp01(0.35 - s.bust - Math.max(0, w)),
    bust: clamp01(s.bust * 0.35),
    waistIn: clamp01(s.waist * 0.9),
    waistOut: clamp01(s.belly * 0.5 + Math.max(0, w) * 0.2),
    hips: clamp01(s.curves * 0.7 + Math.max(0, w) * 0.15),
    hipWidth: clamp01(s.curves * 0.45),
    belly: clamp01(s.belly * 0.85),
    buttocks: clamp01(s.curves * 0.6 + Math.max(0, s.legs) * 0.2),
    armsOut: clamp01(Math.max(0, w) * 0.9 + s.belly * 0.4 + s.curves * 0.35),
  };
}

/** Skin colours from lighter to deeper (sRGB), blended by skin tone (-1 … 1). */
const SKIN: readonly [number, readonly [number, number, number]][] = [
  [-1, [0.80, 0.62, 0.48]],
  [-0.4, [0.62, 0.43, 0.30]],
  [0.2, [0.45, 0.29, 0.19]],
  [0.6, [0.34, 0.21, 0.14]],
  [1, [0.24, 0.15, 0.10]],
];

export function mhSkinColor(tone: number): [number, number, number] {
  const t = Math.max(-1, Math.min(1, tone));
  for (let i = 1; i < SKIN.length; i++) {
    const [t1, c1] = SKIN[i];
    const [t0, c0] = SKIN[i - 1];
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0);
      return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
    }
  }
  return [...SKIN[SKIN.length - 1][1]] as [number, number, number];
}

export type MhHair = 'afro' | 'puff' | 'crop' | 'bun';
export const MH_HAIR: readonly { id: MhHair; label: string }[] = [
  { id: 'afro', label: 'Natural afro' },
  { id: 'puff', label: 'Afro puff' },
  { id: 'crop', label: 'Short natural' },
  { id: 'bun', label: 'Slicked-back bun' },
];
