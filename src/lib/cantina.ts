/**
 * Cantina Ayé: a bright Mexican-style cantina and bar in Ayemara, on the cross
 * street west of The Palms. Yellow walls over red brick, terracotta floor
 * tiles, papel picado strung along the walls, green enamel pendant lamps, a
 * brick bar under a timber canopy with stools, arches with painted plates and
 * sombreros, and square tables with red and green chairs. All of it is the
 * game's own (no bought assets): see world/CantinaInterior.tsx.
 *
 * Sit at a table or on a bar stool and order from the menu: paying works like
 * any meal out (lib/gameState.ts `eat`). Drinks are alcohol-free. Prices are
 * in GHAI, the game's own currency, not real money.
 *
 * Coordinates are the room's own, centred on the floor; the entrance is in the
 * middle of the near wall (−Z), like The Palms.
 */
import { buildLayout, type Building, type DistrictLayout } from './world';
import type { Seat } from './seating';
import type { MenuItem } from './restaurant';

export const CANTINA_NAME = 'Cantina Ayé';

const m = (id: string, name: string, course: MenuItem['course'], price: number, fullness: number, minutes: number, lift: MenuItem['lift'], contains: MenuItem['contains'], description: string): MenuItem =>
  ({ id, name, course, price, fullness, minutes, lift, contains, description });

export const CANTINA_MENU: readonly MenuItem[] = [
  // Small plates
  m('nachos', 'Nachos & Salsa', 'starter', 120, 22, 15, { fun: 5 }, ['dairy'], 'Crisp corn chips with melted cheese, fresh tomato salsa and jalapeños.'),
  m('guacamole', 'Guacamole & Chips', 'starter', 130, 20, 12, { fun: 5 }, [], 'Avocado crushed with lime, onion and coriander, with warm tortilla chips.'),
  m('elote', 'Grilled Corn', 'starter', 90, 15, 10, { fun: 4 }, ['dairy'], 'Charred corn on the cob with lime, chilli and crumbled cheese.'),
  // Mains
  m('burrito', 'Bean & Rice Burrito', 'main', 210, 60, 25, { fun: 6 }, [], 'A big flour tortilla rolled round spiced beans, rice, peppers and salsa.'),
  m('chicken-burrito', 'Chicken Burrito', 'main', 240, 65, 25, { fun: 6 }, ['meat', 'dairy'], 'Grilled chicken, rice, beans, cheese and sour cream, rolled and toasted.'),
  m('tacos', 'Beef Tacos', 'main', 230, 50, 20, { fun: 7 }, ['meat'], 'Three soft corn tacos with slow-cooked beef, onion, coriander and lime.'),
  m('quesadilla', 'Cheese Quesadilla', 'main', 190, 45, 20, { fun: 6 }, ['dairy'], 'Toasted tortilla folded over melted cheese and peppers, cut in wedges.'),
  m('flatbread', 'Cantina Flatbread', 'main', 220, 55, 25, { fun: 6 }, ['dairy'], 'A thin, crisp flatbread with tomato, peppers, sweetcorn and cheese.'),
  // Drinks (all alcohol-free)
  m('horchata', 'Horchata', 'drink', 80, 8, 10, { fun: 4 }, ['dairy'], 'Chilled rice milk with cinnamon and vanilla.'),
  m('agua-jamaica', 'Agua de Jamaica', 'drink', 70, 4, 8, { fun: 4 }, [], 'Iced hibiscus, a cousin of zobo, sweet and tart.'),
  m('limonada', 'Fresh Limonada', 'drink', 70, 4, 8, { fun: 3 }, [], 'Lime, sugar and sparkling water over ice.'),
  m('virgin-margarita', 'Virgin Margarita', 'drink', 110, 4, 10, { fun: 6 }, [], 'Lime, orange and agave over crushed ice, with a salted rim. Alcohol-free.'),
  m('cafe', 'Café de Olla', 'drink', 80, 3, 6, { energy: 6 }, [], 'Spiced coffee from the espresso machine at the bar.'),
  // Sweet
  m('churros', 'Churros & Chocolate', 'dessert', 120, 18, 12, { fun: 8 }, ['dairy', 'egg'], 'Hot sugared churros with a cup of thick chocolate for dipping.'),
  m('flan', 'Caramel Flan', 'dessert', 110, 15, 10, { fun: 7 }, ['dairy', 'egg'], 'Silky baked custard under a dark caramel.'),
];

