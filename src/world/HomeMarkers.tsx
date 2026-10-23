import { useMemo } from 'react';
import { DoubleSide } from 'three';
import { groundHeightAt } from '../lib/world';
import { signTexture } from './textures';
import { useDistrict } from './DistrictContext';

/**
 * Marks homes on the street: a "To let" board beside the door of every flat
 * you could rent, and a warm ring at your own front door. Also the board at
 * the district's travel desk.
 */
export function HomeMarkers({ homeId }: { homeId: string | null }) {
  const district = useDistrict();
  const { homes, layout } = district;
  const boards = useMemo(() => {
    const toLet = signTexture('To let', '#2c3338', '#f1ede6', 256, 128);
    const sale = signTexture('For sale', '#1f4a3a', '#f1ede6', 256, 128);
    const yours = signTexture('Home', '#4a3a26', '#f6e7c8', 256, 128);
    return homes.map((h) => {
      const building = layout.buildings.find((b) => b.name === h.building);
      // Face away from the building, out to the street
      const [dx, dz] = building ? [h.door[0] - building.position[0], h.door[2] - building.position[2]] : [0, 1];
      const facing = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? Math.PI / 2 : -Math.PI / 2) : dz > 0 ? 0 : Math.PI;
      // Beside the door, along the facade, so it never blocks the way in
      const along: [number, number] = Math.abs(dx) > Math.abs(dz) ? [0, 1.3] : [1.3, 0];
      const x = h.door[0] + along[0];
      const z = h.door[2] + along[1];
      return { id: h.id, x, z, y: groundHeightAt(x, z, layout), facing, toLet: h.price !== undefined ? sale : toLet, yours, door: h.door };
    });
  }, [homes, layout]);
  const travel = useMemo(() => {
    const [x, , z] = district.travelDesk.position;
    // Beside the desk, facing the boulevard
    const side = Math.sign(x) || 1;
    return { tex: signTexture('Travel', '#23384a', '#f1ede6', 256, 128), x: x + side * 0.9, z: z + 1.2, facing: side > 0 ? -Math.PI / 2 : Math.PI / 2 };
  }, [district]);

  return (
    <>
      <group position={[travel.x, groundHeightAt(travel.x, travel.z, layout), travel.z]} rotation={[0, travel.facing, 0]}>
        <mesh position={[0, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 2.2, 8]} />
          <meshStandardMaterial color="#3b3d40" roughness={0.6} metalness={0.4} />
        </mesh>
        <mesh position={[0, 2.05, 0.05]} castShadow>
          <planeGeometry args={[1.2, 0.6]} />
          <meshStandardMaterial map={travel.tex} side={DoubleSide} roughness={0.7} emissiveMap={travel.tex} emissive="#ffffff" emissiveIntensity={0.15} />
        </mesh>
      </group>
      {boards.map((b) => {
        const mine = b.id === homeId;
        return (
          <group key={b.id}>
            <group position={[b.x, b.y, b.z]} rotation={[0, b.facing, 0]}>
              <mesh position={[0, 0.8, 0]} castShadow>
                <cylinderGeometry args={[0.035, 0.035, 1.6, 8]} />
                <meshStandardMaterial color="#3b3d40" roughness={0.6} metalness={0.4} />
              </mesh>
              <mesh position={[0, 1.55, 0.04]} castShadow>
                <planeGeometry args={[0.8, 0.4]} />
                <meshStandardMaterial map={mine ? b.yours : b.toLet} side={DoubleSide} roughness={0.7} emissiveMap={mine ? b.yours : b.toLet} emissive="#ffffff" emissiveIntensity={0.12} />
              </mesh>
            </group>
            {mine && (
              <mesh position={[b.door[0], groundHeightAt(b.door[0], b.door[2], layout) + 0.03, b.door[2]]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[1.2, 1.6, 48]} />
                <meshStandardMaterial color="#e8b86a" emissive="#e8b86a" emissiveIntensity={0.7} transparent opacity={0.7} depthWrite={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}
