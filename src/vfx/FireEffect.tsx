/**
 * Fire, drawn entirely on the GPU: flames, smoke and embers are instanced billboards whose motion
 * is worked out in their vertex shaders from the time, so a fire costs three draw calls and no
 * per-particle work on the CPU however many particles it has. Flames are shaped by fractal noise
 * and coloured by temperature (deep red at the edges to a near-white core); smoke rises, spreads
 * and drifts with the wind, lit orange from below; embers spiral up and fade.
 *
 * Light: fires report their glow to the always-mounted FireLightRig instead of adding lights
 * (lib: vfx/fireLights.ts), and every fire also lights the ground under it with an additive glow.
 *
 * Presets: building (a doorway or window), vehicle (a car's engine bay and cabin), small (a bin,
 * a pan on a stove, a pile of rubbish).
 */
import { useEffect, useId, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, InstancedBufferAttribute, InstancedBufferGeometry,
  NormalBlending, PlaneGeometry, ShaderMaterial, Vector3, type Group, type Mesh, type Points, type PointLight,
} from 'three';
import { BLACKBODY_GLSL, NOISE_GLSL } from './glsl';
import { brightestGlows, reportFireGlow } from './fireLights';
import { useVfx } from './useVfxTier';
import { scaledCount } from './vfxQuality';
import { FIRE_PRESETS, type FireKind } from './firePresets';

/** Fixed random numbers per particle: x and z offsets (−0.5 … 0.5), speed (0 … 1), phase (0 … 1). */
function seeds(count: number, salt: number): Float32Array {
  const out = new Float32Array(count * 4);
  let s = (salt * 2654435761) >>> 0;
  for (let i = 0; i < out.length; i++) {
    s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0;
    out[i] = s / 4294967296 - (i % 4 < 2 ? 0.5 : 0);
  }
  return out;
}

/** A unit quad instanced `count` times, each with a seed. */
function quads(count: number, salt: number): InstancedBufferGeometry {
  const g = new InstancedBufferGeometry();
  const quad = new PlaneGeometry(1, 1);
  g.index = quad.index;
  g.setAttribute('position', quad.getAttribute('position'));
  g.setAttribute('uv', quad.getAttribute('uv'));
  g.setAttribute('aSeed', new InstancedBufferAttribute(seeds(count, salt), 4));
  g.instanceCount = count;
  // Drawn where the fire is; never culled by the quad's tiny bounds
  g.boundingSphere = null;
  return g;
}

function points(count: number, salt: number): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('aSeed', new BufferAttribute(seeds(count, salt), 4));
  return g;
}

const COMMON_UNIFORMS = () => ({
  uTime: { value: 0 },
  uIntensity: { value: 1 },
  uWidth: { value: 1 },
  uDepth: { value: 0.5 },
  uHeight: { value: 2 },
  uWind: { value: [0.25, 0.1] },
});

const FLAME_VERT = /* glsl */ `
uniform float uTime, uIntensity, uWidth, uDepth, uHeight;
uniform vec2 uWind;
attribute vec4 aSeed;
varying vec2 vUv;
varying float vLife, vSeed;
void main() {
  float speed = 0.7 + aSeed.z * 0.7;
  float life = fract(uTime * speed + aSeed.w);
  vLife = life; vSeed = aSeed.x * 13.1 + aSeed.w * 7.3; vUv = uv;
  float h = uHeight * (0.35 + 0.65 * uIntensity);
  vec3 c = vec3(aSeed.x * uWidth * (1.0 - life * 0.6), life * h * 0.8, aSeed.y * uDepth);
  c.xz += uWind * life * life * h * 0.35;
  c.x += sin(uTime * 3.1 + aSeed.w * 20.0) * 0.07 * life * h;
  vec4 mv = modelViewMatrix * vec4(c, 1.0);
  float size = (mix(1.0, 0.4, life) * (0.45 + 0.65 * uIntensity)) * (0.45 + uWidth * 0.42);
  mv.xy += position.xy * vec2(size, size * 1.8);
  gl_Position = projectionMatrix * mv;
}`;

