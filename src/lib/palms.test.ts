import { describe, expect, it } from 'vitest';
import {
  DINERS, DOOR_SPOT, FREE_SEATS, HOST_SPOT, PALMS_MENU, TABLES, WAITER_ROUTE, hostSeat, isOpen, menuFor, orderProblem, restaurantLayout, suitsYou,
} from './palms';
import { findPath, walkGridFor } from './pathfinding';
import { standSpot } from './seating';
import { DISTRICTS, restaurantAt } from './geography';
import { createGameState, createTime, gameReducer } from './gameState';

const layout = restaurantLayout();
const grid = walkGridFor(layout.obstacles);
const inside = (x: number, z: number) => layout.obstacles.some((o) => Math.abs(x - o.position[0]) < o.size[0] / 2 && Math.abs(z - o.position[2]) < o.size[2] / 2);

describe('The Palms', () => {
  it('serves the menu from the reference at its prices, in every course', () => {
    const price = (name: string) => PALMS_MENU.find((i) => i.name === name)?.price;
    expect(price('Grilled Salmon')).toBe(480);
    expect(price('Jollof Rice & Chicken')).toBe(350);
    expect(price('Steak & Mash')).toBe(520);
    expect(price('Seafood Pasta')).toBe(460);
    expect(price('Grilled Prawns')).toBe(500);
    expect(price('Vegetable Bowl')).toBe(320);
    for (const c of ['starter', 'main', 'drink', 'dessert'] as const) expect(menuFor(c).length).toBeGreaterThanOrEqual(4);
    expect(menuFor('all').length).toBe(PALMS_MENU.length);
    expect(new Set(PALMS_MENU.map((i) => i.id)).size).toBe(PALMS_MENU.length);
    for (const i of PALMS_MENU) {
      expect(i.price, i.id).toBeGreaterThan(0);
      expect(i.fullness, i.id).toBeGreaterThan(0);
    }
  });

  it('respects diets, and you order sitting down with enough GHAI', () => {
    const salmon = PALMS_MENU.find((i) => i.id === 'grilled-salmon')!;
    const bowl = PALMS_MENU.find((i) => i.id === 'vegetable-bowl')!;
    expect(suitsYou(salmon, 'vegetarian')).toBe(false);
    expect(suitsYou(bowl, 'vegan')).toBe(true);
    expect(orderProblem(salmon, 'vegetarian', 1000, true)).toBe('Not for your diet');
    expect(orderProblem(salmon, 'everything', 1000, false)).toBe('Sit at a table to order');
    expect(orderProblem(salmon, 'everything', 100, true)).toBe('Not enough GHAI');
    expect(orderProblem(salmon, 'everything', 480, true)).toBeNull();
    // Every diet can have something from every course
    for (const diet of ['everything', 'pescatarian', 'vegetarian', 'vegan'] as const) {
      for (const c of ['starter', 'main', 'drink', 'dessert'] as const) expect(menuFor(c).some((i) => suitsYou(i, diet)), `${diet} ${c}`).toBe(true);
    }
  });

  it('is open from 11:00 to 23:00', () => {
    expect(isOpen(10)).toBe(false);
    expect(isOpen(11)).toBe(true);
    expect(isOpen(22)).toBe(true);
    expect(isOpen(23)).toBe(false);
  });

  it('every free chair, the host desk and the way out can be reached from the door', () => {
    const from = { x: DOOR_SPOT[0], z: DOOR_SPOT[1] };
    expect(findPath(grid, from, { x: HOST_SPOT[0], z: HOST_SPOT[1] })).not.toBeNull();
    expect(FREE_SEATS.length).toBeGreaterThanOrEqual(6);
    for (const s of FREE_SEATS) {
      const at = standSpot(s);
      expect(inside(at.x, at.z), s.id).toBe(false);
      expect(findPath(grid, from, at), s.id).not.toBeNull();
    }
    expect(FREE_SEATS.some((s) => s.id === hostSeat().id)).toBe(true);
  });

  it('diners sit at real chairs, and the waiter walks between the tables without going through anything', () => {
    for (const d of DINERS) expect(TABLES.find((t) => t.id === d.tableId)?.seats[d.seat]).toBeDefined();
    for (const [x, z] of WAITER_ROUTE) expect(inside(x, z), `${x},${z}`).toBe(false);
  });

  it('has a street door in Lagos you can walk to, and eating there pays like any meal out', () => {
    const lagos = DISTRICTS[0];
    expect(lagos.restaurant?.name).toBe('The Palms Restaurant');
    const door = lagos.restaurant!.door;
    expect(restaurantAt(lagos, door[0], door[2])?.id).toBe('the-palms');
    const street = walkGridFor(lagos.layout.obstacles);
    expect(findPath(street, { x: lagos.spawn[0], z: lagos.spawn[2] }, { x: door[0], z: door[2] })).not.toBeNull();

    const s0 = { ...createGameState(1000, createTime(19, 0)), fullness: 30 };
    const salmon = PALMS_MENU.find((i) => i.id === 'grilled-salmon')!;
    const s1 = gameReducer(s0, { type: 'eat', price: salmon.price, fullness: salmon.fullness, lift: salmon.lift }, 'engineer', 'ordinary');
    expect(s1.balance).toBe(520);
    expect(s1.fullness).toBe(90);
    expect(s1.needs.fun).toBeGreaterThan(s0.needs.fun - 0.001);
  });
});
