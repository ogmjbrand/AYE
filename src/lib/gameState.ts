/**
 * Game clock and day-to-day economy, as pure functions so they can be tested
 * and so the clock, the balance and the daily summary can never drift apart.
 *
 * Rules (tunable):
 *   - The clock advances one game minute per tick.
 *   - Each time a game hour ends, the player is paid their career's hourly wage
 *     if that hour was within working hours, and pays their lifestyle's hourly
 *     living cost.
 *   - The balance never goes below zero.
 *   - Resting sleeps until the next 07:00, closes the day's ledger and reports it.
 */
import type { Career, Lifestyle } from '../components/CharacterCreation';

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
}

export interface DaySummary extends DayLedger {
  netChange: number;
  /** The day the player wakes up on (0 = Monday). */
  wakeDayOfWeek: number;
}

export interface GameState {
  time: GameTime;
  balance: number;
  /** Money in and out since the player last woke up. */
  today: DayLedger;
  /** Set after resting; the clock is paused until it is dismissed. */
  summary: DaySummary | null;
}

export type GameAction = { type: 'tick' } | { type: 'sleep' } | { type: 'dismissSummary' };

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
  return { time, balance, today: { income: 0, expenses: 0 }, summary: null };
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

/** Advance one minute; when an hour ends, settle its wage and living cost. */
function tick(state: GameState, career: Career, lifestyle: Lifestyle): GameState {
  const time = advanceMinute(state.time);
  if (time.minute !== 0) return { ...state, time };

  const endedHour = state.time.hour;
  const income = isWorkingHours({ hour: endedHour }) ? HOURLY_WAGE[career] : 0;
  const afterIncome = state.balance + income;
  const expenses = Math.min(HOURLY_LIVING_COST[lifestyle], afterIncome);

  return {
    ...state,
    time,
    balance: afterIncome - expenses,
    today: { income: state.today.income + income, expenses: state.today.expenses + expenses },
  };
}

/** Sleep until the next 07:00 (strictly in the future), then report the day. */
function sleep(state: GameState, career: Career, lifestyle: Lifestyle): GameState {
  let next = tick(state, career, lifestyle);
  while (!(next.time.hour === WAKE_HOUR && next.time.minute === 0)) {
    next = tick(next, career, lifestyle);
  }
  const { income, expenses } = next.today;
  return {
    ...next,
    today: { income: 0, expenses: 0 },
    summary: { income, expenses, netChange: income - expenses, wakeDayOfWeek: next.time.dayOfWeek },
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
      return state.summary ? state : tick(state, career, lifestyle);
    case 'sleep':
      return state.summary ? state : sleep(state, career, lifestyle);
    case 'dismissSummary':
      return { ...state, summary: null };
  }
}
