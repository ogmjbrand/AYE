import { useMemo } from 'react';
import { useDistrict } from './DistrictContext';
import { groundHeightAt } from '../lib/world';
import { plainSign } from './signs';
import { PottedPalm } from './PottedPalm';

/**
 * OGM Homes, the estate agency: a glass shop front lit from inside, the name
 * board over the door and boards in the window of the homes for sale.
 */
export function AgencyFront({ night }: { night: number }) {
  const district = useDistrict();
  const a = district.agency;
  const sign = useMemo(() => (a ? plainSign(a.name.toUpperCase(), a.kind) : null), [a]);
  const board = useMemo(() => plainSign('FOR SALE', 'Starter · Family · Villa'), []);
  const b = useMemo(() => (a ? district.layout.buildings.find((x) => x.name === a.name) : undefined), [district, a]);
  if (!a || !b || !sign) return null;
  const side = a.door[2] >= b.position[2] ? 1 : -1;
  const faceZ = b.position[2] + side * (b.size[2] / 2 + 0.03);
  const x0 = b.position[0];
  const w = b.size[0];
  const base = groundHeightAt(a.door[0], a.door[2]);
  const lit = 0.35 + 0.65 * night;
  return (
    <group position={[0, base, side > 0 ? 0 : 2 * faceZ]} scale={[1, 1, side]}>
      <mesh position={[x0, 1.7, faceZ]}>
        <planeGeometry args={[w - 0.4, 3.2]} />
        <meshStandardMaterial color="#1b2026" emissive="#f4ead8" emissiveIntensity={0.2 + 0.45 * lit} roughness={0.05} metalness={0.6} />
      </mesh>
      {[-1, 1].map((k) => (
        <mesh key={k} position={[x0 + k * 2.6, 1.5, faceZ + 0.02]}>
          <planeGeometry args={[1.6, 0.8]} />
          <meshStandardMaterial map={board} emissiveMap={board} emissive="#ffffff" emissiveIntensity={0.2 + 0.5 * night} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[x0, 3.75, faceZ + 0.02]}>
        <planeGeometry args={[5.2, 1.2]} />
        <meshStandardMaterial map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={0.3 + 0.7 * night} toneMapped={false} />
      </mesh>
      <PottedPalm position={[x0 - w / 2 + 0.6, 0, faceZ + 0.6]} height={1.8} />
      <PottedPalm position={[x0 + w / 2 - 0.6, 0, faceZ + 0.6]} height={1.8} rotation={1.3} />
    </group>
  );
}
