/**
 * The Palms: a fine-dining restaurant and lounge you walk into from the
 * street (Lagos, on the cross street by Mama Put). Inside: a host desk, a
 * lit bar, round tables under chandeliers, a kitchen pass, and staff and
 * diners who are computer-controlled.
 *
 * Check in with the host (or walk up to a free table), sit, open the menu
 * and order. Paying is the same as any meal out (lib/gameState.ts `eat`): the
 * price comes off your GHAI, fullness goes up, the meal counts as eating out
 * for missions, and time passes while you eat. A good meal also lifts fun.
 *
 * It's fine dining: a main costs about ten times a plate at Mama Put. Prices
 * are in GHAI, the game's own currency, not real money.
 *
 * Coordinates are the room's own, centred on the middle of the floor; the
 * entrance is in the middle of the near wall (−Z), like the homes.
 */
import { buildLayout, type Building, type DistrictLayout } from './world';
import type { AnimalProduct, Diet } from './food';
import { suitsDiet } from './food';
import { CHAIR_SEAT_HEIGHT, type Seat } from './seating';
import type { Needs } from './needs';

export type Course = 'starter' | 'main' | 'drink' | 'dessert';

export const COURSES: readonly { id: Course | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'starter', label: 'Starters' },
  { id: 'main', label: 'Main Course' },
  { id: 'drink', label: 'Drinks' },
  { id: 'dessert', label: 'Dessert' },
];

export interface MenuItem {
  id: string;
  name: string;
  course: Course;
  description: string;
  /** Price in GHAI. */
  price: number;
  /** How much fullness rises (0–100). */
  fullness: number;
  /** Game minutes it takes to eat or drink. */
  minutes: number;
  /** What a good meal does for you besides filling you up. */
  lift: Partial<Needs>;
  contains: readonly AnimalProduct[];
}

const m = (id: string, name: string, course: Course, price: number, fullness: number, minutes: number, lift: Partial<Needs>, contains: AnimalProduct[], description: string): MenuItem =>
  ({ id, name, course, price, fullness, minutes, lift, contains, description });

export const PALMS_MENU: readonly MenuItem[] = [
  // Main course
  m('grilled-salmon', 'Grilled Salmon', 'main', 480, 60, 35, { fun: 8 }, ['fish'], 'Chargrilled salmon fillet with lemon butter, crushed new potatoes and greens.'),
  m('jollof-chicken', 'Jollof Rice & Chicken', 'main', 350, 65, 30, { fun: 6 }, ['meat'], 'Smoky party jollof with a grilled, peppered chicken leg and sweet plantain.'),
  m('steak-mash', 'Steak & Mash', 'main', 520, 70, 40, { fun: 8 }, ['meat', 'dairy'], 'Sirloin steak cooked to order, buttery mash, green beans and pepper sauce.'),
  m('seafood-pasta', 'Seafood Pasta', 'main', 460, 65, 35, { fun: 8 }, ['fish', 'dairy', 'egg'], 'Linguine with prawns, mussels and calamari in a light tomato and garlic sauce.'),
  m('grilled-prawns', 'Grilled Prawns', 'main', 500, 50, 30, { fun: 9 }, ['fish'], 'Tiger prawns grilled with suya spice and lime, on herb rice.'),
  m('vegetable-bowl', 'Vegetable Bowl', 'main', 320, 55, 25, { fun: 6 }, [], 'Roasted sweet potato, avocado, beans, greens and grains with a groundnut dressing.'),
  // Starters
  m('pepper-soup', 'Catfish Pepper Soup', 'starter', 220, 22, 15, { fun: 4 }, ['fish'], 'A hot, fragrant broth with catfish, uziza and scent leaf.'),
  m('suya-skewers', 'Suya Skewers', 'starter', 240, 25, 15, { fun: 5 }, ['meat'], 'Spiced beef skewers with yaji, red onion and tomato.'),
  m('spring-rolls', 'Vegetable Spring Rolls', 'starter', 180, 20, 12, { fun: 4 }, [], 'Crisp rolls of cabbage, carrot and peppers, with sweet chilli dip.'),
  m('avocado-salad', 'Avocado & Mango Salad', 'starter', 200, 18, 12, { fun: 4 }, [], 'Avocado, mango, cucumber and toasted groundnuts with lime.'),
  // Drinks
  m('chapman', 'Chapman', 'drink', 120, 6, 10, { fun: 5 }, [], 'The Ayemara classic: fruity, fizzy and bright red, with cucumber and orange.'),
  m('zobo', 'Zobo Spritz', 'drink', 90, 5, 10, { fun: 4 }, [], 'Chilled hibiscus with ginger, pineapple and sparkling water.'),
  m('orange-juice', 'Fresh Orange Juice', 'drink', 110, 8, 8, { fun: 3 }, [], 'Squeezed to order.'),
  m('palm-mocktail', 'The Palms Mocktail', 'drink', 150, 6, 12, { fun: 6 }, [], 'Passion fruit, lime and mint over crushed ice. Alcohol-free.'),
  m('espresso', 'Espresso', 'drink', 100, 3, 6, { energy: 6 }, [], 'A short, strong coffee. Wakes you up a little.'),
  // Dessert
  m('lava-cake', 'Chocolate Lava Cake', 'dessert', 260, 22, 15, { fun: 9 }, ['dairy', 'egg'], 'Warm chocolate cake with a molten middle and vanilla ice cream.'),
  m('puff-puff-ice', 'Puff-Puff & Ice Cream', 'dessert', 180, 20, 12, { fun: 8 }, ['dairy'], 'Warm puff-puff dusted with sugar, with a scoop of vanilla.'),
  m('fruit-platter', 'Tropical Fruit Platter', 'dessert', 200, 15, 12, { fun: 6 }, [], 'Pineapple, mango, watermelon and pawpaw.'),
  m('cheesecake', 'Baked Cheesecake', 'dessert', 240, 20, 12, { fun: 8 }, ['dairy', 'egg'], 'Vanilla cheesecake with a passion-fruit glaze.'),
];

