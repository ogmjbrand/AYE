/**
 * The living world: things happen in the city that nobody planned. A road
 * accident on the cross street, someone collapsing on the pavement, an old man
 * who has wandered away from home, a car broken down across a lane, a
 * restaurant swamped at lunchtime.
 *
 * Rules (tunable):
 *   - One event at a time, chosen by a director that waits a while between
 *     events. How long depends on the player's chosen frequency; 'off' means
 *     none at all, so peaceful play is always possible.
 *   - Each event lasts a fixed time. The computer-controlled emergency services
 *     handle whatever the player doesn't do, so missing one costs nothing.
 *   - The player is rewarded only for objectives they actually complete, at the
 *     scene, and only once each. Standing nearby earns nothing. Some objectives
 *     need a career (first aid needs a doctor, making cars safe an engineer) or
 *     a phone (calling it in).
 *   - Taking charge of something and walking away before handing over (a doctor
 *     who starts first aid and leaves) costs professional reputation, a little,
 *     once. Everything else is optional.
 *   - Helping builds reputation (lib/reputation.ts) as well as paying GHAI.
 *
 * Everything here is pure and seeded from the clock and the district, so the
 * same save always sees the same events, and a server can run the same rules.
 */
import type { Career } from '../components/CharacterCreation';
import { districtById, type District } from './geography';
import { seeded, type DistrictLayout } from './world';
import { addReputation, emptyReputation, sanitiseReputation, type RepId, type Reputation } from './reputation';

export type EventKind = 'road-accident' | 'collapse' | 'missing-person' | 'breakdown' | 'lunch-rush';
export type EventFrequency = 'off' | 'calm' | 'normal' | 'lively';
export const EVENT_FREQUENCIES: readonly EventFrequency[] = ['off', 'calm', 'normal', 'lively'];
export const FREQUENCY_LABEL: Record<EventFrequency, string> = { off: 'Off', calm: 'Calm', normal: 'Normal', lively: 'Lively' };

/** Within this distance of an event's scene you can help (E). */
export const SCENE_RADIUS = 6;
/** Within this distance of a search target you've found them. */
export const FIND_RADIUS = 2.5;

export type Severity = 'emergency' | 'minor' | 'opportunity';

export interface Objective {
  id: string;
  label: string;
  /** What doing it means, shown before you choose it. */
  detail: string;
  /** Game minutes it takes. */
  minutes: number;
  /** GHAI paid on completion. */
  reward: number;
  rep: Partial<Record<RepId, number>>;
  /** Careers that can do it; undefined means anyone. */
  careers?: readonly Career[];
  /** Needs a smartphone (lib/equipment.ts). */
  phone?: boolean;
  /** Objectives that must be done first. */
  after?: readonly string[];
  /** Done at the search target rather than the scene. */
  atTarget?: boolean;
  /** Starting this commits you to these: leaving them undone when the event ends costs professional reputation. */
  commits?: readonly string[];
}

export interface EventTemplate {
  kind: EventKind;
  severity: Severity;
  title: string;
  /** One line for the alert: what's happening. */
  summary: string;
  /** Game minutes the event lasts once it starts. */
  minutes: number;
  /** Hours of the day it can start in, [from, to). */
  hours: readonly [number, number][];
  objectives: readonly Objective[];
  /** What the computer-controlled services do about whatever is left. */
  othersHandle: string;
}

const PHONE_REPORT = (what: string): Objective => ({
  id: 'report', label: 'Call it in', detail: `Phone the emergency line and describe ${what}.`, minutes: 2, reward: 15, rep: { community: 3 }, phone: true,
});

