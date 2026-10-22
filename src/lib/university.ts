/**
 * AYE Global University: one connected campus you walk through, from the
 * street and the main gate, across the courtyard, in through the academic
 * building's doors to the lobby, along the corridor and into each room.
 *
 * Everything here is data in campus coordinates (metres, +z away from the
 * street): the rooms, every wall with its door gaps, the furniture you bump
 * into, the seats, and the spots where E does something. The 3D scene
 * (world/University.tsx) and collisions (universityLayout) are both built
 * from it, so what you see is what you walk into.
 *
 * Plan (ground floor; all rooms are on it):
 *   street, drop-off lane and pavement   z −48 … −33
 *   gate (pedestrian gates either side)   z −31
 *   courtyard with fountain and gardens   z −31 … 0
 *   academic building                     z 2 … 30, x −28 … 28
 *     south: Lecture Hall A · lobby · cafeteria        z 2 … 12
 *     corridor                                         z 12 … 16
 *     north: library · computer lab · restrooms ·
 *            student services · student centre         z 16 … 30
 */
import { buildLayout, type Building, type DistrictLayout } from './world';
import type { Seat } from './seating';
import type { CampusRoom } from './school';

export const UNIVERSITY_NAME = 'AYE Global University';
export const CAMPUS_ID = 'aye-global-university';

export const WALL_T = 0.3;
export const STOREY = 4.2;
export const BUILDING = { x0: -28, x1: 28, z0: 2, z1: 30, height: 9 } as const;
export const CORRIDOR = { z0: 12, z1: 16 } as const;
export const CAMPUS = { x0: -30, x1: 30, z0: -48, z1: 32 } as const;
export const GATE_Z = -31;

/** Where you arrive from the city (on the pavement facing the gate), and where E takes you back. */
export const ARRIVE_SPOT = [0, -35] as const;

export interface Rect { x0: number; x1: number; z0: number; z1: number }

export const ROOMS: Record<Exclude<CampusRoom, 'outside' | 'corridor'>, Rect & { code: string; door: readonly [number, number] }> = {
  'hall-a': { x0: -28, x1: -8.5, z0: 2, z1: 12, code: 'G01', door: [-12, 12] },
  lobby: { x0: -8.5, x1: 8.5, z0: 2, z1: 12, code: '', door: [0, 2] },
  cafeteria: { x0: 8.5, x1: 28, z0: 2, z1: 12, code: 'G02', door: [12, 12] },
  library: { x0: -28, x1: -12.75, z0: 16, z1: 30, code: 'G04', door: [-20, 16] },
  lab: { x0: -12.75, x1: -1.75, z0: 16, z1: 30, code: 'G05', door: [-7, 16] },
  restrooms: { x0: -1.75, x1: 3.25, z0: 16, z1: 30, code: 'G06', door: [0.75, 16] },
  services: { x0: 3.25, x1: 12.25, z0: 16, z1: 30, code: 'G07', door: [7, 16] },
  centre: { x0: 12.25, x1: 28, z0: 16, z1: 30, code: 'G08', door: [19.5, 16] },
};

/** Width of each door opening (the lobby's front doors and the student centre's are double). */
const DOOR_W: Partial<Record<keyof typeof ROOMS, number>> = { lobby: 4, centre: 3 };
export const doorWidth = (room: keyof typeof ROOMS) => DOOR_W[room] ?? 2;

/** Which room a point is in. */
export function roomAt(x: number, z: number): CampusRoom {
  if (x < BUILDING.x0 || x > BUILDING.x1 || z < BUILDING.z0 || z > BUILDING.z1) return 'outside';
  if (z >= CORRIDOR.z0 && z <= CORRIDOR.z1) return 'corridor';
  for (const [id, r] of Object.entries(ROOMS) as [keyof typeof ROOMS, Rect][]) {
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return id;
  }
  return 'corridor';
}

export const insideBuilding = (x: number, z: number) => x > BUILDING.x0 && x < BUILDING.x1 && z > BUILDING.z0 && z < BUILDING.z1;

/** A straight piece of wall (axis-aligned), drawn and collided as a thin box. */
export interface WallSeg {
  x0: number; z0: number; x1: number; z1: number;
  /** Outer walls get the façade on their outside. */
  outer?: boolean;
  /** Glass instead of plaster (shop-front style), e.g. into the library. */
  glass?: boolean;
}

