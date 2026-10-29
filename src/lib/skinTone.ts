export const SKIN_TONES = [
  { id: 'original', label: 'Original', color: '#ffffff' },
  { id: 'deep', label: 'Deep', color: '#57382e' },
  { id: 'dark', label: 'Dark brown', color: '#754b38' },
  { id: 'rich', label: 'Rich brown', color: '#a66b4e' },
  { id: 'golden', label: 'Golden brown', color: '#c4875a' },
  { id: 'warm', label: 'Warm tan', color: '#d6a078' },
  { id: 'light', label: 'Light', color: '#efc8a1' },
  { id: 'custom', label: 'Custom', color: '#c4875a' },
] as const;

export type SkinToneId = (typeof SKIN_TONES)[number]['id'];
export const DEFAULT_SKIN_TONE: SkinToneId = 'original';

export function isSkinToneId(value: unknown): value is SkinToneId {
  return typeof value === 'string' && SKIN_TONES.some((tone) => tone.id === value);
}

export function skinToneById(id: SkinToneId) {
  return SKIN_TONES.find((tone) => tone.id === id) ?? SKIN_TONES[0];
}

/** Each swatch as a depth on the skin shader's scale: deeper (to 1) or lighter (to -1) than the person's own skin. */
const DEPTH: Record<SkinToneId, number> = { original: 0, deep: 0.9, dark: 0.65, rich: 0.35, golden: 0.1, warm: -0.2, light: -0.55, custom: 0 };
export const skinToneDepth = (id: SkinToneId) => DEPTH[id];

export function isSkinColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}
