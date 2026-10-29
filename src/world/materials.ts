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
    // Ambient occlusion darkens the gaps between pavers and the pits in asphalt (uses the same UVs as the colour)
    aoMap: f.ao ? fileTexture(f.ao, false) : null,
    aoMapIntensity: 0.8,
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

/** Concrete for plain kerbs, tiled to the kerb stone length (2 m) so it isn't stretched. */
function kerbConcrete() {
  const files = assetManifest().surfaces.concrete;
  if (!files) return new MeshStandardMaterial({ color: '#b5b1a9', roughness: 0.9 });
  const m = surfaceFromFiles(files);
  const along = 2 / files.tileMeters;
  for (const t of [m.map, m.normalMap, m.roughnessMap, m.aoMap]) t?.repeat.set(along, Math.max(0.1, 0.2 / files.tileMeters));
  return m;
}

/** A real pavement texture for park footpaths, or null to keep their plain packed-earth colour. */
export function parkPathSurface() {
  const files = assetManifest().surfaces.pavement;
  return files ? surfaceFromFiles(files) : null;
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
    // Plain grey kerbs are cast concrete: the listed concrete texture if there is one
    plainKerb: kerbConcrete(),
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

const dryLook = new WeakMap<MeshStandardMaterial, { color: Color; roughness: number; env: number }>();

/**
 * Rain on the ground, 0 (dry) to 1 (soaked): roads, pavements and kerbs go
 * darker and glossy, so lamps, signs and emergency lights shine in them.
 * Only colour, roughness and reflection strength change, never the shader,
 * so the weather changing never recompiles anything.
 */
let wetNow = 0;
let nightNow = 0;
export function setWetness(wet: number) {
  if (!cache) return;
  const w = Math.max(0, Math.min(1, wet));
  wetNow = w;
  cache.lightPool.emissiveIntensity = nightNow * 0.42 * (1 + 1.3 * wetNow);
  for (const m of [cache.road, cache.pavement, cache.ground, cache.kerb, cache.plainKerb, cache.concrete]) {
    if (!(m instanceof MeshStandardMaterial)) continue;
    let dry = dryLook.get(m);
    if (!dry) { dry = { color: m.color.clone(), roughness: m.roughness, env: m.envMapIntensity }; dryLook.set(m, dry); }
    m.color.copy(dry.color).multiplyScalar(1 - 0.4 * w);
    m.roughness = dry.roughness * (1 - 0.72 * w);
    m.envMapIntensity = dry.env * (1 + 1.4 * w);
  }
}

/** Window and lamp glow, 0 by day to 1 at night. */
export function setNightGlow(night: number) {
  nightNow = night;
  for (const m of glowing) m.emissiveIntensity = m === cache?.lampHead ? night * 4 : night * 0.4;
  // Lamp light spreads and shines on a wet street
  if (cache) cache.lightPool.emissiveIntensity = night * 0.42 * (1 + 1.3 * wetNow);
}
