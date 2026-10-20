import type { PlayerHandle } from '../hooks/usePlayerController';
import type { Character } from './CharacterCreation';
import type { Neighborhood } from '../lib/neighborhoods';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { formatGameTime, hungerLabel, HUNGRY_THRESHOLD, isWorkingHours, type GameTime } from '../lib/gameState';
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
import { HOURLY_WAGE } from '../lib/gameState';
import { ARRIVE_RADIUS, compass } from '../lib/locations';
import { assetUrl } from '../lib/assetManifest';
import { PhonePanel, type PhoneApp } from './PhonePanel';
import {
  Apple,
  Armchair,
  BedDouble,
  BriefcaseBusiness,
  House as HouseIcon,
  Map,
  MapPin,
  Menu,
  Music2,
  Package,
  Settings2,
  Shirt,
  ShoppingBag,
  Smartphone,
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
  onOpenWardrobe?: () => void;
  onOpenDecor?: () => void;
  onOpenRestaurantPanel?: () => void;
  /** Opens the gadget shop when standing at it. */
  onOpenGadgets?: () => void;
  /** Opens the smartphone map (only passed once you own a phone). */
  onOpenMap?: () => void;
  /** Routes to the assigned home and enters after reaching its front door. */
  onGoHome?: () => void;
  /** The ⋯ city locations directory. */
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

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Opaque enough to stay readable over a bright midday sky, without a costly backdrop blur. */
const PANEL = 'rounded-xl border border-ui-line/70 bg-ui-panel/85 shadow-[0_8px_24px_rgba(0,0,0,0.35)]';
const BUTTON =
  'pointer-events-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-ui-line bg-ui-panel/85 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ui-ink transition hover:border-ui-accent hover:text-ui-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent sm:px-3 sm:tracking-[0.14em]';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ui-muted">{label}</dt>
      <dd className="m-0 text-right text-ui-ink">{children}</dd>
    </div>
  );
}

