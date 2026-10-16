import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls as OrbitControlsImpl, PerformanceMonitor } from '@react-three/drei';
import type { OrbitControls } from 'three-stdlib';
import { ACESFilmicToneMapping, Vector3, type Group } from 'three';
import { setMovementBlocked, usePlayerController } from './hooks/usePlayerController';
import { useCurrentNeighborhood } from './hooks/useCurrentNeighborhood';
import { useGameState } from './hooks/useGameState';
import type { GameTime } from './lib/gameState';
import { clearSave } from './lib/save';
import { groundHeightAt } from './lib/world';
import { Buildings, Skyline } from './world/Buildings';
import { Props } from './world/Props';
import { SceneLighting } from './world/SceneLighting';
import { Streets } from './world/Streets';
import { QualityContext, settingsFor, useQuality, type Quality } from './world/quality';
import { lightingAt } from './world/timeOfDay';
import { FpsMeter } from './world/FpsMeter';
import { Player } from './components/Player';
import { HUD } from './components/HUD';
import { CharacterCreation, type Character } from './components/CharacterCreation';
import { DailyLogModal } from './components/DailyLogModal';
import { FoodMenu } from './components/FoodMenu';
import { nearestVendor, suitsDiet, type FoodVendor } from './lib/food';
import { atFashionHouse, type FashionItem, type Slot } from './lib/fashion';
import { FashionStore } from './components/FashionStore';
import { saveCharacter } from './lib/save';
import { getCareerLocation, isAtWorkplace } from './lib/careers';
import './App.css';

// High tier only; the post-processing libraries are fetched on first use
const PostEffects = lazy(() => import('./world/PostEffects'));

interface CityProps {
  controller: ReturnType<typeof usePlayerController>;
  character?: Character;
  gameTime: GameTime;
  tryOn: Partial<Record<Slot, string | null>>;
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
/**
 * Third-person framing: the camera looks at chest height from about 4.5 m
 * behind and 1.5 m above, so the player fills a good part of the frame.
 */
const CAMERA_TARGET_HEIGHT = 1.25;

function CameraFollow({ controller, controlsRef }: CameraFollowProps) {
  useFrame(({ camera }) => {
    const controls = controlsRef.current;
    if (!controls) return;
    followTarget.set(controller.position.x, CAMERA_TARGET_HEIGHT, controller.position.z);
    followShift.copy(followTarget).sub(controls.target).multiplyScalar(0.1);
    controls.target.add(followShift);
    camera.position.add(followShift);
    controls.update();
  });
  return null;
}

/** Soft contact shadow that stays under the player's feet (high quality only). */
function FootShadow({ controller }: { controller: ReturnType<typeof usePlayerController> }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const { x, z } = controller.position;
    ref.current.position.set(x, groundHeightAt(x, z) + 0.01, z);
  });
  return (
    <group ref={ref}>
      <ContactShadows resolution={256} scale={3} blur={2.2} opacity={0.55} far={1.8} frames={Infinity} />
    </group>
  );
}

/** Glowing ring on the ground marking the player's workplace. */
function WorkplaceMarker({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={[position[0], groundHeightAt(position[0], position[2]) + 0.03, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.5, 2, 48]} />
      <meshStandardMaterial color="#8ab4d8" emissive="#8ab4d8" emissiveIntensity={0.7} transparent opacity={0.7} depthWrite={false} />
    </mesh>
  );
}

