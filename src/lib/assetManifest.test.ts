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
    expect(manifest.avatar).toEqual({ url: 'models/me.glb', height: 1.82 });
  });

  it('an empty manifest means use built-in assets', () => {
    expect(parseManifest({ surfaces: { road: null }, avatar: null })).toEqual({ manifest: { surfaces: {}, avatar: null }, problems: [] });
  });

  it('rejects paths outside public/assets and non-GLB avatars', () => {
    const { manifest, problems } = parseManifest({
      surfaces: { road: { color: '../../secret.jpg', tileMeters: 4 }, ground: { color: 'https://example.com/a.jpg' } },
      avatar: { url: 'models/me.fbx' },
    });
    expect(manifest).toEqual({ surfaces: {}, avatar: null });
    expect(problems.length).toBe(3);
  });

  it('fills in sensible defaults for missing numbers', () => {
    const { manifest, problems } = parseManifest({ surfaces: { pavement: { color: 'p.jpg' } }, avatar: { url: 'a.glb' } });
    expect(manifest.surfaces.pavement?.tileMeters).toBe(2);
    expect(manifest.avatar?.height).toBe(1.75);
    expect(problems.length).toBe(2);
  });

  it('survives garbage', () => {
    expect(parseManifest('nope').manifest).toEqual({ surfaces: {}, avatar: null });
  });
});
