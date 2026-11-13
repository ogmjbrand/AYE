import { afterEach, describe, expect, it, vi } from 'vitest';
import { REFRESH_MS, RETRY_MS, STALE_MS, cityWeatherAt, clearWeatherMemory, liveWeatherAt, localDate, openMeteoUrl, parseOpenMeteo, refreshCityWeather, type HourlyWeather } from './liveWeather';
import { dayOfYear, solarPosition, sunTimes, sunVector } from './sun';
import { EVENT_RAMP, WEATHER_EVENTS, devWeatherOverride, eventAt, eventForDay, resolveWeather } from './weatherEvents';
import { weatherAt, type Weather } from './weather';
import { lightingAt } from '../world/timeOfDay';
import { nextStrike, strikeBrightness } from './lightning';
import { thunderDelay, thunderLevel } from './weatherAudio';
import { outInWeather } from './streetLife';
import { roofOver } from './rainCover';
import { DANFO_SIZE } from './world';

/** An Open-Meteo-shaped response for one city: 72 hours from yesterday 00:00, each hour from `hour`. */
function openMeteo(date: string, hour: (h: number) => Partial<Record<'t' | 'rh' | 'mm' | 'cloud' | 'vis' | 'ws' | 'wd' | 'code', number>>) {
  const [y, m, d] = date.split('-').map(Number);
  const time: string[] = [], cols: Record<string, number[]> = { temperature_2m: [], relative_humidity_2m: [], precipitation: [], cloud_cover: [], visibility: [], wind_speed_10m: [], wind_direction_10m: [], weather_code: [] };
  for (let i = 0; i < 72; i++) {
    const day = new Date(Date.UTC(y, m - 1, d - 1 + Math.floor(i / 24)));
    time.push(`${day.toISOString().slice(0, 10)}T${String(i % 24).padStart(2, '0')}:00`);
    const v = hour(i - 24); // hours from today's midnight
    cols.temperature_2m.push(v.t ?? 26); cols.relative_humidity_2m.push(v.rh ?? 70); cols.precipitation.push(v.mm ?? 0);
    cols.cloud_cover.push(v.cloud ?? 10); cols.visibility.push(v.vis ?? 24000); cols.wind_speed_10m.push(v.ws ?? 3);
    cols.wind_direction_10m.push(v.wd ?? 220); cols.weather_code.push(v.code ?? 0);
  }
  return { latitude: 6.45, longitude: 3.4, timezone: 'Africa/Lagos', hourly: { time, ...cols } };
}
const TODAY = '2026-11-13';
const series = (fn: Parameters<typeof openMeteo>[1]) => parseOpenMeteo(openMeteo(TODAY, fn)) as HourlyWeather;

afterEach(() => { clearWeatherMemory(); vi.restoreAllMocks(); try { localStorage.clear(); } catch { /* none in node */ } });

