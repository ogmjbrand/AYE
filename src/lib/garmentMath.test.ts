import { describe, expect, it } from 'vitest';
import { geleShape, limbInfluences, ringRadii, skirtInfluences, topFour } from './garmentMath';
import { FASHION_ITEMS } from './fashion';

const bones = { pelvis: 0, leftThigh: 1, rightThigh: 2, leftCalf: 3, rightCalf: 4 };
const weight = (inf: [number, number][], bone: number) => inf.find(([b]) => b === bone)?.[1] ?? 0;

describe('3D garment rigging', () => {
  it('keeps four normalised influences', () => {
    const w = topFour([[0, 0.5], [1, 0.2], [2, 0.2], [3, 0.05], [4, 0.05], [1, 0.1]]);
    expect(w).toHaveLength(4);
    expect(w.reduce((s, [, x]) => s + x, 0)).toBeCloseTo(1);
    expect(w[0][0]).toBe(0);
  });

  it('hangs a skirt from the hips and lets the hem follow its own leg', () => {
    const waist = skirtInfluences(bones, 1, 0, 0.5);
    expect(weight(waist, 0)).toBeCloseTo(1);
    const hemLeft = skirtInfluences(bones, 1, 1, 0.5);
    expect(weight(hemLeft, 0)).toBeLessThan(0.4);
    expect(weight(hemLeft, 1) + weight(hemLeft, 3)).toBeGreaterThan(0.6);
    expect(weight(hemLeft, 2) + weight(hemLeft, 4)).toBeLessThan(0.05);
    // Front and back share both legs equally
    const front = skirtInfluences(bones, 0, 1, 0.5);
    expect(weight(front, 1)).toBeCloseTo(weight(front, 2));
  });

  it('bends a trouser leg at the knee', () => {
    expect(weight(limbInfluences(0, 1, 2, 0.3, 0.5), 1)).toBeGreaterThan(0.95);
    expect(weight(limbInfluences(0, 1, 2, 0.9, 0.5), 2)).toBeGreaterThan(0.95);
  });

  it('fits cloth outside the body, never inside it', () => {
    const body = [0.1, 0.12, null, 0.11, 0.3, 0.1, 0.1, 0.1];
    const r = ringRadii(body, 0.02, 0.05);
    body.forEach((b, i) => { if (b !== null) expect(r[i]).toBeGreaterThanOrEqual(b + 0.02); });
    expect(r[2]).toBeGreaterThan(0.1);
  });

  it('pleats a gele and lifts its fan at the back, not the front', () => {
    expect(geleShape(Math.PI, 1).rise).toBeGreaterThan(0.9);
    expect(geleShape(0, 1).rise).toBeLessThan(0.05);
  });

  it('sells one African and one international outfit as real 3D garments', () => {
    const real = FASHION_ITEMS.filter((i) => i.style.garment);
    expect(real.map((i) => i.style.garment!.kind).sort()).toEqual(['blazer', 'buba', 'gele', 'iro', 'wide-trousers']);
    for (const i of real) { expect(i.price).toBeGreaterThan(0); expect(i.name).toMatch(/^OGM Atelier 3D /); }
  });
});
