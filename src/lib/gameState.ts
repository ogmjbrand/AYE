/**
 * Game clock and day-to-day economy, as pure functions so they can be tested
 * and so the clock, the balance and the daily summary can never drift apart.
 *
 * Rules (tunable):
 *   - The clock advances one game minute per tick.
 *   - Wages are earned per minute spent at the player's workplace during
 *     working hours, and paid out when the game hour ends. Every hour also
 *     charges the lifestyle's hourly living cost.
 *   - The balance never goes below zero.
 *   - Resting sleeps until the next 07:00, closes the day's ledger and reports it.
 *   - Fullness (0–100) falls steadily, sleep included; eating raises it. While
 *     very hungry (below HUNGRY_THRESHOLD) work is paid at half rate.
 *   - Renting a home costs a move-in fee, then rent each night you sleep.
 *     If you can't pay, you're evicted. Sleeping anywhere but home is
 *     sleeping rough, which leaves you hungrier. A night in your own bed
 *     uses half the usual hunger.
 *   - Every worked minute counts towards promotion (lib/progression.ts);
 *     each level raises the hourly wage.
 *   - Energy, hygiene, fun and social (lib/needs.ts) run down while awake.
 *     Sleep restores energy (fully only at home), friends meet social needs,
 *     and furniture at home (lib/furniture.ts) meets the rest. Exhausted
 *     work is paid at half rate, and mood scales a work task's bonus.
 */
import type { Career, Lifestyle } from '../components/CharacterCreation';
import { ROUGH_SLEEP_FULLNESS_LOSS, homeById, moveInFee } from './homes';
import { careerLevel, levelIndex } from './progression';
import { equipmentById, equipmentPay } from './equipment';
import { DEFAULT_DISTRICT_ID, districtById, isDistrictId } from './geography';
import { WAIT_OPTIONS } from './parks';

const MAX_WAIT = Math.max(...WAIT_OPTIONS);
import { NIGHT_OUT_MINUTES, NIGHT_OUT_POINTS, canStartNightOut, nightOutCost } from './nightlife';
import { travelOption, type TravelMode } from './travel';
import { TASK_REWARD, taskForHour } from './workTasks';
import { ACTIVITIES, HANGOUT_LEVEL, MAX_POINTS, friendshipLevel, gameDay, residentById, type Activity, type Relationship } from './people';
import { FULL_NEEDS, MOOD_TASK_MULTIPLIER, SLEEP_ENERGY, TIRED_THRESHOLD, addNeeds, decayNeeds, decayNeedsAsleep, moodLabel, moodScore, type Needs } from './needs';
import { catalogueItem, findSpot, fits, homeComfort, walkable, nextUid, replaceAll, resaleValue, furnitureUse, type OwnedFurniture } from './furniture';
import { interiorFor, type Interior } from './interiors';
import { emptyLife, modifiers, type LifeState } from './lifeState';
import type { FurnitureKind } from './interiors';
import type { CatalogueItem } from './furniture';

export type Period = 'morning' | 'afternoon' | 'evening' | 'night';

export interface GameTime {
  hour: number;
  minute: number;
  totalMinutes: number;
  /** 0 = Monday … 6 = Sunday */
  dayOfWeek: number;
  period: Period;
}

export interface DayLedger {
  income: number;
  expenses: number;
  /** Game minutes spent at the workplace during working hours. */
  minutesWorked: number;
}

export interface DaySummary extends DayLedger {
  netChange: number;
  /** The day the player wakes up on (0 = Monday). */
  wakeDayOfWeek: number;
  /** Rent paid for the night (also counted in expenses). */
  rent: number;
  /** Slept somewhere other than their own home or a friend's couch. */
  rough: boolean;
  /** Slept on a close friend's couch. */
  atFriend: boolean;
  /** Lost their home because they couldn't pay the night's rent. */
  evicted: boolean;
  /** New job title if the day's work earned a promotion. */
  promotedTo: string | null;
}

