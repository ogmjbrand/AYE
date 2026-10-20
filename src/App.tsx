import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls as OrbitControlsImpl, PerformanceMonitor } from '@react-three/drei';
import type { OrbitControls } from 'three-stdlib';
import { ACESFilmicToneMapping, Vector3, type Group } from 'three';
import { getTrip, placePlayer, setMovementBlocked, setMoveTarget, subscribeTrip, usePlayerController } from './hooks/usePlayerController';
import { useCurrentNeighborhood } from './hooks/useCurrentNeighborhood';
import { useGameState } from './hooks/useGameState';
import { activeLayout, groundHeightAt, movingObstacles, setActiveLayout } from './lib/world';
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
import { nearestVendor, suitsDiet, type Dish, type FoodVendor } from './lib/food';
import {
  cancelDiningTransaction,
  createDiningTransaction,
  settleDiningTransaction,
  transitionDiningTransaction,
} from './lib/restaurant';
import type { FashionItem, Slot } from './lib/fashion';
import { fashionShowcaseResult } from './lib/fashionShowcase';
import { FASHION_MISSION_REWARD, fashionMissionStage } from './lib/fashionMission';
import { FashionStore } from './components/FashionStore';
import { HomePanel } from './components/HomePanel';
import { GadgetStore } from './components/GadgetStore';
import { MapPanel } from './components/MapPanel';
import { CityLocationsPanel } from './components/CityLocationsPanel';
import { locationsFor, type LocationEntry } from './lib/locations';
import { TripStatus } from './components/TripStatus';
import { NightlifePanel } from './components/NightlifePanel';
import { venueAt } from './lib/nightlife';
import { parkAt } from './lib/parks';
import { ParkPanel } from './components/ParkPanel';
import { SitBar } from './components/SitBar';
import { useSitSession } from './hooks/useSitSession';
import { benchSeats, chairSeats, nearestSeat, type Seat } from './lib/seating';
import type { WaitMinutes } from './lib/parks';
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
import { RestaurantScene } from './world/RestaurantScene';
import { OfficeScene } from './world/OfficeScene';
import { FashionHouseScene } from './world/FashionHouseScene';
import { DecorPlacementPreview } from './world/DecorPlacementPreview';
import {
  FASHION_HOUSE_INTERIOR,
  RESTAURANT_INTERIOR,
  RESTAURANT_TABLES,
  doorSpot,
  fashionHouseInteractionAt,
  homeInteractionAt,
  interiorFor,
  interiorLayout,
  restaurantInteractionAt,
  restaurantTableById,
  type HomeAction,
} from './lib/interiors';
import { canPlaceDecor, decorItemById, furnitureForHome, type HomeDecorPlacement } from './lib/homeDecor';
import { officeInteractionAt, OFFICE_INTERIOR, OFFICE_TASK_SEATS, OFFICE_WORKPLACE, officeTaskId, type OfficeInteraction } from './lib/officeCareer';
import { OfficePanel } from './components/OfficePanel';
import { SceneLighting as InteriorLighting } from './world/SceneLighting';
import { gameDay, isAdultResident, residentById, residentFacing, residentNear, residentPosition, type Resident } from './lib/people';
import { canResidentAcceptHug, findHugPlan, type HugSession } from './lib/hug';
import { pedestrianInTrafficPath, trafficSnapshot } from './lib/traffic';
import { formatDuration, travelOption, type TravelMode } from './lib/travel';
import { HomeMarkers } from './world/HomeMarkers';
import { HOME_RADIUS, distanceToDoor, homeAtDoor, homeById, type Home } from './lib/homes';
import { loadCharacter, saveCharacter } from './lib/save';
import { EntryScreen } from './components/EntryScreen';
import { loadSettings, nextQualityMode, saveSettings, type QualityMode, type Settings } from './lib/settings';
import { getCareerLocation, isAtWorkplace } from './lib/careers';
import { BedDouble, BriefcaseBusiness, CookingPot, DoorOpen, FileText, Monitor, ScanEye, ShowerHead, Shirt, Sofa, Tv, Users } from 'lucide-react';
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
  hugSession: HugSession | null;
  onHugComplete: (residentId: string) => void;
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