export const EVENT_TEMPLATES: readonly EventTemplate[] = [
  {
    kind: 'road-accident',
    severity: 'emergency',
    title: 'Road accident',
    summary: 'Two cars have collided on the cross street. A driver is hurt.',
    minutes: 60,
    hours: [[7, 23]],
    othersHandle: 'Paramedics took the driver to hospital and the police cleared the road.',
    objectives: [
      PHONE_REPORT('where the crash is and who is hurt'),
      { id: 'first-aid', label: 'Give the driver first aid', detail: 'Check breathing, stop the bleeding and keep their neck still until the ambulance arrives.', minutes: 12, reward: 120, rep: { professional: 12, community: 4 }, careers: ['doctor'], commits: ['handover'] },
      { id: 'handover', label: 'Hand over to the paramedics', detail: 'Tell the crew what happened and what you did.', minutes: 4, reward: 40, rep: { professional: 6 }, careers: ['doctor'], after: ['first-aid'] },
      { id: 'make-safe', label: 'Make the cars safe', detail: 'Switch off the engines and batteries and check for leaking fuel.', minutes: 10, reward: 80, rep: { professional: 8, community: 2 }, careers: ['engineer'] },
      { id: 'comfort', label: 'Look after the passenger', detail: 'Sit with the shaken passenger, keep them warm and talking.', minutes: 8, reward: 25, rep: { community: 5 } },
      { id: 'warn-traffic', label: 'Warn oncoming drivers', detail: 'Stand back from the crash and slow the traffic down.', minutes: 6, reward: 20, rep: { community: 3 }, after: ['report'] },
    ],
  },
  {
    kind: 'collapse',
    severity: 'emergency',
    title: 'Someone has collapsed',
    summary: 'A woman has collapsed on the pavement and isn’t responding.',
    minutes: 35,
    hours: [[6, 24]],
    othersHandle: 'A passer-by called for help and an ambulance took her to hospital.',
    objectives: [
      PHONE_REPORT('her condition and where she is'),
      { id: 'recovery', label: 'Put her in the recovery position', detail: 'Roll her onto her side and keep her airway clear. Anyone can do this.', minutes: 4, reward: 30, rep: { community: 6 }, after: ['report'] },
      { id: 'treat', label: 'Assess and treat her', detail: 'Check her pulse, breathing and blood sugar, and treat what you find.', minutes: 10, reward: 100, rep: { professional: 12, community: 3 }, careers: ['doctor'], commits: ['handover'] },
      { id: 'handover', label: 'Hand over to the paramedics', detail: 'Brief the crew on her condition.', minutes: 3, reward: 30, rep: { professional: 5 }, careers: ['doctor'], after: ['treat'] },
    ],
  },
  {
    kind: 'missing-person',
    severity: 'minor',
    title: 'Missing person',
    summary: 'Baba Femi has wandered away from home. His daughter is worried.',
    minutes: 50,
    hours: [[8, 20]],
    othersHandle: 'Neighbours found Baba Femi and walked him home.',
    objectives: [
      { id: 'listen', label: 'Ask his daughter what happened', detail: 'Find out what he’s wearing and where he likes to go.', minutes: 2, reward: 0, rep: { community: 1 } },
      { id: 'find', label: 'Find Baba Femi', detail: 'He can’t be far. Look along the streets nearby: he’s on the map once you know where to look.', minutes: 1, reward: 0, rep: {}, after: ['listen'], atTarget: true },
      { id: 'home', label: 'Walk him back to his daughter', detail: 'Go back together, slowly.', minutes: 3, reward: 80, rep: { community: 12, social: 3 }, after: ['find'] },
    ],
  },
  {
    kind: 'breakdown',
    severity: 'minor',
    title: 'Broken-down car',
    summary: 'A car has broken down on the cross street and is blocking a lane.',
    minutes: 45,
    hours: [[7, 22]],
    othersHandle: 'A tow truck moved the car to a garage.',
    objectives: [
      { id: 'push', label: 'Help push it to the kerb', detail: 'Get it out of the traffic lane.', minutes: 5, reward: 15, rep: { community: 3 } },
      { id: 'repair', label: 'Find the fault and fix it', detail: 'Diagnose the fault and get the engine running again.', minutes: 15, reward: 90, rep: { professional: 8, community: 2 }, careers: ['engineer'] },
      { id: 'tow', label: 'Call a tow truck', detail: 'Phone a garage to collect it.', minutes: 2, reward: 10, rep: { community: 2 }, phone: true },
    ],
  },
  {
    kind: 'lunch-rush',
    severity: 'opportunity',
    title: 'Restaurant rush',
    summary: 'A coach party has arrived and the restaurant is short of hands.',
    minutes: 70,
    hours: [[12, 14], [18, 21]],
    othersHandle: 'The staff got through it, slowly.',
    objectives: [
      { id: 'serve', label: 'Help serve tables (paid shift)', detail: 'Take orders and carry plates for half an hour.', minutes: 30, reward: 60, rep: { business: 3, social: 2 } },
      { id: 'run-floor', label: 'Run the floor', detail: 'Seat the party, reorganise the kitchen queue and keep tables turning.', minutes: 15, reward: 90, rep: { business: 10 }, careers: ['entrepreneur'] },
    ],
  },
];

