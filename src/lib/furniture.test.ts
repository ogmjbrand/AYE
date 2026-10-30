import { describe, expect, it } from 'vitest';
import { CATALOGUE, DECOR_ROOMS, FURNITURE_CATEGORIES, USES, asFurniture, catalogueItem, dragSpot, findSpot, fits, footprint, homeComfort, layerOf, pieceOnRay, replaceAll, resaleValue, sanitiseFurniture, furnitureUse, walkable, type OwnedFurniture } from './furniture';
import { INTERIORS, bedSpot, doorSpot, interiorFor, interiorLayout } from './interiors';
import { createGameState, gameReducer, type GameState } from './gameState';
import { allHomes, homeById, moveInFee } from './homes';
import { PLAYER_RADIUS, resolveCollisions } from './world';

const act = (s: GameState, a: Parameters<typeof gameReducer>[1]) => gameReducer(s, a, 'engineer', 'ordinary');
const cheapest = allHomes().sort((a, b) => a.rentPerNight - b.rentPerNight)[0];
const priciest = allHomes().sort((a, b) => b.rentPerNight - a.rentPerNight)[0];
const housed = (homeId = cheapest.id, balance = 100_000) => act(createGameState(balance + moveInFee(homeById(homeId)!)), { type: 'moveIn', homeId });

describe('catalogue', () => {
  it('has unique ids, real prices and a category for everything', () => {
    expect(new Set(CATALOGUE.map((c) => c.id)).size).toBe(CATALOGUE.length);
    for (const c of CATALOGUE) {
      expect(c.price, c.id).toBeGreaterThan(0);
      expect(FURNITURE_CATEGORIES.some((k) => k.id === c.category), c.id).toBe(true);
      expect(c.size.every((v) => v > 0), c.id).toBe(true);
    }
    for (const k of FURNITURE_CATEGORIES) expect(CATALOGUE.some((c) => c.category === k.id), k.id).toBe(true);
  });

  it('better pieces do more when used', () => {
    expect(furnitureUse('tv', 1.4)!.gains.fun).toBeGreaterThan(furnitureUse('tv', 1)!.gains.fun!);
    // Costs and drawbacks aren't scaled
    expect(furnitureUse('console', 2)!.gains.energy).toBe(USES.console!.gains.energy);
    expect(furnitureUse('stove', 2)!.cost).toBe(USES.stove!.cost);
  });

  it('every home can wash, and you can reach everything a home comes with', () => {
    for (const room of Object.values(INTERIORS)) {
      expect(room.furniture.some((f) => f.kind === 'shower' || f.kind === 'bathtub'), room.tier).toBe(true);
      expect(walkable(room, []), room.tier).toBe(true);
    }
  });
});

