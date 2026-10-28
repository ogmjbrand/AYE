import type { DayLedger, GameTime } from './gameState';
import { WAKE_HOUR } from './gameState';

/** Actions the player has taken since waking that the ledger does not already record. */
export interface GoalFlags {
  /** Day key these flags belong to (see goalDay). */
  day: number;
  /** Outfit worn when the day began, so a later change counts as getting dressed. */
  outfit: string;
  dressed: boolean;
  downtown: boolean;
}

export interface DailyGoal {
  id: 'ready' | 'downtown' | 'income' | 'buy' | 'rest';
  label: string;
  done: boolean;
}

/** A game day runs from waking at 07:00, matching the day ledger that resets when the player sleeps. */
export function goalDay(time: Pick<GameTime, 'totalMinutes'>): number {
  return Math.floor((time.totalMinutes - WAKE_HOUR * 60) / 1440);
}

export function emptyFlags(day: number, outfit = ''): GoalFlags {
  return { day, outfit, dressed: false, downtown: false };
}

/** Rolls flags over to a new day and records what the player has done since the last update. */
export function updateFlags(flags: GoalFlags | null, day: number, outfit: string, inDowntown: boolean): GoalFlags {
  const base = flags && flags.day === day ? flags : emptyFlags(day, outfit);
  const next = {
    ...base,
    dressed: base.dressed || base.outfit !== outfit,
    downtown: base.downtown || inDowntown,
  };
  return next.dressed === base.dressed && next.downtown === base.downtown && base === flags ? flags : next;
}

export function parseFlags(raw: string | null): GoalFlags | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<GoalFlags>;
    return Number.isInteger(v.day) && typeof v.outfit === 'string' && typeof v.dressed === 'boolean' && typeof v.downtown === 'boolean'
      ? { day: v.day as number, outfit: v.outfit, dressed: v.dressed, downtown: v.downtown }
      : null;
  } catch {
    return null;
  }
}

/** The base of the in-game calendar: the opening Wednesday (game day 0). */
const CALENDAR_START = Date.UTC(2026, 9, 14);

export function formatGameDate(time: Pick<GameTime, 'totalMinutes'>): string {
  const date = new Date(CALENDAR_START + Math.floor(time.totalMinutes / 1440) * 86_400_000);
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(date)
    .replace(',', '');
}

export function dailyGoals(flags: GoalFlags, today: DayLedger, hasWorked: boolean, summaryShown: boolean): DailyGoal[] {
  return [
    { id: 'ready', label: 'Get ready for work', done: flags.dressed || hasWorked },
    { id: 'downtown', label: 'Visit Downtown', done: flags.downtown },
    { id: 'income', label: 'Earn income', done: today.income > 0 },
    { id: 'buy', label: 'Buy something nice', done: (today.purchases ?? 0) > 0 },
    { id: 'rest', label: 'Rest and end the day', done: summaryShown },
  ];
}
