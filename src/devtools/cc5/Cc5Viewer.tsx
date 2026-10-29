/**
 * Development-only inspector for the Character Creator 5 import
 * (scripts/cc5/build.mjs). Open /cc5-viewer.html under npm run dev.
 * Shows the close-up model and its distance LOD with the retargeted clips,
 * next to the Rocketbox look the clips came from, plus live render cost.
 * It never touches the game's save data or the player's character.
 */
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, useAnimations, useGLTF } from '@react-three/drei';
import { Box3, Vector3, type Group, type Material, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { assetUrl, CC5_INFO } from '../../lib/assetManifest';
import { createHugClip, createReachHugClip } from '../../lib/hugAnimation';

/** A clip in the file, or the hug built at runtime (lib/hugAnimation.ts). */
type Clip = string;
type Lod = 'main' | 'lite' | 'auto';
const BASE_CLIPS: Clip[] = ['Idle', 'Walk', 'Run'];
const ROCKETBOX = 'models/characters/rocketbox/male-adult-12.glb';
/** Camera distance (m) beyond which "auto" shows the lite model. */
const LOD_DISTANCE = 6;

interface ProfileInfo {
  file: string;
  fileMB: number;
  triangles: number;
  textures: number;
  textureGpuMB: number;
  heightM: number;
  clips: string[];
  warnings: string[];
}
interface BuildInfo {
  builtAt: string;
  source: { fbx: string; fbxMB: number };
  profiles: { main: ProfileInfo; lite: ProfileInfo };
  avatar?: { height: number; walkSpeed: number; runSpeed: number };
  retarget?: { from: string; hipRatio: number; maxAlignDegrees: number };
}
interface RenderStats {
  fps: number;
  calls: number;
  triangles: number;
  textures: number;
  geometries: number;
}

const materialsOf = (o: Object3D): Material[] => {
  const m = (o as Mesh).material;
  return m ? (Array.isArray(m) ? m : [m]) : [];
};

function Character({ url, clip, playing, wireframe, hashedAlpha, groupRef, position, onHeight }: {
  url: string;
  clip: Clip;
  playing: boolean;
  wireframe: boolean;
  hashedAlpha: boolean;
  groupRef?: React.RefObject<Group | null>;
  position: [number, number, number];
  onHeight?: (h: number) => void;
}) {
  const { scene, animations } = useGLTF(assetUrl(url), false, true);
  const model = useMemo(() => cloneSkinned(scene), [scene]);
  const ownRef = useRef<Group>(null);
  const group = groupRef ?? ownRef;
  // The hug isn't in the file: the game builds it for each skeleton when the person loads
  const clips = useMemo(() => {
    const hug = createReachHugClip(model, animations.find((c) => c.name === 'Idle')) ?? createHugClip(model);
    return hug ? [...animations, hug] : animations;
  }, [animations, model]);
  const { actions } = useAnimations(clips, group);

  useEffect(() => {
    onHeight?.(new Box3().setFromObject(model).getSize(new Vector3()).y);
  }, [model, onHeight]);

  useEffect(() => {
    // A clip this model doesn't have (the lite model has no gestures) shows Idle
    const action = actions[clip] ?? actions.Idle;
    action?.reset().fadeIn(0.25).play();
    return () => void action?.fadeOut(0.25);
  }, [actions, clip]);

  useEffect(() => {
    for (const a of Object.values(actions)) if (a) a.paused = !playing;
  }, [actions, playing]);

  useEffect(() => {
    model.traverse((o) => {
      if (!(o as Mesh).isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false; // skinned bounds don't follow the animation
      for (const m of materialsOf(o) as MeshStandardMaterial[]) {
        m.userData.cutoff ??= m.alphaTest;
        m.wireframe = wireframe;
        // Alpha-tested hair cards, or dithered (hashed) alpha: softer edges, no sorting
        if (m.userData.cutoff > 0) {
          m.alphaHash = hashedAlpha;
          m.alphaTest = hashedAlpha ? 0 : m.userData.cutoff;
        }
        m.needsUpdate = true;
      }
    });
  }, [model, wireframe, hashedAlpha]);

  return (
    <group ref={group} position={position}>
      <primitive object={model} />
    </group>
  );
}

type Shared = Pick<Parameters<typeof Character>[0], 'clip' | 'playing' | 'wireframe' | 'hashedAlpha'>;

/** Shows the main model up close and the lite one beyond LOD_DISTANCE. */
function AutoLod({ main, lite, onHeight, shared }: { main: string; lite: string; onHeight: (key: string) => (h: number) => void; shared: Shared }) {
  const mainRef = useRef<Group>(null);
  const liteRef = useRef<Group>(null);
  const at = useMemo(() => new Vector3(), []);
  useFrame(({ camera }) => {
    if (!mainRef.current) return;
    const far = camera.position.distanceTo(mainRef.current.getWorldPosition(at)) > LOD_DISTANCE;
    mainRef.current.visible = !far;
    if (liteRef.current) liteRef.current.visible = far;
  });
  return (
    <>
      <Character url={main} groupRef={mainRef} position={[0, 0, 0]} onHeight={onHeight('CC5 main')} {...shared} />
      <Character url={lite} groupRef={liteRef} position={[0, 0, 0]} onHeight={onHeight('CC5 lite')} {...shared} />
    </>
  );
}

/**
 * Milliseconds per synchronous frame (render + gl.finish), averaged. Unlike the
 * fps counter this isn't capped by vsync or a throttled background window.
 * Run from the console: await __cc5.benchmark()
 */
function useBenchmark() {
  const { gl, scene, camera, controls } = useThree();
  useEffect(() => {
    const w = window as unknown as { __cc5?: { scene: object; camera: object; controls: unknown; benchmark: (frames?: number) => Promise<number> } };
    w.__cc5 = {
      scene,
      camera,
      controls,
      benchmark: async (frames = 30) => {
        const ctx = gl.getContext();
        const pixel = new Uint8Array(4);
        // Reading a pixel back waits for the GPU; gl.finish() doesn't on ANGLE/D3D11
        const frame = () => {
          gl.render(scene, camera);
          ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, pixel);
        };
        frame();
        const t0 = performance.now();
        for (let i = 0; i < frames; i++) frame();
        return Math.round(((performance.now() - t0) / frames) * 10) / 10;
      },
    };
    return () => void delete w.__cc5;
  }, [gl, scene, camera, controls]);
}

function StatsProbe({ onStats }: { onStats: (s: RenderStats) => void }) {
  const gl = useThree((s) => s.gl);
  const acc = useRef({ t: 0, frames: 0 });
  useBenchmark();
  useFrame((_, delta) => {
    acc.current.t += delta;
    acc.current.frames++;
    if (acc.current.t < 0.5) return;
    onStats({
      fps: Math.round(acc.current.frames / acc.current.t),
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      textures: gl.info.memory.textures,
      geometries: gl.info.memory.geometries,
    });
    acc.current = { t: 0, frames: 0 };
  });
  return null;
}

class LoadError extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  render() {
    if (this.state.error) return <Notice title="A model failed to load">{this.state.error}</Notice>;
    return this.props.children;
  }
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ ...panel, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', maxWidth: 520 }}>
      <strong>{title}</strong>
      <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{children}</div>
    </div>
  );
}