/** A wall from a to b along x (at z) or along z (at x), with gaps (centre, width) cut for doors. */
export function run(along: 'x' | 'z', fixed: number, from: number, to: number, gaps: readonly (readonly [number, number])[], extra: Partial<WallSeg> = {}): WallSeg[] {
  const cuts = [...gaps].sort((a, b) => a[0] - b[0]).map(([c, w]) => [c - w / 2, c + w / 2] as const);
  const out: WallSeg[] = [];
  let at = from;
  for (const [a, b] of [...cuts, [to, to] as const]) {
    if (a - at > 0.05) out.push(along === 'x' ? { x0: at, z0: fixed, x1: a, z1: fixed, ...extra } : { x0: fixed, z0: at, x1: fixed, z1: a, ...extra });
    at = Math.max(at, b);
  }
  return out;
}

const gap = (room: keyof typeof ROOMS) => [ROOMS[room].door[0], doorWidth(room)] as const;

export const WALLS: readonly WallSeg[] = [
  // Outside of the building
  ...run('x', BUILDING.z0, BUILDING.x0, ROOMS.lobby.x0, [], { outer: true }),
  // The lobby's front is glass either side of the doors
  ...run('x', BUILDING.z0, ROOMS.lobby.x0, ROOMS.lobby.x1, [gap('lobby')], { outer: true, glass: true }),
  ...run('x', BUILDING.z0, ROOMS.lobby.x1, BUILDING.x1, [], { outer: true }),
  ...run('x', BUILDING.z1, BUILDING.x0, BUILDING.x1, [], { outer: true }),
  ...run('z', BUILDING.x0, BUILDING.z0, BUILDING.z1, [], { outer: true }),
  ...run('z', BUILDING.x1, BUILDING.z0, BUILDING.z1, [], { outer: true }),
  // South rooms onto the corridor (the lobby is open to it)
  ...run('x', CORRIDOR.z0, BUILDING.x0, ROOMS.lobby.x0, [gap('hall-a')]),
  ...run('x', CORRIDOR.z0, ROOMS.lobby.x1, BUILDING.x1, [gap('cafeteria')]),
  ...run('z', ROOMS.lobby.x0, BUILDING.z0, CORRIDOR.z0, []),
  ...run('z', ROOMS.lobby.x1, BUILDING.z0, CORRIDOR.z0, [], { glass: true }),
  // North rooms onto the corridor
  ...run('x', CORRIDOR.z1, BUILDING.x0, ROOMS.library.x1, [gap('library')], { glass: true }),
  ...run('x', CORRIDOR.z1, ROOMS.lab.x0, BUILDING.x1, [gap('lab'), gap('restrooms'), gap('services'), gap('centre')]),
  ...run('z', ROOMS.library.x1, CORRIDOR.z1, BUILDING.z1, []),
  ...run('z', ROOMS.lab.x1, CORRIDOR.z1, BUILDING.z1, []),
  ...run('z', ROOMS.restrooms.x1, CORRIDOR.z1, BUILDING.z1, []),
  ...run('z', ROOMS.services.x1, CORRIDOR.z1, BUILDING.z1, []),
];

/** The wall's box: centre and size (x, z), WALL_T thick. */
export function wallBox(w: WallSeg) {
  const alongX = w.z0 === w.z1;
  return {
    x: (w.x0 + w.x1) / 2,
    z: (w.z0 + w.z1) / 2,
    sx: alongX ? Math.abs(w.x1 - w.x0) + (w.outer ? WALL_T : 0) : WALL_T,
    sz: alongX ? WALL_T : Math.abs(w.z1 - w.z0) + (w.outer ? WALL_T : 0),
  };
}

// ---------------------------------------------------------------- furniture and fittings

/** Lecture Hall A: the lecturer's desk and screen on the west wall, rows of desks facing it. */
export const HALL = {
  screen: { x: ROOMS['hall-a'].x0 + 0.2, z: 7 },
  lectern: { x: -26, z: 7 },
  rows: [-23, -20.6, -18.2, -15.8] as const,
  /** Seats along each row, at these z. */
  seatZ: [3.6, 4.6, 5.6, 8.4, 9.4, 10.4] as const,
};
/** Each row is a long desk with chairs on its east side, facing west (−x) to the screen. */
export const HALL_DESKS = HALL.rows.map((x) => [
  { x, z: (HALL.seatZ[0] + HALL.seatZ[2]) / 2, len: 3.2 },
  { x, z: (HALL.seatZ[3] + HALL.seatZ[5]) / 2, len: 3.2 },
]).flat();

