import type { PlayerHandle } from '../hooks/usePlayerController';
import type { Character } from './CharacterCreation';
import type { Neighborhood } from '../lib/neighborhoods';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { formatGameTime, hungerLabel, HUNGRY_THRESHOLD, isWorkingHours, type DayLedger, type GameTime } from '../lib/gameState';
import { DIETS, nearestVendor, type FoodVendor } from '../lib/food';
import { useWorkplaceStatus } from '../hooks/useWorkplaceStatus';
import { perfStats } from '../world/quality';
import { TouchStick } from './TouchStick';
import { genderLabel, heritageLabel } from '../lib/identity';
import { formatHome } from '../lib/places';
import { homeAtDoor, homeById, type Home } from '../lib/homes';
import { equipmentPay } from '../lib/equipment';
import { counterAt, type District } from '../lib/geography';
import { venueAt } from '../lib/nightlife';
import { parkAt } from '../lib/parks';
import { residentNear, type Resident } from '../lib/people';
import { careerLadder, careerLevel, hoursToNextLevel, levelIndex } from '../lib/progression';
import { HOURLY_WAGE, WORK_END_HOUR, WORK_START_HOUR } from '../lib/gameState';
import { ARRIVE_RADIUS, compass } from '../lib/locations';
import { CAREER_LABEL } from '../lib/labels';
import { dailyGoals, formatGameDate, goalDay, parseFlags, updateFlags, type GoalFlags } from '../lib/dailyGoals';
import { assetUrl } from '../lib/assetManifest';
import { PhonePanel, type PhoneApp } from './PhonePanel';
import { Minimap } from './Minimap';
import {
  Apple,
  Armchair,
  BedDouble,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  CarFront,
  GraduationCap,
  Check,
  ChevronDown,
  ChevronRight,
  House as HouseIcon,
  Contact,
  Landmark,
  Map,
  MapPin,
  Menu,
  MessageCircle,
  Moon,
  Music2,
  Package,
  Settings2,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sun,
  TreePine,
  Utensils,
  UserRound,
  Wallet,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react';

interface HUDProps {
  controller: PlayerHandle;
  character?: Character;
  balance: number;
  gameTime: GameTime;
  neighborhood?: Neighborhood | null;
  /** Today's money and purchases, which drive the daily goals. */
  today?: DayLedger;
  /** The end-of-day summary is showing: the player has rested. */
  summaryShown?: boolean;
  /** Back to the entry screen (nothing is lost; the game saves as you play). */
  onExitToMenu?: () => void;
  onRest?: () => void;
  qualityLabel?: string;
  onCycleQuality?: () => void;
  fullness: number;
  onOpenVendor?: (vendor: FoodVendor) => void;
  onOpenShop?: () => void;
  /** The district the player is in: its counters, homes and workplaces. */
  district: District;
  onOpenTravel?: () => void;
  /** Opens the district's lounge (lib/nightlife.ts). */
  onOpenNightlife?: () => void;
  /** Opens the park bench (lib/parks.ts). */
  onOpenPark?: () => void;
  /** Sitting down or on the way to a seat: no place prompts. */
  busy?: boolean;
  onTalk?: (resident: Resident) => void;
  /** This hour's task at your workplace, if one is on offer. */
  workTask?: { place: string; onOpen: () => void } | null;
  /** Set while inside your home: replaces the street prompts. */
  insideHome?: {
    name: string;
    interactionAt: (x: number, z: number) => Prompt | null;
  };
  insidePlaceLabel?: string;
  outsideOffice?: { name: string; onOpen: () => void };
  outsideUniversity?: { name: string; onOpen: () => void };
  outsideHospital?: { name: string; onOpen: () => void };
  hospitalStatus?: { onShift: boolean; patientsToday: number; patientsTarget: number; shiftsCompleted: number };
  onCampus?: boolean;
  campusStatus?: { classesToday: number; classesTotal: number; assignmentDone: boolean; credits: number; standing: string };
  outsideDealership?: { name: string; onOpen: () => void };
  onExitVehicle?: () => void;
  onOpenWardrobe?: () => void;
  onOpenDecor?: () => void;
  onOpenRestaurantPanel?: () => void;
  /** Opens the gadget shop when standing at it. */
  onOpenGadgets?: () => void;
  /** Opens the smartphone map (only passed once you own a phone). */
  onOpenMap?: () => void;
  /** Routes to the assigned home and enters after reaching its front door. */
  onGoHome?: () => void;
  /** The city locations directory. */
  onOpenLocations?: () => void;
  /** The rented home, if any (lib/homes.ts). */
  homeId?: string | null;
  onOpenHome?: (home: Home) => void;
  /** Experience in the current career, in worked minutes (lib/progression.ts). */
  workMinutes?: number;
  /** Owned equipment (work kits raise pay). */
  equipment?: readonly string[];
  /** The destination being tracked, in district metres. */
  tracked?: { name: string; position: readonly [number, number, number] } | null;
  onStopTracking?: () => void;
}

type Prompt = { verb: string; place: string; onOpen: () => void; icon?: LucideIcon };

const EMPTY_LEDGER: DayLedger = { income: 0, expenses: 0, minutesWorked: 0 };

const PANEL = 'rounded-2xl border border-white/10 bg-[#0c0e11]/80 shadow-[0_8px_28px_rgba(0,0,0,0.45)]';
const GOLD = 'text-[#e3bd70]';
const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3bd70]';
const ICON_BUTTON = `pointer-events-auto grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#0c0e11]/80 text-white/85 shadow-[0_8px_28px_rgba(0,0,0,0.45)] transition hover:border-[#e3bd70]/70 hover:text-[#f0d797] disabled:cursor-not-allowed disabled:opacity-45 sm:size-12 ${FOCUS}`;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ui-muted">{label}</dt>
      <dd className="m-0 text-right text-ui-ink">{children}</dd>
    </div>
  );
}

