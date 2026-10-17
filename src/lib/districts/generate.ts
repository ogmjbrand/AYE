/**
 * Districts made from data. Hand-built districts (lagos.ts, accra.ts) have
 * their own street plans; every other city reuses one of those plans, turned
 * or mirrored so that neighbouring cities don't look alike, and dressed in its
 * own names, food, music, fashion and colours from a CitySeed.
 *
 * The street plans are only reused, never edited, so every rule the hand-built
 * districts pass (clear doors, reachable benches, nothing inside a building)
 * holds for the generated ones as well; the tests run over all of them.
 *
 * A generated district is a block inspired by the city, not a map of it:
 * names of businesses and buildings are made up.
 */
import type { Career } from '../../components/CharacterCreation';
import type { CareerLocation } from '../careers';
import type { FoodVendor } from '../food';
import type { City, Counter, DistrictSpec } from '../geography';
import type { Home } from '../homes';
import type { Neighborhood } from '../neighborhoods';
import type { Building, LayoutSpec, ParkLayout, TrafficLane, Vehicle, VehicleKind } from '../world';

/** Muted car paints: greys, a dark blue, a deep red, a sand. */
const CAR_COLORS = ['#8a8f96', '#2b3440', '#c9c5bc', '#6b2a2a', '#2f4a6b', '#b8ab92'];
/** Keke and tuk-tuk paints: ochre, teal, maroon. */
const TRICYCLE_COLORS = ['#c99a2e', '#3d6e7a', '#7a3d3d'];
/** Jeepney body paints under the chrome: deep blue, maroon, teal. */
const JEEPNEY_COLORS = ['#2f4a6b', '#6b2a2a', '#2e6b62'];
import { WORLD_BOUND } from '../world';
import { LAGOS_MARINA } from './lagos';
import { ACCRA_OSU } from './accra';
import { AVENUE } from './avenue';

type Spot = readonly [number, number, number];
type WorkCareer = Exclude<Career, 'none'>;

/** How a street plan is laid down: as built, turned round, or mirrored across or along the boulevard. */
export type Variant = 'as-built' | 'turned' | 'mirrored' | 'flipped';
const VARIANTS: readonly Variant[] = ['as-built', 'turned', 'mirrored', 'flipped'];
const SIGNS: Record<Variant, readonly [1 | -1, 1 | -1]> = {
  'as-built': [1, 1], turned: [-1, -1], mirrored: [-1, 1], flipped: [1, -1],
};

/** What every vendor, home and building in a street plan is for, so it can be renamed. */
type Role = `vendor:${'kitchen' | 'snacks' | 'second'}` | `home:${number}` | 'fashion' | 'gadgets' | 'night' | `work:${WorkCareer}`;

interface Template {
  spec: DistrictSpec;
  /** The role of each vendor, in order. */
  vendors: readonly ('kitchen' | 'snacks' | 'second')[];
  /** Named buildings and what they are. */
  buildings: Readonly<Record<string, Role>>;
  /** New names for the plan's neighbourhoods (ids stay, workplaces refer to them). */
  neighborhoods: Readonly<Record<string, { name: string; description: string }>>;
  /** Which set of home kinds its homes take (RegionStyle.homes). */
  homeSet: 'marina' | 'osu';
  /** Where its three residents stand and stroll: a bus worker, a nurse or designer, a developer or footballer. */
  people: readonly ResidentSlot[];
}

export interface ResidentSlot {
  position: Spot;
  facing: number;
  route: readonly (readonly [number, number])[];
  female: boolean;
}
const slot = (x: number, z: number, facing: number, route: [number, number][], female = false): ResidentSlot => ({ position: [x, 0, z], facing, route, female });

