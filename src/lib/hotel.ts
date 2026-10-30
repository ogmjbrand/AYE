/**
 * The Grand Lagoon Hotel, Ayemara: a walk-in hotel with a lobby and front
 * desk, and a corridor of guest rooms. Every room is the same: parquet floor,
 * cream plaster, a damask feature wall with a wall fire in the entrance, a
 * wardrobe, a tiled bathroom, a bed with a tray ceiling over it, a dresser
 * with a television, two armchairs at the window (see world/HotelInterior.tsx;
 * built in code, no bought assets).
 *
 * Book a night at the front desk (GHAI, the game's own currency, not real
 * money) and you get the key to room 102 until noon the next day. Sleeping in
 * its bed is a full night's rest, like sleeping at home; the bathroom sink
 * freshens you up. The receptionist is computer-controlled.
 *
 * The lobby has a drinks vending machine, and your room has 24-hour room
 * service on the dresser telephone (both pay like any meal, lib/gameState.ts
 * `eat`). The machine, sandwich and bento are CC-BY 4.0 models (CREDITS.md).
 *
 * Coordinates are the building's own: the lobby is at the front (−z) with the
 * entrance in the middle, the corridor runs north with three rooms either side.
 */
import { buildLayout, type Building, type DistrictLayout } from './world';
import { doorways, run, type Doorway, type WallSeg } from './buildingShell';
import type { Seat } from './seating';
import type { Furniture } from './interiors';
import type { MenuItem } from './palms';

export const HOTEL_NAME = 'Grand Lagoon Hotel';
/** One night, in GHAI. */
export const NIGHT_PRICE = 350;
/** Check-out time the morning after. */
export const CHECKOUT_HOUR = 12;
/** Freshening up at the basin: minutes, and how much fresher. */
export const WASH_MINUTES = 15;
export const WASH_HYGIENE = 45;

export const MINUTES_PER_DAY = 24 * 60;

/** A stay: the key is good until this game minute (noon after the night you booked). */
export interface HotelStay {
  room: string;
  until: number;
}

/** When a night booked now ends: noon tomorrow, or noon today if it's still early morning. */
export function checkoutFor(totalMinutes: number): number {
  const dayStart = Math.floor(totalMinutes / MINUTES_PER_DAY) * MINUTES_PER_DAY;
  const minuteOfDay = totalMinutes - dayStart;
  const noonToday = dayStart + CHECKOUT_HOUR * 60;
  // After midnight but before noon, the night you're in ends at noon today
  return minuteOfDay < 6 * 60 ? noonToday : noonToday + MINUTES_PER_DAY;
}

export const stayIsValid = (stay: HotelStay | null | undefined, totalMinutes: number): stay is HotelStay => !!stay && totalMinutes < stay.until;

/** Keeps a saved stay only if it's well formed. */
export function sanitiseStay(data: unknown): HotelStay | null {
  if (typeof data !== 'object' || data === null) return null;
  const { room, until } = data as Record<string, unknown>;
  if (typeof room !== 'string' || !ROOMS.some((r) => r.id === room) || typeof until !== 'number' || !Number.isFinite(until) || until < 0) return null;
  return { room, until };
}

// ---------------------------------------------------------------- the building

export const STOREY = 3.0;
export const BUILDING = { x0: -8.3, x1: 8.3, z0: -10, z1: 15 } as const;
export const CORRIDOR = { x0: -1.3, x1: 1.3, z0: -3, z1: BUILDING.z1 } as const;
export const LOBBY = { z0: BUILDING.z0, z1: CORRIDOR.z0 } as const;
export const DOOR_SPOT = [0, BUILDING.z0 + 0.8] as const;
/** The front desk on the right of the lobby; you check in standing in front of it. */
export const DESK = { x: 4.2, z: -6.4, w: 2.8, d: 0.7, h: 1.1 } as const;
export const DESK_SPOT = [DESK.x, DESK.z - 0.95] as const;
export const RECEPTIONIST = { lookId: 'female-adult-06', name: 'Zara', role: 'Receptionist', x: DESK.x, z: DESK.z + 0.8, facing: Math.PI } as const;

export interface HotelRoom {
  id: string;
  /** East rooms (+1) open off the corridor's east wall, west rooms (−1) off its west wall. */
  side: 1 | -1;
  /** The room runs along z from z0 to z0 + 6. */
  z0: number;
}

const ROOM_LEN = 6;
/** Room doorways (wide enough to walk through comfortably). */
export const DOOR_W = 1.2;
const ROOM_DEPTH = BUILDING.x1 - CORRIDOR.x1;
export const ROOMS: readonly HotelRoom[] = [
  { id: '101', side: 1, z0: -3 }, { id: '102', side: 1, z0: 3 }, { id: '103', side: 1, z0: 9 },
  { id: '104', side: -1, z0: -3 }, { id: '105', side: -1, z0: 3 }, { id: '106', side: -1, z0: 9 },
];
/** The room guests are given (the others are taken). */
export const GUEST_ROOM = '102';
export const roomById = (id: string) => ROOMS.find((r) => r.id === id);