export interface GameState {
  time: GameTime;
  balance: number;
  /** Money in and out since the player last woke up. */
  today: DayLedger;
  /** Paid work minutes in the current, not yet paid, hour (hungry minutes count half). */
  minutesWorkedThisHour: number;
  /** 0 = starving, 100 = just ate a big meal. */
  fullness: number;
  /** Set after resting; the clock is paused until it is dismissed. */
  summary: DaySummary | null;
  /** The rented home (lib/homes.ts), or null. */
  home: string | null;
  /** All minutes ever worked in this career (experience for promotion). */
  workMinutes: number;
  /** Owned equipment ids (lib/equipment.ts). */
  equipment: string[];
  /** The district the player is in (lib/geography.ts). */
  districtId: string;
  /** Friendships with residents (lib/people.ts), by resident id. */
  relationships: Record<string, Relationship>;
  /** Game hour (totalMinutes / 60) of the last work task, or -1: one task per hour. */
  lastTaskHour: number;
  /** Energy, hygiene, fun and social (lib/needs.ts). */
  needs: Needs;
  /** Furniture you've bought, placed in your home or in storage (lib/furniture.ts). */
  furniture: OwnedFurniture[];
  /** Profile, skills, missions, wishes, dream, achievements and money history (lib/lifeState.ts, lib/life.ts). */
  life: LifeState;
}

/** A piece of furniture to use: one you bought, or one the home came with (by index). */
export type FurnitureTarget = { uid: string } | { builtin: number };

export type GameAction =
  | { type: 'tick'; atWorkplace: boolean }
  | { type: 'sleep'; atHome: boolean; atFriend?: boolean }
  | { type: 'moveIn'; homeId: string }
  | { type: 'moveOut' }
  | { type: 'buyEquipment'; id: string }
  | { type: 'travel'; to: string; mode: TravelMode }
  | { type: 'socialise'; residentId: string; activity: Activity }
  | { type: 'nightOut'; residentId: string }
  | { type: 'wait'; minutes: number }
  | { type: 'workTask'; taskId: string; choice: number; atWorkplace: boolean }
  /** A meal bought out; `lift` is what a good meal does besides filling you (a restaurant's fun, an espresso's energy). */
  | { type: 'eat'; price: number; fullness: number; lift?: Partial<Needs> }
  | { type: 'purchase'; price: number }
  | { type: 'buyFurniture'; itemId: string }
  | { type: 'sellFurniture'; uid: string }
  | { type: 'placeFurniture'; uid: string; at: readonly [number, number]; rot: 0 | 1 }
  | { type: 'storeFurniture'; uid: string }
  | { type: 'useFurniture'; target: FurnitureTarget; near: boolean }
  | { type: 'exercise'; minutes: number; atPark: boolean }
  | { type: 'dismissSummary' };

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const WAKE_HOUR = 7;
export const WORK_START_HOUR = 9;
export const WORK_END_HOUR = 17;

/** Pay per working game hour. */
export const HOURLY_WAGE: Record<Career, number> = {
  none: 0,
  student: 15,
  artist: 25,
  entrepreneur: 50,
  athlete: 40,
  engineer: 75,
  doctor: 100,
  pilot: 90,
};

/** Living cost per game hour, charged around the clock. */
export const HOURLY_LIVING_COST: Record<Lifestyle, number> = {
  student: 7,
  ordinary: 17,
  'middle-class': 40,
  luxury: 83,
};

export const STARTING_BALANCE: Record<Lifestyle, number> = {
  student: 2500,
  ordinary: 5000,
  'middle-class': 12500,
  luxury: 25000,
};

/** Fullness lost per game minute: a full meter empties in 16 game hours. */
export const FULLNESS_LOSS_PER_MINUTE = 100 / (16 * 60);
export const HUNGRY_THRESHOLD = 20;
/** Asleep in your own bed, hunger builds at half the waking rate. */
export const HOME_SLEEP_HUNGER_RATE = 0.5;

export function hungerLabel(fullness: number): 'Full' | 'Fed' | 'Peckish' | 'Hungry' | 'Starving' {
  if (fullness >= 80) return 'Full';
  if (fullness >= 50) return 'Fed';
  if (fullness >= HUNGRY_THRESHOLD) return 'Peckish';
  if (fullness > 0) return 'Hungry';
  return 'Starving';
}