const panel: React.CSSProperties = {
  position: 'absolute', zIndex: 1, padding: 12, borderRadius: 8, background: 'rgba(16,18,24,0.88)',
  color: '#e8eaf0', font: '13px/1.45 system-ui, sans-serif', boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
};
const button = (on: boolean): React.CSSProperties => ({
  padding: '4px 10px', marginRight: 4, borderRadius: 6, border: '1px solid #4a5060', cursor: 'pointer',
  background: on ? '#e2b347' : '#262a34', color: on ? '#15171c' : '#e8eaf0', font: 'inherit',
});

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div style={{ marginTop: 6 }}>
      <span style={{ display: 'inline-block', width: 64, opacity: 0.7 }}>{label}</span>
      {options.map((o) => (
        <button key={o} type="button" style={button(o === value)} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

export function Cc5Viewer() {
  const [info, setInfo] = useState<BuildInfo | null>(null);
  const [missing, setMissing] = useState(false);
  const [clip, setClip] = useState<Clip>('Idle');
  const [lod, setLod] = useState<Lod>('main');
  const [playing, setPlaying] = useState(true);
  const [compare, setCompare] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [hashedAlpha, setHashedAlpha] = useState(false);
  const [stats, setStats] = useState<RenderStats | null>(null);
  const [heights, setHeights] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch(assetUrl(CC5_INFO), { cache: 'no-cache' })
      .then((r) => (r.ok && !(r.headers.get('content-type') ?? '').includes('text/html') ? r.json() : Promise.reject()))
      .then(setInfo)
      .catch(() => setMissing(true));
  }, []);

  const heightOf = useMemo(() => {
    const cache: Record<string, (h: number) => void> = {};
    return (key: string) => (cache[key] ??= (h: number) => setHeights((prev) => (prev[key] === h ? prev : { ...prev, [key]: h })));
  }, []);

  if (missing) {
    return (
      <Notice title="No CC5 build found">
        {`Expected public/assets/${CC5_INFO}.\nBuild it from the Character Creator export with:\n\n  node scripts/cc5/build.mjs`}
      </Notice>
    );
  }
  if (!info) return null;
  const { main, lite } = info.profiles;
  const shared = { clip, playing, wireframe, hashedAlpha };
  const fmt = (n: number) => n.toLocaleString();

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <div style={{ ...panel, top: 12, left: 12 }}>
        <strong>CC5 character viewer</strong> <span style={{ opacity: 0.6 }}>(development only)</span>
        <Choice label="Clip" value={clip} options={[...BASE_CLIPS, ...(main.clips.filter((c) => !BASE_CLIPS.includes(c))), 'Hug']} onChange={setClip} />
        <Choice label="Model" value={lod} options={['main', 'lite', 'auto'] as const} onChange={setLod} />
        <div style={{ marginTop: 6 }}>
          <button type="button" style={button(playing)} onClick={() => setPlaying((v) => !v)}>{playing ? 'Playing' : 'Paused'}</button>
          <button type="button" style={button(compare)} onClick={() => setCompare((v) => !v)}>Rocketbox</button>
          <button type="button" style={button(wireframe)} onClick={() => setWireframe((v) => !v)}>Wireframe</button>
          <button type="button" style={button(hashedAlpha)} onClick={() => setHashedAlpha((v) => !v)}>Hashed hair</button>
        </div>
        {lod === 'auto' && <div style={{ marginTop: 6, opacity: 0.7 }}>Lite beyond {LOD_DISTANCE} m (scroll out)</div>}
      </div>

      <div style={{ ...panel, bottom: 12, left: 12, fontVariantNumeric: 'tabular-nums' }}>
        <div><b>main</b> {main.fileMB} MB · {fmt(main.triangles)} tris · {main.textures} tex ≈ {main.textureGpuMB} MB GPU</div>
        <div><b>lite</b> {lite.fileMB} MB · {fmt(lite.triangles)} tris · {lite.textures} tex ≈ {lite.textureGpuMB} MB GPU</div>
        <div>source {info.source.fbx} {info.source.fbxMB} MB · built {new Date(info.builtAt).toLocaleString()}</div>
        {info.avatar && <div>in-game: {info.avatar.height} m tall, walk {info.avatar.walkSpeed} m/s, run {info.avatar.runSpeed} m/s</div>}
        {Object.entries(heights).map(([k, h]) => <div key={k}>{k} measured height {h.toFixed(3)} m</div>)}
        {stats && <div>live: {stats.fps} fps · {stats.calls} draw calls · {fmt(stats.triangles)} tris · {stats.textures} textures · {stats.geometries} geometries</div>}
        {[...main.warnings, ...lite.warnings].map((w) => <div key={w} style={{ color: '#f0b45a' }}>⚠ {w}</div>)}
      </div>

      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0.6, 1.55, 2.6], fov: 40 }}>
        <color attach="background" args={['#2a2f3a']} />
        <hemisphereLight args={['#dfe7ff', '#3a3530', 0.6]} />
        <directionalLight position={[2.5, 4, 3]} intensity={1.8} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
        <Environment files={assetUrl('hdri/potsdamer_platz_1k.hdr')} environmentIntensity={0.55} />
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <circleGeometry args={[6, 48]} />
          <meshStandardMaterial color="#5b5f68" roughness={0.9} />
        </mesh>
        <LoadError>
          <Suspense fallback={null}>
            {lod === 'main' && <Character url={main.file} position={[0, 0, 0]} onHeight={heightOf('CC5 main')} {...shared} />}
            {lod === 'lite' && <Character url={lite.file} position={[0, 0, 0]} onHeight={heightOf('CC5 lite')} {...shared} />}
            {lod === 'auto' && <AutoLod main={main.file} lite={lite.file} onHeight={heightOf} shared={shared} />}
            {compare && <Character url={ROCKETBOX} position={[-0.9, 0, 0]} onHeight={heightOf('Rocketbox')} {...shared} />}
          </Suspense>
        </LoadError>
        <OrbitControls makeDefault target={[0, 1.0, 0]} minDistance={0.25} maxDistance={20} />
        <StatsProbe onStats={setStats} />
      </Canvas>
    </div>
  );
}
