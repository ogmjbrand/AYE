/**
 * Weather. Every district has its own sky, decided in three-hour blocks from
 * the district and the block's place in time, so it's the same for everyone
 * who plays the same save and a server can run the same rules.
 *
 *   - Each block is clear, cloudy, rain or a storm. A block is weighted by
 *     the one before it, so a rainy afternoon tends to stay grey rather than
 *     flicking between sun and storm.
 *   - Rain fades in and out over the first and last half hour of its block.
 *   - Roads and pavements get wet while it rains (wetness 0 … 1) and dry over
 *     about two hours afterwards, so streets still shine after a shower.
 *   - Some cities are wetter than others (by their climate), and a little
 *     drier at night.
 */

export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'storm';

export interface Weather {
  kind: WeatherKind;
  /** How hard it's raining right now, 0 … 1. */
  rain: number;
  /** Cloud cover, 0 … 1: dims the sun and greys the sky. */
  cloud: number;
  /** How wet the ground is, 0 … 1. */
  wetness: number;
}

export const BLOCK_MINUTES = 180;
const FADE_MINUTES = 30;
/** Wetness lost per minute once the rain stops: dry in about two hours. */
const DRY_PER_MINUTE = 1 / 120;
/** Wetness gained per minute of full rain. */
const WET_PER_MINUTE = 1 / 20;

export const WEATHER_LABEL: Record<WeatherKind, string> = { clear: 'Clear', cloudy: 'Cloudy', rain: 'Rain', storm: 'Thunderstorm' };
const CLOUD: Record<WeatherKind, number> = { clear: 0.1, cloudy: 0.6, rain: 0.85, storm: 1 };
const RAIN: Record<WeatherKind, number> = { clear: 0, cloudy: 0, rain: 0.6, storm: 1 };

/** How wet a district's climate is: 0 (dry) … 1 (very wet). Unknown districts are moderate. */
const CLIMATE: Record<string, number> = {
  'lagos.marina': 0.55,
  'accra.osu': 0.45,
  'plan.avenue': 0.4,
};

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const roll = (s: string) => hash(s) / 4294967296;

/** The weather for a three-hour block. */
export function blockKind(districtId: string, block: number): WeatherKind {
  const wet = CLIMATE[districtId] ?? 0.45;
  // The block before nudges this one: weather comes in spells
  const before = block > 0 ? baseKind(districtId, block - 1, wet) : 'clear';
  const r = roll(`${districtId}:${block}:w`);
  const hour = ((block * BLOCK_MINUTES) / 60) % 24;
  const night = hour < 6 || hour >= 21 ? 0.8 : 1;
  const rainy = (before === 'rain' || before === 'storm' ? 0.55 : 0.22) * wet * 2 * night;
  if (r < rainy * 0.25) return 'storm';
  if (r < rainy) return 'rain';
  if (r < rainy + 0.28) return 'cloudy';
  return 'clear';
}

function baseKind(districtId: string, block: number, wet: number): WeatherKind {
  const r = roll(`${districtId}:${block}:w`);
  const rainy = 0.3 * wet * 2;
  return r < rainy * 0.25 ? 'storm' : r < rainy ? 'rain' : r < rainy + 0.28 ? 'cloudy' : 'clear';
}

/** Rain falling at this minute: the block's rain, faded in and out at its ends. */
function rainAt(districtId: string, minute: number): number {
  const block = Math.floor(minute / BLOCK_MINUTES);
  const kind = blockKind(districtId, block);
  const into = minute - block * BLOCK_MINUTES;
  const fade = Math.min(1, into / FADE_MINUTES, (BLOCK_MINUTES - into) / FADE_MINUTES);
  return RAIN[kind] * Math.max(0, fade);
}

/** The weather in a district at a game minute. */
export function weatherAt(districtId: string, minute: number): Weather {
  const m = Math.max(0, Math.floor(minute));
  const block = Math.floor(m / BLOCK_MINUTES);
  const kind = blockKind(districtId, block);
  // Wetness: run the last few hours forward in 10-minute steps (cheap, and stable for a given minute)
  let wetness = 0;
  const start = Math.max(0, m - 6 * 60);
  for (let t = start; t <= m; t += 10) {
    const r = rainAt(districtId, t);
    wetness = r > 0.05 ? Math.min(1, wetness + WET_PER_MINUTE * 10 * r * 1.5) : Math.max(0, wetness - DRY_PER_MINUTE * 10);
  }
  return { kind, rain: rainAt(districtId, m), cloud: CLOUD[kind], wetness: Math.round(wetness * 1000) / 1000 };
}