export const menuItemById = (id: string): MenuItem | undefined => PALMS_MENU.find((i) => i.id === id);
export const menuFor = (course: Course | 'all') => (course === 'all' ? PALMS_MENU : PALMS_MENU.filter((i) => i.course === course));
export const suitsYou = (item: MenuItem, diet: Diet) => suitsDiet(item, diet);

/** Why you can't order this now, or null if you can. */
export function orderProblem(item: MenuItem, diet: Diet, balance: number, seated: boolean): string | null {
  if (!suitsYou(item, diet)) return 'Not for your diet';
  if (!seated) return 'Sit at a table to order';
  if (balance < item.price) return 'Not enough GHAI';
  return null;
}

/** Open from late morning until late. */
export const OPEN_HOUR = 11;
export const CLOSE_HOUR = 23;
export const isOpen = (hour: number) => hour >= OPEN_HOUR && hour < CLOSE_HOUR;

// ---------------------------------------------------------------- the room

export const ROOM = { width: 18, depth: 13 } as const;
export const ROOM_HEIGHT = 4.2;
export const DOOR_SPOT = [0, -ROOM.depth / 2 + 0.8] as const;

export interface DiningTable {
  id: string;
  x: number;
  z: number;
  /** Two chairs: across the table from each other along X. */
  seats: readonly [Seat, Seat];
}

/** Table top radius and how far each chair stands from the table's centre. */
export const TABLE_RADIUS = 0.6;
const CHAIR_OFFSET = 0.95;

const table = (id: string, x: number, z: number): DiningTable => ({
  id, x, z,
  seats: [
    // West chair faces east (+x), east chair faces west
    // Facing the table, so you sit down from behind the chair (the table is in front)
    { id: `${id}-w`, x: x - CHAIR_OFFSET, z, facing: Math.PI / 2, height: CHAIR_SEAT_HEIGHT, approach: { x: x - CHAIR_OFFSET - 0.75, z } },
    { id: `${id}-e`, x: x + CHAIR_OFFSET, z, facing: -Math.PI / 2, height: CHAIR_SEAT_HEIGHT, approach: { x: x + CHAIR_OFFSET + 0.75, z } },
  ],
});

export const TABLES: readonly DiningTable[] = [
  table('t1', -3.2, -1.2), table('t2', 0.8, -1.2), table('t3', 4.8, -1.2),
  table('t4', -3.2, 2.6), table('t5', 0.8, 2.6), table('t6', 4.8, 2.6),
];