export const templateFor = (kind: EventKind) => EVENT_TEMPLATES.find((t) => t.kind === kind)!;

export interface Point { x: number; z: number }

export interface ActiveEvent {
  /** Kind and start minute, e.g. "road-accident@4380". */
  id: string;
  kind: EventKind;
  districtId: string;
  startedAt: number;
  endsAt: number;
  /** Where it's happening: help within SCENE_RADIUS of here. */
  scene: Point;
  /** Where the search target is (missing person). */
  target?: Point;
  /** The player said they're on their way: tracked on the map. */
  responding: boolean;
  /** The player hid the alert; the event still happens and they can still help. */
  dismissed: boolean;
  /** Objectives the player has completed. */
  done: string[];
  earned: number;
  rep: Partial<Record<RepId, number>>;
}

export type Outcome = 'helped' | 'missed';

export interface PastEvent {
  id: string;
  kind: EventKind;
  /** When it ended. */
  t: number;
  outcome: Outcome;
  earned: number;
  done: string[];
  /** Left a commitment unfinished (and lost professional reputation for it). */
  abandoned: boolean;
}

export const HISTORY_SIZE = 20;

export interface LiveWorld {
  frequency: EventFrequency;
  /** Game minute when the director next looks for something to happen (0: not scheduled yet). */
  nextAt: number;
  active: ActiveEvent | null;
  /** The last event to end, until the player has seen how it went. */
  lastResult: PastEvent | null;
  history: PastEvent[];
  reputation: Reputation;
}

export function emptyLiveWorld(): LiveWorld {
  return { frequency: 'normal', nextAt: 0, active: null, lastResult: null, history: [], reputation: emptyReputation() };
}

// ---------------------------------------------------------------- the director

/** Game minutes between one event ending and the next starting: [shortest, longest]. */
const GAP: Record<Exclude<EventFrequency, 'off'>, readonly [number, number]> = {
  calm: [10 * 60, 16 * 60],
  normal: [4 * 60, 7 * 60],
  lively: [90, 3 * 60],
};
/** The first event of a session comes a little sooner, so the world feels alive from the start. */
const FIRST_GAP: Record<Exclude<EventFrequency, 'off'>, readonly [number, number]> = {
  calm: [3 * 60, 6 * 60],
  normal: [40, 2 * 60],
  lively: [15, 45],
};

/** A small, stable hash. */
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

export function nextGap(frequency: EventFrequency, seed: string, first = false): number {
  if (frequency === 'off') return Infinity;
  const [lo, hi] = (first ? FIRST_GAP : GAP)[frequency];
  return lo + Math.floor(seeded(hash(seed))() * (hi - lo + 1));
}

const inHours = (t: EventTemplate, hour: number) => t.hours.some(([from, to]) => hour >= from && hour < to);

/** How much more likely an event is when the player's career has something to do in it. */
const CAREER_WEIGHT = 3;

/**
 * Picks what happens next: an event that can start at this hour, has a place
 * to happen in this district, and isn't the same kind as the last one. Events
 * where the player's career is useful are more likely.
 */
