import { describe, expect, it } from 'vitest';
import { parseManifest } from './assetManifest';

describe('asset manifest', () => {
  it('accepts a valid manifest', () => {
    const { manifest, problems } = parseManifest({
      surfaces: { road: { color: 'textures/road/color.jpg', normal: 'textures/road/normal.jpg', roughness: 'textures/road/rough.jpg', tileMeters: 4 } },
      avatar: { url: 'models/me.glb', height: 1.82 },
    });
    expect(problems).toEqual([]);
    expect(manifest.surfaces.road?.tileMeters).toBe(4);
    expect(manifest.avatar).toEqual({ url: 'models/me.glb', height: 1.82, walkSpeed: 1.4, runSpeed: 3.5, outfit: 'none' });
  });

  it('an empty manifest means use built-in assets', () => {
    expect(parseManifest({ surfaces: { road: null }, avatar: null })).toEqual({ manifest: { surfaces: {}, avatar: null, vehicles: {} }, problems: [] });
  });

  it('rejects paths outside public/assets and non-GLB avatars', () => {
    const { manifest, problems } = parseManifest({
      surfaces: { road: { color: '../../secret.jpg', tileMeters: 4 }, ground: { color: 'https://example.com/a.jpg' } },
      avatar: { url: 'models/me.fbx' },
    });
    expect(manifest).toEqual({ surfaces: {}, avatar: null, vehicles: {} });
    expect(problems.length).toBe(3);
  });

  it('fills in sensible defaults for missing numbers', () => {
    const { manifest, problems } = parseManifest({ surfaces: { pavement: { color: 'p.jpg' } }, avatar: { url: 'a.glb' } });
    expect(manifest.surfaces.pavement?.tileMeters).toBe(2);
    expect(manifest.avatar?.height).toBe(1.75);
    expect(problems.length).toBe(2);
  });

  it('survives garbage', () => {
    expect(parseManifest('nope').manifest).toEqual({ surfaces: {}, avatar: null, vehicles: {} });
  });

  it('accepts a concrete surface and a danfo model', () => {
    const { manifest, problems } = parseManifest({
      surfaces: { concrete: { color: 'textures/concrete/color.jpg', tileMeters: 2 } },
      vehicles: { danfo: { url: 'models/vehicles/danfo.glb', length: 4.8 } },
    });
    expect(problems).toEqual([]);
    expect(manifest.surfaces.concrete?.color).toBe('textures/concrete/color.jpg');
    expect(manifest.vehicles.danfo).toEqual({ url: 'models/vehicles/danfo.glb', length: 4.8, rotateY: 0 });
  });

  it('rejects bad vehicle entries and defaults the length', () => {
    const bad = parseManifest({ vehicles: { danfo: { url: 'models/danfo.fbx', length: 5 } } });
    expect(bad.manifest.vehicles).toEqual({});
    expect(bad.problems.length).toBe(1);
    const noLen = parseManifest({ vehicles: { danfo: { url: 'models/danfo.glb' } } });
    expect(noLen.manifest.vehicles.danfo?.length).toBe(5);
    const turned = parseManifest({ vehicles: { danfo: { url: 'd.glb', length: 5, rotateY: 180 } } });
    expect(turned.manifest.vehicles.danfo?.rotateY).toBe(180);
    const oddTurn = parseManifest({ vehicles: { danfo: { url: 'd.glb', length: 5, rotateY: 45 } } });
    expect(oddTurn.manifest.vehicles.danfo?.rotateY).toBe(0);
    expect(oddTurn.problems.length).toBe(1);
  });

  it('reads clip speeds and the outfit colour key for avatars', () => {
    const { manifest } = parseManifest({ avatar: { url: 'a.glb', height: 1.8, walkSpeed: 1.03, runSpeed: 2.8, outfit: 'blue' } });
    expect(manifest.avatar).toEqual({ url: 'a.glb', height: 1.8, walkSpeed: 1.03, runSpeed: 2.8, outfit: 'blue' });
    const bad = parseManifest({ avatar: { url: 'a.glb', height: 1.8, walkSpeed: -1, outfit: 'tartan' } });
    expect(bad.manifest.avatar?.walkSpeed).toBe(1.4);
    expect(bad.manifest.avatar?.outfit).toBe('none');
  });
});
