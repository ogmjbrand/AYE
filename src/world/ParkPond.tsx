/**
 * The park's pond: an oval of water in a stone rim, with a fountain in the middle. The water
 * ripples under the fountain's falling drops and the rain, and as you walk along its edge (vfx:
 * WaterSurface, Spray). Its rim is solid (lib/world.ts adds it to the obstacles).
 */
import { useMemo } from 'react';
import { MeshStandardMaterial } from 'three';
import { getPlayerHandle } from '../hooks/usePlayerController';
import { WaterSurface } from '../vfx/WaterSurface';
import { Mist, Spray } from '../vfx/WaterFx';

const WATER_Y = 0.3;
/** How close to the rim your steps still stir the water (metres). */
const REACH = 0.8;

export function ParkPond({ pond, rain = 0 }: { pond: { x: number; z: number; rx: number; rz: number }; rain?: number }) {
  const stone = useMemo(() => new MeshStandardMaterial({ color: '#b9ae9a', roughness: 0.85 }), []);
  const basin = useMemo(() => new MeshStandardMaterial({ color: '#33402f', roughness: 1 }), []);
  const { x, z, rx, rz } = pond;
  // Walking along the rim stirs the edge of the water nearest you
  const wader = useMemo(() => () => {
    const p = getPlayerHandle().position;
    const ex = (p.x - x) / (rx + REACH), ez = (p.z - z) / (rz + REACH);
    if (ex * ex + ez * ez > 1) return null;
    const a = Math.atan2(p.z - z, p.x - x);
    return { x: x + Math.cos(a) * rx * 0.85, z: z + Math.sin(a) * rz * 0.85 };
  }, [x, z, rx, rz]);
  return (
    <group>
      {/* The rim: a low stone wall round the oval, and the basin's dark floor */}
      <mesh material={stone} position={[x, 0.2, z]} scale={[rx + 0.12, 1, rz + 0.12]} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 0.4, 40, 1, true]} />
      </mesh>
      <mesh material={stone} position={[x, 0.41, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[rx + 0.12, rz + 0.12, 1]}>
        <ringGeometry args={[0.9, 1.05, 40]} />
      </mesh>
      <mesh material={basin} position={[x, 0.06, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[rx, rz, 1]}>
        <circleGeometry args={[1, 40]} />
      </mesh>
      {/* The fountain: a pedestal and its jet */}
      <mesh material={stone} position={[x, 0.35, z]} castShadow><cylinderGeometry args={[0.12, 0.2, 0.5, 12]} /></mesh>
      <WaterSurface kind="pool" round position={[x, WATER_Y, z]} size={[rx * 2, rz * 2]} colour="#2f5a52" opacity={0.9} rain={Math.max(0.3, rain)} wader={wader} />
      <Spray origin={[x, 0.62, z]} velocity={[0, 3.1, 0]} life={0.65} spread={0.07} size={0.045} share={0.5} />
      <Mist position={[x, WATER_Y + 0.05, z]} radius={0.5} rise={0.6} density={0.18} count={5} />
    </group>
  );
}
