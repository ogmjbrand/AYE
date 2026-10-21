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
import { HUD, type NavItem, type PlacePlate } from './components/HUD';
import type { IconName } from './components/os/icons';
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
import { SitBar } from './components/SitBar';
import { useSitSession } from './hooks/useSitSession';
import { benchSeats, chairSeats, nearestSeat } from './lib/seating';
import type { WaitMinutes } from './lib/parks';
import { cityDirectory, type Destination } from './lib/cityDirectory';
import { makeTarget } from './lib/clickToMove';
import { hasMap } from './lib/equipment';
import { counterAt, districtById, type District, type PlaceKind } from './lib/geography';
import { SnapshotHost } from './components/snapshot/Snapshot';
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
import { USE_RADIUS, bedSpot, doorSpot, interiorFor, interiorLayout, type Furniture } from './lib/interiors';
import { asFurniture, catalogueItem, nearPiece, furnitureUse } from './lib/furniture';
import type { FurnitureKind } from './lib/interiors';
import { currentMood, type FurnitureTarget } from './lib/gameState';
import { FurnitureCatalogue } from './components/FurnitureCatalogue';
import { LifeOS, type OsTab } from './components/os/LifeOS';
import { Celebrations } from './components/os/Celebrations';
import type { LifeLink } from './lib/life';
import { spotToUse } from './lib/furniture';
import { residentPosition, residentsIn } from './lib/people';
import { getTrip, setPace } from './hooks/usePlayerController';
import { ACHIEVEMENTS } from './lib/life';
import { MOOD_PACE, moodLabel } from './lib/needs';
import { SceneLighting as InteriorLighting } from './world/SceneLighting';
import { gameDay, residentById, residentNear, type Resident } from './lib/people';
import { formatDuration, travelOption, type TravelMode } from './lib/travel';
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

/** Standing this close to a place puts its name on the title plate. */
const PLATE_RADIUS = 9;
const PLATE_SUBTITLE: Record<PlaceKind, string> = { food: 'Food & drinks', shop: 'Shopping', workplace: 'Workplace', home: 'Homes', public: 'Travel', nightlife: 'Lounge & nightlife', park: 'Park' };
const PLATE_ICON: Record<PlaceKind, IconName> = { food: 'restaurant', shop: 'bag', workplace: 'career', home: 'home', public: 'go', nightlife: 'spark', park: 'palm' };

