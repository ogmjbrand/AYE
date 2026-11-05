import { describe, expect, it } from 'vitest';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { boneKey, fitSimilarity } from './glbGarment';

describe('GLB garment rebinding', () => {
  it('names bones the same however a tool spelled them', () => {
    expect(boneKey('Bip01 L Thigh')).toBe(boneKey('Bip01_L_Thigh'));
    expect(boneKey('Bip01 Pelvis')).toBe('bip01pelvis');
  });

  it('finds the rotation, scale and move between two copies of a skeleton (Y-up metres to Z-up centimetres)', () => {
    const from = [[0, 1, 0], [0.1, 0.9, 0.02], [-0.1, 0.9, -0.03], [0, 1.5, 0.05], [0.3, 1.4, 0], [-0.3, 1.4, 0.01], [0.1, 0.1, 0.08]].map((p) => new Vector3(...p));
    const truth = new Matrix4().compose(new Vector3(5, -2, 3), new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2), new Vector3(100, 100, 100));
    const to = from.map((p) => p.clone().applyMatrix4(truth));
    const fit = fitSimilarity(from, to);
    expect(fit.scale).toBeCloseTo(100, 4);
    expect(fit.worst).toBeLessThan(1e-6 * 100);
    const probe = new Vector3(0.2, 0.7, -0.1);
    expect(probe.clone().applyMatrix4(fit.matrix).distanceTo(probe.clone().applyMatrix4(truth))).toBeLessThan(1e-4);
  });

  it('reports a pose that does not match', () => {
    const from = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]].map((p) => new Vector3(...p));
    const to = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, -1]].map((p) => new Vector3(...p)); // a mirror isn't a rotation
    expect(fitSimilarity(from, to).worst).toBeGreaterThan(0.5);
  });
});