/**
 * A point in a room's own frame turned into the building's: u runs from the
 * corridor wall (0) to the window (7), v along the room from its door end (−3)
 * to the far end (+3). West rooms are mirrored.
 */
export function roomPoint(room: HotelRoom, u: number, v: number): [number, number] {
  return [room.side * (CORRIDOR.x1 + u), room.z0 + ROOM_LEN / 2 + v];
}
/** The room's door in the corridor wall (v = −2). */
export const roomDoor = (room: HotelRoom): [number, number] => roomPoint(room, 0, -2);
/** Where you stand in the corridor to use a room's door. */
export const roomDoorSpot = (room: HotelRoom): [number, number] => [room.side * (CORRIDOR.x1 - 0.6), roomDoor(room)[1]];
/** Just inside the door, in the entrance. */
export const roomInsideSpot = (room: HotelRoom): [number, number] => roomPoint(room, 0.8, -2);

/** Inside a room (in the room's frame): the bathroom, bed, basin and furniture. */
export const ROOM_PLAN = {
  /** Bathroom in the corner by the corridor: u 0..2.4, v 0.6..3; its door on the entrance side. */
  bath: { u0: 0, u1: 2.4, v0: 0.6, v1: 3, doorU: 1.0, doorW: 1.5 },
  toilet: { u: 0.4, v: 2.7 },
  bed: { u: 4.7, v0: 0.9, v1: 3, w: 1.8 },
  basin: { u: 2.1, v: 1.9 },
  dresser: { u0: 3.7, u1: 5.5, depth: 0.5 },
  bench: { u0: 2.6, u1: 3.5 },
  wardrobe: { v0: -1.3, v1: 0.5, depth: 0.6 },
  armchairs: [{ u: 6.3, v: -1.6 }, { u: 6.3, v: 0.1 }],
  sideTable: { u: 6.35, v: -0.75 },
  window: 7,
} as const;

/** Standing at the dresser, where the telephone is, to order room service (it's left on the dresser top). */
export const roomServiceSpot = (room: HotelRoom) => roomPoint(room, (ROOM_PLAN.dresser.u0 + ROOM_PLAN.dresser.u1) / 2, -3 + ROOM_PLAN.dresser.depth + 0.55);

/** Where you lie down (beside the bed) and where you wash (in front of the basin). */
export const bedSpot = (room: HotelRoom) => roomPoint(room, ROOM_PLAN.bed.u - ROOM_PLAN.bed.w / 2 - 0.45, 1.9);
/** The bed's window side, where you get into it (lib/bedSleep.ts: the aisle beside the bed). */
export const bedsideSpot = (room: HotelRoom) => roomPoint(room, ROOM_PLAN.bed.u + ROOM_PLAN.bed.w / 2 + 0.45, 1.9);
export const basinSpot = (room: HotelRoom) => roomPoint(room, ROOM_PLAN.basin.u - 0.75, ROOM_PLAN.basin.v);

/**
 * The room's bed as a piece of furniture, for going to bed in it
 * (lib/bedSleep.ts): headboard to +z, and you get in from its window side,
 * which is +x in the east rooms (the guest room). West rooms are mirrored, so
 * the bedtime frame doesn't fit them: null there. Its deep mattress and cover
 * match the Luxe bed's heights; the duvet over you is a white hotel one.
 */
export function hotelBed(room: HotelRoom): Furniture | null {
  if (room.side < 0) return null;
  const { u, v0, v1, w } = ROOM_PLAN.bed;
  return { kind: 'bed', at: roomPoint(room, u, (v0 + v1) / 2), size: [w, 0.6, v1 - v0], color: '#f4f2ee', style: 'luxe' };
}

/** Two armchairs by the window: seats you can sit in, facing into the room. */
export const armchairSeats = (room: HotelRoom): Seat[] => ROOM_PLAN.armchairs.map((a, i) => {
  const [x, z] = roomPoint(room, a.u, a.v);
  return { id: `chair-${room.id}-${i}`, x, z, facing: room.side > 0 ? -Math.PI / 2 : Math.PI / 2, height: 0.46, approach: { x: x - room.side * 0.75, z } };
});

// ---------------------------------------------------------------- food and drink

const m = (id: string, name: string, course: MenuItem['course'], price: number, fullness: number, minutes: number, lift: MenuItem['lift'], contains: MenuItem['contains'], description: string): MenuItem =>
  ({ id, name, course, price, fullness, minutes, lift, contains, description });

