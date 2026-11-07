/**
 * Water in motion: a ballistic spray that every jet, splash and powder cloud is built from (each
 * droplet's flight worked out in its vertex shader from the time: one draw call, no CPU work per
 * droplet), mist and steam, the firefighters' hose, the waterfall, and puddles on a wet street.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, DoubleSide, InstancedBufferAttribute, InstancedBufferGeometry,
  MeshStandardMaterial, NormalBlending, PlaneGeometry, ShaderMaterial, TubeGeometry, Vector3, type Group, type Mesh, type Points,
} from 'three';
import { NOISE_GLSL } from './glsl';
import { useVfx } from './useVfxTier';
import { WaterSurface } from './WaterSurface';
import type { Puddle } from './waterModel';
import { GRAVITY, ballisticPoint, ballisticVelocity } from './ballistics';

function seeded(count: number, salt: number): Float32Array {
  const out = new Float32Array(count * 4);
  let s = (salt * 2246822519) >>> 0;
  for (let i = 0; i < out.length; i++) { s = (Math.imul(s ^ (s >>> 13), 0x5bd1e995) + 0x27d4eb2d) >>> 0; out[i] = s / 4294967296; }
  return out;
}

const SPRAY_VERT = /* glsl */ `
uniform float uTime, uLife, uSpread, uGravity, uSize, uPixel, uOn;
uniform vec3 uOrigin, uVelocity;
attribute vec4 aSeed;
varying float vAge, vSeed;
void main() {
  float age = fract(uTime / uLife + aSeed.w);
  vAge = age; vSeed = aSeed.x;
  float t = age * uLife;
  // A random direction in a cone round the mean velocity
  float th = aSeed.x * 6.2831853, ph = acos(1.0 - 2.0 * aSeed.y);
  vec3 jitter = vec3(sin(ph) * cos(th), cos(ph), sin(ph) * sin(th));
  vec3 v = uVelocity * (0.85 + aSeed.z * 0.3) + jitter * uSpread * length(uVelocity + vec3(0.001));
  vec3 p = uOrigin + v * t + vec3(0.0, -0.5 * uGravity * t * t, 0.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uOn * uPixel * uSize * (0.6 + aSeed.z * 0.8) * (0.4 + age) / max(0.5, -mv.z);
}`;

const SPRAY_FRAG = /* glsl */ `
uniform vec3 uColour;
uniform float uOpacity, uSoft;
varying float vAge, vSeed;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  if (d > 1.0) discard;
  // Droplets: a bright rim and a clear centre; powder and mist: a soft puff
  float drop = smoothstep(1.0, 0.7, d) * (0.45 + 0.55 * smoothstep(0.2, 0.85, d));
  float puff = 1.0 - d * d;
  float a = mix(drop, puff, uSoft) * (1.0 - vAge) * smoothstep(0.0, 0.05, vAge) * uOpacity;
  gl_FragColor = vec4(uColour * (1.0 + (1.0 - uSoft) * 0.4), a);
  #include <colorspace_fragment>
}`;

export interface SprayProps {
  origin: readonly [number, number, number];
  velocity: readonly [number, number, number];
  /** Seconds each droplet flies before it's spent. */
  life?: number;
  /** How wide the spray fans out (0 a pencil jet … 1 everywhere). */
  spread?: number;
  /** Gravity's pull: 1 for water, less for powder or mist. */
  gravity?: number;
  /** Droplet size in metres-ish. */
  size?: number;
  colour?: string;
  opacity?: number;
  /** 0 droplets … 1 soft puffs. */
  soft?: number;
  /** Share of the effects tier's droplet budget. */
  share?: number;
  active?: boolean;
  additive?: boolean;
}

