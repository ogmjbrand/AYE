import { useMemo } from 'react';
import { useDistrict } from './DistrictContext';
import { groundHeightAt } from '../lib/world';
import { plainSign } from './signs';
import { PottedPalm } from './PottedPalm';
import { Lamp } from './LampPool';

/**
 * Alafia Spa's entrance: a warm-lit glass front with teak frames, the name
 * board over the door, a lantern either side and palms in tall pots.
 */
export function SpaFront({ night }: { night: number }) {
  const district = useDistrict();
  const s = district.spa;
  const sign = useMemo(() => (s ? plainSign(s.name.toUpperCase(), 'Massage · Hot stone · Couples') : null), [s]);
  const b = useMemo(() => (s ? district.layout.buildings.find((x) => x.name === s.name) : undefined), [district, s]);
  if (!s || !b || !sign) return null;
  // The front faces the door (−z on the Lagos plan)
  const side = s.door[2] >= b.position[2] ? 1 : -1;
  const faceZ = b.position[2] + side * (b.size[2] / 2 + 0.03);
  const x0 = s.door[0];
  const base = groundHeightAt(s.door[0], s.door[2]);
  const glow = 0.3 + 0.8 * night;
  return (
    // Drawn facing +z from the front's own line, then turned round when the front faces −z (text stays readable)
    <group position={[x0, base, faceZ]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
      <mesh position={[0, 1.4, 0]}>
        <planeGeometry args={[6, 2.8]} />
        <meshStandardMaterial color="#2a2018" emissive="#ffcf9a" emissiveIntensity={glow * 0.55} roughness={0.08} metalness={0.4} />
      </mesh>
      {[-3, -1, 1, 3].map((x) => <mesh key={x} position={[x, 1.4, 0.02]}><boxGeometry args={[0.08, 2.8, 0.05]} /><meshStandardMaterial color="#6e4a2c" roughness={0.5} /></mesh>)}
      <mesh position={[0, 3.35, 0.02]}>
        <planeGeometry args={[4.8, 1.1]} />
        <meshStandardMaterial map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={0.3 + 0.7 * night} toneMapped={false} />
      </mesh>
      {[-1, 1].map((k) => (
        <group key={k} position={[k * 1.7, 0, 0.5]}>
          <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.22, 0.9, 0.22]} /><meshStandardMaterial color="#2a2018" roughness={0.6} /></mesh>
          <mesh position={[0, 0.98, 0]}><boxGeometry args={[0.18, 0.2, 0.18]} /><meshStandardMaterial color="#fff2d6" emissive="#ffb36a" emissiveIntensity={0.5 + 1.5 * night} toneMapped={false} /></mesh>
        </group>
      ))}
      <PottedPalm position={[-3.6, 0, 0.7]} height={2.3} />
      <PottedPalm position={[3.6, 0, 0.7]} height={2.3} rotation={1.1} />
      <Lamp position={[0, 2.5, 1.2]} intensity={0.8 + 3 * night} distance={7} decay={1.7} color="#ffd2a0" />
    </group>
  );
}
