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
