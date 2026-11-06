import { describe, expect, it } from 'vitest';
import type { Career } from '../components/CharacterCreation';
import { createGameState, createTime, type GameState } from './gameState';
import { ACHIEVEMENTS, lifeReducer, type AnyAction } from './life';
import { DISTRICTS, districtById } from './geography';
import { seeded } from './world';
import {
  ABANDON_PENALTY,
  EVENT_TEMPLATES,
  SCENE_RADIUS,
  canDo,
  directWorld,
  emptyLiveWorld,
  nextGap,
  objectiveSpot,
  SPOT_RADIUS,
  sanitiseLiveWorld,
  siteClear,
  siteFor,
  templateFor,
  type ActiveEvent,
  type EventKind,
  type LiveWorld,
} from './liveEvents';
import { addReputation, emptyReputation, sanitiseReputation, tierOf } from './reputation';
import { loadProgress, saveProgress } from './save';

const act = (s: GameState, a: AnyAction, career: Career = 'doctor') => lifeReducer(s, a, career, 'ordinary');
const tick = (s: GameState, n = 1, career: Career = 'doctor') => { for (let i = 0; i < n; i++) s = act(s, { type: 'tick', atWorkplace: false }, career); return s; };

/** A game in Lagos with this event happening now, a phone in your pocket. */
function withEvent(kind: EventKind, hour = 10, phone = true): { s: GameState; e: ActiveEvent } {
  const base = createGameState(5000, createTime(hour, 0));
  const district = districtById(base.districtId);
  const site = siteFor(kind, district, seeded(7))!;
  const now = base.time.totalMinutes;
  const e: ActiveEvent = {
    id: `${kind}@${now}`, kind, districtId: base.districtId, startedAt: now, endsAt: now + templateFor(kind).minutes,
    scene: site.scene, ...(site.target ? { target: site.target } : {}), responding: false, dismissed: false, done: [], earned: 0, rep: {},
  };
  const s: GameState = { ...base, equipment: phone ? ['smartphone'] : [], world: { ...emptyLiveWorld(), active: e, nextAt: e.endsAt + 600 } };
  return { s, e };
}
const at = (p: { x: number; z: number }) => ({ x: p.x + 0.5, z: p.z });
/** Where an objective is done: its own spot (beside the driver, at the car), or anywhere at the scene. */
const spotOf = (e: ActiveEvent, id: string) => objectiveSpot(e, id)?.at ?? at(e.scene);

describe('where events happen', () => {
  it('every district has a clear place for every kind of event (the restaurant rush only where there is a restaurant)', () => {
    for (const d of DISTRICTS) {
      for (const t of EVENT_TEMPLATES) {
        const site = siteFor(t.kind, d, seeded(1));
        if (t.kind === 'lunch-rush' && !d.restaurant) { expect(site).toBeNull(); continue; }
        expect(site, `${t.kind} in ${d.id}`).not.toBeNull();
        if (t.kind !== 'lunch-rush' && t.kind !== 'missing-person') expect(siteClear(d.layout, site!.scene.x, site!.scene.z, 1)).toBe(true);
        if (site!.target) expect(siteClear(d.layout, site!.target.x, site!.target.z, 1)).toBe(true);
      }
    }
  });

  it('puts crashes and breakdowns on the cross street, away from the boulevard traffic', () => {
    for (const d of DISTRICTS) {
      const { roadHalfWidth: R, pavementWidth: P, crossStreet: C } = d.layout;
      for (const kind of ['road-accident', 'breakdown'] as const) {
        const { scene } = siteFor(kind, d, seeded(3))!;
        expect(Math.abs(scene.x)).toBeGreaterThan(R + P);
        expect(scene.z).toBeGreaterThan(C.minZ);
        expect(scene.z).toBeLessThan(C.maxZ);
      }
    }
  });

  it('hides a missing person 15 to 40 m from where his daughter waits', () => {
    for (const d of DISTRICTS) {
      const { scene, target } = siteFor('missing-person', d, seeded(5))!;
      const dist = Math.hypot(target!.x - scene.x, target!.z - scene.z);
      expect(dist).toBeGreaterThanOrEqual(15);
      expect(dist).toBeLessThanOrEqual(40);
    }
  });
});