function City({ controller, character, gameTime, tryOn, homeId, district, talkingTo, hugSession, onHugComplete }: CityProps) {
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
      <Residents player={controller} talkingTo={talkingTo} hugSession={hugSession} />
      <Traffic player={controller} />
      {quality.contactShadows && <FootShadow controller={controller} />}
      <Player
        controller={controller}
        character={character}
        tryOn={tryOn}
        conversing={talkingTo !== null}
        conversationTarget={talkingTo}
        hugSession={hugSession}
        onHugComplete={onHugComplete}
      />
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

interface DecorPlacementSession {
  itemId: string;
  placementId: string | null;
  previewOnly: boolean;
  rotation: number;
}

const EMPTY_HOME_DECOR: HomeDecorPlacement[] = [];

/** The district the player was last placed in, so returning from the menu keeps their spot. */
let placedIn: string | null = null;

function Game({ character, quality: qualityMode, onQualityChange, showRoute, onShowRouteChange, onExitToMenu, onCharacterUpdate }: GameProps) {
  const controller = usePlayerController();
  // Read on every game tick, so it always sees the district the player is in now
  const districtRef = useRef<District | null>(null);
  // Inside your own home (room coordinates): never counts as being at work
  const insideRef = useRef(false);
  const { state, rest, dismissSummary, eat, moveIn, moveOut, buyEquipment, travel, socialise, hug, fashionShowcase, buyFashionItem, purchase, nightOut, wait, workTask, officeApply, officeClockIn, officeTask, officeClockOut } = useGameState(
    character,
    () => character.career !== 'none' && !!districtRef.current && !insideRef.current &&
      isAtWorkplace(districtRef.current, character.career, controller.position.x, controller.position.z),
  );
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const district = districtById(state.districtId);
  const home = homeById(state.home);
  const [inside, setInside] = useState(false);
  const [insideOffice, setInsideOffice] = useState(false);
  const [insideRestaurant, setInsideRestaurant] = useState(false);
  const [insideFashionHouse, setInsideFashionHouse] = useState(false);
  const [decorPlacement, setDecorPlacement] = useState<DecorPlacementSession | null>(null);
  const decorCommitInProgress = useRef(false);
  const [restaurantVendor, setRestaurantVendor] = useState<FoodVendor | null>(null);
  const [restaurantStage, setRestaurantStage] = useState<'host' | 'walking' | 'menu' | 'ordered' | 'served' | 'eating' | 'finished'>('host');
  const [restaurantTableId, setRestaurantTableId] = useState<string | null>(null);
  const [restaurantOrder, setRestaurantOrder] = useState<Dish | null>(null);
  const [restaurantDeliveryReady, setRestaurantDeliveryReady] = useState(false);
  const restaurantTransaction = useRef<ReturnType<typeof createDiningTransaction> | null>(null);
  const restaurantOrderSequence = useRef(0);
  const restaurantAnimationTimer = useRef<number | null>(null);
  const [eating, setEating] = useState(false);
  const completeRestaurantDelivery = useCallback(() => setRestaurantDeliveryReady(true), []);
  const persistedDecor = character.homeDecor ?? EMPTY_HOME_DECOR;
  const interior = useMemo(() => {
    const baseInterior = insideFashionHouse ? FASHION_HOUSE_INTERIOR
      : insideOffice && district.id === OFFICE_WORKPLACE.districtId
        ? OFFICE_INTERIOR
        : insideRestaurant && restaurantVendor ? RESTAURANT_INTERIOR
          : home ? interiorFor(home) : null;
    if (!baseInterior || !home || insideFashionHouse || insideOffice || insideRestaurant) return baseInterior;
    return {
      ...baseInterior,
      furniture: [
        ...baseInterior.furniture,
        ...furnitureForHome(persistedDecor.filter((item) => item.id !== decorPlacement?.placementId), home.id),
      ],
    };
  }, [insideFashionHouse, insideOffice, district.id, insideRestaurant, restaurantVendor, home, persistedDecor, decorPlacement?.placementId]);
  const roomLayout = useMemo(() => {
    if (!interior) return null;
    const layout = interiorLayout(interior);
    if (insideFashionHouse) return { ...layout, id: 'interior.fashion-house' };
    if (insideOffice) return { ...layout, id: 'interior.office' };
    if (insideRestaurant) return { ...layout, id: 'interior.restaurant' };
    return layout;
  }, [interior, insideFashionHouse, insideOffice, insideRestaurant]);
  const indoors = !!roomLayout && (insideFashionHouse
    ? true
    : insideOffice
      ? district.id === OFFICE_WORKPLACE.districtId
    : insideRestaurant
      ? !!restaurantVendor
      : inside && !!home && home.district === district.id);
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
  const [hugging, setHugging] = useState<HugSession | null>(null);
  const [task, setTask] = useState<WorkTask | null>(null);
  const [officePanel, setOfficePanel] = useState<'reception' | OfficeInteraction | null>(null);
  const [officeSeatRequested, setOfficeSeatRequested] = useState<'computer' | 'meeting' | null>(null);
  const [arrival, setArrival] = useState<string | null>(null);
  useEffect(() => {
    if (!arrival) return;
    const id = setTimeout(() => setArrival(null), 6000);
    return () => clearTimeout(id);
  }, [arrival]);
  useEffect(() => () => {
    if (restaurantAnimationTimer.current !== null) window.clearTimeout(restaurantAnimationTimer.current);
  }, []);
  const book = (to: District, mode: TravelMode) => {
    const option = travelOption(district.city, to.city, mode);
    if (!option || state.balance < option.fare) return;
    travel(to.id, mode);
    setInside(false);
    setTravelOpen(false);
    setTrackedId(null);
    setArrival(`You arrived in ${to.city.name} after ${formatDuration(option.minutes)} by ${option.label.toLowerCase()}.`);
  };
  const requestHug = (resident: Resident): string | null => {
    const relationship = state.relationships[resident.id];
    const points = relationship?.points ?? 0;
    const today = gameDay(state.time.totalMinutes);
    if (!isAdultResident(resident) || !canResidentAcceptHug(isAdultResident(resident), points)) {
      return `${resident.name.split(' ')[0]} would like to know you better before sharing a hug.`;
    }
    if ((relationship?.lastHugDay ?? -1) === today) {
      return `You and ${resident.name.split(' ')[0]} have already shared a hug today.`;
    }

    const currentResident = residentPosition(resident);
    const obstacles = [...activeLayout().obstacles, ...movingObstacles];
    const plan = findHugPlan(controller.position, currentResident, obstacles);
    if (!plan) {
      return 'We cannot reach a clear, unobstructed position to share a hug here.';
    }
    const traffic = trafficSnapshot();
    if (
      pedestrianInTrafficPath({ x: plan.player.x, z: plan.player.z, vx: 0, vz: 0 }, traffic.cars, traffic.lanes)
      || pedestrianInTrafficPath({ x: plan.resident.x, z: plan.resident.z, vx: 0, vz: 0 }, traffic.cars, traffic.lanes)
    ) {
      return 'Traffic is too close right now. Try again when the area is clear.';
    }

    setHugging({
      residentId: resident.id,
      playerFrom: { x: controller.position.x, z: controller.position.z, facing: controller.direction },
      residentFrom: { x: currentResident.x, z: currentResident.z, facing: residentFacing(resident) },
      playerTarget: plan.player,
      residentTarget: plan.resident,
      playerPath: plan.playerPath,
      residentPath: plan.residentPath,
      approachMs: plan.approachMs,
      startedAt: Date.now(),
    });
    setTalking(null);
    return null;
  };
  const finishHug = (residentId: string) => {
    const hugged = residentById(residentId);
    hug(residentId);
    setHugging(null);
    if (hugged) setArrival(`You and ${hugged.name.split(' ')[0]} share a friendly hug.`);
  };
  const controlsRef = useRef<OrbitControls | null>(null);
  const [vendor, setVendor] = useState<FoodVendor | null>(null);
  const [store, setStore] = useState<'shop' | 'wardrobe' | 'decor' | null>(null);
  const [tryOn, setTryOn] = useState<Partial<Record<Slot, string | null>>>({});
  const [homePanel, setHomePanel] = useState<Home | null>(null);
  /** Puts the camera straight behind the player after a jump (going in or out of a building). */
  const snapCamera = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const { x, z } = controller.position;
    const d = controller.direction;
    controls.target.set(x, CAMERA_TARGET_HEIGHT, z);
    controls.object.position.set(x - Math.sin(d) * 4.2, CAMERA_TARGET_HEIGHT + 1.6, z - Math.cos(d) * 4.2);
    controls.update();
  }, [controller]);
  const snapIndoorCamera = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const { x, z } = controller.position;
    const d = controller.direction + 0.45;
    controls.target.set(x, CAMERA_TARGET_HEIGHT, z);
    controls.object.position.set(x + Math.sin(d) * 4.2, CAMERA_TARGET_HEIGHT + 5.3, z + Math.cos(d) * 4.2);
    controls.update();
  }, [controller]);
  const snapFashionCamera = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const { x, z } = controller.position;
    const d = controller.direction;
    controls.target.set(x, CAMERA_TARGET_HEIGHT, z + Math.cos(d) * 1.35);
    controls.object.position.set(x - Math.sin(d) * 3.4, CAMERA_TARGET_HEIGHT + 1.35, z - Math.cos(d) * 3.4);
    controls.update();
  }, [controller]);
  const enterRestaurant = (foodVendor: FoodVendor) => {
    if (restaurantAnimationTimer.current !== null) window.clearTimeout(restaurantAnimationTimer.current);
    restaurantAnimationTimer.current = null;
    setEating(false);
    setVendor(null);
    setRestaurantVendor(foodVendor);
    setInsideRestaurant(true);
    setInside(false);
    setInsideOffice(false);
    setRestaurantStage('host');
    setRestaurantTableId(null);
    setRestaurantOrder(null);
    setRestaurantDeliveryReady(false);
    restaurantTransaction.current = cancelDiningTransaction(restaurantTransaction.current);
    restaurantTransaction.current = null;
    setMovementBlocked(false);
    const [x, z] = doorSpot(RESTAURANT_INTERIOR);
    placePlayer([x, 0, z], 0);
    snapIndoorCamera();
  };
  const enterFashionHouse = () => {
    setInside(false);
    setInsideOffice(false);
    setInsideRestaurant(false);
    setInsideFashionHouse(true);
    setHomePanel(null);
    const [x, doorZ] = doorSpot(FASHION_HOUSE_INTERIOR);
    placePlayer([x, 0, doorZ + 1.6], 0);
    setStore('shop');
    snapFashionCamera();
  };
  const goInside = useCallback(() => {
    if (!interior || insideOffice || insideRestaurant || insideFashionHouse) return;
    setHomePanel(null);
    setInside(true);
    placePlayer([doorSpot(interior)[0], 0, doorSpot(interior)[1]], 0);
    snapIndoorCamera();
  }, [interior, insideOffice, insideRestaurant, insideFashionHouse, snapIndoorCamera, setHomePanel, setInside]);
  const goIntoOffice = useCallback(() => {
    if (district.id !== OFFICE_WORKPLACE.districtId || insideOffice) return;
    setHomePanel(null);
    setInside(false);
    setInsideOffice(true);
    const [x, z] = doorSpot(OFFICE_INTERIOR);
    placePlayer([x, 0, z], 0);
    snapIndoorCamera();
  }, [district.id, insideOffice, snapIndoorCamera, setHomePanel, setInside, setInsideOffice]);
  const goOutside = () => {
    if (insideFashionHouse) {
      setInsideFashionHouse(false);
      setStore(null);
      setTryOn({});
      placePlayer(district.fashionHouse.position, Math.PI);
    } else if (insideOffice) {
      setInsideOffice(false);
      setOfficeSeatRequested(null);
      sit.cancel();
      placePlayer(OFFICE_WORKPLACE.position, Math.PI);
    } else if (insideRestaurant && restaurantVendor) {
      const exterior = restaurantVendor.position;
      if (restaurantAnimationTimer.current !== null) window.clearTimeout(restaurantAnimationTimer.current);
      restaurantAnimationTimer.current = null;
      setEating(false);
      setInsideRestaurant(false);
      setVendor(null);
      setRestaurantVendor(null);
      setRestaurantStage('host');
      setRestaurantTableId(null);
      setRestaurantOrder(null);
      restaurantTransaction.current = cancelDiningTransaction(restaurantTransaction.current);
      restaurantTransaction.current = null;
      sit.cancel();
      placePlayer(exterior, Math.PI);
    } else {
      setInside(false);
      setDecorPlacement(null);
      if (home) placePlayer(home.door, Math.PI);
    }
    snapCamera();
  };
  const homeDestinationId = home ? `${home.district}.home.${home.id}` : null;
  const goHome = () => {
    if (!home || indoors || !interior) return;
    if (home.district !== district.id) {
      setTravelOpen(true);
      return;
    }
    setMovementBlocked(false);
    setHomePanel(null);
    if (distanceToDoor(home, controller.position.x, controller.position.z) <= HOME_RADIUS) {
      goInside();
      return;
    }
    const [x, , z] = home.door;
    const started = setMoveTarget(
      makeTarget(controller.position.x, controller.position.z, x, z, false),
      { destinationId: homeDestinationId ?? undefined, label: home.name },
    );
    if (!started) setArrival(`Couldn't find a clear route to ${home.name}.`);
  };
  useEffect(() => {
    const onTrip = () => {
      const trip = getTrip();
      if (trip?.status !== 'arrived' || trip.destinationId !== homeDestinationId || !home || !interior) return;
      if (home.district === district.id && distanceToDoor(home, controller.position.x, controller.position.z) <= HOME_RADIUS) {
        goInside();
      } else {
        setArrival(`You reached the street near ${home.name}, but not its entrance.`);
      }
    };
    return subscribeTrip(onTrip);
  }, [homeDestinationId, home, interior, district.id, controller, goInside]);
  /** This hour's work task, if you're at your workplace during working hours and haven't done it yet. */
  const taskOnOffer = (): WorkTask | null => {
    if (indoors || character.career === 'none' || !isWorkingHours(state.time) || state.summary) return null;
    if (state.lastTaskHour === Math.floor(state.time.totalMinutes / 60)) return null;
    if (!isAtWorkplace(district, character.career, controller.position.x, controller.position.z)) return null;
    return taskForHour(character.career, state.time.totalMinutes);
  };
  const hourlyPay = Math.round(HOURLY_WAGE[character.career] * careerLevel(character.career, state.workMinutes).pay * equipmentPay(state.equipment, character.career));
  const [gadgets, setGadgets] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [trackedId, setTrackedId] = useState<string | null>(null);
  const locations = useMemo(() => locationsFor(district, character.career, state.home), [district, character.career, state.home]);
  const trackedLocation = locations.find((l) => l.id === trackedId && l.position) ?? null;
  /** Standing at this location right now, so its existing panel can open. */
  const canUseNow = (e: LocationEntry) => {
    const { x, z } = controller.position;
    if (e.use === 'food') { const v = nearestVendor(district.vendors, x, z); return !!v && `${district.id}.${v.id}` === e.id; }
    if (e.use === 'shop') return counterAt(district, x, z) === 'fashion';
    if (e.use === 'gadgets') return counterAt(district, x, z) === 'gadgets';
    if (e.use === 'travel') return counterAt(district, x, z) === 'travel';
    if (e.use === 'home') { const h = homeAtDoor(district.id, x, z); return !!h && `${district.id}.home.${h.id}` === e.id; }
    return false;
  };
  const useLocation = (e: LocationEntry) => {
    setLocationsOpen(false);
    if (e.use === 'food') { const v = district.vendors.find((v) => `${district.id}.${v.id}` === e.id); if (v) enterRestaurant(v); }
    else if (e.use === 'shop') enterFashionHouse();
    else if (e.use === 'gadgets') setGadgets(true);
    else if (e.use === 'travel') setTravelOpen(true);
    else if (e.use === 'home') { const h = district.homes.find((h) => `${district.id}.home.${h.id}` === e.id); if (h) setHomePanel(h); }
  };
  const phone = hasMap(state.equipment);
  // At your own front door you sleep at home; anywhere else is sleeping rough
  const atHome = () => indoors || (!!home && home.district === district.id && distanceToDoor(home, controller.position.x, controller.position.z) <= HOME_RADIUS);

  // Sitting down somewhere (park benches, the lounge terrace): see sitInPark and sitOnTerrace below
  const onInteriorSeat = useCallback((seat: Seat) => {
    if (insideRestaurant && restaurantVendor && restaurantStage === 'walking') {
      setRestaurantStage('menu');
      setVendor(restaurantVendor);
    }
    if (insideOffice && officeSeatRequested && OFFICE_TASK_SEATS[officeSeatRequested]?.id === seat.id) {
      setOfficePanel(officeSeatRequested);
      setOfficeSeatRequested(null);
    }
  }, [
    insideRestaurant,
    restaurantVendor,
    restaurantStage,
    insideOffice,
    officeSeatRequested,
    setRestaurantStage,
    setVendor,
    setOfficePanel,
    setOfficeSeatRequested,
  ]);
  const onInteriorSeatInterrupted = useCallback(() => {
    if (insideRestaurant && restaurantStage === 'finished') {
      setRestaurantTableId(null);
    } else if (insideRestaurant && restaurantStage !== 'host') {
      if (restaurantAnimationTimer.current !== null) window.clearTimeout(restaurantAnimationTimer.current);
      restaurantAnimationTimer.current = null;
      setEating(false);
      restaurantTransaction.current = cancelDiningTransaction(restaurantTransaction.current);
      restaurantTransaction.current = null;
      setRestaurantStage('host');
      setRestaurantTableId(null);
      setRestaurantOrder(null);
      setVendor(null);
      setArrival('Your meal was interrupted. The table is available again and no payment was taken.');
    }
    if (insideOffice && officeSeatRequested) {
      setOfficeSeatRequested(null);
      setArrival('Your walk to the workstation was interrupted. Try the station again when ready.');
    }
  }, [
    insideRestaurant,
    restaurantStage,
    insideOffice,
    officeSeatRequested,
    setEating,
    setRestaurantStage,
    setRestaurantTableId,
    setRestaurantOrder,
    setVendor,
    setOfficeSeatRequested,
    setArrival,
  ]);
  const sit = useSitSession(controller, wait, onInteriorSeat, onInteriorSeatInterrupted);
  const restaurantTableChoices = RESTAURANT_TABLES
    .filter((table) => table.id !== 'table-2' && table.id !== 'table-4' && table.id !== restaurantTableId)
    .map((table, index) => ({ id: table.id, label: index === 0 ? 'Window table' : 'Garden table' }));
  const chooseRestaurantTable = (tableId: string) => {
    const table = restaurantTableById(tableId);
    if (!table || !restaurantVendor || !insideRestaurant) return;
    const seat = table.seats.reduce((nearest, candidate) =>
      Math.hypot(candidate.x - controller.position.x, candidate.z - controller.position.z)
        < Math.hypot(nearest.x - controller.position.x, nearest.z - controller.position.z)
        ? candidate : nearest,
    );
    setRestaurantTableId(tableId);
    setRestaurantDeliveryReady(false);
    setRestaurantStage('walking');
    setVendor(null);
    setMovementBlocked(false);
    if (!sit.start({ seat, place: `${restaurantVendor.name} · ${tableId.replace('-', ' ')}`, minutes: 0 })) {
      setRestaurantStage('host');
      setArrival('There is no clear path to that table. Please choose another one.');
      setVendor(restaurantVendor);
    }
  };
  const orderRestaurantMeal = (dish: Dish) => {
    if (
      restaurantTransaction.current || !insideRestaurant || restaurantStage !== 'menu'
      || !suitsDiet(dish, character.diet) || state.balance < dish.price
    ) return;
    restaurantOrderSequence.current += 1;
    restaurantTransaction.current = createDiningTransaction(
      `restaurant-order-${restaurantOrderSequence.current}`,
      dish.id,
    );
    setRestaurantDeliveryReady(false);
    setRestaurantOrder(dish);
    setRestaurantStage('ordered');
  };
  const waitForRestaurantMeal = () => {
    const transaction = restaurantTransaction.current;
    if (
      !transaction || transaction.status !== 'ordered' || restaurantStage !== 'ordered'
      || !restaurantOrder || state.summary || restaurantDeliveryReady
    ) return;
    const served = transitionDiningTransaction(transaction, 'served');
    if (!served) return;
    restaurantTransaction.current = served;
    wait(5);
    setRestaurantStage('served');
  };
  const eatRestaurantMeal = () => {
    const transaction = restaurantTransaction.current;
    if (
      !transaction || transaction.status !== 'served' || restaurantStage !== 'served' || !restaurantOrder
      || !restaurantDeliveryReady || state.summary || state.balance < restaurantOrder.price || !suitsDiet(restaurantOrder, character.diet)
    ) return;
    const eatingTransaction = transitionDiningTransaction(transaction, 'eating');
    if (!eatingTransaction) return;
    restaurantTransaction.current = eatingTransaction;
    setRestaurantStage('eating');
    setEating(true);
    restaurantAnimationTimer.current = window.setTimeout(() => {
      restaurantAnimationTimer.current = null;
      setEating(false);
      const currentTransaction = restaurantTransaction.current;
      if (!currentTransaction || currentTransaction.status !== 'eating') return;
      if (!insideRestaurant || stateRef.current.summary || stateRef.current.balance < restaurantOrder.price) {
        restaurantTransaction.current = transitionDiningTransaction(currentTransaction, 'served');
        setRestaurantStage('served');
        setArrival('You could not complete the meal. The order is still on the table; payment has not been taken.');
        return;
      }
      const settlement = settleDiningTransaction(currentTransaction, restaurantOrder.price);
      if (settlement.payment === 0) return;
      restaurantTransaction.current = settlement.transaction;
      eat(settlement.payment, restaurantOrder.fullness);
      setRestaurantStage('finished');
    }, 2800);
  };
  const leaveRestaurant = () => {
    if (restaurantStage !== 'finished') return;
    setVendor(null);
    setRestaurantDeliveryReady(false);
    sit.cancel();
    goOutside();
  };
  const sofaSeat = (): Seat | null => {
    const sofa = interior?.furniture.find((f) => f.kind === 'sofa');
    return sofa ? { id: 'home-sofa', x: sofa.at[0], z: sofa.at[1], facing: Math.PI, height: 0.45 } : null;
  };
  const interactAtHome = (action: HomeAction) => {
    if (!interior || !home || insideOffice) return;
    if (action === 'door') goOutside();
    else if (action === 'bed') rest(true);
    else if (action === 'wardrobe' || action === 'mirror') setStore('wardrobe');
    else if (action === 'sofa' || action === 'tv') {
      const seat = sofaSeat();
      if (seat) sit.start({ seat, place: action === 'tv' ? `Watching TV at ${home.name}` : `Sitting at ${home.name}`, minutes: 30 });
    } else if (action === 'kitchen') {
      wait(15);
      setArrival('You spend 15 minutes in the kitchen.');
    } else if (action === 'bathroom') {
      wait(15);
      setArrival('You spend 15 minutes in the bathroom.');
    }
  };
  const officeActionAt = (): OfficeInteraction | null => {
    if (!insideOffice || !indoors || !interior) return null;
    return officeInteractionAt(interior, controller.position.x, controller.position.z);
  };
  const interactWithOffice = (action: OfficeInteraction) => {
    if (!insideOffice || !indoors) return;
    if (action === 'door') {
      goOutside();
      return;
    }
    if (action === 'reception') {
      setOfficePanel('reception');
      return;
    }
    if (!state.officeCareer.employed) {
      setArrival('Visit reception to apply for the Office Assistant position.');
      return;
    }
    if (!state.officeCareer.activeShift) {
      setArrival('Clock in at reception before starting workplace tasks.');
      return;
    }
    if (action === 'computer' || action === 'meeting') {
      const seat = OFFICE_TASK_SEATS[action];
      if (!seat) return;
      if (sit.session?.phase !== 'seated' || sit.session.seat.id !== seat.id) {
        setOfficeSeatRequested(action);
        setOfficePanel(null);
        setMovementBlocked(false);
        if (!sit.start({ seat, place: action === 'computer' ? 'Your assigned workstation' : 'The team meeting table', minutes: 0 })) {
          setOfficeSeatRequested(null);
          setArrival('There is no clear route to that workstation.');
        }
        return;
      }
    }
    setOfficePanel(action);
  };

  // E opens the food vendor or the boutique you're standing at
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (decorPlacement && e.target instanceof HTMLInputElement) return;
      if (decorPlacement && e.key.toLowerCase() === 'r') {
        setDecorPlacement((current) => current && ({
          ...current,
          rotation: (current.rotation + Math.PI / 2) % (Math.PI * 2),
        }));
        return;
      }
      if (decorPlacement && (e.key === 'Enter' || e.key.toLowerCase() === 'e')) {
        e.preventDefault();
        placeSelectedDecor();
        return;
      }
      if (decorPlacement && e.key === 'Escape') {
        setDecorPlacement(null);
        return;
      }
      if (e.key.toLowerCase() !== 'e' || e.target instanceof HTMLInputElement) return;
      // E on a seat gets you up; on the way to one it does nothing
      if (sit.session) {
        if (sit.session.phase === 'seated') sit.cancel();
        return;
      }
      if (indoors && interior) {
        if (insideRestaurant && restaurantVendor) {
          const action = restaurantInteractionAt(controller.position.x, controller.position.z);
          if (action === 'door') goOutside();
          else if (action === 'host') setVendor(restaurantVendor);
        } else if (insideOffice) {
          const action = officeActionAt();
          if (action) interactWithOffice(action);
        } else if (insideFashionHouse) {
          const action = fashionHouseInteractionAt(controller.position.x, controller.position.z);
          if (action === 'door') goOutside();
          else if (action === 'catalogue') setStore('shop');
        } else {
          const action = homeInteractionAt(interior, controller.position.x, controller.position.z);
          if (action) interactAtHome(action);
        }
        return;
      }
      const { x, z } = controller.position;
      const near = nearestVendor(district.vendors, x, z);
      const counter = counterAt(district, x, z);
      const door = homeAtDoor(district.id, x, z);
      const officeEntrance = district.id === OFFICE_WORKPLACE.districtId
        && Math.hypot(OFFICE_WORKPLACE.position[0] - x, OFFICE_WORKPLACE.position[2] - z) <= OFFICE_WORKPLACE.radius;
      if (near) enterRestaurant(near);
      else if (counter === 'fashion') enterFashionHouse();
      else if (counter === 'gadgets') setGadgets(true);
      else if (counter === 'travel') setTravelOpen(true);
      else if (officeEntrance) goIntoOffice();
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
    setMovementBlocked(vendor !== null || store !== null || homePanel !== null || gadgets || travelOpen || talking !== null || hugging !== null || task !== null || officePanel !== null || locationsOpen || nightOpen || parkOpen);
    return () => setMovementBlocked(false);
  }, [vendor, store, homePanel, gadgets, travelOpen, talking, hugging, task, officePanel, locationsOpen, nightOpen, parkOpen]);

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
    if (store !== 'wardrobe' || !controls) return;
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
    if (state.summary || wardrobe.owned.includes(item.id) || state.balance < item.price) return;
    buyFashionItem(item.id);
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
  const attendFashionShowcase = (): string | null => {
    if (state.summary) return 'The showcase is paused while you review today’s summary.';
    if (state.lastShowcaseDay === gameDay(state.time.totalMinutes)) return null;
    const result = fashionShowcaseResult(wardrobe);
    const missionReady = fashionMissionStage(state.fashionMissionItemId, state.fashionMissionCompleted, wardrobe) === 'showcase';
    fashionShowcase(wardrobe);
    return `${result.tier} · ${result.score}/100. You earned ${result.reward.toLocaleString()} ⓒ for the showcase.${missionReady ? ` First Look mission complete · +${FASHION_MISSION_REWARD} ⓒ bonus.` : ''}`;
  };
  const closeStore = () => {
    setStore(null);
    setTryOn({});
  };
  const startDecorPlacement = (itemId: string, placementId: string | null = null): string | null => {
    const item = decorItemById(itemId);
    if (!item) return 'That furniture item is no longer available.';
    if (!home) return 'Move into a home before buying or placing furniture.';
    if (home.district !== district.id) {
      return `Travel to ${home.name} in ${districtById(home.district).city.name} to preview and place furniture.`;
    }
    const existing = placementId ? persistedDecor.find((entry) => entry.id === placementId) : null;
    if (placementId && (!existing || existing.itemId !== itemId || existing.homeId !== home.id)) {
      return 'That furniture is not available in this home.';
    }
    if (!(inside && !insideFashionHouse && !insideOffice && !insideRestaurant)) {
      setInside(false);
      setInsideOffice(false);
      setInsideRestaurant(false);
      setInsideFashionHouse(false);
      setInside(true);
      const homeRoom = interiorFor(home);
      const [x, z] = doorSpot(homeRoom);
      placePlayer([x, 0, z + 1.6], 0);
      snapIndoorCamera();
    }
    setStore(null);
    setTryOn({});
    decorCommitInProgress.current = false;
    setDecorPlacement({
      itemId,
      placementId,
      previewOnly: placementId === null,
      rotation: existing?.rotation ?? 0,
    });
    return null;
  };
  const rotateDecorPreview = () => {
    setDecorPlacement((current) => current && ({
      ...current,
      rotation: (current.rotation + Math.PI / 2) % (Math.PI * 2),
    }));
  };
  const cancelDecorPlacement = () => setDecorPlacement(null);
  function placeSelectedDecor() {
    if (!decorPlacement || decorCommitInProgress.current) return;
    if (!home || home.district !== district.id || !inside) {
      setArrival('Furniture can only be placed inside your current home.');
      setDecorPlacement(null);
      return;
    }
    if (state.summary) {
      setArrival('Furniture placement is paused while you review today’s summary.');
      return;
    }
    const item = decorItemById(decorPlacement.itemId);
    if (!item) {
      setArrival('That furniture item is no longer available.');
      setDecorPlacement(null);
      return;
    }
    if (decorPlacement.previewOnly && state.balance < item.price) {
      setArrival(`You need ${item.price.toLocaleString()} ⓒ to buy the ${item.name}.`);
      return;
    }
    const { x, z } = controller.position;
    const at = [
      x + Math.sin(controller.direction) * 1.35,
      z + Math.cos(controller.direction) * 1.35,
    ] as const;
    const existingPlacements = persistedDecor.filter((entry) =>
      entry.homeId === home.id && entry.id !== decorPlacement.placementId,
    );
    const existingFurniture = [
      ...interiorFor(home).furniture,
      ...furnitureForHome(existingPlacements, home.id),
    ];
    if (!canPlaceDecor(interiorFor(home), item, at, decorPlacement.rotation, existingFurniture)) {
      setArrival('There is not enough clear space there. Walk to an open spot and try again.');
      return;
    }
    decorCommitInProgress.current = true;
    if (decorPlacement.previewOnly) {
      purchase(item.price);
      const placement: HomeDecorPlacement = {
        id: crypto.randomUUID(),
        itemId: item.id,
        homeId: home.id,
        at,
        rotation: decorPlacement.rotation,
      }
      onCharacterUpdate({ ...character, homeDecor: [...persistedDecor, placement] });
    } else {
      onCharacterUpdate({
        ...character,
        homeDecor: persistedDecor.map((entry) => entry.id === decorPlacement.placementId
          ? { ...entry, at, rotation: decorPlacement.rotation }
          : entry),
      });
    }
    setDecorPlacement(null);
    setArrival(`${item.name} placed in ${home.name}.`);
  };
  // 'auto' starts high and drops to low on sustained low frame rates; the player can force either
  const [autoQuality, setAutoQuality] = useState<Quality>('high');
  const settings = settingsFor(qualityMode === 'auto' ? autoQuality : qualityMode);
  const decorPlacementItem = decorPlacement ? decorItemById(decorPlacement.itemId) : undefined;

  return (
    <main className="game">
      {vendor && (
        <FoodMenu
          key={vendor.id}
          vendor={vendor}
          diet={character.diet}
          balance={state.balance}
          fullness={state.fullness}
          phase={restaurantStage}
          tableChoices={restaurantTableChoices}
          selectedTable={restaurantTableId}
          orderedDish={restaurantOrder}
          mealDelivered={restaurantDeliveryReady}
          onChooseTable={chooseRestaurantTable}
          onOrder={orderRestaurantMeal}
          onWaitForService={waitForRestaurantMeal}
          onEatMeal={eatRestaurantMeal}
          onLeave={leaveRestaurant}
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
          homeId={home?.id ?? null}
          homeDecor={persistedDecor}
          balance={state.balance}
          tryOn={tryOn}
          onTryOn={(slot, id) => setTryOn((t) => ({ ...t, [slot]: id }))}
          onBuy={buy}
          onEquip={wear}
          today={gameDay(state.time.totalMinutes)}
          lastShowcaseDay={state.lastShowcaseDay}
          fashionMissionItemId={state.fashionMissionItemId}
          fashionMissionCompleted={state.fashionMissionCompleted}
          onAttendShowcase={attendFashionShowcase}
          onPreviewDecor={(itemId) => startDecorPlacement(itemId)}
          onMoveDecor={(placementId) => {
            const placement = persistedDecor.find((entry) => entry.id === placementId);
            return placement ? startDecorPlacement(placement.itemId, placement.id) : 'That furniture is not available.';
          }}
          onRemoveDecor={(placementId) => onCharacterUpdate({
            ...character,
            homeDecor: persistedDecor.map((entry) => entry.id === placementId ? { ...entry, at: null } : entry),
          })}
          onClose={closeStore}
        />
      )}
      {decorPlacement && decorPlacementItem && (
        <aside role="status" className="pointer-events-auto fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 border border-[#c9a35e]/70 bg-[#171615]/95 px-4 py-3 text-white shadow-xl">
          <div className="mr-2 min-w-36">
            <p className="m-0 text-sm font-semibold">{decorPlacementItem.name}</p>
            <p className="m-0 text-[10px] text-white/65">
              Move with WASD · rotate with R · {decorPlacement.previewOnly ? `place & buy · ${decorPlacementItem.price.toLocaleString()} ⓒ` : 'place to save'}
            </p>
          </div>
          <button type="button" onClick={rotateDecorPreview} className="border border-white/20 px-3 py-2 text-xs hover:border-[#c9a35e]">Rotate</button>
          <button type="button" onClick={cancelDecorPlacement} className="border border-white/20 px-3 py-2 text-xs hover:border-white/50">Cancel</button>
          <button type="button" onClick={placeSelectedDecor} className="border border-[#c9a35e] bg-[#d2b36f]/15 px-3 py-2 text-xs text-[#f0d797] hover:bg-[#d2b36f]/25">
            {decorPlacement.previewOnly ? 'Buy & place' : 'Place here'}
          </button>
        </aside>
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
          entries={locations}
          controller={controller}
          trackedId={trackedId}
          canUseNow={canUseNow}
          onTrack={(e) => { setTrackedId(e.id); setLocationsOpen(false); }}
          onStopTracking={() => setTrackedId(null)}
          onUse={useLocation}
          destinations={destinations}
          from={{ x: controller.position.x, z: controller.position.z }}
          showRoute={showRoute}
          onShowRouteChange={onShowRouteChange}
          onGo={goTo}
          onClose={() => setLocationsOpen(false)}
        />
      )}
      {!indoors && <TripStatus destinations={destinations} />}
      {parkOpen && (
        <ParkPanel park={district.park} time={state.time} onSit={sitInPark} onClose={() => setParkOpen(false)} />
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
      {officePanel && (
        <OfficePanel
          mode={officeTaskId(officePanel) ? 'task' : 'reception'}
          career={state.officeCareer}
          time={state.time}
          balance={state.balance}
          taskId={officeTaskId(officePanel) ? officePanel : undefined}
          onApply={() => {
            const atReception = officeActionAt() === 'reception';
            officeApply(atReception);
            if (atReception && !state.officeCareer.employed) setArrival('You accepted the Office Assistant position.');
          }}
          onClockIn={() => {
            const atReception = officeActionAt() === 'reception';
            officeClockIn(atReception);
            if (atReception && !state.officeCareer.activeShift) setArrival('Shift started. Complete the computer, document and meeting tasks.');
          }}
          onClockOut={() => {
            const atReception = officeActionAt() === 'reception';
            const active = state.officeCareer.activeShift;
            const completed = active && Object.values(active.tasks).every((item) => item.completed);
            if (!atReception || !completed || !active) return;
            const payment = active.tasks.computer.completed && active.tasks.documents.completed && active.tasks.meeting.completed
              ? state.officeCareer.salaryPerTask * 3
              : 0;
            officeClockOut(atReception);
            setArrival(`Shift complete. ${completed ? 3 : 0} tasks. Gross earnings ${payment.toLocaleString()} ⓒ, deductions 0 ⓒ, final payment ${payment.toLocaleString()} ⓒ.`);
            setOfficePanel(null);
          }}
          onAnswer={(taskId, choice) => {
            const atStation = officeActionAt() === taskId ? taskId : null;
            officeTask(taskId, choice, atStation);
          }}
          onClose={() => setOfficePanel(null)}
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
              <HomeInterior key={insideFashionHouse ? 'fashion-house' : insideOffice ? 'office' : insideRestaurant ? 'restaurant' : `home-${home?.id ?? 'unknown'}`} interior={interior} gameTime={state.time} doorOpen>
                {insideFashionHouse && <FashionHouseScene player={controller} />}
                {insideRestaurant && <RestaurantScene
                  tableId={restaurantStage === 'served' || restaurantStage === 'eating' ? restaurantTableId : null}
                  dish={restaurantStage === 'served' || restaurantStage === 'eating' ? restaurantOrder : null}
                  player={controller}
                  onMealDelivered={completeRestaurantDelivery}
                  mealDelivered={restaurantDeliveryReady}
                />}
                {insideOffice && <OfficeScene player={controller} />}
                <InteriorLighting gameTime={state.time} player={controller} />
                <Player controller={controller} character={character} tryOn={tryOn} eating={eating} />
                {inside && home && decorPlacement && decorPlacementItem && (
                  <DecorPlacementPreview controller={controller} item={decorPlacementItem} rotation={decorPlacement.rotation} />
                )}
              </HomeInterior>
            ) : (
              <City
                key={district.id}
                controller={controller}
                character={character}
                gameTime={state.time}
                tryOn={tryOn}
                homeId={state.home}
                district={district}
                talkingTo={talking?.id ?? null}
                hugSession={hugging}
                onHugComplete={finishHug}
              />
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
          onRequestHug={() => requestHug(talking)}
          onStayOver={() => { setTalking(null); rest(false, true); }}
          onClose={() => setTalking(null)}
        />
      )}
      {task && (
        <WorkTaskPanel
          task={task}
          workplace={getCareerLocation(district, character.career)?.name ?? 'Work'}
          hourlyPay={hourlyPay}
          workPerformance={state.workPerformance}
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
        busy={!!sit.session}
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
          name: insideFashionHouse ? district.fashionHouse.name : insideOffice ? OFFICE_WORKPLACE.name : insideRestaurant ? restaurantVendor?.name ?? 'Restaurant' : home!.name,
          interactionAt: (x, z) => {
            if (insideFashionHouse) {
              const action = fashionHouseInteractionAt(x, z);
              return action ? ({
                door: { verb: 'Leave through', place: 'the boutique entrance', onOpen: goOutside, icon: DoorOpen },
                catalogue: { verb: 'Browse', place: 'the collection', onOpen: () => setStore('shop'), icon: Shirt },
              })[action] : null;
            }
            if (insideRestaurant) {
              const action = restaurantInteractionAt(x, z);
              if (!action) return null;
              return ({
                door: { verb: 'Leave through', place: 'the restaurant entrance', onOpen: goOutside, icon: DoorOpen },
                host: { verb: restaurantStage === 'host' ? 'Check in with' : 'Speak to', place: 'the host', onOpen: () => { if (restaurantVendor) setVendor(restaurantVendor); }, icon: Users },
              })[action];
            }
            if (insideOffice) {
              const officeAction = officeInteractionAt(interior, x, z);
              return officeAction ? ({
                door: { verb: 'Leave workplace through', place: 'the front door',                 onOpen: () => interactWithOffice('door'), icon: DoorOpen },
                reception: { verb: 'Talk to', place: 'reception', onOpen: () => interactWithOffice('reception'), icon: BriefcaseBusiness },
                computer: { verb: 'Work at', place: 'the computer', onOpen: () => interactWithOffice('computer'), icon: Monitor },
                documents: { verb: 'Process', place: 'the documents', onOpen: () => interactWithOffice('documents'), icon: FileText },
                meeting: { verb: 'Join', place: 'the team meeting', onOpen: () => interactWithOffice('meeting'), icon: Users },
              })[officeAction] : null;
            }
            const action = homeInteractionAt(interior, x, z);
            return action ? ({
            door: { verb: 'Go outside through', place: 'the front door', onOpen: () => interactAtHome('door'), icon: DoorOpen },
            bed: { verb: 'Sleep in your bed at', place: home!.name, onOpen: () => interactAtHome('bed'), icon: BedDouble },
            wardrobe: { verb: 'Change clothes at', place: 'the wardrobe', onOpen: () => interactAtHome('wardrobe'), icon: Shirt },
            mirror: { verb: 'Check your outfit at', place: 'the mirror', onOpen: () => interactAtHome('mirror'), icon: ScanEye },
            sofa: { verb: 'Sit on the sofa at', place: home!.name, onOpen: () => interactAtHome('sofa'), icon: Sofa },
            tv: { verb: 'Watch TV at', place: home!.name, onOpen: () => interactAtHome('tv'), icon: Tv },
            kitchen: { verb: 'Use the kitchen at', place: home!.name, onOpen: () => interactAtHome('kitchen'), icon: CookingPot },
            bathroom: { verb: 'Use the bathroom at', place: home!.name, onOpen: () => interactAtHome('bathroom'), icon: ShowerHead },
            })[action] : null;
          },
        } : undefined}
        insidePlaceLabel={insideFashionHouse ? `Fashion House · ${district.city.name}` : insideOffice ? `At work · ${district.city.name}` : insideRestaurant ? `Dining · ${district.city.name}` : undefined}
        outsideOffice={!indoors && district.id === OFFICE_WORKPLACE.districtId
          && Math.hypot(OFFICE_WORKPLACE.position[0] - controller.position.x, OFFICE_WORKPLACE.position[2] - controller.position.z) <= OFFICE_WORKPLACE.radius
          ? { name: OFFICE_WORKPLACE.name, onOpen: goIntoOffice }
          : undefined}
        workMinutes={state.workMinutes}
        equipment={state.equipment}
        onOpenGadgets={() => setGadgets(true)}
        onOpenMap={phone ? () => setMapOpen(true) : undefined}
        onGoHome={home && !indoors ? goHome : undefined}
        onOpenLocations={indoors ? undefined : () => setLocationsOpen(true)}
        tracked={trackedLocation?.position ? { name: trackedLocation.name, position: trackedLocation.position } : null}
        onStopTracking={() => setTrackedId(null)}
        fullness={state.fullness}
        onOpenVendor={enterRestaurant}
        onOpenShop={enterFashionHouse}
        onOpenWardrobe={() => setStore('wardrobe')}
        onOpenDecor={inside && home ? () => setStore('decor') : undefined}
        onOpenRestaurantPanel={insideRestaurant && restaurantVendor ? () => setVendor(restaurantVendor) : undefined}
        qualityLabel={qualityMode === 'auto' ? `Auto (${autoQuality})` : qualityMode}
        onCycleQuality={() => onQualityChange(nextQualityMode(qualityMode))}
      />
    </main>
  );
}
