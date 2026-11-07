/**
 * The water material: three's physically based material extended with waves, flowing detail,
 * ripples, rain rings, foam and puddle edges (vfx/WaterSurface.tsx draws it).
 */
import { Color, DoubleSide, MeshPhysicalMaterial } from 'three';
import { NOISE_GLSL } from './glsl';
import { MAX_RIPPLES, type VfxBudget } from './vfxQuality';
import { WAVES, packRipples, type WaterKind } from './waterModel';

export interface WaterOptions {
  kind: WaterKind;
  /** Deep colour of the water body. */
  colour?: string;
  /** Flow direction and speed (m/s) for rivers; a breeze for still water. */
  flow?: readonly [number, number];
  /** Foam at the edges of the surface's UVs (pools, riverbanks): width as a share of the surface. */
  edgeFoam?: number;
  /** The shoreline (ocean): the sea lies beyond this z (world metres); surf breaks along it. */
  shoreZ?: number;
  /** 0 … 1: rain falling on it (rings on still water). */
  rain?: number;
  opacity?: number;
}

/** The uniforms each water material owns (updated every frame by the component). */
export interface WaterUniforms {
  uTime: { value: number };
  uFlow: { value: [number, number] };
  uRipples: { value: Float32Array };
  uRain: { value: number };
  uEdgeFoam: { value: number };
  uShoreZ: { value: number };
  uPuddle: { value: number };
  uFoamColour: { value: Color };
}

const waveGlsl = (kind: WaterKind) => {
  const waves = WAVES[kind];
  if (!waves.length) return 'vec3 vfxWave(vec3 p, out vec3 n) { n = vec3(0.0, 1.0, 0.0); return p; }';
  const terms = waves.map((w) => {
    const k = (2 * Math.PI) / w.length;
    const c = Math.sqrt(9.81 / k);
    const q = w.steep / (k * w.amp * waves.length);
    return `{ vec2 d = vec2(${w.dir[0].toFixed(4)}, ${w.dir[1].toFixed(4)}); float f = ${k.toFixed(5)} * (dot(d, p.xz) - ${c.toFixed(5)} * uTime);
      float s = sin(f), co = cos(f);
      off.xz += ${(q * w.amp).toFixed(5)} * d * co; off.y += ${w.amp.toFixed(5)} * s;
      dn.xz -= d * ${(k * w.amp).toFixed(5)} * co; dn.y -= ${(q * k * w.amp).toFixed(5)} * s; }`;
  }).join('\n');
  return `vec3 vfxWave(vec3 p, out vec3 n) { vec3 off = vec3(0.0); vec3 dn = vec3(0.0, 1.0, 0.0);
    ${terms}
    n = normalize(dn); return p + off; }`;
};

/**
 * A water material for a kind of water at a quality tier. Same kind and tier share one compiled
 * program (three caches programs by source and defines).
 */
