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
  /** 0 … 1: a fuller bust (grows forward from the chest). */
  bust: number;
  /** 0 … 1: a narrower, more defined waist. */
  waist: number;
}

export const AVERAGE_SHAPE: BodyShape = { weight: 0, muscle: 0, curves: 0, belly: 0, bust: 0, waist: 0 };

type Preset = { id: string; label: string; shape: BodyShape };
const figure = (s: Partial<BodyShape>): BodyShape => ({ ...AVERAGE_SHAPE, ...s });

export const SHAPE_PRESETS: readonly Preset[] = [
  { id: 'slim', label: 'Slim', shape: figure({ weight: -0.7, muscle: 0.1, curves: 0.1 }) },
  { id: 'average', label: 'Average', shape: AVERAGE_SHAPE },
  { id: 'athletic', label: 'Athletic', shape: figure({ weight: -0.1, muscle: 0.85, curves: 0.2 }) },
  { id: 'curvy', label: 'Curvy', shape: figure({ weight: 0.3, curves: 0.9, belly: 0.15 }) },
  { id: 'full', label: 'Full-figured', shape: figure({ weight: 0.85, muscle: 0.1, curves: 0.5, belly: 0.6 }) },
];

/** Women's figures: slim and toned, lean athletic, curvy, hourglass, full with a round belly, plus-size curvy. */
export const FEMININE_SHAPE_PRESETS: readonly Preset[] = [
  { id: 'slim', label: 'Slim', shape: figure({ weight: -0.6, muscle: 0.25, curves: 0.15, bust: 0.1, waist: 0.3 }) },
  { id: 'average', label: 'Average', shape: AVERAGE_SHAPE },
  { id: 'athletic', label: 'Athletic', shape: figure({ weight: -0.3, muscle: 0.7, curves: 0.25, bust: 0.05, waist: 0.4 }) },
  { id: 'curvy', label: 'Curvy', shape: figure({ weight: 0.25, curves: 0.85, belly: 0.1, bust: 0.6, waist: 0.2 }) },
  { id: 'hourglass', label: 'Hourglass', shape: figure({ weight: 0.1, muscle: 0.05, curves: 0.8, bust: 0.8, waist: 0.85 }) },
  { id: 'full', label: 'Full-figured', shape: figure({ weight: 0.85, curves: 0.5, belly: 0.85, bust: 0.6 }) },
  { id: 'plus-curvy', label: 'Plus-size curvy', shape: figure({ weight: 0.7, curves: 0.95, belly: 0.45, bust: 0.75, waist: 0.25 }) },
];

type Slider = { key: keyof BodyShape; label: string; min: number; ends: [string, string] };

export const SHAPE_SLIDERS: readonly Slider[] = [
  { key: 'weight', label: 'Build', min: -1, ends: ['Slim', 'Full'] },
  { key: 'muscle', label: 'Muscle', min: 0, ends: ['Soft', 'Muscular'] },
  { key: 'curves', label: 'Hips & thighs', min: 0, ends: ['Straight', 'Curvy'] },
  { key: 'belly', label: 'Belly', min: 0, ends: ['Flat', 'Round'] },
];

export const FEMININE_SHAPE_SLIDERS: readonly Slider[] = [
  ...SHAPE_SLIDERS,
  { key: 'bust', label: 'Bust', min: 0, ends: ['Small', 'Full'] },
  { key: 'waist', label: 'Waist', min: 0, ends: ['Straight', 'Defined'] },
];

/** The presets and sliders offered for a body type. */
export const shapePresets = (body: 'feminine' | 'masculine') => (body === 'feminine' ? FEMININE_SHAPE_PRESETS : SHAPE_PRESETS);
export const shapeSliders = (body: 'feminine' | 'masculine') => (body === 'feminine' ? FEMININE_SHAPE_SLIDERS : SHAPE_SLIDERS);

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
    bust: num(s.bust, 0, 1, 0),
    waist: num(s.waist, 0, 1, 0),
  };
}

export const sameShape = (a: BodyShape, b: BodyShape) =>
  (Object.keys(AVERAGE_SHAPE) as (keyof BodyShape)[]).every((k) => a[k] === b[k]);

export const presetFor = (shape: BodyShape, body: 'feminine' | 'masculine' = 'masculine') =>
  shapePresets(body).find((p) => sameShape(p.shape, shape));

/**
 * [depth (Y), width (Z)] scale for one bone's flesh, and optionally a forward
 * shift in metres (bone +Y is the front of the body) so growth can come from
 * the front only.
 */
export type Girth = readonly [number, number] | readonly [number, number, number];

/** Roughly the back of the ribcage in the chest bones' space: the bust grows forward from here. */
const CHEST_BACK = -0.1;

/**
 * Per-bone girth for a shape, keyed by Biped bone name without the "Bip01 "
 * prefix ("Spine1", "L Thigh"). Average shape returns an empty map.
 */
export function girthFactors(shape: BodyShape): Map<string, Girth> {
  const { weight: w, muscle: m, curves: c, belly: b, bust: u, waist: n } = sanitiseShape(shape);
  const out = new Map<string, Girth>();
  const set = (bone: string, y: number, z: number, forward = 0) => {
    if (Math.abs(y - 1) > 1e-3 || Math.abs(z - 1) > 1e-3) out.set(bone, forward ? [y, z, forward] : [y, z]);
  };
  // The bust adds depth about the back of the ribcage rather than the spine, so the front grows and the back
  // stays put. The breasts are skinned about half to Spine2 and half to Spine1, so both take part.
  const bust = 0.55 * u;
  const underBust = 0.2 * u;
  // Lower torso and hips (the thighs hang from Spine in a Biped)
  set('Pelvis', 1 + 0.22 * w + 0.14 * c, 1 + 0.22 * w + 0.3 * c);
  // A defined waist pulls in the middle of the torso, mostly at the sides
  set('Spine', (1 + 0.26 * w + 0.4 * b + 0.06 * c) * (1 - 0.04 * n), (1 + 0.24 * w + 0.14 * b + 0.16 * c) * (1 - 0.14 * n));
  set('Spine1', (1 + 0.26 * w + 0.5 * b) * (1 - 0.08 * n) + underBust, (1 + 0.22 * w + 0.18 * b + 0.06 * m) * (1 - 0.24 * n), -CHEST_BACK * underBust);
  set('Spine2', 1 + 0.18 * w + 0.14 * m + 0.08 * b + bust, 1 + 0.14 * w + 0.14 * m + 0.1 * u, -CHEST_BACK * bust);
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
