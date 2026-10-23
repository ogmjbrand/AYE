import { describe, expect, it } from 'vitest';
import {
  DESK_SPOT, DOOR_SPOT, GUEST_ROOM, NIGHT_PRICE, ROOMS, WASH_HYGIENE, armchairSeats, basinSpot, bedSpot, checkoutFor, hotelLayout, roomById, roomDoorSpot,
  roomInsideSpot, sanitiseStay, stayIsValid,
} from './hotel';
import { findPath, walkGridFor } from './pathfinding';
import { DISTRICTS, hotelAt } from './geography';
import { createGameState, createTime, gameReducer, type GameState } from './gameState';
import { loadProgress, saveProgress } from './save';
import type { Character } from '../components/CharacterCreation';

const act = (s: GameState, a: Parameters<typeof gameReducer>[1]) => gameReducer(s, a, 'engineer', 'ordinary');
const guest = roomById(GUEST_ROOM)!;
const pt = (p: readonly [number, number]) => ({ x: p[0], z: p[1] });

describe('Grand Lagoon Hotel', () => {
  it('checks out at noon the day after you book, or noon today if you book after midnight', () => {
    const day = 3 * 1440;
    expect(checkoutFor(day + 20 * 60)).toBe(day + 1440 + 12 * 60);
    expect(checkoutFor(day + 9 * 60)).toBe(day + 1440 + 12 * 60);
    expect(checkoutFor(day + 2 * 60)).toBe(day + 12 * 60);
    expect(stayIsValid({ room: GUEST_ROOM, until: day + 100 }, day + 99)).toBe(true);
    expect(stayIsValid({ room: GUEST_ROOM, until: day + 100 }, day + 100)).toBe(false);
    expect(stayIsValid(null, day)).toBe(false);
  });

  it('books one night at a time, for the price of a night, and only if you can pay', () => {
    const s0 = createGameState(1000, createTime(20, 0));
    const s1 = act(s0, { type: 'bookHotel' });
    expect(s1.balance).toBe(1000 - NIGHT_PRICE);
    expect(s1.hotel?.room).toBe(GUEST_ROOM);
    expect(s1.today.expenses).toBe(NIGHT_PRICE);
    expect(act(s1, { type: 'bookHotel' })).toBe(s1);
    const broke = createGameState(NIGHT_PRICE - 1, createTime(20, 0));
    expect(act(broke, { type: 'bookHotel' })).toBe(broke);
  });

  it('freshens you up at the basin only while you have a room', () => {
    const s0 = { ...createGameState(1000, createTime(20, 0)), needs: { energy: 60, hygiene: 20, fun: 60, social: 60 } };
    expect(act(s0, { type: 'hotelWash' })).toBe(s0);
    const s1 = act(act(s0, { type: 'bookHotel' }), { type: 'hotelWash' });
    expect(s1.needs.hygiene).toBeGreaterThan(20 + WASH_HYGIENE - 5);
    expect(s1.time.totalMinutes).toBeGreaterThan(s0.time.totalMinutes);
  });

  it('keeps a booking in the save, and drops a broken one', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k), clear: () => store.clear(), key: () => null, length: 0 } as Storage;
    const character = { id: 'abc' } as Character;
    const s = act(createGameState(1000, createTime(20, 0)), { type: 'bookHotel' });
    saveProgress('abc', s, storage);
    expect(loadProgress(character, storage).hotel).toEqual(s.hotel);
    expect(sanitiseStay({ room: '999', until: 5 })).toBeNull();
    expect(sanitiseStay({ room: GUEST_ROOM, until: 'soon' })).toBeNull();
    expect(sanitiseStay(undefined)).toBeNull();
  });

  it('every room is the same size, along a corridor you can walk from the door', () => {
    const grid = walkGridFor(hotelLayout(false).obstacles);
    const from = pt(DOOR_SPOT);
    expect(findPath(grid, from, pt(DESK_SPOT))).not.toBeNull();
    for (const r of ROOMS) expect(findPath(grid, from, pt(roomDoorSpot(r))), r.id).not.toBeNull();
    for (const side of [1, -1]) expect(ROOMS.filter((r) => r.side === side).map((r) => r.z0)).toEqual([-3, 3, 9]);
  });

  it('your room stays locked until you book, then its bed, basin and armchairs can all be reached', () => {
    const locked = walkGridFor(hotelLayout(false).obstacles);
    const open = walkGridFor(hotelLayout(true).obstacles);
    const from = pt(DOOR_SPOT);
    expect(findPath(locked, from, pt(roomInsideSpot(guest)))).toBeNull();
    expect(findPath(open, from, pt(roomInsideSpot(guest)))).not.toBeNull();
    expect(findPath(open, from, pt(bedSpot(guest)))).not.toBeNull();
    expect(findPath(open, from, pt(basinSpot(guest)))).not.toBeNull();
    for (const c of armchairSeats(guest)) expect(findPath(open, from, { x: c.approach!.x, z: c.approach!.z }), c.id).not.toBeNull();
    // The other rooms are always taken
    const other = roomById('101')!;
    expect(findPath(open, from, pt(roomInsideSpot(other)))).toBeNull();
  });

  it('stands in Ayemara, with a door you can walk to from the street', () => {
    const lagos = DISTRICTS[0];
    expect(lagos.hotel?.name).toBe('Grand Lagoon Hotel');
    const door = lagos.hotel!.door;
    expect(hotelAt(lagos, door[0], door[2])?.id).toBe('grand-lagoon');
    const street = walkGridFor(lagos.layout.obstacles);
    expect(findPath(street, { x: lagos.spawn[0], z: lagos.spawn[2] }, { x: door[0], z: door[2] })).not.toBeNull();
    expect(DISTRICTS.slice(1).every((d) => !d.hotel)).toBe(true);
  });
});