export function createWaterMaterial(o: WaterOptions, budget: VfxBudget): MeshPhysicalMaterial & { userData: { uniforms: WaterUniforms } } {
  const still = o.kind === 'pool' || o.kind === 'puddle';
  const m = new MeshPhysicalMaterial({
    color: new Color(o.colour ?? (o.kind === 'ocean' ? '#0e3a4a' : o.kind === 'river' ? '#244a3e' : o.kind === 'puddle' ? '#1c1d1f' : '#2a8fa6')),
    roughness: o.kind === 'puddle' ? 0.06 : 0.04,
    metalness: 0,
    clearcoat: budget.waterOctaves >= 3 ? 1 : 0,
    clearcoatRoughness: 0.05,
    ior: 1.33,
    specularIntensity: 1,
    envMapIntensity: 1.15,
    transparent: (o.opacity ?? 1) < 1 || o.kind === 'puddle',
    opacity: o.opacity ?? (o.kind === 'pool' ? 0.82 : 1),
    depthWrite: o.kind !== 'puddle',
    side: DoubleSide,
  });
  const uniforms: WaterUniforms = {
    uTime: { value: 0 },
    uFlow: { value: [o.flow?.[0] ?? (still ? 0.05 : 0.6), o.flow?.[1] ?? (still ? 0.03 : 0)] },
    uRipples: { value: packRipples([]) },
    uRain: { value: o.rain ?? 0 },
    uEdgeFoam: { value: o.edgeFoam ?? 0 },
    uShoreZ: { value: o.shoreZ ?? 1e5 },
    uPuddle: { value: o.kind === 'puddle' ? 1 : 0 },
    uFoamColour: { value: new Color('#f2f6f5') },
  };
  const moving = budget.waterWaves && WAVES[o.kind].length > 0;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.defines = { ...shader.defines, OCTAVES: budget.waterOctaves, RIPPLES: MAX_RIPPLES, ...(moving ? { WAVES_ON: 1 } : {}) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime;
        varying vec3 vWaterWorld;
        varying vec2 vWaterUv;
        ${waveGlsl(o.kind)}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        #ifdef WAVES_ON
          vec3 waveN; vfxWave((modelMatrix * vec4(position, 1.0)).xyz, waveN);
          objectNormal = waveN;
        #endif`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef WAVES_ON
          vec3 wn; vec3 wp = vfxWave((modelMatrix * vec4(position, 1.0)).xyz, wn);
          transformed += wp - (modelMatrix * vec4(position, 1.0)).xyz;
        #endif`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vWaterWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWaterUv = uv;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime, uRain, uEdgeFoam, uShoreZ, uPuddle;
        uniform vec2 uFlow;
        uniform vec4 uRipples[RIPPLES];
        uniform vec3 uFoamColour;
        varying vec3 vWaterWorld;
        varying vec2 vWaterUv;
        float waterFoam = 0.0;
        ${NOISE_GLSL}
        // Height of the fine surface detail at a point: wind or flow ripples, touch rings and raindrops
        float vfxDetail(vec2 p) {
          float h = vfxFbm(p * 1.3 + uFlow * uTime * 1.2) * 0.6 + vfxFbm(p * 2.7 - uFlow.yx * uTime * 0.8 + 7.1) * 0.4;
          for (int i = 0; i < RIPPLES; i++) {
            vec4 r = uRipples[i];
            float age = uTime - r.z;
            if (age < 0.0 || age > 3.2) continue;
            float band = distance(p, r.xy) - age * 1.1;
            h += sin(band * 14.0) * exp(-band * band * 6.0) * (1.0 - age / 3.2) * r.w * 0.6 * step(band, 0.05);
          }
          if (uRain > 0.0) {
            // Raindrop rings: each cell of a fine grid has a drop landing now and then
            vec2 cellId = floor(p * 3.0);
            vec2 f = fract(p * 3.0) - 0.5;
            float seed = vfxHash(cellId);
            float age = fract(uTime * (0.6 + seed) + seed * 7.0);
            float ring = abs(length(f - (vec2(vfxHash(cellId + 3.1), vfxHash(cellId + 9.7)) - 0.5) * 0.5) - age * 0.45);
            h += (1.0 - smoothstep(0.0, 0.04, ring)) * (1.0 - age) * uRain * step(seed, 0.5 + 0.5 * uRain) * 0.5;
          }
          return h;
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // Foam: along the surface's edges (pools, banks) and where the sea meets the shore
        vec2 eUv = min(vWaterUv, 1.0 - vWaterUv);
        float edge = uEdgeFoam > 0.0 ? 1.0 - smoothstep(0.0, uEdgeFoam, min(eUv.x, eUv.y)) : 0.0;
        // Surf: a band out from the shoreline, rolling in and out with the swell
        float seaward = vWaterWorld.z - uShoreZ;
        float surf = 0.55 + 0.45 * sin(uTime * 0.9 - seaward * 1.3);
        float shore = (1.0 - smoothstep(0.0, 3.5 * surf + 0.6, seaward)) * step(-1.0, seaward);
        float foamNoise = vfxFbm(vWaterWorld.xz * 2.2 + uFlow * uTime * 2.0);
        waterFoam = clamp(max(edge, shore) * smoothstep(0.35, 0.65, foamNoise + max(edge, shore) * 0.35), 0.0, 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, uFoamColour, waterFoam);
        if (uPuddle > 0.5) {
          // An irregular edge that fades into the road
          float rim = length(vWaterUv - 0.5) * 2.0 + (vfxFbm(vWaterUv * 3.0 + 5.0) - 0.5) * 0.6;
          diffuseColor.a *= 1.0 - smoothstep(0.55, 0.95, rim);
          if (diffuseColor.a < 0.02) discard;
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.75, waterFoam);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec2 p = vWaterWorld.xz;
          float e = 0.05;
          float h0 = vfxDetail(p);
          vec2 grad = vec2(vfxDetail(p + vec2(e, 0.0)) - h0, vfxDetail(p + vec2(0.0, e)) - h0) / e;
          // Fine detail fades with distance, as on real water (and so it never breaks into blotches far off)
          float far = distance(cameraPosition, vWaterWorld);
          float strength = 0.12 * (1.0 - waterFoam * 0.7) / (1.0 + far * 0.06);
          vec3 nWorld = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
          nWorld = normalize(nWorld + vec3(-grad.x, 0.0, -grad.y) * strength);
          normal = normalize((viewMatrix * vec4(nWorld, 0.0)).xyz);
        }`);
  };
  m.customProgramCacheKey = () => `aye-water-${o.kind}-${budget.waterOctaves}-${moving ? 1 : 0}`;
  m.userData.uniforms = uniforms;
  return m as MeshPhysicalMaterial & { userData: { uniforms: WaterUniforms } };
}

