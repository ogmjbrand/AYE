/**
 * Getting between cities. Every district has a travel desk (E) selling
 * flights and coaches to the others. Fares and journey times follow the
 * distance between the city centres; the clock, hunger and living costs keep
 * running on the way.
 */
export type TravelMode = 'flight' | 'coach';

export interface TravelOption {
  mode: TravelMode;
  label: string;
  fare: number;
  /** Door-to-door game minutes, check-in and border crossings included. */
  minutes: number;
  description: string;
}

export interface Located {
  lat: number;
  lon: number;
  country: string;
  /** Coaches only run within one landmass; mainland if omitted. */
  landmass?: string;
}

/** Great-circle distance between two cities, in km. */
export function distanceKm(a: Located, b: Located): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Below this there are no flights, only the road. */
export const MIN_FLIGHT_KM = 150;
/** Beyond this there are no coaches. */
export const MAX_COACH_KM = 1600;
/** Roads wind: a road trip is longer than the straight line. */
const ROAD_FACTOR = 1.3;
/** Coach speed including rest stops, km/h. */
const COACH_KMH = 55;
/** Jet cruising speed, km/h. */
const FLIGHT_KMH = 750;

const round = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);

export const formatDuration = (minutes: number) =>
  minutes % 60 === 0 ? `${minutes / 60} h` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;

/** The ways to get from one city to another, cheapest first; none if they're the same place. */
export function travelOptions(from: Located, to: Located): TravelOption[] {
  const km = distanceKm(from, to);
  if (km < 1) return [];
  const abroad = from.country !== to.country;
  const out: TravelOption[] = [];
  if (km <= MAX_COACH_KM && (from.landmass ?? 'mainland') === (to.landmass ?? 'mainland')) {
    out.push({
      mode: 'coach',
      label: 'Coach',
      fare: round(300 + 1.25 * km, 50),
      minutes: round(60 + ((km * ROAD_FACTOR) / COACH_KMH) * 60 + (abroad ? 120 : 0), 15),
      description: abroad ? 'By road, with border stops on the way.' : 'By road, with rest stops on the way.',
    });
  }
  if (km >= MIN_FLIGHT_KM) {
    const air = round((km / FLIGHT_KMH) * 60, 15);
    out.push({
      mode: 'flight',
      label: 'Flight',
      fare: round(1500 + 2.5 * km, 50),
      minutes: round(120 + air + (abroad ? 30 : 0), 15),
      description: `About ${formatDuration(air)} in the air, plus check-in and the ride to and from the airport.`,
    });
  }
  return out;
}

export const travelOption = (from: Located, to: Located, mode: TravelMode) => travelOptions(from, to).find((o) => o.mode === mode);
