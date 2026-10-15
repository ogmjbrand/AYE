import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Stars } from '@react-three/drei';
import { Vector3, type DirectionalLight, Object3D } from 'three';
import type { PlayerHandle } from '../hooks/usePlayerController';
import type { GameTime } from '../lib/gameState';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { setNightGlow } from './materials';
import { useQuality } from './quality';
import { SkyDome } from './SkyDome';
import { lightingAt, type HdriKey } from './timeOfDay';

const HDRI: Record<HdriKey, string> = {
  day: `${import.meta.env.BASE_URL}assets/hdri/potsdamer_platz_1k.hdr`,
  golden: `${import.meta.env.BASE_URL}assets/hdri/venice_sunset_1k.hdr`,
  night: `${import.meta.env.BASE_URL}assets/hdri/dikhololo_night_1k.hdr`,
};

const SHADOW_EXTENT = 32;
const sunOffset = new Vector3();

/**
 * Sky, sun, ambient and image-based lighting for the current game time.
 * The sun's shadow camera follows the player so a small, sharp shadow map
 * covers the area the camera can actually see.
 */
export function SceneLighting({ gameTime, player }: { gameTime: GameTime; player: PlayerHandle }) {
  const quality = useQuality();
  const l = useMemo(() => lightingAt(gameTime.hour, gameTime.minute), [gameTime.hour, gameTime.minute]);
  const sun = useRef<DirectionalLight>(null);
  const target = useMemo(() => new Object3D(), []);

  useEffect(() => setNightGlow(l.night), [l.night]);

  useFrame(() => {
    const light = sun.current;
    if (!light) return;
    // Follow the player in whole metres to stop shadow edges shimmering
    const px = Math.round(player.position.x), pz = Math.round(player.position.z);
    sunOffset.set(...l.sunDirection).normalize().multiplyScalar(60);
    light.position.set(px + sunOffset.x, Math.max(sunOffset.y, 8), pz + sunOffset.z);
    target.position.set(px, 0, pz);
    target.updateMatrixWorld();
  });

  return (
    <>
      <color attach="background" args={[l.horizonColor]} />
      <fog attach="fog" args={[l.fogColor, 45, 190]} />
      <SkyDome lighting={l} />
      {l.night > 0.3 && <Stars radius={200} depth={60} count={2500} factor={4} fade speed={0} />}

      <hemisphereLight args={[l.skyColor, l.groundColor, l.hemiIntensity]} />
      <primitive object={target} />
      <directionalLight
        ref={sun}
        target={target}
        color={l.sunColor}
        intensity={l.sunIntensity}
        castShadow
        shadow-mapSize={[quality.shadowMapSize, quality.shadowMapSize]}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />

      {/* Image-based lighting and reflections; the scene still works if it fails to load */}
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <Environment files={HDRI[l.hdri]} environmentIntensity={l.envIntensity} />
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