/** Room service, brought up to your room at any hour. Minutes include the wait for it to arrive. */
export const ROOM_SERVICE_MENU: readonly MenuItem[] = [
  m('room-sub', 'Club Sub Sandwich', 'main', 160, 50, 30, { fun: 4 }, ['meat', 'dairy'], 'A long toasted roll with sliced meats, cheese, lettuce and tomato, brought up on a tray.'),
  m('room-bento', 'Bento Box', 'main', 240, 60, 35, { fun: 6 }, ['fish', 'egg'], 'A lacquered box of rice, grilled fish, rolled omelette and pickled vegetables.'),
  m('room-breakfast', 'Continental Breakfast', 'starter', 150, 40, 30, { energy: 6, fun: 4 }, ['dairy', 'egg'], 'A warm pastry, a crusty roll, a ripe pear and a kiwi, on a tray.'),
  m('room-cake', 'Slice of Cake', 'dessert', 90, 18, 20, { fun: 6 }, ['dairy', 'egg'], 'A slice of the house sponge cake with cream.'),
  m('vend-water', 'Bottled Water', 'drink', 20, 3, 15, { energy: 2 }, [], 'Still water, chilled.'),
  m('vend-juice', 'Orange Juice', 'drink', 35, 8, 15, { energy: 3 }, [], 'Freshly pressed orange juice.'),
];

/** The lobby's drinks machine: cold drinks, paid in GHAI by tapping your phone. */
export const VENDING_MENU: readonly MenuItem[] = [
  m('vend-water', 'Bottled Water', 'drink', 20, 3, 2, { energy: 2 }, [], 'Still water, chilled.'),
  m('vend-juice', 'Orange Juice', 'drink', 35, 8, 3, { energy: 3 }, [], 'Orange juice in a bottle, cold from the machine.'),
  m('vend-soda', 'Ginger Soda', 'drink', 30, 4, 3, { fun: 3 }, [], 'A fizzy ginger soda in a can.'),
  m('vend-tea', 'Iced Lemon Tea', 'drink', 30, 5, 3, { energy: 4 }, [], 'Sweet iced tea with lemon, in a bottle.'),
];

/** Every id on the two menus (their 3D models are in world/HotelDishes.tsx). */
export const HOTEL_DISH_IDS: ReadonlySet<string> = new Set([...ROOM_SERVICE_MENU, ...VENDING_MENU].map((i) => i.id));

/** The vending machine against the front wall of the lobby, east of the door (past the desk), facing in. */
export const VENDING = { x: 7.0, z: BUILDING.z0 + 0.15 + 0.46, w: 1.3, d: 0.92, h: 1.85 } as const;
export const VENDING_SPOT = [VENDING.x, VENDING.z + VENDING.d / 2 + 0.8] as const;

/** Every wall: the shell, the corridor with its doors, the walls between rooms and the guest room's bathroom. */
export function hotelWalls(): WallSeg[] {
  const { x0, x1, z0, z1 } = BUILDING;
  const doorZ = (r: HotelRoom) => roomDoor(r)[1];
  const g = GUEST_ROOM;
  const guest = roomById(g)!;
  const [bx0, bz0] = roomPoint(guest, ROOM_PLAN.bath.u0, ROOM_PLAN.bath.v0);
  const [bx1, bz1] = roomPoint(guest, ROOM_PLAN.bath.u1, ROOM_PLAN.bath.v1);
  const [bdx] = roomPoint(guest, ROOM_PLAN.bath.doorU, 0);
  return [
    ...run('x', z0, x0, x1, [[0, 1.8]], { outer: true }),
    ...run('x', z1, x0, x1, [], { outer: true }),
    ...run('z', x0, z0, z1, [], { outer: true }),
    ...run('z', x1, z0, z1, [], { outer: true }),
    // Lobby to the rooms, open into the corridor
    ...run('x', CORRIDOR.z0, x0, CORRIDOR.x0, []),
    ...run('x', CORRIDOR.z0, CORRIDOR.x1, x1, []),
    // Corridor walls with a door into each room
    ...run('z', CORRIDOR.x1, CORRIDOR.z0, z1, ROOMS.filter((r) => r.side > 0).map((r) => [doorZ(r), DOOR_W] as const)),
    ...run('z', CORRIDOR.x0, CORRIDOR.z0, z1, ROOMS.filter((r) => r.side < 0).map((r) => [doorZ(r), DOOR_W] as const)),
    // Between the rooms
    ...[3, 9].flatMap((z) => [...run('x', z, CORRIDOR.x1, x1, []), ...run('x', z, x0, CORRIDOR.x0, [])]),
    // The guest room's bathroom: its wall to the entrance (with the door) and to the bedroom
    ...run('x', Math.min(bz0, bz1), Math.min(bx0, bx1), Math.max(bx0, bx1), [[bdx, ROOM_PLAN.bath.doorW]]),
    ...run('z', Math.max(bx0, bx1), Math.min(bz0, bz1), Math.max(bz0, bz1), []),
  ];
}