describe('real-world weather', () => {
  it('1. sunny Lagos: clear, warm, dry, live', () => {
    const w = liveWeatherAt(series(() => ({ t: 31, cloud: 5 })), TODAY, 13)!;
    expect(w).toMatchObject({ kind: 'clear', rain: 0, source: 'live', temperature: 31 });
    expect(w.cloud).toBeLessThan(0.1);
    expect(w.wetness).toBe(0);
  });

  it('2. rainy Lagos: rain at its real strength, the streets wet after an hour of it', () => {
    const h = series((i) => (i >= 12 ? { mm: 4, cloud: 95, code: 63 } : {}));
    const w = liveWeatherAt(h, TODAY, 14)!;
    expect(w.kind).toBe('rain');
    expect(w.rain).toBeCloseTo(4 / 6, 2);
    expect(w.cloud).toBeGreaterThan(0.9);
    expect(w.wetness).toBeGreaterThan(0.9);
    // Drizzle still falls visibly
    expect(liveWeatherAt(series(() => ({ mm: 0.1, cloud: 90, code: 51 })), TODAY, 10)!.rain).toBeGreaterThanOrEqual(0.15);
  });

  it('3. cloudy London: overcast and cool, no rain', () => {
    const w = liveWeatherAt(series(() => ({ t: 9, cloud: 88, code: 3 })), TODAY, 11)!;
    expect(w).toMatchObject({ kind: 'cloudy', rain: 0, temperature: 9 });
    expect(w.cloud).toBeCloseTo(0.88, 2);
  });

  it('6. a thunderstorm: storm, lightning, strong wind', () => {
    const w = liveWeatherAt(series(() => ({ mm: 9, cloud: 100, code: 95, ws: 14 })), TODAY, 17)!;
    expect(w.kind).toBe('storm');
    expect(w.thunder).toBeGreaterThan(0.5);
    expect(w.rain).toBe(1);
    expect(w.windSpeed).toBe(14);
  });

  it('7. rain turning to sunshine moves smoothly, and the streets stay wet for a while', () => {
    const h = series((i) => (i < 15 ? { mm: 5, cloud: 95, code: 63 } : { cloud: 5 }));
    const during = liveWeatherAt(h, TODAY, 14.0)!, mid = liveWeatherAt(h, TODAY, 14.5)!, after = liveWeatherAt(h, TODAY, 15.0)!, later = liveWeatherAt(h, TODAY, 17.5)!;
    expect(during.rain).toBeGreaterThan(mid.rain);
    expect(mid.rain).toBeGreaterThan(after.rain);
    expect(after.rain).toBe(0);
    expect(after.wetness).toBeGreaterThan(0.5); // just stopped: still wet
    expect(later.wetness).toBeLessThan(after.wetness); // drying
  });

  it('8. sunshine turning to cloud moves smoothly', () => {
    const h = series((i) => ({ cloud: i < 12 ? 5 : 90 }));
    const steps = [11, 11.25, 11.5, 11.75, 12].map((x) => liveWeatherAt(h, TODAY, x)!.cloud);
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeGreaterThan(steps[i - 1]);
  });

  it('fog from low visibility, and wind bearings blend the short way round', () => {
    const fog = liveWeatherAt(series(() => ({ vis: 150, code: 45, cloud: 90 })), TODAY, 6)!;
    expect(fog.fog).toBeGreaterThan(0.8);
    const turning = series((i) => ({ wd: i < 9 ? 350 : 10 }));
    expect([0, 360].some((n) => Math.abs((liveWeatherAt(turning, TODAY, 8.5)!.windFrom ?? -99) - n) < 1)).toBe(true);
  });

  it('13. different cities, different weather at once', () => {
    const lagos = liveWeatherAt(series(() => ({ mm: 6, cloud: 100, code: 65 })), TODAY, 12)!;
    const dubai = liveWeatherAt(series(() => ({ t: 34, cloud: 0, rh: 30 })), TODAY, 12)!;
    expect(lagos.kind).toBe('rain');
    expect(dubai.kind).toBe('clear');
  });

  it('each city is asked for in its own time zone and coordinates', () => {
    const url = new URL(openMeteoUrl(35.68, 139.69, 'Asia/Tokyo'));
    expect(url.searchParams.get('timezone')).toBe('Asia/Tokyo');
    expect(url.searchParams.get('latitude')).toBe('35.680');
    expect(url.searchParams.get('wind_speed_unit')).toBe('ms');
    // The same instant is a different date in Tokyo and London
    const now = new Date('2026-11-13T20:00:00Z');
    expect(localDate(now, 'Asia/Tokyo')).toBe('2026-11-14');
    expect(localDate(now, 'Europe/London')).toBe('2026-11-13');
  });

  it('rejects broken responses', () => {
    expect(parseOpenMeteo(null)).toBeNull();
    expect(parseOpenMeteo({ hourly: { time: [] } })).toBeNull();
    // Missing values are filled, not NaN
    const h = parseOpenMeteo({ hourly: { time: [`${TODAY}T00:00`], precipitation: [null] } })!;
    expect(h.precipitation[0]).toBe(0);
  });
});