describe('the director', () => {
  it('never starts anything when events are off', () => {
    let w: LiveWorld = { ...emptyLiveWorld(), frequency: 'off' };
    for (let m = 600; m < 600 + 3 * 1440; m++) w = directWorld(w, 'lagos.marina', m, 'doctor');
    expect(w.active).toBeNull();
    expect(w.history).toHaveLength(0);
  });

  it('runs one event at a time, each for its own length, with a rest in between', () => {
    let w = emptyLiveWorld();
    const seen: { kind: EventKind; start: number }[] = [];
    let busyMinutes = 0;
    for (let m = 7 * 60; m < 7 * 60 + 3 * 1440; m++) {
      const before = w.active;
      w = directWorld(w, 'lagos.marina', m, 'doctor');
      if (w.active && w.active !== before && w.active.startedAt === m) seen.push({ kind: w.active.kind, start: m });
      if (w.active) busyMinutes++;
    }
    expect(seen.length).toBeGreaterThanOrEqual(5);
    // Never the same kind twice in a row, and always in that kind's hours
    for (let i = 1; i < seen.length; i++) expect(seen[i].kind).not.toBe(seen[i - 1].kind);
    for (const e of seen) {
      const hour = Math.floor(e.start / 60) % 24;
      expect(templateFor(e.kind).hours.some(([from, to]) => hour >= from && hour < to)).toBe(true);
    }
    // Quiet most of the time, so peaceful play stays the norm
    expect(busyMinutes / (3 * 1440)).toBeLessThan(0.35);
  });

  it('spaces events out by the chosen frequency', () => {
    expect(nextGap('calm', 'x')).toBeGreaterThan(nextGap('lively', 'x'));
    expect(nextGap('normal', 'x')).toBeGreaterThanOrEqual(4 * 60);
    expect(nextGap('off', 'x')).toBe(Infinity);
  });

  it('happens in the game: a tick starts the first event within two hours on normal', () => {
    let s = createGameState(5000, createTime(9, 0));
    for (let i = 0; i < 3 * 60 && !s.world.active; i++) s = tick(s);
    expect(s.world.active).not.toBeNull();
    expect(s.world.active!.districtId).toBe('lagos.marina');
  });
});

