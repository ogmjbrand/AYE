import { describe, expect, it } from 'vitest';
import { STARTER_HOME_ID, forSale, homeById, homesForSale, moveInFee } from './homes';
import { interiorFor, interiorLayout, doorSpot, bedSpot } from './interiors';
import { findPath, walkGridFor } from './pathfinding';
import { createGameState, createTime, gameReducer, type GameState } from './gameState';
import { DISTRICTS, agencyAt } from './geography';

const act = (s: GameState, a: Parameters<typeof gameReducer>[1]) => gameReducer(s, a, 'engineer', 'ordinary');
const pt = (p: readonly [number, number]) => ({ x: p[0], z: p[1] });

describe('OGM Homes and the starter flat', () => {
  it('every creator starts in a one-room flat to rent', () => {
    const starter = homeById(STARTER_HOME_ID)!;
    expect(forSale(starter)).toBe(false);
    expect(interiorFor(starter).tier).toBe('room');
  });

  it('sells a starter home, a middle class house and a luxury villa, each bigger than the last', () => {
    const sale = homesForSale();
    expect(sale.map((h) => h.band)).toEqual(['lower', 'middle', 'luxury']);
    const areas = sale.map((h) => { const i = interiorFor(h); return i.width * i.depth; });
    for (let k = 1; k < areas.length; k++) expect(areas[k]).toBeGreaterThan(areas[k - 1]);
    // Only Ayemara sells homes, through the agency on the cross street
    expect(sale.every((h) => h.district === 'lagos.marina')).toBe(true);
    const lagos = DISTRICTS[0];
    expect(agencyAt(lagos, lagos.agency!.door[0], lagos.agency!.door[2])?.name).toBe('OGM Homes');
    expect(DISTRICTS.slice(1).every((d) => !d.agency && d.homes.every((h) => !forSale(h)))).toBe(true);
  });

  it('buying pays the price once, moves you in, and the home is yours with no rent', () => {
    const house = homesForSale()[0];
    const s0 = createGameState(house.price! + 500, createTime(20, 0));
    // A home for sale can't be rented
    expect(act(s0, { type: 'moveIn', homeId: house.id })).toBe(s0);
    const s1 = act(s0, { type: 'buyHome', homeId: house.id });
    expect(s1.balance).toBe(500);
    expect(s1.home).toBe(house.id);
    expect(s1.owned).toEqual([house.id]);
    expect(act(s1, { type: 'buyHome', homeId: house.id })).toBe(s1);
    // No rent: a night at home costs the same as a night with no home to pay for
    const slept = act(s1, { type: 'sleep', atHome: true });
    const homeless = act({ ...s1, home: null, owned: [] }, { type: 'sleep', atHome: false });
    expect(slept.home).toBe(house.id);
    expect(slept.balance).toBe(homeless.balance);
    // Move to a rented flat and back again for free
    const rented = act({ ...s1, balance: 10_000 }, { type: 'moveIn', homeId: STARTER_HOME_ID });
    expect(rented.balance).toBe(10_000 - moveInFee(homeById(STARTER_HOME_ID)!));
    const back = act(rented, { type: 'moveIn', homeId: house.id });
    expect(back.home).toBe(house.id);
    expect(back.balance).toBe(rented.balance);
  });

  it("can't buy what you can't afford", () => {
    const villa = homesForSale().at(-1)!;
    const s = createGameState(villa.price! - 1, createTime(20, 0));
    expect(act(s, { type: 'buyHome', homeId: villa.id })).toBe(s);
  });

  it("every home for sale, and the agency's door, can be walked to from the street", () => {
    const lagos = DISTRICTS[0];
    const grid = walkGridFor(lagos.layout.obstacles);
    const from = { x: lagos.spawn[0], z: lagos.spawn[2] };
    for (const p of [...homesForSale().map((h) => h.door), lagos.agency!.door]) expect(findPath(grid, from, { x: p[0], z: p[2] }), String(p)).not.toBeNull();
  });

  it('you can walk from the door to the bed in every home for sale', () => {
    for (const h of homesForSale()) {
      const i = interiorFor(h);
      const grid = walkGridFor(interiorLayout(i).obstacles);
      expect(findPath(grid, pt(doorSpot(i)), pt(bedSpot(i))), h.id).not.toBeNull();
    }
  });
});
