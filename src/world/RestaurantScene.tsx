import type { Dish } from '../lib/food';
import { RESTAURANT_TABLES, restaurantTableById } from '../lib/interiors';
import type { PlayerHandle } from '../hooks/usePlayerController';
import { WorldNPC, type NPCPath } from './WorldNPC';
import { NPC_UNIFORMS } from './npcUniforms';

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

export function RestaurantScene({
  tableId,
  dish,
  player,
  onMealDelivered,
  mealDelivered,
}: {
  tableId: string | null;
  dish: Dish | null;
  player: PlayerHandle;
  onMealDelivered: () => void;
  mealDelivered: boolean;
}) {
  const occupiedSeats = [
    { table: RESTAURANT_TABLES[1], seatIndex: 0, lookId: 'male-adult-18' },
    { table: RESTAURANT_TABLES[1], seatIndex: 1, lookId: 'female-adult-11' },
    { table: RESTAURANT_TABLES[3], seatIndex: 0, lookId: 'female-adult-03' },
    { table: RESTAURANT_TABLES[3], seatIndex: 1, lookId: 'male-adult-10' },
  ];
  const deliveryTable = tableId ? restaurantTableById(tableId) : undefined;
  const deliveryZ = deliveryTable ? deliveryTable.at[1] - 1.25 : 0;
  const deliveryPath: NPCPath | undefined = deliveryTable ? [
    [0, 0, 4.9],
    [0, 0, deliveryZ - 0.6],
    [deliveryTable.at[0], 0, deliveryZ - 0.6],
    [deliveryTable.at[0], 0, deliveryZ],
  ] : undefined;
  const servicePath: NPCPath = [[0, 0, -1.3], [0, 0, 4.9], [0, 0, -1.3]];
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
      <group position={[-7, 0, 6.1]}>
        <mesh position={[0, 1.52, -0.43]} receiveShadow>
          <boxGeometry args={[3.25, 1.05, 0.08]} />
          <meshStandardMaterial color="#59483b" roughness={0.8} />
        </mesh>
        <mesh position={[0, 2.17, -0.37]}>
          <boxGeometry args={[2.6, 0.12, 0.45]} />
          <meshStandardMaterial color="#342d28" roughness={0.45} />
        </mesh>
        <mesh position={[0, 1.0, -0.04]}>
          <boxGeometry args={[1.3, 0.08, 0.66]} />
          <meshStandardMaterial color="#262729" metalness={0.2} roughness={0.4} />
        </mesh>
        {[-0.42, 0.42].map((x) => [-0.2, 0.2].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 1.055, z - 0.04]}>
            <torusGeometry args={[0.105, 0.018, 6, 16]} />
            <meshStandardMaterial color="#a9a59d" metalness={0.75} roughness={0.28} />
          </mesh>
        )))}
        <mesh position={[-0.85, 1.18, 0.04]} castShadow>
          <cylinderGeometry args={[0.22, 0.19, 0.22, 24]} />
          <meshStandardMaterial color="#827d75" metalness={0.65} roughness={0.3} />
        </mesh>
      </group>
      {occupiedSeats.map(({ table, seatIndex, lookId }) => {
        const seat = table.seats[seatIndex];
        return (
          <WorldNPC
            key={seat.id}
            lookId={lookId}
            position={[seat.x, seat.height, seat.z]}
            facing={seat.facing}
            seat={seat}
          />
        );
      })}
      <WorldNPC
        lookId="female-adult-06"
        position={[-0.55, 0, -4.05]}
        facing={0}
        player={player}
        greetPlayer
        styles={NPC_UNIFORMS.host}
      />
      <WorldNPC
        lookId="male-adult-04"
        position={[0, 0, -1.3]}
        path={deliveryPath ?? servicePath}
        pathKey={deliveryTable ? `delivery-${deliveryTable.id}` : 'service-patrol'}
        loopPath={!deliveryTable}
        walkSpeed={1.15}
        styles={NPC_UNIFORMS.waiter}
        onArrive={deliveryTable ? onMealDelivered : undefined}
      />
      <WorldNPC
        lookId="male-adult-18"
        position={[-7, 0, 5.1]}
        facing={Math.PI}
        styles={NPC_UNIFORMS.chef}
      />
      {deliveryTable && dish && mealDelivered && (
        <MealPlate tableId={deliveryTable.id} dish={dish} />
      )}
    </>
  );
}
