import { RepeatWrapping, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import { assetUrl } from '../lib/assetManifest';

/**
 * Real photographed materials (ambientCG, CC0; built by scripts/ambientcg/build.mjs):
 * colour, normal, roughness and ambient-occlusion maps. They load in the
 * background (nothing suspends), so a material made with them shows its plain
 * colour for a moment and then the real surface.
 */
export type PbrName = 'wood-floor' | 'bricks' | 'bamboo' | 'onyx' | 'fabric' | 'metal' | 'road' | 'ground';

const HAS_AO: ReadonlySet<PbrName> = new Set(['wood-floor', 'bricks', 'bamboo', 'ground']);
const loader = new TextureLoader();
const cache = new Map<string, Texture>();

function load(name: PbrName, map: string, repeat: readonly [number, number], color: boolean): Texture {
  const key = `${name}/${map}@${repeat[0]}x${repeat[1]}`;
  let t = cache.get(key);
  if (!t) {
    t = loader.load(assetUrl(`textures/${name}/${map}.webp`));
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = 8;
    if (color) t.colorSpace = SRGBColorSpace;
    cache.set(key, t);
  }
  return t;
}

/** The maps for one material, repeated this many times across the surface. */
export function pbr(name: PbrName, repeat: readonly [number, number]) {
  return {
    map: load(name, 'color', repeat, true),
    normalMap: load(name, 'normal', repeat, false),
    roughnessMap: load(name, 'roughness', repeat, false),
    ...(HAS_AO.has(name) ? { aoMap: load(name, 'ao', repeat, false) } : {}),
  };
}
