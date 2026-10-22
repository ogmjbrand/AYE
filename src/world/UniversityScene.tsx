import { useMemo } from 'react';
import type { PlayerHandle } from '../hooks/usePlayerController';
import { WorldNPC } from './WorldNPC';
import { signTexture } from './textures';
import { UNIVERSITY } from '../lib/university';

const [DOOR_X, , DOOR_Z] = UNIVERSITY.position;
// The building face the entrance sits on
const FACADE_X = -7.9;

function Streetlight({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 2.2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 4.4, 8]} />
        <meshStandardMaterial color="#3a3f44" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.35, 4.35, 0]}>
        <boxGeometry args={[0.8, 0.08, 0.2]} />
        <meshStandardMaterial color="#fff3cf" emissive="#ffe3a0" emissiveIntensity={0.8} />
      </mesh>
      <pointLight position={[0.35, 4.1, 0]} color="#ffe6b0" intensity={0.8} distance={9} />
    </group>
  );
}

function Palm({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.7, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.16, 3.4, 8]} />
        <meshStandardMaterial color="#7a5c3d" roughness={1} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[Math.cos((i * Math.PI) / 3) * 0.7, 3.5, Math.sin((i * Math.PI) / 3) * 0.7]} rotation={[0, -(i * Math.PI) / 3, -0.5]} castShadow>
          <boxGeometry args={[1.5, 0.04, 0.35]} />
          <meshStandardMaterial color="#3f8a45" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function SecurityBooth({ z }: { z: number }) {
  return (
    <group position={[-6.8, 0, z]}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[1.5, 2.4, 1.5]} />
        <meshStandardMaterial color="#d9d3c3" roughness={0.8} />
      </mesh>
      <mesh position={[0.76, 1.5, 0]}>
        <boxGeometry args={[0.02, 1, 1.2]} />
        <meshPhysicalMaterial color="#8fb0b3" roughness={0.1} transparent opacity={0.65} />
      </mesh>
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[1.9, 0.14, 1.9]} />
        <meshStandardMaterial color="#17372f" />
      </mesh>
    </group>
  );
}

