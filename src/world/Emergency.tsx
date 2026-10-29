import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { carFootprint, parkedObstacles, roadBlockers } from '../lib/world';
import { AdditiveBlending, CanvasTexture, CatmullRomCurve3, Color, DoubleSide, MeshBasicMaterial, MeshStandardMaterial, Vector3, type Group, type Mesh } from 'three';

/**
 * Emergency vehicles and fire, built from simple shapes with flashing light
 * bars. Every light is an emissive or additive unlit material whose
 * brightness changes each frame: no real lights are added, so a scene with
 * flashing lights never makes the renderer recompile its shaders.
 */

export type ServiceKind = 'fire' | 'police' | 'ambulance';

// Shared materials, made once: the flashing changes their brightness, which never recompiles
const mat = {
  fireRed: new MeshStandardMaterial({ color: '#b3121b', roughness: 0.35, metalness: 0.35 }),
  white: new MeshStandardMaterial({ color: '#f1f1ee', roughness: 0.35, metalness: 0.3 }),
  black: new MeshStandardMaterial({ color: '#16181b', roughness: 0.4, metalness: 0.4 }),
  chrome: new MeshStandardMaterial({ color: '#c9ccd0', roughness: 0.2, metalness: 0.9 }),
  glass: new MeshStandardMaterial({ color: '#10161b', roughness: 0.08, metalness: 0.9 }),
  tyre: new MeshStandardMaterial({ color: '#141414', roughness: 0.9 }),
  stripeYellow: new MeshStandardMaterial({ color: '#f2c200', roughness: 0.4, emissive: '#3a2e00', emissiveIntensity: 0.4 }),
  stripeRed: new MeshStandardMaterial({ color: '#d0202a', roughness: 0.4 }),
  stripeBlue: new MeshStandardMaterial({ color: '#1f4fb3', roughness: 0.4 }),
  hose: new MeshStandardMaterial({ color: '#e1c14a', roughness: 0.7 }),
  red: new MeshBasicMaterial({ color: new Color('#ff2a2a'), toneMapped: false }),
  blue: new MeshBasicMaterial({ color: new Color('#2a6bff'), toneMapped: false }),
  amber: new MeshBasicMaterial({ color: new Color('#ffb02e'), toneMapped: false }),
  head: new MeshBasicMaterial({ color: new Color('#fff6dc'), toneMapped: false }),
};
const RED = new Color('#ff2a2a');
const BLUE = new Color('#2a6bff');
const DIM = new Color('#2a0707');
const DIM_BLUE = new Color('#070b2a');

/** Flashes the shared light materials: red and blue alternate in a double-pulse pattern. */
function useFlashing(on: boolean) {
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 2.2;
    const phase = t % 1;
    const pulse = (p: number) => (phase > p && phase < p + 0.12) || (phase > p + 0.2 && phase < p + 0.32);
    mat.red.color.copy(on && pulse(0) ? RED : DIM).multiplyScalar(on && pulse(0) ? 3 : 1);
    mat.blue.color.copy(on && pulse(0.5) ? BLUE : DIM_BLUE).multiplyScalar(on && pulse(0.5) ? 3 : 1);
  });
}

function Wheels({ w, xs }: { w: number; xs: readonly number[] }) {
  return (
    <>
      {[-1, 1].flatMap((sx) => xs.map((z) => (
        <mesh key={`${sx}${z}`} position={[sx * (w / 2 - 0.05), 0.48, z]} rotation={[0, 0, Math.PI / 2]} material={mat.tyre} castShadow>
          <cylinderGeometry args={[0.48, 0.48, 0.34, 16]} />
        </mesh>
      )))}
    </>
  );
}

function LightBar({ y, z, width }: { y: number; z: number; width: number }) {
  return (
    <group position={[0, y, z]}>
      <mesh material={mat.black}><boxGeometry args={[width, 0.08, 0.32]} /></mesh>
      <mesh position={[-width / 4, 0.09, 0]} material={mat.red}><boxGeometry args={[width / 2 - 0.04, 0.12, 0.26]} /></mesh>
      <mesh position={[width / 4, 0.09, 0]} material={mat.blue}><boxGeometry args={[width / 2 - 0.04, 0.12, 0.26]} /></mesh>
    </group>
  );
}

