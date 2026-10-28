import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Object3D, Vector3, type PointLight } from 'three';
import { LAMP_POOL_SIZE, nearestLamps } from '../lib/lamps';

/**
 * Doorway and street lamps share a small, fixed set of real point lights.
 *
 * Every point light in a scene is paid for by every lit pixel on screen, even
 * one 100 m away, and adding or removing one recompiles every material's
 * shader (a visible freeze). So a <Lamp> only marks where light comes from; the
 * <LampPool> keeps LAMP_POOL_SIZE (lib/lamps.ts) lights mounted at all times
 * and moves them to the lamps nearest the player each frame. A lamp that is
 * off (intensity 0) stays registered, so opening hours and nightfall never
 * change the light count.
 */
interface LampEntry {
  object: Object3D | null;
  color: Color;
  intensity: number;
  distance: number;
  decay: number;
}

const lamps = new Set<LampEntry>();
const lampPosition = new Vector3();

export function Lamp({ position, color = '#ffffff', intensity, distance, decay = 2 }: {
  position: [number, number, number];
  color?: string;
  intensity: number;
  distance: number;
  decay?: number;
}) {
  const ref = useRef<Object3D>(null);
  const entry = useRef<LampEntry | null>(null);
  useEffect(() => {
    const e: LampEntry = { object: ref.current, color: new Color(), intensity: 0, distance: 0, decay: 2 };
    entry.current = e;
    lamps.add(e);
    return () => { lamps.delete(e); };
  }, []);
  // After every render, so the pool always lights the lamp as it is now
  useEffect(() => {
    const e = entry.current;
    if (!e) return;
    e.color.set(color);
    e.intensity = intensity;
    e.distance = distance;
    e.decay = decay;
  });
  return <object3D ref={ref} position={position} />;
}

export function LampPool({ focus }: { focus: { position: { x: number; z: number } } }) {
  const lights = useRef<(PointLight | null)[]>([]);
  useFrame(() => {
    const placed = [...lamps].flatMap((l) => {
      if (!l.object) return [];
      l.object.getWorldPosition(lampPosition);
      return [{ lamp: l, x: lampPosition.x, y: lampPosition.y, z: lampPosition.z, intensity: l.intensity, distance: l.distance }];
    });
    const chosen = nearestLamps(placed, focus.position.x, focus.position.z, LAMP_POOL_SIZE);
    lights.current.forEach((light, i) => {
      if (!light) return;
      const c = chosen[i];
      if (!c) { light.intensity = 0; return; }
      light.position.set(c.x, c.y, c.z);
      light.color.copy(c.lamp.color);
      light.intensity = c.intensity;
      light.distance = c.distance;
      light.decay = c.lamp.decay;
    });
  });
  return (
    <>
      {Array.from({ length: LAMP_POOL_SIZE }, (_, i) => (
        <pointLight key={i} ref={(l) => { lights.current[i] = l; }} intensity={0} />
      ))}
    </>
  );
}
