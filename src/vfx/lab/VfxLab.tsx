/**
 * The effects lab: every fire and water effect side by side, live, with the controls to try them.
 *
 * Fire:
 * - a shopfront whose windows catch one from another (vfx/fireModel.ts);
 * - a burning car;
 * - a bin fire to put out with an extinguisher;
 * - a hose that knocks the shop fire down where it aims.
 *
 * Water:
 * - a swimming pool you can touch for ripples;
 * - a river fed by a waterfall;
 * - the sea breaking on a beach;
 * - puddles that gather while it rains.
 *
 * The quality switch shows Low, Medium and High at once. Opened at /vfx.html; reads and writes no
 * save data.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { MeshStandardMaterial } from 'three';
import { assetUrl } from '../../lib/assetManifest';
import { FireEffect, FireLightRig } from '../FireEffect';
import { WaterSurface, SwimmingPool } from '../WaterSurface';
import { ExtinguisherSpray, HoseStream, Puddles, Waterfall } from '../WaterFx';
import { VfxTierContext } from '../useVfxTier';
import { VFX_TIERS, VFX_TIER_LABEL, type VfxTier } from '../vfxQuality';
import { burningCount, fieldIntensity, fireField, ignite, stepField, type FireField } from '../fireModel';
import { puddleSpots, stepWetness } from '../waterModel';
import { Rain } from '../../world/Rain';

// The shopfront: a grid of windows (4 across, 3 floors); the ground floor's shop is most flammable
const COLS = 4, ROWS = 3;
const FACADE = { x: -9, z: -6, width: 8, floor: 3 };
const windowAt = (c: number, r: number): [number, number, number] => [FACADE.x - FACADE.width / 2 + 1 + c * 2, 0.4 + r * FACADE.floor, FACADE.z + 0.35];
const newFacade = () => ignite(fireField(COLS, ROWS, (c, r) => (r === 0 ? 0.95 : c === 3 ? 0 : 0.7)), 1, 0, 0.6);

interface LabState { hose: boolean; extinguisher: boolean; rain: boolean; carFire: number; binFire: number }

/** Runs the fire rules each frame and draws a flame in every window that's alight. */
function Facade({ field, setField, hose }: { field: FireField; setField: (f: FireField) => void; hose: boolean }) {
  const acc = useRef(0);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.1) return;
    // The hose aims at the ground-floor shop, and its water reaches the windows near it
    const water = (c: number, r: number) => (hose ? Math.max(0, 1 - Math.hypot(c - 1.2, r * 1.5) * 0.35) : 0);
    setField(stepField(field, acc.current, water));
    acc.current = 0;
  });
  const wall = useMemo(() => new MeshStandardMaterial({ color: '#8a7f73', roughness: 0.9 }), []);
  const glass = useMemo(() => new MeshStandardMaterial({ color: '#1b2226', roughness: 0.15, metalness: 0.6 }), []);
  return (
    <group>
      <mesh material={wall} position={[FACADE.x, ROWS * FACADE.floor / 2, FACADE.z - 1]} castShadow receiveShadow><boxGeometry args={[FACADE.width + 1, ROWS * FACADE.floor, 2]} /></mesh>
      {field.cells.map((cell, i) => {
        const c = i % COLS, r = Math.floor(i / COLS);
        const [x, y, z] = windowAt(c, r);
        return (
          <group key={i}>
            <mesh material={glass} position={[x, y + 1.1, z - 0.33]}><planeGeometry args={[1.4, r === 0 ? 2.2 : 1.6]} /></mesh>
            {cell.intensity > 0.01 && <FireEffect kind={r === 0 ? 'building' : 'small'} position={[x, y, z]} intensity={cell.intensity} scale={r === 0 ? 0.6 : 1.4} light={r === 0} groundGlow={r === 0} />}
          </group>
        );
      })}
    </group>
  );
}

function Car({ position }: { position: [number, number, number] }) {
  const body = useMemo(() => new MeshStandardMaterial({ color: '#2b3540', roughness: 0.5, metalness: 0.4 }), []);
  const charred = useMemo(() => new MeshStandardMaterial({ color: '#151311', roughness: 1 }), []);
  return (
    <group position={position}>
      <mesh material={body} position={[0, 0.6, 0]} castShadow><boxGeometry args={[4.2, 0.7, 1.8]} /></mesh>
      <mesh material={charred} position={[-0.2, 1.2, 0]} castShadow><boxGeometry args={[2.2, 0.6, 1.6]} /></mesh>
      {[-1.4, 1.4].flatMap((x) => [-0.85, 0.85].map((z) => <mesh key={`${x}${z}`} material={charred} position={[x, 0.35, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.35, 0.35, 0.25, 16]} /></mesh>))}
    </group>
  );
}

