/**
 * AYE General Hospital: a walk-in hospital at every city's Hospital marker,
 * and the doctor career's workplace.
 *
 * Plan (metres, +z away from the street):
 *   forecourt and ambulance bay     z −9 … 0
 *   south: emergency · lobby & waiting · staff room      z 0 … 9
 *   corridor                                             z 9 … 12
 *   north: consulting room 1 · ward · consulting room 2  z 12 … 22
 *
 * The shift (a doctor's loop), kept in GameState.shift:
 *   - Clock in with the supervisor in the staff room, between 09:00 and
 *     17:00. Only clocked-in minutes inside the hospital are paid, at the
 *     doctor's existing hourly rate (HOURLY_WAGE, careers' levels and
 *     equipment, exactly as before). Leaving the building or clocking out ends
 *     the shift; so does the end of the day.
 *   - Patients (computer-controlled) wait in the ward, both consulting rooms
 *     and emergency. Seeing one takes game time (paid, since you're on shift)
 *     and counts once per patient per day. The supervisor sets a daily target.
 *   - No extra money for patients: the pay is the hourly wage for the time,
 *     like any other work, so nothing is paid twice.
 */
import { buildLayout, type Building, type DistrictLayout } from './world';
import { run, wallBox, type WallSeg } from './university';
import type { Seat } from './seating';

export const HOSPITAL_NAME = 'AYE General Hospital';
export const HOSPITAL_ID = 'aye-general-hospital';
export const H_STOREY = 3.6;
export const H_BUILDING = { x0: -15, x1: 15, z0: 0, z1: 22, height: 7.5 } as const;
export const H_CORRIDOR = { z0: 9, z1: 12 } as const;
export const H_SITE = { x0: -17, x1: 17, z0: -9, z1: 23 } as const;
/** Where you arrive from the street (and where E takes you back). */
export const H_ARRIVE = [0, -6] as const;

export type HospitalRoom = 'outside' | 'lobby' | 'corridor' | 'emergency' | 'staff' | 'consult-1' | 'ward' | 'consult-2';

export const H_ROOMS: Record<Exclude<HospitalRoom, 'outside' | 'corridor'>, { x0: number; x1: number; z0: number; z1: number; door: readonly [number, number]; name: string; code: string }> = {
  emergency: { x0: -15, x1: -6, z0: 0, z1: 9, door: [-9, 9], name: 'Emergency', code: 'ER' },
  lobby: { x0: -6, x1: 6, z0: 0, z1: 9, door: [0, 0], name: 'Reception & waiting', code: '' },
  staff: { x0: 6, x1: 15, z0: 0, z1: 9, door: [9, 9], name: 'Staff room', code: 'S1' },
  'consult-1': { x0: -15, x1: -7, z0: 12, z1: 22, door: [-11, 12], name: 'Consulting room 1', code: 'C1' },
  ward: { x0: -7, x1: 7, z0: 12, z1: 22, door: [0, 12], name: 'General ward', code: 'W1' },
  'consult-2': { x0: 7, x1: 15, z0: 12, z1: 22, door: [11, 12], name: 'Consulting room 2', code: 'C2' },
};
const DOOR_W: Partial<Record<keyof typeof H_ROOMS, number>> = { lobby: 3, ward: 2.6, emergency: 2.6 };
export const hDoorWidth = (r: keyof typeof H_ROOMS) => DOOR_W[r] ?? 1.8;
const gap = (r: keyof typeof H_ROOMS) => [H_ROOMS[r].door[0], hDoorWidth(r)] as const;

