import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls as OrbitControlsImpl } from '@react-three/drei';
import type { OrbitControls } from 'three-stdlib';
import { Vector3 } from 'three';
import { usePlayerController } from './hooks/usePlayerController';
import { useCurrentNeighborhood } from './hooks/useCurrentNeighborhood';
import { useGameState } from './hooks/useGameState';
import { getAmbiance, type GameTime } from './lib/gameState';
import { clearSave } from './lib/save';
import { BUILDINGS } from './lib/world';
import { Player } from './components/Player';
import { HUD } from './components/HUD';
import { CharacterCreation, type Character } from './components/CharacterCreation';
import { DailyLogModal } from './components/DailyLogModal';
import { getCareerLocation, isAtWorkplace } from './lib/careers';
import './App.css';

interface CityProps {
  controller: ReturnType<typeof usePlayerController>;
  character?: Character;
  gameTime: GameTime;
}

interface CameraFollowProps {
  controller: ReturnType<typeof usePlayerController>;
  controlsRef: React.RefObject<OrbitControls | null>;
}

const followTarget = new Vector3();
const followShift = new Vector3();

/**
 * Keeps the player in view: the orbit target eases toward the player and the
 * camera moves by the same amount, so the player's chosen angle and zoom are kept.
 */
function CameraFollow({ controller, controlsRef }: CameraFollowProps) {
  useFrame(({ camera }) => {
    const controls = controlsRef.current;
    if (!controls) return;
    followTarget.set(controller.position.x, 1, controller.position.z);
    followShift.copy(followTarget).sub(controls.target).multiplyScalar(0.1);
    controls.target.add(followShift);
    camera.position.add(followShift);
    controls.update();
  });
  return null;
}

const NIGHT_SKY = '#16192b';
const DAY_SKY = '#a9c8dc';

function City({ controller, character, gameTime }: CityProps) {
  // Day/night: sky, fog and light follow the game clock
  const ambiance = getAmbiance(gameTime);
  const isNight = ambiance.intensity < 0.5;
  const sky = isNight ? NIGHT_SKY : DAY_SKY;

  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 24, 65]} />

      <ambientLight intensity={1.2 * ambiance.intensity} />
      <directionalLight
        position={[8, 15, 8]}
        intensity={2.2 * ambiance.intensity}
        color={isNight ? '#8fa3ff' : ambiance.color}
      />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#65765b" />
      </mesh>

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

      {/* Buildings (collision is handled in usePlayerController via lib/world) */}
      {BUILDINGS.map((building, i) => (
        <group key={i} position={building.position}>
          <mesh position={[0, building.size[1] / 2, 0]} castShadow>
            <boxGeometry args={building.size} />
            <meshStandardMaterial color={building.color} roughness={0.85} />
          </mesh>

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
                  color={isNight ? '#f3c66b' : '#41677b'}
                  emissive={isNight ? '#f3c66b' : '#000000'}
                  emissiveIntensity={isNight ? 0.6 : 0}
                  roughness={0.3}
                  metalness={0.15}
                />
              </mesh>
            )
          )}
        </group>
      ))}

      {/* Career Workplace Marker */}
      {character && character.career !== 'none' && (
        (() => {
          const workplace = getCareerLocation(character.career);
          return (
            <mesh position={workplace.position}>
              <cylinderGeometry args={[2, 2, 0.5, 32]} />
              <meshStandardMaterial
                color="#22c55e"
                emissive="#22c55e"
                emissiveIntensity={0.3}
              />
            </mesh>
          );
        })()
      )}

      {/* Controllable Player */}
      <Player controller={controller} character={character} />
    </>
  );
}

export default function App() {
  // Null until the player picks Continue or creates a character on the start screen
  const [character, setCharacter] = useState<Character | null>(null);

  const handleChangeCharacter = () => {
    clearSave();
    setCharacter(null);
  };

  if (!character) {
    return <CharacterCreation onCharacterCreate={setCharacter} />;
  }

  // Keyed by id so a new character starts with a fresh clock and ledger
  return <Game key={character.id} character={character} onChangeCharacter={handleChangeCharacter} />;
}

interface GameProps {
  character: Character;
  onChangeCharacter: () => void;
}

function Game({ character, onChangeCharacter }: GameProps) {
  const controller = usePlayerController();
  const neighborhood = useCurrentNeighborhood(controller);
  const { state, rest, dismissSummary } = useGameState(
    character,
    () => character.career !== 'none' && isAtWorkplace(controller.position, character.career),
  );
  const controlsRef = useRef<OrbitControls | null>(null);

  return (
    <main className="game">
      {state.summary && (
        <DailyLogModal
          income={state.summary.income}
          expenses={state.summary.expenses}
          netChange={state.summary.netChange}
          minutesWorked={state.summary.minutesWorked}
          wakeDayOfWeek={state.summary.wakeDayOfWeek}
          onContinue={dismissSummary}
        />
      )}

      <Canvas
        camera={{ position: [13, 11, 17], fov: 48 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'default' }}
      >
        <CameraFollow controller={controller} controlsRef={controlsRef} />
        <City controller={controller} character={character} gameTime={state.time} />
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
        balance={state.balance}
        gameTime={state.time}
        neighborhood={neighborhood}
        onChangeCharacter={onChangeCharacter}
        onRest={rest}
      />
    </main>
  );
}