const FACE_W = -Math.PI / 2;
const FACE_N = 0;
const FACE_S = Math.PI;

/** The seats you can take in the hall (the back rows; classmates fill the front). */
export const HALL_SEATS: readonly Seat[] = [HALL.rows[2], HALL.rows[3]].flatMap((x, r) =>
  HALL.seatZ.map((z, i) => ({ id: `hall-${r}-${i}`, x: x + 0.65, z, facing: FACE_W, height: 0.47, approach: { x: x + 1.3, z } })),
);

/** Computer lab: three rows of desks with PCs, facing north to the teaching screen. */
export const LAB = {
  screen: { x: (ROOMS.lab.x0 + ROOMS.lab.x1) / 2, z: ROOMS.lab.z1 - 0.2 },
  desks: [20.5, 23.5, 26.5].map((z) => ({ x: (ROOMS.lab.x0 + ROOMS.lab.x1) / 2, z, len: 8 })),
};
export const LAB_SEATS: readonly Seat[] = LAB.desks.slice(0, 2).flatMap((d, r) =>
  [-3, -1, 1, 3].map((dx, i) => ({ id: `lab-${r}-${i}`, x: d.x + dx, z: d.z - 0.75, facing: FACE_N, height: 0.47, approach: { x: d.x + dx, z: d.z - 1.4 } })),
);

/** Library: shelves on the west and back walls, reading tables in the middle, a help desk by the door. */
export const LIBRARY = {
  shelves: [
    ...[21.5, 24.5, 27.5].map((z) => ({ x: -26.6, z, len: 2.6, along: 'z' as const })),
    ...[-24, -21, -18, -15.5].map((x) => ({ x, z: 29.3, len: 2.4, along: 'x' as const })),
  ],
  tables: [{ x: -21.5, z: 21.5 }, { x: -21.5, z: 25.5 }, { x: -16.5, z: 21.5 }, { x: -16.5, z: 25.5 }],
  desk: { x: -15, z: 17.6, w: 2.4, d: 0.7 },
  computers: { x: -26.9, z: 18.5 },
};
export const LIBRARY_SEATS: readonly Seat[] = LIBRARY.tables.flatMap((t, k) => [
  { id: `lib-${k}-s`, x: t.x, z: t.z - 0.85, facing: FACE_N, height: 0.47, approach: { x: t.x + 1.25, z: t.z - 0.85 } },
  { id: `lib-${k}-n`, x: t.x, z: t.z + 0.85, facing: FACE_S, height: 0.47, approach: { x: t.x + 1.25, z: t.z + 0.85 } },
]);

/** Cafeteria: the serving counter along the back (corridor) wall, tables in front. */
export const CAFE = {
  counter: { x: 20, z: 10.7, w: 10, d: 0.9 },
  tables: [{ x: 13, z: 5 }, { x: 17, z: 5 }, { x: 21, z: 5 }, { x: 25, z: 5 }, { x: 15, z: 8 }, { x: 23, z: 8 }],
};
/** Student centre: sofas round a rug, a games table, a big events board. */
export const CENTRE = {
  sofas: [{ x: 17, z: 22, facing: FACE_N }, { x: 17, z: 26.5, facing: FACE_S }, { x: 24, z: 24, facing: FACE_W }],
  board: { x: 27.8, z: 20 },
  table: { x: 23.5, z: 18.6 },
};
/** Student services: a long counter with staff behind it. */
export const SERVICES = { counter: { x: 7.75, z: 24, w: 6, d: 0.8 } };
/** Lobby: reception desk, directory screen, seating. */
export const LOBBY = {
  desk: { x: 4.5, z: 8.5, w: 3.4, d: 0.9 },
  directory: { x: -5.6, z: 6 },
  seating: [{ x: -5.5, z: 10.2 }],
};

