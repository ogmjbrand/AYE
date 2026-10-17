import type { PlayerHandle } from '../hooks/usePlayerController';
import type { Character } from './CharacterCreation';
import type { Neighborhood } from '../lib/neighborhoods';
import { useEffect, useState, type ReactNode } from 'react';
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
  insideHome?: { name: string; prompt: { verb: string; place: string; onOpen: () => void } | null };
  onOpenWardrobe?: () => void;
  /** Opens the gadget shop when standing at it. */
  onOpenGadgets?: () => void;
  /** Opens the smartphone map (only passed once you own a phone). */
  onOpenMap?: () => void;
  /** The ⋯ city locations directory. */
  onOpenLocations?: () => void;
  /** The rented home, if any (lib/homes.ts). */
  homeId?: string | null;
  onOpenHome?: (home: Home) => void;
  /** Experience in the current career, in worked minutes (lib/progression.ts). */
  workMinutes?: number;
  /** Owned equipment (work kits raise pay). */
  equipment?: readonly string[];
}

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Opaque enough to stay readable over a bright midday sky, without a costly backdrop blur. */
const PANEL = 'rounded-xl border border-ui-line/70 bg-ui-panel/85 shadow-[0_8px_24px_rgba(0,0,0,0.35)]';
const BUTTON =
  'pointer-events-auto rounded-lg border border-ui-line bg-ui-panel/85 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] sm:px-3 sm:tracking-[0.14em] text-ui-ink transition hover:border-ui-accent hover:text-ui-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ui-muted">{label}</dt>
      <dd className="m-0 text-right text-ui-ink">{children}</dd>
    </div>
  );
}

