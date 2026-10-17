import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls as OrbitControlsImpl, PerformanceMonitor } from '@react-three/drei';
import type { OrbitControls } from 'three-stdlib';
import { ACESFilmicToneMapping, Vector3, type Group } from 'three';
import { placePlayer, setMovementBlocked, setMoveTarget, usePlayerController } from './hooks/usePlayerController';
import { useCurrentNeighborhood } from './hooks/useCurrentNeighborhood';
import { useGameState } from './hooks/useGameState';
import { activeLayout, groundHeightAt, setActiveLayout } from './lib/world';
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
import type { FashionItem, Slot } from './lib/fashion';
import { FashionStore } from './components/FashionStore';
import { HomePanel } from './components/HomePanel';
import { GadgetStore } from './components/GadgetStore';
import { MapPanel } from './components/MapPanel';
import { CityLocationsPanel } from './components/CityLocationsPanel';
import { TripStatus } from './components/TripStatus';
import { NightlifePanel } from './components/NightlifePanel';
import { venueAt } from './lib/nightlife';
import { parkAt } from './lib/parks';
import { ParkPanel } from './components/ParkPanel';
import { cityDirectory, type Destination } from './lib/cityDirectory';
import { makeTarget } from './lib/clickToMove';
import { hasMap } from './lib/equipment';
import { counterAt, districtById, type District } from './lib/geography';
import { DistrictContext } from './world/DistrictContext';
import { TravelPanel } from './components/TravelPanel';
import { TalkPanel } from './components/TalkPanel';
import { WorkTaskPanel } from './components/WorkTaskPanel';
import { taskForHour, type WorkTask } from './lib/workTasks';
import { careerLevel } from './lib/progression';
import { equipmentPay } from './lib/equipment';
import { HOURLY_WAGE, isWorkingHours, type GameTime } from './lib/gameState';
import { Residents } from './world/Residents';
import { ClickToMove } from './world/ClickToMove';
import { VenueFront } from './world/VenueFront';
import { Park } from './world/Park';
import { Traffic } from './world/Traffic';
import { HomeInterior } from './world/HomeInterior';
import { USE_RADIUS, bedSpot, doorSpot, interiorFor, interiorLayout } from './lib/interiors';
import { SceneLighting as InteriorLighting } from './world/SceneLighting';
import { gameDay, residentNear, type Resident } from './lib/people';
import { TRAVEL_OPTIONS, formatDuration, type TravelMode } from './lib/travel';
import { HomeMarkers } from './world/HomeMarkers';
import { HOME_RADIUS, distanceToDoor, homeAtDoor, homeById, type Home } from './lib/homes';
import { loadCharacter, saveCharacter } from './lib/save';
import { EntryScreen } from './components/EntryScreen';
import { loadSettings, nextQualityMode, saveSettings, type QualityMode, type Settings } from './lib/settings';
import { getCareerLocation, isAtWorkplace } from './lib/careers';
import './App.css';

// High tier only; the post-processing libraries are fetched on first use
const PostEffects = lazy(() => import('./world/PostEffects'));

interface CityProps {
  controller: ReturnType<typeof usePlayerController>;
  character?: Character;
  gameTime: GameTime;
  tryOn: Partial<Record<Slot, string | null>>;
  homeId: string | null;
  district: District;
  /** The resident the player is talking with, if any. */
  talkingTo: string | null;
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

function City({ controller, character, gameTime, tryOn, homeId, district, talkingTo }: CityProps) {
  const quality = useQuality();
  const night = lightingAt(gameTime.hour, gameTime.minute).night;
  return (
    <>
      <SceneLighting gameTime={gameTime} player={controller} />
      <Streets />
      <Buildings />
      <Skyline />
      <Props night={night} />
      <VenueFront hour={gameTime.hour} night={night} />
      <Park />
      {character && character.career !== 'none' && <WorkplaceMarker position={getCareerLocation(district, character.career)!.position} />}
      <HomeMarkers homeId={homeId} />
      <Residents player={controller} talkingTo={talkingTo} />
      <Traffic player={controller} />
      {quality.contactShadows && <FootShadow controller={controller} />}
      <Player controller={controller} character={character} tryOn={tryOn} conversing={talkingTo !== null} />
    </>
  );
}

export default function App() {
  // The entry screen comes first; 'create' is character creation; a character means playing
  const [screen, setScreen] = useState<'entry' | 'create' | 'play'>('entry');
  const [character, setCharacter] = useState<Character | null>(() => loadCharacter());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const quality = settings.quality;
  const changeSettings = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };
  const changeQuality = (next: QualityMode) => changeSettings({ quality: next });
  // In-game changes to the character (e.g. new clothes) are saved straight away
  const handleCharacterUpdate = (next: Character) => {
    saveCharacter(next);
    setCharacter(next);
  };