/** Courtyard features. */
export const COURTYARD = {
  fountain: { x: 0, z: -14, r: 3.2 },
  beds: [
    { x: -10, z: -14, w: 7, d: 4 }, { x: 10, z: -14, w: 7, d: 4 },
    { x: -18, z: -22, w: 6, d: 3 }, { x: 18, z: -22, w: 6, d: 3 },
    { x: -18, z: -6, w: 6, d: 3 }, { x: 18, z: -6, w: 6, d: 3 },
  ],
  benches: [
    { x: -10, z: -10.8, facing: FACE_N }, { x: 10, z: -10.8, facing: FACE_N },
    { x: -14, z: -2.5, facing: FACE_S }, { x: 14, z: -2.5, facing: FACE_S },
    { x: -24, z: -14, facing: Math.PI / 2 },
  ],
  trees: [
    [-25, -27], [25, -27], [-25, -19], [25, -19], [-25, -10], [25, -10], [-25, -2], [25, -2],
    [-6, -27], [6, -27], [-14, -14], [14, -14],
  ] as readonly (readonly [number, number])[],
  directory: { x: -4.5, z: -26 },
  signpost: { x: 4.5, z: -26 },
  noticeboard: { x: -21.5, z: -14 },
  bikes: { x: 21, z: -28.5 },
  umbrellas: [{ x: 20, z: -14 }, { x: 25, z: -14 }],
};

/** Gate: two stone pylons carry the sign; a barrier across the vehicle lane; walkers use the side gates. */
export const GATE = {
  pylons: [-10, 10],
  booths: [-5.2, 5.2],
  vehicleLane: 4.3,
  walkGates: [[-9.3, -6.1], [6.1, 9.3]] as readonly (readonly [number, number])[],
};

/** Seats on the courtyard benches (two each). */
export const BENCH_SEATS: readonly Seat[] = COURTYARD.benches.flatMap((b, k) => [-0.5, 0.5].map((o, i) => {
  const along = Math.abs(Math.sin(b.facing)) > 0.5 ? 'z' : 'x';
  return { id: `bench-${k}-${i}`, x: b.x + (along === 'x' ? o : 0), z: b.z + (along === 'z' ? o : 0), facing: b.facing, height: 0.45 };
}));

// ---------------------------------------------------------------- what E does

export type SpotId =
  | 'leave' | 'security' | 'map-outdoor' | 'study-together' | 'reception' | 'directory' | 'lecture'
  | 'lab-class' | 'lab-pc' | 'library-desk' | 'library-pc' | 'librarian' | 'cafe' | 'students'
  | 'clubs' | 'services' | 'restroom';

export interface Spot { id: SpotId; x: number; z: number; r: number }

export const SPOTS: readonly Spot[] = [
  { id: 'leave', x: ARRIVE_SPOT[0], z: ARRIVE_SPOT[1], r: 2.2 },
  { id: 'security', x: GATE.booths[0] - 1.2, z: GATE_Z - 2.2, r: 1.6 },
  { id: 'map-outdoor', x: COURTYARD.directory.x, z: COURTYARD.directory.z - 1, r: 1.6 },
  { id: 'study-together', x: -10, z: -9.6, r: 1.8 },
  { id: 'reception', x: LOBBY.desk.x, z: LOBBY.desk.z - 1.2, r: 1.6 },
  { id: 'directory', x: LOBBY.directory.x + 1, z: LOBBY.directory.z, r: 1.6 },
  { id: 'lecture', x: -15, z: 7, r: 3.2 },
  { id: 'lab-class', x: LAB.screen.x, z: 18.4, r: 2.4 },
  { id: 'lab-pc', x: LAB.desks[2].x, z: LAB.desks[2].z - 1.2, r: 2.4 },
  { id: 'library-desk', x: -19, z: 23.5, r: 2.6 },
  { id: 'library-pc', x: LIBRARY.computers.x + 1.4, z: LIBRARY.computers.z, r: 1.6 },
  { id: 'librarian', x: LIBRARY.desk.x, z: LIBRARY.desk.z - 1.1, r: 1.4 },
  { id: 'cafe', x: CAFE.counter.x, z: CAFE.counter.z - 1.4, r: 2.6 },
  { id: 'students', x: 20, z: 24.2, r: 2.6 },
  { id: 'clubs', x: CENTRE.board.x - 1.3, z: CENTRE.board.z, r: 1.6 },
  { id: 'services', x: SERVICES.counter.x, z: SERVICES.counter.z - 1.3, r: 2 },
  { id: 'restroom', x: 0.75, z: 24, r: 2.2 },
];

/** The spot you're standing at (nearest within its radius). */
export function spotAt(x: number, z: number): Spot | null {
  let best: Spot | null = null;
  let bestD = Infinity;
  for (const s of SPOTS) {
    const d = Math.hypot(x - s.x, z - s.z);
    if (d <= s.r && d < bestD) { best = s; bestD = d; }
  }
  return best;
}

