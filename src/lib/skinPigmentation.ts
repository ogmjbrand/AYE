/**
 * The skin categories offered in character creation: Ebony, Dark brown,
 * Chocolate, Caramel, Light brown, Light, Vitiligo and Albinism. Each is a
 * starting point for the depth and undertone sliders already used by
 * components/outfitShader.ts and lib/cc5Body.ts (relative to the person's own
 * modelled skin, never a fixed colour measurement); Vitiligo and Albinism add
 * their own adjustable pigmentation characteristics instead of being flat
 * swatches. Picking a category sets these starting values but every slider
 * stays open afterwards, so no look is forced.
 */

export type SkinCategoryId =
  | 'custom'
  | 'light'
  | 'lightBrown'
  | 'caramel'
  | 'chocolate'
  | 'darkBrown'
  | 'ebony'
  | 'vitiligo'
  | 'albinism';

/** A patchy depigmentation pattern drawn procedurally in the skin shader (no texture asset needed). */
export interface VitiligoPattern {
  enabled: boolean;
  /** 0 a trace of patches … 1 widespread depigmentation. */
  coverage: number;
  /** Patch size: smaller values draw finer patches, larger values broader ones. */
  scale: number;
  /** Pattern variation; the same seed always draws the same patches, so "Randomise pattern" just changes this. */
  seed: number;
}

/** Depth and vitiligo already cover skin; albinismIntensity governs hair, brows and lashes (where the model supports separate materials). */
export interface SkinPigmentation {
  category: SkinCategoryId;
  /** -1 cool … 1 warm undertone shift, independent of depth. */
  undertone: number;
  vitiligo: VitiligoPattern;
  /** 0 fully pigmented … 1 fully depigmented hair, brows and lashes. */
  albinismIntensity: number;
}

export const DEFAULT_VITILIGO: VitiligoPattern = { enabled: false, coverage: 0.35, scale: 1, seed: 1 };

export const DEFAULT_PIGMENTATION: SkinPigmentation = {
  category: 'custom', undertone: 0, vitiligo: DEFAULT_VITILIGO, albinismIntensity: 0,
};

export interface SkinCategoryPreset {
  id: SkinCategoryId;
  label: string;
  /** CSS colour or gradient for the picker swatch. */
  swatch: string;
  /** -1 lighter … 1 deeper than the person's own modelled skin. */
  depth: number;
  undertone: number;
  vitiligo?: Partial<VitiligoPattern>;
  albinismIntensity?: number;
  description: string;
}

export const SKIN_CATEGORIES: readonly SkinCategoryPreset[] = [
  {
    id: 'light', label: 'Light', swatch: '#e9c9a8', depth: -0.55, undertone: 0.1,
    description: 'A light complexion with a soft warm undertone.',
  },
  {
    id: 'lightBrown', label: 'Light brown', swatch: '#c99165', depth: 0.05, undertone: 0.4,
    description: 'A warm light-to-mid brown, the kind sunlight picks out golden highlights in.',
  },
  {
    id: 'caramel', label: 'Caramel', swatch: '#a9713f', depth: 0.3, undertone: 0.55,
    description: 'A golden mid-tone brown with a rich warm undertone.',
  },
  {
    id: 'chocolate', label: 'Chocolate', swatch: '#6e4225', depth: 0.55, undertone: 0.3,
    description: 'A deep, rich brown with a warm undertone.',
  },
  {
    id: 'darkBrown', label: 'Dark brown', swatch: '#4c2a18', depth: 0.75, undertone: 0.1,
    description: 'A deep brown, warm but closer to neutral.',
  },
  {
    id: 'ebony', label: 'Ebony', swatch: '#2a1811', depth: 0.95, undertone: -0.15,
    description: 'The deepest, richest brown, with a cool-neutral undertone.',
  },
  {
    id: 'vitiligo', label: 'Vitiligo', swatch: 'linear-gradient(135deg, #8a5634 0%, #8a5634 52%, #ead9c3 52%, #ead9c3 100%)',
    depth: 0.35, undertone: 0.3, vitiligo: { enabled: true, coverage: 0.35, scale: 1, seed: 1 },
    description: 'Any base complexion, with patches of depigmented skin. Adjust the base tone and the patches independently.',
  },
  {
    id: 'albinism', label: 'Albinism', swatch: '#f4e8db', depth: -0.9, undertone: -0.05, albinismIntensity: 0.85,
    description: 'Little to no melanin: very pale skin, and (where the model supports it) pale hair, brows and lashes.',
  },
];

export const categoryById = (id: SkinCategoryId | undefined): SkinCategoryPreset | undefined =>
  SKIN_CATEGORIES.find((c) => c.id === id);

export function isSkinCategoryId(value: unknown): value is SkinCategoryId {
  return value === 'custom' || (typeof value === 'string' && SKIN_CATEGORIES.some((c) => c.id === value));
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

export const clampDepth = (v: number) => round2(clamp(v, -1, 1));
export const clampUndertone = (v: number) => round2(clamp(v, -1, 1));
export const clampCoverage = (v: number) => round2(clamp(v, 0, 1));
export const clampPatchScale = (v: number) => round2(clamp(v, 0.4, 2.5));
export const clampAlbinismIntensity = (v: number) => round2(clamp(v, 0, 1));

/** The depth and pigmentation a category starts you at; 'custom' only resets the category label. */
export function pigmentationForCategory(id: SkinCategoryId, current: SkinPigmentation): { depth: number; pigmentation: SkinPigmentation } {
  if (id === 'custom') return { depth: 0, pigmentation: { ...current, category: 'custom' } };
  const preset = categoryById(id);
  if (!preset) return { depth: 0, pigmentation: { ...DEFAULT_PIGMENTATION } };
  return {
    depth: preset.depth,
    pigmentation: {
      category: id,
      undertone: preset.undertone,
      vitiligo: { ...DEFAULT_VITILIGO, ...preset.vitiligo },
      albinismIntensity: preset.albinismIntensity ?? 0,
    },
  };
}

function sanitiseVitiligo(value: unknown): VitiligoPattern {
  if (typeof value !== 'object' || value === null) return { ...DEFAULT_VITILIGO };
  const v = value as Record<string, unknown>;
  const num = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
  return {
    enabled: v.enabled === true,
    coverage: clampCoverage(num(v.coverage, DEFAULT_VITILIGO.coverage)),
    scale: clampPatchScale(num(v.scale, DEFAULT_VITILIGO.scale)),
    seed: Number.isInteger(v.seed) ? (v.seed as number) : DEFAULT_VITILIGO.seed,
  };
}

/** Validates a saved pigmentation; a missing or corrupted value keeps the plain skin-tone slider behaviour (everything neutral). */
export function sanitisePigmentation(value: unknown): SkinPigmentation {
  if (typeof value !== 'object' || value === null) return { ...DEFAULT_PIGMENTATION };
  const v = value as Record<string, unknown>;
  const num = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
  return {
    category: isSkinCategoryId(v.category) ? v.category : 'custom',
    undertone: clampUndertone(num(v.undertone, 0)),
    vitiligo: sanitiseVitiligo(v.vitiligo),
    albinismIntensity: clampAlbinismIntensity(num(v.albinismIntensity, 0)),
  };
}