export const H_WALLS: readonly WallSeg[] = [
  ...run('x', H_BUILDING.z0, H_BUILDING.x0, H_ROOMS.lobby.x0, [], { outer: true }),
  ...run('x', H_BUILDING.z0, H_ROOMS.lobby.x0, H_ROOMS.lobby.x1, [gap('lobby')], { outer: true, glass: true }),
  ...run('x', H_BUILDING.z0, H_ROOMS.lobby.x1, H_BUILDING.x1, [], { outer: true }),
  ...run('x', H_BUILDING.z1, H_BUILDING.x0, H_BUILDING.x1, [], { outer: true }),
  ...run('z', H_BUILDING.x0, H_BUILDING.z0, H_BUILDING.z1, [], { outer: true }),
  ...run('z', H_BUILDING.x1, H_BUILDING.z0, H_BUILDING.z1, [], { outer: true }),
  // South rooms onto the corridor (the lobby is open to it)
  ...run('x', H_CORRIDOR.z0, H_BUILDING.x0, H_ROOMS.lobby.x0, [gap('emergency')]),
  ...run('x', H_CORRIDOR.z0, H_ROOMS.lobby.x1, H_BUILDING.x1, [gap('staff')]),
  ...run('z', H_ROOMS.lobby.x0, H_BUILDING.z0, H_CORRIDOR.z0, []),
  ...run('z', H_ROOMS.lobby.x1, H_BUILDING.z0, H_CORRIDOR.z0, []),
  // North rooms
  ...run('x', H_CORRIDOR.z1, H_BUILDING.x0, H_BUILDING.x1, [gap('consult-1'), gap('ward'), gap('consult-2')]),
  ...run('z', H_ROOMS['consult-1'].x1, H_CORRIDOR.z1, H_BUILDING.z1, []),
  ...run('z', H_ROOMS['consult-2'].x0, H_CORRIDOR.z1, H_BUILDING.z1, []),
];

export function hospitalRoomAt(x: number, z: number): HospitalRoom {
  if (x < H_BUILDING.x0 || x > H_BUILDING.x1 || z < H_BUILDING.z0 || z > H_BUILDING.z1) return 'outside';
  if (z >= H_CORRIDOR.z0 && z <= H_CORRIDOR.z1) return 'corridor';
  for (const [id, r] of Object.entries(H_ROOMS) as [keyof typeof H_ROOMS, (typeof H_ROOMS)[keyof typeof H_ROOMS]][]) {
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return id;
  }
  return 'corridor';
}
export const insideHospital = (x: number, z: number) => x > H_BUILDING.x0 && x < H_BUILDING.x1 && z > H_BUILDING.z0 && z < H_BUILDING.z1;

export const ROOM_LABEL: Record<HospitalRoom, string> = {
  outside: 'Forecourt', lobby: 'Reception & waiting', corridor: 'Corridor', emergency: 'Emergency (ER)', staff: 'Staff room (S1)',
  'consult-1': 'Consulting room 1 (C1)', ward: 'General ward (W1)', 'consult-2': 'Consulting room 2 (C2)',
};

// ---------------------------------------------------------------- fittings

export const RECEPTION = { x: 3, z: 6.6, w: 3.6, d: 0.8 } as const;
export const WAITING_ROWS = [{ x: -3, z: 3, len: 4 }, { x: -3, z: 5.4, len: 4 }] as const;
export const SUPERVISOR_DESK = { x: 11, z: 5.5, w: 2, d: 0.9 } as const;
export const WARD_BEDS = [-5, -1.7, 1.7, 5].map((x, i) => ({ id: `bed-${i + 1}`, x, z: 20.4 }));
export const ER_BAYS = [{ id: 'er-1', x: -13, z: 3.5 }, { id: 'er-2', x: -13, z: 7 }];
export const CONSULT_DESKS = [{ room: 'consult-1' as const, x: -11, z: 19 }, { room: 'consult-2' as const, x: 11, z: 19 }];

export interface Patient {
  id: string;
  name: string;
  lookId: string;
  room: HospitalRoom;
  complaint: string;
  /** Game minutes it takes to see them. */
  minutes: number;
  seat: Seat;
  /** How far in front of them the doctor stands (across the desk in a consulting room). */
  reach?: number;
}

