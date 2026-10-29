/**
 * Browser save data. Everything read back is validated, so a corrupted or
 * outdated save is ignored instead of crashing the game.
 */
import type { Career, Character, Lifestyle } from '../components/CharacterCreation';
import { createGameState, getPeriod, type GameState } from './gameState';
import { DIETS, type Diet } from './food';
import { GENDERS, HERITAGES, type Gender } from './identity';
import { COUNTRY_CODES, DEFAULT_COUNTRY } from './places';
import { HEIGHT_RANGE, LOOKS, defaultHeightCm, lookById, type BodyType } from './looks';
import { itemById, sanitiseWardrobe } from './fashion';
import { sanitiseShape } from './bodyShape';
import { STARTER_HOME_ID, forSale, homeById } from './homes';
import { sanitiseEquipment } from './equipment';
import { SONGHAI_CODE, songhaiRegion } from './songhai';
import { sanitiseStay } from './hotel';
import { sanitiseSpaJob } from './spa';
import { DEFAULT_DISTRICT_ID, isDistrictId } from './geography';
import { sanitiseRelationships } from './people';
import { sanitiseNeeds } from './needs';
import { sanitiseFurniture } from './furniture';
import { sanitiseLife } from './lifeState';
import { recogniseExisting } from './life';
import { sanitiseOfficeCareer } from './officeCareer';
import { sanitiseCampus } from './campus';
import { sanitiseHospital } from './hospital';
import { sanitiseLiveWorld } from './liveEvents';
import { sanitiseSupernatural } from './supernatural';
import { sanitiseHealth } from './health';
import { sanitiseGear } from './careerGear';
import { sanitiseHomeDecor } from './homeDecor';
import { DEFAULT_SKIN_TONE, isSkinColor, isSkinToneId } from './skinTone';
import { sanitiseOwnedVehicles, vehicleById } from './vehicleCatalog';

const CHARACTER_KEY = 'aye_character';
const PROGRESS_KEY = 'aye_progress';

const LIFESTYLES: readonly Lifestyle[] = ['student', 'ordinary', 'middle-class', 'luxury'];
const CAREERS: readonly Career[] = [
  'none', 'student', 'artist', 'entrepreneur', 'athlete', 'engineer', 'doctor', 'pilot',
];

const isNum = (v: unknown, min = -Infinity, max = Infinity): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const isInt = (v: unknown, min: number, max: number): v is number => isNum(v, min, max) && Number.isInteger(v);

/** The vehicle catalogue model nearest each car sold before the catalogue (lib/vehicleCatalog.ts). */
const LEGACY_CAR_MODEL: Record<string, string> = {
  hatch: 'epe-city',
  saloon: 'marina-sedan',
  suv: 'ikorodu-sport',
  'ev-suv': 'ikorodu-sport',
  executive: 'lekki-grand',
  limousine: 'lekki-grand',
  coupe: 'victoria-coupe',
};

/** Cars from older saves ({ id, color }) as owned catalogue vehicles, in the model's first paint. */
export function legacyVehicles(cars: unknown): { modelId: string; colour: string }[] {
  if (!Array.isArray(cars)) return [];
  const out: { modelId: string; colour: string }[] = [];
  for (const c of cars) {
    const id = typeof c === 'object' && c !== null ? (c as { id?: unknown }).id : undefined;
    const model = typeof id === 'string' ? vehicleById(LEGACY_CAR_MODEL[id] ?? '') : undefined;
    if (model && !out.some((o) => o.modelId === model.id)) out.push({ modelId: model.id, colour: model.colours[0] });
  }
  return out;
}

