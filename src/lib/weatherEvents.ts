/**
 * Special gameplay weather on top of the real weather, and the order everything is decided in.
 *
 * Priority, highest first:
 *   1. a development override (?weather=rain in the dev server only, for testing);
 *   2. a special event in this city right now (severe thunderstorm, extreme rain with flooding,
 *      dense fog, strong wind), only inside its zone (one city) and its time window;
 *   3. the real weather for this city and hour (lib/liveWeather.ts): 'live', or 'cached';
 *   4. AYE's own simulated weather (lib/weather.ts): offline, no data, or a city the service lacks.
 *
 * Events are rare, and fade in and out over half an hour of game time, so when one ends the real
 * weather returns smoothly. They're decided from the city and the game day alone, so every player
 * in the same city sees the same event at the same time (no server needed to agree on it). The
 * result always says which it is: `source` 'event' with the event's name, never passed off as real.
 */
import type { Weather, WeatherKind } from './weather';

export type WeatherEventId = 'severe-storm' | 'extreme-rain' | 'dense-fog' | 'strong-wind';

export interface WeatherEventSpec {
  id: WeatherEventId;
  label: string;
  /** Game minutes it lasts, start hour range (local game hours), chance per city per game day. */
  minutes: number;
  hours: readonly [number, number];
  chance: number;
  /** What it turns the weather into at full strength. */
  weather: Partial<Weather> & { kind: WeatherKind };
}

export const WEATHER_EVENTS: readonly WeatherEventSpec[] = [
  { id: 'severe-storm', label: 'Severe thunderstorm', minutes: 150, hours: [13, 20], chance: 0.05,
    weather: { kind: 'storm', rain: 1, cloud: 1, thunder: 1, windSpeed: 16, visibility: 2500, fog: 0 } },
  { id: 'extreme-rain', label: 'Extreme rainfall: flooding', minutes: 180, hours: [9, 18], chance: 0.03,
    weather: { kind: 'rain', rain: 1, cloud: 1, thunder: 0.3, windSpeed: 9, visibility: 1800, fog: 0.15 } },
  { id: 'dense-fog', label: 'Dense fog', minutes: 180, hours: [4, 7], chance: 0.05,
    weather: { kind: 'cloudy', rain: 0, cloud: 0.9, thunder: 0, windSpeed: 1, visibility: 200, fog: 1 } },
  { id: 'strong-wind', label: 'Strong wind', minutes: 150, hours: [11, 17], chance: 0.04,
    weather: { kind: 'cloudy', rain: 0, cloud: 0.6, thunder: 0, windSpeed: 18, visibility: 15000, fog: 0 } },
];

/** Game minutes an event takes to build up, and to clear back to the real weather. */
export const EVENT_RAMP = 30;
const WET_PER_MINUTE = 1 / 20;
const DRY_PER_MINUTE = 1 / 120;

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const roll = (s: string) => hash(s) / 4294967296;

export interface ActiveEvent {
  spec: WeatherEventSpec;
  /** Game minutes (absolute) it starts and ends. */
  start: number;
  end: number;
}

/** The event (if any) a city has on a game day: at most one a day, the same for everyone. */
export function eventForDay(districtId: string, day: number): ActiveEvent | null {
  let r = roll(`${districtId}:${day}:event`);
  for (const spec of WEATHER_EVENTS) {
    if (r < spec.chance) {
      const [from, to] = spec.hours;
      const startHour = from + roll(`${districtId}:${day}:${spec.id}:at`) * (to - from);
      const start = day * 1440 + Math.round(startHour * 60);
      return { spec, start, end: start + spec.minutes };
    }
    r -= spec.chance;
  }
  return null;
}

/** The event affecting a city at a game minute, and how strongly (0 … 1, with the ramps). */
export function eventAt(districtId: string, minute: number): { event: ActiveEvent; strength: number } | null {
  const day = Math.floor(minute / 1440);
  // Today's, or one that started late yesterday and is still going
  for (const d of [day, day - 1]) {
    const e = eventForDay(districtId, d);
    if (!e || minute < e.start || minute > e.end + EVENT_RAMP) continue;
    const strength = Math.min(1, (minute - e.start) / EVENT_RAMP, (e.end + EVENT_RAMP - minute) / EVENT_RAMP);
    if (strength > 0) return { event: e, strength: Math.max(0, strength) };
  }
  return null;
}

