import { RealModel } from './RealModel';

/**
 * The Grand Lagoon Hotel's room service and vending drinks, at real size with
 * the origin on the table top. The sandwich and bento are CC-BY 4.0 models
 * (see public/assets/CREDITS.md); the bottles and can are built here. Loading
 * suspends, so the menu's snapshot waits for the models.
 */

function M({ color, rough = 0.4, opacity }: { color: string; rough?: number; opacity?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} transparent={opacity !== undefined} opacity={opacity ?? 1} />;
}

/** A room-service tray: dark wood with a white napkin. */
function Tray({ w = 0.34, d = 0.26 }: { w?: number; d?: number }) {
  return (
    <group>
      <mesh position={[0, 0.006, 0]} castShadow receiveShadow><boxGeometry args={[w, 0.012, d]} /><M color="#4a3a30" rough={0.5} /></mesh>
      <mesh position={[w / 2 - 0.05, 0.013, 0]} rotation={[-Math.PI / 2, 0, 0.1]}><planeGeometry args={[0.06, 0.16]} /><M color="#f6f4ee" rough={0.95} /></mesh>
    </group>
  );
}

/** A plastic bottle: body, label band and cap. */
function Bottle({ liquid, label, cap, opacity = 0.75 }: { liquid: string; label: string; cap: string; opacity?: number }) {
  return (
    <group>
      <mesh position={[0, 0.08, 0]} castShadow><cylinderGeometry args={[0.032, 0.032, 0.16, 20]} /><M color={liquid} rough={0.1} opacity={opacity} /></mesh>
      <mesh position={[0, 0.18, 0]}><cylinderGeometry args={[0.013, 0.032, 0.04, 20]} /><M color={liquid} rough={0.1} opacity={opacity} /></mesh>
      <mesh position={[0, 0.09, 0]}><cylinderGeometry args={[0.0335, 0.0335, 0.06, 20, 1, true]} /><M color={label} rough={0.6} /></mesh>
      <mesh position={[0, 0.208, 0]}><cylinderGeometry args={[0.014, 0.014, 0.018, 14]} /><M color={cap} rough={0.5} /></mesh>
    </group>
  );
}

function Can({ color, band }: { color: string; band: string }) {
  return (
    <group>
      <mesh position={[0, 0.06, 0]} castShadow><cylinderGeometry args={[0.033, 0.033, 0.12, 24]} /><meshStandardMaterial color={color} metalness={0.5} roughness={0.35} /></mesh>
      <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.0335, 0.0335, 0.03, 24, 1, true]} /><M color={band} /></mesh>
      <mesh position={[0, 0.122, 0]}><cylinderGeometry args={[0.028, 0.033, 0.006, 24]} /><meshStandardMaterial color="#d9dcdf" metalness={0.9} roughness={0.25} /></mesh>
    </group>
  );
}

/** The dish or drink with this hotel menu id (lib/hotel.ts HOTEL_DISH_IDS). */
export function HotelDish({ id }: { id: string }) {
  switch (id) {
    case 'room-sub':
      return (
        <group>
          <Tray />
          <group position={[-0.03, 0.012, 0]}><RealModel suspend name="sub-sandwich" fit={[0.26, 0.09, 0.12]} rotationY={Math.PI / 2} /></group>
        </group>
      );
    case 'room-bento':
      return (
        <group>
          <Tray />
          <group position={[-0.03, 0.012, 0]}><RealModel suspend name="bento-box" fit={[0.24, 0.07, 0.18]} /></group>
        </group>
      );
    case 'room-breakfast':
      return (
        <group>
          <Tray />
          <group position={[-0.08, 0.012, -0.04]}><RealModel suspend name="pastry" /></group>
          <group position={[0.02, 0.012, 0.06]}><RealModel suspend name="bread-roll" /></group>
          <group position={[0.08, 0.012, -0.06]}><RealModel suspend name="pear" /></group>
          <group position={[0.12, 0.012, 0.05]}><RealModel suspend name="kiwi" /></group>
        </group>
      );
    case 'room-cake':
      return (
        <group>
          <mesh position={[0, 0.006, 0]} castShadow receiveShadow><cylinderGeometry args={[0.1, 0.085, 0.012, 32]} /><meshStandardMaterial color="#f6f4ee" roughness={0.25} /></mesh>
          <group position={[0, 0.012, 0]}><RealModel suspend name="cake" /></group>
        </group>
      );
    case 'vend-water':
      return <Bottle liquid="#d8ecf6" label="#2b8ac8" cap="#2b6cc8" opacity={0.45} />;
    case 'vend-juice':
      return <Bottle liquid="#f39a1e" label="#fff3d0" cap="#2b8a3e" opacity={0.9} />;
    case 'vend-tea':
      return <Bottle liquid="#b8661e" label="#f6d04a" cap="#f2f2f2" opacity={0.85} />;
    case 'vend-soda':
      return <Can color="#2b8a3e" band="#f2e2a0" />;
    default:
      return null;
  }
}
