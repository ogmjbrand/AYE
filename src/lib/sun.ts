/**
 * Where the sun is: elevation and azimuth from a city's latitude, the day of the year and the
 * local solar time (NOAA's low-precision formulas, good to a fraction of a degree, which is all a
 * scene needs). Used for the direction and strength of daylight, and for each city's own sunrise
 * and sunset: Tokyo in winter is dark by five, Lagos never far from 06:30 and 18:45.
 */
const RAD = Math.PI / 180;

/** The sun's declination (radians) on day `dayOfYear` (1 … 366). */
export function declination(dayOfYear: number): number {
  return 23.44 * RAD * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365);
}

/**
 * The sun from a place at latitude `lat` (degrees) at `solarHour` (0 … 24, local solar time):
 * elevation above the horizon and azimuth clockwise from north, both in radians.
 */
export function solarPosition(lat: number, dayOfYear: number, solarHour: number): { elevation: number; azimuth: number } {
  const phi = lat * RAD;
  const dec = declination(dayOfYear);
  const ha = (solarHour - 12) * 15 * RAD;
  const sinEl = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(ha);
  const elevation = Math.asin(Math.max(-1, Math.min(1, sinEl)));
  const azimuth = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)) + Math.PI;
  return { elevation, azimuth: ((azimuth % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) };
}

/**
 * Sunrise and sunset (local solar hours) at latitude `lat` on `dayOfYear`, for the sun's upper rim
 * with atmospheric refraction (−0.833°). Polar day and night give 0 … 24 and 12 … 12.
 */
export function sunTimes(lat: number, dayOfYear: number): { sunrise: number; sunset: number } {
  const phi = lat * RAD;
  const dec = declination(dayOfYear);
  const cosH = (Math.sin(-0.833 * RAD) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (cosH <= -1) return { sunrise: 0, sunset: 24 };
  if (cosH >= 1) return { sunrise: 12, sunset: 12 };
  const half = Math.acos(cosH) / (15 * RAD);
  return { sunrise: 12 - half, sunset: 12 + half };
}

/** The day of the year (1 … 366) of a date, in UTC. */
export function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86_400_000);
}

/**
 * A unit vector towards the sun in the game's world: +X east, +Z north, +Y up (the city streets
 * run north-south). The scene's sun light shines from here.
 */
export function sunVector(elevation: number, azimuth: number): [number, number, number] {
  const c = Math.cos(elevation);
  return [Math.sin(azimuth) * c, Math.sin(elevation), Math.cos(azimuth) * c];
}
