import { describe, expect, it } from 'vitest';
import { DISTRICTS, districtById } from './geography';
import { BENCH_SIZE } from './world';

describe('the park pond', () => {
  it('sits in the lawn, clear of every tree, bench and path, and its rim is solid, in every city with a park', () => {
    let seen = 0;
    for (const d of DISTRICTS) {
      const park = d.layout.park;
      if (!park?.pond) continue;
      seen++;
      const { x, z, rx, rz } = park.pond;
      const a = park.area;
      expect(x - rx >= a.minX && x + rx <= a.maxX && z - rz >= a.minZ && z + rz <= a.maxZ, d.id).toBe(true);
      // Clear of the trees' trunks and the benches by at least half a metre
      const inOval = (px: number, pz: number, pad: number) => ((px - x) / (rx + pad)) ** 2 + ((pz - z) / (rz + pad)) ** 2 < 1;
      for (const [tx, tz] of park.trees) expect(inOval(tx, tz, 0.5), `${d.id} tree ${tx},${tz}`).toBe(false);
      for (const b of park.benches) expect(inOval(b.x, b.z, BENCH_SIZE[0] / 2), `${d.id} bench`).toBe(false);
      for (const p of park.paths) {
        const overlaps = x + rx > p.x0 && x - rx < p.x1 && z + rz > p.z0 && z - rz < p.z1;
        expect(overlaps, `${d.id} path`).toBe(false);
      }
      // Something solid covers the pond (you walk round it)
      expect(d.layout.obstacles.some((o) => Math.abs(o.position[0] - x) < 0.01 && Math.abs(o.position[2] - z) < 0.01 && o.size[0] >= rx * 2), d.id).toBe(true);
    }
    expect(seen).toBeGreaterThan(1);
    expect(districtById('lagos.marina').layout.park?.pond).toEqual({ x: 31, z: -9, rx: 1.4, rz: 1.0 });
  });
});