/** "E — do something here" prompt for food vendors and shops. */
function PlacePrompt({ verb, place, onOpen, icon: Icon }: Prompt) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${PANEL} pointer-events-auto flex items-center gap-3 px-4 py-2.5 text-left text-sm sm:whitespace-nowrap hover:border-ui-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent`}
    >
      {Icon && <Icon size={17} aria-hidden="true" className="shrink-0 text-ui-accent-strong" strokeWidth={1.8} />}
      <kbd className="hidden rounded border border-ui-line bg-ui-panel px-1.5 font-mono text-xs text-ui-accent-strong sm:inline">E</kbd>
      <span>
        {verb} <span className="font-semibold">{place}</span>
      </span>
    </button>
  );
}

export function HUD({
  controller,
  character,
  balance,
  gameTime,
  neighborhood,
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
  const [showDetails, setShowDetails] = useState(false);
  // Phones start with a slim one-row panel so the street stays visible
  const [expanded, setExpanded] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const closePhone = useCallback(() => setPhoneOpen(false), []);

  const workplaceStatus = useWorkplaceStatus(character ?? null, controller, district);
  const { x: px, z: pz } = controller.position;
  const vendor = nearestVendor(district.vendors, px, pz);
  const counter = counterAt(district, px, pz);
  // One prompt at a time: a food vendor, then a shop or desk, then a front door
  const prompt = vendor && onOpenVendor
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
    : null) ?? (outsideOffice
      ? { verb: 'Enter workplace', place: outsideOffice.name, onOpen: outsideOffice.onOpen, icon: BriefcaseBusiness }
      : null);
  const placePrompt = busy ? null : insideHome ? insideHome.interactionAt(px, pz) : streetPrompt;
  const shiftHours = isWorkingHours(gameTime) && character?.career !== 'none';
  const status = !shiftHours
    ? { label: 'Off duty', dot: 'bg-ui-faint', text: 'text-ui-muted' }
    : workplaceStatus.isAtWorkplace
      ? { label: 'Working', dot: 'bg-ui-accent', text: 'text-ui-accent-strong' }
      : { label: 'Not at work', dot: 'bg-ui-warn', text: 'text-ui-warn' };

  const hungry = fullness < HUNGRY_THRESHOLD;
  const hungerBar = hungry ? 'bg-ui-danger' : fullness < 50 ? 'bg-ui-warn' : 'bg-ui-accent';

  const x = controller.position.x.toFixed(1);
  const z = controller.position.z.toFixed(1);
  const direction = (controller.direction * (180 / Math.PI)).toFixed(0);
  const speed = Math.sqrt(controller.velocity.x ** 2 + controller.velocity.z ** 2).toFixed(1);
  const homeScene = !!insideHome && !insidePlaceLabel;
  const careerAction = workTask?.onOpen ?? outsideOffice?.onOpen
    ?? (character && character.career !== 'none' ? onOpenLocations : undefined);
  const dockItems: { label: string; icon: LucideIcon; onClick?: () => void; active?: boolean }[] = [
    { label: 'Home', icon: HouseIcon, onClick: homeScene ? undefined : onGoHome, active: homeScene },
    { label: 'Phone', icon: Smartphone, onClick: onOpenMap ? () => setPhoneOpen(true) : undefined },
    { label: 'Map', icon: Map, onClick: onOpenLocations },
    { label: 'Wardrobe', icon: ShoppingBag, onClick: onOpenWardrobe },
    { label: 'Career', icon: BriefcaseBusiness, onClick: careerAction },
    { label: 'Social', icon: Users, onClick: resident && onTalk ? () => onTalk(resident) : undefined },
  ];
  if (homeScene && onOpenDecor) dockItems.splice(4, 0, { label: 'Decor', icon: Armchair, onClick: onOpenDecor });
  if (insidePlaceLabel?.startsWith('Dining') && onOpenRestaurantPanel) {
    dockItems.splice(4, 0, { label: 'Restaurant', icon: Utensils, onClick: onOpenRestaurantPanel, active: true });
  }
  const phoneApps: PhoneApp[] = [
    { label: 'Map', detail: 'Open the district map', icon: Map, onOpen: onOpenMap },
    { label: 'Places', detail: 'Browse city locations', icon: MapPin, onOpen: onOpenLocations },
    { label: 'Style', detail: 'Open wardrobe and clothing', icon: Shirt, onOpen: onOpenWardrobe },
    { label: 'Career', detail: 'Open your current work task or workplace directory', icon: BriefcaseBusiness, onOpen: careerAction },
    { label: 'Home', detail: homeId ? 'Go to your home' : 'Rent a home to enable this app', icon: HouseIcon, onOpen: onGoHome },
    { label: 'Social', detail: resident ? `Talk to ${resident.name}` : 'Find someone nearby to talk to', icon: Users, onOpen: resident && onTalk ? () => onTalk(resident) : undefined },
  ];

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
      {/* Identity, location, and account stay visible while the world remains open. */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-4">
        <div className={`${PANEL} flex min-w-0 items-center gap-2.5 px-3 py-2 sm:min-w-[10rem]`}>
          {character ? (
            <img
              src={assetUrl(`models/characters/rocketbox/thumbs/${character.lookId}.webp`)}
              alt=""
              className="size-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <img src={`${import.meta.env.BASE_URL}assets/brand/aye-mark.webp`} alt="" className="h-8 w-auto shrink-0" />
          )}
          <div className="min-w-0">
            <p className="m-0 truncate font-display text-sm font-semibold leading-tight sm:text-base">
              {character?.name ?? 'AYE'}
            </p>
            <p className="m-0 mt-0.5 whitespace-nowrap text-[10px] text-ui-muted">
              {DAY_SHORT[gameTime.dayOfWeek]} {formatGameTime(gameTime)}
            </p>
          </div>
        </div>

        {(insideHome || neighborhood) && (
          <div className={`${PANEL} absolute left-1/2 top-3 flex max-w-[min(24rem,50vw)] -translate-x-1/2 items-center gap-3 px-4 py-2 text-center`}>
            {insidePlaceLabel?.startsWith('Dining')
              ? <Utensils size={22} className="shrink-0 text-[#e3bd70]" aria-hidden="true" />
              : insidePlaceLabel?.startsWith('At work')
                ? <BriefcaseBusiness size={22} className="shrink-0 text-[#e3bd70]" aria-hidden="true" />
                : <HouseIcon size={22} className="shrink-0 text-[#e3bd70]" aria-hidden="true" />}
            <div className="min-w-0">
              <p className="m-0 truncate text-xs font-semibold uppercase tracking-[0.1em] text-white">
                {insideHome ? insideHome.name : neighborhood!.name}
              </p>
              <p className="m-0 mt-0.5 truncate text-[10px] uppercase tracking-[0.12em] text-[#e3bd70]">
                {insidePlaceLabel ?? (insideHome ? district.name : district.city.name)}
              </p>
            </div>
          </div>
        )}

        {controller.trafficWarning && (
          <p role="status" className="absolute left-1/2 top-24 m-0 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-ui-warn/50 bg-ui-panel/90 px-3 py-2 text-xs font-semibold text-ui-warn shadow-lg sm:top-20 sm:text-sm">
            <TriangleAlert size={16} aria-hidden="true" />
            Vehicle approaching — waiting for a safe gap.
          </p>
        )}

        <div className="flex flex-col items-end gap-2">
          <div className={`${PANEL} flex items-center gap-2 px-2 py-1.5`}>
            <span className="whitespace-nowrap px-1 text-xs font-semibold tabular-nums text-white">GHAI {balance.toLocaleString()}</span>
            {(insideHome ? [onRest && homeScene ? {
              label: 'Rest', icon: BedDouble, action: onRest,
            } : null] : [
              onCycleQuality ? { label: `Settings, graphics quality ${qualityLabel}`, icon: Settings2, action: onCycleQuality } : null,
              onExitToMenu ? { label: 'Main menu', icon: Menu, action: onExitToMenu } : null,
            ]).filter((item): item is { label: string; icon: LucideIcon; action: () => void } => item !== null).map(({ label, icon: Icon, action }) => (
              <button key={label} type="button" onClick={action} aria-label={label} title={label} className="pointer-events-auto grid size-8 place-items-center rounded-full border border-white/10 text-white/80 hover:border-[#d2b36f] hover:text-[#f0d797]">
                <Icon size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className={`flex flex-wrap justify-end gap-1.5 sm:gap-2 ${insideHome ? 'hidden' : ''}`}>
            {onOpenLocations && (
              <button type="button" onClick={onOpenLocations} className={BUTTON} title="City locations: restaurants, shops, homes, workplaces" aria-label="Locations">
                <MapPin size={16} aria-hidden="true" strokeWidth={1.8} />
                <span className="hidden sm:inline">Locations</span>
              </button>
            )}
            {onOpenMap && (
              <button type="button" onClick={onOpenMap} className={BUTTON} title="Open the city map on your phone (M)" aria-label="Phone map">
                <Smartphone size={15} aria-hidden="true" strokeWidth={1.8} />
                <Map size={15} aria-hidden="true" strokeWidth={1.8} />
                <span className="hidden sm:inline">Map</span>
              </button>
            )}
            {onGoHome && (
              <button type="button" onClick={onGoHome} className={BUTTON} title="Walk to your assigned home and go inside" aria-label="Go Home">
                <HouseIcon size={16} aria-hidden="true" strokeWidth={1.8} />
                <span className="hidden sm:inline">Go Home</span>
              </button>
            )}
            {onOpenWardrobe && (
              <button type="button" onClick={onOpenWardrobe} className={BUTTON} title="Change into clothes you own" aria-label="Wardrobe">
                <Shirt size={16} aria-hidden="true" strokeWidth={1.8} />
                <span className="hidden sm:inline">Wardrobe</span>
              </button>
            )}
            {onOpenDecor && (
              <button type="button" onClick={onOpenDecor} className={BUTTON} title="Preview and place furniture in this home" aria-label="Decorate home">
                <Armchair size={16} aria-hidden="true" strokeWidth={1.8} />
                <span className="hidden sm:inline">Decorate</span>
              </button>
            )}
            <button type="button" disabled className={`${BUTTON} cursor-not-allowed opacity-50`} title="Inventory is not implemented yet" aria-label="Inventory unavailable">
              <Package size={16} aria-hidden="true" strokeWidth={1.8} />
              <span className="hidden sm:inline">Inventory · soon</span>
            </button>
            {onCycleQuality && (
              <button
                type="button"
                onClick={onCycleQuality}
                title="Settings: graphics quality; Auto lowers detail if the frame rate drops"
                aria-label={`Settings, graphics quality ${qualityLabel}`}
                className={BUTTON}
              >
                <Settings2 size={16} aria-hidden="true" strokeWidth={1.8} />
                <span className="hidden sm:inline">Settings · </span>
                <span className="capitalize">{qualityLabel}</span>
              </button>
            )}
            {onRest && (
              <button type="button" onClick={onRest} className={BUTTON} title="Sleep until 07:00" aria-label="Rest">
                <BedDouble size={16} aria-hidden="true" strokeWidth={1.8} />
                <span className="hidden sm:inline">Rest</span>
              </button>
            )}
            {onExitToMenu && (
              <button type="button" onClick={onExitToMenu} className={BUTTON} title="Back to the main menu (your life is saved)" aria-label="Main menu">
                <Menu size={16} aria-hidden="true" strokeWidth={1.8} />
                <span className="hidden sm:inline">Menu</span>
              </button>
            )}
          </div>
          <p className={`m-0 rounded-md bg-ui-panel/70 px-2 py-0.5 font-mono text-[11px] text-ui-muted ${insideHome ? 'hidden' : ''}`} aria-label="Frames per second">
            {perfStats.fps} FPS
          </p>
        </div>
      </div>

      {/* City locations: the ⋯ button and the destination being tracked, under the clock on the left */}
      {onOpenLocations && (
        <div className="absolute left-3 top-[5.25rem] flex max-w-60 flex-col items-start gap-2 sm:left-5 sm:top-28">
          <button
            type="button"
            onClick={onOpenLocations}
            aria-label="City locations"
            title="City locations"
            className={`${PANEL} pointer-events-auto flex h-10 w-10 items-center justify-center text-lg font-bold leading-none tracking-widest text-ui-ink hover:border-ui-accent focus-visible:outline-2 focus-visible:outline-ui-accent`}
          >
            ⋯
          </button>
          {tracked && (
            <div role="status" className={`${PANEL} pointer-events-auto flex items-center gap-2.5 px-3 py-2 text-xs`}>
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
                  className="shrink-0 rounded px-1.5 py-0.5 text-ui-muted hover:text-ui-ink focus-visible:outline-2 focus-visible:outline-ui-accent"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Prompt when standing at a vendor or shop (desktop: bottom centre) */}
      {placePrompt && (
        <div className={`absolute left-1/2 hidden -translate-x-1/2 sm:block ${insideHome ? 'top-20' : 'bottom-24'}`}>
          <PlacePrompt {...placePrompt} />
        </div>
      )}

      {/* Player panel: the numbers that drive decisions first, profile second, telemetry on request */}
      <div className="absolute bottom-0 left-0 flex w-full flex-col gap-2 p-3 sm:w-auto sm:p-5">
        {/* Touch screens get a thumb-stick; on phones the food prompt shares its row so nothing overlaps */}
        <div className="flex items-end justify-between gap-2">
          <TouchStick />
          {placePrompt && (
            <div className="ml-auto sm:hidden">
              <PlacePrompt {...placePrompt} />
            </div>
          )}
        </div>
        <section className={`${PANEL} w-full sm:w-72 ${insideHome ? 'hidden' : ''}`} aria-label="Player status">
          {character && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-expanded={false}
              aria-label="Show player details"
              className="pointer-events-auto flex w-full items-center gap-3 px-3.5 py-2.5 text-left sm:hidden"
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} aria-hidden />
              <span className="font-display text-lg font-semibold tabular-nums leading-none">
                {balance.toLocaleString()} <span className="text-sm text-ui-muted">ⓒ</span>
              </span>
              <span className="ml-auto flex min-w-0 items-center gap-2 text-xs">
                <span className={hungry ? 'font-semibold text-ui-danger' : 'text-ui-muted'}>{hungerLabel(fullness)}</span>
                <span className="block h-1.5 w-12 overflow-hidden rounded-full bg-ui-line" aria-hidden>
                  <span className={`block h-full rounded-full ${hungerBar}`} style={{ width: `${Math.round(fullness)}%` }} />
                </span>
              </span>
              <span aria-hidden className="text-xs text-ui-faint">▴</span>
            </button>
          )}
          <div className={`${expanded ? 'block' : 'hidden'} px-4 py-3.5 sm:block`}>
            {character && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                            <p className="m-0 flex items-center gap-1.5 truncate text-sm font-semibold"><UserRound size={14} aria-hidden="true" className="shrink-0 text-ui-accent-strong" />{character.name}</p>
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

                {insideHome && (
                  <nav
                    aria-label="Quick navigation"
                    className="pointer-events-auto fixed bottom-3 left-1/2 z-30 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 overflow-x-auto rounded-2xl border border-white/10 bg-[#111418]/95 px-1.5 py-1.5 shadow-2xl backdrop-blur-sm"
                  >
                    {dockItems.map(({ label, icon: Icon, onClick, active }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={onClick}
                        disabled={!onClick}
                        aria-current={active ? 'page' : undefined}
                        aria-label={label}
                        title={label}
                        className={`flex min-w-[4.1rem] shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d2b36f] ${active ? 'bg-[#d2b36f]/15 text-[#f0d797]' : 'text-white/70 hover:bg-white/5 hover:text-white'} disabled:cursor-default disabled:opacity-90`}
                      >
                        <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                        <span className="whitespace-nowrap">{label}</span>
                      </button>
                    ))}
                  </nav>
                )}

                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="m-0 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-ui-faint"><Wallet size={13} aria-hidden="true" />Balance</p>
                    <p className="m-0 font-display text-2xl font-semibold leading-tight tabular-nums">
                      {balance.toLocaleString()} <span className="text-base text-ui-muted">ⓒ</span>
                    </p>
                  </div>
                  {character.career !== 'none' && !insideHome && (
                    <p className="m-0 text-right text-xs text-ui-muted">
                      <span className="flex items-center justify-end gap-1"><BriefcaseBusiness size={13} aria-hidden="true" />Workplace</span>
                      <span className={`block text-sm ${workplaceStatus.isAtWorkplace ? 'text-ui-accent-strong' : 'text-ui-ink'}`}>
                        {workplaceStatus.isAtWorkplace ? 'You are here' : `${workplaceStatus.distanceToWorkplace} m away`}
                      </span>
                    </p>
                  )}
                </div>

                <div className="mt-3">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-ui-muted"><Apple size={13} aria-hidden="true" />Hunger</span>
                    <span className={hungry ? 'font-semibold text-ui-danger' : 'text-ui-ink'}>{hungerLabel(fullness)}</span>
                  </div>
                  <div
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ui-line"
                    role="meter"
                    aria-label="Fullness"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(fullness)}
                  >
                    <div className={`h-full rounded-full transition-[width] duration-500 ${hungerBar}`} style={{ width: `${Math.round(fullness)}%` }} />
                  </div>
                  {hungry && <p className="m-0 mt-1.5 text-xs text-ui-danger">Hungry: pay is halved until you eat.</p>}
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              aria-expanded={showDetails}
              className="pointer-events-auto mt-3 flex w-full items-center justify-between border-t border-ui-line/70 pt-2.5 text-[11px] uppercase tracking-[0.14em] text-ui-faint hover:text-ui-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent"
            >
              <span className="flex items-center gap-1.5"><UserRound size={14} aria-hidden="true" />Profile & details</span>
              <span aria-hidden className={`transition-transform ${showDetails ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {showDetails && (
              <dl className="m-0 mt-2 space-y-1 text-xs">
                {character && (
                  <>
                    {character.career !== 'none' && (() => {
                      const left = hoursToNextLevel(character.career, workMinutes);
                      const next = careerLadder(character.career)[levelIndex(character.career, workMinutes) + 1];
                      return (
                        <>
                          <Row label="Pay">{Math.round(HOURLY_WAGE[character.career] * careerLevel(character.career, workMinutes).pay * equipmentPay(equipment, character.career))} ⓒ an hour</Row>
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
                <Row label="Period">
                  <span className="capitalize">{gameTime.period}</span>
                </Row>
                <Row label="Position">
                  <span className="font-mono text-ui-muted">
                    {x}, {z}
                  </span>
                </Row>
                <Row label="Direction">
                  <span className="font-mono text-ui-muted">{direction}°</span>
                </Row>
                <Row label="Speed">
                  <span className="font-mono text-ui-muted">{speed} m/s</span>
                </Row>
              </dl>
            )}
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="pointer-events-auto mt-3 w-full rounded-lg border border-ui-line/70 py-1.5 text-[11px] uppercase tracking-[0.14em] text-ui-muted sm:hidden"
            >
              Show less
            </button>
          </div>
        </section>
      </div>

      {/* Keyboard hint: desktop only, hidden on touch screens */}
      <div className="absolute bottom-0 right-0 hidden p-5 text-right text-[11px] uppercase tracking-[0.14em] text-ui-ink/85 [text-shadow:0_1px_4px_rgba(0,0,0,0.8)] md:block pointer-coarse:hidden">
        <p className="m-0"><span className="font-semibold">Click</span> or <span className="font-semibold">W A S D</span> move · <span className="font-semibold">Shift</span> walk</p>
        <p className="m-0 mt-1"><span className="font-semibold">Drag</span> orbit · <span className="font-semibold">Scroll</span> zoom</p>
      </div>
    </div>
  );
}
