/**
 * Sun, sky and light settings for a given game time. Pure functions so the
 * lighting can be tested without a GPU. Lagos sits near the equator: the sun
 * rises around 06:30 and sets around 18:45 all year.
 */
import { solarPosition, sunVector } from '../lib/sun';

export const SUNRISE = 6.5;
export const SUNSET = 18.75;

export type HdriKey = 'day' | 'golden' | 'night';

export interface Lighting {
  /** Direction towards the sun (unit-ish vector, y up). */
  sunDirection: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  /** Hemisphere sky / ground colours and strength. */
  skyColor: string;
  groundColor: string;
  hemiIntensity: number;
  envIntensity: number;
  fogColor: string;
  /** Sky dome gradient. */
  zenithColor: string;
  horizonColor: string;
  /** 0 by day, 1 at full night: drives window glow, street lamps, stars. */
  night: number;
  hdri: HdriKey;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function mixColor(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(lerp(v, pb[i], clamp01(t))).toString(16).padStart(2, '0')).join('')}`;
}

/** Height of the sun: 1 at solar noon, 0 at sunrise/sunset, negative at night. */
export function sunElevation(hours: number): number {
  return Math.sin((Math.PI * (hours - SUNRISE)) / (SUNSET - SUNRISE));
}

const CLOUD_GREY = '#8a93a0';

/** A city's place on the globe and the date, for its real sun (lib/sun.ts). */
export interface SkyPlace {
  lat: number;
  dayOfYear: number;
}

/** Sun height on lightingAt's scale (1 at the day's noon, 0 at sunrise and sunset, about −0.18 an hour after dusk), and the direction to it. */
function sunAt(h: number, sky?: SkyPlace): { elev: number; sunDirection: [number, number, number] } {
  if (!sky) {
    const elev = sunElevation(h);
    const dayT = clamp01((h - SUNRISE) / (SUNSET - SUNRISE));
    // Sun travels east (+X) to west (-X), slightly to the south (-Z).
    const az = Math.PI * dayT;
    return { elev, sunDirection: [Math.cos(az) * 0.9, Math.max(elev, -0.25), -0.35] };
  }
  // The real sun for this latitude and date: its own sunrise, sunset, height and bearing
  const { elevation, azimuth } = solarPosition(sky.lat, sky.dayOfYear, h);
  const noon = Math.max(0.05, Math.sin(solarPosition(sky.lat, sky.dayOfYear, 12).elevation));
  const elev = elevation >= 0 ? Math.sin(elevation) / noon : (Math.sin(elevation) / Math.sin(10 * Math.PI / 180)) * 0.18;
  const [x, y, z] = sunVector(elevation, azimuth);
  return { elev, sunDirection: [x, Math.max(y, -0.25), z] };
}

/**
 * `overcast` is continuous 0 (clear) to 1 (full rain); see lib/weather.ts's overcastAt for how it's derived.
 * With `sky`, the sun is the real one for that city and day (lib/sun.ts); without, Lagos's fixed day.
 */
export function lightingAt(hour: number, minute = 0, overcast = 0, sky?: SkyPlace): Lighting {
  const h = hour + minute / 60;
  const { elev, sunDirection } = sunAt(h, sky);

  const isDay = elev > 0;
  const golden = isDay ? clamp01(1 - elev / 0.35) : 0; // low sun → warm
  const night = isDay ? 0 : clamp01(-elev / 0.18);
  const twilight = isDay ? 0 : 1 - night;

  const horizon = isDay
    ? mixColor('#c8dbea', '#f0a868', golden)
    : mixColor('#b5675a', '#0e1222', night);

  const sunColor = isDay ? mixColor('#fff4e0', '#ffb36b', golden) : '#9db4ff';
  const sunIntensity = isDay ? lerp(1.2, 3.2, clamp01(elev / 0.6)) * (1 - golden * 0.35) : 0.35 * night + 0.15;

  const base: Lighting = {
    sunDirection,
    sunColor,
    sunIntensity,
    skyColor: isDay ? mixColor('#bcd6ee', '#f2b78a', golden) : mixColor('#5a5f8e', '#3a4670', night),
    groundColor: isDay ? '#7a6248' : '#1a1712',
    hemiIntensity: isDay ? lerp(0.45, 0.8, clamp01(elev)) : lerp(0.6, 0.55, night),
    envIntensity: isDay ? lerp(0.55, 1.0, clamp01(elev / 0.5)) : lerp(0.6, 0.55, night),
    fogColor: horizon,
    zenithColor: isDay
      ? mixColor('#2f6fb8', '#4a68a0', golden)
      : mixColor('#26355e', '#04060d', night),
    horizonColor: horizon,
    night,
    hdri: night > 0.5 ? 'night' : golden > 0.4 || twilight > 0 ? 'golden' : 'day',
  };

  // Clouds flatten and cool daylight (no golden glow, more ambient, duller sun); night stays
  // night either way since there's nothing to dim once the sun is already down.
  const cloud = isDay ? clamp01(overcast) : 0;
  if (cloud === 0) return base;
  return {
    ...base,
    sunColor: mixColor(base.sunColor, '#aab4c0', cloud * 0.7),
    sunIntensity: base.sunIntensity * lerp(1, 0.35, cloud),
    hemiIntensity: lerp(base.hemiIntensity, base.hemiIntensity * 1.15, cloud),
    envIntensity: base.envIntensity * lerp(1, 0.55, cloud),
    fogColor: mixColor(base.fogColor, CLOUD_GREY, cloud * 0.6),
    skyColor: mixColor(base.skyColor, CLOUD_GREY, cloud * 0.6),
    zenithColor: mixColor(base.zenithColor, CLOUD_GREY, cloud * 0.7),
    horizonColor: mixColor(base.horizonColor, CLOUD_GREY, cloud * 0.6),
    hdri: 'day',
  };
}
