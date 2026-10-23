import { describe, expect, it } from 'vitest';
import {
  CLIENTS_PER_DAY, DESK_SPOT, DOOR_SPOT, LEVELS, MANAGER_SPOT, ROOMS, ROUTINES, SERVICES, clientsFor, levelOf, roomDoorX, sanitiseSpaJob,
  satisfaction, scoreStep, sessionPay, serviceById, spaLayout, tableSpot, emptySpaJob, stars,
} from './spa';
import { findPath, walkGridFor } from './pathfinding';
import { DISTRICTS, spaAt } from './geography';
import { createGameState, createTime, gameReducer, type GameState } from './gameState';
import { loadProgress, saveProgress } from './save';
import type { Character } from '../components/CharacterCreation';

const act = (s: GameState, a: Parameters<typeof gameReducer>[1]) => gameReducer(s, a, 'engineer', 'ordinary');
const pt = (p: readonly [number, number]) => ({ x: p[0], z: p[1] });
/** The best choice at every step for this client. */
const perfect = (c: ReturnType<typeof clientsFor>[number]) => ROUTINES[c.service].map((st) => {
  const scores = st.options.map((o) => scoreStep(c, o));
  return scores.indexOf(Math.max(...scores));
});

describe('Alafia Spa', () => {
  it('offers every service on the poster, each with a routine of its own', () => {
    expect(SERVICES.map((s) => s.name)).toEqual(expect.arrayContaining([
      'Full Body Massage', 'Deep Tissue Massage', 'Swedish Massage', 'Sports Massage', 'Relaxation Massage', 'Back & Neck Massage', 'Foot Massage', 'Couples Massage', 'Hot Stone Massage',
    ]));
    for (const s of SERVICES) {
      expect(s.price).toBeGreaterThan(0);
      expect(ROUTINES[s.id].length).toBeGreaterThanOrEqual(4);
    }
  });

  it('a treatment as a guest costs its price, takes its time and lifts your energy', () => {
    const s0 = { ...createGameState(2000, createTime(14, 0)), needs: { energy: 30, hygiene: 60, fun: 40, social: 60 } };
    const svc = serviceById('swedish')!;
    const s1 = act(s0, { type: 'spaTreat', serviceId: 'swedish' });
    // Everyday costs tick by as time passes; on top of that, the treatment's price
    const waited = act(s0, { type: 'wait', minutes: svc.minutes });
    expect(s1.balance).toBe(waited.balance - svc.price);
    expect(s1.time.totalMinutes - s0.time.totalMinutes).toBe(svc.minutes);
    expect(s1.needs.energy).toBeGreaterThan(s0.needs.energy);
    // Closed at night, and a couples massage needs a friend
    expect(act({ ...s0, time: createTime(23, 0) }, { type: 'spaTreat', serviceId: 'swedish' }).balance).toBe(2000);
    expect(act(s0, { type: 'spaTreat', serviceId: 'couples' })).toBe(s0);
    const friends = { ...s0, relationships: { 'res-1': { points: 1000, lastDay: -1 } } };
    expect(act(friends, { type: 'spaTreat', serviceId: 'couples', friendId: 'res-1' }).balance).toBe(act(friends, { type: 'wait', minutes: serviceById('couples')!.minutes }).balance - serviceById('couples')!.price);
  });

  it('as a therapist: hired, clocked in, each client served once, paid a share plus a tip for doing it well', () => {
    let s = createGameState(0, createTime(11, 0));
    expect(act(s, { type: 'spaClockIn' })).toBe(s);
    s = act(act(s, { type: 'spaHire' }), { type: 'spaClockIn' });
    expect(s.spa.clockedIn).toBe(true);
    const day = Math.floor(s.time.totalMinutes / 1440);
    const [c] = clientsFor(day);
    const after = act(s, { type: 'spaSession', clientId: c.id, choices: perfect(c) });
    const svc = serviceById(c.service)!;
    const waited = act(s, { type: 'wait', minutes: svc.minutes });
    expect(after.balance - waited.balance).toBe(Math.round(svc.price * LEVELS[0].share) + Math.round(svc.price * 0.25));
    expect(after.spa.served).toEqual([c.id]);
    expect(after.spa.goodSessions).toBe(1);
    // Not twice
    expect(act(after, { type: 'spaSession', clientId: c.id, choices: perfect(c) })).toBe(after);
    // A careless session earns the fee and no tip
    const [, c2] = clientsFor(day);
    const worst = ROUTINES[c2.service].map((st) => { const sc = st.options.map((o) => scoreStep(c2, o)); return sc.indexOf(Math.min(...sc)); });
    expect(satisfaction(c2, worst)!).toBeLessThan(40);
    const bad = act(after, { type: 'spaSession', clientId: c2.id, choices: worst });
    const waited2 = act(after, { type: 'wait', minutes: serviceById(c2.service)!.minutes });
    expect(bad.balance - waited2.balance).toBe(sessionPay(after.spa, serviceById(c2.service)!, satisfaction(c2, worst)!).fee);
    expect(bad.spa.goodSessions).toBe(1);
    // Wrong number of choices is refused
    expect(act(after, { type: 'spaSession', clientId: c2.id, choices: [0] })).toBe(after);
  });

  it('promotes you after enough good sessions, and keeps the job in the save', () => {
    expect(levelOf({ goodSessions: 0 })).toBe(0);
    expect(levelOf({ goodSessions: 8 })).toBe(1);
    expect(levelOf({ goodSessions: 99 })).toBe(LEVELS.length - 1);
    expect(stars(95)).toBe(5);
    expect(sanitiseSpaJob({ employed: true, clockedIn: true, served: ['a', 3], goodSessions: -2 })).toEqual({ ...emptySpaJob(), employed: true, clockedIn: true, served: ['a'] });
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: () => {}, clear: () => {}, key: () => null, length: 0 } as Storage;
    const s = act(createGameState(10), { type: 'spaHire' });
    saveProgress('abc', s, storage);
    expect(loadProgress({ id: 'abc' } as Character, storage).spa.employed).toBe(true);
  });

  it('five clients a day, the same ones for the same day', () => {
    expect(clientsFor(4)).toHaveLength(CLIENTS_PER_DAY);
    expect(clientsFor(4)).toEqual(clientsFor(4));
  });

  it('can walk from the door to the desk, the manager and every massage table', () => {
    const grid = walkGridFor(spaLayout().obstacles);
    const from = pt(DOOR_SPOT);
    expect(findPath(grid, from, pt(DESK_SPOT))).not.toBeNull();
    expect(findPath(grid, from, pt(MANAGER_SPOT))).not.toBeNull();
    for (const r of ROOMS) {
      expect(findPath(grid, from, { x: roomDoorX(r), z: 0 }), r.id).not.toBeNull();
      for (const t of r.tables) expect(findPath(grid, from, pt(tableSpot(t))), r.id).not.toBeNull();
    }
  });

  it('stands in Ayemara with a door you can reach from the street', () => {
    const lagos = DISTRICTS[0];
    const door = lagos.spa!.door;
    expect(spaAt(lagos, door[0], door[2])?.name).toBe('Alafia Spa');
    const grid = walkGridFor(lagos.layout.obstacles);
    expect(findPath(grid, { x: lagos.spawn[0], z: lagos.spawn[2] }, { x: door[0], z: door[2] })).not.toBeNull();
    expect(DISTRICTS.slice(1).every((d) => !d.spa)).toBe(true);
  });
});