function CameraFollow({ controller, controlsRef }: CameraFollowProps) {
  useFrame(({ camera }) => {
    const controls = controlsRef.current;
    if (!controls) return;
    followTarget.set(controller.position.x, CAMERA_TARGET_HEIGHT, controller.position.z);
    followShift.copy(followTarget).sub(controls.target);
    // Ease after the player as they move; jump straight there after a long move (arriving in a city, a save loading)
    if (followShift.lengthSq() < 12 * 12) followShift.multiplyScalar(0.1);
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
  const [screen, setScreen] = useState<'entry' | 'create' | 'edit' | 'play'>('entry');
  // Where to go back to after changing appearance
  const [editFrom, setEditFrom] = useState<'entry' | 'play'>('entry');
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
  if (screen === 'edit' && character) {
    return (
      <CharacterCreation
        editing={character}
        onCharacterCreate={(c) => { setCharacter(c); setScreen(editFrom); }}
        onBack={() => setScreen(editFrom)}
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
        onEditLook={() => { setEditFrom('entry'); setScreen('edit'); }}
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
      onEditLook={() => { setEditFrom('play'); setScreen('edit'); }}
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
  /** Opens the character creator to change appearance (life and progress are kept). */
  onEditLook: () => void;
  /** Back to the entry screen; the game is already saved. */
  onExitToMenu: () => void;
  onCharacterUpdate: (character: Character) => void;
}

/** The district the player was last placed in, so returning from the menu keeps their spot. */
let placedIn: string | null = null;

function Game({ character, quality: qualityMode, onQualityChange, showRoute, onShowRouteChange, onExitToMenu, onCharacterUpdate, onEditLook }: GameProps) {
  const controller = usePlayerController();
  // Read on every game tick, so it always sees the district the player is in now
  const districtRef = useRef<District | null>(null);
  // Inside your own home (room coordinates): never counts as being at work
  const insideRef = useRef(false);
  const { state, rest, dismissSummary, eat, purchase, moveIn, moveOut, buyEquipment, travel, socialise, nightOut, wait, workTask, buyFurniture, sellFurniture, placeFurniture, storeFurniture, operateFurniture, exercise, visit, setProfile, setDream, dismissWish, setSavingsGoal } = useGameState(
    character,
    () => character.career !== 'none' && !!districtRef.current && !insideRef.current &&
      isAtWorkplace(districtRef.current, character.career, controller.position.x, controller.position.z),
  );
  const district = districtById(state.districtId);
  const home = homeById(state.home);
  const [inside, setInside] = useState(false);
  const interior = home ? interiorFor(home) : null;
  // Furniture you bought and placed, alongside what the home came with
  const ownedPieces = useMemo(
    () => state.furniture.flatMap((o) => { const f = asFurniture(o); return f ? [{ uid: o.uid, f }] : []; }),
    [state.furniture],
  );
  const roomLayout = useMemo(() => (interior ? interiorLayout(interior, ownedPieces.map((p) => p.f)) : null), [interior, ownedPieces]);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  // Life OS: the character's dashboard; the world keeps running (and you can keep walking) while it's open
  const [osOpen, setOsOpen] = useState(false);
  const [osTab, setOsTab] = useState<OsTab>('today');

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
    const option = travelOption(district.city, to.city, mode);
    if (!option || state.balance < option.fare) return;
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
  /** The piece of furniture you're standing at that does something (shower, sofa, cooker…), if any. */
  const usableHere = (): { target: FurnitureTarget; verb: string; cost: number; minutes: number } | null => {
    if (!indoors || !interior) return null;
    const { x, z } = controller.position;
    const pieces: { target: FurnitureTarget; f: Furniture; quality: number }[] = [
      ...interior.furniture.map((f, i) => ({ target: { builtin: i }, f, quality: 1 })),
      ...ownedPieces.map(({ uid, f }) => ({ target: { uid }, f, quality: catalogueItem(state.furniture.find((o) => o.uid === uid)?.itemId)?.quality ?? 1 })),
    ];
    for (const p of pieces) {
      const use = furnitureUse(p.f.kind, p.quality);
      if (use && nearPiece(p.f, x, z)) return { target: p.target, verb: use.verb, cost: use.cost ?? 0, minutes: use.minutes };
    }
    return null;
  };
  const operateHere = () => {
    const u = usableHere();
    if (!u || state.balance < u.cost) return;
    operateFurniture(u.target, true);
    setArrival(`${u.verb}: ${u.minutes >= 60 ? `${u.minutes / 60} h` : `${u.minutes} min`} pass${u.cost ? `, ${u.cost} GHAI for ingredients` : ''}.`);
  };
  // At your own front door you sleep at home; anywhere else is sleeping rough
  const atHome = () => indoors || (!!home && home.district === district.id && distanceToDoor(home, controller.position.x, controller.position.z) <= HOME_RADIUS);

  // Sitting down somewhere (park benches, the lounge terrace): see sitInPark and sitOnTerrace below
  const sit = useSitSession(controller, wait);

  // E opens the food vendor or the boutique you're standing at
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'e' || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // E on a seat gets you up; on the way to one it does nothing
      if (sit.session) {
        if (sit.session.phase === 'seated') sit.cancel();
        return;
      }
      if (indoors && interior) {
        if (nearSpot(bedSpot(interior))) rest(true);
        else if (usableHere()) operateHere();
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
    setMovementBlocked(vendor !== null || store !== null || homePanel !== null || gadgets || travelOpen || talking !== null || task !== null || locationsOpen || nightOpen || parkOpen || catalogueOpen);
    return () => setMovementBlocked(false);
  }, [vendor, store, homePanel, gadgets, travelOpen, talking, task, locationsOpen, nightOpen, parkOpen, catalogueOpen]);

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

  // Sitting: walk to the nearest free bench (or a terrace chair) and sit; waits pass in steps through the usual rules
  const sitInPark = (minutes: WaitMinutes) => {
    const seat = nearestSeat(benchSeats(district.layout.park), controller.position.x, controller.position.z);
    setParkOpen(false);
    setMovementBlocked(false); // the panel is closing; let the walk start
    if (seat) sit.start({ seat, place: district.park.name, minutes });
  };
  const sitOnTerrace = (place: string, holdSeconds?: number) => {
    const seat = nearestSeat(chairSeats(district.layout.terraceChairs), controller.position.x, controller.position.z);
    setNightOpen(false);
    setMovementBlocked(false);
    if (seat) sit.start({ seat, place, minutes: 0, holdSeconds });
  };
  // A night out is charged once, as before; afterwards you sit outside with your friend's name for a moment
  const goOutWith = (residentId: string) => {
    nightOut(residentId);
    const first = residentById(residentId)?.name.split(' ')[0];
    sitOnTerrace(`${district.nightlife.name}${first ? ` after a night out with ${first}` : ''}`, 6);
  };

  // Mood shows in how you move
  const moodNow = moodLabel(currentMood(state));
  useEffect(() => { setPace(MOOD_PACE[moodNow]); }, [moodNow]);

  // Collectibles: achievements that unlock clothes add them to your wardrobe (once; kept if you already own them)
  useEffect(() => {
    const owned = character.wardrobe.owned;
    const unlocked = ACHIEVEMENTS.filter((a) => a.unlock && !owned.includes(a.unlock) && state.life.achievements.some((x) => x.id === a.id)).map((a) => a.unlock!);
    if (unlocked.length) onCharacterUpdate({ ...character, wardrobe: { ...character.wardrobe, owned: [...owned, ...unlocked] } });
  }, [state.life.achievements, character, onCharacterUpdate]);

  // L opens and closes the Life OS
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'l' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) setOsOpen((o) => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Discovering places: reaching any real place in the directory counts once (lib/life.ts checks it's real)
  const visitedRef = useRef(state.life.visited);
  useEffect(() => { visitedRef.current = state.life.visited; });
  useEffect(() => {
    if (indoors) return;
    const id = setInterval(() => {
      const { x, z } = controller.position;
      for (const d of destinations) {
        if (d.position && d.status !== 'planned' && !visitedRef.current.includes(d.id) && Math.hypot(d.position.x - x, d.position.z - z) <= 4) visit(d.id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [destinations, indoors, controller, visit]);

  /** Starts the walk (or opens the panel) a Life OS goal or need asks for. Says honestly when it can't. */
  const goFor = (link: LifeLink) => {
    const d = district.id;
    const say = (msg: string) => setArrival(msg);
    const walk = (id: string, note?: string) => {
      const dest = destinations.find((x) => x.id === id);
      const err = dest ? goTo(dest) : 'That place isn’t in this city.';
      if (err) say(err);
      else if (note) say(note);
    };
    const nearest = (ids: string[]) => {
      const { x, z } = controller.position;
      return destinations.filter((x2) => ids.includes(x2.id) && x2.position).sort((a, b) => Math.hypot(a.position!.x - x, a.position!.z - z) - Math.hypot(b.position!.x - x, b.position!.z - z))[0]?.id;
    };
    const myHomeHere = home && home.district === d;
    switch (link.to) {
      case 'work':
        if (character.career === 'none') return say('You don’t have a career, so there’s no workplace.');
        return walk(`${d}.work.${character.career}`, isWorkingHours(state.time) ? undefined : 'Work hours are 09:00–17:00: you’ll be paid then.');
      case 'food': return walk(nearest(district.vendors.map((v) => `${d}.${v.id}`)) ?? '', 'Press E at the counter to order.');
      case 'fashion': return walk(`${d}.fashion`);
      case 'gadgets': return walk(`${d}.gadgets`);
      case 'park': return walk(`${d}.park.${district.park.id}`, 'At the park, press E: sit on a bench or go for a run.');
      case 'nightlife': return walk(`${d}.night.${district.nightlife.id}`);
      case 'travel': return walk(`${d}.travel`);
      case 'catalogue': return setCatalogueOpen(true);
      case 'explore': {
        const { x, z } = controller.position;
        const next = destinations
          .filter((x2) => x2.position && x2.status !== 'planned' && !state.life.visited.includes(x2.id))
          .sort((a, b) => Math.hypot(a.position!.x - x, a.position!.z - z) - Math.hypot(b.position!.x - x, b.position!.z - z))[0];
        return next ? walk(next.id, `Heading somewhere new: ${next.name}.`) : say('You’ve discovered everywhere in this district. Try another city.');
      }
      case 'homes': {
        if (myHomeHere) return walk(`${d}.home.${home!.id}`);
        const cheapest = [...district.homes].sort((a, b) => a.rentPerNight - b.rentPerNight)[0];
        return walk(`${d}.home.${cheapest.id}`, 'At the door, press E to see the home and rent it.');
      }
      case 'home':
        if (!home) return goFor({ to: 'homes' });
        if (!myHomeHere) { say(`Your home is in ${districtById(home.district).city.name}. Book a trip at the travel desk.`); return walk(`${d}.travel`); }
        return walk(`${d}.home.${home.id}`, 'At your door, press E and go inside.');
      case 'friend': {
        const here = residentsIn(d);
        const today = gameDay(state.time.totalMinutes);
        const who = (link.residentId ? residentById(link.residentId) : undefined)
          ?? [...here].sort((a, b) => ((state.relationships[b.id]?.lastDay === today ? -1 : state.relationships[b.id]?.points ?? 0) - (state.relationships[a.id]?.lastDay === today ? -1 : state.relationships[a.id]?.points ?? 0)))[0];
        if (!who || who.district !== d) return say(who ? `${who.name} lives in ${districtById(who.district).city.name}.` : 'Nobody lives in this district yet.');
        const p = residentPosition(who);
        const { x, z } = controller.position;
        const ok = setMoveTarget(makeTarget(x, z, p.x, p.z, false), { label: who.name });
        return say(ok ? `Walking over to ${who.name}. Press E to talk.` : `Couldn’t find a way to ${who.name}.`);
      }
      case 'homeUse': {
        const fallback: Record<typeof link.use, LifeLink> = { cook: { to: 'food' }, shower: { to: 'homes' }, sleep: { to: 'homes' }, relax: { to: 'park' }, study: { to: 'homes' } };
        if (!home) return goFor(fallback[link.use]);
        if (!indoors) return goFor({ to: 'home' });
        const kinds: Record<typeof link.use, FurnitureKind[]> = {
          shower: ['shower', 'bathtub'], cook: ['stove', 'counter', 'fridge'], sleep: ['bed'], study: ['desk'],
          relax: ['tv', 'console', 'sofa', 'armchair', 'bookshelf', 'speaker'],
        };
        const all = [...interior!.furniture, ...ownedPieces.map((p) => p.f)];
        const { x, z } = controller.position;
        const piece = all.filter((f) => kinds[link.use].includes(f.kind)).sort((a, b) => Math.hypot(a.at[0] - x, a.at[1] - z) - Math.hypot(b.at[0] - x, b.at[1] - z))[0];
        if (!piece) {
          setCatalogueOpen(true);
          return say(link.use === 'study' ? 'You don’t have a desk yet. Find one under Tables & desks.' : 'You don’t have anything for that yet.');
        }
        const spot = link.use === 'sleep' ? bedSpot(interior!) : spotToUse(piece);
        const ok = setMoveTarget(makeTarget(x, z, spot[0], spot[1], false), { label: piece.kind });
        return say(ok ? 'Press E when you get there.' : 'Something is in the way.');
      }
    }
  };
  /** Outdoor trips from inside your home: step outside first, then go once the street is loaded. */
  const onGo = (link: LifeLink) => {
    if (window.innerWidth < 640) setOsOpen(false);
    const staysIn = link.to === 'catalogue' || (link.to === 'homeUse' && !!home && indoors);
    // Step outside first; route once the street has replaced the room (next frames)
    if (indoors && !staysIn) { goOutside(); setTimeout(() => goForRef.current(link), 150); return; }
    goFor(link);
  };
  const goForRef = useRef(goFor);
  useEffect(() => { goForRef.current = goFor; });
  const runInPark = (minutes: number) => {
    setParkOpen(false);
    const here = parkAt(district.park, controller.position.x, controller.position.z);
    if (state.needs.energy < 15) { setArrival('You’re too tired to run. Rest first.'); return; }
    exercise(minutes, !!here);
    setArrival(`You ran for ${minutes} minutes in ${district.park.name}. Sweaty, tired and happier.`);
  };
  const openOs = (tab: OsTab) => { setOsTab(tab); setOsOpen(true); };
  // The area you're in (indoors: where the building's door is)
  const areaHere = indoors && home
    ? district.neighborhoods.find((n) => home.door[0] >= n.bounds.minX && home.door[0] <= n.bounds.maxX && home.door[2] >= n.bounds.minZ && home.door[2] <= n.bounds.maxZ) ?? neighborhood
    : neighborhood;
  const areaName = areaHere?.name ?? district.name;
  // Title plate: the building you're in, the place you're standing at, or the area
  const plate: PlacePlate = (() => {
    if (indoors && home) return { title: home.id === state.home ? `My ${home.kind}` : home.name, subtitle: areaName, icon: 'home' };
    const { x, z } = controller.position;
    const at = district.places.find((p) => Math.hypot(p.position[0] - x, p.position[2] - z) < PLATE_RADIUS);
    if (at) return { title: at.name, subtitle: PLATE_SUBTITLE[at.kind], icon: PLATE_ICON[at.kind] };
    return { title: areaName, subtitle: district.city.name, icon: 'palm' };
  })();
  const toggleOs = (tab: OsTab) => { if (osOpen && osTab === tab) setOsOpen(false); else openOs(tab); };
  const nav: NavItem[] = [
    indoors
      ? { id: 'home', label: 'Decor', icon: 'decor', onClick: () => setCatalogueOpen(true), active: catalogueOpen, title: 'Buy, place and arrange furniture' }
      : { id: 'home', label: 'Home', icon: 'home', onClick: () => onGo(state.home ? { to: 'home' } : { to: 'homes' }), title: state.home ? 'Walk home' : 'Find a home to rent' },
    { id: 'phone', label: 'Phone', icon: 'phone', onClick: () => toggleOs('today'), active: osOpen && osTab === 'today', title: 'Your Life OS: needs, goals and today (L)' },
    {
      id: 'map', label: 'Map', icon: 'map', active: mapOpen || locationsOpen,
      title: phone ? 'The map on your phone (M)' : 'Every place in the city',
      onClick: () => {
        if (phone) setMapOpen(true);
        else if (indoors) { goOutside(); setTimeout(() => setLocationsOpen(true), 150); }
        else setLocationsOpen(true);
      },
    },
    { id: 'inventory', label: 'Inventory', icon: 'bag', onClick: () => setStore('wardrobe'), active: store === 'wardrobe', title: 'Change into clothes you own' },
    { id: 'career', label: 'Career', icon: 'career', onClick: () => toggleOs('career'), active: osOpen && osTab === 'career', title: 'Your job, pay and promotions' },
    { id: 'social', label: 'Social', icon: 'social', onClick: () => toggleOs('people'), active: osOpen && osTab === 'people', title: 'The people you know' },
  ];
  const whereabouts = {
    place: indoors && home ? `At home, ${home.name}` : `${neighborhood?.name ?? district.name}, ${district.city.name}`,
    activity: sit.session ? `Sitting at ${sit.session.place}` : indoors ? 'At home'
      : character.career !== 'none' && isWorkingHours(state.time) && isAtWorkplace(district, character.career, controller.position.x, controller.position.z) ? 'Working'
        : getTrip()?.status === 'moving' ? `On the way${getTrip()?.label ? ` to ${getTrip()!.label}` : ''}` : 'Out and about',
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
      {catalogueOpen && (
        <FurnitureCatalogue
          balance={state.balance}
          owned={state.furniture}
          interior={interior}
          onBuy={buyFurniture}
          onSell={sellFurniture}
          onPlace={placeFurniture}
          onStore={storeFurniture}
          onClose={() => setCatalogueOpen(false)}
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
        <ParkPanel park={district.park} time={state.time} energy={state.needs.energy} onSit={sitInPark} onRun={runInPark} onClose={() => setParkOpen(false)} />
      )}
      {sit.session && <SitBar session={sit.session} onStand={sit.cancel} />}
      {nightOpen && (
        <NightlifePanel
          venue={district.nightlife}
          districtId={district.id}
          time={state.time}
          balance={state.balance}
          relationships={state.relationships}
          onNightOut={goOutWith}
          onSitOutside={() => sitOnTerrace(district.nightlife.name)}
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
              <HomeInterior key={`home-${home!.id}`} interior={interior} gameTime={state.time} extra={ownedPieces.map((p) => p.f)}>
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
      <Celebrations items={state.life.celebrations} />
      <SnapshotHost />
      {osOpen && (
        <LifeOS
          state={state}
          character={character}
          whereabouts={whereabouts}
          tab={osTab}
          onTab={setOsTab}
          onGo={onGo}
          onSetProfile={setProfile}
          onSetDream={setDream}
          onDismissWish={dismissWish}
          onSetSavingsGoal={setSavingsGoal}
          onOpenWardrobe={() => { setOsOpen(false); setStore('wardrobe'); }}
          // Step outside first, so you come back to the street (the room isn't restored after the creator)
          onEditLook={() => { if (indoors) goOutside(); onEditLook(); }}
          settings={{
            quality: qualityMode === 'auto' ? `Auto (${autoQuality})` : qualityMode, onCycleQuality: () => onQualityChange(nextQualityMode(qualityMode)), showRoute, onShowRouteChange,
            onRest: () => { setOsOpen(false); rest(atHome()); },
            restWhere: () => atHome() ? `In your bed at ${home!.name}.` : state.home ? 'Away from home: you\u2019ll sleep rough and wake less rested. Your bed is better.' : 'You have no home, so you\u2019ll sleep rough and wake less rested.',
            onExitToMenu,
          }}
          onClose={() => setOsOpen(false)}
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
        busy={!!sit.session}
        onTalk={setTalking}
        workTask={taskOnOffer() ? { place: getCareerLocation(district, character.career)?.name ?? 'work', onOpen: () => setTask(taskOnOffer()) } : null}
        controller={controller}
        character={character}
        balance={state.balance}
        gameTime={state.time}
        neighborhood={areaHere}
        homeId={state.home}
        onOpenHome={setHomePanel}
        insideHome={indoors && interior ? {
          name: home!.name,
          prompt: () => {
            const use = usableHere();
            if (nearSpot(bedSpot(interior))) return { verb: 'Sleep in your bed at', place: home!.name, onOpen: () => rest(true) };
            if (use) return { verb: use.verb, place: use.cost ? `${use.cost} GHAI` : 'at home', onOpen: operateHere };
            return nearSpot(doorSpot(interior)) ? { verb: 'Go back outside to', place: district.name, onOpen: goOutside } : null;
          },
        } : undefined}
        onOpenGadgets={() => setGadgets(true)}
        fullness={state.fullness}
        needs={state.needs}
        onOpenVendor={setVendor}
        onOpenShop={() => setStore('shop')}
        place={plate}
        nav={nav}
        mapPosition={indoors && home ? { x: home.door[0], z: home.door[2] } : null}
        onOpenMoney={() => openOs('money')}
        onOpenInventory={() => setStore('wardrobe')}
        onOpenProfile={() => openOs('profile')}
        onOpenSettings={() => openOs('settings')}
        onOpenNeeds={() => openOs('today')}
      />
    </main>
  );
}