const BED_H = 0.62;
/** Patients sit on the side of their beds or the consulting-room chair, facing where the doctor stands. */
export const PATIENTS: readonly Patient[] = [
  ...WARD_BEDS.map((b, i) => ({
    id: b.id,
    name: ['Mr. Okafor', 'Mrs. Mensah', 'Baba Sule', 'Miss Danjuma'][i],
    lookId: ['male-adult-15', 'female-adult-06', 'male-adult-01', 'female-adult-03'][i],
    room: 'ward' as const,
    complaint: ['Recovering after an operation', 'Malaria, day two', 'Blood pressure check', 'Broken wrist, set yesterday'][i],
    minutes: 20,
    seat: { id: `p-${b.id}`, x: b.x, z: b.z - 0.55, facing: Math.PI, height: BED_H },
  })),
  { id: 'c1', name: 'Kunle', lookId: 'male-adult-18', room: 'consult-1', complaint: 'A cough for two weeks', minutes: 15, seat: { id: 'p-c1', x: -9.6, z: 19, facing: -Math.PI / 2, height: 0.47 }, reach: 2.8 },
  { id: 'c2', name: 'Grace', lookId: 'female-adult-04', room: 'consult-2', complaint: 'Headaches and tiredness', minutes: 15, seat: { id: 'p-c2', x: 9.6, z: 19, facing: Math.PI / 2, height: 0.47 }, reach: 2.8 },
  { id: 'er', name: 'Yaw', lookId: 'male-adult-10', room: 'emergency', complaint: 'Deep cut on the hand', minutes: 30, seat: { id: 'p-er', x: ER_BAYS[0].x, z: ER_BAYS[0].z, facing: Math.PI / 2, height: BED_H } },
];
export const patientById = (id: string | undefined) => PATIENTS.find((p) => p.id === id);

/** Where the doctor stands to see each patient. */
export const patientSpot = (p: Patient): [number, number] =>
  [p.seat.x + Math.sin(p.seat.facing) * (p.reach ?? 1.2), p.seat.z + Math.cos(p.seat.facing) * (p.reach ?? 1.2)];

export const DAILY_TARGET = 4;

export interface HospitalPerson { lookId: string; name: string; role: string; x: number; z: number; facing: number; route?: readonly (readonly [number, number])[]; seat?: Seat; chatty?: boolean }
export const HOSPITAL_STAFF: readonly HospitalPerson[] = [
  { lookId: 'female-adult-11', name: 'Adaeze', role: 'Receptionist', x: RECEPTION.x, z: RECEPTION.z + 0.8, facing: Math.PI, chatty: true },
  { lookId: 'male-adult-12', name: 'Dr. Bello', role: 'Supervisor', x: SUPERVISOR_DESK.x, z: SUPERVISOR_DESK.z + 0.85, facing: Math.PI },
  { lookId: 'female-adult-08', name: 'Nurse Efe', role: 'Nurse', x: 0, z: 10.5, facing: 0, route: [[-12, 10.5], [12, 10.5]] },
  { lookId: 'female-adult-10', name: 'Nurse Halima', role: 'Nurse', x: -3, z: 16, facing: 0, route: [[-5, 16.5], [5, 16.5]] },
];
/** People waiting in reception (visitors, computer-controlled). */
export const WAITING_PEOPLE: readonly HospitalPerson[] = [
  { lookId: 'male-adult-04', name: 'Tunde', role: 'Visitor', x: 0, z: 0, facing: 0, seat: { id: 'w-1', x: -4, z: 3.55, facing: 0, height: 0.45 } },
  { lookId: 'female-adult-08', name: 'Bisi', role: 'Visitor', x: 0, z: 0, facing: 0, seat: { id: 'w-2', x: -2, z: 5.95, facing: 0, height: 0.45 } },
];

export type HSpotId = 'leave' | 'reception' | 'supervisor' | 'patient' | 'waiting';
export interface HSpot { id: HSpotId; x: number; z: number; r: number; patientId?: string }
export const H_SPOTS: readonly HSpot[] = [
  { id: 'leave', x: H_ARRIVE[0], z: H_ARRIVE[1], r: 2.2 },
  { id: 'reception', x: RECEPTION.x, z: RECEPTION.z - 1.2, r: 1.6 },
  { id: 'supervisor', x: SUPERVISOR_DESK.x, z: SUPERVISOR_DESK.z - 1.3, r: 1.7 },
  ...PATIENTS.map((p) => { const [x, z] = patientSpot(p); return { id: 'patient' as const, x, z, r: 1.3, patientId: p.id }; }),
];
export function hospitalSpotAt(x: number, z: number): HSpot | null {
  let best: HSpot | null = null;
  let bestD = Infinity;
  for (const s of H_SPOTS) {
    const d = Math.hypot(x - s.x, z - s.z);
    if (d <= s.r && d < bestD) { best = s; bestD = d; }
  }
  return best;
}