// ---------------------------------------------------------------- directory

export interface Destination { id: string; name: string; room: CampusRoom; at: readonly [number, number] }

/** Every place the directory can guide you to: all exist in the building. */
export const DESTINATIONS: readonly Destination[] = [
  { id: 'hall-a', name: 'Lecture Hall A (G01)', room: 'hall-a', at: ROOMS['hall-a'].door },
  { id: 'lab', name: 'Computer Laboratory (G05)', room: 'lab', at: ROOMS.lab.door },
  { id: 'library', name: 'Library (G04)', room: 'library', at: ROOMS.library.door },
  { id: 'cafeteria', name: 'AYE Cafeteria (G02)', room: 'cafeteria', at: ROOMS.cafeteria.door },
  { id: 'centre', name: 'Student Centre (G08)', room: 'centre', at: ROOMS.centre.door },
  { id: 'services', name: 'Student Services (G07)', room: 'services', at: ROOMS.services.door },
  { id: 'restrooms', name: 'Restrooms (G06)', room: 'restrooms', at: ROOMS.restrooms.door },
  { id: 'lobby', name: 'Main lobby & reception', room: 'lobby', at: ROOMS.lobby.door },
  { id: 'gate', name: 'Main gate & the city', room: 'outside', at: ARRIVE_SPOT },
];

/** The walk between the building's front doors and the street, through the west pedestrian gate. */
const FRONT_DOORS: [number, number] = [0, 0.5];
const WALK_GATE_IN: [number, number] = [-7.7, GATE_Z + 1.5];
const WALK_GATE_OUT: [number, number] = [-7.7, GATE_Z - 1.5];
const PAST_FOUNTAIN: [number, number] = [-4.5, -14];

/**
 * Waypoints from where you are to a destination, through doorways, the
 * corridor and the courtyard (the plan is simple enough to route by hand):
 * out of your room by its door, along the corridor, into theirs.
 */
export function routeTo(x: number, z: number, dest: Destination): [number, number][] {
  const pts: [number, number][] = [];
  const from = roomAt(x, z);
  const corridorAt = (px: number): [number, number] => [px, (CORRIDOR.z0 + CORRIDOR.z1) / 2];
  const doorOf = (r: CampusRoom) => (r in ROOMS && r !== 'lobby' ? ROOMS[r as keyof typeof ROOMS].door : null);
  /** A metre inside a room, through its door off the corridor. */
  const inside = (d: readonly [number, number]): [number, number] => [d[0], d[1] === CORRIDOR.z0 ? d[1] - 1 : d[1] + 1];
  // Out of the room you're in (into the corridor)
  const own = doorOf(from);
  if (own && from !== dest.room) pts.push(inside(own), corridorAt(own[0]));
  if (dest.room === 'outside') {
    if (from !== 'outside') pts.push(corridorAt(0), [0, 6], FRONT_DOORS);
    if (z > -12 || from !== 'outside') pts.push(PAST_FOUNTAIN);
    if (z > GATE_Z) pts.push(WALK_GATE_IN, WALK_GATE_OUT);
    pts.push([dest.at[0], dest.at[1]]);
    return pts;
  }
  if (from === 'outside') {
    if (z < GATE_Z) pts.push(WALK_GATE_OUT, WALK_GATE_IN);
    if (z < -12) pts.push(PAST_FOUNTAIN);
    pts.push(FRONT_DOORS, [0, 6]);
  }
  if (dest.room === 'lobby') { if (from !== 'lobby' && from !== 'outside') pts.push(corridorAt(0), [0, 6]); return pts; }
  if (dest.room === from) return pts;
  if (from === 'outside' || from === 'lobby') pts.push(corridorAt(0));
  const d = dest.at;
  pts.push(corridorAt(d[0]), inside(d));
  return pts;
}

// ---------------------------------------------------------------- staff and students (computer-controlled)

export interface CampusPerson { lookId: string; name: string; role: string; x: number; z: number; facing: number; route?: readonly (readonly [number, number])[]; seat?: Seat; chatty?: boolean }

