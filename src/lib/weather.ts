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
export function weatherOverride(search: string, dev: boolean): WeatherCondition | null {
  if (!dev) return null;
  const v = new URLSearchParams(search).get('weather');
  return (CONDITIONS as readonly string[]).includes(v ?? '') ? (v as WeatherCondition) : null;
}
