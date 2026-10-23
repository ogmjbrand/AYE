import type { PlayerHandle } from '../hooks/usePlayerController';
import { ShiftStatus, StudentStatus, TodaysGoals, type ShiftHud, type StudentHud } from './StudentPanels';
import type { Character } from './CharacterCreation';
import type { Neighborhood } from '../lib/neighborhoods';
import { useEffect, useRef, useState } from 'react';
import { assetUrl } from '../lib/assetManifest';
import { HUNGRY_THRESHOLD, isWorkingHours, type GameTime } from '../lib/gameState';
import { nearestVendor, type FoodVendor } from '../lib/food';
import { useWorkplaceStatus } from '../hooks/useWorkplaceStatus';
import { TouchStick } from './TouchStick';
import { homeAtDoor, type Home } from '../lib/homes';
import { barAt, counterAt, hotelAt, restaurantAt, type District, type PlaceKind } from '../lib/geography';
import { OPEN_HOUR as RESTAURANT_OPENS, isOpen as restaurantOpen } from '../lib/restaurant';
import { OPEN_HOUR as BAR_OPENS, isOpen as barOpen } from '../lib/cantina';
import { venueAt } from '../lib/nightlife';
import { parkAt } from '../lib/parks';
import { residentNear, type Resident } from '../lib/people';
import { TIRED_THRESHOLD, type Needs } from '../lib/needs';
import { Icon, type IconName } from './os/icons';
import { ICON_PATHS } from './os/iconPaths';

/** One button on the bottom bar. The bar changes with where you are (street, home, restaurant, boutique). */
export interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  onClick: () => void;
  active?: boolean;
  title?: string;
}

/** The title plate at the top of the screen: the venue or area you're in. */
export interface PlacePlate {
  title: string;
  subtitle: string;
  icon: IconName;
}

interface HUDProps {
  controller: PlayerHandle;
  character?: Character;
  balance: number;
  gameTime: GameTime;
  neighborhood?: Neighborhood | null;
  fullness: number;
  /** Energy, hygiene, fun and social (lib/needs.ts). */
  needs?: Needs;
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
  /** At a university's front marker on the street: in through the gate to the campus. */
  campusEntry?: { name: string; onOpen: () => void } | null;
  /** At a car dealer's showroom door. */
  dealerEntry?: { name: string; onOpen: () => void; verb?: string } | null;
  /** Overrides the work status line (e.g. "In class", read from the save). */
  statusOverride?: { label: string; tone: 'good' | 'warn' } | null;
  /** The student's goals and status panels (lib/school.ts). */
  student?: StudentHud | null;
  /** A doctor's shift panels (lib/hospital.ts). */
  shift?: ShiftHud | null;
  /** Set while inside a building: replaces the street prompts. The prompt is worked out from where you stand on every refresh. */
  insideHome?: { name: string; prompt: () => { verb: string; place: string; onOpen: () => void } | null };
  /** Opens the gadget shop when standing at it. */
  onOpenGadgets?: () => void;
  /** Goes into the district's restaurant when standing at its door. */
  onEnterRestaurant?: () => void;
  /** Goes into the district's bar when standing at its door. */
  onEnterBar?: () => void;
  /** Goes into the district's hotel when standing at its door. */
  onEnterHotel?: () => void;
  /** The rented home, if any (lib/homes.ts). */
  homeId?: string | null;
  onOpenHome?: (home: Home) => void;
  /** The title plate (venue or area). */
  place?: PlacePlate | null;
  /** The bottom bar's buttons. */
  nav: readonly NavItem[];
  /** Where to put you on the minimap while you're indoors (the building's door). */
  mapPosition?: { x: number; z: number } | null;
  onOpenMoney?: () => void;
  onOpenInventory?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  /** Opens the Life OS on today's needs (the warning chips). */
  onOpenNeeds?: () => void;
}

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Dark glass with a thin gold edge, opaque enough to read over a bright sky without a costly backdrop blur. */
const GLASS = 'border border-ui-gold/35 bg-[#0d1412]/85 shadow-[0_8px_24px_rgba(0,0,0,0.4)]';
const ROUND =
  `pointer-events-auto grid h-10 w-10 place-items-center rounded-full ${GLASS} text-ui-gold-strong transition hover:border-ui-gold hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-gold sm:h-11 sm:w-11`;

const twoDigits = (n: number) => String(n).padStart(2, '0');

