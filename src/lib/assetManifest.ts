/**
 * Optional real asset files the player's copy of the game can use instead of
 * the built-in procedural ones. Listed in public/assets/manifest.json; paths
 * are relative to public/assets/. Anything missing or invalid falls back to
 * the built-in version, so the game always runs.
 */

export type SurfaceKey = 'road' | 'pavement' | 'ground' | 'roof' | 'concrete';
export const SURFACE_KEYS: readonly SurfaceKey[] = ['road', 'pavement', 'ground', 'roof', 'concrete'];

export interface SurfaceFiles {
  /** Colour (albedo) image. Required. */
  color: string;
  /** OpenGL-style normal map (ambientCG "NormalGL"). Optional. */
  normal?: string;
  /** Greyscale roughness map. Optional. */
  roughness?: string;
  /** Greyscale ambient-occlusion map (ambientCG "AmbientOcclusion"). Optional. */
  ao?: string;
  /** How many metres one copy of the image covers. */
  tileMeters: number;
}

export interface AvatarFile {
  /** GLB with animations named Idle, Walk and Run. */
  url: string;
  /** Standing height in metres the model is scaled to. */
  height: number;
  /** Ground speed (m/s) the Walk clip was captured at; playback rate follows it so feet don't slide. */
  walkSpeed: number;
  /** Ground speed (m/s) the Run clip was captured at. */
  runSpeed: number;
  /** Animation names present in the GLB, when supplied by its build metadata. */
  clips?: string[];
}

export type VehicleKey = 'danfo';
export const VEHICLE_KEYS: readonly VehicleKey[] = ['danfo'];

export interface VehicleFile {
  /** Static (unrigged) GLB of the vehicle, front facing +Z, wheels on y = 0. */
  url: string;
  /** Bumper-to-bumper length in metres the model is scaled to. */
  length: number;
  /** Degrees to turn the model so its front faces +Z: 0, 90, 180 or 270. */
  rotateY: number;
}

export interface AssetManifest {
  surfaces: Partial<Record<SurfaceKey, SurfaceFiles>>;
  avatar: AvatarFile | null;
  vehicles: Partial<Record<VehicleKey, VehicleFile>>;
}

export const EMPTY_MANIFEST: AssetManifest = { surfaces: {}, avatar: null, vehicles: {} };

const isPath = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && v.length < 200 && !v.includes('..') && !/^[a-z]+:/i.test(v) && !v.startsWith('/');

/** Validates a parsed manifest; drops (and reports) any entry that isn't usable. */
export function parseManifest(data: unknown): { manifest: AssetManifest; problems: string[] } {
  const problems: string[] = [];
  const manifest: AssetManifest = { surfaces: {}, avatar: null, vehicles: {} };
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
    if (e.ao !== undefined && !isPath(e.ao)) problems.push(`surfaces.${key}.ao is not a valid path; ignored`);
    const tile = typeof e.tileMeters === 'number' && e.tileMeters > 0 && e.tileMeters <= 50 ? e.tileMeters : 2;
    if (tile !== e.tileMeters) problems.push(`surfaces.${key}.tileMeters missing or out of range; using 2`);
    manifest.surfaces[key] = {
      color: e.color,
      normal: isPath(e.normal) ? e.normal : undefined,
      roughness: isPath(e.roughness) ? e.roughness : undefined,
      ao: isPath(e.ao) ? e.ao : undefined,
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
      const speed = (v: unknown, fallback: number) => (typeof v === 'number' && v > 0.3 && v < 12 ? v : fallback);
      const validClips = Array.isArray(a.clips)
        ? a.clips.filter((clip): clip is string => typeof clip === 'string' && clip.length > 0 && clip.length <= 80)
        : undefined;
      if (Array.isArray(a.clips) && validClips?.length !== a.clips.length) problems.push('avatar.clips contains invalid names; invalid entries were ignored');
      const clips = validClips ? Array.from(new Set(validClips)) : undefined;
      manifest.avatar = {
        url: a.url, height: h, walkSpeed: speed(a.walkSpeed, 1.4), runSpeed: speed(a.runSpeed, 3.5),
        ...(clips ? { clips } : {}),
      };
    }
  }
  const vehicles = (raw.vehicles ?? {}) as Record<string, unknown>;
  for (const key of VEHICLE_KEYS) {
    const v = vehicles[key] as Record<string, unknown> | null | undefined;
    if (!v) continue;
    if (!isPath(v.url) || !String(v.url).toLowerCase().endsWith('.glb')) {
      problems.push(`vehicles.${key}.url must be a .glb file path inside public/assets`);
      continue;
    }
    const len = typeof v.length === 'number' && v.length >= 2 && v.length <= 20 ? v.length : 5;
    if (len !== v.length) problems.push(`vehicles.${key}.length missing or out of range (2–20 m); using 5`);
    const turn = v.rotateY === undefined ? 0 : v.rotateY;
    const rotateY = [0, 90, 180, 270].includes(turn as number) ? (turn as number) : 0;
    if (rotateY !== turn) problems.push(`vehicles.${key}.rotateY must be 0, 90, 180 or 270; using 0`);
    manifest.vehicles[key] = { url: v.url, length: len, rotateY };
  }
  return { manifest, problems };
}