/** A spray of droplets or powder: jets, splashes, an extinguisher's cloud, a fountain. */
export function Spray({ origin, velocity, life = 1, spread = 0.08, gravity = 1, size = 0.05, colour = '#d8ecff', opacity = 0.8, soft = 0, share = 1, active = true, additive = false }: SprayProps) {
  const { budget } = useVfx();
  const count = Math.max(4, Math.round(budget.droplets * share));
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aSeed', new BufferAttribute(seeded(count, count * 7 + Math.round(size * 1000)), 4));
    return g;
  }, [count, size]);
  const material = useMemo(() => new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uLife: { value: life }, uSpread: { value: spread }, uGravity: { value: GRAVITY * gravity }, uSize: { value: size },
      uPixel: { value: 600 }, uOn: { value: 1 }, uOrigin: { value: new Vector3() }, uVelocity: { value: new Vector3() },
      uColour: { value: new Color(colour) }, uOpacity: { value: opacity }, uSoft: { value: soft },
    },
    vertexShader: SPRAY_VERT, fragmentShader: SPRAY_FRAG, transparent: true, depthWrite: false,
    blending: additive ? AdditiveBlending : NormalBlending,
  }), [additive]); // eslint-disable-line react-hooks/exhaustive-deps -- the rest are uniforms, set each frame
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  const on = useRef(active ? 1 : 0);
  const pts = useRef<Points>(null);
  useFrame(({ clock, size: viewport }, dt) => {
    if (!pts.current) return;
    const u = (pts.current.material as ShaderMaterial).uniforms;
    on.current += ((active ? 1 : 0) - on.current) * Math.min(1, dt * 5);
    u.uTime.value = clock.elapsedTime;
    u.uOn.value = on.current;
    u.uOrigin.value.set(...origin);
    u.uVelocity.value.set(...velocity);
    u.uLife.value = life; u.uSpread.value = spread; u.uGravity.value = GRAVITY * gravity; u.uSize.value = size;
    u.uPixel.value = viewport.height * 0.9;
    u.uColour.value.set(colour); u.uOpacity.value = opacity; u.uSoft.value = soft;
  });
  return <points ref={pts} geometry={geometry} material={material} frustumCulled={false} renderOrder={5} />;
}

const MIST_VERT = /* glsl */ `
uniform float uTime, uRadius, uRise;
attribute vec4 aSeed;
varying vec2 vUv;
varying float vLife, vSeed;
void main() {
  float life = fract(uTime * (0.12 + aSeed.z * 0.1) + aSeed.w);
  vLife = life; vSeed = aSeed.x * 17.0; vUv = uv;
  vec3 c = vec3((aSeed.x - 0.5) * uRadius * (1.0 + life), life * uRise, (aSeed.y - 0.5) * uRadius * (1.0 + life));
  c.x += sin(uTime * 0.7 + aSeed.w * 20.0) * 0.3 * life;
  vec4 mv = modelViewMatrix * vec4(c, 1.0);
  mv.xy += position.xy * (0.6 + life * 2.2) * uRadius * 0.5;
  gl_Position = projectionMatrix * mv;
}`;
const MIST_FRAG = /* glsl */ `
uniform float uTime, uDensity;
uniform vec3 uColour;
varying vec2 vUv;
varying float vLife, vSeed;
${NOISE_GLSL}
void main() {
  float n = vfxFbm(vUv * 2.0 + vec2(vSeed, -uTime * 0.1));
  float a = (1.0 - smoothstep(0.1, 0.5, length(vUv - 0.5) + (n - 0.5) * 0.3)) * (1.0 - vLife) * smoothstep(0.0, 0.15, vLife) * uDensity;
  if (a < 0.005) discard;
  gl_FragColor = vec4(uColour, a);
  #include <colorspace_fragment>
}`;

/** Mist or steam: soft white clouds rising and thinning (spray off a waterfall, steam off a doused fire). */
export function Mist({ position, radius = 1.2, rise = 2, density = 0.35, colour = '#eef3f5', count = 10 }: {
  position: readonly [number, number, number]; radius?: number; rise?: number; density?: number; colour?: string; count?: number;
}) {
  const { budget } = useVfx();
  const n = Math.max(3, Math.round(count * (budget.noiseOctaves / 3 + 0.34)));
  const geometry = useMemo(() => {
    const g = new InstancedBufferGeometry();
    const q = new PlaneGeometry(1, 1);
    g.index = q.index;
    g.setAttribute('position', q.getAttribute('position'));
    g.setAttribute('uv', q.getAttribute('uv'));
    g.setAttribute('aSeed', new InstancedBufferAttribute(seeded(n, n * 13 + 5), 4));
    g.instanceCount = n;
    return g;
  }, [n]);
  const material = useMemo(() => new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uRadius: { value: radius }, uRise: { value: rise }, uDensity: { value: density }, uColour: { value: new Color(colour) } },
    vertexShader: MIST_VERT, fragmentShader: MIST_FRAG, defines: { OCTAVES: Math.min(2, budget.noiseOctaves) },
    transparent: true, depthWrite: false, side: DoubleSide,
  }), [budget.noiseOctaves]); // eslint-disable-line react-hooks/exhaustive-deps -- the rest are uniforms
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  const mesh = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const u = (mesh.current.material as ShaderMaterial).uniforms;
    u.uTime.value = clock.elapsedTime; u.uRadius.value = radius; u.uRise.value = rise; u.uDensity.value = density;
  });
  return <mesh ref={mesh} position={position as [number, number, number]} geometry={geometry} material={material} frustumCulled={false} renderOrder={4} />;
}

