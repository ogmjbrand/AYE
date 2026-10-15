import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls as OrbitControlsImpl } from '@react-three/drei';
import type { OrbitControls } from 'three-stdlib';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { Vector3 } from 'three';
import { usePlayerController } from './hooks/usePlayerController';
import { useCurrentNeighborhood } from './hooks/useCurrentNeighborhood';
import { useBalanceProgression } from './hooks/useBalanceProgression';
import { useTimeProgression } from './hooks/useTimeProgression';
import { Player } from './components/Player';
import { HUD } from './components/HUD';
import { CharacterCreation, type Character } from './components/CharacterCreation';
import './App.css';

interface CityProps {
  controller: ReturnType<typeof usePlayerController>;
  character?: Character;
}

interface CameraFollowProps {
  controller: ReturnType<typeof usePlayerController>;
  controlsRef: React.RefObject<OrbitControls | null>;
}

function CameraFollow({ controller, controlsRef }: CameraFollowProps) {
  useFrame(() => {
    if (controlsRef.current) {
      const targetPos = new Vector3(
        controller.position.x,
        1,
        controller.position.z
      );
      controlsRef.current.target.lerp(targetPos, 0.1);
      controlsRef.current.update();
    }
  });
  return null;
}

function City({ controller, character }: CityProps) {
  const buildings = [
    { position: [-7, 2, -5], size: [3, 4, 3], color: '#c7a17a' },
    { position: [-3, 3, -7], size: [3, 6, 3], color: '#aab5b7' },
    { position: [4, 2, -7], size: [4, 4, 3], color: '#d8c8ad' },
    { position: [8, 3, -4], size: [3, 6, 4], color: '#b9a18d' },
    { position: [-8, 2, 4], size: [3, 4, 4], color: '#c8b49b' },
    { position: [8, 2, 5], size: [3, 4, 4], color: '#d0c5b3' },
  ] as const;

  return (
    <>
      <color attach="background" args={['#a9c8dc']} />
      <fog attach="fog" args={['#a9c8dc', 24, 65]} />

      <ambientLight intensity={1.2} />
      <directionalLight position={[8, 15, 8]} intensity={2.2} />

      {/* Ground */}
      <RigidBody type="fixed">
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#65765b" />
        </mesh>
        <CuboidCollider args={[100, 0.1, 100]} position={[0, -0.08, 0]} />
      </RigidBody>

      {/* Main road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[8, 100]} />
        <meshStandardMaterial color="#34383d" roughness={1} />
      </mesh>

      {/* Road markings */}
      {Array.from({ length: 18 }, (_, i) => (
        <mesh
          key={i}
          position={[0, 0.015, -45 + i * 5.3]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.12, 2.5]} />
          <meshBasicMaterial color="#f5e7bd" />
        </mesh>
      ))}

      {/* Sidewalks */}
      {[-5.2, 5.2].map((x) => (
        <mesh
          key={x}
          position={[x, 0.04, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[2.4, 100]} />
          <meshStandardMaterial color="#b6b1a4" />
        </mesh>
      ))}

      {/* Buildings with collision */}
      {buildings.map((building, i) => (
        <RigidBody key={i} type="fixed" position={building.position}>
          <mesh position={[0, building.size[1] / 2, 0]} castShadow>
            <boxGeometry args={building.size} />
            <meshStandardMaterial color={building.color} roughness={0.85} />
          </mesh>
          <CuboidCollider
            args={[
              building.size[0] / 2,
              building.size[1] / 2,
              building.size[2] / 2,
            ]}
            position={[0, building.size[1] / 2, 0]}
          />

          {/* Simple windows */}
          {Array.from(
            {
              length: Math.max(1, Math.floor(building.size[1] / 1.2)),
            },
            (_, floor) => (
              <mesh
                key={floor}
                position={[
                  0,
                  0.8 + floor * 1.1,
                  building.size[2] / 2 + 0.008,
                ]}
              >
                <boxGeometry
                  args={[building.size[0] * 0.65, 0.45, 0.025]}
                />
                <meshStandardMaterial
                  color="#41677b"
                  roughness={0.3}
                  metalness={0.15}
                />
              </mesh>
            )
          )}
        </RigidBody>
      ))}

      {/* Controllable Player */}
      <Player controller={controller} character={character} />
    </>
  );
}

export default function App() {
  const [character, setCharacter] = useState<Character | null>(null);
  const controller = usePlayerController();
  const neighborhood = useCurrentNeighborhood(controller);
  const balance = useBalanceProgression(character);
  const gameTime = useTimeProgression();
  const controlsRef = useRef<OrbitControls | null>(null);

  // Load character from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('aye_character');
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCharacter(JSON.parse(saved));
      } catch {
        // Invalid saved data, ignore
      }
    }
  }, []);

  const handleChangeCharacter = () => {
    localStorage.removeItem('aye_character');
    setCharacter(null);
  };

  if (!character) {
    return <CharacterCreation onCharacterCreate={setCharacter} />;
  }

  return (
    <main className="game">
      <Canvas
        camera={{ position: [13, 11, 17], fov: 48 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'default' }}
      >
        <CameraFollow controller={controller} controlsRef={controlsRef} />
        <Physics gravity={[0, 0, 0]}>
          <City controller={controller} character={character} />
        </Physics>
        <OrbitControlsImpl
          ref={controlsRef}
          makeDefault
          target={[0, 1, 0]}
          enableDamping
          maxPolarAngle={Math.PI / 2 - 0.04}
          minDistance={5}
          maxDistance={35}
        />
      </Canvas>

      <HUD
        controller={controller}
        character={character}
        balance={balance}
        gameTime={gameTime}
        neighborhood={neighborhood}
        onChangeCharacter={handleChangeCharacter}
      />
    </main>
  );
}
