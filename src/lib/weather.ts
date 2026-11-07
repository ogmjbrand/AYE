/**
 * Day-to-day weather, independent of time of day. Pure and deterministic
 * (same game day always gives the same weather) so it's testable without a
 * GPU and reproducible across a save, like timeOfDay.ts's lightingAt.
 */
export type WeatherCondition = 'clear' | 'overcast' | 'rain';

const RAIN_CHANCE = 0.08;
/** Cumulative with RAIN_CHANCE: the slice of rolls that land on overcast. */
const OVERCAST_CHANCE = 0.28;

/** Stable pseudo-random roll in [0, 1) for a given day number. */
function dayRoll(day: number): number {
  const s = Math.sin(day * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

export function weatherForDay(day: number): WeatherCondition {
  const roll = dayRoll(day);
  if (roll < RAIN_CHANCE) return 'rain';
  if (roll < OVERCAST_CHANCE) return 'overcast';
  return 'clear';
}

const CONDITIONS: readonly WeatherCondition[] = ['clear', 'overcast', 'rain'];

/** A `?weather=rain` query override, dev builds only: lets weather be forced for visual testing. */
export function parseWeatherOverride(search: string, dev: boolean): WeatherCondition | null {
  if (!dev) return null;
  const v = new URLSearchParams(search).get('weather');
  return (CONDITIONS as readonly string[]).includes(v ?? '') ? (v as WeatherCondition) : null;
}

/** How strongly each condition dims/flattens daylight and dampens surfaces: 0 dry/clear, 1 full rain. */
const CONDITION_STRENGTH: Record<WeatherCondition, number> = { clear: 0, overcast: 0.6, rain: 1 };

const MINUTES_PER_DAY = 1440;
/** Minutes either side of midnight weather blends over, so a day's change is never a hard cut mid-play. */
const TRANSITION_MINUTES = 90;

function conditionForDay(day: number, override: WeatherCondition | null): WeatherCondition {
  return override ?? weatherForDay(day);
}

/** Blends a per-condition value from yesterday's weather into today's over the first TRANSITION_MINUTES of the day. */
function blendAcrossMidnight(totalMinutes: number, override: WeatherCondition | null, strengthOf: (c: WeatherCondition) => number): number {
  const day = Math.floor(totalMinutes / MINUTES_PER_DAY);
  const minuteOfDay = totalMinutes - day * MINUTES_PER_DAY;
  const today = strengthOf(conditionForDay(day, override));
  if (minuteOfDay >= TRANSITION_MINUTES) return today;
  const yesterday = strengthOf(conditionForDay(day - 1, override));
  return yesterday + (today - yesterday) * (minuteOfDay / TRANSITION_MINUTES);
}

/**
 * Continuous 0..1 cloud cover at this moment, smoothly crossing from yesterday's weather into
 * today's rather than cutting instantly at midnight (a player can be awake and playing through it).
 * `override` forces every day to one condition (the dev `?weather=` query), suppressing the blend.
 */
export function overcastAt(totalMinutes: number, override: WeatherCondition | null = null): number {
  return blendAcrossMidnight(totalMinutes, override, (c) => CONDITION_STRENGTH[c]);
}

/** Continuous 0..1 rain amount at this moment. A separate scale from overcastAt: overcast has cloud cover but no rain. */
export function rainAmountAt(totalMinutes: number, override: WeatherCondition | null = null): number {
  return blendAcrossMidnight(totalMinutes, override, (c) => (c === 'rain' ? 1 : 0));
}