export const TEMPLATES = {
  marina: {
    spec: LAGOS_MARINA,
    vendors: ['kitchen', 'snacks', 'second'],
    buildings: {
      'Mama Put': 'vendor:kitchen', 'Taste of Africa': 'vendor:second',
      'Marina Court': 'home:0', 'Palm View': 'home:1', 'Eko Gardens': 'home:2', 'Marina Heights': 'home:3',
      'Tech Campus': 'work:engineer', 'Gadget Hub': 'gadgets', University: 'work:student', 'General Hospital': 'work:doctor',
      'Lagoon Live': 'night', 'Art Studio': 'work:artist', 'Fashion House': 'fashion',
    },
    neighborhoods: {
      downtown: { name: 'City Centre', description: 'Banks, offices and the main junction' },
      harbor: { name: 'Market Quarter', description: 'Traders, stalls and bus stops' },
      uptown: { name: 'GRA', description: 'Quiet residential streets and clinics' },
      industrial: { name: 'Industrial Layout', description: 'Workshops, warehouses and the tech campus' },
      parks: { name: 'Recreation Ground', description: 'Sports fields and open space' },
    },
    homeSet: 'marina',
    people: [
      slot(5.2, 29.5, -Math.PI / 2, [[5.2, 29.5], [5.2, 34.5]]),
      slot(5.2, -2, -Math.PI / 2, [[5.2, -2], [5.2, -10]], true),
      slot(-5.2, 14, Math.PI / 2, [[-5.2, 14], [-5.2, 19]]),
    ],
  },
  osu: {
    spec: ACCRA_OSU,
    vendors: ['kitchen', 'second', 'snacks'],
    buildings: {
      'Osu Chop Bar': 'vendor:kitchen', "Auntie Muni's Waakye": 'vendor:second',
      'Labone Court': 'home:0', 'Osu Heights': 'home:1', 'Cantonments Towers': 'home:2',
      'Accra Tech Hub': 'work:engineer', 'Kente Loft': 'fashion', 'Osu Gadgets': 'gadgets', 'Osu Nights': 'night',
      'Accra Business School': 'work:student', 'Osu Clinic': 'work:doctor', 'Labadi Arts Centre': 'work:artist',
      'Osu Coworking': 'work:entrepreneur', 'Airline Crew Centre': 'work:pilot', 'Accra Sports Arena': 'work:athlete',
    },
    neighborhoods: {
      'oxford-street': { name: 'Main Road', description: 'Shops, kitchens and nightlife' },
      labone: { name: 'New Layout', description: 'Newer streets and apartments' },
      'osu-west': { name: 'Old Town', description: 'Older houses, crafts and colleges' },
      cantonments: { name: 'GRA', description: 'Offices, towers and the sports ground' },
    },
    homeSet: 'osu',
    people: [
      slot(7.2, 32, -Math.PI / 2, [[7.2, 32], [7.2, 36]]),
      slot(-7, -9, Math.PI / 2, [[-7, -9], [-7.4, -12]], true),
      slot(19, 1.5, Math.PI, [[19, 1.5], [19, -10]]),
    ],
  },
  avenue: {
    spec: AVENUE,
    vendors: ['kitchen', 'snacks', 'second'],
    buildings: {
      Kitchen: 'vendor:kitchen', Second: 'vendor:second',
      'Home A': 'home:0', 'Home B': 'home:1', 'Home C': 'home:2', 'Home D': 'home:3',
      Tech: 'work:engineer', Gadgets: 'gadgets', College: 'work:student', Hospital: 'work:doctor',
      Lounge: 'night', Arts: 'work:artist', Fashion: 'fashion', Business: 'work:entrepreneur',
    },
    neighborhoods: {
      avenue: { name: 'Main Avenue', description: 'Shops, kitchens and offices' },
      east: { name: 'East Side', description: 'Towers and apartments' },
      west: { name: 'West Side', description: 'Offices, the college and the park' },
    },
    homeSet: 'marina',
    people: [
      slot(6.2, 33.5, -Math.PI / 2, [[6.2, 33.5], [6.2, 36.5]]),
      slot(6.2, -4, -Math.PI / 2, [[6.2, -4], [6.2, -9]], true),
      slot(-18, 30, Math.PI / 2, [[-18, 30], [-18, 35]]),
    ],
  },
} as const satisfies Record<string, Template>;
export type TemplateId = keyof typeof TEMPLATES;

/** A dish menu and a few possible names for one kind of food place. */
export interface VendorStyle {
  names: readonly string[];
  kind: string;
  menu: readonly string[];
}