function City({ controller, character, gameTime, tryOn }: CityProps) {
  const quality = useQuality();
  const night = lightingAt(gameTime.hour, gameTime.minute).night;
  return (
    <>
      <SceneLighting gameTime={gameTime} player={controller} />
      <Streets />
      <Buildings />
      <Skyline />
      <Props night={night} />
      {character && character.career !== 'none' && <WorkplaceMarker position={getCareerLocation(character.career).position} />}
      {quality.contactShadows && <FootShadow controller={controller} />}
      <Player controller={controller} character={character} tryOn={tryOn} />
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
  // In-game changes to the character (e.g. new clothes) are saved straight away
  const handleCharacterUpdate = (next: Character) => {
    saveCharacter(next);
    setCharacter(next);
  };

  if (!character) {
    return <CharacterCreation onCharacterCreate={setCharacter} />;
  }

  // Keyed by id so a new character starts with a fresh clock and ledger
  return <Game key={character.id} character={character} onChangeCharacter={handleChangeCharacter} onCharacterUpdate={handleCharacterUpdate} />;
}

interface GameProps {
  character: Character;
  onChangeCharacter: () => void;
  onCharacterUpdate: (character: Character) => void;
}

function Game({ character, onChangeCharacter, onCharacterUpdate }: GameProps) {
  const controller = usePlayerController();
  const neighborhood = useCurrentNeighborhood(controller);
  const { state, rest, dismissSummary, eat, purchase } = useGameState(
    character,
    () => character.career !== 'none' && isAtWorkplace(controller.position, character.career),
  );
  const controlsRef = useRef<OrbitControls | null>(null);
  const [vendor, setVendor] = useState<FoodVendor | null>(null);
  const [store, setStore] = useState<'shop' | 'wardrobe' | null>(null);
  const [tryOn, setTryOn] = useState<Partial<Record<Slot, string | null>>>({});

  // E opens the food vendor or the boutique you're standing at
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'e' || e.target instanceof HTMLInputElement) return;
      const near = nearestVendor(controller.position.x, controller.position.z);
      if (near) setVendor(near);
      else if (atFashionHouse(controller.position.x, controller.position.z)) setStore('shop');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controller]);

  useEffect(() => {
    setMovementBlocked(vendor !== null || store !== null);
    return () => setMovementBlocked(false);
  }, [vendor, store]);

  // While dressing, swing the camera round to the front of the player so the clothes are visible
  useEffect(() => {
    const controls = controlsRef.current;
    if (!store || !controls) return;
    const { x, z } = controller.position;
    const d = controller.direction;
    controls.object.position.set(x + Math.sin(d) * 3.2, CAMERA_TARGET_HEIGHT + 0.6, z + Math.cos(d) * 3.2);
    controls.target.set(x, CAMERA_TARGET_HEIGHT, z);
    controls.update();
  }, [store, controller]);

  const wardrobe = character.wardrobe;
  const wear = (slot: Slot, id: string | null) => {
    const equipped = { ...wardrobe.equipped };
    if (id) equipped[slot] = id;
    else delete equipped[slot];
    onCharacterUpdate({ ...character, wardrobe: { ...wardrobe, equipped } });
    setTryOn((t) => {
      const next = { ...t };
      delete next[slot];
      return next;
    });
  };
  const buy = (item: FashionItem) => {
    if (wardrobe.owned.includes(item.id) || state.balance < item.price) return;
    purchase(item.price);
    onCharacterUpdate({
      ...character,
      wardrobe: { owned: [...wardrobe.owned, item.id], equipped: { ...wardrobe.equipped, [item.slot]: item.id } },
    });
    setTryOn((t) => {
      const next = { ...t };
      delete next[item.slot];
      return next;
    });
  };
  const closeStore = () => {
    setStore(null);
    setTryOn({});
  };
  // 'auto' starts high and drops to low on sustained low frame rates; the player can force either
  const [qualityMode, setQualityMode] = useState<'auto' | Quality>('auto');
  const [autoQuality, setAutoQuality] = useState<Quality>('high');
  const settings = settingsFor(qualityMode === 'auto' ? autoQuality : qualityMode);

  return (
    <main className="game">
      {vendor && (
        <FoodMenu
          vendor={vendor}
          diet={character.diet}
          balance={state.balance}
          fullness={state.fullness}
          onEat={(dish) => {
            if (suitsDiet(dish, character.diet)) eat(dish.price, dish.fullness);
          }}
          onClose={() => setVendor(null)}
        />
      )}
      {store && (
        <FashionStore
          mode={store}
          wardrobe={wardrobe}
          balance={state.balance}
          tryOn={tryOn}
          onTryOn={(slot, id) => setTryOn((t) => ({ ...t, [slot]: id }))}
          onBuy={buy}
          onEquip={wear}
          onClose={closeStore}
        />
      )}
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

      <QualityContext.Provider value={settings}>
        <Canvas
          shadows
          camera={{ position: [1.5, CAMERA_TARGET_HEIGHT + 1.5, 2 - 4.2], fov: 50, near: 0.1, far: 2500 }}
          dpr={[1, settings.maxDpr]}
          gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.95 }}
          fallback={<div className="p-8 text-white">AYE needs WebGL. Please enable hardware acceleration or try another browser.</div>}
        >
          {/* Drop to the low tier (no AO or contact shadows, smaller shadow map, 1x DPR) if frame rate sags */}
          <PerformanceMonitor onDecline={() => setAutoQuality('low')} flipflops={1} />
          <FpsMeter />
          <CameraFollow controller={controller} controlsRef={controlsRef} />
          <City controller={controller} character={character} gameTime={state.time} tryOn={tryOn} />
          {settings.ambientOcclusion && (
            <Suspense fallback={null}>
              <PostEffects />
            </Suspense>
          )}
          <OrbitControlsImpl
            ref={controlsRef}
            makeDefault
            target={[1.5, CAMERA_TARGET_HEIGHT, 2]}
            enableDamping
            maxPolarAngle={Math.PI / 2 - 0.08}
            minDistance={2.5}
            maxDistance={40}
          />
        </Canvas>
      </QualityContext.Provider>

      <HUD
        controller={controller}
        character={character}
        balance={state.balance}
        gameTime={state.time}
        neighborhood={neighborhood}
        onChangeCharacter={onChangeCharacter}
        onRest={rest}
        fullness={state.fullness}
        onOpenVendor={setVendor}
        onOpenShop={() => setStore('shop')}
        onOpenWardrobe={() => setStore('wardrobe')}
        qualityLabel={qualityMode === 'auto' ? `Auto (${autoQuality})` : qualityMode}
        onCycleQuality={() => setQualityMode((m) => (m === 'auto' ? 'high' : m === 'high' ? 'low' : 'auto'))}
      />
    </main>
  );
}