  if (screen === 'create') {
    return (
      <CharacterCreation
        onCharacterCreate={(c) => { setCharacter(c); setScreen('play'); }}
        onBack={() => setScreen('entry')}
      />
    );
  }
  if (screen === 'entry' || !character) {
    return (
      <EntryScreen
        saved={character}
        quality={quality}
        onQualityChange={changeQuality}
        onContinue={() => setScreen('play')}
        onNewLife={() => setScreen('create')}
      />
    );
  }

  // Keyed by id so a new character starts with a fresh clock and ledger
  return (
    <Game
      key={character.id}
      character={character}
      quality={quality}
      onQualityChange={changeQuality}
      showRoute={settings.showRoute}
      onShowRouteChange={(showRoute) => changeSettings({ showRoute })}
      onExitToMenu={() => setScreen('entry')}
      onCharacterUpdate={handleCharacterUpdate}
    />
  );
}

interface GameProps {
  character: Character;
  quality: QualityMode;
  onQualityChange: (quality: QualityMode) => void;
  /** Dotted route line on the ground for click-to-move trips. */
  showRoute: boolean;
  onShowRouteChange: (show: boolean) => void;
  /** Back to the entry screen; the game is already saved. */
  onExitToMenu: () => void;
  onCharacterUpdate: (character: Character) => void;
}

/** The district the player was last placed in, so returning from the menu keeps their spot. */
let placedIn: string | null = null;