export function pickEvent(district: District, minute: number, career: Career, lastKind: EventKind | null): { template: EventTemplate; scene: Point; target?: Point } | null {
  const hour = Math.floor(minute / 60) % 24;
  const rng = seeded(hash(`${district.id}:${minute}`));
  const options = EVENT_TEMPLATES.flatMap((t) => {
    if (!inHours(t, hour) || t.kind === lastKind) return [];
    const site = siteFor(t.kind, district, rng);
    if (!site) return [];
    const useful = t.objectives.some((o) => o.careers?.includes(career));
    return [{ template: t, ...site, weight: useful ? CAREER_WEIGHT : 1 }];
  });
  if (!options.length) return null;
  let roll = rng() * options.reduce((sum, o) => sum + o.weight, 0);
  for (const o of options) {
    roll -= o.weight;
    if (roll <= 0) return { template: o.template, scene: o.scene, target: o.target };
  }
  const last = options[options.length - 1];
  return { template: last.template, scene: last.scene, target: last.target };
}

/**
 * Moves the world on to `minute`: ends an event whose time is up (settling
 * reputation for anything abandoned), and starts the next one when it's due.
 * Called every game minute.
 */
export function directWorld(world: LiveWorld, districtId: string, minute: number, career: Career): LiveWorld {
  let w = world;
  if (w.active && minute >= w.active.endsAt) w = endEvent(w, minute);
  // An event in another city carries on without you; you just can't help with it
  if (w.frequency === 'off') return w.nextAt === 0 ? w : { ...w, nextAt: 0 };
  if (w.nextAt === 0) return { ...w, nextAt: minute + nextGap(w.frequency, `${districtId}:first:${minute}`, true) };
  if (w.active || minute < w.nextAt) return w;
  const district = districtById(districtId);
  const picked = pickEvent(district, minute, career, w.history[w.history.length - 1]?.kind ?? null);
  // Nothing can happen now (the wrong hour for everything): look again in an hour
  if (!picked) return { ...w, nextAt: minute + 60 };
  const active: ActiveEvent = {
    id: `${picked.template.kind}@${minute}`,
    kind: picked.template.kind,
    districtId,
    startedAt: minute,
    endsAt: minute + picked.template.minutes,
    scene: picked.scene,
    ...(picked.target ? { target: picked.target } : {}),
    responding: false,
    dismissed: false,
    done: [],
    earned: 0,
    rep: {},
  };
  return { ...w, active, nextAt: active.endsAt + nextGap(w.frequency, `${districtId}:${minute}`) };
}

/** Unfinished commitments: objectives that a completed one committed you to. */
export function unfinishedCommitments(e: ActiveEvent): string[] {
  const t = templateFor(e.kind);
  const owed = new Set(t.objectives.filter((o) => e.done.includes(o.id)).flatMap((o) => o.commits ?? []));
  return [...owed].filter((id) => !e.done.includes(id));
}

/** Reputation lost for leaving a commitment unfinished: enough to notice, small enough to win back. */
export const ABANDON_PENALTY = 8;

function endEvent(w: LiveWorld, minute: number): LiveWorld {
  const e = w.active!;
  const abandoned = unfinishedCommitments(e).length > 0;
  const past: PastEvent = { id: e.id, kind: e.kind, t: minute, outcome: e.done.length ? 'helped' : 'missed', earned: e.earned, done: e.done, abandoned };
  return {
    ...w,
    active: null,
    // Only events you took part in are worth a report
    lastResult: e.done.length ? past : w.lastResult,
    history: [...w.history, past].slice(-HISTORY_SIZE),
    reputation: abandoned ? addReputation(w.reputation, { professional: -ABANDON_PENALTY }) : w.reputation,
  };
}

// ---------------------------------------------------------------- what the player can do

export type Availability =
  | { ok: true }
  | { ok: false; reason: string };

/** Whether the player can do an objective now, and if not, why not (shown in the panel). */
export function canDo(e: ActiveEvent, objectiveId: string, career: Career, equipment: readonly string[], minute: number): Availability {
  const o = templateFor(e.kind).objectives.find((x) => x.id === objectiveId);
  if (!o) return { ok: false, reason: 'Not part of this event.' };
  if (minute >= e.endsAt) return { ok: false, reason: 'It’s over.' };
  if (e.done.includes(o.id)) return { ok: false, reason: 'Done.' };
  if (o.careers && !o.careers.includes(career)) return { ok: false, reason: `Needs ${o.careers.map((c) => withArticle(careerWord(c))).join(' or ')}.` };
  if (o.phone && !equipment.includes('smartphone')) return { ok: false, reason: 'Needs a phone.' };
  const missing = (o.after ?? []).filter((id) => !e.done.includes(id));
  if (missing.length) return { ok: false, reason: `First: ${missing.map((id) => templateFor(e.kind).objectives.find((x) => x.id === id)?.label.toLowerCase() ?? id).join(', ')}.` };
  return { ok: true };
}