describe('helping', () => {
  it('pays only for what you do, at the scene, once', () => {
    const { s, e } = withEvent('collapse');
    // From across the street: nothing
    const far = act(s, { type: 'eventAct', objectiveId: 'report', at: { x: e.scene.x + SCENE_RADIUS + 3, z: e.scene.z } });
    expect(far.world.active!.done).toEqual([]);
    expect(far.balance).toBe(s.balance);
    expect(far.time.totalMinutes).toBe(s.time.totalMinutes);
    const done = act(s, { type: 'eventAct', objectiveId: 'report', at: at(e.scene) });
    expect(done.balance).toBeGreaterThan(s.balance);
    expect(done.world.active!.done).toEqual(['report']);
    expect(done.world.active!.earned).toBe(15);
    expect(done.time.totalMinutes - s.time.totalMinutes).toBe(2);
    expect(done.world.reputation.community).toBe(3);
    expect(done.life.ledger.some((l) => l.label === 'Helped: someone has collapsed' && l.amount === 15)).toBe(true);
    // Not twice
    const again = act(done, { type: 'eventAct', objectiveId: 'report', at: at(e.scene) });
    expect(again.world.active!.earned).toBe(15);
  });

  it('gives nothing for standing nearby while others deal with it', () => {
    const { s, e } = withEvent('road-accident');
    const end = tick(s, templateFor('road-accident').minutes + 1);
    expect(end.world.active?.id).not.toBe(e.id);
    const past = end.world.history.find((p) => p.id === e.id)!;
    expect(past.outcome).toBe('missed');
    expect(past.earned).toBe(0);
    expect(end.world.lastResult).toBeNull();
  });

  it('keeps skilled work for the careers that have the skill', () => {
    const { s, e } = withEvent('road-accident');
    expect(canDo(e, 'first-aid', 'artist', s.equipment, s.time.totalMinutes)).toEqual({ ok: false, reason: 'Needs a doctor.' });
    expect(canDo(e, 'make-safe', 'doctor', s.equipment, s.time.totalMinutes).ok).toBe(false);
    expect(canDo(e, 'make-safe', 'engineer', s.equipment, s.time.totalMinutes).ok).toBe(true);
    // An artist's first aid is refused by the rules, not just hidden
    const artist = act(s, { type: 'eventAct', objectiveId: 'first-aid', at: at(e.scene) }, 'artist');
    expect(artist.world.active!.done).toEqual([]);
    expect(artist.balance).toBe(s.balance);
  });

  it('needs a phone to call it in, and the steps in order', () => {
    const { s, e } = withEvent('road-accident', 10, false);
    expect(canDo(e, 'report', 'doctor', s.equipment, s.time.totalMinutes)).toEqual({ ok: false, reason: 'Needs a phone.' });
    expect(canDo(e, 'handover', 'doctor', s.equipment, s.time.totalMinutes).ok).toBe(false);
    expect(canDo(e, 'warn-traffic', 'doctor', s.equipment, s.time.totalMinutes).ok).toBe(false);
  });

  it('finds a missing person only where he is, then walks him home', () => {
    const { s, e } = withEvent('missing-person');
    let w = act(s, { type: 'eventAct', objectiveId: 'listen', at: at(e.scene) }, 'artist');
    expect(w.world.active!.done).toEqual(['listen']);
    expect(act(w, { type: 'eventAct', objectiveId: 'find', at: at(e.scene) }, 'artist').world.active!.done).toEqual(['listen']);
    w = act(w, { type: 'eventAct', objectiveId: 'find', at: { x: e.target!.x + 1, z: e.target!.z } }, 'artist');
    w = act(w, { type: 'eventAct', objectiveId: 'home', at: at(e.scene) }, 'artist');
    expect(w.world.active!.done).toEqual(['listen', 'find', 'home']);
    expect(w.world.active!.earned).toBe(80);
    expect(w.world.reputation.community).toBe(13);
  });

  it('costs a little professional standing to start first aid and walk away', () => {
    const { s, e } = withEvent('road-accident');
    const started = act({ ...s, world: { ...s.world, reputation: addReputation(emptyReputation(), { professional: 50 }) } }, { type: 'eventAct', objectiveId: 'first-aid', at: spotOf(e, 'first-aid') });
    expect(started.world.reputation.professional).toBe(62);
    const end = tick(started, templateFor('road-accident').minutes);
    const past = end.world.history.find((p) => p.id === e.id)!;
    expect(past.abandoned).toBe(true);
    expect(end.world.reputation.professional).toBe(62 - ABANDON_PENALTY);
    // Finishing the job doesn't
    const handed = act(started, { type: 'eventAct', objectiveId: 'handover', at: spotOf(e, 'handover') });
    const fine = tick(handed, templateFor('road-accident').minutes);
    expect(fine.world.history.find((p) => p.id === e.id)!.abandoned).toBe(false);
    expect(fine.world.lastResult?.outcome).toBe('helped');
  });

  it('can be dismissed, responded to, and turned off', () => {
    const { s } = withEvent('breakdown');
    expect(act(s, { type: 'eventRespond' }).world.active!.responding).toBe(true);
    expect(act(s, { type: 'eventDismiss' }).world.active!.dismissed).toBe(true);
    const off = act(s, { type: 'setEventFrequency', frequency: 'off' });
    expect(off.world.active).toBeNull();
    expect(tick(off, 2 * 1440).world.active).toBeNull();
  });

  it('counts towards achievements', () => {
    const { s, e } = withEvent('collapse');
    const helped = act(s, { type: 'eventAct', objectiveId: 'report', at: at(e.scene) });
    expect(helped.life.achievements.some((x) => x.id === 'first-responder')).toBe(true);
    expect(ACHIEVEMENTS.some((x) => x.id === 'helped-10')).toBe(true);
  });
});

