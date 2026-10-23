import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls as OrbitControlsImpl, PerformanceMonitor } from '@react-three/drei';
import type { OrbitControls } from 'three-stdlib';
import { ACESFilmicToneMapping, Vector3, type Group } from 'three';
import { placePlayer, setMovementBlocked, setMoveTarget, usePlayerController } from './hooks/usePlayerController';
import { useCurrentNeighborhood } from './hooks/useCurrentNeighborhood';
import { useGameState } from './hooks/useGameState';
import { activeLayout, groundHeightAt, parkedObstacles, setActiveLayout } from './lib/world';
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
import { COLOUR_CHOICES, recolourable, type FashionItem, type Slot } from './lib/fashion';
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
import { barAt, counterAt, districtById, hotelAt, restaurantAt, type District, type PlaceKind } from './lib/geography';
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
} from './lib/restaurant';
import type { Seat } from './lib/seating';
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
import { ParkedCars } from './world/ParkedCars';
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
import { USE_RADIUS, bedSpot, doorSpot, interiorFor, interiorLayout, type Furniture } from './lib/interiors';
import { asFurniture, catalogueItem, nearPiece, furnitureUse } from './lib/furniture';
import type { FurnitureKind, Interior } from './lib/interiors';
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
import {
  ARRIVE_SPOT, CAMPUS_ID, HALL_SEATS, LAB_SEATS, UNIVERSITY_NAME, insideBuilding, roomAt, routeTo, spotAt, universityLayout,
  type Destination as CampusDestination,
} from './lib/university';
import { CAFETERIA_MENU, LATE_LIMIT, ROOM_NAMES, STUDY, TIMETABLE, classOpenNow, classesToday, minutesLeftInClass, rollDay, type CampusRoom } from './lib/school';
import { University } from './world/University';
import { CafeteriaPanel, ClassPanel, ClubsPanel, DirectoryPanel, RecordsPanel, type CampusPanelMode } from './components/CampusPanel';
import type { StudentHud } from './components/StudentPanels';
import { DealershipFront } from './world/DealershipFront';
import {
  DAILY_TARGET, H_ARRIVE, HOSPITAL_ID, HOSPITAL_NAME, PATIENTS, ROOM_LABEL as HOSPITAL_ROOM, hospitalLayout, hospitalRoomAt, hospitalSpotAt, insideHospital,
  patientById, rollShift, shiftHours, type HospitalRoom,
} from './lib/hospital';
import { Hospital } from './world/Hospital';
import type { ShiftHud } from './components/StudentPanels';
import { DealershipPanel } from './components/DealershipPanel';
import { carById, carToDrive, fuelCost, type OwnedCar } from './lib/cars';
import { dealershipAt } from './lib/geography';
import { isDriving, setDriving } from './hooks/usePlayerController';
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
  /** The car you're driving, if any. */
  car: OwnedCar | null;
  /** Your cars parked in this district. */
  parked: readonly OwnedCar[];
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
const HOTEL_LAYOUT_KEY = hotelLayout(true);
const BOUTIQUE_LAYOUT = boutiqueLayout();
const BOUTIQUE_ID = 'fashion-house';
const CAMPUS_LAYOUT = universityLayout();
const HOSPITAL_LAYOUT = hospitalLayout();
/** How close to a city's university marker you go in through its gate. */
const CAMPUS_DOOR_RADIUS = 3;

