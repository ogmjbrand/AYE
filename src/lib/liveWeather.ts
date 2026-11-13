/**
 * Real-world weather for each AYE city.
 *
 * Source: Open-Meteo (open-meteo.com, data CC BY 4.0), hourly, by each city's coordinates and in
 * its own time zone. It needs no API key, so nothing secret ever reaches the browser. When the
 * game is configured with Supabase it asks AYE's own `weather` Edge Function, which fetches and
 * caches for everyone (one upstream call per city per half hour, and the same answer for every
 * player in that city); otherwise it asks Open-Meteo directly.
 *
 * The game clock runs faster than real time, so the weather shown is the real weather for TODAY's
 * hour that matches the game clock in that city: at 14:00 game time in Lagos, Lagos's real
 * weather at 14:00 local time today. When game and real time line up, it's exactly what's outside.
 *
 * Failures never break the game: a city keeps its last real reading for up to 12 hours (shown as
 * 'cached'), and with nothing at all the game falls back to its own simulated weather.
 */
import type { Weather, WeatherKind } from './weather';

/** The hourly series we keep, aligned with `time` (local "YYYY-MM-DDTHH:00"). */
export interface HourlyWeather {
  time: string[];
  temperature: number[];
  humidity: number[];
  /** mm in the hour. */
  precipitation: number[];
  /** %. */
  cloud: number[];
  /** m. */
  visibility: number[];
  /** m/s. */
  windSpeed: number[];
  /** degrees the wind blows from. */
  windFrom: number[];
  /** WMO weather code. */
  code: number[];
}

export interface CityWeatherData {
  hourly: HourlyWeather;
  /** When it was fetched (ms since epoch). */
  fetchedAt: number;
}

/** Refresh a city this often (real time). */
export const REFRESH_MS = 30 * 60_000;
/** Keep using a reading for this long when the service can't be reached, labelled 'cached'. */
export const STALE_MS = 12 * 60 * 60_000;
/** Precipitation (mm/h) counted as full rain: a heavy tropical downpour. */
const HEAVY_RAIN_MM = 6;
const WET_PER_MINUTE = 1 / 20;
const DRY_PER_MINUTE = 1 / 120;

const HOURLY_FIELDS = 'temperature_2m,relative_humidity_2m,precipitation,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,weather_code';

/** Open-Meteo's forecast URL for a place (yesterday, today and tomorrow, hour by hour, local time). */
export function openMeteoUrl(lat: number, lon: number, timeZone: string): string {
  const q = new URLSearchParams({
    latitude: lat.toFixed(3), longitude: lon.toFixed(3), hourly: HOURLY_FIELDS,
    timezone: timeZone, wind_speed_unit: 'ms', past_days: '1', forecast_days: '2',
  });
  return `https://api.open-meteo.com/v1/forecast?${q}`;
}

/** Open-Meteo's JSON as our series; null if it isn't a usable response. */
export function parseOpenMeteo(json: unknown): HourlyWeather | null {
  const h = (json as { hourly?: Record<string, unknown> } | null)?.hourly;
  if (!h || !Array.isArray(h.time) || h.time.length === 0) return null;
  const n = h.time.length;
  const nums = (key: string, fallback: number) => {
    const a = Array.isArray(h[key]) ? (h[key] as unknown[]) : [];
    return Array.from({ length: n }, (_, i) => (typeof a[i] === 'number' && Number.isFinite(a[i]) ? (a[i] as number) : fallback));
  };
  return {
    time: (h.time as unknown[]).map(String),
    temperature: nums('temperature_2m', 25),
    humidity: nums('relative_humidity_2m', 70),
    precipitation: nums('precipitation', 0),
    cloud: nums('cloud_cover', 30),
    visibility: nums('visibility', 20000),
    windSpeed: nums('wind_speed_10m', 3),
    windFrom: nums('wind_direction_10m', 200),
    code: nums('weather_code', 0),
  };
}

