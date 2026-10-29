import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei';
import { ACESFilmicToneMapping, Vector3 } from 'three';
import type { PlayerHandle } from '../../hooks/usePlayerController';
import { assetUrl } from '../../lib/assetManifest';
import { Avatar } from '../../components/Avatar';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { ARCHETYPES, archetypeVariety, personFor, type Person } from '../../lib/archetypes';
import { characterById } from '../../lib/characterRegistry';
import { SHAPE_PRESETS } from '../../lib/bodyShape';
import { itemById } from '../../lib/fashion';
import { skinToneById } from '../../lib/skinTone';
import { LOOKS } from '../../lib/looks';

/** Standing still, so each person plays their idle clip. */
function stillController(): PlayerHandle {
  return {
    position: new Vector3(), direction: 0, velocity: new Vector3(), trafficWarning: false,
    drivingVehicleId: null, vehicleSpeed: 0, applyMovement: () => {}, faceTowards: () => {}, moveToPose: () => {},
  };
}

const COUNTS = [4, 8, 12, 20] as const;
const SPACING = 1.25;
const PER_ROW = 5;

/** The renderer's own counters for the last frame, read twice a second. */
function RenderStats({ onStats }: { onStats: (s: string) => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const id = setInterval(() => {
      const { render, memory, programs } = gl.info;
      onStats(`${render.calls} draw calls · ${render.triangles.toLocaleString()} triangles · ${memory.textures} textures · ${memory.geometries} geometries · ${programs?.length ?? 0} shader programs`);
    }, 500);
    return () => clearInterval(id);
  }, [gl, onStats]);
  return null;
}

function PersonOnStage({ person, at, selected, onPick }: { person: Person; at: [number, number, number]; selected: boolean; onPick: () => void }) {
  const controller = useMemo(() => stillController(), []);
  const { appearance, lookId } = person;
  return (
    <group position={at} onClick={(e) => { e.stopPropagation(); onPick(); }}>
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <Avatar
            controller={controller} lookId={lookId} styles={appearance.styles} shape={appearance.shape}
            skinToneId={appearance.skinTone} hairstyleItemId={appearance.hairstyleItemId} own
          />
        </Suspense>
      </ErrorBoundary>
      {selected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.45, 40]} />
          <meshBasicMaterial color="#d79d3c" />
        </mesh>
      )}
    </group>
  );
}

function Details({ person }: { person: Person }) {
  const entry = characterById(person.lookId);
  const a = person.appearance;
  const shape = SHAPE_PRESETS.find((p) => JSON.stringify(p.shape) === JSON.stringify(a.shape))?.label ?? 'Custom';
  return (
    <dl className="m-0 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-xs">
      <dt className="text-white/50">Base model</dt><dd className="m-0">{entry?.displayName} <span className="text-white/40">({person.lookId}, {entry?.triangles?.toLocaleString()} tris)</span></dd>
      <dt className="text-white/50">Hair (model)</dt><dd className="m-0">{entry?.hair}{entry?.facialHair ? ` · ${entry.facialHair}` : ''}</dd>
      <dt className="text-white/50">3D hairstyle</dt><dd className="m-0">{a.hairstyleItemId ? itemById(a.hairstyleItemId)?.name ?? a.hairstyleItemId : 'None (model hair)'}</dd>
      {(['top', 'bottom', 'shoes', 'hair'] as const).map((slot) => (
        <div key={slot} className="contents"><dt className="capitalize text-white/50">{slot === 'hair' ? 'Hair colour' : slot}</dt><dd className="m-0">{itemById(a.itemIds[slot] ?? '')?.name ?? '—'}</dd></div>
      ))}
      <dt className="text-white/50">Skin tone</dt><dd className="m-0">{skinToneById(a.skinTone).label}</dd>
      <dt className="text-white/50">Body shape</dt><dd className="m-0">{shape}</dd>
      <dt className="text-white/50">Licence</dt><dd className="m-0">{entry?.licence.name}, {entry?.licence.holder}</dd>
    </dl>
  );
}

/**
 * A crowd of real Rocketbox people, generated from seeds: pick an archetype
 * and a count, regenerate, and tap anyone to see what they're made of. The
 * renderer's counters show what the crowd costs.
 */
/** ?archetype=doctor&count=20&seed=7 opens the lab on that crowd, so a crowd can be shared or reproduced. */
function fromUrl() {
  const q = new URLSearchParams(window.location.search);
  const count = Number(q.get('count'));
  const seed = Number(q.get('seed'));
  const archetype = q.get('archetype');
  return {
    archetype: archetype && ARCHETYPES.some((a) => a.id === archetype) ? archetype : 'resident',
    count: (COUNTS as readonly number[]).includes(count) ? (count as (typeof COUNTS)[number]) : 8,
    seed: Number.isInteger(seed) && seed > 0 ? seed : 1,
  };
}