/** The host's desk, just inside on the right; you check in standing in front of it. */
export const HOST_DESK = { x: 3.2, z: -4.7, w: 1.8, d: 0.7, h: 1.1 } as const;
export const HOST_SPOT = [HOST_DESK.x, HOST_DESK.z - 0.9] as const;
/** The bar along the left wall, and the kitchen pass on the back wall. */
export const BAR = { x: -7.6, z: 0.5, w: 1.0, d: 7.5, h: 1.1 } as const;
export const PASS = { x: 6.2, z: ROOM.depth / 2 - 0.5, w: 3.2, d: 0.6, h: 1.05 } as const;

/** Tables taken by computer-controlled diners (one person each, in the west chair). */
export const DINERS: readonly { tableId: string; seat: 0 | 1; lookId: string; name: string }[] = [
  { tableId: 't1', seat: 1, lookId: 'female-adult-03', name: 'Adaeze' },
  { tableId: 't3', seat: 0, lookId: 'male-adult-01', name: 'Tunde' },
  { tableId: 't4', seat: 1, lookId: 'male-adult-04', name: 'Kwame' },
  { tableId: 't6', seat: 0, lookId: 'female-adult-11', name: 'Zainab' },
];

export const STAFF = {
  host: { lookId: 'female-adult-08', name: 'Ifeoma', role: 'Host', x: HOST_DESK.x, z: HOST_DESK.z + 0.75, facing: Math.PI },
  bartender: { lookId: 'male-adult-10', name: 'Segun', role: 'Bartender', x: BAR.x - 0.9, z: BAR.z, facing: Math.PI / 2 },
  chef: { lookId: 'male-adult-12', name: 'Chef Emeka', role: 'Chef', x: PASS.x, z: PASS.z + 0.7, facing: Math.PI },
  waiter: { lookId: 'female-adult-04', name: 'Amara', role: 'Waiter' },
} as const;

/** The waiter's round: bar, between the tables, the pass, and back. */
export const WAITER_ROUTE: readonly (readonly [number, number])[] = [
  [-5.6, 0.7], [-1.2, 0.7], [2.8, 0.7], [6.6, 0.7], [6.6, 4.6], [2.8, 4.6], [-1.2, 4.6], [-5.6, 4.6],
];

const isDinerSeat = (tableId: string, seat: number) => DINERS.some((d) => d.tableId === tableId && d.seat === seat);

/** Every chair a guest can take (not a diner's). */
export const FREE_SEATS: readonly Seat[] = TABLES.flatMap((t) => t.seats.filter((_, i) => !isDinerSeat(t.id, i)));

/** The table a seat belongs to. */
export const tableOfSeat = (seatId: string) => TABLES.find((t) => t.seats.some((s) => s.id === seatId));

/** The free chair the host gives you: at an empty table if there is one, nearest the door. */
export function hostSeat(): Seat {
  const empty = TABLES.filter((t) => !DINERS.some((d) => d.tableId === t.id));
  const pool = (empty.length ? empty.flatMap((t) => t.seats) : FREE_SEATS).slice();
  pool.sort((a, b) => Math.hypot(a.x - DOOR_SPOT[0], a.z - DOOR_SPOT[1]) - Math.hypot(b.x - DOOR_SPOT[0], b.z - DOOR_SPOT[1]));
  return pool[0];
}

const WALL = 0.2;

/** Walls, bar, desk, pass and tables as a collision layout (flat floor, no streets). */
export function restaurantLayout(): DistrictLayout {
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
    solid(HOST_DESK.x, HOST_DESK.z, HOST_DESK.w, HOST_DESK.d, HOST_DESK.h),
    solid(BAR.x, BAR.z, BAR.w, BAR.d, BAR.h),
    // Behind the bar (the bartender's side) and behind the pass are staff only
    solid(-w / 2 + 0.45, BAR.z, 0.9, BAR.d + 1.2, 2),
    solid(PASS.x, PASS.z, PASS.w, PASS.d + 0.4, PASS.h),
    // Tall palms in the four corners
    ...[[-w / 2 + 0.8, -d / 2 + 0.8], [w / 2 - 0.8, -d / 2 + 0.8], [-w / 2 + 0.8, d / 2 - 0.8], [w / 2 - 0.8, d / 2 - 0.8]]
      .map(([x, z]) => solid(x, z, 0.9, 0.9, 2.5)),
    // Each table, solid as a small square; chairs stay walkable so you can reach your seat
    ...TABLES.map((t) => solid(t.x, t.z, TABLE_RADIUS * 1.5, TABLE_RADIUS * 1.5, 0.76)),
  ];
  return buildLayout({
    id: 'venue.the-palms',
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