export const CAMPUS_STAFF: readonly CampusPerson[] = [
  { lookId: 'male-adult-10', name: 'Musa', role: 'Campus Security', x: GATE.booths[0] - 1.2, z: GATE_Z - 1.3, facing: FACE_S },
  { lookId: 'female-adult-08', name: 'Ngozi', role: 'Receptionist', x: LOBBY.desk.x, z: LOBBY.desk.z + 0.8, facing: FACE_S, chatty: true },
  { lookId: 'female-adult-11', name: 'Dr. Funmi Adebayo', role: 'Lecturer', x: HALL.lectern.x + 0.6, z: HALL.lectern.z, facing: Math.PI / 2 },
  { lookId: 'female-adult-06', name: 'Mrs. Halima Bello', role: 'Librarian', x: LIBRARY.desk.x, z: LIBRARY.desk.z + 0.75, facing: FACE_S },
  { lookId: 'male-adult-12', name: 'Chidi', role: 'Cafeteria Server', x: CAFE.counter.x, z: CAFE.counter.z + 0.8, facing: FACE_S, chatty: true },
  { lookId: 'female-adult-03', name: 'Ms. Esi Owusu', role: 'Student Services', x: SERVICES.counter.x, z: SERVICES.counter.z + 0.8, facing: FACE_S },
];

export const CAMPUS_STUDENTS: readonly CampusPerson[] = [
  { lookId: 'female-adult-04', name: 'Temi', role: 'Student', x: -12, z: -24, facing: 0, route: [[-12, -26], [-3, -5], [0, 0.5], [-3, -5]] },
  { lookId: 'male-adult-04', name: 'Kofi', role: 'Student', x: 12, z: -8, facing: 0, route: [[12, -8], [3, -26], [12, -8], [20, 0]] },
  { lookId: 'male-adult-18', name: 'Emeka', role: 'Student', x: 0, z: 0, facing: 0, seat: BENCH_SEATS[0], chatty: true },
  { lookId: 'female-adult-10', name: 'Aisha', role: 'Student', x: 0, z: 0, facing: 0, seat: BENCH_SEATS[1], chatty: true },
  { lookId: 'female-adult-08', name: 'Adanna', role: 'Student', x: -6, z: 14, facing: 0, route: [[-24, 14], [24, 14]] },
  { lookId: 'male-adult-01', name: 'Kwame', role: 'Student', x: 0, z: 0, facing: 0, seat: { id: 'centre-a', x: 16.5, z: 22, facing: FACE_N, height: 0.42 }, chatty: true },
  { lookId: 'female-adult-11', name: 'Zainab', role: 'Student', x: 0, z: 0, facing: 0, seat: { id: 'centre-b', x: 17.5, z: 26.5, facing: FACE_S, height: 0.42 }, chatty: true },
  { lookId: 'female-adult-03', name: 'Efua', role: 'Student', x: 0, z: 0, facing: 0, seat: LIBRARY_SEATS[3] },
];

/** Classmates in the front rows of the hall while a class is on. */
export const HALL_CLASSMATES: readonly CampusPerson[] = [
  { lookId: 'male-adult-04', name: 'Tobi', role: 'Student', x: 0, z: 0, facing: 0, seat: { id: 'hc-1', x: HALL.rows[0] + 0.65, z: 4.6, facing: FACE_W, height: 0.47 } },
  { lookId: 'female-adult-04', name: 'Chioma', role: 'Student', x: 0, z: 0, facing: 0, seat: { id: 'hc-2', x: HALL.rows[0] + 0.65, z: 9.4, facing: FACE_W, height: 0.47 } },
  { lookId: 'female-adult-10', name: 'Hauwa', role: 'Student', x: 0, z: 0, facing: 0, seat: { id: 'hc-3', x: HALL.rows[1] + 0.65, z: 5.6, facing: FACE_W, height: 0.47 } },
];

// ---------------------------------------------------------------- collisions

