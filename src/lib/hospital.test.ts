import { describe, expect, it } from 'vitest';
import { findPath, walkGridFor } from './pathfinding';
import { resolveCollisions } from './world';
import {
  DAILY_TARGET, H_ARRIVE, H_ROOMS, H_SPOTS, PATIENTS, clockIn, clockOut, emptyShift, hospitalLayout, hospitalRoomAt, hospitalSpotAt,
  patientSpot, rollShift, sanitiseShift, saw,
} from './hospital';

const layout = hospitalLayout();
const grid = walkGridFor(layout.obstacles);
const free = (x: number, z: number) => { const r = resolveCollisions(x, z, undefined, layout.obstacles); return Math.hypot(r.x - x, r.z - z) < 1e-6; };
const reach = (x: number, z: number) => findPath(grid, { x: H_ARRIVE[0], z: H_ARRIVE[1] }, { x, z });

describe('hospital plan', () => {
  it('every room, spot and patient can be reached on foot from the street', () => {
    expect(free(H_ARRIVE[0], H_ARRIVE[1])).toBe(true);
    for (const [id, r] of Object.entries(H_ROOMS)) {
      expect(free(r.door[0], r.door[1]), `${id} door`).toBe(true);
      const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
      expect(hospitalRoomAt(cx, cz)).toBe(id);
    }
    for (const s of H_SPOTS) {
      expect(free(s.x, s.z), `${s.id} ${s.patientId ?? ''}`).toBe(true);
      expect(reach(s.x, s.z), `${s.id} ${s.patientId ?? ''}`).not.toBeNull();
      expect(hospitalSpotAt(s.x, s.z)?.patientId).toBe(s.patientId);
    }
    for (const p of PATIENTS) expect(hospitalRoomAt(...patientSpot(p))).toBe(p.room);
  });
});

describe('shift rules', () => {
  const nine = 2 * 1440 + 9 * 60 + 5;
  it('clocks in only in shift hours, and a new day ends the shift', () => {
    expect(clockIn(emptyShift(), 2 * 1440 + 8 * 60).clockedIn).toBe(false);
    const s = clockIn(emptyShift(), nine);
    expect(s.clockedIn).toBe(true);
    expect(clockOut(s).clockedIn).toBe(false);
    expect(rollShift(s, nine + 1440).clockedIn).toBe(false);
  });
  it('counts each patient once a day, and the target once', () => {
    let s = clockIn(emptyShift(), nine);
    for (const p of PATIENTS) s = saw(s, p.id);
    s = saw(s, PATIENTS[0].id);
    expect(s.seen.length).toBe(PATIENTS.length);
    expect(s.patientsTotal).toBe(PATIENTS.length);
    expect(s.targetsMet).toBe(PATIENTS.length >= DAILY_TARGET ? 1 : 0);
    const next = rollShift(s, nine + 1440);
    expect(next.seen).toEqual([]);
    expect(next.patientsTotal).toBe(PATIENTS.length);
  });
  it('sanitises saves', () => {
    expect(sanitiseShift(undefined)).toEqual(emptyShift());
    expect(sanitiseShift({ seen: ['bed-1', 'x', 'bed-1'], patientsTotal: -3 })).toMatchObject({ seen: ['bed-1'], patientsTotal: 0 });
  });
});

import { HOURLY_WAGE, createGameState, createTime, gameReducer } from './gameState';
describe('shift in the game', () => {
  it('pays seeing a patient as on-shift work, and only once per patient', () => {
    let s = createGameState(1000, createTime(9, 40, 1));
    s = gameReducer(s, { type: 'clockIn' }, 'doctor', 'ordinary');
    expect(s.shift.clockedIn).toBe(true);
    s = gameReducer(s, { type: 'seePatient', patientId: 'er' }, 'doctor', 'ordinary');
    // 09:40 + 30 min = 10:10: the 09:40–10:00 hour was paid at the doctor's rate
    expect(s.time.hour * 60 + s.time.minute).toBe(10 * 60 + 10);
    expect(s.today.income).toBe(Math.round(HOURLY_WAGE.doctor * 20 / 60));
    expect(s.shift.seen).toEqual(['er']);
    const again = gameReducer(s, { type: 'seePatient', patientId: 'er' }, 'doctor', 'ordinary');
    expect(again).toBe(s);
  });
  it('needs a clocked-in doctor', () => {
    const s = createGameState(1000, createTime(10, 0, 1));
    expect(gameReducer(s, { type: 'seePatient', patientId: 'er' }, 'doctor', 'ordinary').shift.seen).toEqual([]);
    expect(gameReducer(s, { type: 'clockIn' }, 'engineer', 'ordinary').shift.clockedIn).toBe(false);
  });
});
