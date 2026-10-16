/**
 * Shared PBR materials. Created once and reused by every mesh so the whole
 * city renders with a handful of materials (and draw calls).
 */
import {
  AdditiveBlending, Color, DoubleSide, LinearSRGBColorSpace, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace,
  TextureLoader, type Texture,
} from 'three';
import { assetManifest, assetUrl, type SurfaceFiles, type SurfaceKey } from '../lib/assetManifest';
import { asphalt, facadeFor, ground, kerb, lightPoolTexture, pavers, roof, type SurfaceSet } from './textures';

const glowing = new Set<MeshStandardMaterial>();

function surface(set: SurfaceSet, opts: { repeat?: [number, number]; vertexColors?: boolean; glow?: boolean } = {}) {
  const clone = (t: Texture | undefined) => {
    if (!t || !opts.repeat) return t;
    const c = t.clone();
    c.repeat.set(...opts.repeat);
    c.needsUpdate = true;
    return c;
  };
  const m = new MeshStandardMaterial({
    map: clone(set.map),
    roughnessMap: clone(set.orm),
    metalnessMap: clone(set.orm),
    normalMap: clone(set.normal) ?? null,
    roughness: 1,
    metalness: 1,
    vertexColors: opts.vertexColors ?? false,
  });
  if (set.emissive && opts.glow) {
    m.emissiveMap = set.emissive;
    m.emissive = new Color('#ffffff');
    m.emissiveIntensity = 0;
    glowing.add(m);
  }
  return m;
}

const loader = new TextureLoader();
function fileTexture(path: string, srgb: boolean): Texture {
  const t = loader.load(assetUrl(path), undefined, undefined, () => console.warn(`[AYE assets] could not load ${path}`));
  t.colorSpace = srgb ? SRGBColorSpace : LinearSRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Material from real image files listed in public/assets/manifest.json. */
function surfaceFromFiles(f: SurfaceFiles) {
  const m = new MeshStandardMaterial({
    map: fileTexture(f.color, true),
    normalMap: f.normal ? fileTexture(f.normal, false) : null,
    roughnessMap: f.roughness ? fileTexture(f.roughness, false) : null,
    roughness: f.roughness ? 1 : 0.9,
    metalness: 0,
  });
  m.userData.tileMeters = f.tileMeters; // overrides the procedural texture's tile size
  return m;
}

/** A listed real surface if there is one, otherwise the built-in procedural one. */
function groundSurface(key: SurfaceKey, fallback: () => SurfaceSet, opts?: Parameters<typeof surface>[1]) {
  const files = assetManifest().surfaces[key];
  return files ? surfaceFromFiles(files) : surface(fallback(), opts);
}

let cache: ReturnType<typeof build> | null = null;

function build() {
  const facade = {
    tower: surface(facadeFor('tower'), { vertexColors: true, glow: true }),
    office: surface(facadeFor('office'), { vertexColors: true, glow: true }),
    residential: surface(facadeFor('residential'), { vertexColors: true, glow: true }),
    shop: surface(facadeFor('shop'), { vertexColors: true, glow: true }),
  };
  return {
    facade,
    roof: groundSurface('roof', roof, { vertexColors: true }),
    road: groundSurface('road', asphalt),
    pavement: groundSurface('pavement', pavers),
    ground: groundSurface('ground', ground),
    kerb: surface(kerb()),
    marking: new MeshStandardMaterial({ color: '#e9e4d3', roughness: 0.75 }),
    yellowMarking: new MeshStandardMaterial({ color: '#e0b425', roughness: 0.75 }),
    // Balcony slabs and ledges: a listed concrete texture if there is one, else plain concrete
    concrete: assetManifest().surfaces.concrete
      ? surfaceFromFiles(assetManifest().surfaces.concrete!)
      : new MeshStandardMaterial({ color: '#9d978b', roughness: 0.9 }),
    darkMetal: new MeshStandardMaterial({ color: '#2b2d30', roughness: 0.45, metalness: 0.8 }),
    // Real glass over the painted panes: reflects the sky, lets lit rooms show through at night
    windowGlass: new MeshStandardMaterial({ color: '#a9bccb', roughness: 0.06, metalness: 0.95, transparent: true, opacity: 0.38, envMapIntensity: 1.3, depthWrite: false }),
    // Painted concrete for sills, lintels, floor bands and copings
    trim: new MeshStandardMaterial({ color: '#d8d1c3', roughness: 0.85 }),
    tank: new MeshStandardMaterial({ color: '#1d2a3a', roughness: 0.6 }),
    acUnit: new MeshStandardMaterial({ color: '#d9dbd8', roughness: 0.5, metalness: 0.2 }),
    wood: new MeshStandardMaterial({ color: '#5a4630', roughness: 0.9 }),
    canvas: new MeshStandardMaterial({ roughness: 0.85, side: DoubleSide }),
    lightPool: new MeshStandardMaterial({
      transparent: true, depthWrite: false, blending: AdditiveBlending, color: '#000000',
      emissive: new Color('#ffffff'), emissiveMap: lightPoolTexture(), emissiveIntensity: 0,
    }),
    lampHead: new MeshStandardMaterial({ color: '#30302e', emissive: new Color('#ffcf8a'), emissiveIntensity: 0, roughness: 0.4 }),
  };
}

export function materials() {
  if (!cache) {
    cache = build();
    glowing.add(cache.lampHead);
  }
  return cache;
}

/** Window and lamp glow, 0 by day to 1 at night. */
export function setNightGlow(night: number) {
  for (const m of glowing) m.emissiveIntensity = m === cache?.lampHead ? night * 4 : night * 0.4;
  if (cache) cache.lightPool.emissiveIntensity = night * 0.42;
}