/** What a region's streets are like: food, music, clothes, colours. Shared by the cities in it. */
export interface RegionStyle {
  kitchen: VendorStyle;
  snacks: VendorStyle;
  second: VendorStyle;
  lounge: { names: readonly string[]; description: string };
  fashion: { name: string; kind: string };
  park: { names: readonly string[]; description: string };
  /** Walls of low buildings and the distant skyline. */
  walls: readonly string[];
  /** Parked and moving minibuses. */
  buses: readonly string[];
  busStripes: boolean;
  /** What's on the road: minibuses (default), ordinary cars, or both. */
  vehicles?: 'minibus' | 'car' | 'mixed' | readonly VehicleKind[];
  /** Kerbs and edge lines: painted black-and-yellow (default) or plain grey with white lines. */
  streetStyle?: 'painted' | 'plain';
  /** Home kinds and descriptions by plan slot (marina has 4 homes, osu 3). */
  homes: Readonly<Record<'marina' | 'osu', readonly { kind: string; description: string }[]>>;
  /** Palm trees along the boulevard (off for cold or high cities). Default true. */
  palms?: boolean;
  /** What the person who calls the stops on a minibus is called there. Default "Bus conductor". */
  busRole?: string;
  /** Names for the district's residents. */
  names: { male: readonly string[]; female: readonly string[]; family: readonly string[] };
}

export interface CitySeed {
  id: string;
  name: string;
  /** State, region or province. */
  region: string;
  country: string;
  timeZone: string;
  currency: string;
  lat: number;
  lon: number;
  /** The district's name, a well-known part of town; "City Centre" if not given. */
  area?: string;
  style: RegionStyle;
  /** Rents and cover charges compared with Lagos (1). */
  cost: number;
  /** Islands and other continents have their own; coaches only run within one. Mainland Africa if omitted. */
  landmass?: string;
  /** Traffic keeps to the left (UK, Japan, India, Australia...). */
  driveLeft?: boolean;
  /** Pick the street plan and how it's laid instead of deriving them from the id. */
  template?: TemplateId;
  variant?: Variant;
}

/** Small stable hash, so a city always gets the same plan and names. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
export const pick = <T,>(list: readonly T[], seed: string): T => list[hashString(seed) % list.length];
export const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const round10 = (n: number) => Math.max(10, Math.round(n / 10) * 10);

// ---------------------------------------------------------------- laying a plan down

interface Frame {
  sx: 1 | -1;
  sz: 1 | -1;
}

const pt = (f: Frame, p: Spot): Spot => [p[0] * f.sx, p[1], p[2] * f.sz];
const face = (f: Frame, a: number) => Math.atan2(f.sx * Math.sin(a), f.sz * Math.cos(a));
function rect<R extends { minX: number; maxX: number; minZ: number; maxZ: number }>(f: Frame, r: R): R {
  const [x0, x1] = f.sx > 0 ? [r.minX, r.maxX] : [-r.maxX, -r.minX];
  const [z0, z1] = f.sz > 0 ? [r.minZ, r.maxZ] : [-r.maxZ, -r.minZ];
  return { ...r, minX: x0, maxX: x1, minZ: z0, maxZ: z1 };
}

/** Palms and lamps repeat from the south end; flipping north–south needs the offset that gives the mirrored row. */
function flipOffset(row: { spacing: number; offset: number }) {
  const n = Math.floor((2 * WORLD_BOUND - row.offset) / row.spacing);
  return 2 * WORLD_BOUND - row.offset - n * row.spacing;
}

function layLayout(L: LayoutSpec, f: Frame, id: string): LayoutSpec {
  const C = L.crossStreet;
  const park: ParkLayout | null = L.park && {
    area: rect(f, L.park.area),
    trees: L.park.trees.map(([x, z]) => [x * f.sx, z * f.sz] as const),
    benches: L.park.benches.map((b) => ({ x: b.x * f.sx, z: b.z * f.sz, facing: face(f, b.facing) })),
    paths: L.park.paths.map((p) => {
      const r = rect(f, { minX: p.x0, maxX: p.x1, minZ: p.z0, maxZ: p.z1 });
      return { x0: r.minX, x1: r.maxX, z0: r.minZ, z1: r.maxZ };
    }),
  };
  const row = <R extends { x: number; spacing: number; offset: number }>(r: R): R => (f.sz > 0 ? r : { ...r, offset: flipOffset(r) });
  return {
    ...L,
    id,
    crossStreet: f.sz > 0 ? C : { minZ: -C.maxZ, maxZ: -C.minZ },
    // Flipped north–south, buildings are listed in reverse so collisions resolve in the same physical order as the plan
    buildings: (f.sz > 0 ? L.buildings : [...L.buildings].reverse()).map((b) => ({ ...b, position: pt(f, b.position) })),
    palms: L.palms && row(L.palms),
    lamps: row(L.lamps),
    powerPoles: L.powerPoles.map((p) => pt(f, p)),
    // Parked buses keep to the right-hand kerb: turn them round when they change side
    vehicles: L.vehicles.map((v): Vehicle => ({ ...v, position: pt(f, v.position), heading: f.sx > 0 ? v.heading : v.heading + Math.PI })),
    stalls: L.stalls.map((p) => pt(f, p)),
    // Moving traffic stays as it is: both lanes are symmetric, and turning them would swap to driving on the left
    traffic: L.traffic,
    billboard: L.billboard && pt(f, L.billboard),
    park,
    terraceChairs: L.terraceChairs.map((c) => ({ x: c.x * f.sx, z: c.z * f.sz, facing: face(f, c.facing) })),
  };
}