/** Today's date ("YYYY-MM-DD") in a time zone. */
export function localDate(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

const thunderOf = (code: number) => (code === 96 || code === 99 ? 1 : code === 95 ? 0.6 : 0);
const rainOf = (mm: number, code: number) => {
  const r = Math.min(1, mm / HEAVY_RAIN_MM);
  // Drizzle and light showers still fall visibly
  const wetCode = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
  return mm > 0.05 || wetCode ? Math.max(r, 0.15) : 0;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Bearings interpolate the short way round (350° to 10° passes north). */
const lerpAngle = (a: number, b: number, t: number) => (a + ((((b - a) % 360) + 540) % 360 - 180) * t + 360) % 360;

/**
 * The real weather at `localHour` (0 … 24, fractional) of `date` ("YYYY-MM-DD", the city's local
 * date) from the hourly series, between the hours on either side. Null if that hour isn't covered.
 */
export function liveWeatherAt(h: HourlyWeather, date: string, localHour: number): Weather | null {
  const hour = Math.max(0, Math.min(23.999, localHour));
  const i = h.time.indexOf(`${date}T${String(Math.floor(hour)).padStart(2, '0')}:00`);
  if (i < 0) return null;
  const j = Math.min(h.time.length - 1, i + 1);
  const t = hour - Math.floor(hour);
  const at = (a: number[]) => lerp(a[i], a[j], t);
  const code = t < 0.5 ? h.code[i] : h.code[j];
  const rain = lerp(rainOf(h.precipitation[i], h.code[i]), rainOf(h.precipitation[j], h.code[j]), t);
  const cloud = Math.min(1, at(h.cloud) / 100);
  const thunder = lerp(thunderOf(h.code[i]), thunderOf(h.code[j]), t);
  const visibility = at(h.visibility);
  const fog = code === 45 || code === 48 ? Math.max(0.6, 1 - visibility / 1000) : Math.max(0, Math.min(1, 1 - visibility / 1000));
  // How wet the streets are: run the last six hours of real rain forward, ten minutes at a time
  let wetness = 0;
  for (let k = Math.max(0, i - 6); k <= i; k++) {
    const r = rainOf(h.precipitation[k], h.code[k]);
    const minutes = k === i ? t * 60 : 60;
    wetness = r > 0.05 ? Math.min(1, wetness + WET_PER_MINUTE * minutes * r * 1.5) : Math.max(0, wetness - DRY_PER_MINUTE * minutes);
  }
  const kind: WeatherKind = thunder > 0.3 ? 'storm' : rain > 0.05 ? 'rain' : cloud > 0.55 ? 'cloudy' : 'clear';
  return {
    kind,
    rain: Math.round(rain * 1000) / 1000,
    // Rain needs cloud: never a downpour from a clear sky, however the hours average
    cloud: Math.max(cloud, rain > 0.05 ? 0.75 : 0, thunder > 0.3 ? 0.95 : 0),
    wetness: Math.round(wetness * 1000) / 1000,
    temperature: Math.round(at(h.temperature) * 10) / 10,
    humidity: Math.min(1, at(h.humidity) / 100),
    windSpeed: Math.round(at(h.windSpeed) * 10) / 10,
    windFrom: Math.round(lerpAngle(h.windFrom[i], h.windFrom[j], t)),
    visibility: Math.round(visibility),
    fog: Math.round(fog * 100) / 100,
    thunder,
    source: 'live',
  };
}

// ——— Fetching and caching ———

export interface CityPlace { id: string; lat: number; lon: number; timeZone: string }

const memory = new Map<string, CityWeatherData>();
/** The last failed attempt per city: wait RETRY_MS before trying again. */
const failedAt = new Map<string, number>();
export const RETRY_MS = 5 * 60_000;
const inFlight = new Map<string, Promise<CityWeatherData | null>>();
const STORE_KEY = (id: string) => `aye_weather:${id}`;

/**
 * Where the game asks for weather, in order: AYE's Edge Function when Supabase is set up (shared and
 * cached for every player), then Open-Meteo itself (no key needed), so the real weather still
 * arrives if AYE's service is down or not deployed.
 */
function weatherSources(c: CityPlace): { url: string; headers: Record<string, string> }[] {
  const direct = { url: openMeteoUrl(c.lat, c.lon, c.timeZone), headers: {} };
  const env = import.meta.env as Record<string, string | undefined>;
  const base = env.VITE_SUPABASE_URL?.trim();
  const key = (env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY)?.trim();
  if (base && key && /^https:\/\//.test(base)) {
    const q = new URLSearchParams({ city: c.id, lat: String(c.lat), lon: String(c.lon), tz: c.timeZone });
    return [{ url: `${base.replace(/\/$/, '')}/functions/v1/weather?${q}`, headers: { apikey: key, Authorization: `Bearer ${key}` } }, direct];
  }
  return [direct];
}

function readStored(id: string): CityWeatherData | null {
  try {
    const raw = localStorage.getItem(STORE_KEY(id));
    if (!raw) return null;
    const v = JSON.parse(raw) as CityWeatherData;
    const hourly = v && typeof v.fetchedAt === 'number' && v.hourly ? parseOpenMeteo({ hourly: toOpenMeteo(v.hourly) }) : null;
    return hourly ? { hourly, fetchedAt: v.fetchedAt } : null;
  } catch {
    return null;
  }
}
const toOpenMeteo = (h: HourlyWeather) => ({
  time: h.time, temperature_2m: h.temperature, relative_humidity_2m: h.humidity, precipitation: h.precipitation, cloud_cover: h.cloud,
  visibility: h.visibility, wind_speed_10m: h.windSpeed, wind_direction_10m: h.windFrom, weather_code: h.code,
});

/** The city's weather data as it stands: in memory, else saved from an earlier visit. */
export function cachedCityWeather(id: string): CityWeatherData | null {
  const m = memory.get(id);
  if (m) return m;
  const s = readStored(id);
  if (s) memory.set(id, s);
  return s;
}

/**
 * Fetch a city's weather if it's due (never more than once per REFRESH_MS, and one request at a
 * time per city). Resolves to the freshest data available, or null if there's none at all.
 */
export function refreshCityWeather(c: CityPlace, now = Date.now(), fetcher: typeof fetch = fetch): Promise<CityWeatherData | null> {
  const have = cachedCityWeather(c.id);
  if (have && now - have.fetchedAt < REFRESH_MS) return Promise.resolve(have);
  const pending = inFlight.get(c.id);
  if (pending) return pending;
  if (now - (failedAt.get(c.id) ?? -Infinity) < RETRY_MS) return Promise.resolve(have);
  const ask = async () => {
    for (const { url, headers } of weatherSources(c)) {
      try {
        const r = await fetcher(url, { headers });
        const hourly = r.ok ? parseOpenMeteo(await r.json()) : null;
        if (hourly) return hourly;
      } catch { /* try the next source */ }
    }
    throw new Error('weather: no source answered');
  };
  const p = ask()
    .then((hourly) => {
      const data = { hourly, fetchedAt: now };
      memory.set(c.id, data);
      failedAt.delete(c.id);
      try { localStorage.setItem(STORE_KEY(c.id), JSON.stringify(data)); } catch { /* storage full or blocked: memory only */ }
      return data;
    })
    .catch(() => {
      // Failed: keep what we had, and don't ask again for a while, so a dead connection isn't hammered
      failedAt.set(c.id, now);
      return have;
    })
    .finally(() => inFlight.delete(c.id));
  inFlight.set(c.id, p);
  return p;
}

/** The real weather for a city at a game time, if we have data covering it ('live', or 'cached' once old). */
export function cityWeatherAt(data: CityWeatherData | null, timeZone: string, localHour: number, now = Date.now()): Weather | null {
  if (!data || now - data.fetchedAt > STALE_MS) return null;
  const w = liveWeatherAt(data.hourly, localDate(new Date(now), timeZone), localHour);
  if (!w) return null;
  return now - data.fetchedAt > REFRESH_MS * 2 ? { ...w, source: 'cached' } : w;
}

/** For tests: forget everything held in memory. */
export function clearWeatherMemory() {
  memory.clear();
  inFlight.clear();
  failedAt.clear();
}