function Game({ character, quality: qualityMode, onQualityChange, showRoute, onShowRouteChange, onExitToMenu, onCharacterUpdate }: GameProps) {
  const controller = usePlayerController();
  // Read on every game tick, so it always sees the district the player is in now
  const districtRef = useRef<District | null>(null);
  // Inside your own home (room coordinates): never counts as being at work
  const insideRef = useRef(false);
  const { state, rest, dismissSummary, eat, purchase, moveIn, moveOut, buyEquipment, travel, socialise, nightOut, wait, workTask } = useGameState(
    character,
    () => character.career !== 'none' && !!districtRef.current && !insideRef.current &&
      isAtWorkplace(districtRef.current, character.career, controller.position.x, controller.position.z),
  );
  const district = districtById(state.districtId);
  const home = homeById(state.home);
  const [inside, setInside] = useState(false);
  const interior = home ? interiorFor(home) : null;
  const roomLayout = useMemo(() => (interior ? interiorLayout(interior) : null), [interior]);
  const indoors = inside && !!home && home.district === district.id && !!roomLayout;
  // Collision and ground height follow where you are (set before this frame's movement)
  const layoutNow = indoors ? roomLayout! : district.layout;
  if (activeLayout() !== layoutNow) setActiveLayout(layoutNow);
  useEffect(() => {
    insideRef.current = indoors;
  }, [indoors]);
  useEffect(() => {
    districtRef.current = district;
    // Arriving in a district (or loading a save there) puts you at its arrival point
    if (placedIn !== district.id) {
      placePlayer(district.spawn);
      placedIn = district.id;
    }
  }, [district]);
  const neighborhood = useCurrentNeighborhood(controller, district.neighborhoods);
  const [travelOpen, setTravelOpen] = useState(false);
  const [locationsOpen, setLocationsOpen] = useState(false);
  const [nightOpen, setNightOpen] = useState(false);
  const [parkOpen, setParkOpen] = useState(false);
  const [talking, setTalking] = useState<Resident | null>(null);
  const [task, setTask] = useState<WorkTask | null>(null);
  const [arrival, setArrival] = useState<string | null>(null);
  useEffect(() => {
    if (!arrival) return;
    const id = setTimeout(() => setArrival(null), 6000);
    return () => clearTimeout(id);
  }, [arrival]);
  const book = (to: District, mode: TravelMode) => {
    const option = TRAVEL_OPTIONS[mode];
    if (state.balance < option.fare) return;
    travel(to.id, mode);
    setInside(false);
    setTravelOpen(false);
    setArrival(`You arrived in ${to.city.name} after ${formatDuration(option.minutes)} by ${option.label.toLowerCase()}.`);
  };
  const controlsRef = useRef<OrbitControls | null>(null);
  const [vendor, setVendor] = useState<FoodVendor | null>(null);
  const [store, setStore] = useState<'shop' | 'wardrobe' | null>(null);
  const [tryOn, setTryOn] = useState<Partial<Record<Slot, string | null>>>({});
  const [homePanel, setHomePanel] = useState<Home | null>(null);
  /** Puts the camera straight behind the player after a jump (going in or out of a building). */
  const snapCamera = () => {
    const controls = controlsRef.current;
    if (!controls) return;
    const { x, z } = controller.position;
    const d = controller.direction;
    controls.target.set(x, CAMERA_TARGET_HEIGHT, z);
    controls.object.position.set(x - Math.sin(d) * 4.2, CAMERA_TARGET_HEIGHT + 1.6, z - Math.cos(d) * 4.2);
    controls.update();
  };
  const goInside = () => {
    if (!interior) return;
    setHomePanel(null);
    setInside(true);
    placePlayer([doorSpot(interior)[0], 0, doorSpot(interior)[1]], 0);
    snapCamera();
  };
  const goOutside = () => {
    setInside(false);
    if (home) placePlayer(home.door, Math.PI);
    snapCamera();
  };
  /** This hour's work task, if you're at your workplace during working hours and haven't done it yet. */
  const taskOnOffer = (): WorkTask | null => {
    if (indoors || character.career === 'none' || !isWorkingHours(state.time) || state.summary) return null;
    if (state.lastTaskHour === Math.floor(state.time.totalMinutes / 60)) return null;
    if (!isAtWorkplace(district, character.career, controller.position.x, controller.position.z)) return null;
    return taskForHour(character.career, state.time.totalMinutes);
  };
  const hourlyPay = Math.round(HOURLY_WAGE[character.career] * careerLevel(character.career, state.workMinutes).pay * equipmentPay(state.equipment, character.career));
  const nearSpot = (spot: readonly [number, number]) =>
    Math.hypot(controller.position.x - spot[0], controller.position.z - spot[1]) <= USE_RADIUS;
  const [gadgets, setGadgets] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const phone = hasMap(state.equipment);
  // At your own front door you sleep at home; anywhere else is sleeping rough
  const atHome = () => indoors || (!!home && home.district === district.id && distanceToDoor(home, controller.position.x, controller.position.z) <= HOME_RADIUS);

  // E opens the food vendor or the boutique you're standing at
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'e' || e.target instanceof HTMLInputElement) return;
      if (indoors && interior) {
        if (nearSpot(bedSpot(interior))) rest(true);
        else if (nearSpot(doorSpot(interior))) goOutside();
        return;
      }
      const { x, z } = controller.position;
      const near = nearestVendor(district.vendors, x, z);
      const counter = counterAt(district, x, z);
      const door = homeAtDoor(district.id, x, z);
      if (near) setVendor(near);
      else if (counter === 'fashion') setStore('shop');
      else if (counter === 'gadgets') setGadgets(true);
      else if (counter === 'travel') setTravelOpen(true);
      else if (venueAt(district.nightlife, x, z)) setNightOpen(true);
      else if (parkAt(district.park, x, z)) setParkOpen(true);
      else if (residentNear(district.id, x, z)) setTalking(residentNear(district.id, x, z)!);
      else if (taskOnOffer()) setTask(taskOnOffer());
      else if (door) setHomePanel(door);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    setMovementBlocked(vendor !== null || store !== null || homePanel !== null || gadgets || travelOpen || talking !== null || task !== null || locationsOpen || nightOpen || parkOpen);
    return () => setMovementBlocked(false);
  }, [vendor, store, homePanel, gadgets, travelOpen, talking, task, locationsOpen, nightOpen, parkOpen]);

  // The ⋯ directory: real places in this district; Go walks there with the route finder
  const destinations = useMemo(() => cityDirectory(district, character.career, state.home), [district, character.career, state.home]);
  const goTo = (d: Destination): string | null => {
    if (!d.position) return 'This place isn’t in the city yet.';
    setMovementBlocked(false); // the panel is closing; let the trip start
    const { x, z } = controller.position;
    if (Math.hypot(d.position.x - x, d.position.z - z) < 1) return 'You’re already here.';
    const ok = setMoveTarget(makeTarget(x, z, d.position.x, d.position.z, false), { destinationId: d.id, label: d.name });
    if (!ok) {
      setMovementBlocked(true);
      return 'There’s no way to walk there from where you are.';
    }
    setLocationsOpen(false);
    return null;
  };

  // M opens the phone map once you own a phone
  useEffect(() => {
    if (!phone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm' && !(e.target instanceof HTMLInputElement)) setMapOpen((o) => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phone]);

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
          shop={district.fashionHouse}
          districtId={district.id}
          onSaveOutfit={(name) => onCharacterUpdate({ ...character, wardrobe: { ...wardrobe, outfits: [...(wardrobe.outfits ?? []), { name, equipped: { ...wardrobe.equipped } }] } })}
          onWearOutfit={(i) => {
            const outfit = wardrobe.outfits?.[i];
            if (outfit) onCharacterUpdate({ ...character, wardrobe: { ...wardrobe, equipped: { ...outfit.equipped } } });
            setTryOn({});
          }}
          onDeleteOutfit={(i) => onCharacterUpdate({ ...character, wardrobe: { ...wardrobe, outfits: (wardrobe.outfits ?? []).filter((_, k) => k !== i) } })}
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
      {gadgets && (
        <GadgetStore
          shop={district.gadgetHub}
          owned={state.equipment}
          balance={state.balance}
          career={character.career}
          onBuy={(item) => buyEquipment(item.id)}
          onClose={() => setGadgets(false)}
        />
      )}
      {locationsOpen && !indoors && (
        <CityLocationsPanel
          district={district}
          from={{ x: controller.position.x, z: controller.position.z }}
          career={character.career}
          homeId={state.home}
          showRoute={showRoute}
          onShowRouteChange={onShowRouteChange}
          onGo={goTo}
          onClose={() => setLocationsOpen(false)}
        />
      )}
      {!indoors && <TripStatus destinations={destinations} />}
      {parkOpen && (
        <ParkPanel park={district.park} time={state.time} onWait={wait} onClose={() => setParkOpen(false)} />
      )}
      {nightOpen && (
        <NightlifePanel
          venue={district.nightlife}
          districtId={district.id}
          time={state.time}
          balance={state.balance}
          relationships={state.relationships}
          onNightOut={nightOut}
          onClose={() => setNightOpen(false)}
        />
      )}
      {mapOpen && phone && (
        <MapPanel
          district={district}
          controller={controller}
          homePlaceId={state.home ? `${district.id}.home.${state.home}` : null}
          onClose={() => setMapOpen(false)}
        />
      )}
      {homePanel && (
        <HomePanel
          home={homePanel}
          currentHomeId={state.home}
          balance={state.balance}
          onMoveIn={() => moveIn(homePanel.id)}
          onMoveOut={moveOut}
          onSleep={() => { setHomePanel(null); rest(true); }}
          onGoInside={goInside}
          onClose={() => setHomePanel(null)}
        />
      )}
      {state.summary && (
        <DailyLogModal
          income={state.summary.income}
          expenses={state.summary.expenses}
          netChange={state.summary.netChange}
          minutesWorked={state.summary.minutesWorked}
          wakeDayOfWeek={state.summary.wakeDayOfWeek}
          rent={state.summary.rent}
          rough={state.summary.rough}
          atFriend={state.summary.atFriend}
          evicted={state.summary.evicted}
          promotedTo={state.summary.promotedTo}
          onContinue={() => {
            // Evicted in your sleep: you wake up back on the street
            if (inside && state.summary?.evicted) {
              setInside(false);
              placePlayer(district.spawn);
              snapCamera();
            }
            dismissSummary();
          }}
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
          <ClickToMove player={controller} showRoute={showRoute} />
          <DistrictContext.Provider value={district}>
            {indoors && interior ? (
              <HomeInterior key={`home-${home!.id}`} interior={interior} gameTime={state.time}>
                <InteriorLighting gameTime={state.time} player={controller} />
                <Player controller={controller} character={character} tryOn={tryOn} />
              </HomeInterior>
            ) : (
              <City key={district.id} controller={controller} character={character} gameTime={state.time} tryOn={tryOn} homeId={state.home} district={district} talkingTo={talking?.id ?? null} />
            )}
          </DistrictContext.Provider>
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

      {talking && (
        <TalkPanel
          resident={talking}
          relationship={state.relationships[talking.id]}
          today={gameDay(state.time.totalMinutes)}
          balance={state.balance}
          onActivity={(activity) => socialise(talking.id, activity)}
          onStayOver={() => { setTalking(null); rest(false, true); }}
          onClose={() => setTalking(null)}
        />
      )}
      {task && (
        <WorkTaskPanel
          task={task}
          workplace={getCareerLocation(district, character.career)?.name ?? 'Work'}
          hourlyPay={hourlyPay}
          onAnswer={(choice) => workTask(task.id, choice)}
          onClose={() => setTask(null)}
        />
      )}
      {travelOpen && (
        <TravelPanel
          from={district}
          balance={state.balance}
          homeId={state.home}
          onTravel={book}
          onClose={() => setTravelOpen(false)}
        />
      )}
      {arrival && (
        <p role="status" className="pointer-events-none fixed left-1/2 top-24 z-40 m-0 -translate-x-1/2 rounded-xl border border-ui-line bg-ui-panel/90 px-4 py-2 text-sm text-ui-ink shadow-xl">
          {arrival}
        </p>
      )}
      <HUD
        district={district}
        onOpenTravel={() => setTravelOpen(true)}
        onOpenNightlife={() => setNightOpen(true)}
        onOpenPark={() => setParkOpen(true)}
        onTalk={setTalking}
        workTask={taskOnOffer() ? { place: getCareerLocation(district, character.career)?.name ?? 'work', onOpen: () => setTask(taskOnOffer()) } : null}
        controller={controller}
        character={character}
        balance={state.balance}
        gameTime={state.time}
        neighborhood={neighborhood}
        onExitToMenu={onExitToMenu}
        onRest={() => rest(atHome())}
        homeId={state.home}
        onOpenHome={setHomePanel}
        insideHome={indoors && interior ? {
          name: home!.name,
          prompt: nearSpot(bedSpot(interior))
            ? { verb: 'Sleep in your bed at', place: home!.name, onOpen: () => rest(true) }
            : nearSpot(doorSpot(interior))
              ? { verb: 'Go back outside to', place: district.name, onOpen: goOutside }
              : null,
        } : undefined}
        workMinutes={state.workMinutes}
        equipment={state.equipment}
        onOpenGadgets={() => setGadgets(true)}
        onOpenMap={phone ? () => setMapOpen(true) : undefined}
        onOpenLocations={indoors ? undefined : () => setLocationsOpen(true)}
        fullness={state.fullness}
        onOpenVendor={setVendor}
        onOpenShop={() => setStore('shop')}
        onOpenWardrobe={() => setStore('wardrobe')}
        qualityLabel={qualityMode === 'auto' ? `Auto (${autoQuality})` : qualityMode}
        onCycleQuality={() => onQualityChange(nextQualityMode(qualityMode))}
      />
    </main>
  );
}