/** "E: do something here", for counters, doors, people and furniture. */
function PlacePrompt({ verb, place, onOpen }: { verb: string; place: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${GLASS} pointer-events-auto flex items-center gap-3 rounded-2xl px-3.5 py-2 text-left text-sm hover:border-ui-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold sm:whitespace-nowrap`}
    >
      <kbd className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-ui-gold/60 bg-ui-gold/15 font-mono text-xs font-bold text-ui-gold-strong">E</kbd>
      <span className="leading-tight">
        {verb} <span className="font-semibold text-ui-gold-strong">{place}</span>
      </span>
    </button>
  );
}

/** Head-and-shoulders picture of your character (the same portrait as the Life OS). */
function Portrait({ character }: { character?: Character }) {
  const [broken, setBroken] = useState<string | null>(null);
  const src = character ? assetUrl(`models/characters/rocketbox/thumbs/${character.lookId}.webp`) : null;
  return (
    <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-ui-gold/70 bg-gradient-to-b from-[#2a3a33] to-[#121a17] sm:h-12 sm:w-12">
      {src && broken !== src
        ? <img src={src} alt="" onError={() => setBroken(src)} className="h-full w-full object-cover" draggable={false} />
        : <span className="font-display text-lg font-bold text-ui-gold-strong">{character?.name.slice(0, 1).toUpperCase() ?? '?'}</span>}
    </span>
  );
}

const POI_ICON: Record<PlaceKind, IconName> = { food: 'restaurant', shop: 'bag', workplace: 'career', home: 'home', public: 'go', nightlife: 'spark', park: 'palm' };
const POI_COLOR: Record<PlaceKind, string> = { food: '#e0913f', shop: '#b07fd6', workplace: '#5b9bd5', home: '#3fbf8e', public: '#8a8f96', nightlife: '#d46a92', park: '#7aa54a' };
const ICON_2D = new Map<IconName, Path2D>();
const path2d = (name: IconName) => {
  let p = ICON_2D.get(name);
  if (!p) { p = new Path2D(ICON_PATHS[name]); ICON_2D.set(name, p); }
  return p;
};

/** Metres from the centre to the edge of the minimap. */
const MAP_RANGE = 42;

/** Round minimap, north up: streets, buildings, places (pinned to the rim when out of range) and you. */
function Minimap({ district, at, direction, homePlaceId, workPlaceId, size }: { district: District; at: { x: number; z: number }; direction: number; homePlaceId: string | null; workPlaceId: string | null; size: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== size * dpr) { c.width = size * dpr; c.height = size * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = size / 2;
    const k = r / MAP_RANGE;
    // The world's east is -x: mirror x so east is on the right, as on the phone map
    const mx = (wx: number) => r - (wx - at.x) * k;
    const my = (wz: number) => r - (wz - at.z) * k;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(r, r, r - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#1a2420';
    ctx.fillRect(0, 0, size, size);
    const { roadHalfWidth, crossStreet, buildings } = district.layout;
    ctx.fillStyle = '#3b4441';
    ctx.fillRect(mx(roadHalfWidth), 0, roadHalfWidth * 2 * k, size);
    ctx.fillRect(0, my(crossStreet.maxZ), size, (crossStreet.maxZ - crossStreet.minZ) * k);
    ctx.fillStyle = '#56615c';
    for (const b of buildings) {
      const w = b.size[0] * k;
      const d = b.size[2] * k;
      const x = mx(b.position[0]) - w / 2;
      const y = my(b.position[2]) - d / 2;
      if (x > size || y > size || x + w < 0 || y + d < 0) continue;
      ctx.beginPath();
      ctx.roundRect(x, y, w, d, 2);
      ctx.fill();
    }
    ctx.restore();
    // Places: icon discs, pinned to the rim when out of range
    for (const p of district.places) {
      let x = mx(p.position[0]) - r;
      let y = my(p.position[2]) - r;
      const dist = Math.hypot(x, y);
      const rim = r - 9;
      const out = dist > rim;
      // Out of range, only your home and your workplace stay on the rim
      if (out) {
        if (p.id !== homePlaceId && p.id !== workPlaceId) continue;
        x = (x / dist) * rim;
        y = (y / dist) * rim;
      }
      const mine = p.id === homePlaceId;
      const rad = mine ? 8 : 6.5;
      ctx.save();
      ctx.translate(r + x, r + y);
      ctx.globalAlpha = out ? 0.75 : 1;
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.fillStyle = POI_COLOR[p.kind];
      ctx.fill();
      ctx.lineWidth = mine ? 1.6 : 1;
      ctx.strokeStyle = mine ? '#ecc98a' : 'rgba(0,0,0,0.5)';
      ctx.stroke();
      const s = (rad * 1.25) / 24;
      ctx.translate(-12 * s, -12 * s);
      ctx.scale(s, s);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(path2d(POI_ICON[p.kind]));
      ctx.restore();
    }
    // You: a gold arrow in the middle
    ctx.save();
    ctx.translate(r, r);
    ctx.rotate(-direction);
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fillStyle = '#ecc98a';
    ctx.strokeStyle = '#1a1206';
    ctx.lineWidth = 1.4;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // North marker on the rim
    ctx.fillStyle = '#ecc98a';
    ctx.font = '600 10px "DM Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', r, 11);
  });
  return (
    <canvas
      ref={canvas}
      style={{ width: size, height: size }}
      className="block rounded-full border-2 border-ui-gold/50 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
      role="img"
      aria-label={`Map of ${district.name}. You are the gold arrow; north is up.`}
    />
  );
}

/** A warning chip for a need that is costing you (pay, mood). */
function NeedChip({ icon, text, onClick }: { icon: IconName; text: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} title={text} aria-label={text} className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-ui-danger/60 bg-[#2a1210]/90 px-2.5 py-1 text-[11px] font-semibold text-ui-danger shadow-lg hover:border-ui-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-danger">
      <Icon name={icon} className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{text}</span>
    </button>
  );
}

export function HUD({
  controller,
  character,
  balance,
  gameTime,
  neighborhood,
  fullness,
  needs,
  onOpenVendor,
  onOpenShop,
  district,
  onOpenTravel,
  onOpenNightlife,
  onOpenPark,
  busy = false,
  onTalk,
  workTask,
  campusEntry,
  dealerEntry,
  statusOverride,
  student,
  shift,
  insideHome,
  onOpenGadgets,
  onEnterRestaurant,
  onEnterBar,
  onEnterHotel,
  homeId = null,
  onOpenHome,
  place,
  nav,
  mapPosition,
  onOpenMoney,
  onOpenInventory,
  onOpenProfile,
  onOpenSettings,
  onOpenNeeds,
}: HUDProps) {
  // The controller is mutated every frame; refresh the readout ~10 times a second
  const [, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((n) => n + 1), 100);
    return () => clearInterval(id);
  }, []);
  const [small, setSmall] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const onResize = () => setSmall(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const workplaceStatus = useWorkplaceStatus(character ?? null, controller, district);
  const { x: px, z: pz } = controller.position;
  const vendor = nearestVendor(district.vendors, px, pz);
  const counter = counterAt(district, px, pz);
  // One prompt at a time: a food vendor, then a shop or desk, then a front door
  const restaurant = restaurantAt(district, px, pz);
  const bar = barAt(district, px, pz);
  const hotel = hotelAt(district, px, pz);
  const prompt = vendor && onOpenVendor
    ? { verb: 'Order food at', place: vendor.name, onOpen: () => onOpenVendor(vendor) }
    : restaurant && onEnterRestaurant
      ? { verb: restaurantOpen(gameTime.hour) ? 'Go into' : `Closed until ${RESTAURANT_OPENS}:00:`, place: restaurant.name, onOpen: onEnterRestaurant }
    : bar && onEnterBar
      ? { verb: barOpen(gameTime.hour) ? 'Go into' : `Closed until ${BAR_OPENS}:00:`, place: bar.name, onOpen: onEnterBar }
    : hotel && onEnterHotel
      ? { verb: 'Go into', place: hotel.name, onOpen: onEnterHotel }
    : counter === 'fashion' && onOpenShop
      ? { verb: 'Go into', place: district.fashionHouse.name, onOpen: onOpenShop }
      : counter === 'gadgets' && onOpenGadgets
        ? { verb: 'Shop at', place: district.gadgetHub.name, onOpen: onOpenGadgets }
        : counter === 'travel' && onOpenTravel
          ? { verb: 'Book travel at', place: district.travelDesk.name, onOpen: onOpenTravel }
          : venueAt(district.nightlife, px, pz) && onOpenNightlife
            ? { verb: 'Go out at', place: district.nightlife.name, onOpen: onOpenNightlife }
            : parkAt(district.park, px, pz) && onOpenPark
              ? { verb: 'Sit on a bench in', place: district.park.name, onOpen: onOpenPark }
              : null;
  const resident = !prompt && !campusEntry && !dealerEntry && onTalk ? residentNear(district.id, px, pz) : undefined;
  const door = !prompt && !resident && onOpenHome ? homeAtDoor(district.id, px, pz) : undefined;
  const streetPrompt = prompt ?? (campusEntry ? { verb: 'Enter', place: campusEntry.name, onOpen: campusEntry.onOpen } : null) ?? (dealerEntry ? { verb: dealerEntry.verb ?? 'Browse cars at', place: dealerEntry.name, onOpen: dealerEntry.onOpen } : null) ?? (resident && onTalk
    ? { verb: 'Talk to', place: resident.name, onOpen: () => onTalk(resident) }
    : null) ?? (workTask ? { verb: 'Take on a task at', place: workTask.place, onOpen: workTask.onOpen } : null) ?? (door && onOpenHome
    ? { verb: door.id === homeId ? 'Go into your home at' : door.price !== undefined ? `For sale (OGM Homes): ${door.kind} at` : `To let: ${door.kind} at`, place: door.building, onOpen: () => onOpenHome(door) }
    : null);
  const placePrompt = busy ? null : insideHome ? insideHome.prompt() : streetPrompt;

  const shiftHours = isWorkingHours(gameTime) && !!character && character.career !== 'none';
  const status = statusOverride
    ? { label: statusOverride.label, dot: statusOverride.tone === 'good' ? 'bg-ui-accent' : 'bg-ui-warn', text: statusOverride.tone === 'good' ? 'text-ui-accent-strong' : 'text-ui-warn' }
    : !shiftHours ? null
    : workplaceStatus.isAtWorkplace
      ? { label: 'Working', dot: 'bg-ui-accent', text: 'text-ui-accent-strong' }
      : { label: insideHome ? 'Not at work' : `Not at work · ${workplaceStatus.distanceToWorkplace} m`, dot: 'bg-ui-warn', text: 'text-ui-warn' };

  const warnings: { icon: IconName; text: string }[] = [];
  if (fullness < HUNGRY_THRESHOLD) warnings.push({ icon: 'hunger', text: 'Hungry: pay halved' });
  if (needs && needs.energy < TIRED_THRESHOLD) warnings.push({ icon: 'energy', text: 'Exhausted: pay halved' });
  if (needs && needs.hygiene < 20) warnings.push({ icon: 'hygiene', text: 'Needs a shower' });
  if (needs && needs.fun < 20) warnings.push({ icon: 'fun', text: 'Bored' });
  if (needs && needs.social < 20) warnings.push({ icon: 'social', text: 'Lonely' });

  const mapAt = mapPosition ?? { x: px, z: pz };
  const homePlaceId = homeId ? `${district.id}.home.${homeId}` : null;
  const location = neighborhood?.name ?? district.name;

  return (
    <div className="pointer-events-none fixed inset-0 select-none font-sans text-ui-ink">
      {/* Top-left: who and when */}
      <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5 sm:left-5 sm:top-5">
        <div className={`${GLASS} flex items-center gap-2.5 rounded-full py-1 pl-1 pr-4`}>
          <Portrait character={character} />
          <div className="min-w-0">
            <p className="m-0 max-w-[9rem] truncate text-sm font-semibold leading-tight sm:max-w-[12rem]">{character?.name ?? 'You'}</p>
            <p className="m-0 font-display text-xs font-semibold tabular-nums leading-tight text-ui-gold-strong">
              {DAY_SHORT[gameTime.dayOfWeek]} {twoDigits(gameTime.hour)}:{twoDigits(Math.floor(gameTime.minute))}
            </p>
            {status && (
              <p className={`m-0 flex items-center gap-1 text-[10px] font-medium leading-tight ${status.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden /> {status.label}
              </p>
            )}
          </div>
        </div>
        {warnings.length > 0 && (
          <div className="flex max-w-[16rem] flex-wrap gap-1">
            {warnings.map((w) => <NeedChip key={w.text} icon={w.icon} text={w.text} onClick={onOpenNeeds} />)}
          </div>
        )}
        {student && !small && <TodaysGoals goals={student.goals} />}
        {shift && !small && <TodaysGoals goals={shift.goals} />}
      </div>
      {(student || shift) && !small && (
        <div className="absolute right-5 top-[4.6rem]">
          {student ? <StudentStatus s={student} /> : shift && <ShiftStatus s={shift} />}
        </div>
      )}

      {/* Top-centre: the venue or area */}
      {place && (
        <div className="absolute left-1/2 top-[4.6rem] -translate-x-1/2 sm:top-5">
          <div className={`${GLASS} flex items-center gap-3 rounded-2xl px-4 py-2 sm:px-5`}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ui-gold/60 bg-ui-gold/10 text-ui-gold-strong sm:h-9 sm:w-9">
              <Icon name={place.icon} className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <div className="text-center">
              <p className="m-0 whitespace-nowrap font-display text-sm font-bold uppercase tracking-[0.14em] sm:text-base">{place.title}</p>
              <p className="m-0 flex items-center justify-center gap-2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.22em] text-ui-gold-strong">
                <span className="h-px w-4 bg-ui-gold/60" aria-hidden /> {place.subtitle} <span className="h-px w-4 bg-ui-gold/60" aria-hidden />
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top-right: money and the system buttons */}
      <div className="absolute right-3 top-3 flex items-center gap-1.5 sm:right-5 sm:top-5 sm:gap-2">
        <button
          type="button"
          onClick={onOpenMoney}
          title="Your money: income, spending and savings"
          className={`${GLASS} pointer-events-auto flex h-10 items-center gap-1.5 rounded-full pl-1.5 pr-2.5 hover:border-ui-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold sm:h-11 sm:gap-2 sm:pr-3`}
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-b from-[#f3d48f] to-[#b8862f] text-[#3a2606] sm:h-8 sm:w-8">
            <Icon name="coin" className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <span className="font-display text-sm font-bold tabular-nums sm:text-base">{Math.round(balance).toLocaleString()}</span>
          <span className="hidden text-[10px] font-semibold text-ui-gold-strong sm:inline">GHAI</span>
          <Icon name="arrowRight" className="h-3.5 w-3.5 text-ui-gold-strong" />
        </button>
        {onOpenInventory && (
          <button type="button" onClick={onOpenInventory} className={ROUND} title="Inventory: the clothes you own" aria-label="Inventory">
            <Icon name="bag" className="h-5 w-5" />
          </button>
        )}
        {onOpenProfile && (
          <button type="button" onClick={onOpenProfile} className={`${ROUND} hidden sm:grid`} title="Your profile" aria-label="Profile">
            <Icon name="profile" className="h-5 w-5" />
          </button>
        )}
        {onOpenSettings && (
          <button type="button" onClick={onOpenSettings} className={ROUND} title="Settings and main menu" aria-label="Settings">
            <Icon name="settings" className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Bottom-left: minimap and where you are */}
      <div className="absolute bottom-[5.25rem] left-3 flex flex-col items-center gap-1.5 sm:bottom-5 sm:left-5 pointer-coarse:bottom-auto pointer-coarse:left-auto pointer-coarse:right-3 pointer-coarse:top-[4.6rem] sm:pointer-coarse:top-[4.75rem]">
        <Minimap district={district} at={mapAt} direction={mapPosition ? Math.PI : controller.direction} homePlaceId={homePlaceId} workPlaceId={character && character.career !== 'none' ? `${district.id}.work.${character.career}` : null} size={small ? 92 : 148} />
        <p className={`${GLASS} m-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold`}>
          <Icon name="pin" className="h-3.5 w-3.5 text-ui-gold-strong" /> {location}
        </p>
      </div>

      {/* Bottom: the prompt, then the bar */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-3 pb-3 sm:pb-5">
        <div className="flex w-full items-end justify-between gap-2 sm:justify-center">
          <TouchStick />
          {placePrompt && <PlacePrompt {...placePrompt} />}
        </div>
        <nav aria-label="Main" className={`${GLASS} pointer-events-auto flex max-w-full items-stretch gap-0.5 overflow-x-auto rounded-2xl p-1 sm:gap-1 sm:p-1.5`}>
          {nav.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={n.onClick}
              title={n.title ?? n.label}
              aria-pressed={n.active || undefined}
              className={`flex min-w-[3.4rem] flex-col items-center gap-0.5 rounded-xl px-1.5 py-1.5 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold sm:min-w-[4.5rem] sm:px-2.5 sm:text-[11px] ${n.active ? 'bg-ui-gold/20 text-ui-gold-strong' : 'text-ui-ink/85 hover:bg-white/5 hover:text-ui-gold-strong'}`}
            >
              <Icon name={n.icon} className="h-5 w-5" />
              <span className="whitespace-nowrap">{n.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Keyboard hint: desktop only */}
      <div className="absolute bottom-5 right-5 hidden text-right text-[11px] uppercase tracking-[0.14em] text-ui-ink/80 [text-shadow:0_1px_4px_rgba(0,0,0,0.8)] lg:block pointer-coarse:hidden">
        <p className="m-0"><span className="font-semibold">Click</span> or <span className="font-semibold">W A S D</span> move · <span className="font-semibold">Shift</span> walk</p>
        <p className="m-0 mt-1"><span className="font-semibold">Drag</span> orbit · <span className="font-semibold">Scroll</span> zoom · <span className="font-semibold">L</span> phone</p>
      </div>
    </div>
  );
}