export function CharacterLab() {
  const [start] = useState(fromUrl);
  const [archetypeId, setArchetype] = useState(start.archetype);
  const [count, setCount] = useState<(typeof COUNTS)[number]>(start.count);
  const [seed, setSeed] = useState(start.seed);
  const [picked, setPicked] = useState(0);
  const [stats, setStats] = useState('');
  const people = useMemo(() => Array.from({ length: count }, (_, i) => personFor(`lab-${seed}-${i}`, archetypeId)), [count, seed, archetypeId]);
  const archetype = ARCHETYPES.find((a) => a.id === archetypeId)!;
  const variety = archetypeVariety(archetypeId);
  const rows = Math.ceil(count / PER_ROW);
  const spots = people.map((_, i): [number, number, number] => {
    const inRow = Math.min(PER_ROW, count - Math.floor(i / PER_ROW) * PER_ROW);
    return [((i % PER_ROW) - (inRow - 1) / 2) * SPACING, 0, -Math.floor(i / PER_ROW) * SPACING * 1.4];
  });
  const button = 'min-h-11 rounded-lg border border-white/15 px-3 text-sm font-semibold text-white hover:border-[#d79d3c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d79d3c]';
  const pickedPerson = people[Math.min(picked, people.length - 1)];

  return (
    <main className="flex h-dvh flex-col text-white lg:flex-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <section className="relative min-h-[55dvh] flex-1">
        <Canvas dpr={[1, 1.5]} camera={{ position: [0, 1.6, 6.5 + rows * 1.2], fov: 35 }} gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}>
          <hemisphereLight args={['#f3e7d3', '#1b1c20', 0.6]} />
          <directionalLight position={[3, 5, 4]} intensity={2.2} color="#fff1dc" />
          <directionalLight position={[-4, 3, -3]} intensity={1.2} color="#d9b46a" />
          <ErrorBoundary fallback={null}>
            <Suspense fallback={null}><Environment files={assetUrl('hdri/venice_sunset_1k.hdr')} environmentIntensity={0.45} /></Suspense>
          </ErrorBoundary>
          {people.map((p, i) => <PersonOnStage key={p.identity} person={p} at={spots[i]} selected={i === picked} onPick={() => setPicked(i)} />)}
          <ContactShadows position={[0, 0.001, -rows * 0.8]} scale={14} blur={2.4} opacity={0.55} far={2} resolution={512} />
          <OrbitControls target={[0, 0.9, -(rows - 1) * SPACING * 0.7]} enablePan={false} minDistance={2} maxDistance={16} maxPolarAngle={Math.PI / 2 - 0.05} />
          <RenderStats onStats={setStats} />
        </Canvas>
        <p className="pointer-events-none absolute inset-x-0 bottom-2 m-0 text-center text-[11px] text-white/60">{stats || 'Measuring…'}</p>
      </section>
      <aside className="w-full space-y-4 overflow-y-auto border-t border-white/10 bg-[#17181b] p-4 lg:w-[24rem] lg:border-l lg:border-t-0">
        <h1 className="m-0 text-base font-bold tracking-wide text-[#e8b452]">Character lab</h1>
        <p className="m-0 text-xs text-white/60">
          Real Rocketbox people ({LOOKS.length} base models), dressed, coloured and shaped by the resident generator from a seed.
          The faces are the base models&rsquo; own: variety here is clothing, hair colour, skin tone, body shape and 3D hairstyles.
        </p>
        <label className="block text-xs text-white/60">Archetype
          <select value={archetypeId} onChange={(e) => { setArchetype(e.target.value); setPicked(0); }} className="mt-1 block min-h-11 w-full rounded-lg border border-white/15 bg-[#202226] px-2 text-sm text-white">
            {ARCHETYPES.map((a) => <option key={a.id} value={a.id}>{a.label}{a.uniform ? ' (uniform)' : ''}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="How many people">
          {COUNTS.map((n) => <button key={n} type="button" role="radio" aria-checked={count === n} onClick={() => setCount(n)} className={`${button} ${count === n ? 'border-[#d79d3c] bg-[#d79d3c]/15' : ''}`}>{n}</button>)}
          <button type="button" onClick={() => { setSeed((s) => s + 1); setPicked(0); }} className={`${button} border-[#d79d3c] text-[#f0c67e]`}>Regenerate</button>
        </div>
        <p className="m-0 text-xs text-white/60">
          Seed {seed} · {variety.baseModels} base model{variety.baseModels === 1 ? '' : 's'} · {variety.appearances.toLocaleString()} possible appearances
          {archetype.needs ? <><br /><span className="text-[#f0a35a]">Needs {archetype.needs} for a faithful version.</span></> : null}
        </p>
        {pickedPerson && (
          <div className="rounded-xl border border-white/10 p-3">
            <p className="m-0 mb-2 text-sm font-semibold">Person {Math.min(picked, people.length - 1) + 1} <span className="text-xs font-normal text-white/40">({pickedPerson.identity})</span></p>
            <Details person={pickedPerson} />
          </div>
        )}
      </aside>
    </main>
  );
}