let current: AssetManifest = EMPTY_MANIFEST;
export const assetManifest = () => current;

/** Which kind of body a character has (lib/looks.ts BodyType; kept here so looks.ts can import from this file). */
export type PlayerBodyType = 'feminine' | 'masculine';
/** A specific Character Creator 5 person a player of a body type can choose to be. */
export type Cc5CharacterId = string;
let playerBodies: Partial<Record<Cc5CharacterId, AvatarFile>> = {};

/**
 * The model drawn for a player who chose this CC5 character: a model listed in
 * manifest.json for everyone, else the Character Creator 5 body built for that
 * character, else null (the built-in Rocketbox looks).
 */
export const playerBodyFor = (characterId: Cc5CharacterId): AvatarFile | null => current.avatar ?? playerBodies[characterId] ?? null;
/** Whether the selected player body advertises a named clip. */
export const hasPlayerClip = (characterId: Cc5CharacterId, clip: string): boolean =>
  playerBodyFor(characterId)?.clips?.includes(clip) ?? false;
/** True when the body drawn for this character id is a Character Creator 5 one (styled by material, not garment maps). */
export const isCc5Body = (characterId: Cc5CharacterId) => !current.avatar && !!playerBodies[characterId];

/** URL of a file inside public/assets/. */
export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`;

const exists = async (path: string) => {
  try {
    const res = await fetch(assetUrl(path), { method: 'HEAD', cache: 'no-cache' });
    // A dev server answers unknown paths with index.html; a real image never comes back as HTML
    return res.ok && !(res.headers.get('content-type') ?? '').includes('text/html');
  } catch {
    return false;
  }
};

/**
 * Listed surface images that aren't actually there would render black, so they
 * are dropped before any material is made: a missing colour image means the
 * built-in surface, a missing normal/roughness/AO map just goes without it.
 */
async function dropMissingFiles(m: AssetManifest): Promise<AssetManifest> {
  const surfaces: AssetManifest['surfaces'] = {};
  await Promise.all((Object.entries(m.surfaces) as [SurfaceKey, SurfaceFiles][]).map(async ([key, s]) => {
    if (!(await exists(s.color))) {
      console.warn(`[AYE assets] ${s.color} not found; ${key} uses the built-in texture`);
      return;
    }
    const keep = async (path: string | undefined, label: string) => {
      if (!path) return undefined;
      if (await exists(path)) return path;
      console.warn(`[AYE assets] ${path} not found; ${key} goes without its ${label} map`);
      return undefined;
    };
    const [normal, roughness, ao] = await Promise.all([keep(s.normal, 'normal'), keep(s.roughness, 'roughness'), keep(s.ao, 'ambient-occlusion')]);
    surfaces[key] = { ...s, normal, roughness, ao };
  }));
  return { ...m, surfaces };
}

/**
 * The player's body is a Character Creator 5 character (node scripts/cc5/build.mjs),
 * chosen from these options for their body type -- Aaron or a neutral alternative for
 * men, Ariana or a neutral alternative for women (2026-11-15: added a second option per
 * body type; see memory/aye_cc5_player_body.md). The built-in Rocketbox looks are only
 * a fallback: for a character whose files aren't there (they're private, so a fresh
 * copy of the repository doesn't have them), or in the development server with
 * ?avatar=default to compare. The saved character is not changed; only the model
 * drawn for it is.
 */
export const CC5_CHARACTERS: Record<Cc5CharacterId, { body: PlayerBodyType; info: string; pilotInfo?: string; label: string; buildArg: string }> = {
  aaron: { body: 'masculine', info: 'private/characters/cc5/aaron.json', pilotInfo: 'private/characters/cc5/pilot/aaron-final.json', label: 'Aaron', buildArg: 'aaron' },
  neutralM: { body: 'masculine', info: 'private/characters/cc5/neutralM.json', label: 'Neutral', buildArg: 'neutralM' },
  woman: { body: 'feminine', info: 'private/characters/cc5/woman.json', pilotInfo: 'private/characters/cc5/pilot/woman-final.json', label: 'Ariana', buildArg: 'woman' },
  neutralF: { body: 'feminine', info: 'private/characters/cc5/neutralF.json', label: 'Neutral', buildArg: 'neutralF' },
};
/** The CC5 characters defined for a body type, main look first. */
export const cc5CharactersFor = (body: PlayerBodyType): Cc5CharacterId[] =>
  (Object.keys(CC5_CHARACTERS) as Cc5CharacterId[]).filter((id) => CC5_CHARACTERS[id].body === body);
/** The character a player of this body type gets when they haven't chosen one (or an old save predates choice). */
export const defaultCc5CharacterId = (body: PlayerBodyType): Cc5CharacterId => cc5CharactersFor(body)[0];
/** A saved character id if it's still defined and matches the body, else that body's default. */
export const sanitiseCc5CharacterId = (body: PlayerBodyType, id: unknown): Cc5CharacterId =>
  typeof id === 'string' && CC5_CHARACTERS[id]?.body === body ? id : defaultCc5CharacterId(body);
/** The dev-only CC5 viewer's default character. */
export const CC5_INFO = CC5_CHARACTERS.aaron.info;

export function wantsCc5Avatar(search: string, dev: boolean): boolean {
  return !(dev && new URLSearchParams(search).get('avatar') === 'default');
}

/** The CC5 avatar entry the build wrote, validated like a manifest avatar; null if unusable. */
async function cc5Avatar(info: string): Promise<AvatarFile | null> {
  try {
    const res = await fetch(assetUrl(info), { cache: 'no-cache' });
    if (!res.ok || (res.headers.get('content-type') ?? '').includes('text/html')) return null;
    const { manifest, problems } = parseManifest(await res.json());
    for (const p of problems) console.warn(`[AYE assets] CC5 avatar: ${p}`);
    return manifest.avatar && (await exists(manifest.avatar.url)) ? manifest.avatar : null;
  } catch {
    return null;
  }
}

/** Loads public/assets/manifest.json once at startup. Never throws. */
export async function loadAssetManifest(): Promise<void> {
  try {
    const res = await fetch(assetUrl('manifest.json'), { cache: 'no-cache' });
    if (res.ok) {
      const { manifest, problems } = parseManifest(await res.json());
      for (const p of problems) console.warn(`[AYE assets] ${p}`);
      current = await dropMissingFiles(manifest);
    }
  } catch (err) {
    console.warn('[AYE assets] manifest.json could not be read; using built-in assets', err);
  }
  // A model listed in manifest.json stays everyone's body; otherwise each CC5 character that's built becomes available
  if (!current.avatar && wantsCc5Avatar(window.location.search, import.meta.env.DEV)) {
    const ids = Object.keys(CC5_CHARACTERS) as Cc5CharacterId[];
    const found = await Promise.all(ids.map(async (id) => {
      const character = CC5_CHARACTERS[id];
      return (character.pilotInfo && await cc5Avatar(character.pilotInfo)) ?? cc5Avatar(character.info);
    }));
    playerBodies = {};
    ids.forEach((id, i) => {
      const avatar = found[i];
      if (avatar) {
        playerBodies[id] = avatar;
        console.info(`[AYE assets] ${id} player body${avatar.clips?.includes('Dance') ? ' (animation pilot)' : ''}: ${avatar.url}`);
      } else {
        console.warn(`[AYE assets] the ${id} CC5 player body is not built (node scripts/cc5/build.mjs --character ${CC5_CHARACTERS[id].buildArg}); using the built-in looks for it.`);
      }
    });
  }
}