/** Pay for a meal and raise fullness. Refused if the player can't afford it. */
function eat(state: GameState, price: number, gain: number, lift: Partial<Needs> = {}): GameState {
  if (!(price > 0) || !(gain > 0) || state.balance < price || state.summary) return state;
  return {
    ...state,
    balance: state.balance - price,
    fullness: Math.min(100, state.fullness + gain),
    needs: addNeeds(state.needs, { ...lift, fun: (lift.fun ?? 0) + modifiers(state.life).mealFun }),
    today: { ...state.today, expenses: state.today.expenses + price },
  };
}

/** Spends money on something that isn't food (clothes, hair). Refused if the player can't afford it. */
function purchase(state: GameState, price: number): GameState {
  if (!(price > 0) || state.balance < price || state.summary) return state;
  return { ...state, balance: state.balance - price, today: { ...state.today, expenses: state.today.expenses + price } };
}

export function getPeriod(hour: number): Period {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'night';
}

export function isWorkingHours(time: Pick<GameTime, 'hour'>): boolean {
  return time.hour >= WORK_START_HOUR && time.hour < WORK_END_HOUR;
}

export function formatGameTime(time: GameTime): string {
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}

export function getAmbiance(time: GameTime): { color: string; intensity: number } {
  const { hour } = time;
  if (hour >= 6 && hour < 9) return { color: '#ffd4a3', intensity: 0.6 };
  if (hour >= 9 && hour < 12) return { color: '#ffffff', intensity: 1 };
  if (hour >= 12 && hour < 18) return { color: '#fffacd', intensity: 1 };
  if (hour >= 18 && hour < 21) return { color: '#ff9500', intensity: 0.8 };
  return { color: '#1a1a2e', intensity: 0.3 };
}

export function createTime(hour = 8, minute = 0, dayOfWeek = 2): GameTime {
  return { hour, minute, totalMinutes: hour * 60 + minute, dayOfWeek, period: getPeriod(hour) };
}

export function createGameState(balance: number, time: GameTime = createTime()): GameState {
  return { time, balance, today: emptyLedger(), minutesWorkedThisHour: 0, fullness: 100, summary: null, home: null, workMinutes: 0, equipment: [], districtId: DEFAULT_DISTRICT_ID, relationships: {}, lastTaskHour: -1, needs: FULL_NEEDS, furniture: [], life: emptyLife() };
}

export function emptyLedger(): DayLedger {
  return { income: 0, expenses: 0, minutesWorked: 0 };
}

function advanceMinute(time: GameTime): GameTime {
  let { hour, minute, dayOfWeek } = time;
  minute += 1;
  if (minute === 60) {
    minute = 0;
    hour += 1;
  }
  if (hour === 24) {
    hour = 0;
    dayOfWeek = (dayOfWeek + 1) % 7;
  }
  return { hour, minute, totalMinutes: time.totalMinutes + 1, dayOfWeek, period: getPeriod(hour) };
}

/**
 * Advance one minute. A minute counts as worked if it falls in working hours
 * and the player is at their workplace. When an hour ends, pay the wage for
 * the minutes worked in it and charge the hour's living cost.
 */
function tick(state: GameState, career: Career, lifestyle: Lifestyle, atWorkplace: boolean, hungerRate = 1, asleep = false): GameState {
  const worked = atWorkplace && career !== 'none' && isWorkingHours(state.time) ? 1 : 0;
  const pay = worked * (state.fullness < HUNGRY_THRESHOLD || state.needs.energy < TIRED_THRESHOLD ? 0.5 : 1);
  const minutesWorkedThisHour = state.minutesWorkedThisHour + pay;
  const fullness = Math.max(0, state.fullness - FULLNESS_LOSS_PER_MINUTE * hungerRate);
  const mods = modifiers(state.life);
  const needs = asleep ? decayNeedsAsleep(state.needs) : decayNeeds(state.needs, { energy: mods.energyDecay, social: mods.socialDecay });
  const time = advanceMinute(state.time);
  const today = { ...state.today, minutesWorked: state.today.minutesWorked + worked };
  const workMinutes = state.workMinutes + worked;
  if (time.minute !== 0) return { ...state, time, today, minutesWorkedThisHour, fullness, needs, workMinutes };

  // Paid at the rate of the level held when the hour ends
  const wage = HOURLY_WAGE[career] * careerLevel(career, state.workMinutes).pay * equipmentPay(state.equipment, career);
  const income = Math.round((wage * minutesWorkedThisHour) / 60);
  const afterIncome = state.balance + income;
  const expenses = Math.min(Math.round(HOURLY_LIVING_COST[lifestyle] * mods.livingCost), afterIncome);

  return {
    ...state,
    time,
    balance: afterIncome - expenses,
    today: { ...today, income: today.income + income, expenses: today.expenses + expenses },
    minutesWorkedThisHour: 0,
    fullness,
    needs,
    workMinutes,
  };
}