describe('reputation', () => {
  it('stays between 0 and 1000 and names its tiers', () => {
    expect(addReputation(emptyReputation(), { community: -5 }).community).toBe(0);
    expect(addReputation(emptyReputation(), { community: 5000 }).community).toBe(1000);
    expect(tierOf(0).name).toBe('Unknown');
    expect(tierOf(100).name).toBe('Respected');
    expect(tierOf(100).next).toBe(300);
    expect(sanitiseReputation({ community: 'lots', fashion: 12.4 })).toEqual({ ...emptyReputation(), fashion: 12 });
  });
});

describe('saves', () => {
  it('keeps the world and reputation, and recomputes what an edited save claims', () => {
    const { s, e } = withEvent('collapse');
    const helped = act(s, { type: 'eventAct', objectiveId: 'report', at: at(e.scene) });
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k), clear: () => store.clear(), key: () => null, length: 0 } as Storage;
    const character = { id: 'c1', career: 'doctor', lifestyle: 'ordinary' } as Parameters<typeof loadProgress>[0];
    saveProgress('c1', helped, storage);
    const back = loadProgress(character, storage);
    expect(back.world.active!.done).toEqual(['report']);
    expect(back.world.reputation.community).toBe(3);
    // A tampered save can't claim more than the objectives done are worth
    const raw = JSON.parse(store.get('aye_progress')!);
    raw.world.active.earned = 1_000_000;
    raw.world.active.done.push('not-an-objective');
    expect(sanitiseLiveWorld(raw.world).active!.earned).toBe(15);
    expect(sanitiseLiveWorld({ active: { kind: 'alien-invasion' } }).active).toBeNull();
    expect(sanitiseLiveWorld(undefined).frequency).toBe('normal');
  });
});

