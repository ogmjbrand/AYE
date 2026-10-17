/**
 * The world model: countries contain cities, cities contain districts, and a
 * district is one playable 3D area. Each district is data (lib/districts):
 * its street layout, neighbourhoods, food vendors, shops, homes, workplaces
 * and travel desk. Adding a city means adding a district file, not rewriting
 * the game; everything else reads the current district from here.
 */
import type { Career } from '../components/CharacterCreation';
import type { CareerLocation } from './careers';
import type { FoodVendor } from './food';
import type { Home } from './homes';
import type { Neighborhood } from './neighborhoods';
import type { Venue } from './nightlife';
import { buildLayout, setActiveLayout, type DistrictLayout, type LayoutSpec } from './world';
import { LAGOS_MARINA } from './districts/lagos';
import { ACCRA_OSU } from './districts/accra';

export type PlaceKind = 'food' | 'shop' | 'workplace' | 'home' | 'public' | 'nightlife';
type Spot = readonly [number, number, number];

export interface Place {
  /** Unique across the whole world, e.g. "lagos.marina.mama-put". */
  id: string;
  kind: PlaceKind;
  name: string;
  /** Where the player stands to use it, in district coordinates (metres). */
  position: Spot;
  /** For workplaces: the career that works here. */
  career?: Career;
}

export interface City {
  id: string;
  name: string;
  /** ISO 3166-1 alpha-2, matching lib/places.ts. */
  country: string;
  /** IANA time zone, for when cities run on their own clocks. */
  timeZone: string;
  /** Local currency code; the game itself uses one virtual currency (ⓒ). */
  currency: string;
}

/** A shop or service counter: where the player stands to use it. */
export interface Counter {
  name: string;
  kind: string;
  position: Spot;
}

/** A district as written in lib/districts. */
export interface DistrictSpec {
  id: string;
  city: City;
  name: string;
  /** Where the player arrives. */
  spawn: Spot;
  layout: LayoutSpec;
  neighborhoods: readonly Neighborhood[];
  vendors: readonly FoodVendor[];
  fashionHouse: Counter;
  gadgetHub: Counter;
  travelDesk: Counter;
  homes: readonly Home[];
  workplaces: Record<Exclude<Career, 'none'>, CareerLocation>;
  /** The district's live-music lounge (lib/nightlife.ts). */
  nightlife: Venue;
}

export interface District extends Omit<DistrictSpec, 'layout'> {
  layout: DistrictLayout;
  /** Every interactive place, indexed for maps, saves and a future server. */
  places: readonly Place[];
}

/** Within this distance of a counter you can use it (E). */
export const COUNTER_RADIUS = 3;

function buildDistrict(spec: DistrictSpec): District {
  const id = (s: string) => `${spec.id}.${s}`;
  const places: Place[] = [
    ...spec.vendors.map((v): Place => ({ id: id(v.id), kind: 'food', name: v.name, position: v.position })),
    { id: id('fashion'), kind: 'shop', name: spec.fashionHouse.name, position: spec.fashionHouse.position },
    { id: id('gadgets'), kind: 'shop', name: spec.gadgetHub.name, position: spec.gadgetHub.position },
    { id: id('travel'), kind: 'public', name: spec.travelDesk.name, position: spec.travelDesk.position },
    { id: id(`night.${spec.nightlife.id}`), kind: 'nightlife', name: spec.nightlife.name, position: spec.nightlife.position },
    ...spec.homes.map((h): Place => ({ id: id(`home.${h.id}`), kind: 'home', name: h.name, position: h.door })),
    ...(Object.entries(spec.workplaces) as [Exclude<Career, 'none'>, CareerLocation][]).map(([career, w]): Place => ({
      id: id(`work.${career}`), kind: 'workplace', name: w.name, position: w.position, career,
    })),
  ];
  return { ...spec, layout: buildLayout(spec.layout), places };
}

export const DISTRICTS: readonly District[] = [buildDistrict(LAGOS_MARINA), buildDistrict(ACCRA_OSU)];
export const DEFAULT_DISTRICT_ID = 'lagos.marina';

export const districtById = (id: string | null | undefined): District =>
  DISTRICTS.find((d) => d.id === id) ?? DISTRICTS.find((d) => d.id === DEFAULT_DISTRICT_ID)!;
export const isDistrictId = (id: unknown): id is string => DISTRICTS.some((d) => d.id === id);

// Collision and ground height start in the default district; the game switches this when you travel
setActiveLayout(districtById(DEFAULT_DISTRICT_ID).layout);

export const allPlaces = (): Place[] => DISTRICTS.flatMap((d) => [...d.places]);
export const placeById = (id: string) => allPlaces().find((p) => p.id === id);

const near = (c: Counter, x: number, z: number) => Math.hypot(c.position[0] - x, c.position[2] - z) <= COUNTER_RADIUS;

/** Which counter (if any) the player is standing at. */
export function counterAt(d: District, x: number, z: number): 'fashion' | 'gadgets' | 'travel' | null {
  if (near(d.fashionHouse, x, z)) return 'fashion';
  if (near(d.gadgetHub, x, z)) return 'gadgets';
  if (near(d.travelDesk, x, z)) return 'travel';
  return null;
}