describe('fetching, caching and failure', () => {
  const lagos = { id: 'lagos.marina', lat: 6.45, lon: 3.4, timeZone: 'Africa/Lagos' };
  const ok = (body: unknown) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);

  it('asks once per refresh period, then serves the cache', async () => {
    const f = vi.fn(() => ok(openMeteo(TODAY, () => ({ cloud: 5 }))));
    const t0 = Date.parse(`${TODAY}T12:00:00Z`);
    expect(await refreshCityWeather(lagos, t0, f as never)).not.toBeNull();
    await refreshCityWeather(lagos, t0 + REFRESH_MS / 2, f as never);
    expect(f).toHaveBeenCalledTimes(1);
    await refreshCityWeather(lagos, t0 + REFRESH_MS + 1, f as never);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('14. when the service fails it keeps the last reading (labelled cached), then falls back to simulated', async () => {
    const t0 = Date.parse(`${TODAY}T12:00:00Z`);
    const good = await refreshCityWeather(lagos, t0, (() => ok(openMeteo(TODAY, () => ({ mm: 3, cloud: 95, code: 61 })))) as never);
    const down = vi.fn(() => Promise.reject(new Error('offline')));
    const later = t0 + REFRESH_MS * 3;
    const kept = await refreshCityWeather(lagos, later, down as never);
    expect(kept).toBe(good);
    expect(cityWeatherAt(kept, 'Africa/Lagos', 13, later)!.source).toBe('cached');
    // It doesn't hammer a dead service: no new attempts until the retry time has passed
    const tried = down.mock.calls.length;
    await refreshCityWeather(lagos, later + RETRY_MS / 2, down as never);
    expect(down.mock.calls.length).toBe(tried);
    // Too old to trust: no live weather at all, so the game uses its own
    expect(cityWeatherAt(kept, 'Africa/Lagos', 13, t0 + STALE_MS + 1)).toBeNull();
    const sim = weatherAt('lagos.marina', 13 * 60);
    expect(resolveWeather('lagos.marina', 13 * 60, null, sim).source).toBe('simulated');
    // Nothing ever fetched, and offline: null, never an exception
    clearWeatherMemory();
    expect(await refreshCityWeather({ ...lagos, id: 'tokyo' }, t0, down as never)).toBeNull();
  });
});

describe('the sun', () => {
  const nov13 = dayOfYear(new Date('2026-11-13T12:00:00Z'));

  it('rises and sets by latitude and season: Lagos near 06:30/18:00, London short, Tokyo between', () => {
    const lagos = sunTimes(6.45, nov13), london = sunTimes(51.51, nov13), tokyo = sunTimes(35.68, nov13);
    expect(lagos.sunset - lagos.sunrise).toBeGreaterThan(11.5);
    expect(lagos.sunset - lagos.sunrise).toBeLessThan(12.2);
    expect(london.sunset - london.sunrise).toBeLessThan(9.2);
    expect(tokyo.sunset - tokyo.sunrise).toBeGreaterThan(london.sunset - london.sunrise);
    // Midsummer in London is long
    const june = sunTimes(51.51, 172);
    expect(june.sunset - june.sunrise).toBeGreaterThan(16);
  });

  it('is low and to the south at London noon in November, high over Lagos', () => {
    const london = solarPosition(51.51, nov13, 12), lagos = solarPosition(6.45, nov13, 12);
    expect(london.elevation * 180 / Math.PI).toBeLessThan(25);
    expect(lagos.elevation * 180 / Math.PI).toBeGreaterThan(60); // about 65° (90 − 6.45 latitude − 18° declination)
    const [, , z] = sunVector(london.elevation, london.azimuth);
    expect(z).toBeLessThan(0); // south (-Z)
    // Morning sun in the east (+X), evening in the west
    expect(sunVector(solarPosition(6.45, nov13, 8).elevation, solarPosition(6.45, nov13, 8).azimuth)[0]).toBeGreaterThan(0);
    expect(sunVector(solarPosition(6.45, nov13, 16).elevation, solarPosition(6.45, nov13, 16).azimuth)[0]).toBeLessThan(0);
  });

  it('12. never shines at night, whatever the weather says', () => {
    const night = lightingAt(23, 0, 0, { lat: 6.45, dayOfYear: nov13 });
    expect(night.night).toBe(1);
    expect(night.sunDirection[1]).toBeLessThan(0);
    // London at 17:00 in November is already dark; Lagos isn't
    expect(lightingAt(17, 30, 0, { lat: 51.51, dayOfYear: nov13 }).night).toBeGreaterThan(0.5);
    expect(lightingAt(17, 30, 0, { lat: 6.45, dayOfYear: nov13 }).night).toBe(0);
  });

  it('clouds dim the real sun', () => {
    const sky = { lat: 6.45, dayOfYear: nov13 };
    expect(lightingAt(13, 0, 1, sky).sunIntensity).toBeLessThan(lightingAt(13, 0, 0, sky).sunIntensity * 0.5);
  });
});

describe('special events', () => {
  const sunny: Weather = { kind: 'clear', rain: 0, cloud: 0.05, wetness: 0, windSpeed: 2, visibility: 25000, fog: 0, thunder: 0, source: 'live' };
  /** A day in a city that has an event, found by search (events are rare, and the same for everyone). */
  const find = (id: string) => {
    for (let day = 0; day < 4000; day++) { const e = eventForDay('lagos.marina', day); if (e?.spec.id === id) return e; }
    throw new Error(`no ${id}`);
  };

  it('are rare, at most one a day, and the same for every player', () => {
    let days = 0;
    for (let day = 0; day < 1000; day++) if (eventForDay('lagos.marina', day)) days++;
    const expected = WEATHER_EVENTS.reduce((s, e) => s + e.chance, 0) * 1000;
    expect(days).toBeGreaterThan(expected * 0.6);
    expect(days).toBeLessThan(expected * 1.4);
    expect(eventForDay('lagos.marina', 123)).toEqual(eventForDay('lagos.marina', 123));
  });

  it('override the real weather only in their city and time, labelled as events, then hand back smoothly', () => {
    const e = find('severe-storm');
    const mid = (e.start + e.end) / 2;
    const during = resolveWeather('lagos.marina', mid, sunny, sunny);
    expect(during.source).toBe('event');
    expect(during.event?.label).toBe('Severe thunderstorm');
    expect(during.thunder).toBe(1);
    expect(during.wetness).toBeGreaterThan(0.5);
    // Another city at the same moment keeps its real weather (unless it happens to have its own event)
    const elsewhere = resolveWeather('tokyo.shibuya', mid, sunny, sunny);
    expect(elsewhere.event?.id === 'severe-storm' && eventAt('tokyo.shibuya', mid)?.event.start !== e.start ? 'leak' : 'ok').toBe('ok');
    // Fades out over the ramp after it ends, back to the real weather
    const fading = resolveWeather('lagos.marina', e.end + EVENT_RAMP / 2, sunny, sunny);
    expect(fading.rain).toBeGreaterThan(0);
    expect(fading.rain).toBeLessThan(1);
    const over = resolveWeather('lagos.marina', e.end + EVENT_RAMP + 1, sunny, sunny);
    expect(over.source).toBe('live');
    expect(over.rain).toBe(0);
  });

  it('dense fog and strong wind', () => {
    const fog = find('dense-fog');
    expect(resolveWeather('lagos.marina', (fog.start + fog.end) / 2, sunny, sunny).fog).toBe(1);
    const wind = find('strong-wind');
    expect(resolveWeather('lagos.marina', (wind.start + wind.end) / 2, sunny, sunny).windSpeed).toBeGreaterThan(15);
  });

  it('the development override only works in the dev server', () => {
    expect(devWeatherOverride('?weather=storm', true)).toBe('storm');
    expect(devWeatherOverride('?weather=storm', false)).toBeNull();
    expect(devWeatherOverride('?weather=snowstorm', true)).toBeNull();
    const w = resolveWeather('lagos.marina', 600, sunny, sunny, 'rain');
    expect(w.rain).toBeGreaterThan(0.5);
    expect(w.event?.label).toMatch(/Test weather/);
  });

  it('simulated weather fills in every field', () => {
    const w = weatherAt('lagos.marina', 900);
    for (const k of ['temperature', 'humidity', 'windSpeed', 'windFrom', 'visibility', 'fog', 'thunder'] as const) expect(w[k], k).toBeTypeOf('number');
    expect(w.source).toBe('simulated');
  });
});


describe('storms, shelter and roofs', () => {
  it('12. lightning flashes in sharp pulses, and the first is the brightest', () => {
    let seed = 7;
    const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed / 4294967296; };
    const s = nextStrike(100, 1, rnd);
    expect(strikeBrightness(s, 100)).toBeGreaterThan(0);
    expect(strikeBrightness(s, 99.9)).toBe(0);
    expect(strikeBrightness(s, 101)).toBe(0); // over within a second
    const peaks = s.pulses.map((p) => strikeBrightness(s, 100 + p.after));
    expect(Math.max(...peaks)).toBe(peaks[0]);
    // Violent storms strike more often than mild ones (on average)
    const gap = (k: number) => { let total = 0; for (let i = 0; i < 400; i++) total += nextStrike(0, k, rnd).gap; return total / 400; };
    expect(gap(1)).toBeLessThan(gap(0.3) * 0.6);
  });

  it('thunder comes after the flash by the distance, louder when close', () => {
    expect(thunderDelay(1029)).toBeCloseTo(3, 1); // about 3 s a kilometre
    expect(thunderDelay(343)).toBeCloseTo(1, 5);
    expect(thunderLevel(400)).toBeGreaterThan(thunderLevel(5000));
  });

  it('people go indoors in the rain, never all of them', () => {
    expect(outInWeather(0, 0)).toBe(1);
    expect(outInWeather(0.5, 0)).toBeLessThan(0.8);
    expect(outInWeather(1, 1)).toBeGreaterThanOrEqual(0.15);
    expect(outInWeather(1, 1)).toBeLessThan(outInWeather(1, 0));
  });

  it('9. rain stops on roofs: buildings and buses shelter what is under them', () => {
    const building = { position: [10, 0, 0] as const, size: [8, 12, 8] as const };
    const bus = { position: [0, 0, 0] as const, size: DANFO_SIZE };
    expect(roofOver(10, 0, [building, bus])).toBe(12);
    expect(roofOver(0, 0, [building, bus])).toBe(DANFO_SIZE[1]);
    expect(roofOver(-10, 0, [building, bus])).toBe(-Infinity);
  });
});