const FLAME_FRAG = /* glsl */ `
uniform float uTime, uIntensity;
varying vec2 vUv;
varying float vLife, vSeed;
${NOISE_GLSL}
${BLACKBODY_GLSL}
void main() {
  float n = vfxFbm(vec2(vUv.x * 3.0 + vSeed, vUv.y * 2.4 - uTime * 2.6 + vSeed));
  vec2 p = vUv - vec2(0.5, 0.32);
  p.x += (n - 0.5) * 0.4 * vUv.y;
  // A teardrop: wide and round at the bottom, licking to a point at the top
  float r = length(vec2(p.x * (1.5 + vUv.y * 2.2), p.y * 1.05));
  float body = 1.0 - smoothstep(0.16, 0.5, r + (n - 0.5) * 0.28);
  // Overlapping, mostly translucent tongues: together they make one body of fire, hottest low down
  float heat = body * (1.0 - vLife * 0.85) * (0.5 + 0.7 * n);
  float a = clamp(heat * 1.15, 0.0, 1.0) * smoothstep(0.0, 0.1, vLife) * uIntensity * 0.7;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vfxBlackbody(heat * 0.95 + (1.0 - vUv.y) * 0.15) * a * 1.25, a);
  #include <colorspace_fragment>
}`;

const SMOKE_VERT = /* glsl */ `
uniform float uTime, uIntensity, uWidth, uDepth, uHeight, uSmoke;
uniform vec2 uWind;
attribute vec4 aSeed;
varying vec2 vUv;
varying float vLife, vSeed;
void main() {
  float life = fract(uTime * (0.07 + aSeed.z * 0.07) + aSeed.w);
  vLife = life; vSeed = aSeed.x * 31.7 + aSeed.w * 3.1; vUv = uv;
  float rise = life * uSmoke;
  vec3 c = vec3(aSeed.x * uWidth * (0.8 + life * 2.0), uHeight * 0.75 + rise, aSeed.y * uDepth);
  // Turbulence: the column twists and billows, and leans with the wind as it climbs
  c.x += sin(uTime * 0.6 + aSeed.w * 30.0 + rise * 0.4) * (0.2 + life * 1.4);
  c.z += cos(uTime * 0.5 + aSeed.x * 25.0 + rise * 0.3) * (0.2 + life * 1.0);
  c.xz += uWind * rise * 0.6;
  vec4 mv = modelViewMatrix * vec4(c, 1.0);
  float size = (0.8 + life * 4.5) * (0.5 + 0.5 * uWidth);
  mv.xy += position.xy * size;
  gl_Position = projectionMatrix * mv;
}`;

