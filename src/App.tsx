import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls as OrbitControlsImpl, PerformanceMonitor } from '@react-three/drei';
import type { OrbitControls } from 'three-stdlib';
import { ACESFilmicToneMapping, Vector3, type Group } from 'three';
import { enterVehicle, exitVehicle, getTrip, placePlayer, setMovementBlocked, setMoveTarget, setPace, usePlayerController } from './hooks/usePlayerController';
import type { PlayerHandle } from './hooks/usePlayerController';
import { useCurrentNeighborhood } from './hooks/useCurrentNeighborhood';
import { useGameState } from './hooks/useGameState';
import { activeLayout, groundHeightAt, movingObstacles, setActiveLayout } from './lib/world';
import { Buildings, Skyline } from './world/Buildings';
import { Props } from './world/Props';
import { SceneLighting } from './world/SceneLighting';
import { LampPool } from './world/LampPool';
import { LiveEventScene } from './world/LiveEventScene';
import { QuestsScreen } from './components/QuestsScreen';
import { DivinePanel } from './components/DivinePanel';
import { InventoryPanel } from './components/InventoryPanel';
import { TransformAura } from './world/TransformAura';
import { LevelUp } from './components/LevelUp';
import { levelProgress, totalXp } from './lib/lifeState';
import { EventAlert, EventPanel, EventResult } from './components/LiveEventUI';
import { EVENT_FREQUENCIES, FIND_RADIUS, FREQUENCY_LABEL, SCENE_RADIUS, canDo, templateFor, type ActiveEvent } from './lib/liveEvents';
import PostEffects from './world/PostEffects';
import { WarmUp } from './world/WarmUp';
import { Streets } from './world/Streets';
import { QualityContext, initialAutoQuality, settingsFor, useQuality, type Quality } from './world/quality';
import { lightingAt } from './world/timeOfDay';
import { FpsMeter } from './world/FpsMeter';
import { Player } from './components/Player';
import { HUD, type NavItem, type PlacePlate } from './components/HUD';
import type { IconName } from './components/os/icons';
import { CharacterCreation, type Character } from './components/CharacterCreation';
import { DailyLogModal } from './components/DailyLogModal';
import { FoodMenu } from './components/FoodMenu';
import { nearestVendor, suitsDiet, type Dish, type FoodVendor } from './lib/food';
import { COLOUR_CHOICES, recolourable, type FashionItem, type Slot } from './lib/fashion';
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
import { agencyAt, barAt, counterAt, districtById, hotelAt, restaurantAt, spaAt, type District, type PlaceKind } from './lib/geography';
import { SnapshotHost } from './components/snapshot/Snapshot';
import { RestaurantInterior } from './world/RestaurantInterior';
import { PalmsFront } from './world/PalmsFront';
import { HostPanel, RestaurantMenu } from './components/RestaurantMenu';
import { AssistantPanel, BoutiquePanel } from './components/BoutiquePanel';
import { BoutiqueInterior } from './world/BoutiqueInterior';
import {
  DESK_SPOT, DOOR_SPOT as BOUTIQUE_DOOR, FITTING_SPOT, SALON_SPOT, STAFF as BOUTIQUE_STAFF, boutiqueLayout, type BoutiqueSection,
} from './lib/boutique';
import {
  DOOR_SPOT as PALMS_DOOR, FREE_SEATS, HOST_SPOT as PALMS_HOST_SPOT, OPEN_HOUR as PALMS_OPEN_HOUR, STAFF as PALMS_STAFF,
  hostSeat, isOpen as palmsOpen, restaurantLayout, suitsYou, type MenuItem,
} from './lib/palms';
import { DistrictContext } from './world/DistrictContext';
import { TravelPanel } from './components/TravelPanel';
import { TalkPanel } from './components/TalkPanel';
import { WorkTaskPanel } from './components/WorkTaskPanel';
import { taskForHour, type WorkTask } from './lib/workTasks';
import { careerLevel, levelIndex } from './lib/progression';
import { equipmentPay } from './lib/equipment';
import { HOURLY_WAGE, isWorkingHours, type GameTime } from './lib/gameState';
import { Residents } from './world/Residents';
import { ClickToMove } from './world/ClickToMove';
import { VenueFront } from './world/VenueFront';
import { Park } from './world/Park';
import { Campers } from './world/Campers';
import { CantinaInterior } from './world/CantinaInterior';
import { CantinaFront } from './world/CantinaFront';
import { HotelFront } from './world/HotelFront';
import { HotelInterior } from './world/HotelInterior';
import {
  DESK_SPOT as HOTEL_DESK_SPOT, DOOR_SPOT as HOTEL_DOOR, GUEST_ROOM, HOTEL_NAME, NIGHT_PRICE, RECEPTIONIST, ROOMS as HOTEL_ROOMS,
  ROOM_SERVICE_MENU, VENDING_MENU, VENDING_SPOT, WASH_MINUTES, armchairSeats, basinSpot, bedSpot as hotelBedSpot, hotelLayout, roomById as hotelRoom,
  roomDoorSpot, roomServiceSpot, stayIsValid,
} from './lib/hotel';
import {
  BAR_SPOT as CANTINA_BAR_SPOT, CANTINA_MENU, CANTINA_NAME, DOOR_SPOT as CANTINA_DOOR, FREE_SEATS as CANTINA_SEATS, OPEN_HOUR as CANTINA_OPEN_HOUR,
  STAFF as CANTINA_STAFF, STOOLS as CANTINA_STOOLS, cantinaLayout, isOpen as cantinaOpen,
} from './lib/cantina';
import { startEngine } from './lib/engineSound';
import { Traffic } from './world/Traffic';
import { HomeInterior } from './world/HomeInterior';
import {
  CAR_DEALERSHIP_INTERIOR, RESTAURANT_INTERIOR, RESTAURANT_TABLES, USE_RADIUS, bedSpot, dealershipInteractionAt, doorSpot, interiorFor, interiorLayout,
  restaurantInteractionAt, restaurantTableById, type Furniture,
} from './lib/interiors';
import { asFurniture, catalogueItem, nearPiece, furnitureUse } from './lib/furniture';
import type { FurnitureKind, Interior } from './lib/interiors';
import { currentMood, type FurnitureTarget } from './lib/gameState';
import { FurnitureCatalogue } from './components/FurnitureCatalogue';
import { LifeOS, type OsTab } from './components/os/LifeOS';
import { Phone, PhoneBanner } from './components/phone/Phone';
import { PhotoCapture } from './components/phone/photoCapture';
import { usePhone } from './hooks/usePhone';
import { unreadCount, type AppId } from './lib/phone';
import { rideFare } from './lib/gameState';
import { Celebrations } from './components/os/Celebrations';
import type { LifeLink } from './lib/life';
import { spotToUse } from './lib/furniture';
import { ACHIEVEMENTS } from './lib/life';
import { MOOD_PACE, moodLabel } from './lib/needs';
import { SceneLighting as InteriorLighting } from './world/SceneLighting';
import { gameDay, isAdultResident, residentById, residentFacing, residentNear, residentPosition, residentsIn, friendshipLevel, type Resident } from './lib/people';
import { canResidentAcceptHug, findHugPlan, type HugSession } from './lib/hug';
import { pedestrianInTrafficPath, trafficSnapshot } from './lib/traffic';
import { formatDuration, travelOption, type TravelMode } from './lib/travel';
import { HomeMarkers } from './world/HomeMarkers';
import { signTexture } from './world/textures';
import { HOME_RADIUS, distanceToDoor, homeAtDoor, homeById, type Home } from './lib/homes';
import { loadCharacter, saveCharacter } from './lib/save';
import { EntryScreen } from './components/EntryScreen';
import { loadSettings, nextQualityMode, saveSettings, type QualityMode, type Settings } from './lib/settings';
import { getCareerLocation, isAtWorkplace } from './lib/careers';
import { AgencyFront } from './world/AgencyFront';
import { OgmHomesPanel } from './components/OgmHomesPanel';
import { SpaInterior } from './world/SpaInterior';
import { SpaFront } from './world/SpaFront';
import { SpaJobPanel, SpaMenu, SpaSession } from './components/SpaPanel';
import {
  DESK_SPOT as SPA_DESK_SPOT, DOOR_SPOT as SPA_DOOR, MANAGER_SPOT as SPA_MANAGER_SPOT, ROOMS as SPA_ROOMS, WAITING_SEATS as SPA_WAITING,
  clientsFor, isOpen as spaIsOpen, roomFor, rollSpaDay, serviceById as spaService, spaLayout, tableSpot, type Client as SpaClient, type ServiceId,
} from './lib/spa';
// Main's walk-in workplaces: the office, AYE Global University, AYE General Hospital, the car showroom and the restaurant service
import { canPlaceDecor, decorItemById, furnitureForHome, type HomeDecorPlacement } from './lib/homeDecor';
import { DecorPlacementPreview } from './world/DecorPlacementPreview';
import { officeInteractionAt, OFFICE_INTERIOR, OFFICE_TASK_SEATS, OFFICE_WORKPLACE, officeTaskId, type OfficeInteraction } from './lib/officeCareer';
import { OfficePanel } from './components/OfficePanel';
import { OfficeScene } from './world/OfficeScene';
import { CampusPanel, type CampusPanelMode } from './components/CampusPanel';
import { UniversityExterior, UniversityScene } from './world/UniversityScene';
import { HospitalExterior, HospitalScene } from './world/HospitalScene';
import { HospitalPanel, type HospitalPanelMode } from './components/HospitalPanel';
import { HOSPITAL, HOSPITAL_INTERIOR, hospitalInteractionAt, isInWard, isInSupervisorOffice, type HospitalInteraction } from './lib/hospitalSite';
import { HOSPITAL_PATIENTS_PER_SHIFT, hospitalForDay, clockIn as hospitalClockInRule, brief as hospitalBriefRule, treatPatient as hospitalTreatRule, clockOut as hospitalClockOutRule } from './lib/hospital';
import { UNIVERSITY, UNIVERSITY_INTERIOR, universityInteractionAt, isInLectureHall, isInLibrary, type UniversityInteraction } from './lib/university';
import { campusForDay, attendClass, submitAssignment, assignmentForDay, academicStanding, CLASS_SLOTS, type ClassSlot } from './lib/campus';
import { DealershipPanel } from './components/DealershipPanel';
import { VEHICLE_CATALOG, vehicleById, vehicleColourById, type OwnedVehicle } from './lib/vehicleCatalog';
import { isVehicleSpawnClear } from './lib/vehicleDriving';
import { CarDealershipExterior, CarDealershipScene, DrivenVehicle } from './world/CarDealershipScene';
import { RestaurantScene } from './world/RestaurantScene';
import { cancelDiningTransaction, createDiningTransaction, settleDiningTransaction, transitionDiningTransaction } from './lib/restaurant';
import './App.css';


interface CityProps {
  controller: ReturnType<typeof usePlayerController>;
  character?: Character;
  gameTime: GameTime;
  tryOn: Partial<Record<Slot, string | null>>;
  homeId: string | null;
  district: District;
  ownedVehicles: readonly OwnedVehicle[];
  /** The resident the player is talking with, if any. */
  talkingTo: string | null;
  hugSession: HugSession | null;
  onHugComplete: (residentId: string) => void;
  /** Something happening in this district right now (lib/liveEvents.ts). */
  liveEvent: ActiveEvent | null;
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

/** The Palms' room as a collision layout (the same for every visit). */
const PALMS_LAYOUT = restaurantLayout();
const CANTINA_LAYOUT = cantinaLayout();
const HOTEL_LAYOUT = hotelLayout(false);
const SPA_LAYOUT = spaLayout();
const HOTEL_LAYOUT_KEY = hotelLayout(true);
const BOUTIQUE_LAYOUT = boutiqueLayout();
const BOUTIQUE_ID = 'fashion-house';
const CAFETERIA_MEAL_PRICE = 60;
const EMPTY_HOME_DECOR: HomeDecorPlacement[] = [];

/** Placing a piece of Home Decor (lib/homeDecor.ts): a new one being bought, or one you're moving. */
interface DecorPlacementSession {
  itemId: string;
  placementId: string | null;
  previewOnly: boolean;
  rotation: number;
}

/** The title plate at home, by the kind of place it is. */
const MY_HOME: Record<Interior['tier'], string> = { room: 'My Room', flat: 'My Flat', apartment: 'My Apartment', penthouse: 'My Apartment', house: 'My House', family: 'My House', villa: 'My Villa', loft: 'My Loft', warehouse: 'My Loft' };

/** Standing this close to a place puts its name on the title plate. */
const PLATE_RADIUS = 9;
const PLATE_SUBTITLE: Record<PlaceKind, string> = { food: 'Food & drinks', shop: 'Shopping', workplace: 'Workplace', home: 'Homes', public: 'Travel', nightlife: 'Lounge & nightlife', park: 'Park', dealership: 'Cars' };
const PLATE_ICON: Record<PlaceKind, IconName> = { food: 'restaurant', shop: 'bag', workplace: 'career', home: 'home', public: 'go', nightlife: 'spark', park: 'palm', dealership: 'car' };

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
    // At the wheel: a chase camera, further back and a little higher, swinging in behind the car as it moves
    if (controller.drivingVehicleId) {
      followOffset.copy(camera.position).sub(controls.target);
      const horiz = Math.hypot(followOffset.x, followOffset.z) || 1;
      let dx = followOffset.x / horiz, dz = followOffset.z / horiz;
      if (Math.hypot(controller.velocity.x, controller.velocity.z) > 1) {
        const bx = -Math.sin(controller.direction), bz = -Math.cos(controller.direction);
        dx += (bx - dx) * 0.04;
        dz += (bz - dz) * 0.04;
        const n = Math.hypot(dx, dz) || 1;
        dx /= n; dz /= n;
      }
      const dist = horiz + (DRIVE_CAMERA_DISTANCE - horiz) * 0.05;
      const up = followOffset.y + (DRIVE_CAMERA_HEIGHT - followOffset.y) * 0.05;
      camera.position.set(controls.target.x + dx * dist, controls.target.y + up, controls.target.z + dz * dist);
    }
    controls.update();
  });
  return null;
}
const followOffset = new Vector3();
/** Chase-camera distance and height above the look-at point while driving. */
const DRIVE_CAMERA_DISTANCE = 9;
const DRIVE_CAMERA_HEIGHT = 3.2;

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

