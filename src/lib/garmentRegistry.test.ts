import { describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { SEWN_GARMENTS } from './garmentRegistry';
import { FASHION_ITEMS } from './fashion';
import { LOOKS } from './looks';

describe('sewn garment registry', () => {
  it('lists real people, files that are there, and one skinned mesh on the Bip01 skeleton in each', async () => {
    await MeshoptDecoder.ready;
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    for (const g of SEWN_GARMENTS) {
      expect(Object.keys(g.files).length).toBeGreaterThan(0);
      for (const [lookId, path] of Object.entries(g.files)) {
        const look = LOOKS.find((l) => l.id === lookId);
        expect(look, lookId).toBeDefined();
        expect(look?.body).toBe(g.body);
        const doc = await io.read(`public/assets/${path}`);
        const skins = doc.getRoot().listSkins();
        expect(skins.length, path).toBe(1);
        const joints = skins[0].listJoints().map((j) => j.getName());
        expect(joints).toContain('Bip01 Pelvis');
        expect(joints).toContain('Bip01 L Thigh');
        expect(doc.getRoot().listMeshes().length).toBe(1);
      }
    }
  }, 60_000);

  it('every sewn item in the shop names a garment in the registry, under our own label', () => {
    const sewn = FASHION_ITEMS.filter((i) => i.style.sewn);
    expect(sewn.length).toBeGreaterThan(0);
    for (const i of sewn) {
      expect(SEWN_GARMENTS.some((g) => g.id === i.style.sewn), i.id).toBe(true);
      expect(i.name).toMatch(/^OGM Atelier /);
    }
    for (const g of SEWN_GARMENTS) expect(g.name).toMatch(/^OGM Atelier /);
  });
});
