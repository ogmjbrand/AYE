import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { Dish } from '../lib/food';
import { RESTAURANT_TABLES, restaurantTableById } from '../lib/interiors';

const DINER_COLORS = ['#7b3f32', '#315b56', '#a47a38', '#4a506d'];

function Diner({ x, z, facing, color, phase }: { x: number; z: number; facing: number; color: string; phase: number }) {
  const body = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    if (body.current) body.current.position.y = Math.sin(t * 1.6) * 0.012;
  });
  return (
    <group position={[x, 0.45, z]} rotation={[0, facing, 0]}>
      <group ref={body}>
        <mesh position={[0, 0.32, 0]} castShadow>
          <capsuleGeometry args={[0.19, 0.36, 3, 8]} />
          <meshStandardMaterial color={color} roughness={0.82} />
        </mesh>
        <mesh position={[0, 0.72, 0.01]} castShadow>
          <sphereGeometry args={[0.15, 12, 10]} />
          <meshStandardMaterial color="#855b45" roughness={0.9} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.23, 0.29, 0.06]} rotation={[0, 0, side * -0.2]} castShadow>
            <capsuleGeometry args={[0.055, 0.28, 3, 6]} />
            <meshStandardMaterial color={color} roughness={0.82} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Waiter() {
  const person = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime * 0.42) % 1;
    const z = -4.1 + t * 9;
    if (person.current) {
      person.current.position.set(0, 0, z);
      person.current.rotation.y = t < 0.5 ? 0 : Math.PI;
    }
  });
  return (
    <group ref={person}>
      <mesh position={[0, 0.88, 0]} castShadow>
        <capsuleGeometry args={[0.18, 0.65, 3, 8]} />
        <meshStandardMaterial color="#252321" roughness={0.75} />
      </mesh>
      <mesh position={[0, 1.37, 0]} castShadow>
        <sphereGeometry args={[0.14, 12, 10]} />
        <meshStandardMaterial color="#79543e" roughness={0.9} />
      </mesh>
      <mesh position={[0.25, 0.94, 0.12]} castShadow>
        <boxGeometry args={[0.34, 0.035, 0.25]} />
        <meshStandardMaterial color="#c9a86a" metalness={0.15} roughness={0.6} />
      </mesh>
    </group>
  );
}

function MealPlate({ tableId, dish }: { tableId: string; dish: Dish }) {
  const table = restaurantTableById(tableId);
  if (!table) return null;
  const mealColor = /fish|tilapia|catfish|prawn|salmon|octopus/i.test(dish.id) ? '#b85c35'
    : /rice|jollof|waakye|githeri|koshari|paella|plov/i.test(dish.id) ? '#c58b3d'
      : /soup|stew|curry|wat/i.test(dish.id) ? '#9a4e2e' : '#8c7540';
  return (
    <group position={[table.at[0], 0.84, table.at[1]]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.36, 0.32, 0.045, 28]} />
        <meshStandardMaterial color="#f0e8d9" roughness={0.26} />
      </mesh>
      <mesh position={[0, 0.055, 0]} castShadow>
        <sphereGeometry args={[0.22, 18, 12]} />
        <meshStandardMaterial color={mealColor} roughness={0.82} />
      </mesh>
      <mesh position={[0.16, 0.06, 0.08]} castShadow>
        <sphereGeometry args={[0.075, 12, 8]} />
        <meshStandardMaterial color="#617344" roughness={0.85} />
      </mesh>
      <mesh position={[-0.14, 0.055, -0.1]} castShadow>
        <sphereGeometry args={[0.065, 12, 8]} />
        <meshStandardMaterial color="#d6b65f" roughness={0.8} />
      </mesh>
      <pointLight position={[0, 0.4, 0]} intensity={0.18} distance={1.4} color="#ffcf83" />
    </group>
  );
}

export function RestaurantScene({ tableId, dish }: { tableId: string | null; dish: Dish | null }) {
  const reservedSeats = [RESTAURANT_TABLES[1].seats[0], RESTAURANT_TABLES[1].seats[1], RESTAURANT_TABLES[3].seats[0], RESTAURANT_TABLES[3].seats[1]];
  return (
    <>
      {RESTAURANT_TABLES.map((table) => (
        <group key={`${table.id}-pendant`} position={[table.at[0], 2.65, table.at[1]]}>
          <mesh position={[0, -0.16, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.32, 8]} />
            <meshStandardMaterial color="#c9a86a" metalness={0.68} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.36, 0]}>
            <cylinderGeometry args={[0.14, 0.35, 0.18, 20, 1, true]} />
            <meshStandardMaterial color="#36271e" metalness={0.25} roughness={0.5} />
          </mesh>
          <pointLight position={[0, -0.48, 0]} intensity={1.25} distance={4.5} decay={2} color="#ffd59a" />
        </group>
      ))}
      <ambientLight intensity={0.12} color="#e7c69a" />
      {reservedSeats.map((seat, index) => (
        <Diner key={seat.id} x={seat.x} z={seat.z} facing={seat.facing} color={DINER_COLORS[index]} phase={index * 1.2} />
      ))}
      <Waiter />
      {dish && tableId && <MealPlate tableId={tableId} dish={dish} />}
    </>
  );
}
