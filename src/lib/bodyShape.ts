/**
 * Body shape: how slim or full, muscular, curvy and round-bellied a character
 * is. The Rocketbox people have no shape blend targets, so shape is applied by
 * widening (or narrowing) the skin around individual bones of the skeleton:
 * each bone's flesh scales across its width and depth but never along its
 * length, so height and proportions of the limbs stay the same and
 * animations keep working. Clothes are part of the same mesh and follow.
 *
 * Bone axes (3ds Max Biped, as exported): X runs along the bone, Y is
 * front–back depth and Z is side-to-side width.
 */

export interface BodyShape {
  /** -1 very slim … 0 average … 1 full-figured. */
  weight: number;
  /** 0 … 1: shoulders, arms, chest and legs. */
  muscle: number;
  /** 0 … 1: hips and thighs. */
  curves: number;
  /** 0 … 1: stomach. */
  belly: number;
}

export const AVERAGE_SHAPE: BodyShape = { weight: 0, muscle: 0, curves: 0, belly: 0 };

export const SHAPE_PRESETS: readonly { id: string; label: string; shape: BodyShape }[] = [
  { id: 'slim', label: 'Slim', shape: { weight: -0.7, muscle: 0.1, curves: 0.1, belly: 0 } },
  { id: 'average', label: 'Average', shape: AVERAGE_SHAPE },
  { id: 'athletic', label: 'Athletic', shape: { weight: -0.1, muscle: 0.85, curves: 0.2, belly: 0 } },
  { id: 'curvy', label: 'Curvy', shape: { weight: 0.3, muscle: 0, curves: 0.9, belly: 0.15 } },
  { id: 'full', label: 'Full-figured', shape: { weight: 0.85, muscle: 0.1, curves: 0.5, belly: 0.6 } },
];

export const SHAPE_SLIDERS: readonly { key: keyof BodyShape; label: string; min: number; ends: [string, string] }[] = [
  { key: 'weight', label: 'Build', min: -1, ends: ['Slim', 'Full'] },
  { key: 'muscle', label: 'Muscle', min: 0, ends: ['Soft', 'Muscular'] },
  { key: 'curves', label: 'Hips & thighs', min: 0, ends: ['Straight', 'Curvy'] },
  { key: 'belly', label: 'Belly', min: 0, ends: ['Flat', 'Round'] },
];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.round(clamp(v, min, max) * 100) / 100 : fallback;

/** Validates saved data; anything missing or out of range becomes average. */
export function sanitiseShape(data: unknown): BodyShape {
  const s = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  return {
    weight: num(s.weight, -1, 1, 0),
    muscle: num(s.muscle, 0, 1, 0),
    curves: num(s.curves, 0, 1, 0),
    belly: num(s.belly, 0, 1, 0),
  };
}

export const sameShape = (a: BodyShape, b: BodyShape) =>
  a.weight === b.weight && a.muscle === b.muscle && a.curves === b.curves && a.belly === b.belly;

export const presetFor = (shape: BodyShape) => SHAPE_PRESETS.find((p) => sameShape(p.shape, shape));

/** [depth (Y), width (Z)] scale for one bone's flesh. */
export type Girth = readonly [number, number];

/**
 * Per-bone girth for a shape, keyed by Biped bone name without the "Bip01 "
 * prefix ("Spine1", "L Thigh"). Average shape returns an empty map.
 */
export function girthFactors(shape: BodyShape): Map<string, Girth> {
  const { weight: w, muscle: m, curves: c, belly: b } = sanitiseShape(shape);
  const out = new Map<string, Girth>();
  const set = (bone: string, y: number, z: number) => {
    if (Math.abs(y - 1) > 1e-3 || Math.abs(z - 1) > 1e-3) out.set(bone, [y, z]);
  };
  // Lower torso and hips (the thighs hang from Spine in a Biped)
  set('Pelvis', 1 + 0.22 * w + 0.14 * c, 1 + 0.22 * w + 0.3 * c);
  set('Spine', 1 + 0.26 * w + 0.4 * b + 0.06 * c, 1 + 0.24 * w + 0.14 * b + 0.16 * c);
  set('Spine1', 1 + 0.26 * w + 0.5 * b, 1 + 0.22 * w + 0.18 * b + 0.06 * m);
  set('Spine2', 1 + 0.18 * w + 0.14 * m + 0.08 * b, 1 + 0.14 * w + 0.14 * m);
  set('Neck', 1 + 0.14 * w + 0.18 * m, 1 + 0.14 * w + 0.18 * m);
  for (const side of ['L', 'R']) {
    set(`${side} Clavicle`, 1 + 0.1 * w + 0.22 * m, 1 + 0.1 * w + 0.22 * m);
    set(`${side} UpperArm`, 1 + 0.28 * w + 0.4 * m, 1 + 0.28 * w + 0.4 * m);
    set(`${side} Forearm`, 1 + 0.18 * w + 0.22 * m, 1 + 0.18 * w + 0.22 * m);
    set(`${side} Thigh`, 1 + 0.28 * w + 0.16 * m + 0.24 * c, 1 + 0.28 * w + 0.16 * m + 0.28 * c);
    set(`${side} Calf`, 1 + 0.18 * w + 0.16 * m + 0.08 * c, 1 + 0.18 * w + 0.16 * m + 0.08 * c);
  }
  return out;
}
