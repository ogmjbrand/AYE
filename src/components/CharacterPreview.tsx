import { Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei';
import { ACESFilmicToneMapping, Vector3, type Group } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { PlayerHandle } from '../hooks/usePlayerController';
import { assetUrl } from '../lib/assetManifest';
import { Avatar } from './Avatar';
import { ErrorBoundary } from './ErrorBoundary';
import type { Slot, Style } from '../lib/fashion';
import type { BodyShape } from '../lib/bodyShape';

export type PreviewFocus = 'body' | 'face';

/** A standing-still controller so the avatar plays its idle animation. */
function useStillController(): PlayerHandle {
  return useMemo(
    () => ({ position: new Vector3(), direction: 0, velocity: new Vector3(), applyMovement: () => {} }),
    [],
  );
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Turns slowly until the player takes over (drags); holds a three-quarter view instead when they prefer
 * reduced motion. In the face view it stops and turns the person to face the camera, so you see the face.
 */
function Turntable({ children, spin, faceFront }: { children: ReactNode; spin: { current: boolean }; faceFront: boolean }) {
  const ref = useRef<Group>(null);
  const still = useMemo(() => reducedMotion(), []);
  useFrame(({ camera }, delta) => {
    const g = ref.current;
    if (!g) return;
    if (faceFront) {
      // The model faces +z at rotation 0: turn the shortest way round to the camera's side
      const want = Math.atan2(camera.position.x, camera.position.z);
      const diff = Math.atan2(Math.sin(want - g.rotation.y), Math.cos(want - g.rotation.y));
      g.rotation.y += diff * Math.min(1, delta * 4);
    } else if (still) g.rotation.y = -0.6;
    else if (spin.current) g.rotation.y += delta * 0.35;
  });
  return <group ref={ref}>{children}</group>;
}

/** Where the camera looks and how far away it is, per focus (scaled by height). */
const VIEW: Record<PreviewFocus, { y: number; distance: number }> = { body: { y: 0.53, distance: 4.6 }, face: { y: 0.93, distance: 1.25 } };

/** Glides the orbit camera to the focus (full body, or head and shoulders) when it changes. */
function FocusRig({ focus, height, controls }: { focus: PreviewFocus; height: number; controls: { current: OrbitControlsImpl | null } }) {
  const { camera } = useThree();
  const goal = useRef({ target: new Vector3(), pos: new Vector3(), t: 1 });
  useEffect(() => {
    const v = VIEW[focus];
    const target = new Vector3(0, v.y * height, 0);
    const dir = camera.position.clone().sub(controls.current?.target ?? target).setY(0);
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1);
    dir.normalize().multiplyScalar(v.distance).setY(focus === 'face' ? 0.05 : 0.15);
    goal.current = { target, pos: target.clone().add(dir), t: 0 };
  }, [focus, height, camera, controls]);
  useFrame((_, delta) => {
    const g = goal.current;
    const c = controls.current;
    if (g.t >= 1 || !c) return;
    g.t = Math.min(1, g.t + delta * (reducedMotion() ? 100 : 2.5));
    c.target.lerp(g.target, g.t);
    camera.position.lerp(g.pos, g.t);
    c.update();
  });
  return null;
}

/**
 * Live 3D preview of the in-game character model (the same GLB the game uses),
 * with the chosen person, height, shape, skin tone and clothes applied. When
 * interactive, drag to turn and scroll or pinch to zoom; the camera frames the
 * face for face and hair choices.
 */
export function CharacterPreview({ lookId, heightCm, styles, shape, skinTone = 0, focus = 'body', interactive = false }: {
  shape?: BodyShape;
  skinTone?: number;
  lookId?: string;
  heightCm?: number;
  styles?: Partial<Record<Slot, Style>>;
  focus?: PreviewFocus;
  interactive?: boolean;
}) {
  const still = useStillController();
  const controls = useRef<OrbitControlsImpl | null>(null);
  const spin = useRef(true);
  const height = (heightCm ?? 170) / 100;
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.0, 4.6], fov: 30 }}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05, alpha: true }}
      onCreated={({ camera }) => camera.lookAt(0, 0.88, 0)}
      fallback={<div className="grid h-full place-items-center text-sm text-cc-muted">3D preview needs WebGL.</div>}
    >
      <hemisphereLight args={['#f3e7d3', '#1b1c20', 0.6]} />
      <directionalLight position={[2.5, 4, 3]} intensity={2.2} color="#fff1dc" />
      <directionalLight position={[-3, 2.5, -2.5]} intensity={1.4} color="#d9b46a" />
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <Environment files={assetUrl('hdri/venice_sunset_1k.hdr')} environmentIntensity={0.5} />
        </Suspense>
      </ErrorBoundary>
      <Turntable spin={spin} faceFront={interactive && focus === 'face'}>
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <Avatar key={lookId} controller={still} lookId={lookId} heightCm={heightCm} styles={styles} shape={shape} skinTone={skinTone} />
          </Suspense>
        </ErrorBoundary>
      </Turntable>
      <ContactShadows position={[0, 0.001, 0]} scale={3} blur={2.4} opacity={0.6} far={1.5} resolution={256} />
      {interactive && (
        <>
          <OrbitControls
            ref={controls}
            makeDefault
            target={[0, VIEW.body.y * height, 0]}
            enablePan={false}
            minDistance={0.8}
            maxDistance={6}
            minPolarAngle={0.35}
            maxPolarAngle={Math.PI / 2 + 0.05}
            onStart={() => { spin.current = false; }}
          />
          <FocusRig focus={focus} height={height} controls={controls} />
        </>
      )}
    </Canvas>
  );
}