/** Street furniture and the security gate between the road and the campus entrance. */
function CampusApproach() {
  const direction = useMemo(() => signTexture('AYE Global University →', '#1d4f9a', '#ffffff'), []);
  const directory = useMemo(() => signTexture('CAMPUS DIRECTORY', '#17372f', '#e8d9a8'), []);
  const gate = useMemo(() => signTexture('VISITORS · STUDENTS', '#17372f', '#e8d9a8'), []);
  const z = DOOR_Z;
  return (
    <group>
      {/* Gate: booths either side of the pedestrian entrance, with a vehicle barrier arm */}
      <SecurityBooth z={z - 3.2} />
      <SecurityBooth z={z + 3.2} />
      <mesh position={[-6.8, 2.9, z]}>
        <boxGeometry args={[0.1, 0.5, 5.4]} />
        <meshStandardMaterial color="#17372f" />
      </mesh>
      <mesh position={[-6.69, 2.9, z]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[4.6, 0.42]} />
        <meshStandardMaterial map={gate} emissiveMap={gate} emissive="#ffffff" emissiveIntensity={0.14} />
      </mesh>
      <mesh position={[-5, 0.9, z + 5.6]}>
        <boxGeometry args={[0.08, 0.08, 2.8]} />
        <meshStandardMaterial color="#c0281f" emissive="#c0281f" emissiveIntensity={0.2} />
      </mesh>
      {/* Direction sign visible before the entrance */}
      <group position={[-4.7, 0, z + 11]}>
        <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.05, 0.05, 2.8, 8]} /><meshStandardMaterial color="#3a3f44" /></mesh>
        <mesh position={[0, 2.8, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[2.6, 0.9]} />
          <meshStandardMaterial map={direction} />
        </mesh>
      </group>
      {/* Campus directory map board */}
      <group position={[-9.3, 0, z + 4.8]}>
        <mesh position={[0, 1.2, 0]} castShadow><boxGeometry args={[0.1, 1.6, 2]} /><meshStandardMaterial color="#2b3a33" /></mesh>
        <mesh position={[0.06, 1.55, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.8, 0.4]} />
          <meshStandardMaterial map={directory} />
        </mesh>
      </group>
      {/* Streetlights, palms and benches along the verge */}
      {[-10, 0, 10].map((o) => <Streetlight key={`l${o}`} position={[-4.4, 0, z + o + 2]} />)}
      {[-9, -4.5, 4.5, 9].map((o) => <Palm key={`p${o}`} position={[-4.6, 0, z + o]} />)}
      {[-6.6, 6.6].map((o) => (
        <group key={`b${o}`} position={[-9.6, 0, z + o]}>
          <mesh position={[0, 0.45, 0]} castShadow><boxGeometry args={[0.5, 0.08, 1.6]} /><meshStandardMaterial color="#8a6a4a" /></mesh>
          <mesh position={[-0.22, 0.8, 0]} castShadow><boxGeometry args={[0.06, 0.6, 1.6]} /><meshStandardMaterial color="#8a6a4a" /></mesh>
        </group>
      ))}
      {/* Bicycle rack */}
      <group position={[-9.6, 0, z - 9]}>
        {[-0.6, 0, 0.6].map((o) => (
          <mesh key={o} position={[0, 0.4, o]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.35, 0.03, 8, 20]} />
            <meshStandardMaterial color="#9aa3a8" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
      </group>
      {/* Taxi drop-off lane marking */}
      <mesh position={[-3.2, 0.021, z - 6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.4, 7]} />
        <meshStandardMaterial color="#e8c93a" roughness={1} transparent opacity={0.85} />
      </mesh>
      <WorldNPC
        npcId="uni-gate-guard"
        role="security guard"
        lookId="male-adult-18"
        position={[-6.8, 0, z - 1.6]}
        facing={Math.PI / 2}
      />
    </group>
  );
}

export function UniversityExterior() {
  const sign = useMemo(() => signTexture('AYE GLOBAL UNIVERSITY', '#17372f', '#e8d9a8'), []);
  const crest = useMemo(() => signTexture('EST. 1962', '#17372f', '#c9b57c'), []);
  const bannerA = useMemo(() => signTexture('LEARN · GROW · CREATE', '#1d3f78', '#f2f0e6'), []);
  const bannerB = useMemo(() => signTexture('BRIGHTER FUTURES', '#1d3f78', '#f2f0e6'), []);
  return (
    <group>
      {/* Banners on the outer columns */}
      {[[-3.4, bannerA], [3.4, bannerB]].map(([offset, map]) => (
        <mesh key={String(offset)} position={[FACADE_X + 1.5, 2.6, DOOR_Z + (offset as number)]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.5, 0.7]} />
          <meshStandardMaterial map={map as never} />
        </mesh>
      ))}
      {/* Courtyard fountain */}
      <group position={[DOOR_X + 3.2, 0, DOOR_Z]}>
        <mesh position={[0, 0.22, 0]} receiveShadow>
          <cylinderGeometry args={[1.3, 1.4, 0.44, 28]} />
          <meshStandardMaterial color="#cfc9b9" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[1.1, 1.1, 0.05, 28]} />
          <meshStandardMaterial color="#4a9fc0" roughness={0.1} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.1, 0.16, 0.9, 12]} />
          <meshStandardMaterial color="#cfc9b9" roughness={0.8} />
        </mesh>
      </group>
      {/* Entrance canopy and sign */}
      <group position={[FACADE_X + 0.6, 4.2, DOOR_Z]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[7.6, 0.22, 1.6]} />
          <meshStandardMaterial color="#17372f" metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.81]}>
          <planeGeometry args={[7.2, 0.8]} />
          <meshStandardMaterial map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={0.16} />
        </mesh>
        <mesh position={[0, -0.55, 0.81]}>
          <planeGeometry args={[2.2, 0.4]} />
          <meshStandardMaterial map={crest} />
        </mesh>
      </group>
      {/* Stone columns */}
      {[-3.4, -1.7, 1.7, 3.4].map((offset) => (
        <mesh key={offset} position={[FACADE_X + 1.2, 2.1, DOOR_Z + offset]} castShadow>
          <cylinderGeometry args={[0.24, 0.28, 4.2, 18]} />
          <meshStandardMaterial color="#d9d3c3" roughness={0.78} />
        </mesh>
      ))}
      {/* Entrance steps */}
      {[0, 1].map((step) => (
        <mesh key={step} position={[FACADE_X + 1.4 + step * 0.45, 0.08 + (1 - step) * 0.08, DOOR_Z]} receiveShadow>
          <boxGeometry args={[0.9, 0.16 + (1 - step) * 0.16, 5.4]} />
          <meshStandardMaterial color="#c9c3b3" roughness={0.9} />
        </mesh>
      ))}
      {/* Doors */}
      <mesh position={[FACADE_X + 0.04, 1.4, DOOR_Z]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[3.2, 2.8]} />
        <meshPhysicalMaterial color="#8fb0b3" roughness={0.12} metalness={0.3} transparent opacity={0.75} />
      </mesh>
      {/* Campus lawn and planters */}
      {[-6.8, 6.8].map((offset) => (
        <group key={offset} position={[FACADE_X + 2.4, 0, DOOR_Z + offset]}>
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <boxGeometry args={[1.8, 0.1, 3]} />
            <meshStandardMaterial color="#4f8a4b" roughness={1} />
          </mesh>
          <mesh position={[0, 0.65, 0]} castShadow>
            <sphereGeometry args={[0.6, 14, 14]} />
            <meshStandardMaterial color="#3f7a3f" roughness={1} />
          </mesh>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.09, 0.6, 8]} />
            <meshStandardMaterial color="#5d4630" roughness={1} />
          </mesh>
        </group>
      ))}
      <CampusApproach />
      <pointLight position={[FACADE_X + 1.6, 3.8, DOOR_Z]} color="#ffe6b0" intensity={1.1} distance={9} />
      <mesh position={[DOOR_X + 0.2, 0.02, DOOR_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.1, 1.3, 40]} />
        <meshBasicMaterial color="#6fd3a2" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