const JET_VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const JET_FRAG = /* glsl */ `
uniform float uTime, uOn;
varying vec2 vUv;
${NOISE_GLSL}
void main() {
  // Streaks rushing along the jet, breaking up towards its end
  float n = vfxFbm(vec2(vUv.x * 14.0 - uTime * 9.0, vUv.y * 5.0));
  float breakup = smoothstep(0.55, 1.0, vUv.x);
  float a = (0.35 + 0.65 * n) * (1.0 - breakup * (1.0 - n) * 1.4) * uOn;
  a *= smoothstep(0.0, 0.04, vUv.x);
  if (a < 0.02) discard;
  gl_FragColor = vec4(mix(vec3(0.7, 0.85, 0.95), vec3(1.0), n) * a, a * 0.75);
  #include <colorspace_fragment>
}`;

/**
 * A firefighter's hose: the hose snaking over the ground, the jet arcing from the nozzle onto its
 * target (the same ballistic path as its droplets), spray coming off it, a splash where it lands
 * and steam where it meets the fire.
 */
export function HoseStream({ from, nozzle, target, spraying, steam = 0, hose = true }: {
  /** Where the hose leaves the engine. */
  from?: readonly [number, number, number];
  nozzle: readonly [number, number, number];
  target: readonly [number, number, number];
  spraying: boolean;
  /** 0 … 1: how much fire the water is hitting (steam). */
  steam?: number;
  /** Draw the hose itself (off for a hand-held extinguisher test). */
  hose?: boolean;
}) {
  const flight = 0.75;
  const velocity = useMemo(() => ballisticVelocity(nozzle, target, flight), [nozzle, target]);
  const jet = useMemo(() => {
    const pts = Array.from({ length: 14 }, (_, i) => new Vector3(...ballisticPoint(nozzle, velocity, (flight * i) / 13)));
    return new TubeGeometry(new CatmullRomCurve3(pts), 40, 0.045, 6, false);
  }, [nozzle, velocity]);
  const hoseGeo = useMemo(() => {
    if (!from || !hose) return null;
    const mid = new Vector3((from[0] + nozzle[0]) / 2 + 0.8, 0.06, (from[2] + nozzle[2]) / 2 - 0.6);
    return new TubeGeometry(new CatmullRomCurve3([new Vector3(from[0], 0.4, from[2]), new Vector3(from[0], 0.06, from[2] + 0.4), mid, new Vector3(nozzle[0], 0.06, nozzle[2] - 0.3), new Vector3(...nozzle)]), 40, 0.06, 6, false);
  }, [from, nozzle, hose]);
  const hoseMat = useMemo(() => new MeshStandardMaterial({ color: '#b0281f', roughness: 0.55 }), []);
  const jetMat = useMemo(() => new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 } }, vertexShader: JET_VERT, fragmentShader: JET_FRAG, defines: { OCTAVES: 2 },
    transparent: true, depthWrite: false, blending: NormalBlending, side: DoubleSide,
  }), []);
  useEffect(() => () => { jet.dispose(); hoseGeo?.dispose(); jetMat.dispose(); hoseMat.dispose(); }, [jet, hoseGeo, jetMat, hoseMat]);
  const on = useRef(0);
  const jetMesh = useRef<Mesh>(null);
  useFrame(({ clock }, dt) => {
    on.current += ((spraying ? 1 : 0) - on.current) * Math.min(1, dt * 4);
    const u = (jetMesh.current?.material as ShaderMaterial | undefined)?.uniforms;
    if (u) { u.uTime.value = clock.elapsedTime; u.uOn.value = on.current; }
  });
  const splashVel = useMemo<[number, number, number]>(() => [-velocity[0] * 0.15, 2.4, -velocity[2] * 0.15], [velocity]);
  return (
    <group>
      {hoseGeo && <mesh geometry={hoseGeo} material={hoseMat} castShadow />}
      <mesh ref={jetMesh} geometry={jet} material={jetMat} frustumCulled={false} renderOrder={5} />
      <Spray origin={nozzle} velocity={velocity} life={flight} spread={0.035} size={0.05} share={0.6} active={spraying} />
      <Spray origin={target} velocity={splashVel} life={0.6} spread={0.7} size={0.06} share={0.4} active={spraying} />
      {spraying && steam > 0.02 && <Mist position={target} radius={1.0} rise={3.5} density={0.45 * steam} colour="#f4f6f7" count={8} />}
    </group>
  );
}

