import { useMemo } from 'react';
import { DoubleSide, PlaneGeometry } from 'three';
import { bedSurface, duvetHeight, type SleepPose } from '../lib/bedSleep';
import type { Furniture } from '../lib/interiors';

/**
 * The duvet pulled up over someone asleep in a home bed: one soft sheet
 * shaped over the body (lib/bedSleep.ts), hanging over the sides and the
 * foot of the bed, with the top sheet turned back across the chest.
 */
export function SleepingDuvet({ bed, pose }: { bed: Furniture; pose: SleepPose }) {
  const [w, , d] = bed.size;
  const surface = bedSurface(bed);
  const foot = -d / 2 - 0.12;
  const length = pose.chestZ - foot;
  const geometry = useMemo(() => {
    const width = w + 0.22;
    const g = new PlaneGeometry(width, length, 36, 48);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i) + foot + length / 2;
      p.setXYZ(i, x, surface + duvetHeight(x, z, w, d, pose), z);
    }
    g.computeVertexNormals();
    return g;
  }, [w, d, length, foot, surface, pose]);
  // The turned-back top sheet: a soft roll across the chest, following the ridge
  const fold = surface + duvetHeight(0, pose.chestZ, w, d, pose);
  const color = bed.style === 'luxe' ? '#f2ede4' : bed.color;
  return (
    <group position={[bed.at[0], bed.elevation ?? 0, bed.at[1]]} rotation={[0, pose.heading, 0]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.95} side={DoubleSide} />
      </mesh>
      <mesh position={[0, fold - 0.06, pose.chestZ]} rotation={[0, 0, Math.PI / 2]} scale={[0.6, 1, 1]} castShadow>
        <capsuleGeometry args={[0.07, w - 0.2, 6, 16]} />
        <meshStandardMaterial color="#f7f4ee" roughness={0.9} />
      </mesh>
    </group>
  );
}
