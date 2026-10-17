import { describe, expect, it } from 'vitest';
import { createGameState, createTime, gameReducer, type GameState } from './gameState';
import { FRIENDSHIP_LEVELS, HANGOUT_LEVEL } from './people';
import { DISTRICTS, districtById } from './geography';
import { NIGHT_OUT_MINUTES, NIGHT_OUT_POINTS, canStartNightOut, isOpen, nightOutCost, venueAt } from './nightlife';
import { findPath, walkGridFor } from './pathfinding';
import { counterAt } from './geography';
import { nearestVendor } from './food';
import { homeAtDoor } from './homes';

const lagos = districtById('lagos.marina');
const friendPoints = FRIENDSHIP_LEVELS[HANGOUT_LEVEL].points;
const at = (hour: number, state: Partial<GameState> = {}): GameState => ({
  ...createGameState(5000, createTime(hour, 0, 2)),
  relationships: { tunde: { points: friendPoints, lastDay: -1 } },
  ...state,
});
const nightOut = (s: GameState, residentId = 'tunde') => gameReducer(s, { type: 'nightOut', residentId }, 'none', 'student');

describe('nightlife hours', () => {
  it('opens at 20:00, closes at 03:00, last night out starts before 01:00', () => {
    expect([19, 20, 23, 0, 2, 3, 12].map((hour) => isOpen({ hour }))).toEqual([false, true, true, true, true, false, false]);
    expect([20, 0, 1, 2].map((hour) => canStartNightOut({ hour }))).toEqual([true, true, false, false]);
  });
});

describe('a night out', () => {
  it('with a friend: pays both covers, takes two hours, grows the friendship', () => {
    const s = at(21);
    const after = nightOut(s);
    const cost = nightOutCost(lagos.nightlife);
    // Both covers, plus the usual living costs for the two hours
    expect(after.today.expenses - s.today.expenses).toBeGreaterThanOrEqual(cost);
    expect(after.today.expenses - s.today.expenses).toBeLessThan(cost + 100);
    expect(after.time.totalMinutes - s.time.totalMinutes).toBe(NIGHT_OUT_MINUTES);
    expect(after.relationships.tunde.points).toBe(friendPoints + NIGHT_OUT_POINTS);
    expect(after.balance).toBeLessThanOrEqual(s.balance - cost);
  });

  it('is refused when closed, with a stranger, twice in a day, without the money, or in another city', () => {
    expect(nightOut(at(15))).toEqual(at(15));
    const stranger = at(21, { relationships: { tunde: { points: 5, lastDay: -1 } } });
    expect(nightOut(stranger)).toEqual(stranger);
    const once = nightOut(at(21));
    expect(nightOut(once)).toEqual(once);
    const broke = at(21, { balance: nightOutCost(lagos.nightlife) - 1 });
    expect(nightOut(broke)).toEqual(broke);
    const elsewhere = at(21, { districtId: 'accra.osu' });
    expect(nightOut(elsewhere)).toEqual(elsewhere);
  });
});

describe('the lounges in the world', () => {
  it('every district has one you can walk to, and arriving puts you at its door, not another counter', () => {
    for (const d of DISTRICTS) {
      const v = d.nightlife;
      const path = findPath(walkGridFor(d.layout.obstacles), { x: d.spawn[0], z: d.spawn[2] }, { x: v.position[0], z: v.position[2] });
      expect(path, d.id).not.toBeNull();
      const end = path![path!.length - 1];
      expect(venueAt(v, end.x, end.z)?.id, d.id).toBe(v.id);
      // E at the door should open the lounge, not a shop, a vendor or a home that wins first
      expect(counterAt(d, end.x, end.z), d.id).toBeNull();
      expect(nearestVendor(d.vendors, end.x, end.z), d.id).toBeNull();
      expect(homeAtDoor(d.id, end.x, end.z), d.id).toBeUndefined();
      expect(d.layout.buildings.some((b) => b.name === v.name), `${d.id} building`).toBe(true);
    }
  });
});