/** "E — do something here" prompt for food vendors and shops. */
function PlacePrompt({ verb, place, onOpen }: { verb: string; place: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${PANEL} pointer-events-auto flex items-center gap-3 px-4 py-2.5 text-left text-sm sm:whitespace-nowrap hover:border-ui-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent`}
    >
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
  onOpenWardrobe,
  onOpenGadgets,
  onOpenMap,
  onOpenLocations,
  homeId = null,
  onOpenHome,
  workMinutes = 0,
  equipment = [],
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

  const workplaceStatus = useWorkplaceStatus(character ?? null, controller, district);
  const { x: px, z: pz } = controller.position;
  const vendor = nearestVendor(district.vendors, px, pz);
  const counter = counterAt(district, px, pz);
  // One prompt at a time: a food vendor, then a shop or desk, then a front door
  const prompt = vendor && onOpenVendor
    ? { verb: 'Order food at', place: vendor.name, onOpen: () => onOpenVendor(vendor) }
    : counter === 'fashion' && onOpenShop
      ? { verb: 'Shop at', place: district.fashionHouse.name, onOpen: onOpenShop }
      : counter === 'gadgets' && onOpenGadgets
        ? { verb: 'Shop at', place: district.gadgetHub.name, onOpen: onOpenGadgets }
        : counter === 'travel' && onOpenTravel
          ? { verb: 'Book travel at', place: district.travelDesk.name, onOpen: onOpenTravel }
          : venueAt(district.nightlife, px, pz) && onOpenNightlife
            ? { verb: 'Go out at', place: district.nightlife.name, onOpen: onOpenNightlife }
            : parkAt(district.park, px, pz) && onOpenPark
              ? { verb: 'Sit on a bench in', place: district.park.name, onOpen: onOpenPark }
              : null;
  const resident = !prompt && onTalk ? residentNear(district.id, px, pz) : undefined;
  const door = !prompt && !resident && onOpenHome ? homeAtDoor(district.id, px, pz) : undefined;
  const streetPrompt = prompt ?? (resident && onTalk
    ? { verb: 'Talk to', place: resident.name, onOpen: () => onTalk(resident) }
    : null) ?? (workTask ? { verb: 'Take on a task at', place: workTask.place, onOpen: workTask.onOpen } : null) ?? (door && onOpenHome
    ? { verb: door.id === homeId ? 'Go into your home at' : `To let: ${door.kind} at`, place: door.building, onOpen: () => onOpenHome(door) }
    : null);
  const placePrompt = busy ? null : insideHome ? insideHome.prompt : streetPrompt;
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

  return (
    <div className="pointer-events-none fixed inset-0 select-none font-sans text-ui-ink">
      {/* Top bar: identity and clock on the left, system actions on the right */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-5">
        <div className={`${PANEL} flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3`}>
          <h1 className="m-0 shrink-0">
            <img
              src={`${import.meta.env.BASE_URL}assets/brand/aye-mark.webp`}
              alt="AYE"
              className="h-8 w-auto sm:h-11"
            />
          </h1>
          <div className="min-w-0">
            <p className="m-0 font-display text-xl font-semibold leading-none tabular-nums sm:text-2xl">
              {formatGameTime(gameTime)}
            </p>
            <p className="m-0 mt-1 whitespace-nowrap text-[11px] uppercase tracking-[0.06em] text-ui-muted sm:tracking-[0.14em]">
              {DAY_SHORT[gameTime.dayOfWeek]} · <span className="capitalize">{gameTime.period}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-1.5 sm:gap-2">
            {onOpenLocations && (
              <button type="button" onClick={onOpenLocations} className={BUTTON} title="City locations: restaurants, shops, homes, workplaces" aria-label="City locations">
                <span aria-hidden="true" className="text-base leading-none">⋯</span>
              </button>
            )}
            {onOpenMap && (
              <button type="button" onClick={onOpenMap} className={BUTTON} title="Open the map on your phone (M)">
                Map
              </button>
            )}
            {onOpenWardrobe && (
              <button type="button" onClick={onOpenWardrobe} className={BUTTON} title="Change into clothes you own">
                Wardrobe
              </button>
            )}
            {onRest && (
              <button type="button" onClick={onRest} className={BUTTON} title="Sleep until 07:00">
                Rest
              </button>
            )}
            {onCycleQuality && (
              <button
                type="button"
                onClick={onCycleQuality}
                title="Graphics quality: Auto lowers detail if the frame rate drops"
                className={BUTTON}
              >
                <span className="hidden sm:inline">Quality: </span>
                <span className="capitalize">{qualityLabel}</span>
              </button>
            )}
            {onExitToMenu && (
              <button type="button" onClick={onExitToMenu} className={BUTTON} title="Back to the main menu (your life is saved)">
                Menu
              </button>
            )}
          </div>
          <p className="m-0 rounded-md bg-ui-panel/70 px-2 py-0.5 font-mono text-[11px] text-ui-muted" aria-label="Frames per second">
            {perfStats.fps} FPS
          </p>
        </div>
      </div>

      {/* Where you are: under the top bar, centred */}
      {(insideHome || neighborhood) && (
        <div className="absolute left-1/2 top-[5.25rem] -translate-x-1/2 text-center sm:top-6">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.22em] text-ui-ink [text-shadow:0_1px_6px_rgba(0,0,0,0.8)]">
            {insideHome ? `At home · ${district.city.name}` : `${neighborhood!.name} · ${district.city.name}`}
          </p>
          <p className="m-0 mt-0.5 hidden text-xs text-ui-ink/80 [text-shadow:0_1px_6px_rgba(0,0,0,0.8)] sm:block">
            {insideHome ? insideHome.name : neighborhood!.description}
          </p>
        </div>
      )}

      {/* Prompt when standing at a vendor or shop (desktop: bottom centre) */}
      {placePrompt && (
        <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 sm:block">
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
        <section className={`${PANEL} w-full sm:w-72`} aria-label="Player status">
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
                    <p className="m-0 truncate text-sm font-semibold">{character.name}</p>
                    <p className="m-0 mt-0.5 truncate text-xs text-ui-muted">
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
                    <p className="m-0 text-[10px] uppercase tracking-[0.16em] text-ui-faint">Balance</p>
                    <p className="m-0 font-display text-2xl font-semibold leading-tight tabular-nums">
                      {balance.toLocaleString()} <span className="text-base text-ui-muted">ⓒ</span>
                    </p>
                  </div>
                  {character.career !== 'none' && !insideHome && (
                    <p className="m-0 text-right text-xs text-ui-muted">
                      Workplace
                      <span className={`block text-sm ${workplaceStatus.isAtWorkplace ? 'text-ui-accent-strong' : 'text-ui-ink'}`}>
                        {workplaceStatus.isAtWorkplace ? 'You are here' : `${workplaceStatus.distanceToWorkplace} m away`}
                      </span>
                    </p>
                  )}
                </div>

                <div className="mt-3">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-ui-muted">Hunger</span>
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
              Details
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
