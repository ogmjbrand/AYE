import { useMemo } from 'react';
import type { PlayerHandle } from '../hooks/usePlayerController';
import { WorldNPC } from './WorldNPC';
import { signTexture } from './textures';
import { HOSPITAL } from '../lib/hospitalSite';

const [DOOR_X, , DOOR_Z] = HOSPITAL.position;
// The hospital's west face, which looks towards the entrance spot
const FACADE_X = 7.9;

export function HospitalExterior() {
  const sign = useMemo(() => signTexture('GENERAL HOSPITAL', '#f4f6f6', '#b3261e'), []);
  const emergency = useMemo(() => signTexture('EMERGENCY 24H', '#b3261e', '#ffffff'), []);
  return (
    <group>
      <group position={[FACADE_X - 0.7, 4, DOOR_Z]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[7.4, 0.22, 1.6]} />
          <meshStandardMaterial color="#e8eded" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.81]}>
          <planeGeometry args={[7, 0.8]} />
          <meshStandardMaterial map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={0.16} />
        </mesh>
        <mesh position={[0, -0.55, 0.81]}>
          <planeGeometry args={[2.4, 0.4]} />
          <meshStandardMaterial map={emergency} />
        </mesh>
      </group>
      {/* Red cross above the canopy */}
      <group position={[FACADE_X - 0.1, 5.6, DOOR_Z]}>
        <mesh>
          <boxGeometry args={[0.14, 1.6, 0.5]} />
          <meshStandardMaterial color="#c0281f" emissive="#c0281f" emissiveIntensity={0.3} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.14, 0.5, 1.6]} />
          <meshStandardMaterial color="#c0281f" emissive="#c0281f" emissiveIntensity={0.3} />
        </mesh>
      </group>
      {/* Sliding glass doors */}
      <mesh position={[FACADE_X - 0.04, 1.4, DOOR_Z]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[3.2, 2.8]} />
        <meshPhysicalMaterial color="#a8c8d0" roughness={0.1} metalness={0.3} transparent opacity={0.7} />
      </mesh>
      {/* Entrance ramp */}
      <mesh position={[FACADE_X - 1, 0.06, DOOR_Z]} receiveShadow>
        <boxGeometry args={[1.6, 0.12, 4]} />
        <meshStandardMaterial color="#cfd4d4" roughness={0.9} />
      </mesh>
      {/* Ambulance bay marking */}
      <mesh position={[FACADE_X - 2.6, 0.02, DOOR_Z + 5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 4.6]} />
        <meshStandardMaterial color="#d8c14a" roughness={1} />
      </mesh>
      <pointLight position={[FACADE_X - 1.6, 3.6, DOOR_Z]} color="#e8f6ff" intensity={1.1} distance={9} />
      <mesh position={[DOOR_X, 0.02, DOOR_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.1, 1.3, 40]} />
        <meshBasicMaterial color="#6fd3a2" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

export function HospitalScene({ player }: { player: PlayerHandle }) {
  return (
    <>
      <WorldNPC
        npcId="hosp-receptionist"
        role="hospital receptionist"
        lookId="female-adult-10"
        position={[0, 0, -4.6]}
        facing={Math.PI}
        player={player}
        greetPlayer
      />
      <WorldNPC
        npcId="hosp-supervisor"
        role="medical supervisor"
        lookId="male-adult-18"
        position={[11, 0, 8.3]}
        facing={Math.PI}
      />
      <WorldNPC
        npcId="hosp-nurse"
        role="nurse"
        lookId="female-adult-06"
        position={[0, 0, 10.0]}
        facing={Math.PI}
      />
      <WorldNPC
        npcId="hosp-doctor-colleague"
        role="doctor"
        lookId="male-adult-10"
        position={[-2, 0, -1]}
        path={[[-2, 0, -1], [3, 0, -1], [-2, 0, -1]]}
        pathKey="hosp-corridor"
        loopPath
        walkSpeed={0.6}
      />
      <WorldNPC
        npcId="hosp-pharmacist"
        role="pharmacist"
        lookId="female-adult-11"
        position={[11, 0, -7.7]}
        facing={0}
      />
      <pointLight position={[-10, 2.5, 5]} intensity={1.4} distance={12} color="#eaf6ff" />
      <pointLight position={[10, 2.5, 6]} intensity={1.4} distance={12} color="#f4fbff" />
      <pointLight position={[0, 2.5, 6]} intensity={1.2} distance={11} color="#eaf6ff" />
      <pointLight position={[0, 2.5, -3]} intensity={1.2} distance={12} color="#ffffff" />
      <pointLight position={[-10, 2.5, -5]} intensity={0.9} distance={9} color="#eaf6ff" />
      <pointLight position={[11, 2.5, -5]} intensity={0.9} distance={9} color="#f4fbff" />
    </>
  );
}
