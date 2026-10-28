/**
 * The city directory behind the ⋯ button: every place in the current
 * district, sorted into the categories players look for, built from the same
 * records the game uses (vendors, shops, desks, homes, workplaces), so the
 * coordinates are the ones you walk to.
 *
 * Each entry says honestly what you can do there:
 *   open    – arriving gives you the real interaction (order food, shop, rent…)
 *   visit   – a real place you can walk to, with nothing to do there yet for you
 *   planned – part of the plan for the city but not in the world yet (no Go)
 */
import type { Career } from '../components/CharacterCreation';
import type { District } from './geography';
import { OFFICE_WORKPLACE } from './officeCareer';

export type Category =
  | 'restaurants' | 'shopping' | 'universities' | 'hospitals' | 'gyms'
  | 'workplaces' | 'parks' | 'nightlife' | 'residential' | 'transport' | 'vehicles';

export const CATEGORIES: readonly { id: Category; label: string }[] = [
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'shopping', label: 'Shops & malls' },
  { id: 'vehicles', label: 'Car dealerships' },
  { id: 'universities', label: 'Universities' },
  { id: 'hospitals', label: 'Hospitals' },
  { id: 'gyms', label: 'Gyms' },
  { id: 'workplaces', label: 'Workplaces' },
  { id: 'parks', label: 'Parks' },
  { id: 'nightlife', label: 'Nightlife' },
  { id: 'residential', label: 'Homes' },
  { id: 'transport', label: 'Travel' },
];

export type Status = 'open' | 'visit' | 'planned';

export interface Destination {
  id: string;
  name: string;
  /** What sort of place, e.g. "Nigerian buka". */
  kind: string;
  /** Every category it appears under; the first is its main one. */
  categories: readonly Category[];
  status: Status;
  /** What you can (or can't yet) do there, in a few words. */
  note: string;
  /** Where to walk to (the spot the game's interaction checks); none for planned places. */
  position?: { x: number; z: number };
}

const CAREER_WORD: Record<Exclude<Career, 'none'>, string> = {
  student: 'students', artist: 'artists', entrepreneur: 'entrepreneurs', athlete: 'athletes',
  engineer: 'engineers', doctor: 'doctors', pilot: 'pilots',
};

/** Workplaces that are also a university, hospital or gym. */
const WORK_CATEGORY: Partial<Record<Exclude<Career, 'none'>, Category>> = {
  student: 'universities', doctor: 'hospitals', athlete: 'gyms',
};

