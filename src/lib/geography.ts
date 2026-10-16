/**
 * The world model: countries contain cities, cities contain districts, and
 * a district is one playable 3D area with its interactive places. Today there
 * is one district; a second city is added by adding data here (plus its
 * layout and art), not by rewriting the game.
 *
 * Places reference the existing per-system data (food vendors, workplaces,
 * shops) so nothing is duplicated; the registry is the single index that
 * other systems (save data, a future server, travel) can rely on.
 */
import { FOOD_VENDORS } from './food';
import { CAREER_LOCATIONS } from './careers';
import { FASHION_HOUSE } from './fashion';
import type { Career } from '../components/CharacterCreation';

export type PlaceKind = 'food' | 'shop' | 'workplace' | 'home' | 'public';

export interface Place {
  /** Unique across the whole world, e.g. "lagos.marina.mama-put". */
  id: string;
  kind: PlaceKind;
  name: string;
  /** Where the player stands to use it, in district coordinates (metres). */
  position: readonly [number, number, number];
  /** For workplaces: the career that works here. */
  career?: Career;
}

export interface District {
  id: string;
  name: string;
  /** Player start position. */
  spawn: readonly [number, number, number];
  places: readonly Place[];
}

export interface City {
  id: string;
  name: string;
  /** ISO 3166-1 alpha-2, matching lib/places.ts. */
  country: string;
  /** IANA time zone, for when cities run on their own clocks. */
  timeZone: string;
  /** Currency code for local prices; the game currently uses one virtual currency (ⓒ). */
  currency: string;
  districts: readonly District[];
}

const LAGOS_MARINA: District = {
  id: 'lagos.marina',
  name: 'Marina Boulevard',
  spawn: [1.5, 0, 2],
  places: [
    ...FOOD_VENDORS.map((v): Place => ({ id: `lagos.marina.${v.id}`, kind: 'food', name: v.name, position: v.position })),
    { id: 'lagos.marina.fashion-house', kind: 'shop', name: FASHION_HOUSE.name, position: FASHION_HOUSE.position },
    ...(Object.entries(CAREER_LOCATIONS) as [Career, (typeof CAREER_LOCATIONS)[Career]][])
      .filter(([career]) => career !== 'none')
      .map(([career, loc]): Place => ({
        id: `lagos.marina.work.${career}`, kind: 'workplace', name: loc.name, position: loc.position, career,
      })),
  ],
};

export const CITIES: readonly City[] = [
  { id: 'lagos', name: 'Lagos', country: 'NG', timeZone: 'Africa/Lagos', currency: 'NGN', districts: [LAGOS_MARINA] },
];

/** The district the player is in. One for now; travel will make this part of the save. */
export const CURRENT_DISTRICT = LAGOS_MARINA;

export const allPlaces = (): Place[] => CITIES.flatMap((c) => c.districts.flatMap((d) => d.places));
export const placeById = (id: string) => allPlaces().find((p) => p.id === id);