/** A hand-held extinguisher's cloud: dense white powder blasting out and drifting down. */
export function ExtinguisherSpray({ nozzle, direction, active }: { nozzle: readonly [number, number, number]; direction: readonly [number, number, number]; active: boolean }) {
  const v = useMemo<[number, number, number]>(() => { const l = Math.hypot(...direction) || 1; return [direction[0] / l * 6, direction[1] / l * 6 + 0.5, direction[2] / l * 6]; }, [direction]);
  return <Spray origin={nozzle} velocity={v} life={0.55} spread={0.22} gravity={0.25} size={0.32} colour="#f2f2ee" opacity={0.55} soft={1} share={0.8} active={active} />;
}

const FALL_VERT = /* glsl */ `varying vec2 vUv; varying vec3 vN; void main() { vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FALL_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uDeep;
varying vec2 vUv;
varying vec3 vN;
${NOISE_GLSL}
void main() {
  // Falling sheets of water: streaks pouring down, quickening as they fall, whiter where they break up
  float speed = 1.6 + (1.0 - vUv.y) * 2.4;
  float n = vfxFbm(vec2(vUv.x * 18.0, vUv.y * 2.5 + uTime * speed));
  float m = vfxFbm(vec2(vUv.x * 7.0 + 3.0, vUv.y * 1.2 + uTime * speed * 0.6));
  float white = smoothstep(0.45, 0.85, n * 0.7 + m * 0.5 + (1.0 - vUv.y) * 0.25);
  float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(0.0, 0.08, 1.0 - vUv.x);
  float lip = smoothstep(1.0, 0.94, vUv.y);
  float a = (0.55 + 0.45 * n) * edge * lip;
  if (a < 0.03) discard;
  vec3 col = mix(uDeep, vec3(0.95, 0.98, 1.0), white);
  // A sheen where the sheet faces the light
  col += pow(max(0.0, vN.z), 6.0) * 0.12;
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;

/**
 * A waterfall: a curving sheet pouring over a lip, white water where it breaks up, a splash and
 * mist where it lands, and a churning pool below.
 */
export function Waterfall({ position = [0, 0, 0], width = 3, height = 4, poolSize = [6, 4] }: {
  position?: readonly [number, number, number]; width?: number; height?: number; poolSize?: readonly [number, number];
}) {
  const sheet = useMemo(() => {
    // Curving out from the lip and dropping: bend the plane along its height
    const g = new PlaneGeometry(width, height, 8, 24);
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const fall = (height / 2 - y) / height;
      pos.setZ(i, Math.sin(Math.min(1, fall * 3) * Math.PI / 2) * 0.6 + fall * 0.2);
    }
    g.computeVertexNormals();
    return g;
  }, [width, height]);
  const material = useMemo(() => new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDeep: { value: new Color('#4f8f9c') } }, vertexShader: FALL_VERT, fragmentShader: FALL_FRAG,
    defines: { OCTAVES: 2 }, transparent: true, depthWrite: false, side: DoubleSide,
  }), []);
  useEffect(() => () => { sheet.dispose(); material.dispose(); }, [sheet, material]);
  const fall = useRef<Mesh>(null);
  useFrame(({ clock }) => { const u = (fall.current?.material as ShaderMaterial | undefined)?.uniforms; if (u) u.uTime.value = clock.elapsedTime; });
  const [x, y, z] = position;
  const base: [number, number, number] = [x, y + 0.05, z + 0.8];
  return (
    <group>
      <mesh ref={fall} geometry={sheet} material={material} position={[x, y + height / 2, z]} renderOrder={3} />
      <Spray origin={base} velocity={[0, 3, 0.6]} life={0.9} spread={0.55} size={0.07} share={0.7} />
      <Mist position={base} radius={width * 0.6} rise={2.5} density={0.32} count={12} />
      <WaterSurface kind="river" position={[x, y, z + poolSize[1] / 2]} size={poolSize} flow={[0, 0.8]} edgeFoam={0.12} colour="#1f4a4a" />
    </group>
  );
}

/**
 * Puddles on a wet street, gathering as rain falls (`wetness` 0 … 1 grows them) and rippling
 * under the drops. Positions from vfx/waterModel.ts puddleSpots.
 */
export function Puddles({ spots, wetness, rain }: { spots: readonly Puddle[]; wetness: number; rain: number }) {
  const { budget } = useVfx();
  const group = useRef<Group>(null);
  const shown = spots.slice(0, budget.puddles);
  if (wetness < 0.03) return null;
  return (
    <group ref={group}>
      {shown.map((p, i) => (
        <group key={i} position={[p.x, 0.016 + i * 0.0004, p.z]} rotation={[0, p.rot, 0]} scale={[0.3 + 0.7 * wetness, 1, 0.3 + 0.7 * wetness]}>
          <WaterSurface kind="puddle" size={[p.rx * 2, p.rz * 2]} rain={rain} />
        </group>
      ))}
    </group>
  );
}
