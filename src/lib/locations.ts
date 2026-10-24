/**
 * The city's location directory. Entries come from the current district's own
 * data (food vendors, shops, the travel desk, workplaces, homes, parks), so
 * they only offer what the game already does. Location types with no building
 * yet are listed as prototypes with no position and no actions.
 */
import type { Career } from '../components/CharacterCreation';
import type { District } from './geography';
import { CAREER_LABEL } from './labels';

export type LocationCategory =
  | 'food'
  | 'shopping'
  | 'education'
  | 'health'
  | 'fitness'
  | 'offices'
  | 'finance'
  | 'recreation'
  | 'nightlife'
  | 'stays'
  | 'travel'
  | 'vehicles';

export const LOCATION_CATEGORIES: readonly { id: LocationCategory; label: string; color: string }[] = [
  { id: 'food', label: 'Restaurants & cafés', color: '#f0a35e' },
  { id: 'shopping', label: 'Malls & boutiques', color: '#c39be0' },
  { id: 'vehicles', label: 'Car dealerships', color: '#d2b56f' },
  { id: 'education', label: 'Universities & libraries', color: '#8ab4d8' },
  { id: 'health', label: 'Hospitals & clinics', color: '#e07a7a' },
  { id: 'fitness', label: 'Gyms & sports', color: '#7cc4b0' },
  { id: 'offices', label: 'Offices & workplaces', color: '#a4b0c8' },
  { id: 'finance', label: 'Banks & financial services', color: '#d8c36a' },
  { id: 'recreation', label: 'Parks, beaches & recreation', color: '#8fbf6a' },
  { id: 'nightlife', label: 'Nightlife & entertainment', color: '#d46ad0' },
  { id: 'stays', label: 'Residential & hotels', color: '#e2a06b' },
  { id: 'travel', label: 'Travel', color: '#6fa8dc' },
];

