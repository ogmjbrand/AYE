import { Suspense, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment } from '@react-three/drei';
import { ACESFilmicToneMapping, Vector3, type Group } from 'three';
import type { PlayerHandle } from '../hooks/usePlayerController';
import { assetUrl } from '../lib/assetManifest';
import { Avatar } from './Avatar';
import { ErrorBoundary } from './ErrorBoundary';
import type { Slot, Style } from '../lib/fashion';
import type { BodyShape } from '../lib/bodyShape';

/** A standing-still controller so the avatar plays its idle animation. */
function useStillController(): PlayerHandle {
  return useMemo(
    () => ({
      position: new Vector3(),
      direction: 0,
      velocity: new Vector3(),
      trafficWarning: false,
      applyMovement: () => {},
      faceTowards: () => {},
      moveToPose: () => {},
    }),
    [],
  );
}

/** Turns slowly; holds a three-quarter view instead when the player prefers reduced motion. */
function Turntable({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null);
  const still = useMemo(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  useFrame((_, delta) => {
    if (!ref.current) return;
    if (still) ref.current.rotation.y = -0.6;
    else ref.current.rotation.y += delta * 0.35;
  });
  return <group ref={ref}>{children}</group>;
}

function Placeholder({ color }: { color: string }) {
  return (
    <mesh position={[0, 0.9, 0]}>
      <capsuleGeometry args={[0.28, 0.65, 4, 8]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}

/**
 * Live 3D preview of the in-game character model (the same GLB the game uses),
 * turning slowly, with the chosen look, height and clothes applied.
 */
export function CharacterPreview({ outfitColor, lookId, heightCm, styles, shape }: {
  outfitColor: string;
  shape?: BodyShape;
  lookId?: string;
  heightCm?: number;
  styles?: Partial<Record<Slot, Style>>;
}) {
  const still = useStillController();
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
      <Turntable>
        <ErrorBoundary fallback={<Placeholder color={outfitColor} />}>
          <Suspense fallback={<Placeholder color={outfitColor} />}>
            <Avatar key={lookId} controller={still} lookId={lookId} heightCm={heightCm} styles={styles} shape={shape} />
          </Suspense>
        </ErrorBoundary>
      </Turntable>
      <ContactShadows position={[0, 0.001, 0]} scale={3} blur={2.4} opacity={0.6} far={1.5} resolution={256} />
    </Canvas>
  );
}