function Headlights({ w, z, y }: { w: number; z: number; y: number }) {
  return (
    <>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - 0.3), y, z]} material={mat.head}><boxGeometry args={[0.36, 0.18, 0.03]} /></mesh>
      ))}
    </>
  );
}

/** A pumper fire engine: cab, locker body, ladder on the roof, chevrons on the back. */
function FireEngine() {
  const w = 2.5;
  return (
    <group>
      {/* cab */}
      <mesh position={[0, 1.55, 3.05]} material={mat.fireRed} castShadow receiveShadow><boxGeometry args={[w, 2.1, 1.9]} /></mesh>
      <mesh position={[0, 2.0, 4.01]} material={mat.glass}><boxGeometry args={[w - 0.2, 0.85, 0.03]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * (w / 2 + 0.01), 2.0, 3.2]} material={mat.glass}><boxGeometry args={[0.02, 0.7, 1.1]} /></mesh>)}
      <mesh position={[0, 0.85, 4.04]} material={mat.chrome}><boxGeometry args={[w - 0.5, 0.45, 0.06]} /></mesh>
      <Headlights w={w} z={4.05} y={1.2} />
      {/* body with lockers */}
      <mesh position={[0, 1.6, -0.9]} material={mat.fireRed} castShadow receiveShadow><boxGeometry args={[w, 2.2, 6.0]} /></mesh>
      {[-1, 1].map((s) => [0.6, -0.9, -2.4].map((z) => (
        <mesh key={`${s}${z}`} position={[s * (w / 2 + 0.01), 1.7, z]} material={mat.chrome}><boxGeometry args={[0.02, 1.4, 1.3]} /></mesh>
      )))}
      {[-1, 1].map((s) => <mesh key={`st${s}`} position={[s * (w / 2 + 0.02), 0.78, 0.6]} material={mat.white}><boxGeometry args={[0.02, 0.14, 8.6]} /></mesh>)}
      {/* rear chevrons */}
      {[-1.0, -0.6, -0.2, 0.2, 0.6, 1.0].map((x, i) => (
        <mesh key={x} position={[x, 1.3, -3.91]} material={i % 2 ? mat.stripeYellow : mat.stripeRed}><boxGeometry args={[0.4, 1.6, 0.02]} /></mesh>
      ))}
      {/* ladder on the roof */}
      {[-0.45, 0.45].map((x) => <mesh key={x} position={[x, 2.85, -0.6]} material={mat.chrome}><boxGeometry args={[0.08, 0.1, 6.4]} /></mesh>)}
      {Array.from({ length: 13 }, (_, i) => <mesh key={i} position={[0, 2.85, -3.6 + i * 0.5]} material={mat.chrome}><boxGeometry args={[0.9, 0.05, 0.05]} /></mesh>)}
      <LightBar y={2.66} z={3.3} width={2.0} />
      <Wheels w={w} xs={[2.9, -1.6, -2.9]} />
    </group>
  );
}

/** A patrol car: black and white, "POLICE" band, light bar. */
function PoliceCar() {
  const w = 1.9;
  return (
    <group>
      <mesh position={[0, 0.66, 0]} material={mat.white} castShadow receiveShadow><boxGeometry args={[w, 0.66, 4.7]} /></mesh>
      <mesh position={[0, 0.66, 1.65]} material={mat.black} castShadow><boxGeometry args={[w + 0.01, 0.67, 1.4]} /></mesh>
      <mesh position={[0, 0.66, -1.75]} material={mat.black} castShadow><boxGeometry args={[w + 0.01, 0.67, 1.2]} /></mesh>
      <mesh position={[0, 1.25, -0.2]} material={mat.glass} castShadow><boxGeometry args={[w - 0.12, 0.52, 2.3]} /></mesh>
      <mesh position={[0, 1.52, -0.2]} material={mat.white}><boxGeometry args={[w - 0.1, 0.05, 2.4]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * (w / 2 + 0.01), 0.72, 0]} material={mat.stripeBlue}><boxGeometry args={[0.02, 0.12, 2.0]} /></mesh>)}
      <LightBar y={1.6} z={-0.1} width={1.3} />
      <Headlights w={w} z={2.36} y={0.72} />
      <Wheels w={w} xs={[1.45, -1.45]} />
    </group>
  );
}