/** Mood right now (0 … 100): needs, hunger and the comfort of your home. */
export function currentMood(state: Pick<GameState, 'needs' | 'fullness' | 'furniture' | 'home' | 'life' | 'time'>): number {
  const boost = state.life?.boost && state.life.boost.until > state.time.totalMinutes ? state.life.boost.amount : 0;
  return moodScore(state.needs, state.fullness, state.home ? homeComfort(state.furniture) : 0, modifiers(state.life).mood + boost);
}

/** What a catalogue piece costs you (the Negotiator perk takes 10% off). */
export const furniturePrice = (item: CatalogueItem, state: Pick<GameState, 'life'>) => Math.round(item.price * modifiers(state.life).furniturePrice);

/** Furniture that's fun to use at home; books and music count as reading/listening. */
const HOME_FUN: readonly FurnitureKind[] = ['sofa', 'armchair', 'tv', 'console', 'bookshelf', 'speaker', 'bathtub'];

/** How long a run takes, and what it does. */
export const RUN_OPTIONS = [30, 60] as const;
export const RUN_EFFECT_PER_30 = { energy: -12, hygiene: -20, fun: 12 } as const;

/** Travels to another district: pays the fare, then the clock runs for the length of the trip. */
function travel(state: GameState, to: string, mode: TravelMode, career: Career, lifestyle: Lifestyle): GameState {
  if (state.summary || to === state.districtId || !isDistrictId(to)) return state;
  const option = travelOption(districtById(state.districtId).city, districtById(to).city, mode);
  if (!option || state.balance < option.fare) return state;
  let next: GameState = {
    ...state,
    balance: state.balance - option.fare,
    today: { ...state.today, expenses: state.today.expenses + option.fare },
  };
  for (let i = 0; i < option.minutes; i++) next = tick(next, career, lifestyle, false);
  return { ...next, districtId: to };
}

/**
 * Spends time with a resident who lives in the player's current district:
 * one activity per resident per game day. Treats cost money; hanging out
 * needs a friendship and takes an hour.
 */
function socialise(state: GameState, residentId: string, activity: Activity, career: Career, lifestyle: Lifestyle): GameState {
  const resident = residentById(residentId);
  const a = ACTIVITIES[activity];
  if (state.summary || !resident || !a || resident.district !== state.districtId) return state;
  const rel = state.relationships[residentId] ?? { points: 0, lastDay: -1 };
  const today = gameDay(state.time.totalMinutes);
  if (rel.lastDay === today || state.balance < a.cost) return state;
  if (activity === 'hangout' && friendshipLevel(rel.points) < HANGOUT_LEVEL) return state;
  let next: GameState = a.cost > 0
    ? { ...state, balance: state.balance - a.cost, today: { ...state.today, expenses: state.today.expenses + a.cost } }
    : state;
  for (let i = 0; i < a.minutes; i++) next = tick(next, career, lifestyle, false);
  return {
    ...next,
    needs: addNeeds(next.needs, SOCIAL_GAINS[activity]),
    relationships: { ...next.relationships, [residentId]: { points: Math.min(MAX_POINTS, rel.points + Math.round(a.points * modifiers(state.life).friendship)), lastDay: today } },
  };
}

/** What time with a friend does for you. */
export const SOCIAL_GAINS: Record<Activity, Partial<Needs>> = {
  chat: { social: 15 },
  treat: { social: 25, fun: 5 },
  hangout: { social: 40, fun: 15 },
};
export const NIGHT_OUT_GAINS: Partial<Needs> = { social: 45, fun: 40, energy: -10 };
/** Fun per minute sitting in the park or on a terrace. */
export const SIT_FUN_PER_MINUTE = 0.3;

/**
 * A night out at the district's lounge with a friend: open in the evening
 * only, you pay both covers, it takes two hours and counts as your time
 * together today. Friends only, like a hang-out.
 */