// ---------------------------------------------------------------- the shift (pure rules)

export interface ShiftState {
  /** Game day the fields below are for. */
  day: number;
  clockedIn: boolean;
  /** Patient ids seen today. */
  seen: string[];
  patientsTotal: number;
  /** Shifts on which the daily target was met. */
  targetsMet: number;
}
export const emptyShift = (): ShiftState => ({ day: -1, clockedIn: false, seen: [], patientsTotal: 0, targetsMet: 0 });

const dayOf = (t: number) => Math.floor(t / 1440);
/** A new day: nobody seen yet, and you're off shift. */
export function rollShift(s: ShiftState, totalMinutes: number): ShiftState {
  const day = dayOf(totalMinutes);
  return s.day === day ? s : { ...s, day, clockedIn: false, seen: [] };
}
const minuteOf = (t: number) => ((t % 1440) + 1440) % 1440;
export const shiftHours = (totalMinutes: number) => minuteOf(totalMinutes) >= 9 * 60 && minuteOf(totalMinutes) < 17 * 60;

export function clockIn(s: ShiftState, totalMinutes: number): ShiftState {
  const today = rollShift(s, totalMinutes);
  if (today.clockedIn || !shiftHours(totalMinutes)) return s;
  return { ...today, clockedIn: true };
}
export const clockOut = (s: ShiftState): ShiftState => (s.clockedIn ? { ...s, clockedIn: false } : s);

/** After seeing a patient (the time has passed): counted once per patient per day; the target counts once. */
export function saw(s: ShiftState, patientId: string): ShiftState {
  if (s.seen.includes(patientId) || !patientById(patientId)) return s;
  const seen = [...s.seen, patientId];
  return { ...s, seen, patientsTotal: s.patientsTotal + 1, targetsMet: s.targetsMet + (seen.length === DAILY_TARGET ? 1 : 0) };
}

const int = (v: unknown, min = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.round(v)) : min);
export function sanitiseShift(v: unknown): ShiftState {
  if (!v || typeof v !== 'object') return emptyShift();
  const p = v as Record<string, unknown>;
  return {
    day: int(p.day, -1),
    clockedIn: p.clockedIn === true,
    seen: Array.isArray(p.seen) ? [...new Set(p.seen.filter((x): x is string => typeof x === 'string' && !!patientById(x)))] : [],
    patientsTotal: int(p.patientsTotal),
    targetsMet: int(p.targetsMet),
  };
}

// ---------------------------------------------------------------- collisions

export function hospitalLayout(): DistrictLayout {
  const solid = (x: number, z: number, sx: number, sz: number, h = 1): Building =>
    ({ position: [x, 0, z], size: [sx, h, sz], color: '#000', style: 'residential' });
  const b: Building[] = [];
  for (const w of H_WALLS) { const k = wallBox(w); b.push(solid(k.x, k.z, k.sx, k.sz, H_STOREY)); }
  // The site: street kerb, sides, back
  b.push(solid(0, H_SITE.z0 - 0.5, 40, 1), solid(H_SITE.x0 - 0.5, 7, 1, 34), solid(H_SITE.x1 + 0.5, 7, 1, 34), solid(0, H_SITE.z1 + 0.5, 40, 1));
  // Ambulance (parked in the bay) and planters
  b.push(solid(-10, -4.5, 2.2, 5.4, 2.6), solid(8, -1.2, 4, 1, 0.6), solid(-4.5, -1.2, 1.4, 1, 0.6));
  b.push(solid(RECEPTION.x, RECEPTION.z, RECEPTION.w, RECEPTION.d));
  for (const r of WAITING_ROWS) b.push(solid(r.x, r.z + 0.1, r.len, 0.7));
  b.push(solid(SUPERVISOR_DESK.x, SUPERVISOR_DESK.z, SUPERVISOR_DESK.w, SUPERVISOR_DESK.d));
  for (const bed of WARD_BEDS) b.push(solid(bed.x, bed.z, 1, 2.1));
  for (const bay of ER_BAYS) b.push(solid(bay.x - 0.5, bay.z, 2.1, 1));
  for (const d of CONSULT_DESKS) b.push(solid(d.x, d.z, 0.8, 1.4));
  return buildLayout({
    id: `venue.${HOSPITAL_ID}`,
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