/** The title plate at home, by the kind of place it is. */
const MY_HOME: Record<Interior['tier'], string> = { room: 'My Room', flat: 'My Flat', apartment: 'My Apartment', penthouse: 'My Apartment' };

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
    // At the wheel: a chase camera, further back and a little higher, swinging in behind the car as it moves
    if (isDriving()) {
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

function City({ controller, character, gameTime, tryOn, homeId, district, talkingTo, car, parked }: CityProps) {
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
      <PalmsFront hour={gameTime.hour} night={night} />
      <CantinaFront hour={gameTime.hour} night={night} />
      <HotelFront night={night} />
      <DealershipFront night={night} />
      <Park />
      {character && character.career !== 'none' && <WorkplaceMarker position={getCareerLocation(district, character.career)!.position} />}
      <HomeMarkers homeId={homeId} />
      <Residents player={controller} talkingTo={talkingTo} />
      <Traffic player={controller} />
      <ParkedCars cars={parked} />
      {quality.contactShadows && <FootShadow controller={controller} />}
      <Player controller={controller} character={character} tryOn={tryOn} conversing={talkingTo !== null} car={car} />
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
  const campusRef = useRef(false);
  const hospitalRef = useRef(false);
  const onShiftRef = useRef(false);
  const { state, rest, dismissSummary, eat, purchase, moveIn, moveOut, buyEquipment, travel, socialise, nightOut, wait, workTask, buyFurniture, sellFurniture, placeFurniture, storeFurniture, operateFurniture, exercise, visit, setProfile, setDream, dismissWish, setSavingsGoal, clockIn, clockOut, seePatient, buyCar, sellCar, fuel, parkCar, bookHotel, hotelWash, startClass, leaveClass, participate, finishClass, study, handIn, campusVisit, joinClub, campusChat, freshenUp } = useGameState(
    character,
    // A student's workplace is the campus: every minute there in school hours counts (the existing hourly student rate)
    // A doctor's workplace is the hospital: paid only while clocked in there
    () => (campusRef.current ? character.career === 'student'
      : hospitalRef.current ? character.career === 'doctor' && onShiftRef.current
      : character.career !== 'none' && character.career !== 'doctor' && !!districtRef.current && !insideRef.current &&
        isAtWorkplace(districtRef.current, character.career, controller.position.x, controller.position.z)),
    () => campusRef.current,
  );
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
  const roomLayout = useMemo(() => (interior ? interiorLayout(interior, ownedPieces.map((p) => p.f)) : null), [interior, ownedPieces]);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  // Life OS: the character's dashboard; the world keeps running (and you can keep walking) while it's open
  const [osOpen, setOsOpen] = useState(false);
  const [osTab, setOsTab] = useState<OsTab>('today');

  const indoors = inside && !!home && home.district === district.id && !!roomLayout;
  const inPalms = !indoors && venue !== null && district.restaurant?.id === venue;
  const inCantina = !indoors && venue !== null && district.bar?.id === venue;
  const inHotel = !indoors && venue !== null && district.hotel?.id === venue;
  /** Whether you hold the key to a hotel room (a night booked, before check-out). */
  const hotelKey = stayIsValid(state.hotel, state.time.totalMinutes);
  const trayHere = hotelKey && roomTray && roomTray.until === state.hotel!.until ? roomTray.ids : [];
  const inBoutique = !indoors && venue === BOUTIQUE_ID;
  const inCampus = !indoors && venue === CAMPUS_ID;
  const inHospital = !indoors && venue === HOSPITAL_ID;
  /** Inside anywhere (your home or a venue): not on the street. */
  const offStreet = indoors || inPalms || inCantina || inHotel || inBoutique || inCampus || inHospital;
  // Collision and ground height follow where you are (set before this frame's movement)
  const layoutNow = indoors ? roomLayout! : inPalms ? PALMS_LAYOUT : inCantina ? CANTINA_LAYOUT : inHotel ? (hotelKey ? HOTEL_LAYOUT_KEY : HOTEL_LAYOUT) : inBoutique ? BOUTIQUE_LAYOUT : inCampus ? CAMPUS_LAYOUT : inHospital ? HOSPITAL_LAYOUT : district.layout;
  useEffect(() => { campusRef.current = inCampus; hospitalRef.current = inHospital; }, [inCampus, inHospital]);
  useEffect(() => { onShiftRef.current = rollShift(state.shift, state.time.totalMinutes).clockedIn; }, [state.shift, state.time.totalMinutes]);
  if (activeLayout() !== layoutNow) setActiveLayout(layoutNow);
  useEffect(() => {
    insideRef.current = offStreet;
  }, [offStreet]);
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
  // On campus: which room you're in, whether you're indoors (for the lighting), refreshed twice a second
  const [campusPanel, setCampusPanel] = useState<CampusPanelMode | null>(null);
  const [campusGuide, setCampusGuide] = useState<CampusDestination | null>(null);
  const [campusHere, setCampusHere] = useState<{ room: CampusRoom; indoors: boolean }>({ room: 'outside', indoors: false });
  const [hospitalHere, setHospitalHere] = useState<{ room: HospitalRoom; indoors: boolean }>({ room: 'outside', indoors: false });
  const guideRef = useRef<CampusDestination | null>(null);
  useEffect(() => { guideRef.current = campusGuide; }, [campusGuide]);
  useEffect(() => {
    if (!inCampus) return;
    const id = setInterval(() => {
      const { x, z } = controller.position;
      // The guide clears itself when you arrive
      const g = guideRef.current;
      if (g && Math.hypot(x - g.at[0], z - g.at[1]) < 2) {
        guideRef.current = null;
        setCampusGuide(null);
        setArrival(`You’ve reached ${g.name}.`);
      }
      const room = roomAt(x, z);
      const indoorsNow = insideBuilding(x, z);
      setCampusHere((h) => (h.room === room && h.indoors === indoorsNow ? h : { room, indoors: indoorsNow }));
    }, 500);
    return () => clearInterval(id);
  }, [inCampus, controller]);
  useEffect(() => {
    if (!inHospital) return;
    const id = setInterval(() => {
      const { x, z } = controller.position;
      const room = hospitalRoomAt(x, z);
      const indoorsNow = insideHospital(x, z);
      setHospitalHere((h) => (h.room === room && h.indoors === indoorsNow ? h : { room, indoors: indoorsNow }));
    }, 500);
    return () => clearInterval(id);
  }, [inHospital, controller]);
  const book = (to: District, mode: TravelMode) => {
    const option = travelOption(district.city, to.city, mode);
    if (!option || state.balance < option.fare) return;
    // Your car stays parked where you left it
    if (drivingNow) leaveCar(drivingNow);
    travel(to.id, mode);
    setDrivingCar(null);
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
    if (venue === HOSPITAL_ID) {
      const w = district.workplaces.doctor.position;
      if (state.shift.clockedIn) clockOut();
      if (sit.session) sit.cancel();
      setVenue(null);
      placePlayer(w, w[0] > 0 ? -Math.PI / 2 : Math.PI / 2);
      snapCamera();
      return;
    }
    if (venue === CAMPUS_ID) {
      const w = district.workplaces.student.position;
      if (state.school.inClass) leaveClass();
      if (sit.session) sit.cancel();
      setVenue(null);
      setCampusPanel(null);
      setCampusGuide(null);
      placePlayer(w, w[0] > 0 ? -Math.PI / 2 : Math.PI / 2);
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

  // Sitting down somewhere (park benches, the lounge terrace): see sitInPark and sitOnTerrace below
  const sit = useSitSession(controller, wait);
  // ---------------------------------------------------------------- cars
  const [dealerOpen, setDealerOpen] = useState(false);
  /** The car you're driving (one you own), or null when on foot. */
  const [driving, setDrivingCar] = useState<OwnedCar | null>(null);
  const myCar = state.cars.length ? state.cars[state.cars.length - 1] : null;
  /** Leave the car on the street where it is now, facing the way it was going. */
  const leaveCar = (car: OwnedCar) => parkCar(car.id, { districtId: district.id, x: controller.position.x, z: controller.position.z, heading: controller.direction });
  const parkAction = useRef(leaveCar);
  useEffect(() => { parkAction.current = leaveCar; });
  // Drive only on the street, in a car you still own
  const canDrive = !offStreet && !sit.session;
  const drivingNow = driving && canDrive && state.cars.some((c) => c.id === driving.id) ? driving : null;
  useEffect(() => {
    setDriving(drivingNow ? carById(drivingNow.id) ?? null : null);
    return () => setDriving(null);
  }, [drivingNow]);
  // Fuel is paid as you go, from the game's own balance
  const fuelRef = useRef({ x: 0, z: 0, metres: 0 });
  const balanceRef = useRef(state.balance);
  useEffect(() => { balanceRef.current = state.balance; }, [state.balance]);
  // useGameState's actions are new functions every render: keep the latest without restarting the meter
  const fuelAction = useRef(fuel);
  useEffect(() => { fuelAction.current = fuel; });
  useEffect(() => {
    if (!drivingNow) return;
    const car = carById(drivingNow.id);
    if (!car) return;
    fuelRef.current = { x: controller.position.x, z: controller.position.z, metres: 0 };
    const id = setInterval(() => {
      const f = fuelRef.current;
      const { x, z } = controller.position;
      const step = Math.hypot(x - f.x, z - f.z);
      f.x = x; f.z = z;
      // A jump (going through a door, travelling) isn't driving
      if (step < 30) f.metres += step;
      // Billed a whole GHAI at a time, as each one's worth of fuel is used, so no distance goes unpaid
      const perGhai = 1000 / car.fuelPerKm;
      const units = Math.floor(f.metres / perGhai);
      if (units < 1) return;
      const metres = units * perGhai;
      const cost = fuelCost(car, metres);
      if (balanceRef.current < cost) {
        parkAction.current(drivingNow);
        setDrivingCar(null);
        setArrival(`You're out of GHAI for fuel, so you've parked the ${car.name}.`);
        f.metres = 0;
        return;
      }
      fuelAction.current(car.id, metres);
      f.metres -= metres;
    }, 1000);
    return () => clearInterval(id);
  }, [drivingNow, controller]);
  // The engine, while you drive and sound is on
  useEffect(() => {
    const car = drivingNow && sound ? carById(drivingNow.id) : null;
    if (!car) return;
    const engine = startEngine();
    if (!engine) return;
    const id = setInterval(() => engine.update(Math.hypot(controller.velocity.x, controller.velocity.z), car.speed), 100);
    return () => { clearInterval(id); engine.stop(); };
  }, [drivingNow, sound, controller]);
  const toggleDrive = () => {
    if (drivingNow) {
      leaveCar(drivingNow);
      setDrivingCar(null);
      setArrival(`Parked. Your ${carById(drivingNow.id)?.name ?? 'car'} stays here until you come back for it.`);
      return;
    }
    if (!myCar || !canDrive) return;
    const car = carToDrive(state.cars, district.id, controller.position.x, controller.position.z);
    if (!car) {
      // Every car you own is parked somewhere else: say where, rather than conjure it up
      const parked = myCar.parked;
      const away = parked && districtById(parked.districtId);
      const there = !parked || !away ? 'somewhere else'
        : parked.districtId === district.id ? `${Math.round(Math.hypot(parked.x - controller.position.x, parked.z - controller.position.z))} m away in ${district.name}`
        : `in ${away.name}, ${away.city.name}`;
      setArrival(`Your ${carById(myCar.id)?.name ?? 'car'} is parked ${there}. Walk back to it to drive.`);
      return;
    }
    // Getting in: you're in the driver's seat, facing the way it's parked
    if (car.parked) {
      // Its footprint goes when you're in it (the street re-adds any other parked cars on the next render)
      parkedObstacles.length = 0;
      placePlayer([car.parked.x, 0, car.parked.z], car.parked.heading);
    }
    parkCar(car.id, null);
    setDrivingCar({ id: car.id, color: car.color });
    setArrival(`You get into your ${carById(car.id)?.name ?? 'car'}. W/S to drive and reverse, A/D to steer, Shift to crawl.`);
  };
  /** Your parked car in this district (the one you'd walk back to), for the map and the street. */
  const parkedHere = state.cars.filter((c) => c.parked?.districtId === district.id && c.id !== drivingNow?.id);
  const mapCar = parkedHere.length ? parkedHere[parkedHere.length - 1] : null;
  const atDealer = () => !offStreet && !drivingNow && !!dealershipAt(district, controller.position.x, controller.position.z);

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
  /** In through the Fashion House's front door. */
  const enterBoutique = () => {
    setHomePanel(null);
    setVenue(BOUTIQUE_ID);
    placePlayer([BOUTIQUE_DOOR[0], 0, BOUTIQUE_DOOR[1]], 0);
    snapCamera();
  };
  // ---------------------------------------------------------------- AYE Global University
  const student = character.career === 'student';
  /** At this city's university marker on the street. */
  const atCampusDoor = () => {
    const w = district.workplaces.student.position;
    return !offStreet && Math.hypot(controller.position.x - w[0], controller.position.z - w[2]) <= CAMPUS_DOOR_RADIUS;
  };
  /** Through the city's university marker to the street outside the campus gate. */
  const enterCampus = () => {
    setHomePanel(null);
    setVenue(CAMPUS_ID);
    placePlayer([ARRIVE_SPOT[0], 0, ARRIVE_SPOT[1]], 0);
    snapCamera();
    campusVisit('campus');
    setArrival(`${UNIVERSITY_NAME}. The pedestrian gates are either side of the barrier; the campus directory is by the fountain.`);
  };
  // The seat you took for a class: getting up from it (E, or walking off) leaves the class, and the class ending gets you up
  const classSeat = useRef<string | null>(null);
  const inClass = state.school.inClass;
  useEffect(() => {
    if (!classSeat.current) return;
    if (inClass && !sit.session) { classSeat.current = null; leaveClass(); return; }
    if (!inClass && sit.session && sit.session.seat.id === classSeat.current) { classSeat.current = null; sit.cancel(); }
    if (!inClass && !sit.session) classSeat.current = null;
  });
  const minuteNow = state.time.hour * 60 + state.time.minute;
  /** Take a free seat in this room and sit the class that's open now. */
  const attendClass = (room: CampusRoom) => {
    const c = classOpenNow(state.school, state.time.totalMinutes, state.time.dayOfWeek, room);
    if (!c || !student) return;
    const seats = room === 'lab' ? LAB_SEATS : HALL_SEATS;
    const seat = seats[(state.school.classesTotal * 3) % seats.length];
    if (!sit.start({ seat, place: c.course, minutes: 0 })) { setArrival('There’s no way to reach a free seat from here.'); return; }
    classSeat.current = seat.id;
    startClass(c.id, room);
  };
  const studyHere = (kind: keyof typeof STUDY) => {
    const st = STUDY[kind];
    study(kind, campusHere.room === 'corridor' ? 'outside' : roomAt(controller.position.x, controller.position.z));
    setArrival(`${st.label}: ${st.minutes} minutes pass. Your assignment moves on by ${st.progress}%.`);
  };
  /** What a class spot offers: attend, or why not, and when the next one is. */
  const classPrompt = (room: CampusRoom) => {
    const open = classOpenNow(state.school, state.time.totalMinutes, state.time.dayOfWeek, room);
    if (!student) return { verb: 'Visitors can’t attend classes ·', place: 'see Student Services', onOpen: () => setCampusPanel('records') };
    if (open) return { verb: 'Attend class:', place: `${open.course} (${String(Math.floor(open.start / 60)).padStart(2, '0')}:${String(open.start % 60).padStart(2, '0')})`, onOpen: () => attendClass(room) };
    const next = TIMETABLE.find((c) => c.room === room && c.start > minuteNow && state.time.dayOfWeek <= 4);
    return { verb: next ? `No class here now · next at ${String(Math.floor(next.start / 60)).padStart(2, '0')}:${String(next.start % 60).padStart(2, '0')}:` : 'No more classes here today ·', place: next ? next.course : 'check the timetable', onOpen: () => setCampusPanel('records') };
  };
  /** What E does where you stand on campus. */
  const campusPrompt = (): { verb: string; place: string; onOpen: () => void } | null => {
    if (state.school.inClass) return null;
    const spot = spotAt(controller.position.x, controller.position.z);
    if (!spot) return null;
    const handInReady = student && state.school.assignment >= 100;
    switch (spot.id) {
      case 'leave': return { verb: 'Leave campus for', place: district.name, onOpen: goOutside };
      case 'security': return { verb: 'Talk to', place: 'Musa, campus security', onOpen: () => setArrival('Musa (security): “Morning! Walkers use the side gates. The academic building is straight ahead past the fountain; the directory board will point you anywhere.”') };
      case 'map-outdoor':
      case 'directory': return { verb: 'Open', place: 'the campus directory', onOpen: () => setCampusPanel('directory') };
      case 'reception': return { verb: 'Ask reception about', place: 'today’s timetable', onOpen: () => setCampusPanel('records') };
      case 'study-together': return student
        ? { verb: 'Study together with', place: 'Emeka and Aisha (30 min)', onOpen: () => studyHere('together') }
        : { verb: 'Chat with', place: 'Emeka and Aisha (10 min)', onOpen: () => { campusChat('outside'); setArrival('You chat with Emeka and Aisha for ten minutes.'); } };
      case 'lecture': return classPrompt('hall-a');
      case 'lab-class': return classPrompt('lab');
      case 'lab-pc': return !student ? null : handInReady
        ? { verb: 'Hand in', place: 'your finished assignment', onOpen: () => { handIn('lab'); setArrival('Assignment handed in. +10 credits; the next one is on your record.'); } }
        : { verb: 'Work on your assignment at', place: 'a lab computer (60 min)', onOpen: () => studyHere('computer') };
      case 'library-desk': return !student ? null : handInReady
        ? { verb: 'Hand in', place: 'your finished assignment', onOpen: () => { handIn('library'); setArrival('Assignment handed in. +10 credits; the next one is on your record.'); } }
        : { verb: 'Study at', place: 'a library desk (45 min)', onOpen: () => studyHere('library') };
      case 'library-pc': return student ? { verb: 'Research on', place: 'a library computer (30 min)', onOpen: () => studyHere('research') } : null;
      case 'librarian': return { verb: 'Talk to', place: 'Mrs. Bello, the librarian', onOpen: () => setArrival('Mrs. Bello: “Desks are free in the middle; the computers by the shelves are for research. Finished work can be handed in here or at the lab.”') };
      case 'cafe': return { verb: 'Buy food at', place: 'the AYE Cafeteria', onOpen: () => setCampusPanel('cafe') };
      case 'students': return { verb: 'Chat with', place: 'classmates in the lounge (10 min)', onOpen: () => { campusChat('centre'); setArrival('You chat with Kwame and Zainab about classes and the weekend.'); } };
      case 'clubs': return { verb: 'Browse', place: 'the campus clubs', onOpen: () => setCampusPanel('clubs') };
      case 'services': return { verb: 'View your timetable & records at', place: 'Student Services', onOpen: () => setCampusPanel('records') };
      case 'restroom': return { verb: 'Freshen up in', place: 'the restrooms (5 min)', onOpen: () => { freshenUp('restrooms'); setArrival('You freshen up. Five minutes pass.'); } };
    }
  };
  // Mark the library and cafeteria as visited today when you walk in
  useEffect(() => {
    if (!inCampus) return;
    const v = rollDay(state.school, state.time.totalMinutes).visited;
    if (campusHere.room === 'library' && !v.includes('library')) campusVisit('library');
    if (campusHere.room === 'cafeteria' && !v.includes('cafeteria')) campusVisit('cafeteria');
  }, [inCampus, campusHere.room, state.school, state.time.totalMinutes, campusVisit]);
  const buyCafeteria = (id: string) => {
    const item = CAFETERIA_MENU.find((i) => i.id === id);
    if (!item || state.balance < item.price) return;
    eat(item.price, item.fullness, item.lift);
    campusVisit('cafeteria');
    setArrival(`You buy ${item.name} for ${item.price} GHAI and eat it here.`);
  };
  const guidePoints = inCampus && campusGuide ? [[controller.position.x, controller.position.z] as const, ...routeTo(controller.position.x, controller.position.z, campusGuide)] : null;
  /** What the HUD shows a student (all from the save). */
  const studentHud: StudentHud | null = (() => {
    if (!student) return null;
    const sc = rollDay(state.school, state.time.totalMinutes);
    // Next: the first class still to come that you haven't sat (not the one you're in)
    const nc = state.time.dayOfWeek <= 4 ? TIMETABLE.find((c) => c.start + LATE_LIMIT >= minuteNow && c.id !== sc.inClass?.classId && !sc.attended.includes(c.id)) ?? null : null;
    const today = classesToday(state.time.dayOfWeek);
    const slot = TIMETABLE.find((c) => c.id === sc.inClass?.classId);
    const schoolHours = state.time.dayOfWeek <= 4 && minuteNow >= 9 * 60 && minuteNow < 17 * 60;
    const status = slot ? { status: `In class · ${slot.course}`, tone: 'good' as const }
      : inCampus ? { status: schoolHours ? 'On campus' : 'On campus (outside school hours)', tone: 'good' as const }
        : { status: schoolHours ? 'Not on campus' : 'Off campus', tone: (schoolHours ? 'warn' : 'muted') as 'warn' | 'muted' };
    const hh = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const goals = today === 0 ? [] : [
      { label: 'Go to school (University)', done: sc.visited.includes('campus') },
      { label: `Attend classes (${sc.attended.length}/${today})`, done: sc.attended.length >= today },
      { label: 'Work on your assignment', done: sc.studiedToday > 0 },
      { label: 'Visit the library', done: sc.visited.includes('library') },
      { label: 'Eat at the cafeteria', done: sc.visited.includes('cafeteria') },
      { label: 'Meet other students', done: sc.visited.includes('students') },
      { label: 'Return home', done: sc.visited.includes('campus') && indoors && minuteNow >= 15 * 60 },
    ];
    return {
      university: UNIVERSITY_NAME,
      title: careerLevel('student', state.workMinutes).title,
      ...status,
      next: nc ? `${nc.course}, ${hh(nc.start)}` : null,
      allowance: hourlyPay,
      attended: sc.attended.length,
      classesToday: today,
      assignment: sc.assignment,
      credits: sc.credits,
      room: inCampus ? ROOM_NAMES[campusHere.room] : null,
      goals,
    };
  })();
  // ---------------------------------------------------------------- AYE General Hospital
  const doctor = character.career === 'doctor';
  const shiftNow = rollShift(state.shift, state.time.totalMinutes);
  const atHospitalDoor = () => {
    const w = district.workplaces.doctor.position;
    return !offStreet && Math.hypot(controller.position.x - w[0], controller.position.z - w[2]) <= CAMPUS_DOOR_RADIUS;
  };
  const enterHospital = () => {
    setHomePanel(null);
    setVenue(HOSPITAL_ID);
    placePlayer([H_ARRIVE[0], 0, H_ARRIVE[1]], 0);
    snapCamera();
    setArrival(doctor
      ? `${HOSPITAL_NAME}. Clock in with Dr. Bello in the staff room (S1) to start your shift.`
      : `${HOSPITAL_NAME}. Reception is straight ahead.`);
  };
  const hospitalPrompt = (): { verb: string; place: string; onOpen: () => void } | null => {
    const spot = hospitalSpotAt(controller.position.x, controller.position.z);
    if (!spot) return null;
    switch (spot.id) {
      case 'leave': return { verb: 'Leave the hospital for', place: district.name, onOpen: goOutside };
      case 'reception': return { verb: 'Talk to', place: 'Adaeze at reception', onOpen: () => setArrival(doctor
        ? 'Adaeze: “Morning, doctor! The board in the ward shows who is waiting. Dr. Bello is in the staff room.”'
        : 'Adaeze: “Welcome to AYE General. The wards are for patients and staff; you can wait here.”') };
      case 'supervisor':
        if (!doctor) return { verb: 'Staff only:', place: 'Dr. Bello’s office', onOpen: () => setArrival('Dr. Bello: “This office is for hospital staff, I’m afraid.”') };
        if (shiftNow.clockedIn) return { verb: 'Clock out with', place: `Dr. Bello (${shiftNow.seen.length}/${DAILY_TARGET} patients today)`, onOpen: () => { clockOut(); setArrival(`You clock out. ${shiftNow.seen.length} patient${shiftNow.seen.length === 1 ? '' : 's'} seen today.`); } };
        if (!shiftHours(state.time.totalMinutes)) return { verb: 'Shifts run 09:00–17:00 ·', place: 'come back then', onOpen: () => setArrival('Dr. Bello: “Day shifts start at nine. Get some rest.”') };
        return { verb: 'Clock in with', place: `Dr. Bello (target: ${DAILY_TARGET} patients)`, onOpen: () => { clockIn(); setArrival(`You’re on shift. Today’s target: ${DAILY_TARGET} patients. Pay is your hourly rate for time on shift.`); } };
      case 'patient': {
        const p = patientById(spot.patientId);
        if (!p) return null;
        if (!doctor) return { verb: 'Patient:', place: `${p.name} is waiting for a doctor`, onOpen: () => {} };
        if (shiftNow.seen.includes(p.id)) return { verb: 'Already seen today:', place: p.name, onOpen: () => {} };
        if (!shiftNow.clockedIn) return { verb: 'Clock in first to see', place: p.name, onOpen: () => setArrival('Clock in with Dr. Bello in the staff room first.') };
        return { verb: `See ${p.name} (${p.minutes} min):`, place: p.complaint, onOpen: () => { seePatient(p.id); setArrival(`You see ${p.name}: ${p.complaint.toLowerCase()}. ${p.minutes} minutes on shift pass.`); } };
      }
      default: return null;
    }
  };
  const shiftHud: ShiftHud | null = (() => {
    if (!doctor) return null;
    const hours = state.time.dayOfWeek <= 6 && shiftHours(state.time.totalMinutes);
    return {
      place: HOSPITAL_NAME,
      title: careerLevel('doctor', state.workMinutes).title,
      status: shiftNow.clockedIn ? (inHospital ? 'On shift' : 'On shift (left the building)') : hours ? 'Off shift' : 'Shift hours are 09:00–17:00',
      tone: shiftNow.clockedIn ? 'good' : hours ? 'warn' : 'muted',
      pay: hourlyPay,
      seen: shiftNow.seen.length,
      target: DAILY_TARGET,
      waiting: PATIENTS.length - shiftNow.seen.length,
      earnedToday: state.today.income,
      room: inHospital ? HOSPITAL_ROOM[hospitalHere.room] : null,
      goals: [
        { label: 'Go to the hospital', done: inHospital || shiftNow.clockedIn || shiftNow.seen.length > 0 },
        { label: 'Clock in with the supervisor', done: shiftNow.clockedIn || shiftNow.seen.length > 0 },
        { label: `See patients (${Math.min(shiftNow.seen.length, DAILY_TARGET)}/${DAILY_TARGET})`, done: shiftNow.seen.length >= DAILY_TARGET },
        { label: 'Clock out', done: !shiftNow.clockedIn && shiftNow.seen.length > 0 },
      ],
    };
  })();
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
    if (!fresh.length || state.balance < total) return;
    purchase(total);
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

  // E opens the food vendor or the boutique you're standing at
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'e' || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // E on a seat gets you up; on the way to one it does nothing
      if (sit.session) {
        if (sit.session.phase === 'seated') sit.cancel();
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
      if (inBoutique) {
        boutiquePrompt()?.onOpen();
        return;
      }
      if (inCampus) {
        campusPrompt()?.onOpen();
        return;
      }
      if (inHospital) {
        hospitalPrompt()?.onOpen();
        return;
      }
      if (indoors && interior) {
        if (nearSpot(bedSpot(interior))) rest(true);
        else if (usableHere()) operateHere();
        else if (nearSpot(doorSpot(interior))) goOutside();
        return;
      }
      if (drivingNow) return;
      const { x, z } = controller.position;
      const near = nearestVendor(district.vendors, x, z);
      const counter = counterAt(district, x, z);
      const door = homeAtDoor(district.id, x, z);
      if (near) setVendor(near);
      else if (atCampusDoor()) enterCampus();
      else if (atHospitalDoor()) enterHospital();
      else if (atDealer()) setDealerOpen(true);
      else if (restaurantAt(district, x, z)) enterPalms();
      else if (barAt(district, x, z)) enterCantina();
      else if (hotelAt(district, x, z)) enterHotel();
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
    setMovementBlocked(vendor !== null || store !== null || homePanel !== null || gadgets || travelOpen || talking !== null || task !== null || locationsOpen || nightOpen || parkOpen || catalogueOpen || hostOpen || assistantOpen || campusPanel !== null || dealerOpen);
    return () => setMovementBlocked(false);
  }, [vendor, store, homePanel, gadgets, travelOpen, talking, task, locationsOpen, nightOpen, parkOpen, catalogueOpen, hostOpen, assistantOpen, campusPanel, dealerOpen]);

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
  const doorNow = inHospital ? district.workplaces.doctor.position : inCampus ? district.workplaces.student.position : inBoutique ? district.fashionHouse.position : inPalms && district.restaurant ? district.restaurant.door : inCantina && district.bar ? district.bar.door : inHotel && district.hotel ? district.hotel.door : indoors && home ? home.door : null;
  const areaHere = doorNow
    ? district.neighborhoods.find((n) => doorNow[0] >= n.bounds.minX && doorNow[0] <= n.bounds.maxX && doorNow[2] >= n.bounds.minZ && doorNow[2] <= n.bounds.maxZ) ?? null
    : neighborhood;
  const areaName = areaHere?.name ?? district.name;
  // Title plate: the building you're in, the place you're standing at, or the area
  const plate: PlacePlate = (() => {
    if (inPalms && district.restaurant) return { title: district.restaurant.name, subtitle: district.restaurant.kind, icon: 'restaurant' };
    if (inCantina && district.bar) return { title: district.bar.name, subtitle: district.bar.kind, icon: 'restaurant' };
    if (inHotel && district.hotel) return { title: district.hotel.name, subtitle: hotelKey ? `Room ${GUEST_ROOM} is yours until 12:00` : 'Reception', icon: 'home' };
    if (inBoutique) return { title: district.fashionHouse.name, subtitle: district.fashionHouse.kind, icon: 'hanger' };
    if (inCampus) return { title: UNIVERSITY_NAME, subtitle: ROOM_NAMES[campusHere.room], icon: 'career' };
    if (inHospital) return { title: HOSPITAL_NAME, subtitle: HOSPITAL_ROOM[hospitalHere.room], icon: 'career' };
    if (indoors && home) return { title: home.id === state.home && interior ? MY_HOME[interior.tier] : home.name, subtitle: areaName, icon: 'home' };
    const { x, z } = controller.position;
    const at = district.places.find((p) => Math.hypot(p.position[0] - x, p.position[2] - z) < PLATE_RADIUS);
    if (at && district.restaurant && at.position === district.restaurant.door) return { title: at.name, subtitle: district.restaurant.kind, icon: 'restaurant' };
    if (at && district.bar && at.position === district.bar.door) return { title: at.name, subtitle: district.bar.kind, icon: 'restaurant' };
    if (at && district.hotel && at.position === district.hotel.door) return { title: at.name, subtitle: district.hotel.kind, icon: 'home' };
    if (at) return { title: at.name, subtitle: PLATE_SUBTITLE[at.kind], icon: PLATE_ICON[at.kind] };
    return { title: areaName, subtitle: district.city.name, icon: 'palm' };
  })();
  const toggleOs = (tab: OsTab) => { if (osOpen && osTab === tab) setOsOpen(false); else openOs(tab); };
  const nav: NavItem[] = inBoutique ? [
    { id: 'clothes', label: 'Clothes', icon: 'shirt', onClick: () => openSection('clothes'), active: section === 'clothes' },
    { id: 'shoes', label: 'Shoes', icon: 'shoe', onClick: () => openSection('shoes'), active: section === 'shoes' },
    { id: 'hair', label: 'Hair', icon: 'hair', onClick: () => openSection('hair'), active: section === 'hair' },
    { id: 'accessories', label: 'Accessories', icon: 'bag', onClick: () => openSection('accessories'), active: section === 'accessories' },
    { id: 'decor', label: 'Decor', icon: 'decor', onClick: () => { setSection(null); setStore(null); setCatalogueOpen((o) => !o); }, active: catalogueOpen, title: 'Home Decor: furniture delivered to your home' },
    { id: 'fitting', label: 'Fitting Room', icon: 'hanger', onClick: () => { setSection(null); setCatalogueOpen(false); setStore((s) => (s === 'wardrobe' ? null : 'wardrobe')); }, active: store === 'wardrobe', title: 'Change into clothes you own' },
  ] : [
    indoors
      ? { id: 'home', label: 'Decor', icon: 'decor', onClick: () => setCatalogueOpen(true), active: catalogueOpen, title: 'Buy, place and arrange furniture' }
      : { id: 'home', label: 'Home', icon: 'home', onClick: () => onGo(state.home ? { to: 'home' } : { to: 'homes' }), title: state.home ? 'Walk home' : 'Find a home to rent' },
    { id: 'phone', label: 'Phone', icon: 'phone', onClick: () => toggleOs('today'), active: osOpen && osTab === 'today', title: 'Your Life OS: needs, goals and today (L)' },
    {
      id: 'map', label: inCampus ? 'Directory' : 'Map', icon: 'map', active: mapOpen || locationsOpen || campusPanel === 'directory',
      title: inCampus ? 'The campus directory: every room, with a route' : phone ? 'The map on your phone (M)' : 'Every place in the city',
      onClick: () => {
        if (inCampus) setCampusPanel((m) => (m === 'directory' ? null : 'directory'));
        else if (phone) setMapOpen(true);
        else if (offStreet) { goOutside(); setTimeout(() => setLocationsOpen(true), 150); }
        else setLocationsOpen(true);
      },
    },
    myCar && !offStreet
      ? { id: 'drive', label: drivingNow ? 'Park' : 'Drive', icon: 'car', onClick: toggleDrive, active: !!drivingNow, title: drivingNow ? 'Park and walk' : `Drive your ${carById(myCar.id)?.name ?? 'car'} (fuel is paid as you go)` }
      : { id: 'inventory', label: 'Inventory', icon: 'bag', onClick: () => setStore('wardrobe'), active: store === 'wardrobe', title: 'Change into clothes you own' },
    inPalms || inCantina
      ? { id: 'restaurant', label: inCantina ? 'Menu' : 'Restaurant', icon: 'restaurant', onClick: () => setMenuOpen((o) => !o), active: menuOpen, title: 'The menu' }
      : inCampus
        ? { id: 'career', label: 'School', icon: 'career', onClick: () => setCampusPanel((m) => (m === 'records' ? null : 'records')), active: campusPanel === 'records', title: 'Timetable and your academic record' }
        : { id: 'career', label: 'Career', icon: 'career', onClick: () => toggleOs('career'), active: osOpen && osTab === 'career', title: 'Your job, pay and promotions' },
    { id: 'social', label: 'Social', icon: 'social', onClick: () => toggleOs('people'), active: osOpen && osTab === 'people', title: 'The people you know' },
  ];
  const whereabouts = {
    place: inHospital ? `${HOSPITAL_NAME}, ${district.city.name}` : inCampus ? `${UNIVERSITY_NAME}, ${district.city.name}` : inBoutique ? `${district.fashionHouse.name}, ${district.city.name}` : inPalms && district.restaurant ? `${district.restaurant.name}, ${district.city.name}` : inCantina && district.bar ? `${district.bar.name}, ${district.city.name}` : inHotel && district.hotel ? `${district.hotel.name}, ${district.city.name}` : indoors && home ? `At home, ${home.name}` : `${neighborhood?.name ?? district.name}, ${district.city.name}`,
    activity: inHospital ? (shiftNow.clockedIn ? 'On shift' : 'At the hospital') : drivingNow ? `Driving the ${carById(drivingNow.id)?.name ?? 'car'}` : inCampus ? (state.school.inClass ? 'In class' : 'At university') : inBoutique ? 'Shopping' : inPalms ? (tableSeat ? 'Dining out' : 'At the restaurant') : inCantina ? (cantinaSeat ? 'Out at the bar' : `At ${CANTINA_NAME}`) : inHotel ? (hotelKey ? 'Staying at the hotel' : 'At the hotel') : sit.session ? `Sitting at ${sit.session.place}` : indoors ? 'At home'
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
          onPickColour={pickColour}
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
      {locationsOpen && !offStreet && (
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
          car={mapCar?.parked ? { name: carById(mapCar.id)?.name ?? 'car', ...mapCar.parked } : null}
          onGo={(p) => {
            if (drivingNow) return 'park the car first';
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
                <InteriorLighting gameTime={state.time} player={controller} indoor={interior.tier === 'penthouse' || interior.tier === 'apartment' ? 'home' : undefined} />
                <Player controller={controller} character={character} tryOn={tryOn} />
              </HomeInterior>
            ) : inBoutique ? (
              <BoutiqueInterior gameTime={state.time} districtId={district.id}>
                <InteriorLighting gameTime={state.time} player={controller} indoor="boutique" />
                <Player controller={controller} character={character} tryOn={tryOn} />
              </BoutiqueInterior>
            ) : inHospital ? (
              <Hospital player={controller} seen={shiftNow.seen}>
                <InteriorLighting gameTime={state.time} player={controller} indoor={hospitalHere.indoors ? 'campus' : undefined} />
                <Player controller={controller} character={character} tryOn={tryOn} />
              </Hospital>
            ) : inCampus ? (
              <University player={controller} gameTime={state.time} route={guidePoints}>
                <InteriorLighting gameTime={state.time} player={controller} indoor={campusHere.indoors ? 'campus' : undefined} />
                <Player controller={controller} character={character} tryOn={tryOn} />
              </University>
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
              <City key={district.id} controller={controller} character={character} gameTime={state.time} tryOn={tryOn} homeId={state.home} district={district} talkingTo={talking?.id ?? null} car={drivingNow} parked={parkedHere} />
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
      {dealerOpen && district.dealership && (
        <DealershipPanel
          name={district.dealership.name}
          balance={state.balance}
          owned={state.cars}
          onBuy={(id, color) => buyCar(id, color)}
          onSell={(id) => { if (drivingNow?.id === id) setDrivingCar(null); sellCar(id); }}
          onClose={() => setDealerOpen(false)}
        />
      )}
      {inCampus && campusPanel === 'directory' && (
        <DirectoryPanel onClose={() => setCampusPanel(null)} onGuide={(d) => { setCampusPanel(null); setCampusGuide(d); setArrival(`Follow the gold arrows to ${d.name}.`); }} />
      )}
      {inCampus && campusPanel === 'records' && (
        <RecordsPanel school={rollDay(state.school, state.time.totalMinutes)} student={student} minute={minuteNow} dayOfWeek={state.time.dayOfWeek} levelTitle={careerLevel('student', state.workMinutes).title} hourlyPay={Math.round(HOURLY_WAGE.student * careerLevel('student', state.workMinutes).pay * equipmentPay(state.equipment, 'student'))} onClose={() => setCampusPanel(null)} />
      )}
      {inCampus && campusPanel === 'cafe' && <CafeteriaPanel balance={state.balance} onBuy={buyCafeteria} onClose={() => setCampusPanel(null)} />}
      {inCampus && campusPanel === 'clubs' && <ClubsPanel joined={state.school.clubs} student={student} onJoin={(id) => { joinClub(id); setArrival('You joined the club. It’s on your student record.'); }} onClose={() => setCampusPanel(null)} />}
      {state.school.inClass && (
        <ClassPanel
          school={state.school}
          minutesLeft={minutesLeftInClass(state.school, state.time.totalMinutes)}
          onNotes={() => participate('notes')}
          onAsk={() => participate('asked')}
          onFinish={() => finishClass()}
          onLeave={() => { if (sit.session) sit.cancel(); else leaveClass(); }}
        />
      )}
      {inBoutique && section && (
        <BoutiquePanel
          section={section}
          districtId={district.id}
          wearer={{ lookId: character.lookId, heightCm: character.heightCm, shape: character.shape, skinTone: character.skinTone }}
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
        busy={!!sit.session || !!drivingNow}
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
        dealerEntry={atDealer() && district.dealership ? { name: district.dealership.name, onOpen: () => setDealerOpen(true) } : null}
        campusEntry={atCampusDoor() ? { name: `${UNIVERSITY_NAME} (${district.workplaces.student.name})`, onOpen: enterCampus } : atHospitalDoor() ? { name: HOSPITAL_NAME, onOpen: enterHospital } : null}
        statusOverride={student && (inCampus || state.school.inClass) ? { label: state.school.inClass ? 'In class' : 'On campus', tone: 'good' } : doctor ? (shiftNow.clockedIn ? { label: 'On shift', tone: 'good' } : shiftHours(state.time.totalMinutes) ? { label: 'Off shift', tone: 'warn' } : null) : null}
        student={studentHud}
        shift={shiftHud}
        insideHome={inHospital ? { name: HOSPITAL_NAME, prompt: hospitalPrompt } : inCampus ? { name: UNIVERSITY_NAME, prompt: campusPrompt } : inBoutique ? { name: district.fashionHouse.name, prompt: boutiquePrompt } : inPalms ? { name: district.restaurant!.name, prompt: palmsPrompt } : inCantina && district.bar ? { name: district.bar.name, prompt: cantinaPrompt } : inHotel && district.hotel ? { name: district.hotel.name, prompt: hotelPrompt } : indoors && interior ? {
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