export const cantinaItem = (id: string) => CANTINA_MENU.find((i) => i.id === id);
export const DRINK_IDS: ReadonlySet<string> = new Set(CANTINA_MENU.filter((i) => i.course === 'drink').map((i) => i.id));

/** Open from noon until late. */
export const OPEN_HOUR = 12;
export const CLOSE_HOUR = 2;
export const isOpen = (hour: number) => hour >= OPEN_HOUR || hour < CLOSE_HOUR;


// ---------------------------------------------------------------- the room

export const ROOM = { width: 16, depth: 12 } as const;
export const ROOM_HEIGHT = 3.4;
export const DOOR_SPOT = [0, -ROOM.depth / 2 + 0.8] as const;
/** How high the brick goes up the walls; yellow plaster above. */
export const BRICK_HEIGHT = 1.15;

/** The brick bar along the back, its front facing the room, with a short return at the right end. */
export const BAR = { x0: 0.6, x1: 6.4, front: 2.7, depth: 0.7, h: 1.08 } as const;
export const BAR_RETURN = { x: 6.75, z0: 1.4, z1: BAR.front + BAR.depth } as const;
/** Timber canopy over the bar on two green posts. */
export const CANOPY = { x0: 0.3, x1: 7.2, z0: 2.3, z1: ROOM.depth / 2, y: 2.55 } as const;
/** Where you stand to order at the bar (in front of the till). */
export const BAR_SPOT = [3.5, BAR.front - 0.9] as const;
/** Blue doors at the back left: the kitchen and the toilets (staff and customers' doors, not for walking through). */
export const BACK_DOORS = [-1.2, -3.6] as const;
/** The arcade along the left wall: brick pillars with yellow arches, the alcove wall behind. */
export const ARCADE_X = -6.3;
export const PILLARS = [-4.2, -0.6, 3.0] as const;

const SEAT_H = 0.46;
const STOOL_H = 0.74;
export const TABLE_SIZE = 0.82;
const CHAIR_OFFSET = 0.66;

export interface CantinaTable {
  id: string;
  x: number;
  z: number;
  /** West, east, south (near) and north (far) chairs. */
  seats: readonly Seat[];
}

const table = (id: string, x: number, z: number): CantinaTable => ({
  id, x, z,
  seats: [
    { id: `${id}-w`, x: x - CHAIR_OFFSET, z, facing: Math.PI / 2, height: SEAT_H, approach: { x: x - CHAIR_OFFSET - 0.65, z } },
    { id: `${id}-e`, x: x + CHAIR_OFFSET, z, facing: -Math.PI / 2, height: SEAT_H, approach: { x: x + CHAIR_OFFSET + 0.65, z } },
    { id: `${id}-s`, x, z: z - CHAIR_OFFSET, facing: 0, height: SEAT_H, approach: { x, z: z - CHAIR_OFFSET - 0.65 } },
    { id: `${id}-n`, x, z: z + CHAIR_OFFSET, facing: Math.PI, height: SEAT_H, approach: { x, z: z + CHAIR_OFFSET + 0.65 } },
  ],
});

export const TABLES: readonly CantinaTable[] = [
  table('c1', -4.4, -3.4), table('c2', -4.4, 0.2),
  table('c3', -1.7, -3.4), table('c4', 2.4, -3.4),
  table('c5', 5.3, -3.4), table('c6', 4.0, -0.4),
];

/** Green-topped stools along the bar, facing it. */
export const STOOLS: readonly Seat[] = [1.4, 2.8, 4.2, 5.6].map((x, i) => ({
  id: `stool-${i}`, x, z: BAR.front - 0.45, facing: 0, height: STOOL_H, approach: { x, z: BAR.front - 1.2 },
}));

/** Computer-controlled customers: where each sits. */
export const REGULARS: readonly { seatId: string; lookId: string; name: string }[] = [
  { seatId: 'c1-w', lookId: 'female-adult-11', name: 'Funmi' },
  { seatId: 'c1-n', lookId: 'male-adult-04', name: 'Kofi' },
  { seatId: 'c4-e', lookId: 'male-adult-01', name: 'Bayo' },
  { seatId: 'c5-n', lookId: 'female-adult-03', name: 'Chioma' },
  { seatId: 'c5-s', lookId: 'male-adult-10', name: 'Musa' },
  { seatId: 'stool-3', lookId: 'male-adult-15', name: 'Alhaji Sani' },
];