/** Walls, the gate, fences, the fountain, beds, desks, shelves and counters as a collision layout. */
export function universityLayout(): DistrictLayout {
  const solid = (x: number, z: number, sx: number, sz: number, h = 1): Building =>
    ({ position: [x, 0, z], size: [sx, h, sz], color: '#000', style: 'residential' });
  const b: Building[] = [];
  for (const w of WALLS) { const k = wallBox(w); b.push(solid(k.x, k.z, k.sx, k.sz, STOREY)); }
  // The site's edges: the street's far kerb, the sides and the back
  b.push(solid(0, CAMPUS.z0 - 0.5, 70, 1), solid(CAMPUS.x0 - 0.5, -8, 1, 82), solid(CAMPUS.x1 + 0.5, -8, 1, 82), solid(0, CAMPUS.z1 + 0.5, 70, 1));
  // Gate: fences either side, pylons, booths, the barrier across the vehicle lane
  b.push(solid((CAMPUS.x0 + GATE.pylons[0] - 0.7) / 2, GATE_Z, GATE.pylons[0] - 0.7 - CAMPUS.x0, 0.3));
  b.push(solid((CAMPUS.x1 + GATE.pylons[1] + 0.7) / 2, GATE_Z, CAMPUS.x1 - GATE.pylons[1] - 0.7, 0.3));
  for (const x of GATE.pylons) b.push(solid(x, GATE_Z, 1.4, 1.4, 6));
  for (const x of GATE.booths) b.push(solid(x, GATE_Z, 1.8, 2.2, 2.6));
  b.push(solid(0, GATE_Z, GATE.vehicleLane * 2, 0.3));
  // Between the building and the side walls
  b.push(solid((CAMPUS.x0 + BUILDING.x0) / 2, 16, BUILDING.x0 - CAMPUS.x0, 28), solid((CAMPUS.x1 + BUILDING.x1) / 2, 16, CAMPUS.x1 - BUILDING.x1, 28));
  // Courtyard
  b.push(solid(COURTYARD.fountain.x, COURTYARD.fountain.z, COURTYARD.fountain.r * 1.6, COURTYARD.fountain.r * 1.6));
  for (const g of COURTYARD.beds) b.push(solid(g.x, g.z, g.w, g.d, 0.5));
  for (const [x, z] of COURTYARD.trees) b.push(solid(x, z, 0.8, 0.8, 3));
  b.push(solid(COURTYARD.directory.x, COURTYARD.directory.z, 1.6, 0.4, 2), solid(COURTYARD.signpost.x, COURTYARD.signpost.z, 0.4, 0.4, 3), solid(COURTYARD.noticeboard.x, COURTYARD.noticeboard.z, 0.4, 2, 2));
  for (const u of COURTYARD.umbrellas) b.push(solid(u.x, u.z, 1.2, 1.2));
  b.push(solid(COURTYARD.bikes.x, COURTYARD.bikes.z, 3.4, 0.8));
  // Hall
  b.push(solid(HALL.lectern.x, HALL.lectern.z, 0.8, 1.6));
  for (const d of HALL_DESKS) b.push(solid(d.x, d.z, 0.6, d.len));
  // Lab
  for (const d of LAB.desks) b.push(solid(d.x, d.z, d.len, 0.7));
  // Library
  for (const s of LIBRARY.shelves) b.push(s.along === 'z' ? solid(s.x, s.z, 0.5, s.len, 2.2) : solid(s.x, s.z, s.len, 0.5, 2.2));
  for (const t of LIBRARY.tables) b.push(solid(t.x, t.z, 1.6, 0.9));
  b.push(solid(LIBRARY.desk.x, LIBRARY.desk.z, LIBRARY.desk.w, LIBRARY.desk.d), solid(LIBRARY.computers.x, LIBRARY.computers.z, 0.6, 2.2));
  // Cafeteria
  b.push(solid(CAFE.counter.x, CAFE.counter.z, CAFE.counter.w, CAFE.counter.d));
  for (const t of CAFE.tables) b.push(solid(t.x, t.z, 1, 1));
  // Centre, services, lobby
  for (const s of CENTRE.sofas) b.push(Math.abs(Math.sin(s.facing)) > 0.5 ? solid(s.x, s.z, 0.9, 2.2) : solid(s.x, s.z, 2.2, 0.9));
  b.push(solid(CENTRE.table.x, CENTRE.table.z, 1.6, 0.9));
  b.push(solid(SERVICES.counter.x, SERVICES.counter.z, SERVICES.counter.w, SERVICES.counter.d));
  b.push(solid(LOBBY.desk.x, LOBBY.desk.z, LOBBY.desk.w, LOBBY.desk.d), solid(LOBBY.directory.x, LOBBY.directory.z, 0.4, 1.4, 2.2));
  for (const s of LOBBY.seating) b.push(solid(s.x, s.z, 2.2, 0.9));
  // Restroom cubicles along the back wall
  b.push(solid(0.75, 28.6, 4.4, 2.2, 2.2));
  return buildLayout({
    id: `venue.${CAMPUS_ID}`,
    roadHalfWidth: 1000,
    pavementWidth: 0,
    crossStreet: { minZ: 5000, maxZ: 5001 },
    buildings: b,
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