/** An ambulance: white box body, red and yellow chequer, light bars front and back. */
function Ambulance() {
  const w = 2.2;
  return (
    <group>
      <mesh position={[0, 1.05, 2.25]} material={mat.white} castShadow receiveShadow><boxGeometry args={[w, 1.3, 1.5]} /></mesh>
      <mesh position={[0, 1.4, 3.01]} material={mat.glass}><boxGeometry args={[w - 0.25, 0.55, 0.03]} /></mesh>
      <mesh position={[0, 1.5, -0.75]} material={mat.white} castShadow receiveShadow><boxGeometry args={[w + 0.1, 2.2, 4.5]} /></mesh>
      {[-1, 1].map((s) => Array.from({ length: 9 }, (_, i) => (
        <mesh key={`${s}${i}`} position={[s * (w / 2 + 0.06), 0.95, -2.75 + i * 0.5]} material={i % 2 ? mat.stripeYellow : mat.stripeRed}><boxGeometry args={[0.02, 0.32, 0.5]} /></mesh>
      )))}
      {[-1, 1].map((s) => <mesh key={`x${s}`} position={[s * (w / 2 + 0.07), 1.75, -0.9]} material={mat.stripeRed}><boxGeometry args={[0.02, 0.5, 0.16]} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={`y${s}`} position={[s * (w / 2 + 0.07), 1.75, -0.9]} material={mat.stripeRed}><boxGeometry args={[0.02, 0.16, 0.5]} /></mesh>)}
      <LightBar y={1.8} z={1.8} width={1.6} />
      <LightBar y={2.62} z={-2.85} width={1.8} />
      <Headlights w={w} z={3.02} y={0.85} />
      <Wheels w={w} xs={[2.1, -2.0]} />
    </group>
  );
}

/** One emergency vehicle, lights flashing while `lights` is on. Forward is +z, turned by `heading`. */
const LENGTH: Record<ServiceKind, number> = { fire: 8.2, police: 4.8, ambulance: 6.2 };
const WIDTH: Record<ServiceKind, number> = { fire: 2.6, police: 1.95, ambulance: 2.35 };

export function EmergencyVehicle({ kind, position, heading, lights = true }: { kind: ServiceKind; position: readonly [number, number, number]; heading: number; lights?: boolean }) {
  useFlashing(lights);
  // Solid while it's there: you walk round it, and traffic queues behind it
  const [x, , z] = position;
  useEffect(() => {
    const box = carFootprint(x, z, heading, LENGTH[kind], WIDTH[kind]);
    const half = LENGTH[kind] / 2;
    const stops = [-half, 0, half].map((d) => ({ x: x + Math.sin(heading) * d, z: z + Math.cos(heading) * d }));
    parkedObstacles.push(box);
    roadBlockers.push(...stops);
    return () => {
      parkedObstacles.splice(parkedObstacles.indexOf(box), 1);
      for (const s of stops) roadBlockers.splice(roadBlockers.indexOf(s), 1);
    };
  }, [x, z, heading, kind]);
  return (
    <group position={position} rotation={[0, heading, 0]}>
      {kind === 'fire' ? <FireEngine /> : kind === 'police' ? <PoliceCar /> : <Ambulance />}
    </group>
  );
}

/** A soft round blob, bright in the middle and clear at the edge: what flames and smoke puffs are drawn with. */
let softTexture: CanvasTexture | null = null;
function soft(): CanvasTexture | null {
  if (softTexture || typeof document === 'undefined') return softTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (!g) return null;
  const grad = g.createRadialGradient(32, 36, 2, 32, 32, 31);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  softTexture = new CanvasTexture(c);
  return softTexture;
}