describe('placing furniture', () => {
  const room = INTERIORS.flat;
  const sofa = catalogueItem('sofa-two')!;

  it('finds a free spot that keeps the doorway and the bed clear', () => {
    const spot = findSpot(room, [], sofa)!;
    expect(spot).not.toBeNull();
    expect(fits(room, [], sofa, spot.at, spot.rot)).toBe(true);
    // Not in the doorway
    expect(fits(room, [], sofa, [0, -room.depth / 2 + 0.6], 0)).toBe(false);
    // Not through a wall
    expect(fits(room, [], sofa, [room.width / 2, 0], 0)).toBe(false);
  });

  it('dragging picks up the piece under the pointer and only lets it go where it fits', () => {
    const rug = CATALOGUE.find((c) => c.kind === 'rug')!;
    const sofaSpot = findSpot(room, [], sofa)!;
    const owned: OwnedFurniture[] = [{ uid: 'f#1', itemId: sofa.id, at: sofaSpot.at, rot: sofaSpot.rot }];
    const rugSpot = findSpot(room, owned, rug)!;
    owned.push({ uid: 'f#2', itemId: rug.id, at: rugSpot.at, rot: rugSpot.rot });
    // Looking down at the sofa's top from above and in front: it's picked, not the floor behind it
    const [sx, sz] = sofaSpot.at;
    const eye = [sx, 3, sz - 3] as const;
    const aim = (x: number, y: number, z: number) => [x - eye[0], y - eye[1], z - eye[2]] as const;
    expect(pieceOnRay(owned, eye, aim(sx, sofa.size[1], sz))?.uid).toBe('f#1');
    expect(pieceOnRay(owned, eye, aim(sx + 50, 0, sz))).toBeNull();
    // A rug is picked on its own, but a piece standing on it comes first
    expect(pieceOnRay([owned[1]], [rugSpot.at[0], 3, rugSpot.at[1]], [0, -1, 0])?.uid).toBe('f#2');
    expect(pieceOnRay([owned[1], owned[0]], [sx, 3, sz], [0, -1, 0])?.uid).toBe('f#1');
    // Into the doorway: not allowed; dragged through a wall: kept inside it
    expect(dragSpot(room, owned, 'f#1', [0, -room.depth / 2 + 0.6]).ok).toBe(false);
    expect(dragSpot(room, owned, 'f#1', [room.width, sofaSpot.at[1]]).at[0]).toBeLessThan(room.width / 2);
    // Snapped to 5 cm, and ok exactly when fits() and walkable() agree
    const moved = dragSpot(room, owned, 'f#1', [sofaSpot.at[0] + 0.013, sofaSpot.at[1]]);
    expect(moved.at[0] * 20).toBeCloseTo(Math.round(moved.at[0] * 20), 6);
    expect(moved.ok).toBe(fits(room, owned, sofa, moved.at, sofaSpot.rot, 'f#1') && walkable(room, owned.map((o) => (o.uid === 'f#1' ? { ...o, at: moved.at } : o))));
    expect(dragSpot(room, owned, 'nope', [0, 0]).ok).toBe(false);
  });

  it('pieces never overlap, and a full room says so', () => {
    const owned: OwnedFurniture[] = [];
    let placed = 0;
    for (let i = 0; i < 40; i++) {
      const spot = findSpot(room, owned, sofa);
      if (!spot) break;
      owned.push({ uid: `f#${i + 1}`, itemId: sofa.id, at: spot.at, rot: spot.rot });
      placed++;
    }
    expect(placed).toBeGreaterThan(0);
    expect(placed).toBeLessThan(40);
    for (const o of owned) expect(fits(room, owned, sofa, o.at!, o.rot, o.uid)).toBe(true);
  });

  it('you can still walk from the door to the bed with the room full of furniture', () => {
    const owned: OwnedFurniture[] = [];
    for (const piece of CATALOGUE) {
      const spot = findSpot(room, owned, piece);
      if (spot) owned.push({ uid: `f#${owned.length + 1}`, itemId: piece.id, at: spot.at, rot: spot.rot });
    }
    const layout = interiorLayout(room, owned.map(asFurniture).filter((f) => !!f));
    const free = (x: number, z: number) => { const r = resolveCollisions(x, z, PLAYER_RADIUS, layout.obstacles); return Math.hypot(r.x - x, r.z - z) < 0.01; };
    const step = 0.25, goal = bedSpot(room), start = doorSpot(room);
    const key = (x: number, z: number) => `${Math.round(x / step)},${Math.round(z / step)}`;
    const seen = new Set([key(...start)]);
    const queue: [number, number][] = [[start[0], start[1]]];
    let reached = false;
    while (queue.length) {
      const [x, z] = queue.shift()!;
      if (Math.hypot(x - goal[0], z - goal[1]) < step) { reached = true; break; }
      for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        const nx = x + dx, nz = z + dz;
        if (seen.has(key(nx, nz)) || Math.abs(nx) > room.width / 2 || Math.abs(nz) > room.depth / 2 || !free(nx, nz)) continue;
        seen.add(key(nx, nz));
        queue.push([nx, nz]);
      }
    }
    expect(reached).toBe(true);
  });

  it('moving house takes what fits; what doesn\'t goes into storage', () => {
    const big = INTERIORS.penthouse, small = INTERIORS.room;
    const owned: OwnedFurniture[] = [];
    for (const piece of CATALOGUE) {
      const spot = findSpot(big, owned, piece);
      if (spot) owned.push({ uid: `f#${owned.length + 1}`, itemId: piece.id, at: spot.at, rot: spot.rot });
    }
    const moved = replaceAll(small, owned);
    expect(moved).toHaveLength(owned.length);
    expect(moved.some((o) => o.at === null)).toBe(true);
    expect(moved.some((o) => o.at !== null)).toBe(true);
  });

  it('saves are validated', () => {
    expect(sanitiseFurniture('nope')).toEqual([]);
    expect(sanitiseFurniture([{ uid: 'f#1', itemId: 'tv-43', at: [1, 2], rot: 1 }, { uid: 'f#1', itemId: 'tv-43', at: null }, { uid: 'f#2', itemId: 'gold-throne', at: null }, { uid: 'f#3', itemId: 'tv-43', at: ['x', 2] }]))
      .toEqual([{ uid: 'f#1', itemId: 'tv-43', at: [1, 2], rot: 1 }, { uid: 'f#3', itemId: 'tv-43', at: null, rot: 0 }]);
  });
});