export function cityDirectory(district: District, playerCareer: Career, homeId: string | null): Destination[] {
  const at = (p: readonly [number, number, number]) => ({ x: p[0], z: p[2] });
  const id = (s: string) => `${district.id}.${s}`;
  const out: Destination[] = [];

  for (const v of district.vendors) {
    out.push({ id: id(v.id), name: v.name, kind: v.kind, categories: ['restaurants'], status: 'open', note: 'Order food here', position: at(v.position) });
  }
  if (district.dealership) {
    const r = district.dealership;
    out.push({ id: id(`cars.${r.id}`), name: r.name, kind: r.kind, categories: ['shopping'], status: 'open', note: 'Buy a car, then drive it anywhere', position: at(r.door) });
  }
  if (district.restaurant) {
    const r = district.restaurant;
    out.push({ id: id(`restaurant.${r.id}`), name: r.name, kind: r.kind, categories: ['restaurants'], status: 'open', note: 'Sit down to a three-course meal, 11:00–23:00', position: at(r.door) });
  }
  out.push(
    { id: id('fashion'), name: district.fashionHouse.name, kind: district.fashionHouse.kind, categories: ['shopping'], status: 'open', note: 'Buy clothes, change your hair colour', position: at(district.fashionHouse.position) },
    { id: id('gadgets'), name: district.gadgetHub.name, kind: district.gadgetHub.kind, categories: ['shopping'], status: 'open', note: 'Buy a phone or work kit', position: at(district.gadgetHub.position) },
    {
      id: id(`park.${district.park.id}`), name: district.park.name, kind: district.park.kind, categories: ['parks'], status: 'open',
      note: 'Sit on a bench and let time pass', position: at(district.park.position),
    },
    {
      id: id(`night.${district.nightlife.id}`), name: district.nightlife.name, kind: district.nightlife.kind, categories: ['nightlife'], status: 'open',
      note: 'Live music 20:00–03:00; nights out with friends', position: at(district.nightlife.position),
    },
    { id: id('travel'), name: district.travelDesk.name, kind: district.travelDesk.kind, categories: ['transport'], status: 'open', note: 'Book a flight or coach to another city', position: at(district.travelDesk.position) },
  );
  if (district.carDealership) {
    out.push({
      id: id('car-dealership'), name: district.carDealership.name, kind: 'Car dealership',
      categories: ['vehicles', 'shopping'], status: 'open',
      note: 'Browse cars, buy and customise a vehicle, or take an owned car out',
      position: at(district.carDealership.position),
    });
  }
  for (const h of district.homes) {
    const yours = h.id === homeId;
    out.push({
      id: id(`home.${h.id}`), name: h.name, kind: h.kind, categories: ['residential'], status: 'open',
      note: yours ? 'Your home: go in, sleep' : h.price !== undefined ? `For sale at OGM Homes, ${h.price.toLocaleString()} GHAI` : `To let, ${h.rentPerNight} GHAI a night`, position: at(h.door),
    });
  }
  for (const [career, w] of Object.entries(district.workplaces) as [Exclude<Career, 'none'>, District['workplaces'][Exclude<Career, 'none'>]][]) {
    const mine = career === playerCareer;
    const main = WORK_CATEGORY[career];
    out.push({
      id: id(`work.${career}`), name: w.name, kind: w.description,
      categories: main ? [main, 'workplaces'] : ['workplaces'],
      status: mine ? 'open' : 'visit',
      note: mine ? 'Your workplace: paid 09:00–17:00, hourly tasks' : `Workplace for ${CAREER_WORD[career]}; nothing for you to do here yet`,
      position: at(w.position),
    });
  }
  if (district.id === OFFICE_WORKPLACE.districtId) {
    out.push({
      id: `${district.id}.office-worker`,
      name: OFFICE_WORKPLACE.name,
      kind: 'Office Worker career',
      categories: ['workplaces'],
      status: 'open',
      note: 'Apply, clock in, complete workplace tasks and collect payroll',
      position: { x: OFFICE_WORKPLACE.position[0], z: OFFICE_WORKPLACE.position[2] },
    });
  }
  // Not in the world yet: listed so players know they're coming, never with a Go button
  const city = district.city.name;
  out.push(
    { id: id('planned.mall'), name: `${city} shopping mall`, kind: 'Shopping mall', categories: ['shopping'], status: 'planned', note: 'Planned, not built yet' },
  );
  return out;
}

/** Entries in a category (or all) that match a search, nearest first, planned places last. */
export function filterDirectory(list: readonly Destination[], category: Category | 'all', query: string, from: { x: number; z: number }): (Destination & { distance?: number })[] {
  const q = query.trim().toLowerCase();
  const label = (c: Category) => CATEGORIES.find((x) => x.id === c)!.label.toLowerCase();
  return list
    .filter((d) => category === 'all' || d.categories.includes(category))
    .filter((d) => !q || [d.name, d.kind, d.note, ...d.categories.map(label)].some((s) => s.toLowerCase().includes(q)))
    .map((d) => ({ ...d, distance: d.position ? Math.hypot(d.position.x - from.x, d.position.z - from.z) : undefined }))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
}

/** How many entries each category has (for the filter chips). */
export function categoryCounts(list: readonly Destination[]): Record<Category, number> {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0])) as Record<Category, number>;
  for (const d of list) for (const c of d.categories) counts[c]++;
  return counts;
}