export const STAFF = {
  bartender: { lookId: 'male-adult-12', name: 'Diego', role: 'Bartender', x: 3.5, z: BAR.front + BAR.depth + 0.75, facing: Math.PI },
  waiter: { lookId: 'female-adult-08', name: 'Rosa', role: 'Waiter' },
} as const;

/** The waiter's round: from the bar, between the tables and back. */
export const WAITER_ROUTE: readonly (readonly [number, number])[] = [
  [0.2, 1.6], [-3.0, 1.6], [-3.0, -1.6], [0.6, -1.6], [3.4, -1.9], [6.8, -1.9], [6.8, 0.9], [0.2, 0.9],
];

const ALL_SEATS: readonly Seat[] = [...TABLES.flatMap((t) => t.seats), ...STOOLS];
export const seatById = (id: string) => ALL_SEATS.find((s) => s.id === id);
/** Every chair and stool a guest can take (not a regular's). */
export const FREE_SEATS: readonly Seat[] = ALL_SEATS.filter((s) => !REGULARS.some((r) => r.seatId === s.id));
export const tableOfSeat = (seatId: string) => TABLES.find((t) => t.seats.some((s) => s.id === seatId));

const WALL = 0.2;

/** Walls, bar, pillars and tables as a collision layout (flat floor, no streets). */
export function cantinaLayout(): DistrictLayout {
  const { width: w, depth: d } = ROOM;
  const solid = (x: number, z: number, sx: number, sz: number, h = ROOM_HEIGHT): Building =>
    ({ position: [x, 0, z], size: [sx, h, sz], color: '#000', style: 'residential' });
  const buildings: Building[] = [
    solid(0, d / 2 + WALL / 2, w + 2 * WALL, WALL),
    solid(-w / 2 - WALL / 2, 0, WALL, d),
    solid(w / 2 + WALL / 2, 0, WALL, d),
    solid(-(w / 4 + 0.4), -d / 2 - WALL / 2, w / 2 - 0.8, WALL),
    solid(w / 4 + 0.4, -d / 2 - WALL / 2, w / 2 - 0.8, WALL),
    // The doorway: you leave with E, not by walking out
    solid(0, -d / 2 - WALL - 0.1, 1.6, WALL),
    // The bar, its return, and everything behind it (staff only)
    solid((BAR.x0 + BAR.x1) / 2, BAR.front + BAR.depth / 2, BAR.x1 - BAR.x0, BAR.depth, BAR.h),
    solid(BAR_RETURN.x, (BAR_RETURN.z0 + BAR_RETURN.z1) / 2, 0.7, BAR_RETURN.z1 - BAR_RETURN.z0, BAR.h),
    solid((BAR.x0 + w / 2) / 2, (BAR.front + BAR.depth + d / 2) / 2, w / 2 - BAR.x0, d / 2 - BAR.front - BAR.depth, 2),
    // Canopy posts at the bar's front corners
    solid(CANOPY.x0 + 0.1, CANOPY.z0 + 0.1, 0.24, 0.24),
    solid(CANOPY.x1 - 0.1, CANOPY.z0 + 0.1, 0.24, 0.24),
    // The arcade's brick pillars
    ...PILLARS.map((z) => solid(ARCADE_X, z, 0.55, 0.55)),
    // Tables are solid; chairs stay walkable so you can reach your seat
    ...TABLES.map((t) => solid(t.x, t.z, TABLE_SIZE, TABLE_SIZE, 0.76)),
  ];
  return buildLayout({
    id: 'venue.cantina-aye',
    roadHalfWidth: 1000,
    pavementWidth: 0,
    crossStreet: { minZ: 5000, maxZ: 5001 },
    buildings,
    palms: null,
    lamps: { x: 0, spacing: 1000, offset: 5000 },
    powerPoles: [],
    vehicles: [],
    stalls: [],
    traffic: [],
    billboard: null,
    park: null,
    terraceChairs: [],
    skyline: { seed: 1, warm: ['#000'], glass: ['#000'], towerChance: 0 },
  });
}