function readJson(storage: Storage, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function parseCharacter(data: unknown): Character | null {
  if (typeof data !== 'object' || data === null) return null;
  const c = data as Record<string, unknown>;
  if (
    typeof c.id !== 'string' ||
    typeof c.name !== 'string' || c.name.trim() === '' ||
    !LIFESTYLES.includes(c.lifestyle as Lifestyle) ||
    !CAREERS.includes(c.career as Career) ||
    !isInt(c.colorR, 0, 255) || !isInt(c.colorG, 0, 255) || !isInt(c.colorB, 0, 255) ||
    !isNum(c.balance, 0) || !isNum(c.createdAt) || !isNum(c.lastBalanceUpdate) ||
    (c.diet !== undefined && !DIETS.some((d) => d.id === c.diet))
  ) {
    return null;
  }
  // Fields added later get defaults, so older saves keep working:
  // diet (everything), identity (unspecified), home (Nigeria), look (the original built-in man)
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const gender = GENDERS.some((g) => g.id === c.gender) ? (c.gender as Gender) : 'unspecified';
  const look = LOOKS.find((l) => l.id === c.lookId) ?? lookById(undefined);
  const body: BodyType = c.body === 'feminine' || c.body === 'masculine' ? c.body : look.body;
  // Opening choices are applied once in memory and never kept
  const { start: _start, ...rest } = c;
  void _start;
  return {
    ...(rest as unknown as Character),
    diet: (c.diet as Diet | undefined) ?? 'everything',
    gender,
    heritage: HERITAGES.some((h) => h.id === c.heritage) ? (c.heritage as string) : 'unspecified',
    ethnicGroup: str(c.ethnicGroup, 40),
    country: COUNTRY_CODES.includes(c.country as string) ? (c.country as string) : DEFAULT_COUNTRY,
    // A home region saved as a former real state shows as its Songhai state
    region: c.country === SONGHAI_CODE ? songhaiRegion(str(c.region, 60)) : str(c.region, 60),
    // A look must match the body; otherwise fall back to the first look for that body
    lookId: look.body === body ? look.id : LOOKS.find((l) => l.body === body)!.id,
    body,
    heightCm: isNum(c.heightCm, HEIGHT_RANGE.min, HEIGHT_RANGE.max) ? Math.round(c.heightCm) : defaultHeightCm(body),
    // Unknown items (e.g. removed from the catalogue) are dropped; nothing is lost otherwise
    wardrobe: sanitiseWardrobe(c.wardrobe),
    homeDecor: sanitiseHomeDecor(c.homeDecor),
    // Saves from before body shape start average
    shape: sanitiseShape(c.shape),
    // Saves from before skin tone keep the person's own skin. An older save may hold a tone id here (the tint below)
    skinTone: isNum(c.skinTone, -1, 1) ? Math.round(c.skinTone * 100) / 100 : 0,
    skinToneId: isSkinToneId(c.skinToneId) ? c.skinToneId : isSkinToneId(c.skinTone) ? c.skinTone : DEFAULT_SKIN_TONE,
    skinColor: isSkinColor(c.skinColor) ? c.skinColor : undefined,
  };
}

export function loadCharacter(storage: Storage = localStorage): Character | null {
  return parseCharacter(readJson(storage, CHARACTER_KEY));
}

export function saveCharacter(character: Character, storage: Storage = localStorage) {
  const { start: _start, ...rest } = character;
  void _start;
  storage.setItem(CHARACTER_KEY, JSON.stringify(rest));
}

/** Whether this character already has saved progress (opening choices only apply to a brand-new life). */
export function hasProgress(character: Pick<Character, 'id'>, storage: Storage = localStorage): boolean {
  const data = readJson(storage, PROGRESS_KEY);
  return typeof data === 'object' && data !== null && (data as Record<string, unknown>).characterId === character.id;
}

export function clearSave(storage: Storage = localStorage) {
  storage.removeItem(CHARACTER_KEY);
  storage.removeItem(PROGRESS_KEY);
}

/** Restores clock, balance and today's ledger for this character, or starts fresh. */
export function loadProgress(character: Character, storage: Storage = localStorage): GameState {
  // A new character starts out renting the starter flat (rent from the first night)
  const fresh: GameState = { ...createGameState(character.balance), home: STARTER_HOME_ID, starterGiven: true };
  const data = readJson(storage, PROGRESS_KEY);
  if (typeof data !== 'object' || data === null) return fresh;
  const p = data as Record<string, unknown>;
  const time = p.time as Record<string, unknown> | undefined;
  const today = p.today as Record<string, unknown> | undefined;
  const performanceData = typeof p.workPerformance === 'object' && p.workPerformance !== null
    ? p.workPerformance as Record<string, unknown>
    : {};
  const performanceCount = (value: unknown) => isInt(value, 0, 1_000_000_000) ? value : 0;
  if (
    p.characterId !== character.id ||
    !isNum(p.balance, 0) ||
    !time || !isInt(time.hour, 0, 23) || !isInt(time.minute, 0, 59) ||
    !isInt(time.dayOfWeek, 0, 6) || !isInt(time.totalMinutes, 0, Number.MAX_SAFE_INTEGER) ||
    !today || !isNum(today.income, 0) || !isNum(today.expenses, 0)
  ) {
    return fresh;
  }
  const loaded: GameState = {
    time: {
      hour: time.hour,
      minute: time.minute,
      dayOfWeek: time.dayOfWeek,
      totalMinutes: time.totalMinutes,
      period: getPeriod(time.hour),
    },
    balance: p.balance,
    today: {
      income: today.income,
      expenses: today.expenses,
      // Saves from before work shifts have no minutes recorded
      minutesWorked: isInt(today.minutesWorked, 0, 24 * 60) ? today.minutesWorked : 0,
      ...(isInt(today.purchases, 0, 1000) ? { purchases: today.purchases } : {}),
    },
    minutesWorkedThisHour: isNum(p.minutesWorkedThisHour, 0, 60) ? p.minutesWorkedThisHour : 0,
    // Saves from before hunger existed start fed
    fullness: isNum(p.fullness, 0, 100) ? p.fullness : 100,
    summary: null,
    // Saves from before homes existed have none
    home: homeById(p.home as string | undefined)?.id ?? null,
    // Saves from before OGM Homes own none
    owned: sanitiseOwned(p.owned),
    starterGiven: p.starterGiven === true,
    // Saves from before the spa have no job there
    spa: sanitiseSpaJob(p.spa),
    // Saves from before promotions start with no experience
    workMinutes: isInt(p.workMinutes, 0, Number.MAX_SAFE_INTEGER) ? p.workMinutes : 0,
    equipment: sanitiseEquipment(p.equipment),
    // Cars bought before the vehicle catalogue are kept as the closest catalogue model
    ownedVehicles: sanitiseOwnedVehicles(Array.isArray(p.ownedVehicles) ? p.ownedVehicles : legacyVehicles(p.cars)),
    // Saves from before travel are in the first district
    districtId: isDistrictId(p.districtId) ? p.districtId : DEFAULT_DISTRICT_ID,
    relationships: sanitiseRelationships(p.relationships),
    lastTaskHour: isInt(p.lastTaskHour, -1, Number.MAX_SAFE_INTEGER) ? p.lastTaskHour : -1,
    // Saves from before needs start with every need met, and own no furniture
    needs: sanitiseNeeds(p.needs),
    furniture: sanitiseFurniture(p.furniture),
    // Saves from before Life OS start with a fresh profile, skills and goals
    life: sanitiseLife(p.life),
    // Saves from before the hotel have no booking
    hotel: sanitiseStay(p.hotel),
    lastShowcaseDay: isInt(p.lastShowcaseDay, -1, Math.floor(time.totalMinutes / 1440)) ? p.lastShowcaseDay : -1,
    fashionMissionItemId: typeof p.fashionMissionItemId === 'string' && itemById(p.fashionMissionItemId)
      ? p.fashionMissionItemId
      : null,
    fashionMissionCompleted: p.fashionMissionCompleted === true
      && typeof p.fashionMissionItemId === 'string'
      && !!itemById(p.fashionMissionItemId),
    workPerformance: {
      excellent: performanceCount(performanceData.excellent),
      reasonable: performanceCount(performanceData.reasonable),
      poor: performanceCount(performanceData.poor),
    },
    officeCareer: sanitiseOfficeCareer(p.officeCareer),
    campus: sanitiseCampus(p.campus),
    hospital: sanitiseHospital(p.hospital),
    // Saves from before the living world start with normal events and no reputation
    world: sanitiseLiveWorld(p.world),
    // Saves from before Divine Evolution: locked, in human form, full energy
    supernatural: sanitiseSupernatural(p.supernatural),
    // Saves from before work gear own none
    gear: sanitiseGear(p.gear),
    // Saves from before the survival system start at full health with an empty kit
    health: sanitiseHealth(p.health, time.totalMinutes),
  };
  // Every character gets the starter flat once: a save from before it, with no home, is given it now
  // (someone evicted later stays evicted). Nothing else changes
  const housed = loaded.starterGiven ? loaded : { ...loaded, home: loaded.home ?? STARTER_HOME_ID, starterGiven: true };
  // A home you live in that's for sale must be one you own
  const home = homeById(housed.home);
  const settled = home && forSale(home) && !housed.owned.includes(home.id) ? { ...housed, home: null } : housed;
  // A save from before Life OS: recognise what was already achieved, without paying for it again
  return p.life === undefined ? recogniseExisting(settled, character.career) : settled;
}

/** Homes you own: known homes for sale, each once. */
function sanitiseOwned(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  const out: string[] = [];
  for (const id of data) {
    const h = typeof id === 'string' ? homeById(id) : undefined;
    if (h && forSale(h) && !out.includes(h.id)) out.push(h.id);
  }
  return out;
}

export function saveProgress(characterId: string, state: GameState, storage: Storage = localStorage) {
  const { time, balance, today, minutesWorkedThisHour, fullness, home, owned, starterGiven, spa, workMinutes, equipment, ownedVehicles, districtId, relationships, lastTaskHour, needs, furniture, life, hotel, lastShowcaseDay, fashionMissionItemId, fashionMissionCompleted, workPerformance, officeCareer, campus, hospital, world, supernatural, gear, health } = state;
  storage.setItem(PROGRESS_KEY, JSON.stringify({ characterId, time, balance, today, minutesWorkedThisHour, fullness, home, owned, starterGiven, spa, workMinutes, equipment, ownedVehicles, districtId, relationships, lastTaskHour, needs, furniture, life: { ...life, celebrations: [] }, hotel, lastShowcaseDay, fashionMissionItemId, fashionMissionCompleted, workPerformance, officeCareer, campus, hospital, world, supernatural, gear, health }));
}