const FLAME_COUNT = 30;
const SMOKE_COUNT = 18;

/**
 * Flames licking out of a doorway and window, and a column of smoke rising
 * and spreading. `strength` (0 … 1) shrinks the fire as it is put out.
 * Additive unlit flames and transparent smoke: no lights.
 */
export function Fire({ at, facing, strength }: { at: readonly [number, number, number]; facing: number; strength: number }) {
  const flames = useRef<(Mesh | null)[]>([]);
  const smoke = useRef<(Mesh | null)[]>([]);
  const flameMat = useMemo(() => Array.from({ length: 3 }, (_, i) => new MeshBasicMaterial({ color: new Color(['#ff5a12', '#ff9a1f', '#ffd25a'][i]), map: soft(), transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false })), []);
  const smokeMat = useMemo(() => new MeshBasicMaterial({ color: '#3a3836', map: soft(), transparent: true, opacity: 0.55, depthWrite: false, side: DoubleSide }), []);
  const seeds = useMemo(() => Array.from({ length: Math.max(FLAME_COUNT, SMOKE_COUNT) }, (_, i) => ({ x: ((i * 37) % 11) / 11 - 0.5, phase: (i * 0.61) % 1, speed: 0.7 + ((i * 13) % 7) * 0.08 })), []);
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    const k = Math.max(0, Math.min(1, strength));
    flames.current.forEach((m, i) => {
      if (!m) return;
      const s = seeds[i];
      const life = (t * s.speed * 1.6 + s.phase) % 1;
      const window = i % 3 === 0;
      m.visible = k > 0.02;
      m.position.set(s.x * (window ? 2.4 : 2.8), (window ? 3.3 : 0.2) + life * 2.6 * k, 0.25 + Math.sin(t * 7 + i) * 0.08 + life * 0.4);
      const size = (1 - life * 0.6) * (0.9 + 1.4 * k) * (window ? 1.1 : 1.5);
      m.scale.set(size, size * 1.9, 1);
      (m.material as MeshBasicMaterial).opacity = 0.9 * k * (1 - life * 0.6);
    });
    smoke.current.forEach((m, i) => {
      if (!m) return;
      const s = seeds[i];
      const life = (t * 0.12 * s.speed + s.phase) % 1;
      m.visible = k > 0.02 || life < 0.6;
      m.position.set(s.x * 2.5 + life * 2, 3.5 + life * 16, 0.8 + life * 3.5);
      m.scale.setScalar(1.2 + life * 5.5);
      m.lookAt(camera.position);
      smokeMat.opacity = 0.75 * Math.max(0.3, k);
    });
  });
  return (
    <group position={at} rotation={[0, facing, 0]}>
      {Array.from({ length: FLAME_COUNT }, (_, i) => (
        <mesh key={i} ref={(m) => { flames.current[i] = m; }} material={flameMat[i % 3]}>
          <planeGeometry args={[0.6, 0.6]} />
        </mesh>
      ))}
      {Array.from({ length: SMOKE_COUNT }, (_, i) => (
        <mesh key={`s${i}`} ref={(m) => { smoke.current[i] = m; }} material={smokeMat}>
          <planeGeometry args={[1.4, 1.4]} />
        </mesh>
      ))}
      {/* glowing doorway and window, and the soot stain above them */}
      <mesh position={[0, 1.2, 0.04]} material={doorGlow} scale={[1, Math.max(0.2, strength), 1]}><planeGeometry args={[2.2, 2.4]} /></mesh>
      <mesh position={[0, 3.6, 0.04]} material={doorGlow} scale={[1, Math.max(0.2, strength), 1]}><planeGeometry args={[2.0, 1.4]} /></mesh>
      <mesh position={[0, 5.5, 0.03]} material={soot}><planeGeometry args={[3.6, 5.5]} /></mesh>
    </group>
  );
}

/**
 * A hose from the engine to the nozzle, and the jet of water arcing onto the
 * fire. Water droplets are additive streaks; the hose is a tube.
 */