/** "E — do something here" prompt for food vendors, shops and home fixtures. */
function PlacePrompt({ verb, place, onOpen, icon: Icon }: Prompt) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${PANEL} pointer-events-auto flex items-center gap-3 px-4 py-2.5 text-left text-sm sm:whitespace-nowrap hover:border-[#e3bd70]/70 ${FOCUS}`}
    >
      {Icon && <Icon size={17} aria-hidden="true" className={`shrink-0 ${GOLD}`} strokeWidth={1.8} />}
      <kbd className={`hidden rounded border border-white/20 bg-black/40 px-1.5 font-mono text-xs sm:inline ${GOLD}`}>E</kbd>
      <span>
        {verb} <span className="font-semibold">{place}</span>
      </span>
    </button>
  );
}

function GoalsPanel({ goals }: { goals: ReturnType<typeof dailyGoals> }) {
  const [open, setOpen] = useState(true);
  const firstOpen = goals.find((goal) => !goal.done)?.id;
  return (
    <section className={`${PANEL} pointer-events-auto w-60 p-3`} aria-label="Today's goals">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between text-left text-sm font-semibold text-white ${FOCUS}`}
      >
        Today&apos;s Goals
        <ChevronDown size={16} aria-hidden="true" className={`text-white/60 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <ul className="m-0 mt-2 list-none space-y-1 p-0">
          {goals.map((goal) => (
            <li
              key={goal.id}
              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] ${goal.id === firstOpen ? 'bg-white/10 text-white' : goal.done ? 'text-white/55' : 'text-white/75'}`}
            >
              <span
                className={`grid size-4 shrink-0 place-items-center rounded-full border ${goal.done ? 'border-[#e3bd70] bg-[#e3bd70]/20 text-[#f0d797]' : 'border-white/30'}`}
                aria-hidden="true"
              >
                {goal.done && <Check size={11} strokeWidth={3} />}
              </span>
              <span className={goal.done ? 'line-through decoration-white/30' : ''}>{goal.label}</span>
              <span className="sr-only">{goal.done ? 'completed' : 'not completed'}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function HUD({
  controller,
  character,
  balance,
  gameTime,
  neighborhood,
  today = EMPTY_LEDGER,
  summaryShown = false,
  onExitToMenu,
  onRest,
  qualityLabel,
  onCycleQuality,
  fullness,
  onOpenVendor,
  onOpenShop,
  district,
  onOpenTravel,
  onOpenNightlife,
  onOpenPark,
  busy = false,
  onTalk,
  workTask,
  insideHome,
  insidePlaceLabel,
  outsideOffice,
  outsideUniversity,
  outsideHospital,
  hospitalStatus,
  onCampus,
  campusStatus,
  outsideDealership,
  onExitVehicle,
  onOpenWardrobe,
  onOpenDecor,
  onOpenRestaurantPanel,
  onOpenGadgets,
  onOpenMap,
  onGoHome,
  onOpenLocations,
  homeId = null,
  onOpenHome,
  workMinutes = 0,
  equipment = [],
  tracked = null,
  onStopTracking,
}: HUDProps) {
  // The controller is mutated every frame; refresh the readout ~10 times a second
  const [, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((n) => n + 1), 100);
    return () => clearInterval(id);
  }, []);
  const [panel, setPanel] = useState<'profile' | 'settings' | null>(null);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const closePhone = useCallback(() => setPhoneOpen(false), []);
  const togglePanel = (next: 'profile' | 'settings') => setPanel((current) => (current === next ? null : next));

  const workplaceStatus = useWorkplaceStatus(character ?? null, controller, district);
  const { x: px, z: pz } = controller.position;
  const vendor = nearestVendor(district.vendors, px, pz);
  const counter = counterAt(district, px, pz);
  // One prompt at a time: a food vendor, then a shop or desk, then a front door
  const prompt = outsideDealership
    ? { verb: 'Enter dealership', place: outsideDealership.name, onOpen: outsideDealership.onOpen, icon: CarFront }
    : vendor && onOpenVendor
    ? { verb: 'Enter', place: vendor.name, onOpen: () => onOpenVendor(vendor), icon: Utensils }
    : counter === 'fashion' && onOpenShop
      ? { verb: 'Shop at', place: district.fashionHouse.name, onOpen: onOpenShop, icon: ShoppingBag }
      : counter === 'gadgets' && onOpenGadgets
        ? { verb: 'Shop at', place: district.gadgetHub.name, onOpen: onOpenGadgets, icon: Smartphone }
        : counter === 'travel' && onOpenTravel
          ? { verb: 'Book travel at', place: district.travelDesk.name, onOpen: onOpenTravel, icon: MapPin }
          : venueAt(district.nightlife, px, pz) && onOpenNightlife
            ? { verb: 'Go out at', place: district.nightlife.name, onOpen: onOpenNightlife, icon: Music2 }
            : parkAt(district.park, px, pz) && onOpenPark
              ? { verb: 'Sit on a bench in', place: district.park.name, onOpen: onOpenPark, icon: TreePine }
              : null;
  const resident = !prompt && !insideHome && onTalk ? residentNear(district.id, px, pz) : undefined;
  const door = !prompt && !resident && onOpenHome ? homeAtDoor(district.id, px, pz) : undefined;
  const streetPrompt = prompt ?? (resident && onTalk
    ? { verb: 'Talk to', place: resident.name, onOpen: () => onTalk(resident), icon: UserRound }
    : null) ?? (workTask ? { verb: 'Take on a task at', place: workTask.place, onOpen: workTask.onOpen, icon: BriefcaseBusiness } : null) ?? (door && onOpenHome
    ? { verb: door.id === homeId ? 'Go into your home at' : `To let: ${door.kind} at`, place: door.building, onOpen: () => onOpenHome(door), icon: HouseIcon }
    : null) ?? (outsideUniversity
      ? { verb: 'Enter campus at', place: outsideUniversity.name, onOpen: outsideUniversity.onOpen, icon: GraduationCap }
      : null) ?? (outsideHospital
      ? { verb: 'Enter hospital at', place: outsideHospital.name, onOpen: outsideHospital.onOpen, icon: BriefcaseBusiness }
      : null) ?? (outsideOffice
      ? { verb: 'Enter workplace', place: outsideOffice.name, onOpen: outsideOffice.onOpen, icon: BriefcaseBusiness }
      : null);
  const placePrompt = controller.drivingVehicleId ? null : busy ? null : insideHome ? insideHome.interactionAt(px, pz) : streetPrompt;
  const hasCareer = !!character && character.career !== 'none';
  const shiftHours = isWorkingHours(gameTime) && hasCareer;
  const status = !shiftHours
    ? { label: 'Off duty', dot: 'bg-ui-faint', text: 'text-ui-muted' }
    : workplaceStatus.isAtWorkplace || onCampus
      ? { label: 'Working', dot: 'bg-[#e3bd70]', text: GOLD }
      : { label: 'Not at work', dot: 'bg-ui-warn', text: 'text-ui-warn' };

  const hungry = fullness < HUNGRY_THRESHOLD;
  const hungerBar = hungry ? 'bg-ui-danger' : fullness < 50 ? 'bg-ui-warn' : 'bg-[#e3bd70]';

  const x = controller.position.x.toFixed(1);
  const z = controller.position.z.toFixed(1);
  const direction = (controller.direction * (180 / Math.PI)).toFixed(0);
  const speed = Math.sqrt(controller.velocity.x ** 2 + controller.velocity.z ** 2).toFixed(1);
  const homeScene = !!insideHome && !insidePlaceLabel;
  const careerAction = workTask?.onOpen ?? outsideUniversity?.onOpen ?? outsideHospital?.onOpen ?? outsideOffice?.onOpen
    ?? (hasCareer ? onOpenLocations : undefined);
  const level = hasCareer && character ? levelIndex(character.career, workMinutes) + 1 : 1;

  // Daily goals: derived from the ledger plus the few actions the ledger does not record
  const outfitSignature = JSON.stringify(character?.wardrobe?.equipped ?? {});
  const goalKey = `aye.dailyGoals.v1.${character?.name ?? 'guest'}`;
  const [goalFlags, setGoalFlags] = useState<GoalFlags | null>(() => {
    try { return parseFlags(window.localStorage.getItem(goalKey)); } catch { return null; }
  });
  const inDowntown = !insideHome && neighborhood?.id === 'downtown';
  const nextFlags = updateFlags(goalFlags, goalDay(gameTime), outfitSignature, inDowntown);
  if (nextFlags !== goalFlags) setGoalFlags(nextFlags);
  useEffect(() => {
    try { if (goalFlags) window.localStorage.setItem(goalKey, JSON.stringify(goalFlags)); } catch { /* storage unavailable */ }
  }, [goalFlags, goalKey]);
  const goals = dailyGoals(nextFlags, today, today.minutesWorked > 0, summaryShown);

  const phoneEnabled = !!onOpenMap;
  const phoneTitle = phoneEnabled ? 'Phone' : 'Buy a phone at the gadget hub to unlock it';
  const dockItems: { label: string; icon: LucideIcon; onClick?: () => void; active?: boolean; title?: string }[] = [
    { label: 'Home', icon: HouseIcon, onClick: homeScene ? undefined : onGoHome, active: homeScene, title: homeScene ? 'You are home' : homeId ? 'Walk home' : 'Rent a home to enable this' },
    { label: 'Phone', icon: Smartphone, onClick: phoneEnabled ? () => setPhoneOpen(true) : undefined, title: phoneTitle },
    { label: 'Map', icon: Map, onClick: onOpenLocations, title: onOpenLocations ? 'City locations' : 'Go outside to use the city map' },
    { label: 'Inventory', icon: Package, title: 'Inventory is not implemented yet' },
    { label: 'Fashion', icon: Shirt, onClick: onOpenWardrobe, title: 'Wardrobe and clothing' },
    { label: 'Social', icon: Users, onClick: resident && onTalk ? () => onTalk(resident) : undefined, title: resident ? `Talk to ${resident.name}` : 'Stand near someone to talk' },
  ];
  if (homeScene && onOpenDecor) dockItems.splice(5, 0, { label: 'Decor', icon: Armchair, onClick: onOpenDecor, title: 'Decorate this home' });
  if (insidePlaceLabel?.startsWith('Dining') && onOpenRestaurantPanel) {
    dockItems.splice(5, 0, { label: 'Restaurant', icon: Utensils, onClick: onOpenRestaurantPanel, active: true });
  }
  const phoneApps: PhoneApp[] = [
    { label: 'Messages', detail: 'Messaging is not implemented yet', icon: MessageCircle },
    { label: 'Map', detail: 'Open the district map', icon: Map, onOpen: onOpenMap },
    { label: 'Jobs', detail: 'Open your current work task or workplace directory', icon: BriefcaseBusiness, onOpen: careerAction },
    { label: 'Fashion', detail: 'Open wardrobe and clothing', icon: Shirt, onOpen: onOpenWardrobe },
    { label: 'Shop', detail: 'Browse shops and restaurants in the city directory', icon: ShoppingBag, onOpen: onOpenLocations },
    { label: 'Bank', detail: 'Banking is not implemented yet', icon: Landmark },
    { label: 'Social', detail: resident ? `Talk to ${resident.name}` : 'Find someone nearby to talk to', icon: Users, onOpen: resident && onTalk ? () => onTalk(resident) : undefined },
    { label: 'Camera', detail: 'The camera is not implemented yet', icon: Camera },
    { label: 'Settings', detail: 'Cycle graphics quality', icon: Settings2, onOpen: onCycleQuality },
    { label: 'Calendar', detail: 'Calendar is not implemented yet', icon: CalendarDays },
    { label: 'Contacts', detail: 'Contacts are not implemented yet', icon: Contact },
    { label: 'Real Estate', detail: 'Homes to let are listed in the city directory', icon: HouseIcon, onOpen: onOpenLocations },
  ];

  const isNight = gameTime.period === 'night' || gameTime.period === 'evening';
  const PeriodIcon = isNight ? Moon : Sun;
  const locationName = insideHome ? insideHome.name : neighborhood?.name;
  const locationSub = insidePlaceLabel ?? (insideHome ? district.name : district.city.name);

  return (
    <div className="pointer-events-none fixed inset-0 select-none font-sans text-ui-ink">
      {phoneOpen && (
        <PhonePanel
          characterName={character?.name ?? 'AYE'}
          balance={balance}
          gameTime={gameTime}
          apps={phoneApps}
          onClose={closePhone}
        />
      )}

      {/* Top row: identity on the left, clock in the centre, account and menus on the right */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 sm:p-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <img src={assetUrl('brand/aye-mark.webp')} alt="AYE" className="hidden h-12 w-auto shrink-0 object-contain drop-shadow-lg sm:block" />
          <button
            type="button"
            onClick={() => togglePanel('profile')}
            aria-expanded={panel === 'profile'}
            aria-label="Player profile"
            className={`${PANEL} pointer-events-auto flex min-w-0 items-center gap-2.5 py-1.5 pl-1.5 pr-4 text-left ${FOCUS}`}
          >
            {character ? (
              <img
                src={assetUrl(`models/characters/rocketbox/thumbs/${character.lookId}.webp`)}
                alt=""
                className="size-10 shrink-0 rounded-full border border-[#e3bd70]/50 object-cover object-top sm:size-11"
              />
            ) : (
              <UserRound size={22} aria-hidden="true" className="m-2 shrink-0 text-white/70" />
            )}
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-semibold leading-tight sm:text-base">{character?.name ?? 'AYE'}</span>
              <span className="mt-0.5 flex items-center gap-2 text-[11px] text-white/65">
                <span className="whitespace-nowrap">Level {level}</span>
                <span className="whitespace-nowrap md:hidden">{formatGameTime(gameTime)}</span>
                <span
                  className="block h-1 w-10 overflow-hidden rounded-full bg-white/15"
                  role="meter"
                  aria-label="Fullness"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(fullness)}
                >
                  <span className={`block h-full rounded-full ${hungerBar}`} style={{ width: `${Math.round(fullness)}%` }} />
                </span>
              </span>
            </span>
          </button>
        </div>

        <div className={`${PANEL} absolute left-1/2 top-3 hidden -translate-x-1/2 items-center gap-4 px-5 py-2 md:flex sm:top-4`} aria-label="Date and time">
          <CalendarDays size={22} aria-hidden="true" className="text-white/70" />
          <div className="leading-tight">
            <p className="m-0 text-[11px] text-white/65">{formatGameDate(gameTime)}</p>
            <p className="m-0 font-display text-xl font-semibold tabular-nums">{formatGameTime(gameTime)}</p>
          </div>
          <span aria-hidden="true" className="h-8 w-px bg-white/15" />
          <div className="flex items-center gap-2">
            <PeriodIcon size={20} aria-hidden="true" className={GOLD} />
            <span className="text-sm capitalize text-white/85">{gameTime.period}</span>
          </div>
        </div>

        <div className="flex items-start gap-1.5 sm:gap-2">
          <p className={`${PANEL} m-0 hidden h-11 items-center gap-2 px-4 text-sm font-semibold tabular-nums sm:flex sm:h-12`} aria-label="Balance">
            <span className="grid size-5 place-items-center rounded-full bg-[#e3bd70] text-[10px] font-black text-black" aria-hidden="true">G</span>
            <span className="text-white/70">GHAI</span>
            <span className="text-white">{balance.toLocaleString()}</span>
          </p>
          <button type="button" className={ICON_BUTTON} disabled={!phoneEnabled} onClick={() => setPhoneOpen(true)} aria-label="Phone" title={phoneTitle}>
            <Smartphone size={20} aria-hidden="true" strokeWidth={1.8} />
          </button>
          <button type="button" className={ICON_BUTTON} disabled aria-label="Bag (coming soon)" title="Inventory is not implemented yet">
            <ShoppingBag size={20} aria-hidden="true" strokeWidth={1.8} />
          </button>
          <button type="button" className={ICON_BUTTON} onClick={() => togglePanel('profile')} aria-expanded={panel === 'profile'} aria-label="Profile" title="Profile and details">
            <UserRound size={20} aria-hidden="true" strokeWidth={1.8} />
          </button>
          <button type="button" className={ICON_BUTTON} onClick={() => togglePanel('settings')} aria-expanded={panel === 'settings'} aria-label="Settings" title="Settings">
            <Settings2 size={20} aria-hidden="true" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {controller.trafficWarning && (
        <p role="status" className="absolute left-1/2 top-24 m-0 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-ui-warn/50 bg-ui-panel/90 px-3 py-2 text-xs font-semibold text-ui-warn shadow-lg sm:top-24 sm:text-sm">
          <TriangleAlert size={16} aria-hidden="true" />
          Vehicle approaching — waiting for a safe gap.
        </p>
      )}

      {/* Left column: daily goals and the destination being tracked */}
      <div className="absolute left-3 top-[4.75rem] flex max-w-60 flex-col items-start gap-2 sm:left-4 sm:top-24">
        <div className="hidden sm:block">
          <GoalsPanel goals={goals} />
        </div>
        {tracked && (
          <div role="status" className={`${PANEL} pointer-events-auto flex items-center gap-2.5 px-3 py-2 text-xs`}>
            <MapPin size={15} aria-hidden="true" className={`shrink-0 ${GOLD}`} />
            <div className="min-w-0">
              <p className="m-0 truncate font-semibold">{tracked.name}</p>
              <p className="m-0 tabular-nums text-ui-muted">
                {(() => {
                  const d = Math.hypot(tracked.position[0] - px, tracked.position[2] - pz);
                  return d < ARRIVE_RADIUS ? "You're here" : `${Math.round(d)} m ${compass(tracked.position[0] - px, tracked.position[2] - pz)}`;
                })()}
              </p>
            </div>
            {onStopTracking && (
              <button
                type="button"
                onClick={onStopTracking}
                aria-label="Stop tracking"
                className={`shrink-0 rounded px-1.5 py-0.5 text-ui-muted hover:text-ui-ink ${FOCUS}`}
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right column: active career */}
      <section className={`${PANEL} absolute right-4 top-[6.25rem] hidden w-64 lg:block`} aria-label="Active career">
        <p className="m-0 px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
          {character?.career === 'student' ? 'Active Status' : 'Active Career'}
        </p>
        {(() => {
          const body = (
            <>
              <span className={`grid size-11 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 ${GOLD}`}>
                <BriefcaseBusiness size={22} aria-hidden="true" strokeWidth={1.7} />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold text-white">
                  {hasCareer && character ? CAREER_LABEL[character.career] : 'No career yet'}
                </span>
                <span className={`flex items-center gap-1.5 text-xs ${hasCareer ? status.text : 'text-white/60'}`}>
                  {hasCareer && <span className={`size-1.5 rounded-full ${status.dot}`} aria-hidden="true" />}
                  {hasCareer && character ? `${status.label} · ${careerLevel(character.career, workMinutes).title}` : 'Choose one in your profile'}
                </span>
              </span>
              <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-white/60" />
            </>
          );
          return careerAction ? (
            <button type="button" onClick={careerAction} title="Career details" className={`pointer-events-auto flex w-full items-center gap-3 px-4 pb-3 pt-2 ${FOCUS}`}>
              {body}
            </button>
          ) : (
            <div className="flex w-full items-center gap-3 px-4 pb-3 pt-2">{body}</div>
          );
        })()}
        {hasCareer && character && (
          <dl className="m-0 space-y-2 border-t border-white/10 px-4 pb-3 pt-2.5 text-xs">
            <div className="flex justify-between gap-2"><dt className="text-white/55">Shift</dt><dd className="m-0 tabular-nums text-white">{String(WORK_START_HOUR).padStart(2, '0')}:00 – {String(WORK_END_HOUR).padStart(2, '0')}:00</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-white/55">{character.career === 'student' ? 'Allowance' : 'Income rate'}</dt><dd className={`m-0 tabular-nums ${GOLD}`}>GHAI {HOURLY_WAGE[character.career]} / game hour</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-white/55">Today's earnings</dt><dd className={`m-0 tabular-nums ${GOLD}`}>GHAI {today.income.toLocaleString()}</dd></div>
            <div>
              <div className="flex justify-between gap-2"><dt className="text-white/55">{character.career === 'student' ? 'Time in class' : 'Time on shift'}</dt><dd className="m-0 tabular-nums text-white">{Math.floor(today.minutesWorked / 60)}h {today.minutesWorked % 60}m / {WORK_END_HOUR - WORK_START_HOUR}h</dd></div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={(WORK_END_HOUR - WORK_START_HOUR) * 60} aria-valuenow={Math.min(today.minutesWorked, (WORK_END_HOUR - WORK_START_HOUR) * 60)} aria-label="Shift progress">
                <div className="h-full rounded-full bg-[#e3bd70]" style={{ width: `${Math.min(100, (today.minutesWorked / ((WORK_END_HOUR - WORK_START_HOUR) * 60)) * 100)}%` }} />
              </div>
            </div>
            {campusStatus && character.career === 'student' && (
              <>
                <div className="flex justify-between gap-2"><dt className="text-white/55">Classes today</dt><dd className="m-0 tabular-nums text-white">{campusStatus.classesToday} / {campusStatus.classesTotal}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-white/55">Assignment</dt><dd className="m-0 text-white">{campusStatus.assignmentDone ? 'Submitted' : 'Due today'}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-white/55">Credits · standing</dt><dd className="m-0 text-white">{campusStatus.credits} · {campusStatus.standing}</dd></div>
              </>
            )}
            {hospitalStatus && character.career === 'doctor' && (
              <>
                <div className="flex justify-between gap-2"><dt className="text-white/55">Shift</dt><dd className="m-0 text-white">{hospitalStatus.onShift ? 'Clocked in' : 'Clocked out'}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-white/55">Patients today</dt><dd className="m-0 tabular-nums text-white">{hospitalStatus.patientsToday} / {hospitalStatus.patientsTarget}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-white/55">Shifts completed</dt><dd className="m-0 tabular-nums text-white">{hospitalStatus.shiftsCompleted}</dd></div>
              </>
            )}
          </dl>
        )}
      </section>

      {/* Profile and settings drop-downs */}
      {panel === 'profile' && (
        <section className={`${PANEL} pointer-events-auto absolute right-3 top-[4.75rem] z-20 max-h-[calc(100dvh-10rem)] w-[min(20rem,calc(100vw-1.5rem))] overflow-y-auto px-4 py-3.5 sm:right-4 sm:top-[5.5rem]`} aria-label="Player status">
          {character && (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 flex items-center gap-1.5 truncate text-sm font-semibold"><UserRound size={14} aria-hidden="true" className={`shrink-0 ${GOLD}`} />{character.name}</p>
                  <p className="m-0 mt-0.5 flex items-center gap-1.5 truncate text-xs text-ui-muted">
                    <BriefcaseBusiness size={13} aria-hidden="true" className="shrink-0" />
                    {careerLevel(character.career, workMinutes).title} · <span className="capitalize">{character.lifestyle.replace('-', ' ')}</span>
                  </p>
                </div>
                <span className={`flex shrink-0 items-center gap-1.5 text-xs font-medium ${status.text}`}>
                  <span className={`h-2 w-2 rounded-full ${status.dot}`} aria-hidden />
                  {status.label}
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="m-0 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-ui-faint"><Wallet size={13} aria-hidden="true" />Balance</p>
                  <p className="m-0 font-display text-2xl font-semibold leading-tight tabular-nums">
                    {balance.toLocaleString()} <span className="text-base text-ui-muted">GHAI</span>
                  </p>
                </div>
                {hasCareer && !insideHome && (
                  <p className="m-0 text-right text-xs text-ui-muted">
                    <span className="flex items-center justify-end gap-1"><BriefcaseBusiness size={13} aria-hidden="true" />Workplace</span>
                    <span className={`block text-sm ${workplaceStatus.isAtWorkplace || onCampus ? GOLD : 'text-ui-ink'}`}>
                      {workplaceStatus.isAtWorkplace || onCampus ? 'You are here' : `${workplaceStatus.distanceToWorkplace} m away`}
                    </span>
                  </p>
                )}
              </div>
              <div className="mt-3">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-ui-muted"><Apple size={13} aria-hidden="true" />Hunger</span>
                  <span className={hungry ? 'font-semibold text-ui-danger' : 'text-ui-ink'}>{hungerLabel(fullness)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ui-line">
                  <div className={`h-full rounded-full transition-[width] duration-500 ${hungerBar}`} style={{ width: `${Math.round(fullness)}%` }} />
                </div>
                {hungry && <p className="m-0 mt-1.5 text-xs text-ui-danger">Hungry: pay is halved until you eat.</p>}
              </div>
            </>
          )}
          <dl className="m-0 mt-3 space-y-1 border-t border-white/10 pt-3 text-xs">
            {character && (
              <>
                {character.career !== 'none' && (() => {
                  const left = hoursToNextLevel(character.career, workMinutes);
                  const next = careerLadder(character.career)[levelIndex(character.career, workMinutes) + 1];
                  return (
                    <>
                      <Row label="Pay">{Math.round(HOURLY_WAGE[character.career] * careerLevel(character.career, workMinutes).pay * equipmentPay(equipment, character.career))} GHAI an hour</Row>
                      <Row label="Next promotion">{left === null || !next ? 'Top of the ladder' : `${next.title} in ${left}h of work`}</Row>
                    </>
                  );
                })()}
                <Row label="Lives in">{homeById(homeId)?.name ?? 'No home (sleeping rough)'}</Row>
                <Row label="From">{formatHome(character.country, character.region)}</Row>
                <Row label="Gender">{genderLabel(character.gender)}</Row>
                <Row label="Heritage">{[heritageLabel(character.heritage), character.ethnicGroup].filter(Boolean).join(' · ')}</Row>
                <Row label="Diet">{DIETS.find((d) => d.id === character.diet)?.label}</Row>
              </>
            )}
            <Row label="Period"><span className="capitalize">{gameTime.period}</span></Row>
            <Row label="Position"><span className="font-mono text-ui-muted">{x}, {z}</span></Row>
            <Row label="Direction"><span className="font-mono text-ui-muted">{direction}°</span></Row>
            <Row label="Speed"><span className="font-mono text-ui-muted">{speed} m/s</span></Row>
          </dl>
        </section>
      )}
      {panel === 'settings' && (
        <section className={`${PANEL} pointer-events-auto absolute right-3 top-[4.75rem] z-20 w-[min(17rem,calc(100vw-1.5rem))] space-y-2 p-3 sm:right-4 sm:top-[5.5rem]`} aria-label="Settings">
          {onCycleQuality && (
            <button type="button" onClick={onCycleQuality} className={`flex w-full items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5 text-left text-sm hover:border-[#e3bd70]/60 ${FOCUS}`} aria-label={`Graphics quality ${qualityLabel}`} title="Auto lowers detail if the frame rate drops">
              <Settings2 size={17} aria-hidden="true" className={GOLD} />
              <span className="flex-1">Graphics quality</span>
              <span className="capitalize text-white/70">{qualityLabel}</span>
            </button>
          )}
          {onRest && (!insideHome || homeScene) && (
            <button type="button" onClick={() => { onRest(); setPanel(null); }} className={`flex w-full items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5 text-left text-sm hover:border-[#e3bd70]/60 ${FOCUS}`} title="Sleep until 07:00">
              <BedDouble size={17} aria-hidden="true" className={GOLD} />
              <span className="flex-1">Rest until morning</span>
            </button>
          )}
          {onExitToMenu && (
            <button type="button" onClick={onExitToMenu} className={`flex w-full items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5 text-left text-sm hover:border-[#e3bd70]/60 ${FOCUS}`} title="Back to the main menu (your life is saved)">
              <Menu size={17} aria-hidden="true" className={GOLD} />
              <span className="flex-1">Main menu</span>
            </button>
          )}
          <p className="m-0 px-1 font-mono text-[11px] text-ui-muted" aria-label="Frames per second">{perfStats.fps} FPS</p>
        </section>
      )}

      {/* Prompt when standing at a vendor, shop or home fixture (desktop: above the navigation bar) */}
      {placePrompt && (
        <div className="absolute bottom-24 left-1/2 hidden -translate-x-1/2 sm:block">
          <PlacePrompt {...placePrompt} />
        </div>
      )}
      {controller.drivingVehicleId && (
        <div className="fixed left-1/2 top-24 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-[#e3bd70]/50 bg-ui-panel/90 px-3 py-2 text-xs text-ui-ink shadow-lg">
          <span className="flex items-center gap-2 font-semibold"><CarFront size={16} className={GOLD} />Driving · {Math.round(Math.abs(controller.vehicleSpeed) * 3.6)} km/h</span>
          <span className="hidden text-ui-muted sm:inline">W/S drive · A/D steer · E exit</span>
        </div>
      )}
      {controller.drivingVehicleId && onExitVehicle && (
        <button type="button" onClick={onExitVehicle} className={`fixed bottom-28 right-4 z-40 rounded-lg border border-[#e3bd70]/70 bg-ui-panel/90 px-4 py-3 text-xs font-bold uppercase tracking-wider ${GOLD} shadow-lg transition hover:bg-[#e3bd70]/10 sm:bottom-28 sm:right-6 ${FOCUS}`}>
          Exit car
        </button>
      )}

      {/* Bottom left: thumb-stick on touch screens, minimap and neighbourhood */}
      <div className="absolute bottom-[4.9rem] left-0 flex flex-col items-start gap-2 p-3 sm:p-4 lg:bottom-0">
        <div className="flex items-end justify-between gap-2">
          <TouchStick />
        </div>
        {placePrompt && (
          <div className="sm:hidden">
            <PlacePrompt {...placePrompt} />
          </div>
        )}
        {!insideHome && (
          <div className="hidden size-36 overflow-hidden rounded-full border-2 border-white/25 bg-[#1b2128] shadow-[0_8px_28px_rgba(0,0,0,0.55)] md:block lg:size-44">
            <Minimap district={district} controller={controller} tracked={tracked} />
          </div>
        )}
        {locationName && (
          <div className={`${PANEL} flex max-w-[16rem] items-center gap-2.5 px-3.5 py-2`}>
            {insidePlaceLabel?.startsWith('Dining')
              ? <Utensils size={18} className={`shrink-0 ${GOLD}`} aria-hidden="true" />
              : insidePlaceLabel?.startsWith('At work')
                ? <BriefcaseBusiness size={18} className={`shrink-0 ${GOLD}`} aria-hidden="true" />
                : insideHome ? <HouseIcon size={18} className={`shrink-0 ${GOLD}`} aria-hidden="true" /> : <MapPin size={18} className={`shrink-0 ${GOLD}`} aria-hidden="true" />}
            <div className="min-w-0">
              <p className="m-0 truncate text-sm font-semibold text-white">{locationName}</p>
              <p className="m-0 truncate text-[10px] uppercase tracking-[0.12em] text-white/55">{locationSub}</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation: the same destinations in every scene, state is never reset */}
      <nav
        aria-label="Quick navigation"
        className={`${PANEL} pointer-events-auto fixed bottom-3 left-1/2 z-30 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 gap-1 overflow-x-auto p-1.5 sm:bottom-4`}
      >
        {dockItems.map(({ label, icon: Icon, onClick, active, title }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            disabled={!onClick}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
            title={title ?? label}
            className={`flex min-w-[3.9rem] shrink-0 flex-col items-center gap-1 rounded-xl border px-3 py-2 text-[11px] transition sm:min-w-[4.6rem] ${FOCUS} ${active ? 'border-[#e3bd70]/80 bg-[#e3bd70]/15 text-[#f0d797]' : 'border-transparent text-white/75 hover:bg-white/5 hover:text-white'} disabled:cursor-default ${active ? '' : 'disabled:opacity-45'}`}
          >
            <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
            <span className="whitespace-nowrap">{label}</span>
          </button>
        ))}
      </nav>

      {/* Keyboard hint: desktop only, hidden on touch screens */}
      <div className="absolute bottom-0 right-0 hidden p-5 text-right text-[11px] uppercase tracking-[0.14em] text-ui-ink/85 [text-shadow:0_1px_4px_rgba(0,0,0,0.8)] xl:block pointer-coarse:hidden">
        <p className="m-0"><span className="font-semibold">Click</span> or <span className="font-semibold">W A S D</span> move · <span className="font-semibold">Shift</span> walk</p>
        <p className="m-0 mt-1"><span className="font-semibold">Drag</span> orbit · <span className="font-semibold">Scroll</span> zoom</p>
      </div>
    </div>
  );
}
