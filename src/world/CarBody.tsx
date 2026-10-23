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
      {!s.trim && (
        <mesh position={[0, s.ground + s.body * 0.45, l / 2 + 0.005]} material={chrome}>
          <boxGeometry args={[s.w * 0.42, s.body * 0.32, 0.02]} />
        </mesh>
      )}
      {s.trim === 'ev' && (
        // Electric: a closed nose with a full-width LED light bar, a black lower intake, black arches and a black roof
        <>
          <mesh position={[0, s.ground + s.body * 0.8, l / 2 + 0.008]}><boxGeometry args={[s.w * 0.86, 0.025, 0.02]} /><meshStandardMaterial color="#f4f6f8" emissive="#e8f4ff" emissiveIntensity={lightsOn ? 4 : 1.2} toneMapped={!lightsOn} /></mesh>
          <mesh position={[0, s.ground + s.body * 0.22, l / 2 + 0.006]}><boxGeometry args={[s.w * 0.6, s.body * 0.2, 0.02]} /><meshStandardMaterial color="#141416" roughness={0.6} /></mesh>
          {[-1, 1].map((sx) => <mesh key={sx} position={[sx * s.w * 0.38, s.ground + s.body * 0.4, l / 2 + 0.008]} rotation={[0, 0, sx * 0.5]}><boxGeometry args={[0.025, s.body * 0.35, 0.02]} /><meshStandardMaterial color="#d9dcdf" metalness={1} roughness={0.15} /></mesh>)}
          <RoundedBox args={[s.w - 0.18, 0.07, cabinL * 0.9]} radius={0.03} smoothness={2} position={[0, s.roof - 0.01, s.cabin * l * 0.5]}><meshStandardMaterial color="#0e0f11" roughness={0.3} metalness={0.3} /></RoundedBox>
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
            <mesh key={`a${sx}${sz}`} position={[sx * (s.w / 2 + 0.004), s.wheel + 0.04, sz * (l / 2 - 0.78)]} rotation={[0, sx * Math.PI / 2, 0]}><ringGeometry args={[s.wheel + 0.02, s.wheel + 0.1, 24, 1, 0, Math.PI]} /><meshStandardMaterial color="#141416" roughness={0.7} side={2} /></mesh>
          )))}
        </>
      )}
      {s.trim === 'flagship' && (
        // Flagship: a tall chrome grille of vertical slats, a chrome window line and a lower chrome lip
        <>
          <mesh position={[0, s.ground + s.body * 0.5, l / 2 + 0.006]}><boxGeometry args={[s.w * 0.46, s.body * 0.62, 0.02]} /><meshStandardMaterial color="#0c0d10" roughness={0.4} /></mesh>
          {Array.from({ length: 13 }, (_, i) => (
            <mesh key={i} position={[-s.w * 0.21 + (i * s.w * 0.42) / 12, s.ground + s.body * 0.5, l / 2 + 0.018]} material={chrome}><boxGeometry args={[0.012, s.body * 0.58, 0.012]} /></mesh>
          ))}
          <mesh position={[0, s.ground + s.body * 0.5, l / 2 + 0.02]} material={chrome}><torusGeometry args={[0.001, 0.001, 2, 3]} /></mesh>
          {[-1, 1].map((sx) => <mesh key={sx} position={[sx * (s.w / 2 - 0.07), bodyTop + cabinH * 0.5, s.cabin * l * 0.5]} material={chrome}><boxGeometry args={[0.012, 0.02, cabinL * 0.95]} /></mesh>)}
          <mesh position={[0, s.ground + 0.08, l / 2 + 0.01]} material={chrome}><boxGeometry args={[s.w * 0.8, 0.02, 0.02]} /></mesh>
        </>
      )}
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