function Ground() {
  const asphalt = useMemo(() => new MeshStandardMaterial({ color: '#2c2d2f', roughness: 0.92 }), []);
  const paving = useMemo(() => new MeshStandardMaterial({ color: '#9a958c', roughness: 0.85 }), []);
  const sand = useMemo(() => new MeshStandardMaterial({ color: '#d9c49a', roughness: 1 }), []);
  const grass = useMemo(() => new MeshStandardMaterial({ color: '#4c6b3a', roughness: 1 }), []);
  return (
    <group>
      <mesh material={asphalt} rotation={[-Math.PI / 2, 0, 0]} position={[-6, 0, 2]} receiveShadow><planeGeometry args={[16, 8]} /></mesh>
      <mesh material={paving} rotation={[-Math.PI / 2, 0, 0]} position={[-6, 0.005, -4]} receiveShadow><planeGeometry args={[16, 4]} /></mesh>
      {/* Lawn round the pool (x 4.25 … 11.75, z −1 … 3), with the pool cut out */}
      {([[3.125, -2, 2.25, 20], [14.875, -2, 6.25, 20], [8, -6.5, 7.5, 11], [8, 5.5, 7.5, 5]] as const).map(([x, z, w, l]) => (
        <mesh key={`${x}${z}`} material={grass} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.01, z]} receiveShadow><planeGeometry args={[w, l]} /></mesh>
      ))}
      <mesh material={sand} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 16]} receiveShadow><planeGeometry args={[60, 10]} /></mesh>
      {/* The cliff the waterfall pours over */}
      <mesh material={grass} position={[14, 2, -9.5]} castShadow receiveShadow><boxGeometry args={[8, 4, 3]} /></mesh>
    </group>
  );
}

function Scene({ s, field, setField }: { s: LabState; field: FireField; setField: (f: FireField) => void }) {
  const [wet, setWet] = useState(0);
  const acc = useRef(0);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.25) return;
    setWet((w) => stepWetness(w, s.rain ? 1 : 0, acc.current * 6));
    acc.current = 0;
  });
  const spots = useMemo(() => puddleSpots(4, -12, 1, 20, 3).map((p) => ({ ...p, x: p.x - 6, z: p.z + 2 + 4 })), []);
  const shopFire = fieldIntensity(field);
  return (
    <>
      <Suspense fallback={null}><Environment files={assetUrl('hdri/town-dusk_1k.exr')} environmentIntensity={0.7} background backgroundBlurriness={0.4} /></Suspense>
      <directionalLight position={[12, 18, 8]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
      <ambientLight intensity={0.15} />
      <FireLightRig />
      <Ground />
      <Facade field={field} setField={setField} hose={s.hose} />
      <HoseStream from={[-2, 0, 3.5]} nozzle={[-4.6, 1.1, 0.4]} target={[-8, 1.2, -5.6]} spraying={s.hose} steam={shopFire * 2} />
      <Car position={[-3, 0, 3.6]} />
      <FireEffect kind="vehicle" position={[-3, 0.9, 3.6]} intensity={s.carFire} />
      {/* A bin fire, and the extinguisher aimed at it */}
      <mesh position={[0.5, 0.45, -3.8]} castShadow><cylinderGeometry args={[0.35, 0.3, 0.9, 16]} /><meshStandardMaterial color="#3d4a3a" roughness={0.6} metalness={0.3} /></mesh>
      <FireEffect kind="small" position={[0.5, 0.9, -3.8]} intensity={s.binFire} />
      <ExtinguisherSpray nozzle={[2.2, 1.0, -2.6]} direction={[-1.7, -0.25, -1.2]} active={s.extinguisher} />
      {/* Water */}
      <SwimmingPool position={[8, 0, 1]} size={[7, 3.5]} touchable rain={s.rain ? 1 : 0} />
      <Waterfall position={[14, 0, -8]} width={3} height={4} poolSize={[5, 4]} />
      <WaterSurface kind="river" position={[14, 0.005, -1.5]} size={[3.4, 9]} flow={[0, 1.1]} edgeFoam={0.06} colour="#24493f" />
      <WaterSurface kind="ocean" position={[0, -0.15, 34]} size={[90, 30]} shoreZ={21.5} />
      <Puddles spots={spots} wetness={wet} rain={s.rain ? 1 : 0} />
      <Rain intensity={s.rain ? 0.9 : 0} />
    </>
  );
}