const CAREER_WORD: Partial<Record<Career, string>> = { doctor: 'doctor', engineer: 'engineer', entrepreneur: 'business owner', artist: 'artist', athlete: 'athlete', pilot: 'pilot', student: 'student' };
const careerWord = (c: Career) => CAREER_WORD[c] ?? c;
const withArticle = (word: string) => `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`;

/**
 * Marks an objective done and records its reward and reputation. Callers
 * check `canDo` and that the player is in the right place, and pass the time.
 */
export function completeObjective(w: LiveWorld, objectiveId: string): LiveWorld {
  const e = w.active!;
  const o = templateFor(e.kind).objectives.find((x) => x.id === objectiveId)!;
  const rep: Partial<Record<RepId, number>> = { ...e.rep };
  for (const [k, v] of Object.entries(o.rep) as [RepId, number][]) rep[k] = (rep[k] ?? 0) + v;
  const active: ActiveEvent = { ...e, responding: true, done: [...e.done, o.id], earned: e.earned + o.reward, rep };
  return { ...w, active, reputation: addReputation(w.reputation, o.rep) };
}

/** Objectives anyone in the player's position could still usefully do. */
export function openObjectives(e: ActiveEvent, career: Career, equipment: readonly string[], minute: number) {
  return templateFor(e.kind).objectives.filter((o) => canDo(e, o.id, career, equipment, minute).ok);
}

// ---------------------------------------------------------------- where things happen

/** Is a circle of this radius clear of everything solid? */
export function siteClear(layout: DistrictLayout, x: number, z: number, radius: number): boolean {
  if (Math.abs(x) > 44 || Math.abs(z) > 62) return false;
  return layout.obstacles.every((o) => {
    const nx = Math.max(o.position[0] - o.size[0] / 2, Math.min(x, o.position[0] + o.size[0] / 2));
    const nz = Math.max(o.position[2] - o.size[2] / 2, Math.min(z, o.position[2] + o.size[2] / 2));
    return Math.hypot(x - nx, z - nz) >= radius;
  });
}

