import { Color, DataTexture, NoColorSpace, type Material, type MeshStandardMaterial, type Texture } from 'three';
import { PATTERNS, type Slot, type Style } from '../lib/fashion';

/**
 * Restyles a Rocketbox avatar's clothes and hair in the fragment shader.
 * A garment map (see scripts/rocketbox/garment-masks.mjs) says which texels
 * belong to the top, bottom, shoes (body texture: R, G, B) or hair (head
 * texture: R; cut-out cards such as hijab drapes count as headwear). Those
 * texels take the chosen fabric's colours and pattern,
 * keeping the original fabric's folds and shading. Fabric never touches skin.
 *
 * Skin (every texel the garment map leaves uncovered) can be made deeper or
 * lighter within a natural range, keeping the person's own pores, shading
 * and undertone. Cut-out cards (hijab drapes, eyelashes) are never skin.
 */

interface SlotUniforms {
  on: { value: number };
  /** Fabric finish: roughness (-1 keeps the original), weave kind, metalness. */
  rough: { value: number };
  weave: { value: number };
  metal: { value: number };
  pattern: { value: number };
  scale: { value: number };
  a: { value: Color };
  b: { value: Color };
  c: { value: Color };
}

export type StyleUniforms = Partial<Record<Slot, SlotUniforms>>;

const BODY_SLOTS: readonly (readonly [Slot, string])[] = [['top', 'r'], ['bottom', 'g'], ['shoes', 'b']];

/** Cut-out cards (hijab drapes, eyelashes) are all hair/headwear: a mask that is 1 everywhere. */
const FULL_MASK = (() => {
  const t = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  t.colorSpace = NoColorSpace;
  t.needsUpdate = true;
  return t;
})();
const HEAD_SLOTS: readonly (readonly [Slot, string])[] = [['hair', 'r']];

const PATTERN_GLSL = /* glsl */ `
float ayeHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// Fine thread texture: 0 none, 1 plain weave, 2 twill, 3 handwoven rib. Fades out when the threads
// get smaller than a pixel, so distant clothes don't shimmer.
float ayeWeave(float kind, vec2 uv) {
  if (kind < 0.5) return 0.0;
  vec2 q = uv * 1400.0;
  float fade = clamp(1.0 - max(fwidth(q.x), fwidth(q.y)) * 0.8, 0.0, 1.0);
  float v = kind < 1.5 ? sin(q.x) * sin(q.y)
    : kind < 2.5 ? sin(q.x + q.y)
    : sin(q.x * 0.5) * 0.6 + sin(q.y * 3.0) * 0.4;
  return v * fade;
}
// p: ${Object.entries(PATTERNS).map(([k, v]) => `${v}=${k}`).join(', ')}
vec3 ayePattern(float p, vec2 uv, float s, vec3 a, vec3 b, vec3 c) {
  vec2 q = uv * s;
  vec2 f = fract(q) - 0.5;
  if (p < 0.5) return a;
  if (p < 1.5) return mix(a, b, step(0.5, fract(q.x)));
  if (p < 2.5) return mix(a, b, 1.0 - step(0.08, fract(q.x)));
  if (p < 3.5) {
    float gx = step(0.5, fract(q.x));
    float gy = step(0.5, fract(q.y));
    return gx * gy > 0.5 ? c : (gx + gy > 0.5 ? b : a);
  }
  if (p < 4.5) {
    // Ankara-style wax print: ringed medallions on a diamond lattice
    float r = length(f);
    float diamond = step(abs(f.x) + abs(f.y), 0.5);
    vec3 col = mix(b, a, diamond);
    col = mix(col, c, step(r, 0.3) * step(0.2, r));
    col = mix(col, b, step(r, 0.11));
    return col;
  }
  if (p < 5.5) {
    // Kente/aso-oke: woven bands with alternating blocks and thin weft lines
    float band = floor(q.x * 2.0);
    float block = step(0.5, fract(q.y * 1.5 + band * 0.5));
    vec3 col = mod(band, 2.0) < 1.0 ? mix(a, b, block) : mix(c, a, block);
    col = mix(col, b, step(0.92, fract(q.y * 6.0)));
    return col;
  }
  if (p < 6.5) {
    // Adire: hand-dyed indigo with soft resist circles
    vec2 cell = floor(q);
    vec2 jitter = vec2(ayeHash(cell), ayeHash(cell + 7.3)) * 0.3 - 0.15;
    float d = length(f - jitter);
    float spot = 1.0 - smoothstep(0.08, 0.2, d);
    return mix(mix(a, c, ayeHash(cell + 3.1) * 0.5), b, spot);
  }
  if (p < 7.5) {
    // Bogolan (mud cloth): hand-painted grid of dots, crosses and diagonals on a dark ground
    vec2 cell = floor(q);
    vec2 g = fract(q);
    float k = mod(cell.x + cell.y * 2.0, 3.0);
    float m = k < 1.0 ? step(length(g - 0.5), 0.17)
      : k < 2.0 ? max(step(abs(g.x - 0.5), 0.06), step(abs(g.y - 0.5), 0.06))
      : step(abs(fract(g.x + g.y) - 0.5), 0.1);
    float frame = step(0.92, max(g.x, g.y));
    vec3 col = mix(a, c, step(0.6, ayeHash(cell)) * 0.35);
    return mix(col, b, max(m, frame));
  }
  if (p < 8.5) {
    // Houndstooth: solid dark and light quarters, diagonal stripes where they meet
    vec2 g = fract(q) * 2.0;
    float cx = step(1.0, g.x);
    float cy = step(1.0, g.y);
    vec2 h = fract(g);
    float v = cx == cy ? cx : step(0.5, fract((h.x + h.y) * 2.0));
    return mix(a, b, v);
  }
  // Batik: wax-resist flowers with the fine crackle where the wax broke
  float r = length(f);
  float petals = 0.5 + 0.5 * cos(atan(f.y, f.x) * 6.0);
  float flower = step(r, 0.16 + 0.12 * petals);
  float crack = 1.0 - smoothstep(0.0, 0.035, abs(fract(q.x * 1.7 + 0.35 * sin(q.y * 3.1)) - 0.5));
  vec3 col = mix(a, b, flower);
  return mix(col, c, crack * 0.55 * (1.0 - flower));
}
`;

