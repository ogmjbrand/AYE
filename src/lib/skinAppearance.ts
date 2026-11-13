/**
 * Skin & pigmentation in the character creator.
 *
 * Eight starting points (AYE's reference set): Ebony, Dark Brown, Caramel, Light Skin, Light Brown,
 * Chocolate, Albinism and Vitiligo. Each ordinary category has three shades, and every skin can then
 * be fine-tuned (pigmentation depth, undertone from cool to warm, saturation), so the presets are a
 * place to start, not eight fixed people. The person's face, body, hair and clothes are untouched:
 * this only sets the pigmentation the skin shader (components/outfitShader.ts) paints onto their
 * own skin texture, keeping its light, shade and detail.
 *
 * Vitiligo: lighter, depigmented patches over any base skin, placed by location on the body (face,
 * around the eyes and mouth, neck, hands, arms, torso, legs, feet), with their size, how many,
 * rounded or irregular edges, and a seed for a different arrangement. Patches are anchored to the
 * skeleton, so they sit in the same place on every body type and move with every animation.
 *
 * Albinism is more than pale skin: very low pigment skin with a pink undertone, white to pale
 * blonde hair (also lashes and brows that follow the hair), and light eyes.
 *
 * Pure (no three.js), so it can be tested; colours are sRGB hex.
 */

export type SkinPresetId = 'ebony' | 'dark-brown' | 'caramel' | 'light-skin' | 'light-brown' | 'chocolate' | 'albinism' | 'vitiligo';
/** The ordinary pigmentation categories (a vitiligo base is one of these). */
export type BaseSkinId = Exclude<SkinPresetId, 'albinism' | 'vitiligo'>;

export interface SkinPreset {
  id: SkinPresetId;
  label: string;
  description: string;
  /** Lighter, middle and deeper shade (sRGB hex). */
  shades: readonly [string, string, string];
}

export const SKIN_PRESETS: readonly SkinPreset[] = [
  { id: 'ebony', label: 'Ebony', description: 'Very deep, rich pigmentation', shades: ['#2e211b', '#251a15', '#1d1411'] },
  { id: 'light-brown', label: 'Light Brown', description: 'Warm, lighter brown', shades: ['#c79a7a', '#b88866', '#a77756'] },
  { id: 'dark-brown', label: 'Dark Brown', description: 'Deep natural brown', shades: ['#6c4a37', '#5f402f', '#503628'] },
  { id: 'chocolate', label: 'Chocolate', description: 'Rich medium-deep brown', shades: ['#8d4f36', '#80462f', '#6f3c28'] },
  { id: 'caramel', label: 'Caramel', description: 'Golden warm brown', shades: ['#d29c66', '#c68d59', '#b67e4c'] },
  { id: 'albinism', label: 'Albinism', description: 'Low-pigmentation appearance', shades: ['#f6e2d9', '#f2dad0', '#ecd0c4'] },
  { id: 'light-skin', label: 'Light Skin', description: 'Light beige to tan', shades: ['#efd0b8', '#e5bea2', '#d9ab8a'] },
  { id: 'vitiligo', label: 'Vitiligo', description: 'Customisable depigmented patches', shades: ['#5f402f', '#5f402f', '#5f402f'] },
];

export const BASE_SKINS: readonly BaseSkinId[] = ['ebony', 'dark-brown', 'chocolate', 'caramel', 'light-brown', 'light-skin'];

export type VitiligoLocation = 'face' | 'eyes-mouth' | 'neck' | 'hands' | 'arms' | 'torso' | 'legs' | 'feet';
export const VITILIGO_LOCATIONS: readonly { id: VitiligoLocation; label: string }[] = [
  { id: 'face', label: 'Face' }, { id: 'eyes-mouth', label: 'Around eyes & mouth' }, { id: 'neck', label: 'Neck' },
  { id: 'hands', label: 'Hands' }, { id: 'arms', label: 'Arms' }, { id: 'torso', label: 'Chest & back' },
  { id: 'legs', label: 'Knees & legs' }, { id: 'feet', label: 'Feet' },
];

export interface Vitiligo {
  /** The skin around the patches. */
  base: BaseSkinId;
  baseShade: 0 | 1 | 2;
  locations: VitiligoLocation[];
  /** Patch size, 0 (small flecks) … 1 (large areas). */
  size: number;
  /** How many patches at each place, 0 (one) … 1 (several). */
  spread: number;
  /** Rounded or irregular, natural-looking edges. */
  shape: 'rounded' | 'irregular';
  /** A different arrangement of the same choices. */
  seed: number;
}