export function HoseAndWater({ from, nozzle, target, spraying }: { from: readonly [number, number, number]; nozzle: readonly [number, number, number]; target: readonly [number, number, number]; spraying: boolean }) {
  const hose = useMemo(() => {
    const mid = new Vector3((from[0] + nozzle[0]) / 2 + 0.8, 0.06, (from[2] + nozzle[2]) / 2 - 0.6);
    return new CatmullRomCurve3([new Vector3(from[0], 0.4, from[2]), new Vector3(from[0], 0.06, from[2] + 0.4), mid, new Vector3(nozzle[0], 0.06, nozzle[2] - 0.3), new Vector3(...nozzle)]);
  }, [from, nozzle]);
  const drops = useRef<Group>(null);
  const dropMat = useMemo(() => new MeshBasicMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false, toneMapped: false }), []);
  const DROPS = 26;
  useFrame(({ clock }) => {
    const g = drops.current;
    if (!g) return;
    g.visible = spraying;
    if (!spraying) return;
    const t = clock.elapsedTime;
    g.children.forEach((c, i) => {
      const u = (t * 1.3 + i / DROPS) % 1;
      // A parabola from the nozzle to the target
      const x = nozzle[0] + (target[0] - nozzle[0]) * u;
      const z = nozzle[2] + (target[2] - nozzle[2]) * u;
      const y = nozzle[1] + (target[1] - nozzle[1]) * u + Math.sin(u * Math.PI) * 2.2;
      c.position.set(x + Math.sin(i * 5.1) * 0.08 * u, y, z + Math.cos(i * 3.7) * 0.08 * u);
      c.scale.setScalar(0.6 + u * 1.4);
    });
  });
  return (
    <group>
      <mesh material={mat.hose} castShadow>
        <tubeGeometry args={[hose, 40, 0.06, 6, false]} />
      </mesh>
      <group ref={drops} visible={false}>
        {Array.from({ length: DROPS }, (_, i) => (
          <mesh key={i} material={dropMat}><sphereGeometry args={[0.09, 6, 4]} /></mesh>
        ))}
      </group>
    </group>
  );
}

/** A traffic cone. */
export function Cone({ at }: { at: readonly [number, number, number] }) {
  return (
    <group position={at}>
      <mesh position={[0, 0.3, 0]} material={coneMat} castShadow><coneGeometry args={[0.18, 0.6, 12]} /></mesh>
      <mesh position={[0, 0.34, 0]} material={mat.white}><cylinderGeometry args={[0.105, 0.125, 0.09, 12]} /></mesh>
      <mesh position={[0, 0.02, 0]} material={coneMat}><boxGeometry args={[0.42, 0.04, 0.42]} /></mesh>
    </group>
  );
}
const doorGlow = new MeshBasicMaterial({ color: new Color('#ff7a1a'), transparent: true, opacity: 0.85, toneMapped: false });
const soot = new MeshBasicMaterial({ color: '#0b0a09', transparent: true, opacity: 0.6, depthWrite: false });
const coneMat = new MeshStandardMaterial({ color: '#ff6a12', roughness: 0.6 });

/** Striped tape between posts, around a scene. */
export function Cordon({ points }: { points: readonly (readonly [number, number])[] }) {
  return (
    <group>
      {points.map(([x, z], i) => {
        const next = points[(i + 1) % points.length];
        const len = Math.hypot(next[0] - x, next[1] - z);
        const ang = Math.atan2(next[0] - x, next[1] - z);
        return (
          <group key={i}>
            <mesh position={[x, 0.5, z]} material={mat.black} castShadow><cylinderGeometry args={[0.04, 0.05, 1, 8]} /></mesh>
            <mesh position={[(x + next[0]) / 2, 0.92, (z + next[1]) / 2]} rotation={[0, ang, 0]} material={mat.stripeYellow}><boxGeometry args={[0.02, 0.08, len]} /></mesh>
          </group>
        );
      })}
    </group>
  );
}
