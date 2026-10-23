import { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import { MeshPhysicalMaterial, MeshStandardMaterial } from 'three';
import { carById } from '../lib/cars';
import { CAR_SHAPE as SHAPE } from '../lib/carShapes';



/**
 * A car in the game's own style, front towards +z: a rounded body in glossy
 * clear-coated paint, tinted glass, chrome trim, head and tail lights and
 * alloy wheels. Origin on the ground at the middle of the car.
 */
export function CarBody({ model, color, lightsOn = false }: { model: string; color: string; lightsOn?: boolean }) {
  const s = SHAPE[model] ?? SHAPE.saloon;
  const car = carById(model);
  const l = car?.length ?? s.l;
  const paint = useMemo(() => new MeshPhysicalMaterial({ color, roughness: 0.32, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.06 }), [color]);
  const glass = useMemo(() => new MeshPhysicalMaterial({ color: '#0d1318', roughness: 0.05, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.6 }), []);
  const chrome = useMemo(() => new MeshStandardMaterial({ color: '#d9dcdf', roughness: 0.12, metalness: 1 }), []);
  const rubber = useMemo(() => new MeshStandardMaterial({ color: '#121212', roughness: 0.9 }), []);
  const rim = useMemo(() => new MeshStandardMaterial({ color: '#b9bcbf', roughness: 0.25, metalness: 0.9 }), []);
  const bodyTop = s.ground + s.body;
  const cabinH = s.roof - bodyTop;
  const cabinL = l * s.cabinLen;
  return (
    <group>
      {/* Body */}
      <RoundedBox args={[s.w, s.body, l]} radius={0.16} smoothness={4} position={[0, s.ground + s.body / 2, 0]} material={paint} castShadow receiveShadow />
      {/* Glasshouse: tinted glass, then a painted roof */}
      <RoundedBox args={[s.w - 0.16, cabinH, cabinL]} radius={0.14} smoothness={4} position={[0, bodyTop + cabinH / 2 - 0.02, s.cabin * l * 0.5]} material={glass} castShadow />
      <RoundedBox args={[s.w - 0.2, 0.06, cabinL * 0.86]} radius={0.03} smoothness={2} position={[0, s.roof - 0.02, s.cabin * l * 0.5]} material={paint} />
      {/* Chrome belt line and grille */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (s.w / 2 + 0.005), bodyTop - 0.04, 0]} material={chrome}>
          <boxGeometry args={[0.012, 0.025, l * 0.8]} />
        </mesh>
      ))}
      <mesh position={[0, s.ground + s.body * 0.45, l / 2 + 0.005]} material={chrome}>
        <boxGeometry args={[s.w * 0.42, s.body * 0.32, 0.02]} />
      </mesh>
      {/* Headlights and tail lights */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <mesh position={[sx * s.w * 0.36, s.ground + s.body * 0.62, l / 2 + 0.006]}>
            <boxGeometry args={[s.w * 0.22, 0.08, 0.02]} />
            <meshStandardMaterial color="#f4f6f8" emissive="#fff6e0" emissiveIntensity={lightsOn ? 4 : 0.6} toneMapped={!lightsOn} />
          </mesh>
          <mesh position={[sx * s.w * 0.38, s.ground + s.body * 0.7, -l / 2 - 0.006]}>
            <boxGeometry args={[s.w * 0.2, 0.07, 0.02]} />
            <meshStandardMaterial color="#7a0d14" emissive="#ff2030" emissiveIntensity={lightsOn ? 2.5 : 0.4} toneMapped={!lightsOn} />
          </mesh>
        </group>
      ))}
      {/* Wheels: tyre, alloy rim and five spokes */}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <group key={`${sx}${sz}`} position={[sx * (s.w / 2 - 0.04), s.wheel, sz * (l / 2 - 0.78)]} rotation={[0, 0, Math.PI / 2]}>
          <mesh material={rubber} castShadow>
            <cylinderGeometry args={[s.wheel, s.wheel, 0.24, 24]} />
          </mesh>
          <mesh position={[0, sx * 0.121, 0]} material={rim}>
            <cylinderGeometry args={[s.wheel * 0.68, s.wheel * 0.68, 0.01, 24]} />
          </mesh>
          {Array.from({ length: 5 }, (_, i) => (
            <mesh key={i} position={[0, sx * 0.125, 0]} rotation={[0, (i * Math.PI * 2) / 5, 0]} material={chrome}>
              <boxGeometry args={[s.wheel * 1.2, 0.012, 0.04]} />
            </mesh>
          ))}
        </group>
      )))}
      {/* Mirrors */}
      {[-1, 1].map((sx) => (
        <mesh key={`m${sx}`} position={[sx * (s.w / 2 + 0.08), bodyTop + 0.12, s.cabin * l * 0.5 + cabinL / 2 - 0.1]} material={paint}>
          <boxGeometry args={[0.14, 0.1, 0.18]} />
        </mesh>
      ))}
    </group>
  );
}