export type AlbinismHair = 'white' | 'platinum' | 'pale-blonde' | 'own';
export type AlbinismEyes = 'blue' | 'grey' | 'violet' | 'light-brown';
export interface Albinism {
  hair: AlbinismHair;
  eyes: AlbinismEyes;
}

export interface SkinAppearance {
  preset: SkinPresetId;
  /** 0 lighter, 1 middle, 2 deeper shade of the preset. */
  shade: 0 | 1 | 2;
  /** Fine-tuning, each −1 … 1: deeper/lighter pigmentation, cool (pink) to warm (golden) undertone, muted to vivid. */
  depth: number;
  undertone: number;
  saturation: number;
  vitiligo?: Vitiligo;
  albinism?: Albinism;
}

export const DEFAULT_VITILIGO: Vitiligo = { base: 'dark-brown', baseShade: 1, locations: ['face', 'hands'], size: 0.5, spread: 0.5, shape: 'irregular', seed: 1 };
export const DEFAULT_ALBINISM: Albinism = { hair: 'white', eyes: 'blue' };

/** A preset as a starting skin, with its options. */
export function presetSkin(preset: SkinPresetId, shade: 0 | 1 | 2 = 1): SkinAppearance {
  return {
    preset, shade, depth: 0, undertone: 0, saturation: 0,
    ...(preset === 'vitiligo' ? { vitiligo: { ...DEFAULT_VITILIGO } } : {}),
    ...(preset === 'albinism' ? { albinism: { ...DEFAULT_ALBINISM } } : {}),
  };
}

export const skinPreset = (id: SkinPresetId) => SKIN_PRESETS.find((p) => p.id === id) ?? SKIN_PRESETS[0];

// ——— Colour ———

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
const rgbToHex = (rgb: readonly number[]) => `#${rgb.map((v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0')).join('')}`;

function rgbToHsl([r, g, b]: readonly number[]): [number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb([h, s, l]: readonly number[]): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r + m, g + m, b + m];
}

/**
 * Apply the fine-tuning to a colour: depth darkens or lightens (in lightness, keeping the hue),
 * undertone turns the hue cooler (pinker, towards 8°) or warmer (golden, towards 34°), saturation
 * mutes or deepens the colour. All within natural limits, so no slider makes skin grey or orange.
 */
export function tuneSkin(hex: string, depth: number, undertone: number, saturation: number): string {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  const d = clamp(depth, -1, 1), u = clamp(undertone, -1, 1), sa = clamp(saturation, -1, 1);
  const lightness = d > 0 ? l * (1 - 0.45 * d) : l + (1 - l) * 0.4 * -d;
  const hue = u > 0 ? h + (34 - h) * 0.6 * u : h + (8 - h) * 0.6 * -u;
  const sat = clamp(s * (1 + 0.45 * sa), 0.08, 0.85);
  return rgbToHex(hslToRgb([((hue % 360) + 360) % 360, sat, clamp(lightness, 0.04, 0.96)]));
}

/** The skin's colour: the preset's shade (a vitiligo base's for vitiligo), fine-tuned. */
export function skinColour(a: SkinAppearance): string {
  const base = a.preset === 'vitiligo' && a.vitiligo
    ? skinPreset(a.vitiligo.base).shades[a.vitiligo.baseShade]
    : skinPreset(a.preset).shades[a.shade];
  return tuneSkin(base, a.depth, a.undertone, a.saturation);
}

/** The colour of vitiligo patches: skin with its melanin gone (pale, pink-tinged), whatever the base. */
export const VITILIGO_PATCH_COLOUR = '#e9c6b4';

/** Albinism's hair colour (null: keep the person's own or their chosen dye). */
export function albinismHairColour(a: SkinAppearance): string | null {
  if (a.preset !== 'albinism' || !a.albinism) return null;
  return { white: '#f4f1ea', platinum: '#e6dcc4', 'pale-blonde': '#e3cf9c', own: null }[a.albinism.hair];
}

export const ALBINISM_EYES: Record<AlbinismEyes, string> = { blue: '#8fb3cf', grey: '#a8b2b8', violet: '#a99ac2', 'light-brown': '#b08d6c' };

// ——— Vitiligo patches ———