function slotGlsl(slot: Slot, channel: string) {
  return /* glsl */ `
  {
    float w = ayeMask.${channel} * uAye_${slot}_on;
    if (w > 0.001) {
      vec3 fabric = ayePattern(uAye_${slot}_pattern, vMapUv, uAye_${slot}_scale, uAye_${slot}_a, uAye_${slot}_b, uAye_${slot}_c);
      fabric *= 1.0 + ayeWeave(uAye_${slot}_weave, vMapUv) * 0.09;
      diffuseColor.rgb = mix(diffuseColor.rgb, fabric * ayeShade, w);
      if (uAye_${slot}_rough >= 0.0) {
        ayeRough = mix(ayeRough, uAye_${slot}_rough, w);
        ayeMetal = mix(ayeMetal, uAye_${slot}_metal, w);
        ayeFinish = max(ayeFinish, w);
      }
    }
  }`;
}

/**
 * Installs the restyling shader on a body or head material (once) and returns
 * its uniforms. Returns null for materials that aren't a Rocketbox body/head.
 */
export function installStyleShader(material: Material, maskTexture: Texture): StyleUniforms | null {
  let mask = maskTexture;
  const m = material as MeshStandardMaterial & { userData: { ayeStyle?: StyleUniforms } };
  if (m.userData.ayeStyle) return m.userData.ayeStyle;
  const cutout = /_opacity$/i.test(m.name);
  const slots = /_body$/i.test(m.name) ? BODY_SLOTS : /_head$/i.test(m.name) || cutout ? HEAD_SLOTS : null;
  if (!slots || !m.map) return null;
  if (cutout) mask = FULL_MASK;

  const uniforms: StyleUniforms = {};
  for (const [slot] of slots) {
    uniforms[slot] = {
      on: { value: 0 }, pattern: { value: 0 }, scale: { value: 16 }, rough: { value: -1 }, weave: { value: 0 }, metal: { value: 0 },
      a: { value: new Color() }, b: { value: new Color() }, c: { value: new Color() },
    };
  }
  const isHead = slots === HEAD_SLOTS;
  m.userData.ayeStyle = uniforms;
  const skin = { value: 0 };
  (m.userData as { ayeSkin?: { value: number } }).ayeSkin = skin;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uAyeMask = { value: mask };
    shader.uniforms.uAyeSkin = skin;
    let decl = 'uniform sampler2D uAyeMask; uniform float uAyeSkin;\n';
    for (const [slot] of slots) {
      const u = uniforms[slot]!;
      for (const [key, val] of Object.entries(u)) shader.uniforms[`uAye_${slot}_${key}`] = val;
      decl += `uniform float uAye_${slot}_on; uniform float uAye_${slot}_pattern; uniform float uAye_${slot}_scale;\n`;
      decl += `uniform float uAye_${slot}_rough; uniform float uAye_${slot}_weave; uniform float uAye_${slot}_metal;\n`;
      decl += `uniform vec3 uAye_${slot}_a; uniform vec3 uAye_${slot}_b; uniform vec3 uAye_${slot}_c;\n`;
    }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${decl}${PATTERN_GLSL}`)
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        // Fabric finish for the restyled areas, applied after the material's own roughness and metalness
        float ayeRough = 0.0;
        float ayeMetal = 0.0;
        float ayeFinish = 0.0;
        {
          vec4 ayeMask = texture2D(uAyeMask, vMapUv);
          // Keep the fabric's folds: brightness of the original texel, lifted so dark cloth still shows the new colour
          float ayeLum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          float ayeShade = ${isHead ? '0.35 + 1.25 * sqrt(ayeLum)' : '0.5 + 0.75 * sqrt(ayeLum)'};
          // Skin tone, before any fabric: deeper darkens and enriches, lighter lifts, both keeping the texture
          float ayeSkinW = ${cutout ? '0.0' : isHead ? '1.0 - ayeMask.r' : '1.0 - max(max(ayeMask.r, ayeMask.g), ayeMask.b)'};
          if (ayeSkinW > 0.001 && abs(uAyeSkin) > 0.001) {
            // Deeper: towards a warm deep-brown palette, keeping the texel's own light and shade (lum / typical skin lum)
            vec3 ayeDeep = vec3(0.36, 0.22, 0.15) * clamp(ayeLum / 0.5, 0.3, 1.35);
            vec3 ayeSkinCol = uAyeSkin > 0.0
              ? mix(diffuseColor.rgb, ayeDeep, uAyeSkin * 0.92)
              : min(diffuseColor.rgb * (1.0 - 0.32 * uAyeSkin), vec3(1.0));
            diffuseColor.rgb = mix(diffuseColor.rgb, ayeSkinCol, ayeSkinW);
          }
          ${slots.map(([slot, ch]) => slotGlsl(slot, ch)).join('\n')}
        }`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, ayeRough, ayeFinish);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, ayeMetal, ayeFinish);');
  };
  m.customProgramCacheKey = () => `aye-style-v5-${cutout ? 'cutout' : isHead ? 'head' : 'body'}`;
  m.needsUpdate = true;
  return uniforms;
}

/** Points the uniforms at the styles to show; slots without a style show the original clothes. */
export function applyStyles(uniforms: StyleUniforms, styles: Partial<Record<Slot, Style>>) {
  for (const [slot, u] of Object.entries(uniforms) as [Slot, SlotUniforms][]) {
    const s = styles[slot];
    u.on.value = s ? 1 : 0;
    if (!s) continue;
    u.pattern.value = PATTERNS[s.pattern];
    u.scale.value = s.scale;
    u.rough.value = s.fabric ? s.fabric.roughness : -1;
    u.weave.value = s.fabric ? s.fabric.weave : 0;
    u.metal.value = s.fabric ? s.fabric.metalness : 0;
    u.a.value.set(s.colors[0]);
    u.b.value.set(s.colors[1]);
    u.c.value.set(s.colors[2]);
  }
}

/** Deeper (up to 1) or lighter (down to -1) skin for a material set up by installStyleShader. */
export function applySkinTone(material: Material, tone: number) {
  const u = (material.userData as { ayeSkin?: { value: number } }).ayeSkin;
  if (u) u.value = Math.max(-1, Math.min(1, tone));
}
