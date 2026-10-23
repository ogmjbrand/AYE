import { Environment, Lightformer } from '@react-three/drei';
import type { IndoorMood } from './indoorMoods';
import { INDOOR } from './indoorMoods';

/**
 * Reflections for interiors: a real lounge photographed all round (ambientCG
 * IndoorEnvironmentHDRI013, CC0) with glowing panels and rings laid over it,
 * so the room's own ceiling lights and ring lamps show up in marble, brass,
 * glass and velvet the way a real room's lights would.
 */
export function IndoorEnvironment({ mood }: { mood: IndoorMood }) {
  const m = INDOOR[mood];
  return (
    <Environment resolution={256} frames={1} environmentIntensity={m.env} files={`${import.meta.env.BASE_URL}assets/hdri/lounge-indoor_1k.exr`}>
      {/* Ceiling panels */}
      <Lightformer form="rect" intensity={2.2} color={m.panel} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 6, 1]} />
      <Lightformer form="ring" intensity={4} color={m.ring} position={[-3, 4.5, -2]} rotation-x={Math.PI / 2} scale={2} />
      <Lightformer form="ring" intensity={4} color={m.ring} position={[3, 4.5, 2]} rotation-x={Math.PI / 2} scale={2} />
      {/* Warm walls and a cooler window on one side */}
      <Lightformer form="rect" intensity={0.8} color={m.wall} position={[-8, 1.5, 0]} rotation-y={Math.PI / 2} scale={[12, 3, 1]} />
      <Lightformer form="rect" intensity={0.8} color={m.wall} position={[8, 1.5, 0]} rotation-y={-Math.PI / 2} scale={[12, 3, 1]} />
      <Lightformer form="rect" intensity={0.6} color={m.window} position={[0, 2, 8]} rotation-y={Math.PI} scale={[14, 3, 1]} />
    </Environment>
  );
}
