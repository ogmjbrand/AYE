import { describe, expect, it } from 'vitest';
import {
  BASE_SKINS, MAX_PATCHES, SKIN_PRESETS, VITILIGO_ANCHORS, VITILIGO_LOCATIONS, albinismHairColour, presetSkin,
  sanitiseSkin, skinColour, tuneSkin, vitiligoPatches, type Vitiligo,
} from './skinAppearance';
import { parseCharacter } from './save';

const lum = (hex: string) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const hue = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  return max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
};

describe('skin presets', () => {
  it('has the eight reference categories, three shades each, lighter to deeper', () => {
    expect(SKIN_PRESETS.map((p) => p.label)).toEqual(['Ebony', 'Light Brown', 'Dark Brown', 'Chocolate', 'Caramel', 'Albinism', 'Light Skin', 'Vitiligo']);
    for (const p of SKIN_PRESETS.filter((x) => x.id !== 'vitiligo')) {
      expect(lum(p.shades[0]), p.id).toBeGreaterThan(lum(p.shades[1]));
      expect(lum(p.shades[1]), p.id).toBeGreaterThan(lum(p.shades[2]));
    }
    // Ebony is the deepest, albinism the lightest
    const mid = (id: string) => lum(SKIN_PRESETS.find((p) => p.id === id)!.shades[1]);
    for (const id of BASE_SKINS) expect(mid('ebony')).toBeLessThanOrEqual(mid(id));
    for (const id of BASE_SKINS) expect(mid('albinism')).toBeGreaterThan(mid(id));
  });

  it('fine-tuning: deeper darkens, warm turns golden, cool turns pinker, saturation within natural limits', () => {
    const base = '#c68d59';
    expect(lum(tuneSkin(base, 0.8, 0, 0))).toBeLessThan(lum(base));
    expect(lum(tuneSkin(base, -0.8, 0, 0))).toBeGreaterThan(lum(base));
    expect(hue(tuneSkin(base, 0, 1, 0))).toBeGreaterThan(hue(tuneSkin(base, 0, -1, 0)));
    expect(tuneSkin(base, 0, 0, 0)).toBe(base);
    // Never grey, never neon, whatever the sliders
    for (const s of [-1, 1]) for (const d of [-1, 1]) {
      const c = tuneSkin(base, d, s, s);
      expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('a preset is a starting point: shades and fine-tuning change the colour', () => {
    const a = presetSkin('caramel', 0), b = presetSkin('caramel', 2);
    expect(skinColour(a)).not.toBe(skinColour(b));
    expect(skinColour({ ...a, undertone: 0.6 })).not.toBe(skinColour(a));
  });
});

describe('vitiligo', () => {
  // Each bone: a few points of its skin, around (i·10, 100 + i, 0)
  const anchors = new Map(Object.values(VITILIGO_ANCHORS).flatMap((a) => a.bones).map((b, i) => [b, [0, 1, 2, 3].map((k) => [i * 10 + k, 100 + i, k] as [number, number, number])]));
  const v: Vitiligo = { base: 'ebony', baseShade: 1, locations: ['face', 'hands'], size: 0.5, spread: 0.5, shape: 'irregular', seed: 3 };

  it('places patches around the chosen places, both hands, the same every time', () => {
    const p = vitiligoPatches(v, anchors, 170);
    expect(p.length).toBe(2 + 2 * 2); // face: 2 patches; each hand: 2
    expect(vitiligoPatches(v, anchors, 170)).toEqual(p);
    // Centred on the head's own skin, not floating inside it
    const head = anchors.get('Bip01 Head')!;
    expect(head.some((q) => q.every((c, i) => c === p[0].center[i]))).toBe(true);
  });

  it('size, spread and the seed change them; never more than the shader takes', () => {
    const small = vitiligoPatches({ ...v, size: 0 }, anchors, 170), big = vitiligoPatches({ ...v, size: 1 }, anchors, 170);
    expect(big[0].radius).toBeGreaterThan(small[0].radius);
    expect(vitiligoPatches({ ...v, spread: 1 }, anchors, 170).length).toBeGreaterThan(vitiligoPatches({ ...v, spread: 0 }, anchors, 170).length);
    expect(vitiligoPatches({ ...v, seed: 4 }, anchors, 170)).not.toEqual(vitiligoPatches(v, anchors, 170));
    const all = vitiligoPatches({ ...v, locations: VITILIGO_LOCATIONS.map((l) => l.id), spread: 1 }, anchors, 170);
    expect(all.length).toBe(MAX_PATCHES);
    // A body without some bones simply gets none there
    expect(vitiligoPatches(v, new Map(), 170)).toEqual([]);
  });

  it('keeps the base skin around the patches', () => {
    const s = { ...presetSkin('vitiligo'), vitiligo: v };
    expect(skinColour(s)).toBe(skinColour({ ...presetSkin('ebony'), shade: 1 }));
  });
});

describe('albinism', () => {
  it('is more than pale skin: hair, lashes and eyes too', () => {
    const a = presetSkin('albinism');
    expect(a.albinism).toBeDefined();
    expect(albinismHairColour(a)).toBe('#f4f1ea');
    expect(albinismHairColour({ ...a, albinism: { hair: 'own', eyes: 'grey' } })).toBeNull();
    expect(albinismHairColour(presetSkin('ebony'))).toBeNull();
  });
});

describe('saving', () => {
  it('checks saved skins and keeps older characters as they were', () => {
    expect(sanitiseSkin(undefined)).toBeNull();
    expect(sanitiseSkin({ preset: 'purple' })).toBeNull();
    const s = sanitiseSkin({ preset: 'vitiligo', shade: 9, depth: 5, vitiligo: { base: 'nope', locations: ['face', 'face', 'tail'], size: 2 } })!;
    expect(s.shade).toBe(1);
    expect(s.depth).toBe(1);
    expect(s.vitiligo).toMatchObject({ base: 'dark-brown', locations: ['face'], size: 1 });
    const char = { id: 'c', name: 'Ada', lifestyle: 'ordinary', career: 'engineer', diet: 'everything', colorR: 1, colorG: 1, colorB: 1, balance: 1, createdAt: 1, lastBalanceUpdate: 1, gender: 'woman', body: 'feminine', lookId: 'female-adult-08' };
    expect(parseCharacter(char)?.skin).toBeUndefined();
    expect(parseCharacter({ ...char, skin: presetSkin('chocolate', 2) })?.skin).toMatchObject({ preset: 'chocolate', shade: 2 });
  });
});
