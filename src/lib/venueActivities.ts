/**
 * Every place inside a venue where you can do something, so you can pick an
 * activity from anywhere in the room and walk there to do it (the same
 * walk-then-act as home furniture, hooks/useWalkThen.ts). Each activity lists
 * places to stand, best first; the walk takes the first one with a way there,
 * so someone or something in the way doesn't stop you. On arrival the venue's
 * own prompt for that spot runs, so the activity is exactly what the E key
 * would do there.
 */
import type { Furniture, Interior } from './interiors';

export interface Activity {
  label: string;
  spots: readonly (readonly [number, number])[];
}

/** Places to stand round a piece of furniture: in front first, then each side, clear of it by `gap`. */
export function aroundFurniture(f: Pick<Furniture, 'at' | 'size'>, gap = 0.45): [number, number][] {
  const [x, z] = f.at, hw = f.size[0] / 2 + gap, hd = f.size[2] / 2 + gap;
  return [[x, z - hd], [x, z + hd], [x - hw, z], [x + hw, z]];
}

/** Points with a radius (hospital, university): the middle, then a ring just inside the radius. */
export function aroundPoint(at: readonly [number, number], radius: number): [number, number][] {
  const r = Math.min(radius * 0.6, 1.2);
  return [[at[0], at[1]], [at[0], at[1] - r], [at[0] - r, at[1]], [at[0] + r, at[1]], [at[0], at[1] + r]];
}

/** Activities on furniture kinds (an office desk, a reception counter), labelled by kind. */
export function furnitureActivities(interior: Interior, labels: Partial<Record<Furniture['kind'], string>>): Activity[] {
  const out: Activity[] = [];
  const seen = new Map<string, number>();
  for (const f of interior.furniture) {
    const label = labels[f.kind];
    if (!label) continue;
    const n = (seen.get(label) ?? 0) + 1;
    seen.set(label, n);
    out.push({ label: n > 1 ? `${label} ${n}` : label, spots: aroundFurniture(f) });
  }
  return out;
}