function nightOut(state: GameState, residentId: string, career: Career, lifestyle: Lifestyle): GameState {
  const resident = residentById(residentId);
  if (state.summary || !resident || resident.district !== state.districtId || !canStartNightOut(state.time)) return state;
  const cost = nightOutCost(districtById(state.districtId).nightlife);
  const rel = state.relationships[residentId] ?? { points: 0, lastDay: -1 };
  const today = gameDay(state.time.totalMinutes);
  if (rel.lastDay === today || state.balance < cost || friendshipLevel(rel.points) < HANGOUT_LEVEL) return state;
  let next: GameState = { ...state, balance: state.balance - cost, today: { ...state.today, expenses: state.today.expenses + cost } };
  for (let i = 0; i < NIGHT_OUT_MINUTES; i++) next = tick(next, career, lifestyle, false);
  return {
    ...next,
    needs: addNeeds(next.needs, NIGHT_OUT_GAINS),
    relationships: { ...next.relationships, [residentId]: { points: Math.min(MAX_POINTS, rel.points + Math.round(NIGHT_OUT_POINTS * modifiers(state.life).friendship)), lastDay: today } },
  };
}

/**
 * Answers this hour's work task. Only at the workplace during working hours,
 * once per game hour, and only the task this hour actually offers; the
 * reward is worked out here from the task data.
 */
function workTask(state: GameState, taskId: string, choice: number, atWorkplace: boolean, career: Career): GameState {
  const hour = Math.floor(state.time.totalMinutes / 60);
  const task = taskForHour(career, state.time.totalMinutes);
  if (state.summary || !atWorkplace || !task || task.id !== taskId || !isWorkingHours(state.time) || state.lastTaskHour === hour) return state;
  const option = task.options[choice];
  if (!option) return state;
  const reward = TASK_REWARD[option.quality];
  const hourly = HOURLY_WAGE[career] * careerLevel(career, state.workMinutes).pay * equipmentPay(state.equipment, career);
  const bonus = Math.round(hourly * reward.payShare * MOOD_TASK_MULTIPLIER[moodLabel(currentMood(state))] * modifiers(state.life).taskBonus);
  return {
    ...state,
    balance: state.balance + bonus,
    today: { ...state.today, income: state.today.income + bonus },
    workMinutes: state.workMinutes + reward.xpMinutes,
    lastTaskHour: hour,
  };
}

/** Rents a home: pays the move-in fee. Moving from another home gives up the old one. */
function moveIn(state: GameState, homeId: string): GameState {
  const home = homeById(homeId);
  if (!home || state.home === homeId || state.summary) return state;
  const fee = moveInFee(home);
  if (state.balance < fee) return state;
  // Your furniture moves with you: what fits the new place goes in, the rest into storage
  return {
    ...state,
    home: homeId,
    balance: state.balance - fee,
    today: { ...state.today, expenses: state.today.expenses + fee },
    furniture: replaceAll(interiorFor(home), state.furniture),
  };
}

const storeAll = (owned: readonly OwnedFurniture[]) => owned.map((o) => ({ ...o, at: null }));

function homeInterior(state: GameState): Interior | null {
  const home = homeById(state.home);
  return home ? interiorFor(home) : null;
}

/** Buys a piece from the catalogue: delivered into your home if there's room, otherwise into storage. */
function buyFurniture(state: GameState, itemId: string): GameState {
  const piece = catalogueItem(itemId);
  const price = piece ? furniturePrice(piece, state) : 0;
  if (!piece || state.summary || state.balance < price) return state;
  const interior = homeInterior(state);
  const spot = interior ? findSpot(interior, state.furniture, piece) : null;
  const owned: OwnedFurniture = { uid: nextUid(state.furniture), itemId, at: spot?.at ?? null, rot: spot?.rot ?? 0 };
  return {
    ...state,
    balance: state.balance - price,
    today: { ...state.today, expenses: state.today.expenses + price },
    furniture: [...state.furniture, owned],
  };
}

function sellFurniture(state: GameState, uid: string): GameState {
  const owned = state.furniture.find((o) => o.uid === uid);
  const piece = catalogueItem(owned?.itemId);
  if (!owned || !piece || state.summary) return state;
  const value = resaleValue(piece);
  return {
    ...state,
    balance: state.balance + value,
    today: { ...state.today, income: state.today.income + value },
    furniture: state.furniture.filter((o) => o.uid !== uid),
  };
}

