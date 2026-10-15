/**
 * Optional real asset files the player's copy of the game can use instead of
 * the built-in procedural ones. Listed in public/assets/manifest.json; paths
 * are relative to public/assets/. Anything missing or invalid falls back to
 * the built-in version, so the game always runs.
 */

export type SurfaceKey = 'road' | 'pavement' | 'ground' | 'roof';
export const SURFACE_KEYS: readonly SurfaceKey[] = ['road', 'pavement', 'ground', 'roof'];

export interface SurfaceFiles {
  /** Colour (albedo) image. Required. */
  color: string;
  /** OpenGL-style normal map (ambientCG "NormalGL"). Optional. */
  normal?: string;
  /** Greyscale roughness map. Optional. */
  roughness?: string;
  /** How many metres one copy of the image covers. */
  tileMeters: number;
}

export interface AvatarFile {
  /** GLB with animations named Idle, Walk and Run. */
  url: string;
  /** Standing height in metres the model is scaled to. */
  height: number;
}

export interface AssetManifest {
  surfaces: Partial<Record<SurfaceKey, SurfaceFiles>>;
  avatar: AvatarFile | null;
}

export const EMPTY_MANIFEST: AssetManifest = { surfaces: {}, avatar: null };

const isPath = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && v.length < 200 && !v.includes('..') && !/^[a-z]+:/i.test(v) && !v.startsWith('/');

/** Validates a parsed manifest; drops (and reports) any entry that isn't usable. */
export function parseManifest(data: unknown): { manifest: AssetManifest; problems: string[] } {
  const problems: string[] = [];
  const manifest: AssetManifest = { surfaces: {}, avatar: null };
  if (typeof data !== 'object' || data === null) {
    return { manifest, problems: ['manifest is not a JSON object'] };
  }
  const raw = data as Record<string, unknown>;
  const surfaces = (raw.surfaces ?? {}) as Record<string, unknown>;
  for (const key of SURFACE_KEYS) {
    const s = surfaces[key];
    if (s === undefined || s === null) continue;
    const e = s as Record<string, unknown>;
    if (!isPath(e.color)) {
      problems.push(`surfaces.${key}.color must be a file path inside public/assets`);
      continue;
    }
    if (e.normal !== undefined && !isPath(e.normal)) problems.push(`surfaces.${key}.normal is not a valid path; ignored`);
    if (e.roughness !== undefined && !isPath(e.roughness)) problems.push(`surfaces.${key}.roughness is not a valid path; ignored`);
    const tile = typeof e.tileMeters === 'number' && e.tileMeters > 0 && e.tileMeters <= 50 ? e.tileMeters : 2;
    if (tile !== e.tileMeters) problems.push(`surfaces.${key}.tileMeters missing or out of range; using 2`);
    manifest.surfaces[key] = {
      color: e.color,
      normal: isPath(e.normal) ? e.normal : undefined,
      roughness: isPath(e.roughness) ? e.roughness : undefined,
      tileMeters: tile,
    };
  }
  const a = raw.avatar as Record<string, unknown> | null | undefined;
  if (a) {
    if (!isPath(a.url) || !String(a.url).toLowerCase().endsWith('.glb')) {
      problems.push('avatar.url must be a .glb file path inside public/assets');
    } else {
      const h = typeof a.height === 'number' && a.height >= 1.2 && a.height <= 2.3 ? a.height : 1.75;
      if (h !== a.height) problems.push('avatar.height missing or out of range (1.2–2.3 m); using 1.75');
      manifest.avatar = { url: a.url, height: h };
    }
  }
  return { manifest, problems };
}

let current: AssetManifest = EMPTY_MANIFEST;
export const assetManifest = () => current;

/** URL of a file inside public/assets/. */
export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`;

/** Loads public/assets/manifest.json once at startup. Never throws. */
export async function loadAssetManifest(): Promise<void> {
  try {
    const res = await fetch(assetUrl('manifest.json'), { cache: 'no-cache' });
    if (!res.ok) return;
    const { manifest, problems } = parseManifest(await res.json());
    for (const p of problems) console.warn(`[AYE assets] ${p}`);
    current = manifest;
  } catch (err) {
    console.warn('[AYE assets] manifest.json could not be read; using built-in assets', err);
  }
}