describe('furniture in the game', () => {
  it('buying charges the price and delivers the piece into your home', () => {
    const s = housed();
    const tv = catalogueItem('tv-43')!;
    const after = act(s, { type: 'buyFurniture', itemId: tv.id });
    expect(after.balance).toBe(s.balance - tv.price);
    expect(after.today.expenses).toBe(s.today.expenses + tv.price);
    expect(after.furniture).toHaveLength(1);
    expect(after.furniture[0].at).not.toBeNull();
    expect(homeComfort(after.furniture)).toBe(tv.comfort);
  });

  it('can\'t buy what you can\'t afford; with no home it goes into storage', () => {
    const poor = createGameState(100);
    expect(act(poor, { type: 'buyFurniture', itemId: 'bathtub' })).toBe(poor);
    const homeless = act(createGameState(10_000), { type: 'buyFurniture', itemId: 'plant-snake' });
    expect(homeless.furniture[0].at).toBeNull();
  });

  it('selling pays back half; moving out stores everything', () => {
    const s = act(housed(), { type: 'buyFurniture', itemId: 'sofa-two' });
    const sold = act(s, { type: 'sellFurniture', uid: s.furniture[0].uid });
    expect(sold.balance).toBe(s.balance + resaleValue(catalogueItem('sofa-two')!));
    expect(sold.furniture).toHaveLength(0);
    const out = act(s, { type: 'moveOut' });
    expect(out.furniture.every((o) => o.at === null)).toBe(true);
  });

  it('placing checks the spot', () => {
    const s = act(housed(priciest.id), { type: 'buyFurniture', itemId: 'plant-snake' });
    const uid = s.furniture[0].uid;
    const room = interiorFor(priciest);
    expect(act(s, { type: 'placeFurniture', uid, at: [room.width, 0], rot: 0 })).toBe(s);
    const spot = findSpot(room, [], catalogueItem('plant-snake')!)!;
    const moved = act(act(s, { type: 'storeFurniture', uid }), { type: 'placeFurniture', uid, at: spot.at, rot: spot.rot });
    expect(moved.furniture[0].at).toEqual(spot.at);
  });

  it('a shower takes 15 minutes and gets you clean', () => {
    const s = { ...housed(), needs: { energy: 80, hygiene: 10, fun: 80, social: 80 } };
    const shower = interiorFor(cheapest).furniture.findIndex((f) => f.kind === 'shower');
    const after = act(s, { type: 'useFurniture', target: { builtin: shower }, near: true });
    expect(after.needs.hygiene).toBeGreaterThan(80);
    expect(after.time.totalMinutes - s.time.totalMinutes).toBe(15);
    // Not from across the room
    expect(act(s, { type: 'useFurniture', target: { builtin: shower }, near: false })).toBe(s);
  });

  it('cooking costs ingredients and fills you up; studying counts towards promotion', () => {
    const s = act({ ...housed(priciest.id), fullness: 20 }, { type: 'buyFurniture', itemId: 'desk-study' });
    const counter = interiorFor(priciest).furniture.findIndex((f) => f.kind === 'counter');
    const fed = act(s, { type: 'useFurniture', target: { builtin: counter }, near: true });
    expect(fed.balance).toBe(s.balance - USES.counter!.cost!);
    expect(fed.fullness).toBeGreaterThan(s.fullness + 30);
    const studied = act(s, { type: 'useFurniture', target: { uid: s.furniture[0].uid }, near: true });
    expect(studied.workMinutes).toBe(s.workMinutes + USES.desk!.xpMinutes!);
  });

  it('a stored piece can\'t be used', () => {
    const s = act(act(housed(), { type: 'buyFurniture', itemId: 'tv-43' }), { type: 'storeFurniture', uid: 'f#1' });
    expect(act(s, { type: 'useFurniture', target: { uid: 'f#1' }, near: true })).toBe(s);
  });
});

describe('Home Decor: the Luxe collection and rooms', () => {
  it('sells the reference pieces at their prices', () => {
    const price = (name: string) => CATALOGUE.find((c) => c.name === name)?.price;
    expect(price('Modern Sofa')).toBe(15000);
    expect(price('Coffee Table')).toBe(6800);
    expect(price('Accent Chair')).toBe(7200);
    expect(price('TV Console')).toBe(9500);
    expect(price('Book Shelf')).toBe(8000);
    expect(price('Floor Lamp')).toBe(3500);
    expect(price('Rug')).toBe(4200);
    expect(price('Indoor Plant')).toBe(2800);
    expect(price('Wall Art')).toBe(3200);
  });

  it('lists something under every room', () => {
    for (const r of DECOR_ROOMS) if (r.id !== 'all') expect(CATALOGUE.some((c) => c.room === r.id), r.id).toBe(true);
  });

  it('hangs wall art on a wall, where it never gets in the way', () => {
    const art = CATALOGUE.find((c) => c.kind === 'art')!;
    const room = INTERIORS.flat;
    const spot = findSpot(room, [], art)!;
    expect(spot).not.toBeNull();
    const [w, d] = footprint(art, spot.rot);
    const hw = room.width / 2, hd = room.depth / 2;
    const touches = spot.at[1] + d / 2 >= hd - 0.15 || spot.at[1] - d / 2 <= -hd + 0.15 || spot.at[0] - w / 2 <= -hw + 0.15 || spot.at[0] + w / 2 >= hw - 0.15;
    expect(touches).toBe(true);
    // Not in the middle of the floor
    expect(fits(room, [], art, [0, 0], 0)).toBe(false);
    expect(layerOf('art')).toBe('wall');
  });

  it('the penthouse, furnished in Luxe with a dining table, can still be walked round', () => {
    expect(walkable(INTERIORS.penthouse, [])).toBe(true);
    expect(INTERIORS.penthouse.furniture.some((f) => f.kind === 'table' && f.style === 'luxe' && f.size[0] * f.size[2] > 2)).toBe(true);
  });
});