function placeFurniture(state: GameState, uid: string, at: readonly [number, number], rot: 0 | 1): GameState {
  const owned = state.furniture.find((o) => o.uid === uid);
  const piece = catalogueItem(owned?.itemId);
  const interior = homeInterior(state);
  if (!owned || !piece || !interior || state.summary || !at.every(Number.isFinite)) return state;
  if (!fits(interior, state.furniture, piece, at, rot, uid)) return state;
  const furniture = state.furniture.map((o) => (o.uid === uid ? { ...o, at: [at[0], at[1]] as const, rot } : o));
  // Never wall yourself off from the bed or anything you use
  return walkable(interior, furniture) ? { ...state, furniture } : state;
}

/**
 * Uses a piece in your home: time passes, needs are met, ingredients are
 * paid for. Only at home, standing at the piece, and only if you can pay.
 */
function operateFurniture(state: GameState, target: FurnitureTarget, near: boolean, career: Career, lifestyle: Lifestyle): GameState {
  const interior = homeInterior(state);
  if (state.summary || !near || !interior) return state;
  let kind, quality = 1;
  if ('uid' in target) {
    const owned = state.furniture.find((o) => o.uid === target.uid);
    const piece = catalogueItem(owned?.itemId);
    if (!owned?.at || !piece) return state;
    kind = piece.kind;
    quality = piece.quality;
  } else {
    kind = interior.furniture[target.builtin]?.kind;
  }
  const use = kind ? furnitureUse(kind, quality) : undefined;
  if (!use) return state;
  const cost = use.cost ?? 0;
  if (state.balance < cost) return state;
  let next: GameState = cost > 0 ? { ...state, balance: state.balance - cost, today: { ...state.today, expenses: state.today.expenses + cost } } : state;
  for (let i = 0; i < use.minutes; i++) next = tick(next, career, lifestyle, false);
  const mods = modifiers(state.life);
  const cooking = kind === 'stove' || kind === 'counter';
  const funScale = HOME_FUN.includes(kind!) ? mods.homeFun * (kind === 'bookshelf' || kind === 'speaker' ? mods.readingFun : 1) : 1;
  const gains = { ...use.gains, fun: (use.gains.fun ?? 0) > 0 ? Math.round(use.gains.fun! * funScale) : use.gains.fun };
  if (cooking) gains.fun = (gains.fun ?? 0) + mods.mealFun;
  return {
    ...next,
    needs: addNeeds(next.needs, gains),
    fullness: Math.min(100, next.fullness + Math.round((use.fullness ?? 0) * (cooking ? mods.cookFullness : 1))),
    workMinutes: next.workMinutes + (career !== 'none' ? Math.round((use.xpMinutes ?? 0) * mods.studyXp) : 0),
  };
}

/** A run in the park: tiring and sweaty, but fun (fitness grows through lib/life.ts). */
function exercise(state: GameState, minutes: number, atPark: boolean, career: Career, lifestyle: Lifestyle): GameState {
  if (state.summary || !atPark || !(RUN_OPTIONS as readonly number[]).includes(minutes) || state.needs.energy < 15) return state;
  let next = state;
  for (let i = 0; i < minutes; i++) next = tick(next, career, lifestyle, false);
  const k = minutes / 30;
  return { ...next, needs: addNeeds(next.needs, { energy: RUN_EFFECT_PER_30.energy * k, hygiene: RUN_EFFECT_PER_30.hygiene * k, fun: RUN_EFFECT_PER_30.fun * k }) };
}

/**
 * Sleep until the next 07:00 (strictly in the future), then report the day.
 * Tonight's rent is due first; if it can't be paid the player is evicted.
 */