/** The bones each place on the body is anchored to (Rocketbox biped names), and how big a patch there is relative to the body. */
export const VITILIGO_ANCHORS: Record<VitiligoLocation, { bones: readonly string[]; scale: number }> = {
  face: { bones: ['Bip01 Head'], scale: 0.022 },
  'eyes-mouth': { bones: ['Bip01 Head'], scale: 0.013 },
  neck: { bones: ['Bip01 Neck'], scale: 0.018 },
  hands: { bones: ['Bip01 L Hand', 'Bip01 R Hand'], scale: 0.016 },
  arms: { bones: ['Bip01 L Forearm', 'Bip01 R Forearm', 'Bip01 L UpperArm', 'Bip01 R UpperArm'], scale: 0.022 },
  torso: { bones: ['Bip01 Spine2', 'Bip01 Spine1'], scale: 0.035 },
  legs: { bones: ['Bip01 L Calf', 'Bip01 R Calf'], scale: 0.026 },
  feet: { bones: ['Bip01 L Foot', 'Bip01 R Foot'], scale: 0.016 },
};

/** The most patches the shader takes. */
export const MAX_PATCHES = 12;

export interface Patch { center: [number, number, number]; radius: number }

const rnd = (seed: number) => { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };

/**
 * Where the patches go, in the model's own (bind-pose) space: each centred on a point of the skin
 * of the chosen places (so they sit on the surface, not inside the body), picked by the seed, sized
 * by `size` and the body's height. `anchors` maps bone names to sample points on the skin that bone
 * moves; `height` is the body's height in the same units.
 */
export function vitiligoPatches(v: Vitiligo, anchors: ReadonlyMap<string, readonly (readonly [number, number, number])[]>, height: number): Patch[] {
  const per = 1 + Math.round(clamp(v.spread, 0, 1) * 2);
  const out: Patch[] = [];
  for (const loc of v.locations) {
    const a = VITILIGO_ANCHORS[loc];
    a.bones.forEach((bone, bi) => {
      const points = anchors.get(bone);
      if (!points?.length) return;
      // Each place and bone its own sequence, so one mesh's patches don't shift when another's bones are missing
      const random = rnd(v.seed * 7919 + VITILIGO_LOCATIONS.findIndex((l) => l.id === loc) * 131 + bi * 17 + 1);
      for (let k = 0; k < per && out.length < MAX_PATCHES; k++) {
        const at = points[Math.floor(random() * points.length)];
        const r = height * a.scale * (0.45 + clamp(v.size, 0, 1) * 1.2) * (0.75 + random() * 0.5);
        out.push({ center: [at[0], at[1], at[2]], radius: r });
      }
    });
  }
  return out;
}

// ——— Saving ———

const PRESET_IDS = SKIN_PRESETS.map((p) => p.id);
const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : d);
const shadeOf = (v: unknown): 0 | 1 | 2 => (v === 0 || v === 1 || v === 2 ? v : 1);

/** A saved skin, checked; null if there isn't one (older characters keep their original skin settings). */
export function sanitiseSkin(v: unknown): SkinAppearance | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (!PRESET_IDS.includes(o.preset as SkinPresetId)) return null;
  const preset = o.preset as SkinPresetId;
  const out: SkinAppearance = {
    preset, shade: shadeOf(o.shade),
    depth: num(o.depth, -1, 1, 0), undertone: num(o.undertone, -1, 1, 0), saturation: num(o.saturation, -1, 1, 0),
  };
  if (preset === 'vitiligo') {
    const w = (o.vitiligo ?? {}) as Record<string, unknown>;
    const locations = Array.isArray(w.locations) ? (w.locations as unknown[]).filter((l): l is VitiligoLocation => VITILIGO_LOCATIONS.some((x) => x.id === l)) : DEFAULT_VITILIGO.locations;
    out.vitiligo = {
      base: BASE_SKINS.includes(w.base as BaseSkinId) ? (w.base as BaseSkinId) : DEFAULT_VITILIGO.base,
      baseShade: shadeOf(w.baseShade),
      locations: [...new Set(locations)],
      size: num(w.size, 0, 1, DEFAULT_VITILIGO.size),
      spread: num(w.spread, 0, 1, DEFAULT_VITILIGO.spread),
      shape: w.shape === 'rounded' ? 'rounded' : 'irregular',
      seed: Math.round(num(w.seed, 1, 1e6, 1)),
    };
  }
  if (preset === 'albinism') {
    const a = (o.albinism ?? {}) as Record<string, unknown>;
    out.albinism = {
      hair: (['white', 'platinum', 'pale-blonde', 'own'] as const).includes(a.hair as AlbinismHair) ? (a.hair as AlbinismHair) : DEFAULT_ALBINISM.hair,
      eyes: (Object.keys(ALBINISM_EYES) as AlbinismEyes[]).includes(a.eyes as AlbinismEyes) ? (a.eyes as AlbinismEyes) : DEFAULT_ALBINISM.eyes,
    };
  }
  return out;
}
