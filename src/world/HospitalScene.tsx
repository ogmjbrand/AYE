import { useMemo } from 'react';
import type { PlayerHandle } from '../hooks/usePlayerController';
import { WorldNPC } from './WorldNPC';
import { VenueNpc } from './VenueNpc';
import { UNIFORMS } from '../lib/uniforms';
import { signTexture } from './textures';
import { HOSPITAL } from '../lib/hospitalSite';
import { Lamp } from './LampPool';

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
      <Lamp position={[FACADE_X - 1.6, 3.6, DOOR_Z]} color="#e8f6ff" intensity={1.1} distance={9} />
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
      <DepartmentStaff />
      <pointLight position={[-10, 2.5, 5]} intensity={1.4} distance={12} color="#eaf6ff" />
      <pointLight position={[10, 2.5, 6]} intensity={1.4} distance={12} color="#f4fbff" />
      <pointLight position={[0, 2.5, 6]} intensity={1.2} distance={11} color="#eaf6ff" />
      <pointLight position={[0, 2.5, -3]} intensity={1.2} distance={12} color="#ffffff" />
      <pointLight position={[-10, 2.5, -5]} intensity={0.9} distance={9} color="#eaf6ff" />
      <pointLight position={[11, 2.5, -5]} intensity={0.9} distance={9} color="#f4fbff" />
      {/* The modern wing and the Herbal Medicine Centre (warmer) */}
      <pointLight position={[-20, 2.5, -6]} intensity={1.1} distance={9} color="#eaf6ff" />
      <pointLight position={[-20, 2.5, 4]} intensity={1.1} distance={10} color="#eaf6ff" />
      <pointLight position={[21, 2.5, -5]} intensity={1.1} distance={9} color="#ffe9c8" />
      <pointLight position={[21, 2.5, 5]} intensity={1.1} distance={10} color="#ffefd6" />
    </>
  );
}

const NOT_SERVING = () => false;

/**
 * Staff at work in the modern wing and the Herbal Medicine Centre: each at the equipment of
 * their department (lib/hospitalSite.ts), doing what it's for.
 */
function DepartmentStaff() {
  return (
    <>
      {/* Emergency bay: the doctor at the trolley bed, the triage nurse on her round of the corridor */}
      <VenueNpc lookId="medical-male-02" name="Dr Okafor" role="Emergency doctor" x={-20.5} z={-7.4} facing={-Math.PI / 2} chatty uniform={UNIFORMS.labcoat} />
      <VenueNpc lookId="female-adult-06" name="Nurse Halima" role="Triage nurse" x={-17.2} z={-8} facing={0} uniform={UNIFORMS.scrubs}
        route={[[-17.2, -8, 4, -Math.PI / 2], [-17.2, -3.4, 3, -Math.PI / 2], [-17.2, 5.4, 3, -Math.PI / 2], [-17.2, 8.4, 4, -Math.PI / 2]]} />
      {/* Laboratory: samples on the bench */}
      <VenueNpc lookId="female-adult-03" name="Ngozi" role="Laboratory scientist" x={-21.6} z={8.75} facing={0} uniform={UNIFORMS.labcoat}
        grill={{ serving: NOT_SERVING, serveFacing: 0 }} />
      {/* Rehabilitation: the physiotherapist by the parallel bars */}
      <VenueNpc lookId="male-adult-04" name="Tunde" role="Physiotherapist" x={4.5} z={5.6} facing={-Math.PI / 2} chatty uniform={UNIFORMS.scrubs} />
      {/* Herbal Medicine Centre */}
      <VenueNpc lookId="male-adult-12" name="Baba Femi" role="Herbal practitioner" x={20.9} z={-8.55} facing={0} chatty uniform={UNIFORMS.herbal} />
      <VenueNpc lookId="female-adult-08" name="Mama Adunni" role="Herbal practitioner" x={19.6} z={-2.15} facing={Math.PI} uniform={UNIFORMS.herbal}
        grill={{ serving: NOT_SERVING, serveFacing: 0 }} />
      <VenueNpc lookId="female-adult-10" name="Kemi" role="Garden apprentice" x={19.8} z={6.2} facing={0} uniform={UNIFORMS.herbal}
        route={[[19.8, 6.0, 3, Math.PI / 2], [19.8, 9.0, 4, Math.PI / 2], [22.0, 9.0, 4, Math.PI / 2], [22.0, 6.0, 3, Math.PI / 2]]} />
    </>
  );
}
