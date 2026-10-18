import { useMemo } from 'react';
import { DoubleSide } from 'three';
import { useDistrict } from './DistrictContext';
import { isOpen } from '../lib/nightlife';
import { groundHeightAt } from '../lib/world';

/**
 * The lounge's street front: a warm lit doorway, a neon strip under its name
 * board and a pool of light on the pavement, all lit only while it's open.
 * Emissive surfaces rather than real lights, so it costs next to nothing.
 */
export function VenueFront({ hour, night }: { hour: number; night: number }) {
  const district = useDistrict();
  const venue = district.nightlife;
  const chairs = district.layout.terraceChairs;
  const spot = useMemo(() => {
    const b = district.layout.buildings.find((x) => x.name === venue.name);
    if (!b) return null;
    // Buildings east of the road (x > 0) face the street on their west side, and the other way round
    const east = b.position[0] > 0;
    const faceX = east ? b.position[0] - b.size[0] / 2 - 0.04 : b.position[0] + b.size[0] / 2 + 0.04;
    return { faceX, z: b.position[2], width: b.size[2], rotationY: east ? -Math.PI / 2 : Math.PI / 2, out: east ? -1 : 1 };
  }, [district, venue.name]);
  if (!spot) return null;

  const open = isOpen({ hour });
  // Daytime: the doorway is just a dark entrance; evenings it glows
  const glow = open ? 0.25 + 0.55 * night : 0;
  const base = groundHeightAt(spot.faceX + spot.out * 0.5, spot.z);
  return (
    <group>
      {/* Doorway */}
      <mesh position={[spot.faceX, base + 1.15, spot.z]} rotation={[0, spot.rotationY, 0]}>
        <planeGeometry args={[Math.min(1.6, spot.width * 0.45), 2.3]} />
        <meshStandardMaterial color="#1b1512" emissive="#d9803f" emissiveIntensity={glow} roughness={0.8} />
      </mesh>
      {/* Neon strip just under the name board */}
      <mesh position={[spot.faceX + spot.out * 0.03, base + 3.45, spot.z]} rotation={[0, spot.rotationY, 0]}>
        <planeGeometry args={[spot.width * 0.85, 0.09]} />
        <meshStandardMaterial color="#3a2f4a" emissive="#a98cf0" emissiveIntensity={open ? 1.2 + 2 * night : 0} toneMapped={false} />
      </mesh>
      {/* Terrace chairs either side of the door: a low wooden frame, cushion and backrest (solid: lib/world.ts) */}
      {chairs.map((c, i) => {
        const y = groundHeightAt(c.x, c.z);
        return (
          <group key={i} position={[c.x, y, c.z]} rotation={[0, c.facing, 0]}>
            <mesh position={[0, 0.2, 0]} castShadow>
              <boxGeometry args={[0.58, 0.4, 0.55]} />
              <meshStandardMaterial color="#4a3a2c" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.43, 0.02]}>
              <boxGeometry args={[0.52, 0.06, 0.48]} />
              <meshStandardMaterial color="#8c7a64" roughness={0.95} />
            </mesh>
            <mesh position={[0, 0.66, -0.25]} castShadow>
              <boxGeometry args={[0.58, 0.46, 0.07]} />
              <meshStandardMaterial color="#4a3a2c" roughness={0.85} />
            </mesh>
          </group>
        );
      })}
      {/* Light spilling onto the pavement */}
      {open && night > 0.05 && (
        <mesh position={[spot.faceX + spot.out * 1.4, base + 0.02, spot.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.6, 24]} />
          <meshBasicMaterial color="#ffb070" transparent opacity={0.18 * night} depthWrite={false} side={DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