export const CATEGORY_LABEL: Record<LocationCategory, string> = Object.fromEntries(
  LOCATION_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<LocationCategory, string>;

/** What standing at a location lets the player do with the game's existing panels. */
export type LocationUse = 'food' | 'shop' | 'gadgets' | 'travel' | 'home' | 'dealership';

type Spot = readonly [number, number, number];

export interface LocationEntry {
  id: string;
  name: string;
  category: LocationCategory;
  description: string;
  /** Neighbourhood it sits in, when the district defines one. */
  area: string | null;
  /** Where to stand, in district metres. Null for prototypes (nothing to walk to). */
  position: Spot | null;
  /** False for prototypes: listed so the directory shows what must still be built. */
  built: boolean;
  /** What the game actually offers here. */
  activities: readonly string[];
  /** The existing panel this location opens when you stand at it. */
  use: LocationUse | null;
  /** Nightly rent for a home, from the district data. */
  rentPerNight?: number;
  /** Your home, or the workplace for your career. */
  yours?: boolean;
}

/** Within this many metres of a location you have arrived. */
export const ARRIVE_RADIUS = 4;

const PROTOTYPES: readonly { name: string; category: LocationCategory }[] = [
  { name: 'Shopping mall', category: 'shopping' },
  { name: 'Public library', category: 'education' },
  { name: 'Clinic', category: 'health' },
  { name: 'Gym', category: 'fitness' },
  { name: 'Bank', category: 'finance' },
  { name: 'Beach', category: 'recreation' },
  { name: 'Nightclub', category: 'nightlife' },
  { name: 'Hotel', category: 'stays' },
];

const WORKPLACE_CATEGORY: Record<Exclude<Career, 'none'>, LocationCategory> = {
  student: 'education',
  artist: 'offices',
  entrepreneur: 'offices',
  athlete: 'fitness',
  engineer: 'offices',
  doctor: 'health',
  pilot: 'travel',
};

export function areaAt(district: District, x: number, z: number): string | null {
  const n = district.neighborhoods.find(
    (h) => x >= h.bounds.minX && x <= h.bounds.maxX && z >= h.bounds.minZ && z <= h.bounds.maxZ,
  );
  return n?.name ?? null;
}

/** Every location in a district, for the directory: built places first, then prototypes. */
export function locationsFor(district: District, career: Career, homeId: string | null): LocationEntry[] {
  const entries: LocationEntry[] = [];
  const at = (p: Spot) => areaAt(district, p[0], p[2]);

  for (const v of district.vendors) {
    entries.push({
      id: `${district.id}.${v.id}`, name: v.name, category: 'food', description: v.kind, area: at(v.position),
      position: v.position, built: true, activities: ['Order food from the menu'], use: 'food',
    });
  }

  const shop = district.fashionHouse;
  entries.push({
    id: `${district.id}.fashion`, name: shop.name, category: 'shopping', description: shop.kind, area: at(shop.position),
    position: shop.position, built: true, activities: ['Buy clothes', 'Try on outfits', 'Save and wear outfits'], use: 'shop',
  });

  const gadgets = district.gadgetHub;
  entries.push({
    id: `${district.id}.gadgets`, name: gadgets.name, category: 'shopping', description: gadgets.kind, area: at(gadgets.position),
    position: gadgets.position, built: true, activities: ['Buy equipment that raises your pay'], use: 'gadgets',
  });

  if (district.dealership) {
    entries.push({
      id: `${district.id}.car-dealership`, name: district.dealership.name, category: 'vehicles',
      description: 'Browse cars, buy one in your colour, or sell a car you own',
      area: at(district.dealership.door), position: district.dealership.door, built: true,
      activities: ['Compare speed, fuel use and price', 'Buy a car with GHAI', 'Sell a car you own'],
      use: 'dealership',
    });
  }

  const desk = district.travelDesk;
  entries.push({
    id: `${district.id}.travel`, name: desk.name, category: 'travel', description: desk.kind, area: at(desk.position),
    position: desk.position, built: true, activities: ['Book flights and coaches to other cities'], use: 'travel',
  });

  for (const key of Object.keys(district.workplaces) as Exclude<Career, 'none'>[]) {
    const w = district.workplaces[key];
    const mine = key === career;
    entries.push({
      id: `${district.id}.work.${key}`, name: w.name, category: WORKPLACE_CATEGORY[key], description: w.description,
      area: at(w.position), position: w.position, built: true, yours: mine,
      activities: mine ? ['Work your shifts', 'Take on hourly work tasks'] : [`Work here if your career is ${CAREER_LABEL[key].toLowerCase()}`],
      use: null,
    });
  }

  for (const h of district.homes) {
    entries.push({
      id: `${district.id}.home.${h.id}`, name: h.name, category: 'stays', description: h.description, area: at(h.door),
      position: h.door, built: true, yours: h.id === homeId, activities: ['Rent it (move-in fee, then nightly rent)', 'Sleep here'],
      use: 'home', rentPerNight: h.rentPerNight,
    });
  }

  for (const n of district.neighborhoods) {
    if (n.id !== 'parks') continue;
    const { minX, maxX, minZ, maxZ } = n.bounds;
    entries.push({
      id: `${district.id}.park`, name: n.name, category: 'recreation', description: n.description, area: n.name,
      position: [(minX + maxX) / 2, 0, (minZ + maxZ) / 2], built: true, activities: ['Walk around'], use: null,
    });
  }

  for (const p of PROTOTYPES) {
    entries.push({
      id: `proto.${p.name.toLowerCase().replace(/\s+/g, '-')}`, name: p.name, category: p.category,
      description: `Planned for a later update. Not built in ${district.name} yet.`, area: null, position: null,
      built: false, activities: [], use: null,
    });
  }

  return entries;
}

export function matchesQuery(e: LocationEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [e.name, e.description, e.area ?? '', CATEGORY_LABEL[e.category], ...e.activities]
    .some((s) => s.toLowerCase().includes(q));
}

export function distanceTo(e: LocationEntry, x: number, z: number): number | null {
  if (!e.position) return null;
  return Math.hypot(e.position[0] - x, e.position[2] - z);
}

/** Compass point from the player to a spot (+z is north, east is -x). */
export function compass(dx: number, dz: number): string {
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const angle = Math.atan2(-dx, dz);
  return names[(Math.round(angle / (Math.PI / 4)) + 8) % 8];
}
