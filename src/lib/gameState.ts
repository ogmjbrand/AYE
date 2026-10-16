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
 *     sleeping rough, which leaves you hungrier.
 */
import type { Career, Lifestyle } from '../components/CharacterCreation';
import { ROUGH_SLEEP_FULLNESS_LOSS, homeById, moveInFee } from './homes';

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
  /** Slept somewhere other than their own home. */
  rough: boolean;
  /** Lost their home because they couldn't pay the night's rent. */
  evicted: boolean;
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
}

export type GameAction =
  | { type: 'tick'; atWorkplace: boolean }
  | { type: 'sleep'; atHome: boolean }
  | { type: 'moveIn'; homeId: string }
  | { type: 'moveOut' }
  | { type: 'eat'; price: number; fullness: number }
  | { type: 'purchase'; price: number }
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

export function hungerLabel(fullness: number): 'Full' | 'Fed' | 'Peckish' | 'Hungry' | 'Starving' {
  if (fullness >= 80) return 'Full';
  if (fullness >= 50) return 'Fed';
  if (fullness >= HUNGRY_THRESHOLD) return 'Peckish';
  if (fullness > 0) return 'Hungry';
  return 'Starving';
}

/** Pay for a meal and raise fullness. Refused if the player can't afford it. */
function eat(state: GameState, price: number, gain: number): GameState {
  if (!(price > 0) || !(gain > 0) || state.balance < price || state.summary) return state;
  return {
    ...state,
    balance: state.balance - price,
    fullness: Math.min(100, state.fullness + gain),
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
  return { time, balance, today: emptyLedger(), minutesWorkedThisHour: 0, fullness: 100, summary: null, home: null };
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
function tick(state: GameState, career: Career, lifestyle: Lifestyle, atWorkplace: boolean): GameState {
  const worked = atWorkplace && career !== 'none' && isWorkingHours(state.time) ? 1 : 0;
  const pay = worked * (state.fullness < HUNGRY_THRESHOLD ? 0.5 : 1);
  const minutesWorkedThisHour = state.minutesWorkedThisHour + pay;
  const fullness = Math.max(0, state.fullness - FULLNESS_LOSS_PER_MINUTE);
  const time = advanceMinute(state.time);
  const today = { ...state.today, minutesWorked: state.today.minutesWorked + worked };
  if (time.minute !== 0) return { ...state, time, today, minutesWorkedThisHour, fullness };

  const income = Math.round((HOURLY_WAGE[career] * minutesWorkedThisHour) / 60);
  const afterIncome = state.balance + income;
  const expenses = Math.min(HOURLY_LIVING_COST[lifestyle], afterIncome);

  return {
    ...state,
    time,
    balance: afterIncome - expenses,
    today: { ...today, income: today.income + income, expenses: today.expenses + expenses },
    minutesWorkedThisHour: 0,
    fullness,
  };
}

/** Rents a home: pays the move-in fee. Moving from another home gives up the old one. */
function moveIn(state: GameState, homeId: string): GameState {
  const home = homeById(homeId);
  if (!home || state.home === homeId || state.summary) return state;
  const fee = moveInFee(home);
  if (state.balance < fee) return state;
  return { ...state, home: homeId, balance: state.balance - fee, today: { ...state.today, expenses: state.today.expenses + fee } };
}

/**
 * Sleep until the next 07:00 (strictly in the future), then report the day.
 * Tonight's rent is due first; if it can't be paid the player is evicted.
 */
function sleep(state: GameState, career: Career, lifestyle: Lifestyle, atHome: boolean): GameState {
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
      start = { ...state, home: null };
    }
  }
  const rough = !(start.home && atHome);
  let next = tick(start, career, lifestyle, false);
  while (!(next.time.hour === WAKE_HOUR && next.time.minute === 0)) {
    next = tick(next, career, lifestyle, false);
  }
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
      evicted,
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
      return state.summary ? state : sleep(state, career, lifestyle, action.atHome);
    case 'moveIn':
      return moveIn(state, action.homeId);
    case 'moveOut':
      return state.summary ? state : { ...state, home: null };
    case 'dismissSummary':
      return { ...state, summary: null };
    case 'eat':
      return eat(state, action.price, action.fullness);
    case 'purchase':
      return purchase(state, action.price);
  }
}