// ---------------------------------------------------------------- dressing it

/** Which street plan a city gets, how it's laid, and its district id. */
export function planFor(seed: CitySeed) {
  // A third of the cities get the avenue; the rest keep the plan they had before it existed
  const h = hashString(seed.id);
  const template: TemplateId = seed.template ?? ((h >>> 7) % 3 === 0 ? 'avenue' : h % 2 ? 'osu' : 'marina');
  const variant: Variant = seed.variant ?? VARIANTS[(hashString(seed.id) >>> 3) % VARIANTS.length];
  const [sx, sz] = SIGNS[variant];
  const area = seed.area ?? 'City Centre';
  return { template, variant, frame: { sx, sz } as Frame, area, id: `${seed.id}.${slug(area)}` };
}

/** A point and a facing from the plan, as laid in the city. */
export function placeIn(seed: CitySeed, p: Spot, facing = 0) {
  const { frame } = planFor(seed);
  return { position: pt(frame, p), facing: face(frame, facing) };
}

export function generateDistrict(seed: CitySeed): DistrictSpec {
  const { template: templateId, frame: f, area, id } = planFor(seed);
  const T: Template = TEMPLATES[templateId];
  const S = seed.style;
  const city: City = { id: seed.id, name: seed.name, region: seed.region, country: seed.country, timeZone: seed.timeZone, currency: seed.currency, lat: seed.lat, lon: seed.lon, ...(seed.landmass ? { landmass: seed.landmass } : {}) };
  const at = (p: Spot) => pt(f, p);

  const vendorStyle = { kitchen: S.kitchen, snacks: S.snacks, second: S.second };
  const vendors: FoodVendor[] = T.spec.vendors.map((v, i) => {
    const role = T.vendors[i];
    const style = vendorStyle[role];
    const name = pick(style.names, `${seed.id}:${role}`).replace('{city}', seed.name);
    return { id: slug(name), name, kind: style.kind, position: at(v.position), menu: style.menu };
  });

  const homeKinds = S.homes[T.homeSet];
  const homeBuildings = homeNames(seed, area, T.spec.homes.length);
  const homes: Home[] = T.spec.homes.map((h, i) => ({
    id: `${seed.id}-${slug(homeKinds[i].kind)}`,
    district: id,
    name: `${homeBuildings[i]}, ${homeUnit(i, T.spec.homes.length)}`,
    kind: homeKinds[i].kind,
    building: homeBuildings[i],
    door: at(h.door),
    rentPerNight: round10(h.rentPerNight * seed.cost),
    description: homeKinds[i].description,
  }));

  const work = workplaceNames(seed.name);
  const workplaces = Object.fromEntries(
    (Object.entries(T.spec.workplaces) as [WorkCareer, CareerLocation][]).map(([career, w]) => [
      career,
      { ...w, ...work[career], position: [...at(w.position)] as [number, number, number] },
    ]),
  ) as Record<WorkCareer, CareerLocation>;

  const fashionHouse: Counter = { name: `${seed.name} ${S.fashion.name}`, kind: S.fashion.kind, position: at(T.spec.fashionHouse.position) };
  const gadgetHub: Counter = { name: `${seed.name} Gadgets`, kind: 'Phones, laptops & work kit', position: at(T.spec.gadgetHub.position) };
  const travelDesk: Counter = { name: `${seed.name} Travel`, kind: 'Flights & coaches', position: at(T.spec.travelDesk.position) };
  const loungeName = pick(S.lounge.names, `${seed.id}:lounge`).replace('{city}', seed.name);
  const nightlife = {
    ...T.spec.nightlife,
    id: slug(loungeName), name: loungeName, description: S.lounge.description,
    position: at(T.spec.nightlife.position), cover: round10(T.spec.nightlife.cover * seed.cost),
  };
  const parkName = `${seed.name} ${pick(S.park.names, `${seed.id}:park`)}`;
  const park = { ...T.spec.park, id: slug(parkName), name: parkName, description: S.park.description, position: at(T.spec.park.position) };

  // Rename the plan's buildings for what they now are
  const nameFor = (role: Role): string | undefined => {
    if (role.startsWith('vendor:')) return vendors[T.vendors.indexOf(role.slice(7) as 'kitchen')]?.name;
    if (role.startsWith('home:')) return homeBuildings[Number(role.slice(5))];
    if (role.startsWith('work:')) return work[role.slice(5) as WorkCareer].name;
    return { fashion: fashionHouse.name, gadgets: gadgetHub.name, night: nightlife.name }[role as 'fashion'];
  };
  const layout = layLayout(T.spec.layout, f, id);
  const walls = S.walls;
  const buildings: Building[] = layout.buildings.map((b, i) => {
    const role = b.name ? T.buildings[b.name] : undefined;
    const color = b.style === 'tower' ? b.color : walls[hashString(`${seed.id}:${i}`) % walls.length];
    return { ...b, color, name: role ? nameFor(role) : undefined };
  });
  // Cars, minibuses or a mix of the two, each in its own colours
  const mix: readonly VehicleKind[] = typeof S.vehicles === 'object' ? S.vehicles : S.vehicles === 'car' ? ['car'] : S.vehicles === 'mixed' ? ['minibus', 'car'] : ['minibus'];
  const kindAt = (i: number): VehicleKind => mix[i % mix.length];
  const paletteFor = (kind: VehicleKind) => (kind === 'car' ? CAR_COLORS : kind === 'tricycle' ? TRICYCLE_COLORS : kind === 'jeepney' ? JEEPNEY_COLORS : S.buses);
  const recolour = <V extends { color: string }>(v: V, i: number): V => {
    const colors = paletteFor(kindAt(i));
    return { ...v, color: colors[(hashString(seed.id) + i) % colors.length] };
  };
  // Driving on the left: lanes swap sides (same direction of travel per side flips), parked buses turn round
  const left = seed.driveLeft ? -1 : 1;
  const traffic: TrafficLane[] = layout.traffic.map((l, i) => ({ ...l, x: l.x * left, colors: paletteFor(kindAt(i)), stripes: S.busStripes, kind: kindAt(i) }));

  const neighborhoods: Neighborhood[] = T.spec.neighborhoods.map((n) => ({ ...n, ...T.neighborhoods[n.id], bounds: rect(f, n.bounds) }));

  return {
    id,
    city,
    name: area,
    spawn: at(T.spec.spawn),
    layout: {
      ...layout,
      buildings,
      vehicles: layout.vehicles.map((v, i) => ({ ...recolour(v, i), stripes: S.busStripes, kind: kindAt(i), heading: seed.driveLeft ? v.heading + Math.PI : v.heading })),
      streetStyle: S.streetStyle ?? 'painted',
      palms: S.palms === false ? null : layout.palms,
      traffic,
      skyline: { ...layout.skyline, seed: hashString(seed.id) % 100000, warm: walls },
    },
    neighborhoods,
    vendors,
    fashionHouse,
    gadgetHub,
    travelDesk,
    homes,
    workplaces,
    nightlife,
    park,
  };
}

function homeNames(seed: CitySeed, area: string, count: number): string[] {
  const place = area === 'City Centre' ? seed.name : area;
  const all = [`${place} Court`, `${seed.name} Gardens`, `${place} Villas`, `${seed.name} Towers`];
  // The last home is always the tower
  return [...all.slice(0, count - 1), all[3]];
}

const homeUnit = (i: number, count: number) => (i === count - 1 ? 'top floor' : ['flat 2', 'flat 7', 'flat 12'][i]);

function workplaceNames(city: string): Record<WorkCareer, { name: string; description: string }> {
  return {
    student: { name: `${city} College`, description: 'Lectures and study groups' },
    artist: { name: `${city} Arts Centre`, description: 'Studios and gallery space' },
    entrepreneur: { name: `${city} Business Centre`, description: 'Desks, meeting rooms and investors' },
    athlete: { name: `${city} Sports Centre`, description: 'Training ground and gym' },
    engineer: { name: `${city} Tech Hub`, description: 'Start-ups and software studios' },
    doctor: { name: `${city} General Hospital`, description: 'Outpatients and emergency care' },
    pilot: { name: 'Crew Office', description: 'Briefings before every flight' },
  };
}
