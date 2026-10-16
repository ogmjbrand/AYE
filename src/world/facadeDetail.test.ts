import { describe, expect, it } from 'vitest';
import { DISTRICTS } from '../lib/geography';
import { facadeOffset, facesOf, floorBandsOf, windowsOf } from './facadeDetail';
import { BAY_WIDTH, FACADE_TILE } from './textures';

describe('facade detail', () => {
  const buildings = DISTRICTS.flatMap((d) => d.layout.buildings);

  it('walls run round the building with outward normals', () => {
    const b = buildings[0];
    for (const f of facesOf(b)) {
      const mid = f.origin.clone().addScaledVector(f.along, f.length / 2);
      const toCentre = { x: b.position[0] - mid.x, z: b.position[2] - mid.z };
      expect(toCentre.x * f.normal.x + toCentre.z * f.normal.z).toBeLessThan(0);
    }
  });

  it('every window sits on its wall, inside the building height, centred on a painted bay', () => {
    let total = 0;
    for (const b of buildings) {
      const shift = facadeOffset(b) * FACADE_TILE.bays;
      for (const w of windowsOf(b)) {
        total++;
        expect(w.center.y + w.height / 2).toBeLessThanOrEqual(b.size[1]);
        expect(w.center.y - w.height / 2).toBeGreaterThan(0);
        // On the wall plane
        const [x, , z] = b.position;
        const [bw, , bd] = b.size;
        const onX = Math.abs(Math.abs(w.center.x - x) - bw / 2) < 1e-6;
        const onZ = Math.abs(Math.abs(w.center.z - z) - bd / 2) < 1e-6;
        expect(onX || onZ).toBe(true);
        // The pane centre is half a bay past a bay boundary of the texture
        const face = facesOf(b).find((f) => Math.abs(f.normal.x - w.normal.x) < 1e-6 && Math.abs(f.normal.z - w.normal.z) < 1e-6)!;
        const along = w.center.clone().sub(face.origin).dot(face.along);
        const bays = along / BAY_WIDTH[b.style] + shift;
        expect(Math.abs((bays % 1 + 1) % 1 - 0.5)).toBeLessThan(1e-6);
      }
    }
    expect(total).toBeGreaterThan(300);
  });

  it('shops keep their ground floor as shopfront, and towers are curtain walls', () => {
    for (const b of buildings.filter((x) => x.style === 'shop')) {
      for (const w of windowsOf(b)) expect(w.center.y).toBeGreaterThan(3);
    }
    for (const b of buildings.filter((x) => x.style === 'tower')) expect(windowsOf(b)).toEqual([]);
    expect(floorBandsOf(buildings.find((x) => x.style === 'residential')!).length).toBeGreaterThan(0);
  });
});