export function UniversityScene({ player }: { player: PlayerHandle }) {
  return (
    <>
      <WorldNPC
        npcId="uni-info-desk"
        role="university administrator"
        lookId="female-adult-10"
        position={[0, 0, -4.6]}
        facing={Math.PI}
        player={player}
        greetPlayer
      />
      <WorldNPC
        npcId="uni-professor"
        role="professor"
        lookId="male-adult-18"
        position={[-10.2, 0, 8.1]}
        facing={Math.PI}
      />
      <WorldNPC
        npcId="uni-librarian"
        role="librarian"
        lookId="female-adult-06"
        position={[9.2, 0, 8.4]}
        facing={Math.PI}
      />
      <WorldNPC
        npcId="uni-cafeteria-server"
        role="cafeteria server"
        lookId="female-adult-11"
        position={[0, 0, 10.0]}
        facing={Math.PI}
      />
      <WorldNPC
        npcId="uni-services-clerk"
        role="student services clerk"
        lookId="female-adult-06"
        position={[-9.5, 0, -4.6]}
        facing={Math.PI}
      />
      <WorldNPC
        npcId="uni-student-walker"
        role="student"
        lookId="male-adult-10"
        position={[-2, 0, -2]}
        path={[[-2, 0, -2], [4, 0, -2], [-2, 0, -2]]}
        pathKey="uni-atrium"
        loopPath
        walkSpeed={0.6}
      />
      <pointLight position={[-10, 2.5, 5]} intensity={1.4} distance={12} color="#fff1cf" />
      <pointLight position={[10, 2.5, 6]} intensity={1.4} distance={12} color="#ffe7bd" />
      <pointLight position={[0, 2.5, 6]} intensity={1.2} distance={11} color="#ffd8a0" />
      <pointLight position={[0, 2.5, -3]} intensity={1.2} distance={12} color="#fff4de" />
      <pointLight position={[11, 2.5, -5]} intensity={0.9} distance={9} color="#ffe2b8" />
      <pointLight position={[-10, 2.5, -5]} intensity={0.9} distance={9} color="#fff1d6" />
    </>
  );
}