describe('road accident response: doing your part where it is done', () => {
  it('puts every objective spot within reach of the scene and clear of the crashed cars and the street, wherever the crash happens', () => {
    const district = districtById('lagos.marina');
    for (let seed = 1; seed <= 40; seed++) {
      const site = siteFor('road-accident', district, seeded(seed));
      if (!site) continue;
      const e = { kind: 'road-accident' as const, scene: site.scene };
      for (const o of templateFor('road-accident').objectives) {
        const spot = objectiveSpot(e, o.id);
        if (!spot) continue;
        expect(Math.hypot(spot.at.x - site.scene.x, spot.at.z - site.scene.z), o.id).toBeLessThanOrEqual(SCENE_RADIUS);
        expect(siteClear(district.layout, spot.at.x, spot.at.z, 0.3), `${o.id} @ seed ${seed}`).toBe(true);
      }
    }
  });

  it('only counts first aid done beside the driver, not from across the scene', () => {
    const { s, e } = withEvent('road-accident');
    const spot = objectiveSpot(e, 'first-aid')!;
    const far = { x: spot.at.x + SPOT_RADIUS + 2, z: spot.at.z };
    expect(Math.hypot(far.x - e.scene.x, far.z - e.scene.z)).toBeLessThan(SCENE_RADIUS);
    expect(act(s, { type: 'eventAct', objectiveId: 'first-aid', at: far }).world.active!.done).toEqual([]);
    const done = act(s, { type: 'eventAct', objectiveId: 'first-aid', at: spot.at });
    expect(done.world.active!.done).toContain('first-aid');
    expect(done.balance).toBeGreaterThan(s.balance - 50);
  });

  it('runs the whole response once: accept, act at each spot, hand over, paid once, saved, back to normal life', () => {
    const { s, e } = withEvent('road-accident');
    let g = act(s, { type: 'eventRespond' });
    expect(g.world.active!.responding).toBe(true);
    // Nothing done yet: you can't hand over and leave
    expect(act(g, { type: 'eventFinish' }).world.active).not.toBeNull();
    const income0 = g.today.income;
    for (const id of ['report', 'first-aid', 'handover', 'comfort', 'warn-traffic']) g = act(g, { type: 'eventAct', objectiveId: id, at: spotOf(e, id) });
    const t = templateFor('road-accident');
    const paid = t.objectives.filter((o) => g.world.active!.done.includes(o.id)).reduce((n, o) => n + o.reward, 0);
    expect(g.world.active!.done).toEqual(['report', 'first-aid', 'handover', 'comfort', 'warn-traffic']);
    expect(g.world.active!.earned).toBe(paid);
    // Paid as income (achievements for helping can add their own bonus on top)
    expect(g.today.income - income0).toBeGreaterThanOrEqual(paid);
    // Doing one twice pays nothing more
    expect(act(g, { type: 'eventAct', objectiveId: 'comfort', at: spotOf(e, 'comfort') }).world.active!.earned).toBe(paid);
    // A doctor has nothing left (making the cars safe is an engineer's job): hand over
    const over = act(g, { type: 'eventFinish' });
    expect(over.world.active).toBeNull();
    expect(over.world.lastResult).toMatchObject({ id: e.id, outcome: 'helped', earned: paid, abandoned: false });
    expect(over.world.history.at(-1)!.id).toBe(e.id);
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) } as unknown as Storage;
    saveProgress('c1', over, storage);
    const back = loadProgress({ id: 'c1', career: 'doctor', lifestyle: 'ordinary' } as never, storage);
    expect(back?.world.history.at(-1)).toMatchObject({ id: e.id, earned: paid });
  });

  it('keeps an engineer at work until the cars are safe', () => {
    const { s, e } = withEvent('road-accident');
    let g = act(s, { type: 'eventAct', objectiveId: 'comfort', at: spotOf(e, 'comfort') }, 'engineer');
    expect(act(g, { type: 'eventFinish' }, 'engineer').world.active).not.toBeNull();
    g = act(g, { type: 'eventAct', objectiveId: 'make-safe', at: spotOf(e, 'make-safe') }, 'engineer');
    for (const id of ['report', 'warn-traffic']) g = act(g, { type: 'eventAct', objectiveId: id, at: spotOf(e, id) }, 'engineer');
    expect(act(g, { type: 'eventFinish' }, 'engineer').world.active).toBeNull();
  });
});

describe('every event is played where it happens', () => {
  it('puts every objective that is done in a particular place within reach of the scene and clear of walls and kit, in every district', () => {
    for (const district of DISTRICTS) {
      for (const t of EVENT_TEMPLATES) {
        for (let seed = 1; seed <= 12; seed++) {
          const site = siteFor(t.kind, district, seeded(seed));
          if (!site) continue;
          const e = { kind: t.kind, scene: site.scene, districtId: district.id, ...(site.target ? { target: site.target } : {}) };
          for (const o of t.objectives) {
            const spot = objectiveSpot(e, o.id);
            if (!spot) continue;
            const from = o.atTarget ? site.target! : site.scene;
            expect(Math.hypot(spot.at.x - from.x, spot.at.z - from.z), `${district.id} ${t.kind} ${o.id}`).toBeLessThanOrEqual(o.atTarget ? 2.5 : SCENE_RADIUS);
            expect(siteClear(district.layout, spot.at.x, spot.at.z, 0.3), `${district.id} ${t.kind} ${o.id} @ ${seed} (${spot.at.x.toFixed(1)}, ${spot.at.z.toFixed(1)})`).toBe(true);
          }
        }
      }
    }
  }, 60_000);

  it('gives every objective but a phone call a place to do it', () => {
    for (const t of EVENT_TEMPLATES) {
      const district = districtById('lagos.marina');
      const site = siteFor(t.kind, district, seeded(3));
      if (!site) continue;
      const e = { kind: t.kind, scene: site.scene, districtId: district.id, ...(site.target ? { target: site.target } : {}) };
      for (const o of t.objectives) expect(objectiveSpot(e, o.id) === null, `${t.kind} ${o.id}`).toBe(!!o.phone);
    }
  });
});