const mix = (a: number | undefined, b: number | undefined, t: number, fallback = 0) => {
  const x = a ?? fallback, y = b ?? x;
  return x + (y - x) * t;
};

/** Blend the base weather towards an event's weather by `t` (0 … 1). Numbers move smoothly; the kind flips halfway. */
export function blendWeather(base: Weather, target: Partial<Weather> & { kind: WeatherKind }, t: number): Weather {
  return {
    ...base,
    kind: t >= 0.5 ? target.kind : base.kind,
    rain: mix(base.rain, target.rain, t),
    cloud: mix(base.cloud, target.cloud, t),
    thunder: mix(base.thunder, target.thunder, t),
    windSpeed: mix(base.windSpeed, target.windSpeed, t, 3),
    visibility: mix(base.visibility, target.visibility, t, 20000),
    fog: mix(base.fog, target.fog, t),
  };
}

/** How wet an event has made the streets by `minute`: soaking during its rain, drying after. */
function eventWetness(e: ActiveEvent, minute: number): number {
  const rain = e.spec.weather.rain ?? 0;
  if (rain <= 0 || minute < e.start) return 0;
  const raining = Math.min(minute, e.end) - e.start;
  const peak = Math.min(1, raining * WET_PER_MINUTE * rain * 1.5);
  return minute <= e.end ? peak : Math.max(0, peak - (minute - e.end) * DRY_PER_MINUTE);
}

export type DevWeather = WeatherKind | 'fog' | 'wind';

/** The development override from the address bar (?weather=rain), only in the dev server. */
export function devWeatherOverride(search: string, dev: boolean): DevWeather | null {
  if (!dev) return null;
  const v = new URLSearchParams(search).get('weather');
  return v === 'clear' || v === 'cloudy' || v === 'rain' || v === 'storm' || v === 'fog' || v === 'wind' ? v : null;
}

const DEV: Record<DevWeather, Partial<Weather> & { kind: WeatherKind }> = {
  clear: { kind: 'clear', rain: 0, cloud: 0.05, thunder: 0, fog: 0, visibility: 25000, windSpeed: 2 },
  cloudy: { kind: 'cloudy', rain: 0, cloud: 0.8, thunder: 0, fog: 0, visibility: 15000, windSpeed: 5 },
  rain: { kind: 'rain', rain: 0.7, cloud: 0.9, thunder: 0, fog: 0, visibility: 6000, windSpeed: 6, wetness: 1 },
  storm: { kind: 'storm', rain: 1, cloud: 1, thunder: 1, fog: 0, visibility: 2500, windSpeed: 15, wetness: 1 },
  fog: { kind: 'cloudy', rain: 0, cloud: 0.9, thunder: 0, fog: 1, visibility: 200, windSpeed: 1 },
  wind: { kind: 'cloudy', rain: 0, cloud: 0.5, thunder: 0, fog: 0, visibility: 15000, windSpeed: 18 },
};

/**
 * The weather a city has right now, by the priority above. `live` is the real weather for this
 * city and hour (null if none); `simulated` is AYE's own, always available.
 */
export function resolveWeather(districtId: string, minute: number, live: Weather | null, simulated: Weather, dev: DevWeather | null = null): Weather {
  if (dev) return { ...simulated, ...DEV[dev], wetness: DEV[dev].wetness ?? simulated.wetness, source: 'simulated', event: { id: `dev-${dev}`, label: `Test weather: ${dev}` } };
  const base = live ?? simulated;
  const ev = eventAt(districtId, minute);
  if (!ev) return base;
  const { event, strength } = ev;
  const blended = blendWeather(base, event.spec.weather, strength);
  return {
    ...blended,
    wetness: Math.max(base.wetness, eventWetness(event, minute)),
    source: 'event',
    event: { id: event.spec.id, label: event.spec.label },
  };
}