/** Live frames per second, for comparing the tiers. */
function Fps({ onFps }: { onFps: (n: number) => void }) {
  const frames = useRef(0), t = useRef(0);
  useFrame((_, dt) => {
    frames.current++; t.current += dt;
    if (t.current >= 1) { onFps(Math.round(frames.current / t.current)); frames.current = 0; t.current = 0; }
  });
  return null;
}

const button = 'rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-white';

export function VfxLab() {
  const [tier, setTier] = useState<VfxTier>(() => (new URLSearchParams(location.search).get('tier') as VfxTier) ?? 'high');
  const [s, setS] = useState<LabState>({ hose: false, extinguisher: false, rain: false, carFire: 1, binFire: 0.9 });
  const [field, setField] = useState<FireField>(newFacade);
  const [fps, setFps] = useState(0);
  // The extinguisher knocks the bin fire down while it's on
  useEffect(() => {
    if (!s.extinguisher) return;
    const id = setInterval(() => setS((v) => ({ ...v, binFire: Math.max(0, v.binFire - 0.08) })), 200);
    return () => clearInterval(id);
  }, [s.extinguisher]);
  const toggle = (k: 'hose' | 'extinguisher' | 'rain') => setS((v) => ({ ...v, [k]: !v[k] }));
  const view = new URLSearchParams(location.search).get('view');
  const camera = view === 'water' ? { position: [10, 6, 12] as [number, number, number], target: [10, 0, 0] as [number, number, number] }
    : view === 'ocean' ? { position: [2, 4, 12] as [number, number, number], target: [0, 0, 24] as [number, number, number] }
    : { position: [-2, 6, 12] as [number, number, number], target: [-5, 1.5, -3] as [number, number, number] };
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <VfxTierContext.Provider value={tier}>
        <Canvas key={tier} shadows dpr={tier === 'high' ? [1, 1.5] : 1} camera={{ position: camera.position, fov: 50 }}>
          <Scene s={s} field={field} setField={setField} />
          <OrbitControls target={camera.target} maxPolarAngle={Math.PI / 2 - 0.03} />
          <Fps onFps={setFps} />
        </Canvas>
      </VfxTierContext.Provider>
      <section aria-label="Effects controls" className="pointer-events-auto absolute left-3 top-3 max-w-[22rem] rounded-2xl border border-white/10 bg-black/70 p-3 text-xs text-white backdrop-blur">
        <p className="m-0 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300">AYE effects lab · {fps} fps</p>
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Quality">
          {VFX_TIERS.map((t) => <button key={t} type="button" className={`${button} ${t === tier ? 'border-amber-300 bg-amber-300 text-black' : 'border-white/25'}`} onClick={() => setTier(t)}>{VFX_TIER_LABEL[t]}</button>)}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button type="button" className={`${button} ${s.hose ? 'border-sky-300 bg-sky-300 text-black' : 'border-white/25'}`} onClick={() => toggle('hose')}>Hose {s.hose ? 'on' : 'off'}</button>
          <button type="button" className={`${button} ${s.extinguisher ? 'border-white bg-white text-black' : 'border-white/25'}`} onClick={() => toggle('extinguisher')}>Extinguisher {s.extinguisher ? 'on' : 'off'}</button>
          <button type="button" className={`${button} ${s.rain ? 'border-sky-300 bg-sky-300 text-black' : 'border-white/25'}`} onClick={() => toggle('rain')}>Rain {s.rain ? 'on' : 'off'}</button>
          <button type="button" className={`${button} border-white/25`} onClick={() => { setField(newFacade()); setS((v) => ({ ...v, carFire: 1, binFire: 0.9 })); }}>Relight fires</button>
          <button type="button" className={`${button} border-white/25`} onClick={() => setS((v) => ({ ...v, carFire: v.carFire > 0 ? 0 : 1 }))}>Car fire {s.carFire > 0 ? 'out' : 'on'}</button>
        </div>
        <p className="m-0 mt-2 text-white/70">Shopfront: {burningCount(field)} of {COLS * ROWS} windows alight · bin {Math.round(s.binFire * 100)}%. Tap the pool for ripples. Drag to look round.</p>
      </section>
    </div>
  );
}