function OfficeExteriorEntrance({ player }: { player: PlayerHandle }) {
  const door = useRef<Group>(null);
  const sign = useMemo(() => signTexture(OFFICE_WORKPLACE.name, '#26343c', '#edcf8c', 512, 128), []);
  useFrame((_, delta) => {
    if (!door.current) return;
    const distance = Math.hypot(
      player.position.x - OFFICE_WORKPLACE.position[0],
      player.position.z - OFFICE_WORKPLACE.position[2],
    );
    const target = distance < 2.7 ? -Math.PI / 2 : 0;
    door.current.rotation.y += (target - door.current.rotation.y) * Math.min(1, delta * 4);
  });
  return (
    <group
      position={OFFICE_WORKPLACE.exteriorDoor}
      rotation={[0, -Math.PI / 2, 0]}
    >
      <mesh position={[0, 2.52, -0.04]} castShadow>
        <boxGeometry args={[2.05, 0.55, 0.2]} />
        <meshStandardMaterial color="#253038" metalness={0.55} roughness={0.36} />
      </mesh>
      <mesh position={[0, 2.52, 0.075]}>
        <planeGeometry args={[1.88, 0.4]} />
        <meshStandardMaterial map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={0.18} roughness={0.58} />
      </mesh>
      {[-0.82, 0.82].map((x) => (
        <mesh key={x} position={[x, 1.18, 0]} castShadow>
          <boxGeometry args={[0.12, 2.36, 0.2]} />
          <meshStandardMaterial color="#59646a" metalness={0.72} roughness={0.34} />
        </mesh>
      ))}
      <mesh position={[0, 2.34, 0]} castShadow>
        <boxGeometry args={[1.76, 0.12, 0.2]} />
        <meshStandardMaterial color="#59646a" metalness={0.72} roughness={0.34} />
      </mesh>
      <group ref={door} position={[-0.76, 0, 0.12]}>
        <mesh position={[0.7, 1.1, 0]} castShadow>
          <boxGeometry args={[1.38, 2.18, 0.07]} />
          <meshStandardMaterial color="#56666b" metalness={0.48} roughness={0.25} transparent opacity={0.84} />
        </mesh>
        <mesh position={[1.26, 1.03, 0.05]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshStandardMaterial color="#d3b36e" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

function City({ controller, character, gameTime, tryOn, homeId, district, ownedVehicles, talkingTo, hugSession, onHugComplete, liveEvent }: CityProps) {
  const quality = useQuality();
  const night = lightingAt(gameTime.hour, gameTime.minute).night;
  const owned = ownedVehicles.find((vehicle) => vehicle.modelId === controller.drivingVehicleId);
  const model = owned && vehicleById(owned.modelId);
  const colour = owned && vehicleColourById(owned.colour);
  return (
    <>
      <SceneLighting gameTime={gameTime} player={controller} />
      <LampPool focus={controller} />
      <Streets />
      <Buildings />
      <Skyline />
      <Props night={night} />
      {district.carDealership && <CarDealershipExterior />}
      {district.id === UNIVERSITY.districtId && <UniversityExterior />}
      {district.id === HOSPITAL.districtId && <HospitalExterior />}
      <VenueFront hour={gameTime.hour} night={night} />
      <PalmsFront hour={gameTime.hour} night={night} />
      <CantinaFront hour={gameTime.hour} night={night} />
      <HotelFront night={night} />
      <AgencyFront night={night} />
      <SpaFront night={night} />
      <Park />
      {character && character.career !== 'none' && <WorkplaceMarker position={getCareerLocation(district, character.career)!.position} />}
      {district.id === OFFICE_WORKPLACE.districtId && <OfficeExteriorEntrance player={controller} />}
      <HomeMarkers homeId={homeId} />
      <Residents player={controller} talkingTo={talkingTo} hugSession={hugSession} />
      <Traffic player={controller} />
      <Campers />
      {liveEvent && <LiveEventScene event={liveEvent} minute={gameTime.totalMinutes} />}
      {quality.contactShadows && !controller.drivingVehicleId && <FootShadow controller={controller} />}
      {controller.drivingVehicleId && model && colour
        ? <DrivenVehicle controller={controller} colour={colour.hex} bodyStyle={model.bodyStyle} />
        : <Player controller={controller} character={character} tryOn={tryOn} conversing={talkingTo !== null} conversationTarget={talkingTo} hugSession={hugSession} onHugComplete={onHugComplete} />}
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
      sound={settings.sound}
      onSoundChange={(sound) => changeSettings({ sound })}
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
  /** Game sounds on or off (Life OS → Settings). */
  sound: boolean;
  onSoundChange: (on: boolean) => void;
  /** Opens the character creator to change appearance (life and progress are kept). */
  onEditLook: () => void;
  /** Back to the entry screen; the game is already saved. */
  onExitToMenu: () => void;
  onCharacterUpdate: (character: Character) => void;
}

/** The district the player was last placed in, so returning from the menu keeps their spot. */
let placedIn: string | null = null;

function Game({ character, quality: qualityMode, onQualityChange, showRoute, onShowRouteChange, sound, onSoundChange, onExitToMenu, onCharacterUpdate, onEditLook }: GameProps) {
  const controller = usePlayerController();
  // Read on every game tick, so it always sees the district the player is in now
  const districtRef = useRef<District | null>(null);
  // Inside your own home (room coordinates): never counts as being at work
  const insideRef = useRef(false);
  // Inside AYE Global University or AYE General Hospital: a student's or doctor's workplace
  const insideUniversityRef = useRef(false);
  const insideHospitalRef = useRef(false);
  const {
    state, rest, dismissSummary, eat, purchase, moveIn, buyHome, spaTreat, spaHire, spaClockIn, spaClockOut, spaSession, moveOut, buyEquipment, travel,
    socialise, hug, fashionShowcase, buyFashionItem, nightOut, wait, workTask, buyFurniture, sellFurniture, placeFurniture, storeFurniture, operateFurniture,
    exercise, visit, setProfile, setDream, dismissWish, setSavingsGoal, phoneFriend, ride, bookHotel, hotelWash, buyVehicle, paintVehicle,
    drove, officeApply, officeClockIn, officeTask, officeClockOut, campusClass, campusAssignment, campusStudy, hospitalClockIn, hospitalBrief, hospitalPatient, hospitalClockOut,
    eventRespond, eventDismiss, eventAct, eventSeen, setEventFrequency,
    ascendUnlock, transformForm, returnToHuman, sanctuaryHeal,
    buyGear, equipGear, unequipGear, repairGear, sellGear,
  } = useGameState(
    character,
    () => character.career !== 'none' && !!districtRef.current && (
      (character.career === 'student' && insideUniversityRef.current) || (character.career === 'doctor' && insideHospitalRef.current) || (!insideRef.current &&
      isAtWorkplace(districtRef.current, character.career, controller.position.x, controller.position.z))),
  );
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const district = districtById(state.districtId);
  // Opening choices (traits, dream, first home) were applied as this life began: drop them so nothing applies them again
  useEffect(() => {
    if (character.start) onCharacterUpdate({ ...character, start: undefined });
  }, [character, onCharacterUpdate]);
  const home = homeById(state.home);
  const [inside, setInside] = useState(false);
  // Inside a venue you walked into (The Palms), by its id
  const [venue, setVenue] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hostOpen, setHostOpen] = useState(false);
  // In the Fashion House: which collection is open, and the assistant's welcome
  const [section, setSection] = useState<BoutiqueSection | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  // What you've ordered at your table (cleared when you get up)
  const [served, setServed] = useState<{ seatId: string; dishes: string[] } | null>(null);
  // In the hotel: which menu is open (the lobby's drinks machine or room service), and the tray left in your room for this stay
  const [hotelMenu, setHotelMenu] = useState<'vending' | 'room' | null>(null);
  const [roomTray, setRoomTray] = useState<{ until: number; ids: string[] } | null>(null);
  const interior = home ? interiorFor(home) : null;
  // Furniture you bought and placed, alongside what the home came with
  const ownedPieces = useMemo(
    () => state.furniture.flatMap((o) => { const f = asFurniture(o); return f ? [{ uid: o.uid, f }] : []; }),
    [state.furniture],
  );
  // Home Decor pieces placed in this home (lib/homeDecor.ts); the one being moved is left out while it's in your hands
  const [decorPlacement, setDecorPlacement] = useState<DecorPlacementSession | null>(null);
  const decorCommitInProgress = useRef(false);
  const persistedDecor = character.homeDecor ?? EMPTY_HOME_DECOR;
  const decorPieces = useMemo(
    () => (home ? furnitureForHome(persistedDecor.filter((item) => item.id !== decorPlacement?.placementId), home.id) : []),
    [home, persistedDecor, decorPlacement?.placementId],
  );
  const extraPieces = useMemo(() => [...ownedPieces.map((p) => p.f), ...decorPieces], [ownedPieces, decorPieces]);
  const roomLayout = useMemo(() => (interior ? interiorLayout(interior, extraPieces) : null), [interior, extraPieces]);
  // Main's walk-in workplaces, each its own interior
  const [insideOffice, setInsideOffice] = useState(false);
  const [insideRestaurant, setInsideRestaurant] = useState(false);
  const [insideDealership, setInsideDealership] = useState(false);
  const [insideUniversity, setInsideUniversity] = useState(false);
  const [insideHospital, setInsideHospital] = useState(false);
  const [hospitalPanel, setHospitalPanel] = useState<HospitalPanelMode | null>(null);
  const [campusPanel, setCampusPanel] = useState<CampusPanelMode | null>(null);
  const [dealershipOpen, setDealershipOpen] = useState(false);
  const [dealershipModelId, setDealershipModelId] = useState(VEHICLE_CATALOG[0].id);
  const [officePanel, setOfficePanel] = useState<'reception' | OfficeInteraction | null>(null);
  const [officeSeatRequested, setOfficeSeatRequested] = useState<'computer' | 'meeting' | null>(null);
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
  const venueInterior: Interior | null = insideDealership && district.carDealership ? CAR_DEALERSHIP_INTERIOR
    : insideUniversity && district.id === UNIVERSITY.districtId ? UNIVERSITY_INTERIOR
      : insideHospital && district.id === HOSPITAL.districtId ? HOSPITAL_INTERIOR
        : insideOffice && district.id === OFFICE_WORKPLACE.districtId ? OFFICE_INTERIOR
          : insideRestaurant && restaurantVendor ? RESTAURANT_INTERIOR
            : null;
  const venueLayout = useMemo(() => {
    if (!venueInterior) return null;
    const layout = interiorLayout(venueInterior);
    const id = insideDealership ? 'dealership' : insideUniversity ? 'university' : insideHospital ? 'hospital' : insideOffice ? 'office' : 'restaurant';
    return { ...layout, id: `interior.${id}` };
  }, [venueInterior, insideDealership, insideUniversity, insideHospital, insideOffice]);
  /** In one of the walk-in workplaces above. */
  const inWorkplace = !!venueLayout;
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  // Life OS: the character's dashboard; the world keeps running (and you can keep walking) while it's open
  const [osOpen, setOsOpen] = useState(false);
  const [osTab, setOsTab] = useState<OsTab>('today');
  // The phone: open or in your pocket (it keeps its battery and notifications either way)
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phoneStart, setPhoneStart] = useState<AppId | null>(null);

  const indoors = !inWorkplace && inside && !!home && home.district === district.id && !!roomLayout;
  const inPalms = !indoors && venue !== null && district.restaurant?.id === venue;
  const inCantina = !indoors && venue !== null && district.bar?.id === venue;
  const inHotel = !indoors && venue !== null && district.hotel?.id === venue;
  const inSpa = !indoors && venue !== null && district.spa?.id === venue;
  /** Whether you hold the key to a hotel room (a night booked, before check-out). */
  const hotelKey = stayIsValid(state.hotel, state.time.totalMinutes);
  const trayHere = hotelKey && roomTray && roomTray.until === state.hotel!.until ? roomTray.ids : [];
  const inBoutique = !indoors && venue === BOUTIQUE_ID;
  /** Inside anywhere (your home, a venue or a workplace): not on the street. */
  const offStreet = indoors || inWorkplace || inPalms || inCantina || inHotel || inSpa || inBoutique;
  /** Something happening in this district (an accident, a missing person…), if anything. */
  const liveEvent = state.world.active && state.world.active.districtId === district.id ? state.world.active : null;
  // Open for one event: it closes by itself when that event ends
  const [eventPanelFor, setEventPanelFor] = useState<string | null>(null);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [divineOpen, setDivineOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  /** Your rank in your career: what gear you're qualified for. */
  const careerRank = levelIndex(character.career, state.workMinutes);
  // Level-ups already shown (any from before this session count as shown)
  const [levelsShown, setLevelsShown] = useState(() => new Set(state.life.celebrations.filter((c) => c.kind === 'Level up').map((c) => c.id)));
  const levelUp = state.life.celebrations.find((c) => c.kind === 'Level up' && !levelsShown.has(c.id)) ?? null;
  const eventPanelOpen = !!liveEvent && eventPanelFor === liveEvent.id;
  /** Where the event wants you: the search target once you know where to look, otherwise the scene. */
  const eventGoal = liveEvent
    ? (liveEvent.target && liveEvent.done.includes('listen') && !liveEvent.done.includes('find') ? liveEvent.target : liveEvent.scene)
    : null;
  /** Standing at the event's scene, or at its search target. */
  const atEventScene = () => !!liveEvent && !offStreet && !controller.drivingVehicleId && Math.hypot(controller.position.x - liveEvent.scene.x, controller.position.z - liveEvent.scene.z) <= SCENE_RADIUS;
  const atEventTarget = () => !!liveEvent?.target && !offStreet && !controller.drivingVehicleId && Math.hypot(controller.position.x - liveEvent.target.x, controller.position.z - liveEvent.target.z) <= FIND_RADIUS;
  /** Helping at the event: at the target you find who you're looking for; at the scene the panel opens. */
  const helpAtEvent = () => {
    if (!liveEvent) return;
    if (atEventTarget() && canDo(liveEvent, 'find', character.career, state.equipment, state.time.totalMinutes).ok) {
      eventAct('find', { x: controller.position.x, z: controller.position.z });
      setArrival('You found Baba Femi. Walk him back to his daughter at the park.');
      return;
    }
    if (atEventScene()) setEventPanelFor(liveEvent.id);
  };
  const eventPrompt = () => {
    if (!liveEvent) return null;
    const t = templateFor(liveEvent.kind);
    if (atEventTarget() && canDo(liveEvent, 'find', character.career, state.equipment, state.time.totalMinutes).ok) return { verb: 'You\u2019ve found', place: 'Baba Femi', onOpen: helpAtEvent };
    return atEventScene() ? { verb: 'Help with the', place: t.title.toLowerCase(), onOpen: helpAtEvent } : null;
  };
  /** Which place the canvas is showing; a new one is prepared (shaders and textures) before it is drawn. */
  const sceneKey = venueLayout ? venueLayout.id : indoors ? `home.${home!.id}` : venue !== null ? `venue.${venue}` : `city.${district.id}`;
  const [sceneReady, setSceneReady] = useState(false);
  // The phone in your pocket: it charges while you're at home
  const phoneCharging = indoors && !!home && home.id === state.home;
  const myPhone = usePhone(character.id, state, phoneCharging);
  // Collision and ground height follow where you are (set before this frame's movement)
  const layoutNow = venueLayout ?? (indoors ? roomLayout! : inPalms ? PALMS_LAYOUT : inCantina ? CANTINA_LAYOUT : inHotel ? (hotelKey ? HOTEL_LAYOUT_KEY : HOTEL_LAYOUT) : inSpa ? SPA_LAYOUT : inBoutique ? BOUTIQUE_LAYOUT : district.layout);
  if (activeLayout() !== layoutNow) setActiveLayout(layoutNow);
  useEffect(() => {
    insideRef.current = offStreet;
    insideUniversityRef.current = inWorkplace && insideUniversity;
    insideHospitalRef.current = inWorkplace && insideHospital;
  }, [offStreet, inWorkplace, insideUniversity, insideHospital]);
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
  const [trackedId, setTrackedId] = useState<string | null>(null);
  const [arrival, setArrival] = useState<string | null>(null);
  useEffect(() => {
    if (!arrival) return;
    const id = setTimeout(() => setArrival(null), 6000);
    return () => clearTimeout(id);
  }, [arrival]);
  const book = (to: District, mode: TravelMode) => {
    const option = travelOption(district.city, to.city, mode);
    if (!option || state.balance < option.fare) return;
    // You leave the car behind at the showroom's car park when you travel
    if (controller.drivingVehicleId) exitVehicle();
    travel(to.id, mode);
    setInside(false);
    setTravelOpen(false);
    setTrackedId(null);
    setArrival(`You arrived in ${to.city.name} after ${formatDuration(option.minutes)} by ${option.label.toLowerCase()}.`);
  };
  const controlsRef = useRef<OrbitControls | null>(null);
  const [vendor, setVendor] = useState<FoodVendor | null>(null);
  const [store, setStore] = useState<'shop' | 'wardrobe' | 'decor' | null>(null);
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
  const snapIndoorCamera = () => {
    const controls = controlsRef.current;
    if (!controls) return;
    const { x, z } = controller.position;
    const d = controller.direction + 0.45;
    controls.target.set(x, CAMERA_TARGET_HEIGHT, z);
    controls.object.position.set(x + Math.sin(d) * 4.2, CAMERA_TARGET_HEIGHT + 5.3, z + Math.cos(d) * 4.2);
    controls.update();
  };
  /** Leaves any walk-in workplace (without placing you anywhere). */
  const clearWorkplaces = () => {
    setInsideOffice(false);
    setInsideRestaurant(false);
    setInsideDealership(false);
    setInsideUniversity(false);
    setInsideHospital(false);
  };
  const goInside = () => {
    if (!interior) return;
    setHomePanel(null);
    clearWorkplaces();
    setVenue(null);
    setInside(true);
    placePlayer([doorSpot(interior)[0], 0, doorSpot(interior)[1]], 0);
    snapCamera();
  };
  const enterRestaurant = (foodVendor: FoodVendor) => {
    if (restaurantAnimationTimer.current !== null) window.clearTimeout(restaurantAnimationTimer.current);
    restaurantAnimationTimer.current = null;
    setEating(false);
    setVendor(null);
    setRestaurantVendor(foodVendor);
    clearWorkplaces();
    setInsideRestaurant(true);
    setInside(false);
    setVenue(null);
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
  const enterDealership = () => {
    if (!district.carDealership) return;
    setInside(false);
    setVenue(null);
    clearWorkplaces();
    setInsideDealership(true);
    setDealershipOpen(false);
    setDealershipModelId(VEHICLE_CATALOG[0].id);
    setStore(null);
    const [x, z] = doorSpot(CAR_DEALERSHIP_INTERIOR);
    placePlayer([x, 0, z], 0);
    setMovementBlocked(false);
    snapIndoorCamera();
  };
  const goIntoOffice = () => {
    if (district.id !== OFFICE_WORKPLACE.districtId || insideOffice) return;
    setHomePanel(null);
    setInside(false);
    setVenue(null);
    clearWorkplaces();
    setInsideOffice(true);
    const [x, z] = doorSpot(OFFICE_INTERIOR);
    placePlayer([x, 0, z], 0);
    snapIndoorCamera();
  };
  const goIntoUniversity = () => {
    if (district.id !== UNIVERSITY.districtId || insideUniversity) return;
    setHomePanel(null);
    setInside(false);
    setVenue(null);
    clearWorkplaces();
    setInsideUniversity(true);
    const [x, z] = doorSpot(UNIVERSITY_INTERIOR);
    placePlayer([x, 0, z], 0);
    setMovementBlocked(false);
    snapIndoorCamera();
  };
  const goIntoHospital = () => {
    if (district.id !== HOSPITAL.districtId || insideHospital) return;
    setHomePanel(null);
    setInside(false);
    setVenue(null);
    clearWorkplaces();
    setInsideHospital(true);
    const [x, z] = doorSpot(HOSPITAL_INTERIOR);
    placePlayer([x, 0, z], 0);
    setMovementBlocked(false);
    snapIndoorCamera();
  };
  const goOutside = () => {
    if (inWorkplace) {
      if (insideHospital) {
        setHospitalPanel(null);
        placePlayer([HOSPITAL.position[0], 0, HOSPITAL.position[2]], -Math.PI / 2);
      } else if (insideUniversity) {
        setCampusPanel(null);
        placePlayer([UNIVERSITY.position[0], 0, UNIVERSITY.position[2]], Math.PI / 2);
      } else if (insideDealership && district.carDealership) {
        setDealershipOpen(false);
        placePlayer(district.carDealership.position, Math.PI);
      } else if (insideOffice) {
        setOfficeSeatRequested(null);
        sit.cancel();
        placePlayer(OFFICE_WORKPLACE.position, Math.PI);
      } else if (insideRestaurant && restaurantVendor) {
        if (restaurantAnimationTimer.current !== null) window.clearTimeout(restaurantAnimationTimer.current);
        restaurantAnimationTimer.current = null;
        setEating(false);
        setVendor(null);
        setRestaurantStage('host');
        setRestaurantTableId(null);
        setRestaurantOrder(null);
        restaurantTransaction.current = cancelDiningTransaction(restaurantTransaction.current);
        restaurantTransaction.current = null;
        sit.cancel();
        placePlayer(restaurantVendor.position, Math.PI);
        setRestaurantVendor(null);
      }
      clearWorkplaces();
      snapCamera();
      return;
    }
    if (venue === BOUTIQUE_ID) {
      const p = district.fashionHouse.position;
      setVenue(null);
      setSection(null);
      setAssistantOpen(false);
      setTryOn({});
      // Out onto the pavement, facing the road
      placePlayer(p, p[0] > 0 ? -Math.PI / 2 : Math.PI / 2);
      snapCamera();
      return;
    }
    if (venue) {
      const r = district.bar?.id === venue ? district.bar : district.hotel?.id === venue ? district.hotel : district.restaurant;
      setVenue(null);
      setMenuOpen(false);
      setHostOpen(false);
      setServed(null);
      if (r) placePlayer(r.door, r.facing);
      snapCamera();
      return;
    }
    setInside(false);
    setDecorPlacement(null);
    if (home) placePlayer(home.door, Math.PI);
    snapCamera();
  };
  /** This hour's work task, if you're at your workplace during working hours and haven't done it yet. */
  const taskOnOffer = (): WorkTask | null => {
    if (offStreet || character.career === 'none' || !isWorkingHours(state.time) || state.summary) return null;
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

  // Sitting down somewhere (park benches, the lounge terrace, a restaurant table, an office workstation)
  const onInteriorSeat = useCallback((seat: Seat) => {
    if (insideRestaurant && restaurantVendor && restaurantStage === 'walking') {
      setRestaurantStage('menu');
      setVendor(restaurantVendor);
    }
    if (insideOffice && officeSeatRequested && OFFICE_TASK_SEATS[officeSeatRequested]?.id === seat.id) {
      setOfficePanel(officeSeatRequested);
      setOfficeSeatRequested(null);
    }
  }, [insideRestaurant, restaurantVendor, restaurantStage, insideOffice, officeSeatRequested]);
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
  }, [insideRestaurant, restaurantStage, insideOffice, officeSeatRequested]);
  const sit = useSitSession(controller, wait, onInteriorSeat, onInteriorSeatInterrupted);
  // Getting in or out of a car re-renders the game (the controller itself isn't React state)
  const [, setDrivingVehicleId] = useState<string | null>(null);
  const [agencyOpen, setAgencyOpen] = useState(false);
  // At the spa: which panel is open, the treatment you've booked (and its room), and the client you're treating
  const [spaPanel, setSpaPanel] = useState<'menu' | 'job' | null>(null);
  const [spaBooking, setSpaBooking] = useState<{ service: ServiceId; friendId?: string; room: string } | null>(null);
  const [spaServing, setSpaServing] = useState<{ client: SpaClient; room: string; table: number } | null>(null);
  // ---------------------------------------------------------------- cars (lib/vehicleCatalog.ts)
  /** The car you're driving, from the catalogue. */
  const drivingModel = controller.drivingVehicleId ? vehicleById(controller.drivingVehicleId) ?? null : null;
  const takeVehicleOut = (modelId: string): boolean => {
    const owned = stateRef.current.ownedVehicles.find((vehicle) => vehicle.modelId === modelId);
    if (!owned || controller.drivingVehicleId) return false;
    const spawn: readonly [number, number, number] = [38.5, 0, 20];
    const pedestrians = residentsIn(district.id).map(residentPosition);
    if (!isVehicleSpawnClear({ x: spawn[0], z: spawn[2] }, [...district.layout.obstacles, ...movingObstacles], pedestrians)) return false;
    setMovementBlocked(false);
    if (!enterVehicle(modelId, spawn, -Math.PI / 2)) return false;
    setDrivingVehicleId(modelId);
    setInsideDealership(false);
    setDealershipOpen(false);
    const model = vehicleById(modelId);
    if (model) setArrival(`${model.name} is ready outside. W/S drive, A/D steer, E gets out.`);
    snapCamera();
    return true;
  };
  const leaveVehicle = () => {
    if (!exitVehicle()) {
      setArrival('There is no clear space beside the car to get out.');
      return;
    }
    setDrivingVehicleId(null);
    snapCamera();
  };
  // The engine, while you drive and sound is on
  const drivingId = controller.drivingVehicleId;
  useEffect(() => {
    const model = drivingId && sound ? vehicleById(drivingId) : null;
    if (!model) return;
    const engine = startEngine();
    if (!engine) return;
    const top = model.topSpeedKph / 3.6;
    const id = setInterval(() => engine.update(Math.abs(controller.vehicleSpeed), top), 100);
    return () => { clearInterval(id); engine.stop(); };
  }, [drivingId, sound, controller]);
  // Distance driven, counted in steps (a jump through a door or a trip isn't driving)
  const droveAction = useRef(drove);
  useEffect(() => { droveAction.current = drove; });
  useEffect(() => {
    if (!drivingId) return;
    let { x, z } = controller.position;
    let metres = 0;
    const id = setInterval(() => {
      const step = Math.hypot(controller.position.x - x, controller.position.z - z);
      x = controller.position.x; z = controller.position.z;
      if (step < 30) metres += step;
      if (metres >= 50) { droveAction.current(Math.round(metres)); metres = 0; }
    }, 1000);
    return () => { clearInterval(id); if (metres >= 1) droveAction.current(Math.round(metres)); };
  }, [drivingId, controller]);
  const atAgency = () => !offStreet && !controller.drivingVehicleId && !!agencyAt(district, controller.position.x, controller.position.z);

  /** In through The Palms' front door (while it's open). */
  const enterPalms = () => {
    const r = district.restaurant;
    if (!r) return;
    if (!palmsOpen(state.time.hour)) { setArrival(`${r.name} is closed. It opens at ${PALMS_OPEN_HOUR}:00.`); return; }
    setHomePanel(null);
    setVenue(r.id);
    placePlayer([PALMS_DOOR[0], 0, PALMS_DOOR[1]], 0);
    snapCamera();
  };
  /** In through Cantina Ayé's front door (while it's open). */
  const enterCantina = () => {
    const r = district.bar;
    if (!r) return;
    if (!cantinaOpen(state.time.hour)) { setArrival(`${r.name} is closed. It opens at ${CANTINA_OPEN_HOUR}:00.`); return; }
    setHomePanel(null);
    setVenue(r.id);
    placePlayer([CANTINA_DOOR[0], 0, CANTINA_DOOR[1]], 0);
    snapCamera();
  };
  /** In through the Grand Lagoon Hotel's front door (the lobby is always open). */
  const enterHotel = () => {
    const r = district.hotel;
    if (!r) return;
    setHomePanel(null);
    setVenue(r.id);
    placePlayer([HOTEL_DOOR[0], 0, HOTEL_DOOR[1]], 0);
    snapCamera();
  };
  /** What E does where you stand inside the hotel. */
  const hotelPrompt = () => {
    const { x, z } = controller.position;
    const near = (p: readonly [number, number], r = USE_RADIUS) => Math.hypot(x - p[0], z - p[1]) <= r;
    const guest = hotelRoom(GUEST_ROOM)!;
    if (near(HOTEL_DOOR)) return { verb: 'Leave to', place: district.name, onOpen: goOutside };
    if (near(VENDING_SPOT, 1.0)) return { verb: 'Buy a cold drink from', place: 'the vending machine', onOpen: () => setHotelMenu('vending') };
    if (near(HOTEL_DESK_SPOT, 1.3)) {
      if (hotelKey) return { verb: 'Your key: room 102, until noon. Ask', place: `${RECEPTIONIST.name} at the desk`, onOpen: () => setArrival(`${RECEPTIONIST.name}: “Room ${GUEST_ROOM} is yours until 12:00. Down the corridor, on the right.”`) };
      return {
        verb: `Book a night (${NIGHT_PRICE} GHAI) with`, place: `${RECEPTIONIST.name}, the receptionist`,
        onOpen: () => {
          if (state.balance < NIGHT_PRICE) { setArrival(`A night is ${NIGHT_PRICE} GHAI. You don't have enough yet.`); return; }
          bookHotel();
          setArrival(`${RECEPTIONIST.name}: “Here's your key to room ${GUEST_ROOM}, until noon tomorrow. Down the corridor, on the right.”`);
        },
      };
    }
    for (const r of HOTEL_ROOMS) {
      if (!near(roomDoorSpot(r), 0.9)) continue;
      if (r.id !== GUEST_ROOM) return { verb: 'Occupied:', place: `room ${r.id}`, onOpen: () => setArrival(`Room ${r.id} is taken by another guest.`) };
      if (!hotelKey) return { verb: 'Locked:', place: `room ${r.id} (book a night at the desk)`, onOpen: () => setArrival(`Room ${r.id} is locked. Book a night with ${RECEPTIONIST.name} at the front desk.`) };
    }
    if (hotelKey) {
      if (near(hotelBedSpot(guest), 1.0)) return { verb: 'Sleep in', place: 'your hotel bed', onOpen: () => { setMovementBlocked(false); rest(true); } };
      if (near(roomServiceSpot(guest), 0.9)) return { verb: 'Order room service on', place: 'the telephone', onOpen: () => setHotelMenu('room') };
      if (near(basinSpot(guest), 0.9)) return { verb: 'Freshen up at', place: 'the basin', onOpen: () => { hotelWash(); setArrival(`You freshen up. ${WASH_MINUTES} minutes pass.`); } };
      const chair = armchairSeats(guest).find((c) => Math.hypot(x - c.x, z - c.z) <= 1.0 || Math.hypot(x - (c.approach?.x ?? c.x), z - (c.approach?.z ?? c.z)) <= 0.6);
      if (chair) return { verb: 'Sit in', place: 'the armchair', onOpen: () => sit.start({ seat: chair, place: HOTEL_NAME, minutes: 0 }) };
    }
    return null;
  };
  /** Pay for a drink from the lobby machine, or for room service brought up to your room (left on the dresser). */
  const orderInHotel = (item: MenuItem) => {
    if (!inHotel || state.balance < item.price || !suitsYou(item, character.diet)) return;
    if (hotelMenu === 'room') {
      if (!hotelKey) return;
      eat(item.price, item.fullness, item.lift);
      wait(item.minutes);
      const until = state.hotel!.until;
      setRoomTray((t) => ({ until, ids: [...(t && t.until === until ? t.ids : []), item.id] }));
      setArrival(`Room service brings your ${item.name} up to room ${GUEST_ROOM}. ${item.minutes} minutes pass while it comes and you enjoy it.`);
    } else if (hotelMenu === 'vending') {
      eat(item.price, item.fullness, item.lift);
      wait(item.minutes);
      setArrival(`You tap your phone and the machine drops a cold ${item.name}. You drink it in the lobby.`);
    }
    setHotelMenu(null);
  };
  /** In through Alafia Spa's front door (reception is open 09:00–21:00; staff can come in for a shift). */
  const enterSpa = () => {
    const r = district.spa;
    if (!r) return;
    if (!spaIsOpen(state.time.hour) && !state.spa.employed) { setArrival(`${r.name} is closed. It opens at 09:00.`); return; }
    setHomePanel(null);
    setVenue(r.id);
    placePlayer([SPA_DOOR[0], 0, SPA_DOOR[1]], 0);
    snapCamera();
  };
  const spaDay = Math.floor(state.time.totalMinutes / 1440);
  const spaJobNow = rollSpaDay(state.spa, state.time.totalMinutes);
  /** Today's clients still waiting for you (only while you're on shift). */
  const spaWaiting: SpaClient[] = spaJobNow.clockedIn ? clientsFor(spaDay).filter((c) => !spaJobNow.served.includes(c.id) && c.id !== spaServing?.client.id) : [];
  const spaFriends = Object.entries(state.relationships)
    .filter(([, r]) => friendshipLevel(r.points) >= 1)
    .map(([id]) => ({ id, name: residentById(id)?.name ?? 'A friend' }));
  /** Walk to a table in a room: just beside it. */
  const toTable = (roomId: string, table: number) => {
    const t = SPA_ROOMS.find((r) => r.id === roomId)!.tables[table];
    const [x, z] = tableSpot(t);
    placePlayer([x, 0, z], Math.PI / 2);
  };
  /** What E does where you stand inside the spa. */
  const spaPrompt = () => {
    const { x, z } = controller.position;
    const near = (p: readonly [number, number], r = USE_RADIUS) => Math.hypot(x - p[0], z - p[1]) <= r;
    if (near(SPA_DOOR)) return { verb: 'Leave to', place: district.name, onOpen: () => { setSpaBooking(null); goOutside(); } };
    if (spaBooking) {
      const room = SPA_ROOMS.find((r) => r.id === spaBooking.room)!;
      const svc = spaService(spaBooking.service)!;
      if (near(tableSpot(room.tables[0]), 1.1)) return {
        verb: `Lie down for your ${svc.name} in`, place: room.name,
        onOpen: () => {
          if (state.balance < svc.price) { setArrival(`The ${svc.name} is ${svc.price} GHAI. You don't have enough.`); return; }
          spaTreat(svc.id, spaBooking.friendId);
          setSpaBooking(null);
          const friend = spaBooking.friendId ? residentById(spaBooking.friendId)?.name.split(' ')[0] : null;
          setArrival(`${svc.name}${friend ? ` with ${friend}` : ''}: ${svc.minutes} minutes of warm oil, candlelight and quiet. You feel rested and lighter.`);
        },
      };
    }
    if (near(SPA_DESK_SPOT, 1.3)) return { verb: 'See the treatments with', place: 'Kemi at reception', onOpen: () => setSpaPanel('menu') };
    if (near(SPA_MANAGER_SPOT, 1.3)) return { verb: state.spa.employed ? 'Talk shifts with' : 'Ask about a job with', place: 'Ifeoma, the manager', onOpen: () => setSpaPanel('job') };
    if (spaJobNow.clockedIn && !spaServing) {
      const i = SPA_WAITING.findIndex((seat, k) => k < spaWaiting.length && Math.hypot(x - seat.x, z - (seat.z + 0.7)) <= 1.0);
      if (i >= 0) {
        const c = spaWaiting[i];
        return {
          verb: `Take ${c.name} through for a ${spaService(c.service)!.name} in`, place: roomFor(c.service, spaJobNow.served.length + 1).name,
          onOpen: () => {
            const room = roomFor(c.service, spaJobNow.served.length + 1);
            setSpaServing({ client: c, room: room.id, table: 0 });
            toTable(room.id, 0);
          },
        };
      }
    }
    return null;
  };
  /** In through the Fashion House's front door. */
  const enterBoutique = () => {
    setHomePanel(null);
    setVenue(BOUTIQUE_ID);
    placePlayer([BOUTIQUE_DOOR[0], 0, BOUTIQUE_DOOR[1]], 0);
    snapCamera();
  };
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
  const interactWithUniversity = (action: UniversityInteraction) => {
    if (!insideUniversity || !inWorkplace) return;
    if (action === 'door') {
      goOutside();
      return;
    }
    if (action === 'info' || action === 'services' || action === 'centre') {
      setCampusPanel(action);
      return;
    }
    if (action === 'cafeteria') {
      if (state.balance < CAFETERIA_MEAL_PRICE) setArrival(`A cafeteria meal costs ${CAFETERIA_MEAL_PRICE} GHAI.`);
      else {
        eat(CAFETERIA_MEAL_PRICE, 40);
        setArrival(`You buy a cafeteria lunch for ${CAFETERIA_MEAL_PRICE} GHAI.`);
      }
      return;
    }
    if (character.career !== 'student') {
      setArrival('Only enrolled students can use lectures, the study desks and assignments. Choose the Student career to enrol.');
      return;
    }
    setCampusPanel(action);
  };
  const campusDay = Math.floor(state.time.totalMinutes / 1440);
  const campusToday = campusForDay(state.campus, campusDay);
  const attendSlot = (slotId: ClassSlot['id']) => {
    const { x, z } = controller.position;
    const result = attendClass(campusToday, slotId, state.time.hour * 60 + state.time.minute, isInLectureHall(x, z));
    if (result.result !== 'ok') {
      setArrival('You need to be in the lecture hall while the class is open.');
      return;
    }
    campusClass(slotId, true);
    setCampusPanel(null);
    const slot = CLASS_SLOTS.find((entry) => entry.id === slotId);
    setArrival(`You attended ${slot?.title ?? 'class'}. +1 credit.`);
  };
  const submitCampusAssignment = (choice: number) => {
    const { x, z } = controller.position;
    const result = submitAssignment(campusToday, campusDay, choice, isInLibrary(x, z));
    if (result.result !== 'ok') return;
    campusAssignment(choice, true);
    setCampusPanel(null);
    setArrival(result.correct
      ? 'Assignment submitted: correct answer. It counts towards your average.'
      : `Assignment submitted: incorrect. The right answer was "${assignmentForDay(campusDay).options[assignmentForDay(campusDay).answer]}".`);
  };
  const studyAtLibrary = () => {
    const { x, z } = controller.position;
    if (!isInLibrary(x, z)) return;
    campusStudy(true);
    setCampusPanel(null);
    setArrival('You studied for 30 minutes in the library.');
  };
  const takeNotes = () => {
    const { x, z } = controller.position;
    if (!isInLectureHall(x, z) || campusToday.attended.length === 0) return;
    campusStudy(true);
    setCampusPanel(null);
    setArrival('You took notes for 30 minutes.');
  };
  const hospitalDay = Math.floor(state.time.totalMinutes / 1440);
  const hospitalToday = hospitalForDay(state.hospital, hospitalDay);
  const minuteNow = state.time.hour * 60 + state.time.minute;
  const interactWithHospital = (action: HospitalInteraction) => {
    if (!insideHospital || !inWorkplace) return;
    if (action === 'door') {
      goOutside();
      return;
    }
    if (action === 'pharmacy') {
      setHospitalPanel('pharmacy');
      return;
    }
    if (character.career !== 'doctor') {
      setArrival('Only hospital doctors can work here. Choose the Doctor career to join the staff.');
      return;
    }
    setHospitalPanel(action);
  };
  const hospitalPos = () => controller.position;
  const doClockIn = () => {
    const result = hospitalClockInRule(hospitalToday, minuteNow, action2Reception());
    if (result.result === 'ok') {
      hospitalClockIn(true);
      setHospitalPanel(null);
      setArrival('You clocked in. Find the supervisor for your briefing.');
    } else if (result.result === 'not-open') setArrival('Clock-in opens at 09:00.');
    else if (result.result === 'too-late') setArrival('It is too late to start a shift today.');
  };
  const action2Reception = () => {
    const { x, z } = hospitalPos();
    return hospitalInteractionAt(HOSPITAL_INTERIOR, x, z) === 'reception';
  };
  const doClockOut = () => {
    const result = hospitalClockOutRule(hospitalToday, action2Reception());
    if (result.result !== 'ok') return;
    hospitalClockOut(true);
    setHospitalPanel(null);
    setArrival(result.completed ? 'Shift complete. Your pay has been added through the normal ledger.' : 'You clocked out before seeing all patients.');
  };
  const doBrief = () => {
    const { x, z } = hospitalPos();
    const result = hospitalBriefRule(hospitalToday, isInSupervisorOffice(x, z));
    if (result.result !== 'ok') {
      setArrival('Go to the supervisor\u2019s office, then take the briefing.');
      return;
    }
    hospitalBrief(true);
    setHospitalPanel(null);
    setArrival('Briefing complete. See your patients on the ward.');
  };
  const doTreat = (choice: number) => {
    const { x, z } = hospitalPos();
    const result = hospitalTreatRule(hospitalToday, hospitalDay, choice, isInWard(x, z));
    if (result.result !== 'ok') {
      setArrival('You need to be on the ward to see patients.');
      return;
    }
    hospitalPatient(choice, true);
    setHospitalPanel(null);
    setArrival(result.correct ? `Correct. ${result.note}` : `Not the best call. ${result.note}`);
  };
  const officeActionAt = (): OfficeInteraction | null => {
    if (!insideOffice || !inWorkplace) return null;
    return officeInteractionAt(OFFICE_INTERIOR, controller.position.x, controller.position.z);
  };
  const interactWithOffice = (action: OfficeInteraction) => {
    if (!insideOffice || !inWorkplace) return;
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

  const openSection = (s: BoutiqueSection) => { setAssistantOpen(false); setStore(null); setCatalogueOpen(false); setSection((cur) => (cur === s ? null : s)); };
  /** What E does where you stand inside the Fashion House. */
  const boutiquePrompt = () => {
    const { x, z } = controller.position;
    const near = (p: readonly [number, number], r = USE_RADIUS) => Math.hypot(x - p[0], z - p[1]) <= r;
    if (near(BOUTIQUE_DOOR)) return { verb: 'Leave to', place: district.name, onOpen: goOutside };
    if (near(DESK_SPOT)) return { verb: 'Talk to', place: `${BOUTIQUE_STAFF.assistant.name}, the store assistant`, onOpen: () => { setSection(null); setAssistantOpen(true); } };
    if (near(FITTING_SPOT)) return { verb: 'Try things on in', place: 'the fitting room', onOpen: () => { setSection(null); setStore('wardrobe'); } };
    if (near(SALON_SPOT)) return { verb: 'Change your hair colour at', place: 'the salon', onOpen: () => openSection('hair') };
    return null;
  };
  /** Pays for everything in the boutique cart at once and puts it on. */
  const buyMany = (items: FashionItem[]) => {
    const fresh = items.filter((i) => !wardrobe.owned.includes(i.id));
    const total = fresh.reduce((sum, i) => sum + i.price, 0);
    if (!fresh.length || state.balance < total || state.summary) return;
    for (const i of fresh) buyFashionItem(i.id);
    const equipped = { ...wardrobe.equipped };
    for (const i of fresh) equipped[i.slot] = i.id;
    onCharacterUpdate({ ...character, wardrobe: { ...wardrobe, owned: [...wardrobe.owned, ...fresh.map((i) => i.id)], equipped } });
    setTryOn({});
  };
  const toggleFavourite = (id: string) => {
    const favs = wardrobe.favourites ?? [];
    onCharacterUpdate({ ...character, wardrobe: { ...wardrobe, favourites: favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id] } });
  };
  /** Walk to that chair and sit; the menu opens straight away (ordering waits until you're seated). */
  const sitAtTable = (seat: Seat) => {
    setHostOpen(false);
    setMovementBlocked(false);
    sit.start({ seat, place: district.restaurant?.name ?? 'the table', minutes: 0 });
    setMenuOpen(true);
  };
  const tableSeat = sit.session?.phase === 'seated' && inPalms && FREE_SEATS.some((x) => x.id === sit.session!.seat.id) ? sit.session.seat : null;
  // In the cantina: a chair at a table or a stool at the bar
  const cantinaSeat = sit.session?.phase === 'seated' && inCantina && CANTINA_SEATS.some((x) => x.id === sit.session!.seat.id) ? sit.session.seat : null;
  const sitInCantina = (seat: Seat) => {
    setMovementBlocked(false);
    sit.start({ seat, place: CANTINA_NAME, minutes: 0 });
    setMenuOpen(true);
  };
  const orderAtCantina = (item: MenuItem) => {
    if (!cantinaSeat || state.balance < item.price || !suitsYou(item, character.diet) || !cantinaOpen(state.time.hour)) return;
    eat(item.price, item.fullness, item.lift);
    wait(item.minutes);
    setServed((s) => ({ seatId: cantinaSeat.id, dishes: s && s.seatId === cantinaSeat.id ? [...s.dishes, item.id] : [item.id] }));
    const atBar = CANTINA_STOOLS.some((x) => x.id === cantinaSeat.id);
    setArrival(`${atBar ? CANTINA_STAFF.bartender.name : CANTINA_STAFF.waiter.name} brings your ${item.name}. ${item.minutes} minutes pass while you enjoy it.`);
  };
  /** What E does where you stand inside Cantina Ayé. */
  const cantinaPrompt = () => {
    const { x, z } = controller.position;
    const near = (p: readonly [number, number], r = USE_RADIUS) => Math.hypot(x - p[0], z - p[1]) <= r;
    if (near(CANTINA_DOOR)) return { verb: 'Leave to', place: district.name, onOpen: goOutside };
    const seat = CANTINA_SEATS
      .filter((s) => Math.hypot(x - s.x, z - s.z) <= 1.1 || Math.hypot(x - (s.approach?.x ?? s.x), z - (s.approach?.z ?? s.z)) <= 0.7)
      .sort((a, b) => Math.hypot(x - a.x, z - a.z) - Math.hypot(x - b.x, z - b.z))[0];
    if (seat) {
      const stool = CANTINA_STOOLS.some((st) => st.id === seat.id);
      return { verb: 'Sit at', place: stool ? 'the bar' : 'this table', onOpen: () => sitInCantina(seat) };
    }
    if (near(CANTINA_BAR_SPOT, 1.4)) return { verb: 'See the menu from', place: `${CANTINA_STAFF.bartender.name}, the bartender`, onOpen: () => setMenuOpen(true) };
    return null;
  };
  const orderDish = (item: MenuItem) => {
    if (!tableSeat || state.balance < item.price || !suitsYou(item, character.diet) || !palmsOpen(state.time.hour)) return;
    eat(item.price, item.fullness, item.lift);
    wait(item.minutes);
    setServed((s) => ({ seatId: tableSeat.id, dishes: s && s.seatId === tableSeat.id ? [...s.dishes, item.id] : [item.id] }));
    setArrival(`${PALMS_STAFF.waiter.name} brings your ${item.name}. ${item.minutes} minutes pass while you enjoy it.`);
  };
  /** What E does where you stand inside The Palms. */
  const palmsPrompt = () => {
    const { x, z } = controller.position;
    const near = (p: readonly [number, number], r = USE_RADIUS) => Math.hypot(x - p[0], z - p[1]) <= r;
    if (near(PALMS_DOOR)) return { verb: 'Leave to', place: district.name, onOpen: goOutside };
    if (near(PALMS_HOST_SPOT)) return { verb: 'Check in with', place: `${PALMS_STAFF.host.name}, the host`, onOpen: () => setHostOpen(true) };
    const seat = FREE_SEATS.find((s) => Math.hypot(x - s.x, z - s.z) <= 1.1 || Math.hypot(x - (s.approach?.x ?? s.x), z - (s.approach?.z ?? s.z)) <= 0.7);
    if (seat) return { verb: 'Sit at', place: 'this table', onOpen: () => sitAtTable(seat) };
    return null;
  };

  // ---------------------------------------------------------------- entrances on the street
  const within = (p: readonly number[], r: number) => Math.hypot(p[0] - controller.position.x, p[2] - controller.position.z) <= r;
  const atDealershipDoor = () => !offStreet && !!district.carDealership && within(district.carDealership.position, 4);
  const atOfficeDoor = () => !offStreet && district.id === OFFICE_WORKPLACE.districtId && within(OFFICE_WORKPLACE.position, OFFICE_WORKPLACE.radius);
  const atUniversityDoor = () => !offStreet && district.id === UNIVERSITY.districtId && within(UNIVERSITY.position, UNIVERSITY.radius);
  const atHospitalDoor = () => !offStreet && district.id === HOSPITAL.districtId && within(HOSPITAL.position, HOSPITAL.radius);
  // ---------------------------------------------------------------- hugs (consent-based, lib/hug.ts)
  const requestHug = (resident: Resident): string | null => {
    const relationship = state.relationships[resident.id];
    const points = relationship?.points ?? 0;
    const today = gameDay(state.time.totalMinutes);
    if (!isAdultResident(resident) || !canResidentAcceptHug(isAdultResident(resident), points)) {
      return `${resident.name.split(' ')[0]} would like to know you better before sharing a hug.`;
    }
    if ((relationship?.lastHugDay ?? -1) === today) return `You and ${resident.name.split(' ')[0]} have already shared a hug today.`;
    const currentResident = residentPosition(resident);
    const obstacles = [...activeLayout().obstacles, ...movingObstacles];
    const plan = findHugPlan(controller.position, currentResident, obstacles);
    if (!plan) return 'There is no clear, unobstructed spot to share a hug here.';
    const traffic = trafficSnapshot();
    if (
      pedestrianInTrafficPath({ x: plan.player.x, z: plan.player.z, vx: 0, vz: 0 }, traffic.cars, traffic.lanes)
      || pedestrianInTrafficPath({ x: plan.resident.x, z: plan.resident.z, vx: 0, vz: 0 }, traffic.cars, traffic.lanes)
    ) return 'Traffic is too close right now. Try again when the area is clear.';
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
  // ---------------------------------------------------------------- the city directory (lib/locations.ts)
  const locations = useMemo(() => locationsFor(district, character.career, state.home), [district, character.career, state.home]);
  const trackedLocation = locations.find((l) => l.id === trackedId && l.position) ?? null;
  /** Standing at this location right now, so its own panel can open. */
  const canUseNow = (e: LocationEntry) => {
    const { x, z } = controller.position;
    if (e.use === 'food') { const v = nearestVendor(district.vendors, x, z); return !!v && `${district.id}.${v.id}` === e.id; }
    if (e.use === 'shop') return counterAt(district, x, z) === 'fashion';
    if (e.use === 'gadgets') return counterAt(district, x, z) === 'gadgets';
    if (e.use === 'travel') return counterAt(district, x, z) === 'travel';
    if (e.use === 'dealership') return atDealershipDoor();
    if (e.use === 'home') { const h = homeAtDoor(district.id, x, z); return !!h && `${district.id}.home.${h.id}` === e.id; }
    return false;
  };
  const useLocation = (e: LocationEntry) => {
    setLocationsOpen(false);
    if (e.use === 'food') { const v = district.vendors.find((v) => `${district.id}.${v.id}` === e.id); if (v) enterRestaurant(v); }
    else if (e.use === 'shop') enterBoutique();
    else if (e.use === 'gadgets') setGadgets(true);
    else if (e.use === 'travel') setTravelOpen(true);
    else if (e.use === 'dealership') {
      enterDealership();
      setDealershipModelId(VEHICLE_CATALOG[0].id);
      setDealershipOpen(true);
    }
    else if (e.use === 'home') { const h = district.homes.find((h) => `${district.id}.home.${h.id}` === e.id); if (h) setHomePanel(h); }
  };

  // E: the thing you're standing at (a counter, a door, a person, a piece of furniture)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (decorPlacement && e.target instanceof HTMLInputElement) return;
      if (decorPlacement && e.key.toLowerCase() === 'r') {
        setDecorPlacement((current) => current && ({ ...current, rotation: (current.rotation + Math.PI / 2) % (Math.PI * 2) }));
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
      if (e.key.toLowerCase() !== 'e' || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (dealershipOpen) return;
      if (controller.drivingVehicleId) {
        leaveVehicle();
        return;
      }
      // E on a seat gets you up; on the way to one it does nothing
      if (sit.session) {
        if (sit.session.phase === 'seated') sit.cancel();
        return;
      }
      if (inWorkplace) {
        const { x, z } = controller.position;
        if (insideHospital) {
          const action = hospitalInteractionAt(HOSPITAL_INTERIOR, x, z);
          if (action) interactWithHospital(action);
        } else if (insideUniversity) {
          const action = universityInteractionAt(UNIVERSITY_INTERIOR, x, z);
          if (action) interactWithUniversity(action);
        } else if (insideDealership) {
          const action = dealershipInteractionAt(x, z);
          if (action === 'door') goOutside();
          else if (action === 'salesperson') {
            setDealershipModelId(VEHICLE_CATALOG[0].id);
            setDealershipOpen(true);
          } else if (action) {
            setDealershipModelId(action.modelId);
            setDealershipOpen(true);
          }
        } else if (insideRestaurant && restaurantVendor) {
          const action = restaurantInteractionAt(x, z);
          if (action === 'door') goOutside();
          else if (action === 'host') setVendor(restaurantVendor);
        } else if (insideOffice) {
          const action = officeActionAt();
          if (action) interactWithOffice(action);
        }
        return;
      }
      if (inPalms) {
        palmsPrompt()?.onOpen();
        return;
      }
      if (inCantina) {
        cantinaPrompt()?.onOpen();
        return;
      }
      if (inHotel) {
        hotelPrompt()?.onOpen();
        return;
      }
      if (inSpa) {
        spaPrompt()?.onOpen();
        return;
      }
      if (inBoutique) {
        boutiquePrompt()?.onOpen();
        return;
      }
      if (indoors && interior) {
        if (nearSpot(bedSpot(interior))) rest(true);
        else if (usableHere()) operateHere();
        else if (nearSpot(doorSpot(interior))) goOutside();
        return;
      }
      if (eventPrompt()) {
        helpAtEvent();
        return;
      }
      const { x, z } = controller.position;
      const near = nearestVendor(district.vendors, x, z);
      const counter = counterAt(district, x, z);
      const door = homeAtDoor(district.id, x, z);
      if (near) enterRestaurant(near);
      else if (atDealershipDoor()) enterDealership();
      else if (atOfficeDoor()) goIntoOffice();
      else if (atUniversityDoor()) goIntoUniversity();
      else if (atHospitalDoor()) goIntoHospital();
      else if (atAgency()) setAgencyOpen(true);
      else if (restaurantAt(district, x, z)) enterPalms();
      else if (barAt(district, x, z)) enterCantina();
      else if (hotelAt(district, x, z)) enterHotel();
      else if (spaAt(district, x, z)) enterSpa();
      else if (counter === 'fashion') enterBoutique();
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
    setMovementBlocked(vendor !== null || store !== null || homePanel !== null || gadgets || travelOpen || talking !== null || hugging !== null || task !== null || locationsOpen || nightOpen || parkOpen || catalogueOpen || hostOpen || assistantOpen || campusPanel !== null || hospitalPanel !== null || officePanel !== null || dealershipOpen || agencyOpen || spaPanel !== null || spaServing !== null || phoneOpen || eventPanelOpen || divineOpen || questsOpen || inventoryOpen);
    return () => setMovementBlocked(false);
  }, [eventPanelOpen, divineOpen, questsOpen, inventoryOpen, vendor, store, homePanel, gadgets, travelOpen, talking, hugging, task, locationsOpen, nightOpen, parkOpen, catalogueOpen, hostOpen, assistantOpen, campusPanel, hospitalPanel, officePanel, dealershipOpen, agencyOpen, spaPanel, spaServing, phoneOpen]);

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
    nightOut(residentId, !!character.wardrobe.equipped.scent);
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

  // P takes the phone out and puts it away
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { setPhoneStart(null); setPhoneOpen((o) => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    if (offStreet) return;
    const id = setInterval(() => {
      const { x, z } = controller.position;
      for (const d of destinations) {
        if (d.position && d.status !== 'planned' && !visitedRef.current.includes(d.id) && Math.hypot(d.position.x - x, d.position.z - z) <= 4) visit(d.id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [destinations, offStreet, controller, visit]);

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
    if (offStreet && !(indoors && staysIn)) { goOutside(); setTimeout(() => goForRef.current(link), 150); return; }
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
  // Inside a building, the area is where its front door is
  const doorNow = insideHospital && inWorkplace ? HOSPITAL.position : insideUniversity && inWorkplace ? UNIVERSITY.position
    : insideOffice && inWorkplace ? OFFICE_WORKPLACE.position : insideDealership && inWorkplace && district.carDealership ? district.carDealership.position
      : insideRestaurant && restaurantVendor ? restaurantVendor.position : inBoutique ? district.fashionHouse.position : inPalms && district.restaurant ? district.restaurant.door : inCantina && district.bar ? district.bar.door : inHotel && district.hotel ? district.hotel.door : inSpa && district.spa ? district.spa.door : indoors && home ? home.door : null;
  const areaHere = doorNow
    ? district.neighborhoods.find((n) => doorNow[0] >= n.bounds.minX && doorNow[0] <= n.bounds.maxX && doorNow[2] >= n.bounds.minZ && doorNow[2] <= n.bounds.maxZ) ?? null
    : neighborhood;
  const areaName = areaHere?.name ?? district.name;
  // Title plate: the building you're in, the place you're standing at, or the area
  const plate: PlacePlate = (() => {
    if (inPalms && district.restaurant) return { title: district.restaurant.name, subtitle: district.restaurant.kind, icon: 'restaurant' };
    if (inCantina && district.bar) return { title: district.bar.name, subtitle: district.bar.kind, icon: 'restaurant' };
    if (inHotel && district.hotel) return { title: district.hotel.name, subtitle: hotelKey ? `Room ${GUEST_ROOM} is yours until 12:00` : 'Reception', icon: 'home' };
    if (inSpa && district.spa) return { title: district.spa.name, subtitle: spaJobNow.clockedIn ? 'On shift' : spaBooking ? `Booked: ${spaService(spaBooking.service)!.name}` : district.spa.kind, icon: 'home' };
    if (inBoutique) return { title: district.fashionHouse.name, subtitle: district.fashionHouse.kind, icon: 'hanger' };
    if (inWorkplace && insideUniversity) return { title: UNIVERSITY.name, subtitle: `Campus · ${district.city.name}`, icon: 'career' };
    if (inWorkplace && insideHospital) return { title: HOSPITAL.name, subtitle: `Hospital · ${district.city.name}`, icon: 'career' };
    if (inWorkplace && insideOffice) return { title: OFFICE_WORKPLACE.name, subtitle: `At work · ${district.city.name}`, icon: 'career' };
    if (inWorkplace && insideDealership) return { title: district.carDealership?.name ?? 'Car showroom', subtitle: `Showroom · ${district.city.name}`, icon: 'car' };
    if (inWorkplace && insideRestaurant && restaurantVendor) return { title: restaurantVendor.name, subtitle: `Dining · ${district.city.name}`, icon: 'restaurant' };
    if (indoors && home) return { title: home.id === state.home && interior ? MY_HOME[interior.tier] : home.name, subtitle: areaName, icon: 'home' };
    const { x, z } = controller.position;
    const at = district.places.find((p) => Math.hypot(p.position[0] - x, p.position[2] - z) < PLATE_RADIUS);
    if (at && district.restaurant && at.position === district.restaurant.door) return { title: at.name, subtitle: district.restaurant.kind, icon: 'restaurant' };
    if (at && district.bar && at.position === district.bar.door) return { title: at.name, subtitle: district.bar.kind, icon: 'restaurant' };
    if (at && district.hotel && at.position === district.hotel.door) return { title: at.name, subtitle: district.hotel.kind, icon: 'home' };
    if (at) return { title: at.name, subtitle: PLATE_SUBTITLE[at.kind], icon: PLATE_ICON[at.kind] };
    return { title: areaName, subtitle: district.city.name, icon: 'palm' };
  })();
  /** What E does where you stand in one of the walk-in workplaces. */
  const workplacePrompt = (): { verb: string; place: string; onOpen: () => void } | null => {
    if (!inWorkplace) return null;
    const { x, z } = controller.position;
    if (insideHospital) {
      const action = hospitalInteractionAt(HOSPITAL_INTERIOR, x, z);
      return action ? ({
        door: { verb: 'Leave the hospital through', place: 'the main entrance', onOpen: () => interactWithHospital('door') },
        reception: { verb: 'Clock in or out at', place: 'reception', onOpen: () => interactWithHospital('reception') },
        pharmacy: { verb: 'Visit', place: 'the pharmacy', onOpen: () => interactWithHospital('pharmacy') },
        supervisor: { verb: 'Speak to', place: 'the supervisor', onOpen: () => interactWithHospital('supervisor') },
        patient: { verb: 'See a patient on', place: 'the ward', onOpen: () => interactWithHospital('patient') },
      })[action] : null;
    }
    if (insideUniversity) {
      const action = universityInteractionAt(UNIVERSITY_INTERIOR, x, z);
      return action ? ({
        door: { verb: 'Leave campus through', place: 'the main entrance', onOpen: () => interactWithUniversity('door') },
        info: { verb: 'Check the', place: 'university directory', onOpen: () => interactWithUniversity('info') },
        services: { verb: 'Visit', place: 'student services', onOpen: () => interactWithUniversity('services') },
        lecture: { verb: 'Attend class in', place: 'Lecture Hall A', onOpen: () => interactWithUniversity('lecture') },
        study: { verb: 'Study at', place: 'the library desk', onOpen: () => interactWithUniversity('study') },
        assignment: { verb: 'Submit work at', place: 'the computer lab', onOpen: () => interactWithUniversity('assignment') },
        cafeteria: { verb: 'Buy lunch at', place: 'the cafeteria', onOpen: () => interactWithUniversity('cafeteria') },
        centre: { verb: 'Relax in', place: 'the student centre', onOpen: () => interactWithUniversity('centre') },
      })[action] : null;
    }
    if (insideDealership) {
      const action = dealershipInteractionAt(x, z);
      if (action && typeof action === 'object') {
        const model = vehicleById(action.modelId);
        return model ? { verb: 'Ask about', place: model.name, onOpen: () => { setDealershipModelId(model.id); setDealershipOpen(true); } } : null;
      }
      return action ? ({
        door: { verb: 'Leave through', place: 'the showroom entrance', onOpen: goOutside },
        salesperson: { verb: 'Talk to', place: 'the salesperson', onOpen: () => setDealershipOpen(true) },
      })[action] : null;
    }
    if (insideRestaurant) {
      const action = restaurantInteractionAt(x, z);
      if (!action) return null;
      return ({
        door: { verb: 'Leave through', place: 'the restaurant entrance', onOpen: goOutside },
        host: { verb: restaurantStage === 'host' ? 'Check in with' : 'Speak to', place: 'the host', onOpen: () => { if (restaurantVendor) setVendor(restaurantVendor); } },
      })[action];
    }
    if (insideOffice) {
      const action = officeActionAt();
      return action ? ({
        door: { verb: 'Leave the workplace through', place: 'the front door', onOpen: () => interactWithOffice('door') },
        reception: { verb: 'Talk to', place: 'reception', onOpen: () => interactWithOffice('reception') },
        computer: { verb: 'Work at', place: 'the computer', onOpen: () => interactWithOffice('computer') },
        documents: { verb: 'Process', place: 'the documents', onOpen: () => interactWithOffice('documents') },
        meeting: { verb: 'Join', place: 'the team meeting', onOpen: () => interactWithOffice('meeting') },
      })[action] : null;
    }
    return null;
  };
  const toggleOs = (tab: OsTab) => { if (osOpen && osTab === tab) setOsOpen(false); else openOs(tab); };
  const nav: NavItem[] = inBoutique ? [
    { id: 'clothes', label: 'Clothes', icon: 'shirt', onClick: () => openSection('clothes'), active: section === 'clothes' },
    { id: 'shoes', label: 'Shoes', icon: 'shoe', onClick: () => openSection('shoes'), active: section === 'shoes' },
    { id: 'hair', label: 'Hair', icon: 'hair', onClick: () => openSection('hair'), active: section === 'hair' },
    { id: 'accessories', label: 'Accessories', icon: 'bag', onClick: () => openSection('accessories'), active: section === 'accessories' },
    { id: 'decor', label: 'Decor', icon: 'decor', onClick: () => { setSection(null); setStore(null); setCatalogueOpen((o) => !o); }, active: catalogueOpen, title: 'Home Decor: furniture delivered to your home' },
    { id: 'fitting', label: 'Fitting Room', icon: 'hanger', onClick: () => { setSection(null); setCatalogueOpen(false); setStore((s) => (s === 'wardrobe' ? null : 'wardrobe')); }, active: store === 'wardrobe', title: 'Change into clothes you own' },
    { id: 'catalogue', label: 'Catalogue', icon: 'spark', onClick: () => { setSection(null); setCatalogueOpen(false); setStore((s) => (s === 'shop' ? null : 'shop')); }, active: store === 'shop', title: '3D shoes and hairstyles, accessories and the daily style showcase' },
  ] : [
    indoors
      ? { id: 'home', label: 'Decor', icon: 'decor', onClick: () => setCatalogueOpen(true), active: catalogueOpen, title: 'Buy, place and arrange furniture' }
      : inWorkplace ? { id: 'home', label: 'Leave', icon: 'go', onClick: goOutside, title: 'Back out to the street' }
      : { id: 'home', label: 'Home', icon: 'home', onClick: () => onGo(state.home ? { to: 'home' } : { to: 'homes' }), title: state.home ? 'Walk home' : 'Find a home to rent' },
    { id: 'quests', label: 'Quests', icon: 'goals', onClick: () => setQuestsOpen((o) => !o), active: questsOpen, title: 'Daily, weekly and story quests' },
    { id: 'phone', label: 'Phone', icon: 'phone', onClick: () => { setPhoneStart(null); setPhoneOpen((o) => !o); }, active: phoneOpen, badge: myPhone.phone.notifications ? unreadCount(myPhone.phone) : 0, title: 'Your phone: bank, messages, jobs, homes, rides and more (P)' },
    {
      id: 'map', label: 'Map', icon: 'map', active: mapOpen || locationsOpen,
      title: phone ? 'The map on your phone (M)' : 'Every place in the city',
      onClick: () => {
        if (phone) setMapOpen(true);
        else if (offStreet) { goOutside(); setTimeout(() => setLocationsOpen(true), 150); }
        else setLocationsOpen(true);
      },
    },
    drivingModel
      ? { id: 'drive', label: 'Get out', icon: 'car', onClick: leaveVehicle, active: true, title: `Get out of your ${drivingModel.name}` }
      : { id: 'inventory', label: 'Inventory', icon: 'bag', onClick: () => setInventoryOpen((o) => !o), active: inventoryOpen || store === 'wardrobe', title: 'Everything you own: work gear, clothes, gadgets, vehicles' },
    inPalms || inCantina
      ? { id: 'restaurant', label: inCantina ? 'Menu' : 'Restaurant', icon: 'restaurant', onClick: () => setMenuOpen((o) => !o), active: menuOpen, title: 'The menu' }
      : inWorkplace && insideRestaurant && restaurantVendor
        ? { id: 'restaurant', label: 'Restaurant', icon: 'restaurant', onClick: () => setVendor(restaurantVendor), active: vendor !== null, title: 'Your table, the menu and the bill' }
        : { id: 'career', label: 'Career', icon: 'career', onClick: () => toggleOs('career'), active: osOpen && osTab === 'career', title: 'Your job, pay and promotions' },
    { id: 'social', label: 'Social', icon: 'social', onClick: () => toggleOs('people'), active: osOpen && osTab === 'people', title: 'The people you know' },
    { id: 'divine', label: 'Divine', icon: 'crown', onClick: () => setDivineOpen((o) => !o), active: divineOpen || state.supernatural.form === 'transformed', title: 'Divine Evolution: supernatural forms and your sanctuary' },
  ];
  const whereabouts = {
    place: inWorkplace ? `${plate.title}, ${district.city.name}` : inBoutique ? `${district.fashionHouse.name}, ${district.city.name}` : inPalms && district.restaurant ? `${district.restaurant.name}, ${district.city.name}` : inCantina && district.bar ? `${district.bar.name}, ${district.city.name}` : inHotel && district.hotel ? `${district.hotel.name}, ${district.city.name}` : indoors && home ? `At home, ${home.name}` : `${neighborhood?.name ?? district.name}, ${district.city.name}`,
    activity: drivingModel ? `Driving the ${drivingModel.name}` : inWorkplace && insideHospital ? (hospitalToday.onShift ? 'On shift' : 'At the hospital')
      : inWorkplace && insideUniversity ? 'At university' : inWorkplace && insideOffice ? (state.officeCareer.activeShift ? 'At work' : 'At the office')
        : inWorkplace && insideDealership ? 'At the car showroom' : inWorkplace && insideRestaurant ? (restaurantStage === 'eating' ? 'Dining out' : 'At the restaurant') : inBoutique ? 'Shopping' : inPalms ? (tableSeat ? 'Dining out' : 'At the restaurant') : inCantina ? (cantinaSeat ? 'Out at the bar' : `At ${CANTINA_NAME}`) : inHotel ? (hotelKey ? 'Staying at the hotel' : 'At the hotel') : inSpa ? (spaJobNow.clockedIn ? 'On shift at the spa' : 'At the spa') : sit.session ? `Sitting at ${sit.session.place}` : indoors ? 'At home'
      : character.career !== 'none' && isWorkingHours(state.time) && isAtWorkplace(district, character.career, controller.position.x, controller.position.z) ? 'Working'
        : getTrip()?.status === 'moving' ? `On the way${getTrip()?.label ? ` to ${getTrip()!.label}` : ''}` : 'Out and about',
  };

  const closePhone = () => setPhoneOpen(false);
  const phoneActions = {
    phoneFriend, buyHome, moveIn, spaHire, setSavingsGoal,
    onGo: (link: LifeLink) => { closePhone(); onGo(link); },
    openMap: phone ? () => { closePhone(); setMapOpen(true); } : null,
    openTravel: () => { closePhone(); setTravelOpen(true); },
    openLifeOS: () => { closePhone(); openOs('today'); },
    walkTo: (d: Destination): string | null => {
      if (!d.position) return 'This place isn’t in the city yet.';
      if (drivingModel) return 'You’re driving: get out first.';
      closePhone();
      if (offStreet) { goOutside(); setTimeout(() => { const e = goTo(d); if (e) setArrival(e); }, 150); return null; }
      const e = goTo(d);
      if (e) setPhoneOpen(true);
      return e;
    },
    ride: (d: Destination): string | null => {
      if (!d.position) return 'A taxi can’t take you there.';
      if (drivingModel) return 'You’re driving your own car.';
      if (sit.session) return 'Get up first.';
      const metres = Math.hypot(d.position.x - controller.position.x, d.position.z - controller.position.z);
      if (metres < 15) return 'You’re already there.';
      if (state.summary) return 'Start your day first.';
      if (state.balance < rideFare(metres)) return 'Not enough GHAI for the fare.';
      const { x, z } = d.position;
      ride(metres);
      closePhone();
      const drop = () => { placePlayer([x, groundHeightAt(x, z), z]); setArrival(`Your taxi dropped you at ${d.name}. Fare ${rideFare(metres).toLocaleString()} GHAI.`); };
      if (offStreet) { goOutside(); setTimeout(drop, 150); } else drop();
      return null;
    },
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
    if (state.summary || wardrobe.owned.includes(item.id) || state.balance < item.price) return;
    buyFashionItem(item.id);
    onCharacterUpdate({
      ...character,
      // Keep saved looks and favourites
      wardrobe: { ...wardrobe, owned: [...wardrobe.owned, item.id], equipped: { ...wardrobe.equipped, [item.slot]: item.id } },
    });
    setTryOn((t) => {
      const next = { ...t };
      delete next[item.slot];
      return next;
    });
  };
  /** Choose a plain piece's colour: free, kept with your wardrobe, and on you straight away if you wear it. */
  const pickColour = (item: FashionItem, hex: string) => {
    if (!recolourable(item) || !COLOUR_CHOICES.some((c) => c.hex === hex)) return;
    onCharacterUpdate({ ...character, wardrobe: { ...wardrobe, colours: { ...(wardrobe.colours ?? {}), [item.id]: hex } } });
  };
  const closeStore = () => {
    setStore(null);
    setTryOn({});
  };
  const attendFashionShowcase = (): string | null => {
    if (state.summary) return 'The showcase is paused while you review today’s summary.';
    if (state.lastShowcaseDay === gameDay(state.time.totalMinutes)) return null;
    const result = fashionShowcaseResult(wardrobe);
    const missionReady = fashionMissionStage(state.fashionMissionItemId, state.fashionMissionCompleted, wardrobe) === 'showcase';
    fashionShowcase(wardrobe);
    return `${result.tier} · ${result.score}/100. You earned ${result.reward.toLocaleString()} GHAI for the showcase.${missionReady ? ` First Look mission complete · +${FASHION_MISSION_REWARD} GHAI bonus.` : ''}`;
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
    if (!indoors) {
      clearWorkplaces();
      setVenue(null);
      setInside(true);
      const homeRoom = interiorFor(home);
      const [x, z] = doorSpot(homeRoom);
      placePlayer([x, 0, z + 1.6], 0);
      snapCamera();
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
    if (!home || home.district !== district.id || !indoors) {
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
      setArrival(`You need ${item.price.toLocaleString()} GHAI to buy the ${item.name}.`);
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
      ...ownedPieces.map((p) => p.f),
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

  // 'auto' starts high (low on phones and small machines) and drops to low on sustained low frame rates; the player can force either
  const [autoQuality, setAutoQuality] = useState<Quality>(initialAutoQuality);
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
          skinTone={character.skinToneId}
          skinColor={character.skinColor}
          onSkinChange={(skinToneId, skinColor) => onCharacterUpdate({ ...character, skinToneId, skinColor })}
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
              Move with WASD · rotate with R · {decorPlacement.previewOnly ? `place & buy · ${decorPlacementItem.price.toLocaleString()} GHAI` : 'place to save'}
            </p>
          </div>
          <button type="button" onClick={rotateDecorPreview} className="border border-white/20 px-3 py-2 text-xs hover:border-[#c9a35e]">Rotate</button>
          <button type="button" onClick={cancelDecorPlacement} className="border border-white/20 px-3 py-2 text-xs hover:border-white/50">Cancel</button>
          <button type="button" onClick={placeSelectedDecor} className="border border-[#c9a35e] bg-[#d2b36f]/15 px-3 py-2 text-xs text-[#f0d797] hover:bg-[#d2b36f]/25">
            {decorPlacement.previewOnly ? 'Buy & place' : 'Place here'}
          </button>
        </aside>
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
          gear={state.gear}
          rankIndex={careerRank}
          onBuyGear={buyGear}
          onClose={() => setGadgets(false)}
        />
      )}
      {locationsOpen && !offStreet && (
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
      {!offStreet && <TripStatus destinations={destinations} />}
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
          onGo={(p) => {
            if (controller.drivingVehicleId) return 'get out of the car first';
            const { x, z } = controller.position;
            if (Math.hypot(p.x - x, p.z - z) < 1) return 'you’re already here';
            setMovementBlocked(false);
            return setMoveTarget(makeTarget(x, z, p.x, p.z, false), { destinationId: p.id, label: p.name }) ? null : 'there’s no way to walk there from here';
          }}
          onClose={() => setMapOpen(false)}
        />
      )}
      {homePanel && (
        <HomePanel
          home={homePanel}
          currentHomeId={state.home}
          owned={state.owned}
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
            setArrival(`Shift complete. ${completed ? 3 : 0} tasks. Gross earnings ${payment.toLocaleString()} GHAI, deductions 0 GHAI, final payment ${payment.toLocaleString()} GHAI.`);
            setOfficePanel(null);
          }}
          onAnswer={(taskId, choice) => {
            const atStation = officeActionAt() === taskId ? taskId : null;
            officeTask(taskId, choice, atStation);
          }}
          onClose={() => setOfficePanel(null)}
        />
      )}
      {campusPanel && (
        <CampusPanel
          mode={campusPanel}
          campus={campusToday}
          time={state.time}
          day={campusDay}
          inLectureHall={isInLectureHall(controller.position.x, controller.position.z)}
          onAttend={attendSlot}
          onStudy={studyAtLibrary}
          onNotes={takeNotes}
          onRelax={() => {
            wait(15);
            setCampusPanel(null);
            setArrival('You spend 15 minutes with classmates in the student centre.');
          }}
          onAnswer={submitCampusAssignment}
          onClose={() => setCampusPanel(null)}
        />
      )}
      {hospitalPanel && (
        <HospitalPanel
          mode={hospitalPanel}
          hospital={hospitalToday}
          time={state.time}
          day={hospitalDay}
          hourlyPay={hourlyPay}
          todayIncome={state.today.income}
          onClockIn={doClockIn}
          onClockOut={doClockOut}
          onBrief={doBrief}
          onAnswer={doTreat}
          onClose={() => setHospitalPanel(null)}
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
          <WarmUp sceneKey={sceneKey} onReady={setSceneReady} />
          <FpsMeter />
          <CameraFollow controller={controller} controlsRef={controlsRef} />
          <ClickToMove player={controller} showRoute={showRoute} />
          <DistrictContext.Provider value={district}>
            {inWorkplace && venueInterior ? (
              <HomeInterior
                key={insideHospital ? 'hospital' : insideUniversity ? 'university' : insideDealership ? 'dealership' : insideOffice ? 'office' : 'restaurant'}
                interior={venueInterior}
                gameTime={state.time}
                doorOpen={Math.hypot(controller.position.x, controller.position.z - doorSpot(venueInterior)[1]) < 1.8}
              >
                {insideHospital && <HospitalScene player={controller} />}
                {insideUniversity && <UniversityScene player={controller} />}
                {insideDealership && <CarDealershipScene player={controller} />}
                {insideRestaurant && <RestaurantScene
                  tableId={restaurantStage === 'served' || restaurantStage === 'eating' ? restaurantTableId : null}
                  dish={restaurantStage === 'served' || restaurantStage === 'eating' ? restaurantOrder : null}
                  player={controller}
                  onMealDelivered={completeRestaurantDelivery}
                  mealDelivered={restaurantDeliveryReady}
                />}
                {insideOffice && <OfficeScene player={controller} />}
                <InteriorLighting gameTime={state.time} player={controller} indoor={insideRestaurant ? 'restaurant' : true} />
                <Player controller={controller} character={character} tryOn={tryOn} eating={eating} />
              </HomeInterior>
            ) : indoors && interior ? (
              <HomeInterior key={`home-${home!.id}`} interior={interior} gameTime={state.time} extra={extraPieces}>
                <InteriorLighting gameTime={state.time} player={controller} indoor={interior.tier === 'penthouse' || interior.tier === 'apartment' || interior.tier === 'family' || interior.tier === 'villa' || interior.tier === 'warehouse' ? 'home' : undefined} />
                <Player controller={controller} character={character} tryOn={tryOn} />
                {decorPlacement && decorPlacementItem && (
                  <DecorPlacementPreview controller={controller} item={decorPlacementItem} rotation={decorPlacement.rotation} />
                )}
              </HomeInterior>
            ) : inBoutique ? (
              <BoutiqueInterior gameTime={state.time} districtId={district.id}>
                <InteriorLighting gameTime={state.time} player={controller} indoor="boutique" />
                <Player controller={controller} character={character} tryOn={tryOn} />
              </BoutiqueInterior>
            ) : inSpa ? (
              <SpaInterior gameTime={state.time} player={controller} busy={spaIsOpen(state.time.hour)} waiting={spaWaiting} serving={spaServing}>
                <InteriorLighting gameTime={state.time} player={controller} indoor="restaurant" />
                <Player controller={controller} character={character} tryOn={tryOn} />
              </SpaInterior>
            ) : inHotel ? (
              <HotelInterior gameTime={state.time} player={controller} hasKey={hotelKey} tray={trayHere}>
                <InteriorLighting gameTime={state.time} player={controller} indoor="restaurant" />
                <Player controller={controller} character={character} tryOn={tryOn} />
              </HotelInterior>
            ) : inCantina ? (
              <CantinaInterior gameTime={state.time} served={served && cantinaSeat && served.seatId === cantinaSeat.id ? { seat: cantinaSeat, dishes: served.dishes } : null}>
                <InteriorLighting gameTime={state.time} player={controller} indoor="restaurant" />
                <Player controller={controller} character={character} tryOn={tryOn} />
              </CantinaInterior>
            ) : inPalms ? (
              <RestaurantInterior gameTime={state.time} served={served && tableSeat && served.seatId === tableSeat.id ? { seat: tableSeat, dishes: served.dishes } : null}>
                <InteriorLighting gameTime={state.time} player={controller} indoor="restaurant" />
                <Player controller={controller} character={character} tryOn={tryOn} />
              </RestaurantInterior>
            ) : (
              <City key={district.id} controller={controller} character={character} gameTime={state.time} tryOn={tryOn} homeId={state.home} district={district} ownedVehicles={state.ownedVehicles} talkingTo={talking?.id ?? null} hugSession={hugging} onHugComplete={finishHug} liveEvent={liveEvent} />
            )}
          </DistrictContext.Provider>
          <PostEffects />
          <OrbitControlsImpl
            ref={controlsRef}
            makeDefault
            target={[1.5, CAMERA_TARGET_HEIGHT, 2]}
            enableDamping
            maxPolarAngle={Math.PI / 2 - 0.08}
            minDistance={2.5}
            maxDistance={40}
          />
          <TransformAura player={controller} active={state.supernatural.form === 'transformed'} />
          <PhotoCapture />
        </Canvas>
      </QualityContext.Provider>
      {!sceneReady && (
        <div className="scene-preparing" role="status" aria-live="polite">
          <span className="scene-preparing__spinner" aria-hidden="true" />
          Getting {offStreet ? 'inside' : district.name} ready…
        </div>
      )}

      {talking && (
        <TalkPanel
          resident={talking}
          relationship={state.relationships[talking.id]}
          today={gameDay(state.time.totalMinutes)}
          balance={state.balance}
          onActivity={(activity) => socialise(talking.id, activity, !!character.wardrobe.equipped.scent)}
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
      {inPalms && menuOpen && (
        <RestaurantMenu
          diet={character.diet}
          balance={state.balance}
          seated={!!tableSeat}
          eating={null}
          kitchenOpen={palmsOpen(state.time.hour)}
          onOrder={orderDish}
          onClose={() => setMenuOpen(false)}
        />
      )}
      {inCantina && menuOpen && (
        <RestaurantMenu
          menu={CANTINA_MENU}
          diet={character.diet}
          balance={state.balance}
          seated={!!cantinaSeat}
          eating={null}
          kitchenOpen={cantinaOpen(state.time.hour)}
          onOrder={orderAtCantina}
          onClose={() => setMenuOpen(false)}
        />
      )}
      {inHotel && hotelMenu && (
        <RestaurantMenu
          menu={hotelMenu === 'room' ? ROOM_SERVICE_MENU : VENDING_MENU}
          title={hotelMenu === 'room' ? 'Room service' : 'Cold drinks'}
          diet={character.diet}
          balance={state.balance}
          seated={hotelMenu === 'vending' || hotelKey}
          eating={null}
          kitchenOpen
          onOrder={orderInHotel}
          onClose={() => setHotelMenu(null)}
        />
      )}
      {inSpa && spaPanel === 'menu' && (
        <SpaMenu
          balance={state.balance}
          open={spaIsOpen(state.time.hour)}
          friends={spaFriends}
          onBook={(svc, friendId) => {
            const room = roomFor(svc.id, 1);
            setSpaBooking({ service: svc.id, friendId, room: room.id });
            setSpaPanel(null);
            toTable(room.id, 0);
            setArrival(`Kemi shows you to the ${room.name}. Lie on the table when you're ready.`);
          }}
          onClose={() => setSpaPanel(null)}
        />
      )}
      {inSpa && spaPanel === 'job' && (
        <SpaJobPanel
          job={spaJobNow}
          balance={state.balance}
          hour={state.time.hour}
          onHire={() => { spaHire(); setArrival('Ifeoma: “Welcome to the team. Clock in with me between 10:00 and 20:00.”'); }}
          onClockIn={() => { spaClockIn(); setSpaPanel(null); setArrival('You change into your white tunic. Clients are waiting in reception.'); }}
          onClockOut={() => { spaClockOut(); setSpaPanel(null); }}
          onClose={() => setSpaPanel(null)}
        />
      )}
      {inSpa && spaServing && (
        <SpaSession
          client={spaServing.client}
          job={spaJobNow}
          balance={state.balance}
          onFinish={(choices) => spaSession(spaServing.client.id, choices)}
          onClose={() => setSpaServing(null)}
        />
      )}
      {agencyOpen && district.agency && (
        <OgmHomesPanel
          balance={state.balance}
          homeId={state.home}
          owned={state.owned}
          onBuy={buyHome}
          onMoveIn={moveIn}
          onClose={() => setAgencyOpen(false)}
        />
      )}
      {dealershipOpen && (
        <DealershipPanel
          balance={state.balance}
          purchasePaused={!!state.summary}
          ownedVehicles={state.ownedVehicles}
          initialModelId={dealershipModelId}
          onBuy={buyVehicle}
          onPaint={paintVehicle}
          onSpawn={takeVehicleOut}
          onClose={() => setDealershipOpen(false)}
        />
      )}
      {inBoutique && section && (
        <BoutiquePanel
          section={section}
          districtId={district.id}
          wearer={{ lookId: character.lookId, heightCm: character.heightCm, shape: character.shape, skinTone: character.skinTone, skinToneId: character.skinToneId, skinColor: character.skinColor }}
          wardrobe={wardrobe}
          balance={state.balance}
          onTryOn={(slot, id) => setTryOn((t) => ({ ...t, [slot]: id }))}
          onBuyMany={buyMany}
          onWear={(item) => wear(item.slot, item.id)}
          onToggleFavourite={toggleFavourite}
          onPickColour={pickColour}
          onClose={() => { setSection(null); setTryOn({}); }}
        />
      )}
      {inBoutique && assistantOpen && (
        <AssistantPanel
          name={BOUTIQUE_STAFF.assistant.name}
          shop={district.fashionHouse.name}
          onSection={openSection}
          onFitting={() => { setAssistantOpen(false); setStore('wardrobe'); }}
          onDecor={() => { setAssistantOpen(false); setCatalogueOpen(true); }}
          onClose={() => setAssistantOpen(false)}
        />
      )}
      {inPalms && hostOpen && (
        <HostPanel
          name={PALMS_STAFF.host.name}
          open={palmsOpen(state.time.hour)}
          onTable={() => sitAtTable(hostSeat())}
          onMenu={() => { setHostOpen(false); setMenuOpen(true); }}
          onClose={() => setHostOpen(false)}
        />
      )}
      <Celebrations items={state.life.celebrations} />
      {inventoryOpen && (
        <InventoryPanel
          state={state}
          character={character}
          career={character.career}
          rankIndex={careerRank}
          onEquip={equipGear}
          onUnequip={unequipGear}
          onRepair={repairGear}
          onSell={sellGear}
          onOpenWardrobe={() => { setInventoryOpen(false); setStore('wardrobe'); }}
          onClose={() => setInventoryOpen(false)}
        />
      )}
      {divineOpen && (
        <DivinePanel
          s={state.supernatural}
          balance={state.balance}
          atHome={atHome()}
          hasHome={!!state.home}
          onUnlock={ascendUnlock}
          onTransform={transformForm}
          onReturnToHuman={returnToHuman}
          onHeal={() => sanctuaryHeal(atHome())}
          onGoHome={() => { setDivineOpen(false); onGo({ to: 'home' }); }}
          onRest={() => { setDivineOpen(false); rest(atHome()); }}
          onClose={() => setDivineOpen(false)}
        />
      )}
      {questsOpen && (
        <QuestsScreen state={state} character={character} onGo={(link) => { setQuestsOpen(false); onGo(link); }} onSetDream={setDream} onClose={() => setQuestsOpen(false)} />
      )}
      {levelUp && !state.summary && (
        <LevelUp
          level={Number(levelUp.text.match(/\d+/)?.[0] ?? state.life.level)}
          reward={levelUp.reward}
          unlocked={state.life.celebrations.filter((c) => c.t === levelUp.t && (c.kind === 'Perk unlocked' || c.kind === 'Achievement' || c.kind === 'Skill up')).map((c) => c.text)}
          onContinue={() => setLevelsShown((s) => new Set([...s, levelUp.id]))}
        />
      )}
      {phoneOpen && (
        <Phone
          state={state}
          character={character}
          district={district}
          phone={myPhone.phone}
          setPhone={myPhone.setPhone}
          battery={myPhone.battery}
          charging={phoneCharging}
          whereabouts={whereabouts}
          destinations={destinations}
          here={{ x: controller.position.x, z: controller.position.z }}
          canRide={!drivingModel && !sit.session && !state.summary}
          sound={sound}
          startApp={phoneStart}
          act={phoneActions}
          onClose={() => setPhoneOpen(false)}
        />
      )}
      {!phoneOpen && myPhone.banner && (
        <PhoneBanner n={myPhone.banner} onOpen={() => { setPhoneStart(myPhone.banner!.app); setPhoneOpen(true); myPhone.dismissBanner(); }} onDismiss={myPhone.dismissBanner} />
      )}
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
          onEditLook={() => { if (offStreet) goOutside(); onEditLook(); }}
          settings={{
            quality: qualityMode === 'auto' ? `Auto (${autoQuality})` : qualityMode, onCycleQuality: () => onQualityChange(nextQualityMode(qualityMode)), showRoute, onShowRouteChange, sound, onSoundChange,
            onRest: () => { setOsOpen(false); rest(atHome()); },
            restWhere: () => atHome() ? `In your bed at ${home!.name}.` : state.home ? 'Away from home: you\u2019ll sleep rough and wake less rested. Your bed is better.' : 'You have no home, so you\u2019ll sleep rough and wake less rested.',
            onExitToMenu,
            events: FREQUENCY_LABEL[state.world.frequency],
            onCycleEvents: () => setEventFrequency(EVENT_FREQUENCIES[(EVENT_FREQUENCIES.indexOf(state.world.frequency) + 1) % EVENT_FREQUENCIES.length]),
          }}
          onClose={() => setOsOpen(false)}
        />
      )}
      {liveEvent && !liveEvent.dismissed && !eventPanelOpen && !state.summary && (
        <div className="pointer-events-none fixed inset-x-0 top-[4.75rem] z-30 flex justify-center px-3 pointer-coarse:top-[12rem]">
          <EventAlert
            event={liveEvent}
            minutesLeft={Math.max(0, liveEvent.endsAt - state.time.totalMinutes)}
            distance={offStreet ? null : Math.hypot(controller.position.x - (eventGoal ?? liveEvent.scene).x, controller.position.z - (eventGoal ?? liveEvent.scene).z)}
            onRespond={eventRespond}
            onDismiss={eventDismiss}
          />
        </div>
      )}
      {eventPanelOpen && liveEvent && (
        <EventPanel
          event={liveEvent}
          career={character.career}
          equipment={state.equipment}
          minute={state.time.totalMinutes}
          atScene={atEventScene()}
          atTarget={atEventTarget()}
          onAct={(id) => eventAct(id, { x: controller.position.x, z: controller.position.z })}
          onClose={() => setEventPanelFor(null)}
        />
      )}
      {state.world.lastResult && !state.summary && !eventPanelOpen && <EventResult result={state.world.lastResult} onClose={eventSeen} />}
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
        busy={!!sit.session || !!drivingModel}
        onTalk={setTalking}
        workTask={taskOnOffer() ? { place: getCareerLocation(district, character.career)?.name ?? 'work', onOpen: () => setTask(taskOnOffer()) } : null}
        controller={controller}
        character={character}
        balance={state.balance}
        gameTime={state.time}
        neighborhood={areaHere}
        homeId={state.home}
        onOpenHome={setHomePanel}
        onEnterRestaurant={enterPalms}
        onEnterBar={enterCantina}
        onEnterHotel={enterHotel}
        onEnterSpa={enterSpa}
        outsideDealership={atDealershipDoor() && district.carDealership ? { name: district.carDealership.name, onOpen: enterDealership } : atAgency() && district.agency ? { name: district.agency.name, onOpen: () => setAgencyOpen(true) } : undefined}
        outsideOffice={atOfficeDoor() ? { name: OFFICE_WORKPLACE.name, onOpen: goIntoOffice } : undefined}
        outsideUniversity={atUniversityDoor() ? { name: UNIVERSITY.name, onOpen: goIntoUniversity } : undefined}
        outsideHospital={atHospitalDoor() ? { name: HOSPITAL.name, onOpen: goIntoHospital } : undefined}
        onCampus={inWorkplace && (insideUniversity || insideHospital)}
        campusStatus={{
          classesToday: campusToday.attended.length,
          classesTotal: CLASS_SLOTS.length,
          assignmentDone: campusToday.assignmentDone,
          credits: state.campus.credits,
          standing: academicStanding(state.campus),
        }}
        hospitalStatus={{
          onShift: hospitalToday.onShift,
          patientsToday: hospitalToday.patientsToday,
          patientsTarget: HOSPITAL_PATIENTS_PER_SHIFT,
          shiftsCompleted: state.hospital.shiftsCompleted,
        }}
        today={state.today}
        summaryShown={!!state.summary}
        workMinutes={state.workMinutes}
        onOpenCareer={() => toggleOs('career')}
        onExitVehicle={leaveVehicle}
        tracked={liveEvent?.responding && eventGoal
          ? { name: eventGoal === liveEvent.target ? 'Baba Femi (last seen here)' : templateFor(liveEvent.kind).title, position: [eventGoal.x, 0, eventGoal.z] }
          : trackedLocation?.position ? { name: trackedLocation.name, position: trackedLocation.position } : null}
        onStopTracking={() => (liveEvent?.responding ? eventDismiss() : setTrackedId(null))}
        eventPrompt={eventPrompt}
        level={levelProgress(totalXp(state.life.skills))}
        insideHome={inWorkplace ? { name: plate.title, prompt: workplacePrompt } : inBoutique ? { name: district.fashionHouse.name, prompt: boutiquePrompt } : inPalms ? { name: district.restaurant!.name, prompt: palmsPrompt } : inCantina && district.bar ? { name: district.bar.name, prompt: cantinaPrompt } : inHotel && district.hotel ? { name: district.hotel.name, prompt: hotelPrompt } : inSpa && district.spa ? { name: district.spa.name, prompt: spaPrompt } : indoors && interior ? {
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
        onOpenVendor={enterRestaurant}
        onOpenShop={enterBoutique}
        place={plate}
        nav={nav}
        mapPosition={doorNow ? { x: doorNow[0], z: doorNow[2] } : null}
        onOpenMoney={() => openOs('money')}
        onOpenInventory={() => setStore('wardrobe')}
        onOpenProfile={() => openOs('profile')}
        onOpenSettings={() => openOs('settings')}
        onOpenNeeds={() => openOs('today')}
      />
    </main>
  );
}
