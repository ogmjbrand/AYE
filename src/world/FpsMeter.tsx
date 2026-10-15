import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { perfStats } from './quality';

/** Averages the frame rate over half-second windows into perfStats.fps. */
export function FpsMeter() {
  const acc = useRef({ frames: 0, time: 0 });
  useFrame((_, delta) => {
    const a = acc.current;
    a.frames++;
    a.time += delta;
    if (a.time >= 0.5) {
      perfStats.fps = Math.round(a.frames / a.time);
      a.frames = 0;
      a.time = 0;
    }
  });
  return null;
}