const SMOKE_FRAG = /* glsl */ `
uniform float uTime, uIntensity, uDensity;
varying vec2 vUv;
varying float vLife, vSeed;
${NOISE_GLSL}
void main() {
  vec2 p = vUv - 0.5;
  float n = vfxFbm(vUv * 2.5 + vec2(vSeed, vSeed * 0.7 - uTime * 0.08));
  float puff = 1.0 - smoothstep(0.15, 0.5, length(p) + (n - 0.5) * 0.35);
  float a = puff * (0.35 + 0.65 * n) * smoothstep(0.0, 0.12, vLife) * (1.0 - vLife) * uDensity;
  if (a < 0.008) discard;
  // Sooty near the flames, greyer as it thins; lit orange from below while the fire burns
  vec3 col = mix(vec3(0.05, 0.045, 0.04), vec3(0.38, 0.37, 0.36), smoothstep(0.0, 0.8, vLife));
  col += vec3(1.0, 0.42, 0.12) * 0.55 * uIntensity * (1.0 - smoothstep(0.0, 0.25, vLife)) * n;
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;

const EMBER_VERT = /* glsl */ `
uniform float uTime, uIntensity, uWidth, uDepth, uHeight, uPixel;
uniform vec2 uWind;
attribute vec4 aSeed;
varying float vLife, vFlicker;
void main() {
  float life = fract(uTime * (0.25 + aSeed.z * 0.35) + aSeed.w);
  vLife = life;
  vFlicker = 0.6 + 0.4 * sin(uTime * 23.0 + aSeed.w * 50.0);
  float h = uHeight * (1.2 + aSeed.z * 1.6);
  float spin = aSeed.w * 40.0 + life * 7.0;
  vec3 c = vec3(aSeed.x * uWidth + sin(spin) * life * 0.7, life * h, aSeed.y * uDepth + cos(spin) * life * 0.7);
  c.xz += uWind * life * h * 0.5;
  vec4 mv = modelViewMatrix * vec4(c, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uPixel * (0.05 + aSeed.z * 0.05) * (1.0 - life) / max(0.5, -mv.z) * uIntensity;
}`;

const EMBER_FRAG = /* glsl */ `
varying float vLife, vFlicker;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = (1.0 - d * 2.0) * (1.0 - vLife) * vFlicker;
  gl_FragColor = vec4(mix(vec3(1.0, 0.85, 0.45), vec3(1.0, 0.35, 0.05), vLife) * a * 2.0, a);
  #include <colorspace_fragment>
}`;

const GLOW_FRAG = /* glsl */ `
uniform float uIntensity, uTime;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float flicker = 0.85 + 0.15 * sin(uTime * 13.0) * sin(uTime * 7.3);
  float a = (1.0 - smoothstep(0.0, 1.0, d)) * uIntensity * flicker * 0.55;
  gl_FragColor = vec4(vec3(1.0, 0.42, 0.12) * a, a);
  #include <colorspace_fragment>
}`;
const GLOW_VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const octaves = (n: number) => ({ OCTAVES: n });

export interface FireEffectProps {
  /** Where the base of the fire is. */
  position?: readonly [number, number, number];
  /** Which way the fire's front faces (a doorway's flames lick out of it). */
  facing?: number;
  kind?: FireKind;
  /** 0 (out) … 1 (fully alight). Fades smoothly towards the value it's given. */
  intensity: number;
  /** Larger or smaller than the kind's usual size. */
  scale?: number;
  /** Wind across the fire (x, z), metres per second-ish. */
  wind?: readonly [number, number];
  /** Report this fire's glow to the light rig (off for small fires that don't light a room). */
  light?: boolean;
  /** Draw the warm glow on the ground beneath it. */
  groundGlow?: boolean;
  /** Smoke at all (an extinguished fire smokes on while `intensity` is 0 if `smoulder` is set). */
  smoke?: boolean;
  /** 0 … 1: smoke that carries on after the flames are out. */
  smoulder?: number;
}

/** A fire of any kind: flames, smoke, embers, a glow on the ground and a share of the light rig. */
export function FireEffect({ position = [0, 0, 0], facing = 0, kind = 'building', intensity, scale = 1, wind = [0.25, 0.1], light = true, groundGlow = true, smoke = true, smoulder = 0.25 }: FireEffectProps) {
  const id = useId();
  const { budget } = useVfx();
  const preset = FIRE_PRESETS[kind];
  const group = useRef<Group>(null);
  const shown = useRef(intensity);
  const salt = useMemo(() => [...id].reduce((s, c) => s * 31 + c.charCodeAt(0), 7), [id]);

  const flameGeo = useMemo(() => quads(budget.flames, salt), [budget.flames, salt]);
  const smokeGeo = useMemo(() => quads(budget.smoke, salt + 1), [budget.smoke, salt]);
  const emberGeo = useMemo(() => points(budget.embers, salt + 2), [budget.embers, salt]);
  const flameMat = useMemo(() => new ShaderMaterial({
    uniforms: COMMON_UNIFORMS(), vertexShader: FLAME_VERT, fragmentShader: FLAME_FRAG, defines: octaves(budget.noiseOctaves),
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
  }), [budget.noiseOctaves]);
  const smokeMat = useMemo(() => new ShaderMaterial({
    uniforms: { ...COMMON_UNIFORMS(), uSmoke: { value: 10 }, uDensity: { value: 0.8 } }, vertexShader: SMOKE_VERT, fragmentShader: SMOKE_FRAG,
    defines: octaves(Math.min(2, budget.noiseOctaves)), transparent: true, depthWrite: false, blending: NormalBlending, side: DoubleSide,
  }), [budget.noiseOctaves]);
  const emberMat = useMemo(() => new ShaderMaterial({
    uniforms: { ...COMMON_UNIFORMS(), uPixel: { value: 600 } }, vertexShader: EMBER_VERT, fragmentShader: EMBER_FRAG,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  }), []);
  const glowMat = useMemo(() => new ShaderMaterial({
    uniforms: { uIntensity: { value: 1 }, uTime: { value: 0 } }, vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  }), []);
  useEffect(() => () => { [flameGeo, smokeGeo, emberGeo].forEach((g) => g.dispose()); }, [flameGeo, smokeGeo, emberGeo]);
  useEffect(() => () => { [flameMat, smokeMat, emberMat, glowMat].forEach((m) => m.dispose()); }, [flameMat, smokeMat, emberMat, glowMat]);
  useEffect(() => () => reportFireGlow(id, null), [id]);

  const world = useMemo(() => new Vector3(), []);
  const flameMesh = useRef<Mesh>(null);
  const smokeMesh = useRef<Mesh>(null);
  const emberPoints = useRef<Points>(null);
  const glowMesh = useRef<Mesh>(null);
  useFrame(({ clock, size }, dt) => {
    if (!flameMesh.current || !smokeMesh.current || !emberPoints.current) return;
    const flameM = flameMesh.current.material as ShaderMaterial, smokeM = smokeMesh.current.material as ShaderMaterial, emberM = emberPoints.current.material as ShaderMaterial;
    const flameG = flameMesh.current.geometry as InstancedBufferGeometry, smokeG = smokeMesh.current.geometry as InstancedBufferGeometry, emberG = emberPoints.current.geometry;
    // Ease towards the asked-for intensity, so a hose knocks it down over a moment, not in a frame
    shown.current += (intensity - shown.current) * Math.min(1, dt * 1.5);
    const k = Math.max(0, Math.min(1, shown.current));
    const t = clock.elapsedTime;
    const s = scale;
    for (const m of [flameM, smokeM, emberM]) {
      const u = m.uniforms;
      u.uTime.value = t;
      u.uIntensity.value = k;
      u.uWidth.value = preset.width * s;
      u.uDepth.value = preset.depth * s;
      u.uHeight.value = preset.height * s;
      u.uWind.value = wind;
    }
    smokeM.uniforms.uSmoke.value = preset.smoke * s * (0.4 + 0.6 * Math.max(k, smoulder));
    smokeM.uniforms.uDensity.value = Math.max(k, smoulder) * 0.85;
    smokeM.uniforms.uIntensity.value = k;
    emberM.uniforms.uPixel.value = size.height * 0.9;
    const glowM = glowMesh.current?.material as ShaderMaterial | undefined;
    if (glowM) { glowM.uniforms.uTime.value = t; glowM.uniforms.uIntensity.value = k; }
    flameG.instanceCount = scaledCount(budget.flames, k * s);
    smokeG.instanceCount = smoke ? scaledCount(budget.smoke, Math.max(k, smoulder)) : 0;
    emberG.setDrawRange(0, Math.round(budget.embers * k * preset.embers));
    if (light && group.current) {
      group.current.getWorldPosition(world);
      reportFireGlow(id, { x: world.x, y: world.y + preset.height * s * 0.5, z: world.z, intensity: k * s * (kind === 'small' ? 0.4 : 1) });
    }
  });

  return (
    <group ref={group} position={position as [number, number, number]} rotation={[0, facing, 0]}>
      <mesh ref={flameMesh} geometry={flameGeo} material={flameMat} frustumCulled={false} renderOrder={3} />
      <mesh ref={smokeMesh} geometry={smokeGeo} material={smokeMat} frustumCulled={false} renderOrder={2} />
      <points ref={emberPoints} geometry={emberGeo} material={emberMat} frustumCulled={false} renderOrder={4} />
      {groundGlow && (
        <mesh ref={glowMesh} material={glowMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, preset.depth * scale * 0.6]} renderOrder={1}>
          <planeGeometry args={[preset.width * scale * 2.6 + 1, preset.width * scale * 2.6 + 1]} />
        </mesh>
      )}
    </group>
  );
}

/**
 * The lights fires borrow: always mounted (so fires starting and stopping never recompile the
 * scene), moved each frame to the strongest fires, flickering; dark when nothing burns. The
 * number of lights follows the effects tier (none on Low).
 */
export function FireLightRig() {
  const { budget } = useVfx();
  const lights = useRef<(PointLight | null)[]>([]);
  const colour = useMemo(() => new Color('#ff7a2e'), []);
  useFrame(({ clock, camera }) => {
    const glows = brightestGlows(budget.fireLights, { x: camera.position.x, z: camera.position.z });
    const t = clock.elapsedTime;
    lights.current.forEach((l, i) => {
      if (!l) return;
      const g = glows[i];
      if (!g) { l.intensity = 0; return; }
      l.position.set(g.x, g.y, g.z);
      const flicker = 0.82 + 0.1 * Math.sin(t * 11 + i) + 0.08 * Math.sin(t * 23.7 + i * 2);
      l.intensity = 18 * g.intensity * flicker;
    });
  });
  return (
    <>
      {Array.from({ length: budget.fireLights }, (_, i) => (
        <pointLight key={i} ref={(l) => { lights.current[i] = l; }} color={colour} intensity={0} distance={16} decay={2} />
      ))}
    </>
  );
}
