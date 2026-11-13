import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, type DirectionalLight, type HemisphereLight } from 'three';
import type { PlayerHandle } from '../hooks/usePlayerController';
import { playThunder } from '../lib/weatherAudio';
import { nextStrike, strikeBrightness, type Strike } from '../lib/lightning';

/**
 * Lightning in a thunderstorm. Each strike lights the whole scene for a fraction of a second, in
 * the two or three pulses of a real return stroke, from the direction it struck: a cold white
 * directional light (so buildings, streets and people are lit and cast shadows from it) and a
 * sky-wide hemisphere flash (the clouds lighting up). Then its thunder follows, after the time
 * sound takes to cover the distance (lib/weatherAudio.ts). How often it strikes follows
 * `thunder` (0 … 1). Both lights are always mounted at zero, so a flash never recompiles shaders.
 */
export function Lightning({ thunder, player }: { thunder: number; player: PlayerHandle }) {
  const bolt = useRef<DirectionalLight>(null);
  const sky = useRef<HemisphereLight>(null);
  const target = useMemo(() => new Object3D(), []);
  const strike = useRef<Strike | null>(null);
  const next = useRef<number>(-1);
  // Development only: count strikes, and with ?lightning=hold keep each flash up for a second (so a
  // slow test renderer can see the lighting)
  const hold = useMemo(() => import.meta.env.DEV && new URLSearchParams(window.location.search).get('lightning') === 'hold', []);

  useFrame(() => {
    // The browser's steady clock, not the scene's (which is restarted while a scene loads, and would
    // leave the next strike scheduled far in the future)
    const t = performance.now() / 1000;
    if (next.current < 0 || next.current - t > 120) next.current = t + 2;
    if (thunder > 0.02 && t >= next.current) {
      const s = nextStrike(t, thunder, Math.random);
      strike.current = s;
      next.current = s.at + s.gap;
      playThunder(s.distance);
      if (import.meta.env.DEV) {
        const w = window as unknown as { __ayeStrikes?: number };
        w.__ayeStrikes = (w.__ayeStrikes ?? 0) + 1;
      }
      if (bolt.current) {
        // From where it struck, high in the sky
        bolt.current.position.set(player.position.x + Math.sin(s.bearing) * 40, 60, player.position.z + Math.cos(s.bearing) * 40);
      }
    }
    if (thunder <= 0.02) next.current = t + 2;
    const b = !strike.current ? 0 : hold ? (t - strike.current.at < 1 ? strike.current.pulses[0].strength : 0) : strikeBrightness(strike.current, t);
    if (bolt.current) bolt.current.intensity = 9 * b;
    if (sky.current) sky.current.intensity = 2.2 * b;
    target.position.set(player.position.x, 0, player.position.z);
    target.updateMatrixWorld();
  });

  return (
    <>
      <primitive object={target} />
      <directionalLight ref={bolt} target={target} color="#dfe6ff" intensity={0} />
      <hemisphereLight ref={sky} args={['#cfd8ff', '#20242c', 0]} />
    </>
  );
}