function sleep(state: GameState, career: Career, lifestyle: Lifestyle, atHome: boolean, atFriend = false): GameState {
  let start = state;
  let rent = 0;
  let evicted = false;
  const home = homeById(state.home);
  if (home) {
    if (state.balance >= home.rentPerNight) {
      rent = home.rentPerNight;
      start = { ...state, balance: state.balance - rent, today: { ...state.today, expenses: state.today.expenses + rent } };
    } else {
      evicted = true;
      start = { ...state, home: null, furniture: storeAll(state.furniture) };
    }
  }
  const sleptHome = !!start.home && atHome;
  const rough = !sleptHome && !atFriend;
  const hungerRate = rough ? 1 : HOME_SLEEP_HUNGER_RATE;
  let next = tick(start, career, lifestyle, false, hungerRate, true);
  while (!(next.time.hour === WAKE_HOUR && next.time.minute === 0)) {
    next = tick(next, career, lifestyle, false, hungerRate, true);
  }
  // Rough sleep never leaves you fully rested
  const restored = sleptHome ? SLEEP_ENERGY.home : atFriend ? SLEEP_ENERGY.friend : SLEEP_ENERGY.rough;
  next = { ...next, needs: { ...next.needs, energy: Math.max(next.needs.energy, restored) } };
  const startOfDay = next.workMinutes - next.today.minutesWorked;
  const promoted = levelIndex(career, next.workMinutes) > levelIndex(career, startOfDay);
  const { income, expenses, minutesWorked } = next.today;
  return {
    ...next,
    fullness: rough ? Math.max(0, next.fullness - ROUGH_SLEEP_FULLNESS_LOSS) : next.fullness,
    today: emptyLedger(),
    summary: {
      income,
      expenses,
      minutesWorked,
      netChange: income - expenses,
      wakeDayOfWeek: next.time.dayOfWeek,
      rent,
      rough,
      atFriend: !sleptHome && atFriend,
      evicted,
      promotedTo: promoted ? careerLevel(career, next.workMinutes).title : null,
    },
  };
}

export function gameReducer(
  state: GameState,
  action: GameAction,
  career: Career,
  lifestyle: Lifestyle,
): GameState {
  switch (action.type) {
    case 'tick':
      return state.summary ? state : tick(state, career, lifestyle, action.atWorkplace);
    case 'sleep':
      return state.summary ? state : sleep(state, career, lifestyle, action.atHome, action.atFriend);
    case 'moveIn':
      return moveIn(state, action.homeId);
    case 'buyEquipment': {
      const item = equipmentById(action.id);
      if (!item || state.equipment.includes(item.id) || state.balance < item.price || state.summary) return state;
      return {
        ...state,
        equipment: [...state.equipment, item.id],
        balance: state.balance - item.price,
        today: { ...state.today, expenses: state.today.expenses + item.price },
      };
    }
    case 'workTask':
      return workTask(state, action.taskId, action.choice, action.atWorkplace, career);
    case 'socialise':
      return socialise(state, action.residentId, action.activity, career, lifestyle);
    case 'nightOut':
      return nightOut(state, action.residentId, career, lifestyle);
    case 'wait': {
      // Sitting on a park bench: time passes as it would anywhere (costs, hunger), off the clock for work.
      // A sit is applied in small steps as it plays out, so any whole number of minutes up to the longest option
      if (state.summary || !Number.isInteger(action.minutes) || action.minutes < 1 || action.minutes > MAX_WAIT) return state;
      let next = state;
      for (let i = 0; i < action.minutes; i++) next = tick(next, career, lifestyle, false);
      return { ...next, needs: addNeeds(next.needs, { fun: SIT_FUN_PER_MINUTE * action.minutes }) };
    }
    case 'travel':
      return travel(state, action.to, action.mode, career, lifestyle);
    case 'moveOut':
      return state.summary ? state : { ...state, home: null, furniture: storeAll(state.furniture) };
    case 'dismissSummary':
      return { ...state, summary: null };
    case 'eat':
      return eat(state, action.price, action.fullness, action.lift);
    case 'purchase':
      return purchase(state, action.price);
    case 'buyFurniture':
      return buyFurniture(state, action.itemId);
    case 'sellFurniture':
      return sellFurniture(state, action.uid);
    case 'placeFurniture':
      return placeFurniture(state, action.uid, action.at, action.rot);
    case 'storeFurniture':
      return state.summary ? state : { ...state, furniture: state.furniture.map((o) => (o.uid === action.uid ? { ...o, at: null } : o)) };
    case 'useFurniture':
      return operateFurniture(state, action.target, action.near, career, lifestyle);
    case 'exercise':
      return exercise(state, action.minutes, action.atPark, career, lifestyle);
  }
}
