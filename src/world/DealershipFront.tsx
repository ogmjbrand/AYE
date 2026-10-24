import { useMemo } from 'react';
import { useDistrict } from './DistrictContext';
import { groundHeightAt } from '../lib/world';
import { CARS } from '../lib/cars';
import { CarBody } from './CarBody';
import { plainSign } from './signs';

/**
 * The car dealer's showroom front: a full-height glass face lit from inside,
 * the name board above, and two cars on display either side of the door.
 */
export function DealershipFront({ night }: { night: number }) {
  const district = useDistrict();
  const d = district.dealership;
  const sign = useMemo(() => (d ? plainSign(d.name.toUpperCase(), d.kind) : null), [d]);
  const b = useMemo(() => (d ? district.layout.buildings.find((x) => x.name === d.name) : undefined), [district, d]);
  if (!d || !b || !sign) return null;
  // The front is the side with the door (+z on the Lagos plan; −z where a city's plan is mirrored)
  const side = d.door[2] >= b.position[2] ? 1 : -1;
  const faceZ = b.position[2] + side * (b.size[2] / 2 + 0.03);
  const x0 = b.position[0];
  const w = b.size[0];
  const base = groundHeightAt(d.door[0], d.door[2]);
  const lit = 0.35 + 0.65 * night;
  return (
    // Drawn for a +z front, then mirrored round the front's own line when it faces −z
    <group position={[0, base, side > 0 ? 0 : 2 * faceZ]} scale={[1, 1, side]}>
      {/* Glass showroom wall with slim black mullions */}
      <mesh position={[x0, 2.0, faceZ]}>
        <planeGeometry args={[w - 0.2, 3.8]} />
        <meshStandardMaterial color="#1b2026" emissive="#e8eef4" emissiveIntensity={0.18 + 0.5 * lit} roughness={0.05} metalness={0.6} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[x0 - w / 2 + 0.1 + (i * (w - 0.2)) / 5, 2.0, faceZ + 0.02]}>
          <boxGeometry args={[0.06, 3.8, 0.05]} />
          <meshStandardMaterial color="#111" roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
      <mesh position={[x0, 4.35, faceZ + 0.02]}>
        <planeGeometry args={[5.2, 1.3]} />
        <meshStandardMaterial map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={0.3 + 0.7 * night} toneMapped={false} />
      </mesh>
      {/* Two cars on display, facing the street */}
      <group position={[x0 - 3.2, 0, faceZ + 1.5]} rotation={[0, 0.35, 0]}><CarBody model={CARS[4].id} color={CARS[4].colors[0]} /></group>
      <group position={[x0 + 3.2, 0, faceZ + 1.5]} rotation={[0, -0.35, 0]}><CarBody model={CARS[2].id} color={CARS[2].colors[1]} /></group>
    </group>
  );
}
