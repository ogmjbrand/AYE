import { describe, expect, it } from 'vitest';
import {
  DESK_SPOT, DOOR_SPOT, GUEST_ROOM, HOTEL_DISH_IDS, NIGHT_PRICE, ROOMS, ROOM_SERVICE_MENU, VENDING, VENDING_MENU, VENDING_SPOT, WASH_HYGIENE, armchairSeats,
  basinSpot, bedSpot, checkoutFor, hotelLayout, roomById, roomDoorSpot, roomInsideSpot, roomServiceSpot, sanitiseStay, stayIsValid, BUILDING, LOBBY,
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

  it('has a drinks machine in the lobby and room service in your room, all paid like any meal', () => {
    expect(VENDING.x - VENDING.w / 2).toBeGreaterThan(BUILDING.x0);
    expect(VENDING.z + VENDING.d / 2).toBeLessThan(LOBBY.z1);
    const open = walkGridFor(hotelLayout(true).obstacles);
    const from = pt(DOOR_SPOT);
    expect(findPath(open, from, pt(VENDING_SPOT))).not.toBeNull();
    expect(findPath(walkGridFor(hotelLayout(false).obstacles), from, pt(DESK_SPOT))).not.toBeNull();
    expect(findPath(open, from, pt(roomServiceSpot(guest)))).not.toBeNull();
    for (const item of [...ROOM_SERVICE_MENU, ...VENDING_MENU]) {
      expect(item.price, item.id).toBeGreaterThan(0);
      expect(HOTEL_DISH_IDS.has(item.id)).toBe(true);
    }
    expect(VENDING_MENU.every((i) => i.course === 'drink' && i.contains.length === 0)).toBe(true);
    const s0 = createGameState(1000, createTime(20, 0));
    const sub = ROOM_SERVICE_MENU.find((i) => i.id === 'room-sub')!;
    const s1 = act(s0, { type: 'eat', price: sub.price, fullness: sub.fullness, lift: sub.lift });
    expect(s1.balance).toBe(1000 - sub.price);
    expect(s1.today.expenses).toBe(sub.price);
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

  it('has a guest\'s motorhome parked beside it: solid, clear of the hotel, and not in the way of its door', () => {
    const lagos = DISTRICTS[0];
    const [camper] = lagos.layout.campers ?? [];
    expect(camper).toBeDefined();
    const box = lagos.layout.obstacles.find((o) => o.position[0] === camper.x && o.position[2] === camper.z)!;
    expect(box.size[2]).toBeGreaterThan(7);
    const overlaps = lagos.layout.buildings.some((b) =>
      Math.abs(b.position[0] - camper.x) < (b.size[0] + box.size[0]) / 2 && Math.abs(b.position[2] - camper.z) < (b.size[2] + box.size[2]) / 2);
    expect(overlaps).toBe(false);
    const street = walkGridFor(lagos.layout.obstacles);
    const door = lagos.hotel!.door;
    expect(findPath(street, { x: lagos.spawn[0], z: lagos.spawn[2] }, { x: door[0], z: door[2] })).not.toBeNull();
  });
});
