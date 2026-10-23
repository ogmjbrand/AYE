import { describe, expect, it } from 'vitest';
import {
  BAR_SPOT, CANTINA_MENU, DOOR_SPOT, FREE_SEATS, REGULARS, STOOLS, TABLES, WAITER_ROUTE, cantinaLayout, isOpen, seatById,
} from './cantina';
import { findPath, walkGridFor } from './pathfinding';
import { standSpot } from './seating';
import { DISTRICTS, barAt, restaurantAt } from './geography';
import { DIETS, suitsDiet } from './food';

const layout = cantinaLayout();
const grid = walkGridFor(layout.obstacles);
const inside = (x: number, z: number) => layout.obstacles.some((o) => Math.abs(x - o.position[0]) < o.size[0] / 2 && Math.abs(z - o.position[2]) < o.size[2] / 2);

describe('Cantina Ayé', () => {
  it('has small plates, mains, alcohol-free drinks and something sweet, with unique ids', () => {
    expect(new Set(CANTINA_MENU.map((i) => i.id)).size).toBe(CANTINA_MENU.length);
    for (const c of ['starter', 'main', 'drink', 'dessert'] as const) expect(CANTINA_MENU.filter((i) => i.course === c).length).toBeGreaterThanOrEqual(2);
    for (const i of CANTINA_MENU) {
      expect(i.price).toBeGreaterThan(0);
      expect(i.minutes).toBeGreaterThan(0);
    }
    expect(CANTINA_MENU.filter((i) => i.course === 'drink').every((i) => !/beer|tequila|wine|rum/i.test(i.name))).toBe(true);
  });

  it('has something to eat and drink for every diet', () => {
    for (const { id: diet } of DIETS) {
      expect(CANTINA_MENU.some((i) => i.course !== 'drink' && suitsDiet(i, diet)), diet).toBe(true);
      expect(CANTINA_MENU.some((i) => i.course === 'drink' && suitsDiet(i, diet)), diet).toBe(true);
    }
  });

  it('opens at noon and stays open until 02:00', () => {
    expect(isOpen(11)).toBe(false);
    expect(isOpen(12)).toBe(true);
    expect(isOpen(23)).toBe(true);
    expect(isOpen(1)).toBe(true);
    expect(isOpen(2)).toBe(false);
  });

  it('every free chair and stool, and the bar, can be reached from the door', () => {
    const from = { x: DOOR_SPOT[0], z: DOOR_SPOT[1] };
    expect(findPath(grid, from, { x: BAR_SPOT[0], z: BAR_SPOT[1] })).not.toBeNull();
    expect(FREE_SEATS.length).toBeGreaterThanOrEqual(15);
    expect(FREE_SEATS.filter((s) => STOOLS.includes(s)).length).toBeGreaterThanOrEqual(3);
    for (const s of FREE_SEATS) {
      const at = standSpot(s);
      expect(inside(at.x, at.z), s.id).toBe(false);
      expect(findPath(grid, from, at), s.id).not.toBeNull();
    }
  });

  it('regulars sit on real seats, one each, and the waiter walks clear of everything', () => {
    expect(new Set(REGULARS.map((r) => r.seatId)).size).toBe(REGULARS.length);
    for (const r of REGULARS) expect(seatById(r.seatId), r.seatId).toBeDefined();
    for (const [x, z] of WAITER_ROUTE) expect(inside(x, z), `${x},${z}`).toBe(false);
    // No two tables overlap
    for (const a of TABLES) for (const b of TABLES) if (a !== b) expect(Math.hypot(a.x - b.x, a.z - b.z), `${a.id}/${b.id}`).toBeGreaterThan(2.2);
  });

  it('is in Ayemara only, next to The Palms, with a door you can walk to from the street', () => {
    const lagos = DISTRICTS[0];
    expect(lagos.bar?.name).toBe('Cantina Ayé');
    const door = lagos.bar!.door;
    expect(barAt(lagos, door[0], door[2])?.id).toBe('cantina-aye');
    expect(restaurantAt(lagos, door[0], door[2])).toBeUndefined();
    const street = walkGridFor(lagos.layout.obstacles);
    expect(findPath(street, { x: lagos.spawn[0], z: lagos.spawn[2] }, { x: door[0], z: door[2] })).not.toBeNull();
    expect(lagos.places.some((p) => p.name === 'Cantina Ayé' && p.kind === 'food')).toBe(true);
    expect(DISTRICTS.slice(1).every((d) => !d.bar)).toBe(true);
  });
});
