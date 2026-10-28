import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { PlayerHandle } from '../hooks/usePlayerController';
import type { Vehicle } from '../lib/world';
import { VEHICLE_CATALOG, vehicleColourById } from '../lib/vehicleCatalog';
import { Car } from './Props';
import { WorldNPC } from './WorldNPC';
import { signTexture } from './textures';
import { Lamp } from './LampPool';

export function CarDealershipExterior() {
  const sign = useMemo(() => signTexture('MARINA MOTORS', '#232b2e', '#d8c18a'), []);
  return (
    <group>
      {[-2.55, 2.55].map((offset) => (
        <mesh key={`glass-${offset}`} position={[21.94, 2.2, 12 + offset]} rotation={[0, -Math.PI / 2, 0]} castShadow>
          <planeGeometry args={[2.7, 2.5]} />
          <meshPhysicalMaterial color="#7d9aa0" roughness={0.18} metalness={0.35} transmission={0.18} transparent opacity={0.78} />
        </mesh>
      ))}
      {[-3.9, -1.35, 1.35, 3.9].map((offset) => (
        <mesh key={offset} position={[21.9, 2.2, 12 + offset]} castShadow>
          <boxGeometry args={[0.12, 3, 0.12]} />
          <meshStandardMaterial color="#b19a68" metalness={0.72} roughness={0.3} />
        </mesh>
      ))}
      <group position={[21.8, 4.05, 12]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[8.4, 0.16, 0.8]} />
          <meshStandardMaterial color="#232b2e" metalness={0.52} roughness={0.34} />
        </mesh>
        <mesh position={[0, 0, 0.41]}>
          <planeGeometry args={[8.1, 0.66]} />
          <meshStandardMaterial map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={0.14} />
        </mesh>
      </group>
      <Lamp position={[21.4, 4.5, 12]} color="#ffe0a2" intensity={1.3} distance={9} />
      {[4, 20].map((z) => (
        <group key={z}>
          <mesh position={[13, 0.015, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[2.8, 32]} />
            <meshStandardMaterial color="#393d3e" roughness={0.84} />
          </mesh>
        </group>
      ))}
      <mesh position={[17.3, 0.025, 12]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.2, 7.2]} />
        <meshStandardMaterial color="#c6c2b6" roughness={0.92} />
      </mesh>
      <mesh position={[17.3, 0.04, 12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.8, 7.2]} />
        <meshStandardMaterial color="#d5b66c" roughness={0.68} />
      </mesh>
    </group>
  );
}

export function CarDealershipScene({ player }: { player: PlayerHandle }) {
  const displayVehicles = VEHICLE_CATALOG.slice(0, 3);
  return (
    <>
      {displayVehicles.map((model, index) => {
        const colour = vehicleColourById(model.colours[index % model.colours.length])!;
        const vehicle: Vehicle = {
          position: [index * 6 - 6, 0, 1.4],
          heading: index === 1 ? Math.PI : 0,
          color: colour.hex,
          kind: 'car',
          bodyStyle: model.bodyStyle,
        };
        return <Car key={model.id} vehicle={vehicle} />;
      })}
      <WorldNPC
        npcId="marina-motors-salesperson"
        role="car dealership salesperson"
        lookId="female-adult-08"
        position={[0, 0, -3.25]}
        facing={Math.PI}
        player={player}
        greetPlayer
      />
      <mesh position={[0, 2.77, 6.4]}>
        <boxGeometry args={[7.4, 0.045, 0.045]} />
        <meshStandardMaterial color="#c9ae72" metalness={0.72} roughness={0.3} emissive="#c9ae72" emissiveIntensity={0.22} />
      </mesh>
      {[-7, 0, 7].map((x) => (
        <group key={x} position={[x, 2.65, 5.9]}>
          <mesh position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.38, 8]} />
            <meshStandardMaterial color="#b99658" metalness={0.65} roughness={0.32} />
          </mesh>
          <pointLight position={[0, -0.46, 0]} intensity={1.2} distance={6} decay={2} color="#ffdda4" />
        </group>
      ))}
      <ambientLight intensity={0.22} color="#e4e5e0" />
      <pointLight position={[0, 2.3, -4.6]} intensity={0.7} distance={5} color="#ffe0a2" />
    </>
  );
}

export function DrivenVehicle({ controller, colour, bodyStyle }: {
  controller: PlayerHandle;
  colour: string;
  bodyStyle: Vehicle['bodyStyle'];
}) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    controller.applyMovement(Math.min(delta, 0.1));
    if (!group.current) return;
    group.current.position.copy(controller.position);
    group.current.rotation.y = controller.direction;
  });
  return (
    <group ref={group}>
      <Car vehicle={{
        position: [0, 0, 0], heading: 0, color: colour, kind: 'car', bodyStyle,
      }} />
    </group>
  );
}
