/**
 * The maths behind AYE's built 3D garments (world/SkinnedGarment.ts): how a
 * loose piece is shaped around the body and how its vertices are shared
 * between the bones that move it. Kept free of three.js so it can be tested.
 *
 * A garment is real geometry skinned to the character's own skeleton, so it
 * walks, runs, sits and turns with every animation; nothing here is a
 * texture or a static shell.
 */

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Up to four bone influences, largest first, summing to 1. */
export type Influences = [index: number, weight: number][];

export function topFour(raw: Influences): Influences {
  const merged = new Map<number, number>();
  for (const [i, w] of raw) if (w > 0) merged.set(i, (merged.get(i) ?? 0) + w);
  const sorted = [...merged.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const sum = sorted.reduce((s, [, w]) => s + w, 0) || 1;
  return sorted.map(([i, w]) => [i, w / sum]);
}

export interface SkirtBones { pelvis: number; leftThigh: number; rightThigh: number; leftCalf: number; rightCalf: number }

/**
 * A skirt vertex's bones. At the waist it moves with the hips alone; lower
 * down a growing share goes to the thigh on its own side (and below the knee
 * a little to the calf), so the cloth swings forward with each stride instead
 * of the legs walking through it. `side` runs from -1 (right leg) to 1 (left);
 * `depth` from 0 at the waist to 1 at the hem; `knee` is the depth the knees
 * are at (above 1 for a short skirt).
 */
export function skirtInfluences(bones: SkirtBones, side: number, depth: number, knee: number, legShareAtHem = 0.72): Influences {
  const leg = legShareAtHem * smoothstep(0.08, 1, depth);
  const calf = knee < 1 ? 0.45 * smoothstep(knee, Math.min(1, knee + 0.35), depth) : 0;
  const left = Math.min(1, Math.max(0, 0.5 + side * 0.75));
  const thigh = leg * (1 - calf);
  const shin = leg * calf;
  return topFour([
    [bones.pelvis, 1 - leg],
    [bones.leftThigh, thigh * left],
    [bones.rightThigh, thigh * (1 - left)],
    [bones.leftCalf, shin * left],
    [bones.rightCalf, shin * (1 - left)],
  ]);
}

/**
 * A trouser-leg (or sleeve) vertex's bones, by how far down its limb it is
 * (0 at the top, 1 at the hem): the upper bone above the joint, the lower
 * below it, blended over the joint, and tied to the body at the very top.
 */
export function limbInfluences(body: number, upper: number, lower: number, along: number, joint: number, blend = 0.08): Influences {
  const top = 1 - smoothstep(0, 0.12, along);
  const low = smoothstep(joint - blend, joint + blend, along);
  return topFour([[body, top * 0.6], [upper, (1 - low) * (1 - top * 0.6)], [lower, low * (1 - top * 0.6)]]);
}

/**
 * The cloth's radius round its axis at each angle: the body's own radius
 * there plus ease, never less than `min`, smoothed round the ring so a
 * single stray vertex can't dent the fabric. Missing sectors (no body there)
 * take their neighbours' value.
 */
export function ringRadii(body: readonly (number | null)[], ease: number, min: number, passes = 2): number[] {
  const n = body.length;
  const known = body.map((r) => (r === null ? null : r + ease));
  const filled = known.map((r, i) => {
    if (r !== null) return r;
    for (let k = 1; k < n; k++) {
      const a = known[(i + k) % n], b = known[(i - k + n) % n];
      if (a !== null || b !== null) return Math.max(a ?? 0, b ?? 0);
    }
    return min;
  });
  let out = filled.map((r) => Math.max(min, r));
  for (let p = 0; p < passes; p++) {
    // Smooth upwards only: the cloth may stand off the body, never cut into it
    out = out.map((r, i) => Math.max(r, (out[(i + n - 1) % n] + 2 * r + out[(i + 1) % n]) / 4));
  }
  return out;
}

/** A gele's pleats and its fan: how far a ring stands out (pleats) and rises (the fan at the back) at angle `a` (0 = forward). */
export function geleShape(a: number, level: number): { out: number; rise: number } {
  const back = Math.cos(a - Math.PI); // 1 at the back, -1 at the front
  const pleat = Math.abs(Math.sin(a * 7)) * (0.35 + 0.65 * level);
  const fan = smoothstep(-0.1, 0.9, back) * smoothstep(0.35, 1, level);
  return { out: pleat, rise: fan };
}