/** Every doorway in the hotel's walls (the way in, each room's door, the guest room's bathroom), for their frames and lintels. */
export function hotelDoorways(): Doorway[] {
  const { z0 } = BUILDING;
  const doorZ = (r: HotelRoom) => roomDoor(r)[1];
  const guest = roomById(GUEST_ROOM)!;
  const [, bz0] = roomPoint(guest, ROOM_PLAN.bath.u0, ROOM_PLAN.bath.v0);
  const [, bz1] = roomPoint(guest, ROOM_PLAN.bath.u1, ROOM_PLAN.bath.v1);
  const [bdx] = roomPoint(guest, ROOM_PLAN.bath.doorU, 0);
  return [
    ...doorways('x', z0, [[0, 1.8]]),
    ...doorways('z', CORRIDOR.x1, ROOMS.filter((r) => r.side > 0).map((r) => [doorZ(r), DOOR_W] as const)),
    ...doorways('z', CORRIDOR.x0, ROOMS.filter((r) => r.side < 0).map((r) => [doorZ(r), DOOR_W] as const)),
    ...doorways('x', Math.min(bz0, bz1), [[bdx, ROOM_PLAN.bath.doorW]]),
  ];
}

const WALL_T = 0.3;

/** Collision: walls, the desk, closed doors (all rooms but yours when you have the key), and the room's furniture. */
export function hotelLayout(hasKey: boolean): DistrictLayout {
  const solid = (x: number, z: number, sx: number, sz: number, h = STOREY): Building =>
    ({ position: [x, 0, z], size: [sx, h, sz], color: '#000', style: 'residential' });
  const box = (r: HotelRoom, u0: number, u1: number, v0: number, v1: number, h = 1): Building => {
    const [ax, az] = roomPoint(r, u0, v0), [bx, bz] = roomPoint(r, u1, v1);
    return solid((ax + bx) / 2, (az + bz) / 2, Math.abs(bx - ax), Math.abs(bz - az), h);
  };
  const guest = roomById(GUEST_ROOM)!;
  const P = ROOM_PLAN;
  const walls = hotelWalls().map((w) => {
    const alongX = w.z0 === w.z1;
    // As thick as they're drawn; not lengthened, so doorways keep their full width
    return solid((w.x0 + w.x1) / 2, (w.z0 + w.z1) / 2, alongX ? Math.abs(w.x1 - w.x0) : WALL_T, alongX ? WALL_T : Math.abs(w.z1 - w.z0));
  });
  const buildings: Building[] = [
    ...walls,
    // The way out is E at the door, not walking through it
    solid(0, BUILDING.z0 - 0.3, 1.8, 0.2),
    solid(DESK.x, DESK.z, DESK.w, DESK.d, DESK.h),
    solid(DESK.x, DESK.z + 1.3, DESK.w + 1, 1.4, 2),
    // Lobby sofas and the plant
    solid(-4.6, -7.6, 2.2, 0.9, 0.8), solid(-4.6, -4.4, 2.2, 0.9, 0.8), solid(-4.6, -6, 1.0, 0.7, 0.45),
    solid(VENDING.x, VENDING.z, VENDING.w, VENDING.d, VENDING.h),
    // Closed doors: every room but yours (and yours too until you have the key)
    ...ROOMS.filter((r) => !(hasKey && r.id === GUEST_ROOM)).map((r) => {
      const [x, z] = roomDoor(r);
      return solid(x, z, 0.12, DOOR_W);
    }),
    // Your room's furniture
    box(guest, P.bed.u - P.bed.w / 2, P.bed.u + P.bed.w / 2, P.bed.v0, P.bed.v1, 0.6),
    box(guest, P.dresser.u0, P.dresser.u1, -3, -3 + P.dresser.depth, 0.8),
    box(guest, P.bench.u0, P.bench.u1, -3, -2.55, 0.45),
    box(guest, 0, P.wardrobe.depth, P.wardrobe.v0, P.wardrobe.v1, 2.2),
    box(guest, 3.2, 3.5, 2.5, 3, 0.6), box(guest, 5.9, 6.2, 2.5, 3, 0.6),
    box(guest, P.sideTable.u - 0.25, P.sideTable.u + 0.25, P.sideTable.v - 0.25, P.sideTable.v + 0.25, 0.55),
    box(guest, 1.9, 2.4, 1.4, 2.4, 0.85),
    box(guest, P.toilet.u - 0.3, P.toilet.u + 0.3, 2.3, 3, 0.75),
  ];
  return buildLayout({
    id: 'venue.grand-lagoon-hotel',
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

export { ROOM_DEPTH, ROOM_LEN };
