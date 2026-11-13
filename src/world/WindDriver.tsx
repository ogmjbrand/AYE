import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { setWindFrom, wind } from './wind';

/** Keeps the shared wind (world/wind.ts) in step with the weather: speed, direction and the clock for gusts. */
export function WindDriver({ speed, from }: { speed: number; from: number }) {
  useEffect(() => setWindFrom(speed, from), [speed, from]);
  useFrame(({ clock }) => { wind.time.value = clock.elapsedTime; });
  return null;
}