function shuffled<T>(items: T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A clear stretch of the cross street, away from the boulevard's traffic. */
function crossStreetSpot(layout: DistrictLayout, rng: () => number, radius: number): Point | null {
  const { roadHalfWidth: R, pavementWidth: P, crossStreet: C } = layout;
  const z = (C.minZ + C.maxZ) / 2;
  const xs: number[] = [];
  for (let d = R + P + 4; d <= R + P + 16; d += 2) xs.push(d, -d);
  return shuffled(xs, rng).map((x) => ({ x, z })).find((p) => siteClear(layout, p.x, p.z, radius)) ?? null;
}

/** A clear spot on the boulevard's pavements, off the junction. */
function pavementSpots(layout: DistrictLayout, radius: number): Point[] {
  const { roadHalfWidth: R, pavementWidth: P, crossStreet: C } = layout;
  const out: Point[] = [];
  for (let z = -54; z <= 54; z += 3) {
    if (z > C.minZ - P - 2 && z < C.maxZ + P + 2) continue;
    for (const x of [R + P / 2, -(R + P / 2)]) if (siteClear(layout, x, z, radius)) out.push({ x, z });
  }
  return out;
}

/** Where an event of this kind can happen in this district, or null if nowhere. */
export function siteFor(kind: EventKind, district: District, rng: () => number): { scene: Point; target?: Point } | null {
  const layout = district.layout;
  switch (kind) {
    case 'road-accident': {
      const scene = crossStreetSpot(layout, rng, 3);
      return scene && { scene };
    }
    case 'breakdown': {
      const scene = crossStreetSpot(layout, rng, 2.4);
      return scene && { scene };
    }
    case 'collapse': {
      const spots = pavementSpots(layout, 1.2);
      return spots.length ? { scene: spots[Math.floor(rng() * spots.length)] } : null;
    }
    case 'missing-person': {
      // His daughter waits at the park gate; he's somewhere 15 to 40 m away along the pavements
      const [px, , pz] = district.park.position;
      const scene = { x: px, z: pz };
      const far = pavementSpots(layout, 1).filter((p) => {
        const d = Math.hypot(p.x - px, p.z - pz);
        return d >= 15 && d <= 40;
      });
      return far.length ? { scene, target: far[Math.floor(rng() * far.length)] } : null;
    }
    case 'lunch-rush': {
      const r = district.restaurant;
      return r ? { scene: { x: r.door[0], z: r.door[2] } } : null;
    }
  }
}

// ---------------------------------------------------------------- saves

const KINDS = new Set<string>(EVENT_TEMPLATES.map((t) => t.kind));
const isKind = (k: unknown): k is EventKind => typeof k === 'string' && KINDS.has(k);
const isPoint = (p: unknown): p is Point => typeof p === 'object' && p !== null
  && Number.isFinite((p as Point).x) && Number.isFinite((p as Point).z) && Math.abs((p as Point).x) < 500 && Math.abs((p as Point).z) < 500;
const isMinute = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;
const objectiveIds = (kind: EventKind, ids: unknown): string[] => {
  if (!Array.isArray(ids)) return [];
  const known = new Set(templateFor(kind).objectives.map((o) => o.id));
  return [...new Set(ids.filter((id): id is string => typeof id === 'string' && known.has(id)))];
};

function sanitiseActive(data: unknown): ActiveEvent | null {
  if (typeof data !== 'object' || data === null) return null;
  const a = data as Record<string, unknown>;
  if (!isKind(a.kind) || typeof a.districtId !== 'string' || !isMinute(a.startedAt) || !isMinute(a.endsAt) || a.endsAt <= a.startedAt || !isPoint(a.scene)) return null;
  const done = objectiveIds(a.kind, a.done);
  const t = templateFor(a.kind);
  // Earnings and reputation are what the completed objectives are worth, whatever the save says
  const earned = t.objectives.filter((o) => done.includes(o.id)).reduce((sum, o) => sum + o.reward, 0);
  const rep: Partial<Record<RepId, number>> = {};
  for (const o of t.objectives.filter((x) => done.includes(x.id))) for (const [k, v] of Object.entries(o.rep) as [RepId, number][]) rep[k] = (rep[k] ?? 0) + v;
  return {
    id: `${a.kind}@${a.startedAt}`,
    kind: a.kind,
    districtId: a.districtId,
    startedAt: a.startedAt,
    endsAt: Math.min(a.endsAt, a.startedAt + t.minutes),
    scene: a.scene,
    ...(isPoint(a.target) ? { target: a.target } : {}),
    responding: a.responding === true,
    dismissed: a.dismissed === true,
    done,
    earned,
    rep,
  };
}

function sanitisePast(data: unknown): PastEvent | null {
  if (typeof data !== 'object' || data === null) return null;
  const p = data as Record<string, unknown>;
  if (typeof p.id !== 'string' || !isKind(p.kind) || !isMinute(p.t)) return null;
  const done = objectiveIds(p.kind, p.done);
  const earned = templateFor(p.kind).objectives.filter((o) => done.includes(o.id)).reduce((sum, o) => sum + o.reward, 0);
  return { id: p.id, kind: p.kind, t: p.t, outcome: done.length ? 'helped' : 'missed', earned, done, abandoned: p.abandoned === true };
}

export function sanitiseLiveWorld(data: unknown): LiveWorld {
  const w = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  return {
    frequency: EVENT_FREQUENCIES.includes(w.frequency as EventFrequency) ? (w.frequency as EventFrequency) : 'normal',
    nextAt: isMinute(w.nextAt) ? w.nextAt : 0,
    active: sanitiseActive(w.active),
    lastResult: sanitisePast(w.lastResult),
    history: (Array.isArray(w.history) ? w.history : []).map(sanitisePast).filter((p): p is PastEvent => !!p).slice(-HISTORY_SIZE),
    reputation: sanitiseReputation(w.reputation),
  };
}
