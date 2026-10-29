/**
 * The life engine: turns what you actually do in the world into skills,
 * missions, wishes, dream milestones and achievements, and pays their
 * rewards in GHAI exactly once.
 *
 * `lifeReducer` wraps the core game rules (lib/gameState.ts). After every
 * action it works out what happened by comparing the state before and after
 * (worked minutes, a meal, a shower, a run, a new place…), so progress can
 * only come from real play, never from opening a panel. Then it:
 *
 *   1. adds skill experience (traits speed some skills up),
 *   2. moves daily and weekly missions and wishes forward, paying each once,
 *   3. pays dream milestones and achievements once (their ids are recorded),
 *   4. keeps a short money history and a mood lift after good news,
 *   5. rolls over missions at the start of each game day and week.
 */
import type { Career, Lifestyle } from '../components/CharacterCreation';
import { gameReducer, currentMood, rideFare, type GameAction, type GameState } from './gameState';
import {
  HISTORY_SIZE, LEDGER_SIZE, MAX_TRAITS, PERKS, SKILLS, TRAITS, modifiers, perksOf, skillLevel,
  type Celebration, type DreamId, type LifeState, type Mission, type SkillId, type StatKey, type TraitId, type Wish,
  levelReward, playerLevel, totalXp,
} from './lifeState';
import { taskForHour } from './workTasks';
import { addNeeds, type Needs } from './needs';
import { cityDirectory } from './cityDirectory';
import { districtById } from './geography';
import { catalogueItem, homeComfort } from './furniture';
import { homeById } from './homes';
import { interiorFor, type FurnitureKind } from './interiors';
import { careerLadder, levelIndex } from './progression';
import { HANGOUT_LEVEL, friendshipLevel, gameDay, residentById, residentsIn, type Activity } from './people';
import { templateFor, type Severity } from './liveEvents';
import { medicalItem } from './health';
import { qualificationById } from './qualifications';
import { gearById } from './careerGear';
import type { District } from './geography';
import { equipmentById } from './equipment';
import { vehicleById } from './vehicleCatalog';
import { clientById, serviceById as spaServiceById } from './spa';

// ---------------------------------------------------------------- actions and links

export type LifeAction =
  | { type: 'visit'; placeId: string }
  | { type: 'setProfile'; bio: string; traits: TraitId[] }
  | { type: 'setDream'; dream: DreamId }
  | { type: 'dismissWish'; id: string }
  | { type: 'setSavingsGoal'; amount: number | null }
  /** Metres just driven in your own car (counted for the road-trip achievement). */
  | { type: 'drove'; metres: number };

export type AnyAction = GameAction | LifeAction;

/** Where a goal's "Go" button takes you in the world. */
export type LifeLink =
  | { to: 'work' | 'food' | 'fashion' | 'gadgets' | 'park' | 'nightlife' | 'travel' | 'home' | 'homes' | 'catalogue' | 'explore' }
  | { to: 'homeUse'; use: 'shower' | 'cook' | 'relax' | 'study' | 'sleep' }
  | { to: 'friend'; residentId?: string };

// ---------------------------------------------------------------- events

export type LifeEvent =
  | { kind: 'work'; minutes: number }
  | { kind: 'task'; quality: 'best' | 'ok' | 'poor' }
  | { kind: 'eatOut' }
  /** Metres driven in your own car. */
  | { kind: 'drive'; metres: number }
  | { kind: 'buyCar' }
  | { kind: 'cook' }
  | { kind: 'wash' }
  | { kind: 'relax'; piece: FurnitureKind }
  | { kind: 'study' }
  | { kind: 'socialise'; activity: Activity; residentId: string; isNew: boolean }
  | { kind: 'nightOut'; residentId: string }
  | { kind: 'buyFurniture' }
  | { kind: 'shop' }
  | { kind: 'gadget' }
  | { kind: 'trip'; to: string }
  | { kind: 'visit'; isNew: boolean; placeId: string }
  | { kind: 'run'; minutes: number }
  | { kind: 'park'; minutes: number }
  | { kind: 'moveIn' }
  | { kind: 'earn'; amount: number };

/** The skill a career's work builds. */
export const CAREER_SKILL: Record<Exclude<Career, 'none'>, SkillId> = {
  student: 'technology', artist: 'creativity', entrepreneur: 'business', athlete: 'fitness',
  engineer: 'technology', doctor: 'social', pilot: 'technology',
};

function pieceKind(state: GameState, target: { uid: string } | { builtin: number }): FurnitureKind | undefined {
  if ('uid' in target) return catalogueItem(state.furniture.find((o) => o.uid === target.uid)?.itemId)?.kind;
  const home = homeById(state.home);
  return home ? interiorFor(home).furniture[target.builtin]?.kind : undefined;
}

/** What happened, from the action and the state before and after it. Nothing if the action was refused. */
export function eventsFor(prev: GameState, action: GameAction, next: GameState, career: Career): LifeEvent[] {
  if (next === prev) return [];
  const out: LifeEvent[] = [];
  const earned = action.type === 'sleep' ? 0 : next.today.income - prev.today.income;
  if (earned > 0) out.push({ kind: 'earn', amount: earned });
  switch (action.type) {
    case 'tick': {
      const worked = next.today.minutesWorked - prev.today.minutesWorked;
      if (worked > 0) out.push({ kind: 'work', minutes: worked });
      break;
    }
    case 'workTask': {
      if (next.lastTaskHour === prev.lastTaskHour) break;
      const q = taskForHour(career, prev.time.totalMinutes)?.options[action.choice]?.quality;
      if (q) out.push({ kind: 'task', quality: q });
      break;
    }
    case 'eat': out.push({ kind: 'eatOut' }); break;
    case 'useFurniture': {
      const kind = pieceKind(prev, action.target);
      if (kind === 'stove' || kind === 'counter') out.push({ kind: 'cook' });
      else if (kind === 'shower') out.push({ kind: 'wash' });
      else if (kind === 'bathtub') out.push({ kind: 'wash' }, { kind: 'relax', piece: kind });
      else if (kind === 'desk') out.push({ kind: 'study' });
      else if (kind && kind !== 'fridge') out.push({ kind: 'relax', piece: kind });
      break;
    }
    case 'socialise': out.push({ kind: 'socialise', activity: action.activity, residentId: action.residentId, isNew: !(prev.relationships[action.residentId]?.points) }); break;
    case 'nightOut': out.push({ kind: 'nightOut', residentId: action.residentId }); break;
    case 'buyFurniture': out.push({ kind: 'buyFurniture' }); break;
    case 'purchase': out.push({ kind: 'shop' }); break;
    case 'buyEquipment': out.push({ kind: 'gadget' }); break;
    case 'buyVehicle': if (next.ownedVehicles.length > prev.ownedVehicles.length) out.push({ kind: 'buyCar' }); break;
    case 'campusStudy':
    case 'campusAssignment':
      if (next.campus !== prev.campus) out.push({ kind: 'study' });
      break;
    case 'travel': out.push({ kind: 'trip', to: action.to }); break;
    case 'wait': out.push({ kind: 'park', minutes: action.minutes }); break;
    case 'exercise': out.push({ kind: 'run', minutes: action.minutes }); break;
    case 'moveIn': out.push({ kind: 'moveIn' }); break;
  }
  return out;
}

/** Skill experience an event gives, before traits. */
function skillGains(e: LifeEvent, career: Career): Partial<Record<SkillId, number>> {
  const mine = career !== 'none' ? CAREER_SKILL[career] : null;
  switch (e.kind) {
    case 'work': return mine ? { [mine]: e.minutes * 0.25 } : {};
    case 'task': return mine ? { [mine]: e.quality === 'best' ? 15 : e.quality === 'ok' ? 5 : 0, business: e.quality === 'best' && mine !== 'business' ? 5 : 0 } : {};
    case 'cook': return { cooking: 25 };
    case 'run': return { fitness: (e.minutes / 30) * 20 };
    case 'socialise': return { social: e.activity === 'hangout' ? 20 : e.activity === 'treat' ? 12 : 8 };
    case 'nightOut': return { social: 25 };
    case 'relax':
      if (e.piece === 'bookshelf' || e.piece === 'speaker') return { creativity: 10 };
      if (e.piece === 'console') return { technology: 8 };
      return {};
    case 'study': return { technology: 15 };
    case 'shop': return { fashion: 15 };
    case 'buyFurniture': return { creativity: 5 };
    case 'gadget': return { technology: 10 };
    default: return {};
  }
}

const STAT_OF: Partial<Record<LifeEvent['kind'], StatKey>> = {
  eatOut: 'mealsOut', cook: 'mealsCooked', wash: 'washes', run: 'runs', socialise: 'chats', nightOut: 'nightsOut',
  buyFurniture: 'furnitureBought', shop: 'clothesBought', trip: 'trips', relax: 'relaxed', study: 'studied',
};

// ---------------------------------------------------------------- missions

interface Ctx {
  career: Career;
  state: GameState;
}

type Metric = 'meetNew' | 'lounge' | 'work' | 'goodTask' | 'eatOut' | 'cook' | 'wash' | 'relax' | 'social' | 'newPlace' | 'run' | 'earn' | 'xp' | 'study' | 'buyFurniture' | 'nightOut' | 'shop' | 'park' | 'meal';

/** How far an event moves a metric. Skill experience ('xp') is counted separately. */
function metricGain(m: Metric, e: LifeEvent): number {
  switch (m) {
    case 'work': return e.kind === 'work' ? e.minutes : 0;
    case 'goodTask': return e.kind === 'task' && e.quality === 'best' ? 1 : 0;
    case 'eatOut': return e.kind === 'eatOut' ? 1 : 0;
    case 'meal': return e.kind === 'eatOut' || e.kind === 'cook' ? 1 : 0;
    case 'cook': return e.kind === 'cook' ? 1 : 0;
    case 'wash': return e.kind === 'wash' ? 1 : 0;
    case 'relax': return e.kind === 'relax' ? 1 : 0;
    case 'social': return e.kind === 'socialise' || e.kind === 'nightOut' ? 1 : 0;
    case 'newPlace': return e.kind === 'visit' && e.isNew ? 1 : 0;
    case 'run': return e.kind === 'run' ? 1 : 0;
    case 'earn': return e.kind === 'earn' ? e.amount : 0;
    case 'study': return e.kind === 'study' ? 1 : 0;
    case 'buyFurniture': return e.kind === 'buyFurniture' ? 1 : 0;
    case 'nightOut': return e.kind === 'nightOut' ? 1 : 0;
    case 'shop': return e.kind === 'shop' ? 1 : 0;
    case 'park': return e.kind === 'park' ? e.minutes : 0;
    case 'meetNew': return e.kind === 'socialise' && e.isNew ? 1 : 0;
    case 'lounge': return e.kind === 'visit' && e.isNew && e.placeId.includes('.night.') ? 1 : 0;
    case 'xp': return 0;
  }
}

export interface MissionTemplate {
  id: string;
  title: string;
  metric: Metric;
  target: number;
  reward: number;
  link: LifeLink;
  /** Only offered when it can actually be done. */
  when?: (c: Ctx) => boolean;
}

const working = (c: Ctx) => c.career !== 'none';
const housed = (c: Ctx) => !!c.state.home;
/** Someone in this district you haven't met yet. */
const strangerHere = (c: Ctx) => residentsIn(c.state.districtId).some((r) => !c.state.relationships[r.id]?.points);
const unvisited = (c: Ctx) => cityDirectory(districtById(c.state.districtId), c.career, c.state.home).some((d) => d.position && d.status !== 'planned' && !c.state.life.visited.includes(d.id));

export const DAILY_MISSIONS: readonly MissionTemplate[] = [
  { id: 'd-work', title: 'Put in two hours at work', metric: 'work', target: 120, reward: 80, link: { to: 'work' }, when: working },
  { id: 'd-task', title: 'Make an excellent call at work', metric: 'goodTask', target: 1, reward: 70, link: { to: 'work' }, when: working },
  { id: 'd-earn', title: 'Earn 400 GHAI', metric: 'earn', target: 400, reward: 60, link: { to: 'work' }, when: working },
  { id: 'd-eat', title: 'Eat at a food spot', metric: 'eatOut', target: 1, reward: 40, link: { to: 'food' } },
  { id: 'd-cook', title: 'Cook a meal at home', metric: 'cook', target: 1, reward: 50, link: { to: 'homeUse', use: 'cook' }, when: housed },
  { id: 'd-wash', title: 'Start fresh: shower or bath', metric: 'wash', target: 1, reward: 30, link: { to: 'homeUse', use: 'shower' }, when: housed },
  { id: 'd-friend', title: 'Spend time with someone', metric: 'social', target: 1, reward: 50, link: { to: 'friend' } },
  { id: 'd-meet', title: 'Meet someone new', metric: 'meetNew', target: 1, reward: 50, link: { to: 'friend' }, when: strangerHere },
  { id: 'd-explore', title: 'Discover a new place', metric: 'newPlace', target: 1, reward: 60, link: { to: 'explore' }, when: unvisited },
  { id: 'd-run', title: 'Go for a run in the park', metric: 'run', target: 1, reward: 60, link: { to: 'park' } },
  { id: 'd-unwind', title: 'Unwind at home', metric: 'relax', target: 1, reward: 30, link: { to: 'homeUse', use: 'relax' }, when: housed },
  { id: 'd-practise', title: 'Gain 40 skill experience', metric: 'xp', target: 40, reward: 50, link: { to: 'park' } },
];

export const WEEKLY_MISSIONS: readonly MissionTemplate[] = [
  { id: 'w-work', title: 'Work 15 hours this week', metric: 'work', target: 900, reward: 500, link: { to: 'work' }, when: working },
  { id: 'w-friends', title: 'See people 4 times this week', metric: 'social', target: 4, reward: 350, link: { to: 'friend' } },
  { id: 'w-meet', title: 'Meet 2 new people', metric: 'meetNew', target: 2, reward: 250, link: { to: 'friend' }, when: strangerHere },
  { id: 'w-explore', title: 'Discover 4 new places', metric: 'newPlace', target: 4, reward: 400, link: { to: 'explore' }, when: unvisited },
  { id: 'w-chef', title: 'Cook 4 meals at home', metric: 'cook', target: 4, reward: 300, link: { to: 'homeUse', use: 'cook' }, when: housed },
  { id: 'w-fit', title: 'Go for 3 runs', metric: 'run', target: 3, reward: 300, link: { to: 'park' } },
  { id: 'w-nest', title: 'Buy something for your home', metric: 'buyFurniture', target: 1, reward: 250, link: { to: 'catalogue' }, when: housed },
  { id: 'w-style', title: 'Buy something new to wear', metric: 'shop', target: 1, reward: 200, link: { to: 'fashion' } },
  { id: 'w-night', title: 'A night out with a friend', metric: 'nightOut', target: 1, reward: 300, link: { to: 'nightlife' } },
];

export const DAILY_COUNT = 3;
export const WEEKLY_COUNT = 2;

/** A small, stable hash, so a day's missions don't change when you reload. */
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

function pickMissions(list: readonly MissionTemplate[], ctx: Ctx, n: number, period: string, avoid: readonly string[]): Mission[] {
  const open = list.filter((t) => !t.when || t.when(ctx));
  const fresh = open.filter((t) => !avoid.includes(t.id));
  const pool = (fresh.length >= n ? fresh : open).slice().sort((a, b) => hash(a.id + period) - hash(b.id + period));
  return pool.slice(0, n).map((t) => ({ id: `${t.id}@${period}`, template: t.id, progress: 0, target: t.target, reward: t.reward, done: false }));
}

export const missionTemplate = (id: string) => [...DAILY_MISSIONS, ...WEEKLY_MISSIONS].find((t) => t.id === id);

// ---------------------------------------------------------------- wishes

export interface WishTemplate {
  id: string;
  title: (c: Ctx, w?: { subject?: string }) => string;
  metric: Metric | 'balance' | 'home' | 'friendship';
  /** Who it's about (e.g. the resident to befriend), chosen when the wish is made. */
  subjectFor?: (c: Ctx) => string | undefined;
  target: (c: Ctx) => number;
  reward: number;
  link: LifeLink;
  when: (c: Ctx) => boolean;
}

/** A round amount a little above what you have. */
const saveTarget = (c: Ctx) => Math.max(5000, Math.ceil((c.state.balance * 1.25) / 1000) * 1000);
const lounge = (c: Ctx) => districtById(c.state.districtId).nightlife;
const loungeId = (c: Ctx) => `${c.state.districtId}.night.${lounge(c).id}`;

export const WISHES: readonly WishTemplate[] = [
  { id: 'wish-home', title: () => 'Find a place to call home', metric: 'home', target: () => 1, reward: 60, link: { to: 'homes' }, when: (c) => !c.state.home },
  { id: 'wish-tv', title: () => 'Put your feet up at home', metric: 'relax', target: () => 1, reward: 30, link: { to: 'homeUse', use: 'relax' }, when: (c) => !!c.state.home && c.state.needs.fun < 60 },
  { id: 'wish-park', title: (c) => `Spend some time in ${districtById(c.state.districtId).park.name}`, metric: 'park', target: () => 30, reward: 30, link: { to: 'park' }, when: (c) => c.state.needs.fun < 70 },
  { id: 'wish-friend', title: () => 'Catch up with someone', metric: 'social', target: () => 1, reward: 40, link: { to: 'friend' }, when: (c) => c.state.needs.social < 70 },
  { id: 'wish-food', title: () => 'Treat yourself to a meal out', metric: 'eatOut', target: () => 1, reward: 30, link: { to: 'food' }, when: (c) => c.state.fullness < 70 },
  { id: 'wish-music', title: (c) => `See live music at ${lounge(c).name}`, metric: 'lounge', target: () => 1, reward: 50, link: { to: 'nightlife' }, when: (c) => !c.state.life.visited.includes(loungeId(c)) },
  { id: 'wish-cosy', title: () => 'Make your home cosier', metric: 'buyFurniture', target: () => 1, reward: 50, link: { to: 'catalogue' }, when: (c) => !!c.state.home && c.state.furniture.length < 4 },
  { id: 'wish-save', title: (c) => `Save up ${saveTarget(c).toLocaleString()} GHAI`, metric: 'balance', target: saveTarget, reward: 80, link: { to: 'work' }, when: (c) => c.career !== 'none' },
  { id: 'wish-task', title: () => 'Nail a task at work', metric: 'goodTask', target: () => 1, reward: 40, link: { to: 'work' }, when: working },
  { id: 'wish-cook', title: () => 'Learn to cook a couple of dishes', metric: 'cook', target: () => 2, reward: 50, link: { to: 'homeUse', use: 'cook' }, when: (c) => !!c.state.home && skillLevel(c.state.life.skills.cooking) < 2 },
  { id: 'wish-run', title: () => 'Clear your head with a run', metric: 'run', target: () => 1, reward: 40, link: { to: 'park' }, when: (c) => c.state.needs.energy > 40 },
  {
    id: 'wish-befriend', title: (_c, w) => `Become friends with ${residentById(w?.subject ?? '')?.name ?? 'someone you know'}`,
    metric: 'friendship', target: () => 1, reward: 60, link: { to: 'friend' },
    subjectFor: (c) => residentsIn(c.state.districtId)
      .filter((r) => { const p = c.state.relationships[r.id]?.points ?? 0; return p > 0 && friendshipLevel(p) < HANGOUT_LEVEL; })
      .sort((x, y) => (c.state.relationships[y.id]?.points ?? 0) - (c.state.relationships[x.id]?.points ?? 0))[0]?.id,
    when: (c) => residentsIn(c.state.districtId).some((r) => { const p = c.state.relationships[r.id]?.points ?? 0; return p > 0 && friendshipLevel(p) < HANGOUT_LEVEL; }),
  },
  { id: 'wish-style', title: () => 'Try a new look', metric: 'shop', target: () => 1, reward: 40, link: { to: 'fashion' }, when: (c) => c.state.life.stats.clothesBought < 3 },
];

export const MAX_WISHES = 3;
const WISH_GAP_MINUTES = 60;
export const wishTemplate = (id: string) => WISHES.find((w) => w.id === id);

function stateProgress(w: { template: string; subject?: string }, s: GameState): number | null {
  const t = wishTemplate(w.template);
  if (t?.metric === 'friendship') return friendshipLevel(s.relationships[w.subject ?? '']?.points ?? 0) >= HANGOUT_LEVEL ? 1 : 0;
  if (t?.metric === 'balance') return s.balance;
  if (t?.metric === 'home') return s.home ? 1 : 0;
  return null;
}

// ---------------------------------------------------------------- dreams

export interface DreamStage {
  title: string;
  /** [now, needed] */
  check: (c: Ctx) => readonly [number, number];
  reward: number;
  link: LifeLink;
}

export interface Dream {
  id: DreamId;
  title: string;
  description: string;
  stages: readonly DreamStage[];
  /** Whether you can pick it at all (e.g. a career dream needs a career). */
  open?: (c: Ctx) => boolean;
}

const REWARDS = [300, 600, 1000, 2000, 4000];
const st = (i: number, title: string, link: LifeLink, check: DreamStage['check']): DreamStage => ({ title, check, reward: REWARDS[i], link });
const friendsAt = (c: Ctx, level: number) => Object.values(c.state.relationships).filter((r) => friendshipLevel(r.points) >= level).length;
const sk = (c: Ctx, id: SkillId) => skillLevel(c.state.life.skills[id]);
const careerStep = (c: Ctx) => (c.career === 'none' ? 0 : levelIndex(c.career, c.state.workMinutes) + 1);

export const DREAMS: readonly Dream[] = [
  {
    id: 'mogul', title: 'Business mogul', description: 'Build business skill and a fortune to match.',
    stages: [
      st(0, 'Reach business skill 2', { to: 'work' }, (c) => [sk(c, 'business'), 2]),
      st(1, 'Earn 20,000 GHAI in total', { to: 'work' }, (c) => [c.state.life.stats.earned, 20_000]),
      st(2, 'Reach business skill 5', { to: 'work' }, (c) => [sk(c, 'business'), 5]),
      st(3, 'Hold 100,000 GHAI', { to: 'work' }, (c) => [c.state.balance, 100_000]),
      st(4, 'Reach business skill 8', { to: 'work' }, (c) => [sk(c, 'business'), 8]),
    ],
  },
  {
    id: 'luxury', title: 'Luxury living', description: 'From a rented room to a beautifully furnished penthouse.',
    stages: [
      st(0, 'Rent a home', { to: 'homes' }, (c) => [c.state.home ? 1 : 0, 1]),
      st(1, 'Place 5 pieces of furniture', { to: 'catalogue' }, (c) => [c.state.furniture.filter((o) => o.at).length, 5]),
      st(2, 'Save 50,000 GHAI', { to: 'work' }, (c) => [c.state.balance, 50_000]),
      st(3, 'Live in a penthouse', { to: 'homes' }, (c) => [(homeById(c.state.home)?.rentPerNight ?? 0) >= 800 ? 1 : 0, 1]),
      st(4, 'Make your home comfort 25', { to: 'catalogue' }, (c) => [homeComfort(c.state.furniture), 25]),
    ],
  },
  {
    id: 'career', title: 'Top of my profession', description: 'Climb every rung of your career ladder.',
    open: (c) => c.career !== 'none',
    stages: [2, 3, 4, 5].map((n, i) => st(i, `Reach level ${n} of your career`, { to: 'work' }, (c) => [careerStep(c), Math.min(n, c.career === 'none' ? n : careerLadder(c.career).length)])),
  },
  {
    id: 'fashion', title: 'Fashion icon', description: 'Build a wardrobe and an eye for style.',
    stages: [
      st(0, 'Buy 3 things to wear', { to: 'fashion' }, (c) => [c.state.life.stats.clothesBought, 3]),
      st(1, 'Reach fashion skill 3', { to: 'fashion' }, (c) => [sk(c, 'fashion'), 3]),
      st(2, 'Buy 10 things to wear', { to: 'fashion' }, (c) => [c.state.life.stats.clothesBought, 10]),
      st(3, 'Reach fashion skill 6', { to: 'fashion' }, (c) => [sk(c, 'fashion'), 6]),
      st(4, 'Buy 25 things to wear', { to: 'fashion' }, (c) => [c.state.life.stats.clothesBought, 25]),
    ],
  },
  {
    id: 'social', title: 'Heart of the city', description: 'Become the person everyone knows and loves.',
    stages: [
      st(0, 'Make a friend', { to: 'friend' }, (c) => [friendsAt(c, 2), 1]),
      st(1, 'Have 3 friends', { to: 'friend' }, (c) => [friendsAt(c, 2), 3]),
      st(2, 'Have a close friend', { to: 'friend' }, (c) => [friendsAt(c, 3), 1]),
      st(3, 'Go on 5 nights out', { to: 'nightlife' }, (c) => [c.state.life.stats.nightsOut, 5]),
      st(4, 'Have a best friend', { to: 'friend' }, (c) => [friendsAt(c, 4), 1]),
    ],
  },
  {
    id: 'globetrotter', title: 'Globetrotter', description: 'See the cities of Africa and the world.',
    stages: [2, 5, 10, 20, 40].map((n, i) => st(i, `Visit ${n} cities`, { to: 'travel' }, (c) => [c.state.life.cities.length, n])),
  },
  {
    id: 'chef', title: 'Master chef', description: 'From jollof for one to cooking like a pro.',
    stages: [
      st(0, 'Cook 5 meals at home', { to: 'homeUse', use: 'cook' }, (c) => [c.state.life.stats.mealsCooked, 5]),
      st(1, 'Reach cooking skill 3', { to: 'homeUse', use: 'cook' }, (c) => [sk(c, 'cooking'), 3]),
      st(2, 'Own a gas cooker', { to: 'catalogue' }, (c) => [c.state.furniture.some((o) => o.itemId === 'stove-gas') ? 1 : 0, 1]),
      st(3, 'Cook 30 meals at home', { to: 'homeUse', use: 'cook' }, (c) => [c.state.life.stats.mealsCooked, 30]),
      st(4, 'Reach cooking skill 7', { to: 'homeUse', use: 'cook' }, (c) => [sk(c, 'cooking'), 7]),
    ],
  },
];

export const dreamById = (id: DreamId | undefined) => DREAMS.find((d) => d.id === id);
/** A dream can be changed once a game week (or any time once it's achieved). */
export const DREAM_CHANGE_DAYS = 7;

export function canChangeDream(life: LifeState, today: number): boolean {
  if (!life.dream) return true;
  if (life.achievements.some((a) => a.id === `dream-${life.dream!.id}`)) return true;
  return today - life.dream.since >= DREAM_CHANGE_DAYS;
}

// ---------------------------------------------------------------- achievements

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'career' | 'people' | 'explore' | 'home' | 'money' | 'skills' | 'goals';
  reward: number;
  check: (c: Ctx) => boolean;
  /** A collectible item (lib/fashion.ts, 'Rewards') added to your wardrobe when earned. */
  unlock?: string;
}

const a = (id: string, title: string, description: string, category: Achievement['category'], reward: number, check: Achievement['check'], unlock?: string): Achievement =>
  ({ id, title, description, category, reward, check, ...(unlock ? { unlock } : {}) });
/** City events (lib/liveEvents.ts) you've helped with, the one going on now included. */
const helpedEvents = (c: Ctx, severity?: Severity) => [
  ...c.state.world.history.filter((p) => p.outcome === 'helped').map((p) => p.kind),
  ...(c.state.world.active?.done.length ? [c.state.world.active.kind] : []),
].filter((k) => !severity || templateFor(k).severity === severity).length;
const careerTop = (c: Ctx) => c.career !== 'none' && levelIndex(c.career, c.state.workMinutes) === careerLadder(c.career).length - 1;

export const ACHIEVEMENTS: readonly Achievement[] = [
  a('first-pay', 'First pay packet', 'Earn your first GHAI.', 'career', 100, (c) => c.state.life.stats.earned > 0),
  a('hours-10', 'Ten hours on the clock', 'Work 10 hours in your career.', 'career', 200, (c) => c.state.workMinutes >= 600),
  a('promoted', 'Promoted', 'Climb to the second rung of your career.', 'career', 300, (c) => c.career !== 'none' && levelIndex(c.career, c.state.workMinutes) >= 1),
  a('career-top', 'Top of the ladder', 'Reach the highest level of your career.', 'career', 2000, careerTop),
  a('first-friend', 'Made a friend', 'Become friends with someone.', 'people', 150, (c) => friendsAt(c, 2) >= 1),
  a('best-friend', 'Best friends', 'Have a best friend.', 'people', 500, (c) => friendsAt(c, 4) >= 1, 'top-friendship-ankara'),
  a('met-5', 'Friendly face', 'Meet 5 people.', 'people', 200, (c) => c.state.life.stats.met >= 5),
  a('events-3', 'Out and about', 'Join 3 city events.', 'explore', 300, (c) => c.state.life.stats.events >= 3, 'top-festival-adire'),
  a('first-responder', 'First responder', 'Help at an emergency in the city.', 'people', 300, (c) => helpedEvents(c, 'emergency') >= 1),
  a('helped-10', 'Pillar of the community', 'Help with 10 city events.', 'people', 1000, (c) => helpedEvents(c) >= 10),
  a('respected', 'Respected', 'Become Respected for something: community trust, professional standing or another reputation.', 'people', 500, (c) => Object.values(c.state.world.reputation).some((v) => v >= 100)),
  a('night-out', 'Night on the town', 'Go on a night out with a friend.', 'people', 150, (c) => c.state.life.stats.nightsOut >= 1),
  a('explorer-5', 'Explorer', 'Discover 5 places.', 'explore', 150, (c) => c.state.life.visited.length >= 5, 'top-explorer-kente'),
  a('explorer-25', 'Know your way around', 'Discover 25 places.', 'explore', 500, (c) => c.state.life.visited.length >= 25),
  a('cities-3', 'Frequent flyer', 'Visit 3 cities.', 'explore', 400, (c) => c.state.life.cities.length >= 3),
  a('first-class', 'Front row', 'Attend a class at AYE Global University.', 'explore', 200, (c) => c.state.campus.totalClasses >= 1),
  a('first-assignment', 'Handed in', 'Hand in your first assignment.', 'explore', 300, (c) => c.state.campus.totalAssignments >= 1),
  a('first-patient', 'First patient', 'See a patient on shift at the hospital.', 'explore', 200, (c) => c.state.hospital.totalPatients >= 1),
  a('first-car', 'First wheels', 'Buy a car.', 'home', 300, (c) => c.state.ownedVehicles.length >= 1),
  a('road-trip', 'Road trip', 'Drive 10 km in your own car.', 'explore', 400, (c) => c.state.life.stats.driven >= 10_000),
  a('home', 'A place of your own', 'Rent a home.', 'home', 150, (c) => !!c.state.home),
  a('penthouse', 'Top floor', 'Live in a penthouse.', 'home', 1000, (c) => (homeById(c.state.home)?.rentPerNight ?? 0) >= 800),
  a('decorator', 'Decorator', 'Buy 5 pieces of furniture.', 'home', 250, (c) => c.state.life.stats.furnitureBought >= 5),
  a('cosy', 'Cosy home', 'Reach home comfort 15.', 'home', 300, (c) => !!c.state.home && homeComfort(c.state.furniture) >= 15),
  a('saver-10k', 'Rainy-day fund', 'Hold 10,000 GHAI.', 'money', 200, (c) => c.state.balance >= 10_000),
  a('saver-100k', 'Six figures', 'Hold 100,000 GHAI.', 'money', 1500, (c) => c.state.balance >= 100_000),
  a('chef-10', 'Home cook', 'Cook 10 meals at home.', 'skills', 250, (c) => c.state.life.stats.mealsCooked >= 10),
  a('runner-10', 'Ten runs', 'Go for 10 runs.', 'skills', 250, (c) => c.state.life.stats.runs >= 10, 'shoes-trail-emerald'),
  a('skill-5', 'Skilled', 'Reach level 5 in any skill.', 'skills', 400, (c) => SKILLS.some((s) => sk(c, s.id) >= 5)),
  a('all-rounder', 'All-rounder', 'Reach level 3 in four skills.', 'skills', 500, (c) => SKILLS.filter((s) => sk(c, s.id) >= 3).length >= 4),
  a('missions-10', 'Go-getter', 'Complete 10 missions.', 'goals', 300, (c) => c.state.life.stats.missionsDone >= 10, 'top-gogetter-silk'),
  a('missions-50', 'Unstoppable', 'Complete 50 missions.', 'goals', 1000, (c) => c.state.life.stats.missionsDone >= 50),
  a('wishes-10', 'Wishes come true', 'Fulfil 10 wishes.', 'goals', 300, (c) => c.state.life.stats.wishesDone >= 10, 'hair-rose-gold'),
];

// ---------------------------------------------------------------- city events

/**
 * Optional events: on most days something is on in the district for a few
 * hours, with a real bonus for joining in. Nothing is lost by missing one.
 */
export interface CityEvent {
  id: 'run-club' | 'food-fest' | 'music-night' | 'pop-up';
  title: (d: District) => string;
  perk: string;
  /** Hours it runs, [from, to). */
  from: number;
  to: number;
  link: LifeLink;
}

export const CITY_EVENTS: readonly CityEvent[] = [
  { id: 'run-club', title: (d) => `Morning run club in ${d.park.name}`, perk: 'Runs build twice the fitness and count as time with people (+10 social).', from: 6, to: 10, link: { to: 'park' } },
  { id: 'food-fest', title: () => 'Street food festival', perk: 'Meals out are extra fun (+15 fun) and teach you a little cooking.', from: 12, to: 16, link: { to: 'food' } },
  { id: 'music-night', title: (d) => `Live music special at ${d.nightlife.name}`, perk: 'Nights out give +20 fun and build twice the social skill.', from: 20, to: 24, link: { to: 'nightlife' } },
  { id: 'pop-up', title: (d) => `Designer pop-up at ${d.fashionHouse.name}`, perk: 'New clothes build twice the fashion skill.', from: 10, to: 18, link: { to: 'fashion' } },
];

/** Today's event in a district, if any (about four days in five). */
export function eventToday(districtId: string, day: number): CityEvent | null {
  const h = hash(`${districtId}:${day}`);
  return h % 5 === 0 ? null : CITY_EVENTS[h % CITY_EVENTS.length];
}
export const eventOn = (e: CityEvent | null, hour: number): boolean => !!e && hour >= e.from && hour < e.to;

/** Extra skill and need gains for joining in an event that's on. */
function eventBonus(e: CityEvent | null, ev: LifeEvent): { skills: Partial<Record<SkillId, number>>; needs: Partial<Needs> } | null {
  if (!e) return null;
  if (e.id === 'run-club' && ev.kind === 'run') return { skills: { fitness: (ev.minutes / 30) * 20 }, needs: { social: 10 } };
  if (e.id === 'food-fest' && ev.kind === 'eatOut') return { skills: { cooking: 5 }, needs: { fun: 15 } };
  if (e.id === 'music-night' && ev.kind === 'nightOut') return { skills: { social: 25 }, needs: { fun: 20 } };
  if (e.id === 'pop-up' && ev.kind === 'shop') return { skills: { fashion: 15 }, needs: {} };
  return null;
}

const ACTIVITY_WORD: Record<Activity, string> = { chat: 'Chat', treat: 'Treat', hangout: 'Hang out' };

// ---------------------------------------------------------------- the reducer

/** Pays a reward once: balance, today's income, money history, a celebration and a short mood lift. */
function pay(s: GameState, amount: number, label: string, kind: string, text: string, lift: number): GameState {
  const t = s.time.totalMinutes;
  const celebration: Celebration = { id: `${kind}:${label}:${t}:${s.life.celebrations.length}`, kind, text, reward: amount, t };
  return {
    ...s,
    balance: s.balance + amount,
    today: { ...s.today, income: s.today.income + amount },
    life: {
      ...s.life,
      ledger: amount ? [...s.life.ledger, { t, label, amount }].slice(-LEDGER_SIZE) : s.life.ledger,
      celebrations: [...s.life.celebrations, celebration].slice(-8),
      boost: lift ? { amount: Math.min(15, Math.max(lift, s.life.boost && s.life.boost.until > t ? s.life.boost.amount : 0)), until: t + 4 * 60 } : s.life.boost,
    },
  };
}

/** Money history for what the core rules just did (wages and living costs merge per day). */
function recordMoney(prev: GameState, action: GameAction, next: GameState): GameState {
  if (next === prev) return next;
  const t = next.time.totalMinutes;
  const entries: { label: string; amount: number; merge?: boolean }[] = [];
  if (action.type === 'tick') {
    const income = next.today.income - prev.today.income;
    const spent = next.today.expenses - prev.today.expenses;
    if (income > 0) entries.push({ label: 'Wages', amount: income, merge: true });
    if (spent > 0) entries.push({ label: 'Living costs', amount: -spent, merge: true });
  } else if (action.type === 'sleep' && next.summary) {
    if (next.summary.rent) entries.push({ label: `Rent: ${homeById(prev.home)?.name ?? 'home'}`, amount: -next.summary.rent });
    const rest = next.balance - prev.balance + next.summary.rent;
    if (rest) entries.push({ label: 'Living costs overnight', amount: rest });
  } else if (action.type === 'ride') {
    const delta = next.balance - prev.balance;
    const fare = rideFare(action.metres);
    entries.push({ label: 'Taxi ride', amount: -fare });
    if (delta + fare) entries.push({ label: 'Living costs', amount: delta + fare, merge: true });
  } else if (action.type === 'eventAct' && next.world.active) {
    // Helping takes time: the reward's own line, and the living costs of those minutes on their own
    const delta = next.balance - prev.balance;
    const main = next.world.active.earned - (prev.world.active?.earned ?? 0);
    if (main) entries.push({ label: labelFor(prev, action), amount: main });
    if (delta - main) entries.push({ label: 'Living costs', amount: delta - main, merge: true });
  } else if (action.type === 'spaTreat' || action.type === 'spaSession') {
    // A treatment takes time: the treatment's own line, and the living costs of those minutes on their own
    const delta = next.balance - prev.balance;
    const svc = action.type === 'spaTreat' ? spaServiceById(action.serviceId) : spaServiceById(clientById(gameDay(prev.time.totalMinutes), action.clientId)?.service ?? '');
    const main = action.type === 'spaTreat' ? -(svc?.price ?? 0) : next.spa.earnedTotal - prev.spa.earnedTotal;
    if (main) entries.push({ label: action.type === 'spaTreat' ? `Alafia Spa: ${svc?.name ?? 'treatment'}` : `Spa pay & tip: ${svc?.name ?? 'session'}`, amount: main });
    if (delta - main) entries.push({ label: 'Living costs', amount: delta - main, merge: true });
  } else {
    const delta = next.balance - prev.balance;
    if (delta) entries.push({ label: labelFor(prev, action), amount: delta });
  }
  let ledger = next.life.ledger;
  for (const e of entries) {
    // Wages and living costs keep one running line per day, moved to the end as they grow
    const i = e.merge ? ledger.findLastIndex((x) => x.label === e.label && gameDay(x.t) === gameDay(t)) : -1;
    if (i >= 0) ledger = [...ledger.slice(0, i), ...ledger.slice(i + 1), { ...ledger[i], amount: ledger[i].amount + e.amount, t }];
    else ledger = [...ledger, { t, label: e.label, amount: e.amount }];
  }
  return { ...next, life: { ...next.life, ledger: ledger.slice(-LEDGER_SIZE) } };
}

function labelFor(prev: GameState, action: GameAction): string {
  switch (action.type) {
    case 'eat': return 'Meal out';
    case 'buyGear': return `Work gear: ${gearById(action.itemId)?.name ?? 'equipment'}`;
    case 'enrolCourse': return `Course fee: ${qualificationById(action.id)?.name ?? 'course'}`;
    case 'buyMedical': return `Pharmacy: ${medicalItem(action.itemId)?.name ?? 'medical supplies'}`;
    case 'repairGear': return `Repair: ${gearById(prev.gear.find((o) => o.uid === action.uid)?.itemId ?? '')?.name ?? 'equipment'}`;
    case 'sellGear': return `Sold: ${gearById(prev.gear.find((o) => o.uid === action.uid)?.itemId ?? '')?.name ?? 'equipment'}`;
    case 'eventAct': return prev.world.active ? `Helped: ${templateFor(prev.world.active.kind).title.toLowerCase()}` : 'Helped in the city';
    case 'purchase': return 'Clothes & styling';
    case 'buyFurniture': return `Furniture: ${catalogueItem(action.itemId)?.name ?? ''}`;
    case 'sellFurniture': return `Sold: ${catalogueItem(prev.furniture.find((o) => o.uid === action.uid)?.itemId)?.name ?? 'furniture'}`;
    case 'buyEquipment': return `Gadget: ${equipmentById(action.id)?.name ?? ''}`;
    case 'travel': return `Travel to ${districtById(action.to).city.name}`;
    case 'socialise': return `${action.activity === 'treat' ? 'Treat for' : 'Time with'} ${residentById(action.residentId)?.name ?? 'a friend'}`;
    case 'nightOut': return `Night out with ${residentById(action.residentId)?.name ?? 'a friend'}`;
    case 'moveIn': return `Move-in fee: ${homeById(action.homeId)?.name ?? ''}`;
    case 'useFurniture': return 'Groceries';
    case 'workTask': return 'Work bonus';
    case 'buyHome': return `Bought: ${homeById(action.homeId)?.name ?? 'a home'}`;
    case 'buyVehicle': return `Car: ${vehicleById(action.modelId)?.name ?? ''}`;
    case 'buyFashionItem': return 'Clothes & styling';
    case 'officeClockOut': return 'Office pay';
    case 'bookHotel': return 'Grand Lagoon Hotel: one night';
    default: return 'Living costs';
  }
}

/** New day or week: fresh missions (yesterday's unfinished ones simply end, nothing is lost). */
function rollOver(s: GameState, career: Career): GameState {
  const day = gameDay(s.time.totalMinutes);
  const week = Math.floor(day / 7);
  if (s.life.day === day && s.life.week === week) return s;
  const ctx = { career, state: s };
  let life = s.life;
  if (life.day !== day) life = { ...life, day, daily: pickMissions(DAILY_MISSIONS, ctx, DAILY_COUNT, String(day), life.daily.map((m) => m.template)) };
  if (life.week !== week) life = { ...life, week, weekly: pickMissions(WEEKLY_MISSIONS, ctx, WEEKLY_COUNT, `w${week}`, life.weekly.map((m) => m.template)) };
  return { ...s, life };
}

function applyEvents(s: GameState, events: readonly LifeEvent[], career: Career, startMinute = s.time.totalMinutes): GameState {
  if (!events.length) return s;
  const mods = modifiers(s.life);
  const skills = { ...s.life.skills };
  const stats = { ...s.life.stats };
  let xpGained = 0;
  const levelUps: SkillId[] = [];
  // An event counts if it was on when the activity started
  const happening = eventToday(s.districtId, gameDay(startMinute));
  const event = eventOn(happening, Math.floor(startMinute / 60) % 24) ? happening : null;
  let needs = s.needs;
  const history = [...s.life.history];
  for (const e of events) {
    const stat = STAT_OF[e.kind];
    if (stat) stats[stat] += 1;
    if (e.kind === 'earn') stats.earned += e.amount;
    if (e.kind === 'drive') stats.driven += e.metres;
    if (e.kind === 'socialise' && e.isNew) stats.met += 1;
    if (e.kind === 'socialise') history.push({ who: e.residentId, what: ACTIVITY_WORD[e.activity], t: s.time.totalMinutes });
    if (e.kind === 'nightOut') history.push({ who: e.residentId, what: 'Night out', t: s.time.totalMinutes });
    const bonus = eventBonus(event, e);
    if (bonus) { stats.events += 1; needs = addNeeds(needs, bonus.needs); }
    const gains = { ...skillGains(e, career) };
    for (const [k, v] of Object.entries(bonus?.skills ?? {}) as [SkillId, number][]) gains[k] = (gains[k] ?? 0) + v;
    for (const [k, v] of Object.entries(gains) as [SkillId, number][]) {
      if (!v) continue;
      const gain = v * mods.skillXp[k];
      const before = skillLevel(skills[k]);
      skills[k] = Math.round((skills[k] + gain) * 100) / 100;
      xpGained += gain;
      if (skillLevel(skills[k]) > before) levelUps.push(k);
    }
  }
  const cities = events.flatMap((e) => (e.kind === 'trip' && !s.life.cities.includes(e.to) ? [e.to] : []));
  const step = (m: Mission | Wish) => {
    const t = missionTemplate(m.template) ?? wishTemplate(m.template);
    if (!t) return m;
    const metric = t.metric as Metric | 'balance' | 'home' | 'friendship';
    if (metric === 'balance' || metric === 'home' || metric === 'friendship') return m;
    const gain = metric === 'xp' ? xpGained : events.reduce((sum, e) => sum + metricGain(metric, e), 0);
    return gain ? { ...m, progress: Math.min(m.target, m.progress + gain) } : m;
  };
  let next: GameState = {
    ...s,
    needs,
    life: {
      ...s.life,
      skills,
      stats,
      history: history.slice(-HISTORY_SIZE),
      cities: [...s.life.cities, ...cities],
      daily: s.life.daily.map((m) => (m.done ? m : step(m) as Mission)),
      weekly: s.life.weekly.map((m) => (m.done ? m : step(m) as Mission)),
      wishes: s.life.wishes.map((w) => step(w) as Wish),
    },
  };
  const perksBefore = perksOf(s.life);
  for (const k of levelUps) {
    next = pay(next, 0, k, 'Skill up', `${SKILLS.find((x) => x.id === k)!.label} reached level ${skillLevel(skills[k])}`, 0);
  }
  for (const p of perksOf(next.life).filter((p) => !perksBefore.includes(p))) {
    const perk = PERKS.find((x) => x.id === p)!;
    next = pay(next, 0, p, 'Perk unlocked', `${perk.label}: ${perk.effect}`, 0);
  }
  return next;
}

/** Pays whatever has just been completed, once each. */
function settle(s: GameState, career: Career): GameState {
  let next = s;
  // Missions
  for (const list of ['daily', 'weekly'] as const) {
    for (const m of next.life[list]) {
      if (m.done || m.progress < m.target) continue;
      const t = missionTemplate(m.template);
      next = { ...next, life: { ...next.life, [list]: next.life[list].map((x) => (x.id === m.id ? { ...x, done: true } : x)), stats: { ...next.life.stats, missionsDone: next.life.stats.missionsDone + 1 } } };
      next = pay(next, m.reward, `Mission: ${t?.title ?? m.template}`, 'Mission complete', t?.title ?? m.template, 6);
    }
  }
  // Wishes (state-based ones like saving up are checked here)
  for (const w of next.life.wishes) {
    const live = stateProgress(w, next);
    const progress = live ?? w.progress;
    if (progress < w.target) continue;
    const t = wishTemplate(w.template);
    const ctx = { career, state: next };
    next = { ...next, life: { ...next.life, wishes: next.life.wishes.filter((x) => x.id !== w.id), stats: { ...next.life.stats, wishesDone: next.life.stats.wishesDone + 1 } } };
    next = pay(next, w.reward, `Wish: ${t ? t.title(ctx, w) : w.template}`, 'Wish fulfilled', t ? t.title(ctx, w) : w.template, 8);
    next = { ...next, needs: { ...next.needs, fun: Math.min(100, next.needs.fun + 5) } };
  }
  // Player level: every level reached pays once
  const level = playerLevel(totalXp(next.life.skills));
  for (let l = next.life.level + 1; l <= level; l++) next = pay(next, levelReward(l), `Level ${l}`, 'Level up', `You reached level ${l}`, 8);
  if (level > next.life.level) next = { ...next, life: { ...next.life, level } };
  // Dream milestones, in order
  const dream = dreamById(next.life.dream?.id);
  if (dream) {
    for (let i = 0; i < dream.stages.length; i++) {
      const key = `${dream.id}:${i}`;
      const [now, need] = dream.stages[i].check({ career, state: next });
      if (now < need) break;
      if (next.life.dreamStages.includes(key)) continue;
      next = { ...next, life: { ...next.life, dreamStages: [...next.life.dreamStages, key] } };
      next = pay(next, dream.stages[i].reward, `Dream: ${dream.stages[i].title}`, 'Dream milestone', `${dream.title}: ${dream.stages[i].title}`, 10);
    }
    const complete = dream.stages.every((_, i) => next.life.dreamStages.includes(`${dream.id}:${i}`));
    if (complete && !next.life.achievements.some((x) => x.id === `dream-${dream.id}`)) {
      next = { ...next, life: { ...next.life, achievements: [...next.life.achievements, { id: `dream-${dream.id}`, t: next.time.totalMinutes }] } };
      if (!next.life.achievements.some((x) => x.id === 'dream-achieved')) {
        next = { ...next, life: { ...next.life, achievements: [...next.life.achievements, { id: 'dream-achieved', t: next.time.totalMinutes }] } };
        next = pay(next, 2500, 'Achievement: Living the dream', 'Achievement', `Living the dream: ${dream.title}`, 15);
      }
    }
  }
  // Achievements
  const ctx = { career, state: next };
  for (const ach of ACHIEVEMENTS) {
    if (next.life.achievements.some((x) => x.id === ach.id) || !ach.check({ ...ctx, state: next })) continue;
    next = { ...next, life: { ...next.life, achievements: [...next.life.achievements, { id: ach.id, t: next.time.totalMinutes }] } };
    next = pay(next, ach.reward, `Achievement: ${ach.title}`, 'Achievement', ach.title, 10);
  }
  return next;
}

/** Adds a wish when there's room, at most one each game hour, chosen from your situation. */
function topUpWishes(s: GameState, career: Career): GameState {
  const t = s.time.totalMinutes;
  if (s.life.wishes.length >= MAX_WISHES || t - s.life.wishAt < WISH_GAP_MINUTES) return s;
  const ctx = { career, state: s };
  const active = s.life.wishes.map((w) => w.template);
  const options = WISHES.filter((w) => !active.includes(w.id) && w.when(ctx));
  if (!options.length) return s;
  const pick = options[s.life.wishSeq % options.length];
  const subject = pick.subjectFor?.(ctx);
  const wish: Wish = { id: `${pick.id}#${s.life.wishSeq + 1}`, template: pick.id, progress: 0, target: pick.target(ctx), reward: pick.reward, ...(subject ? { subject } : {}) };
  return { ...s, life: { ...s.life, wishes: [...s.life.wishes, wish], wishSeq: s.life.wishSeq + 1, wishAt: t } };
}

/** Marks a place as discovered. Only places in your current district that exist in the world count. */
function visit(s: GameState, placeId: string, career: Career): { state: GameState; events: LifeEvent[] } {
  if (s.summary || s.life.visited.includes(placeId)) return { state: s, events: [] };
  const real = cityDirectory(districtById(s.districtId), career, s.home).some((d) => d.id === placeId && d.position && d.status !== 'planned');
  if (!real) return { state: s, events: [] };
  return { state: { ...s, life: { ...s.life, visited: [...s.life.visited, placeId] } }, events: [{ kind: 'visit', isNew: true, placeId }] };
}

function lifeOnly(s: GameState, action: LifeAction, career: Career): GameState {
  const today = gameDay(s.time.totalMinutes);
  switch (action.type) {
    case 'setProfile': {
      const traits = [...new Set(action.traits)].filter((t) => TRAITS.some((x) => x.id === t)).slice(0, MAX_TRAITS);
      return { ...s, life: { ...s.life, profile: { bio: action.bio.slice(0, 280), traits } } };
    }
    case 'setDream': {
      const dream = dreamById(action.dream);
      if (!dream || s.life.dream?.id === action.dream || !canChangeDream(s.life, today)) return s;
      if (dream.open && !dream.open({ career, state: s })) return s;
      return { ...s, life: { ...s.life, dream: { id: action.dream, since: today } } };
    }
    case 'dismissWish':
      return s.life.wishes.some((w) => w.id === action.id) ? { ...s, life: { ...s.life, wishes: s.life.wishes.filter((w) => w.id !== action.id) } } : s;
    case 'setSavingsGoal': {
      const amount = action.amount === null ? null : Math.round(action.amount);
      if (amount !== null && !(amount > 0 && amount <= 100_000_000)) return s;
      return { ...s, life: { ...s.life, savingsGoal: amount } };
    }
    case 'visit':
    case 'drove':
      return s;
  }
}

const LIFE_TYPES: readonly LifeAction['type'][] = ['visit', 'setProfile', 'setDream', 'dismissWish', 'setSavingsGoal', 'drove'];
const isLifeAction = (a: AnyAction): a is LifeAction => (LIFE_TYPES as readonly string[]).includes(a.type);

/** The game's reducer: core rules, then the life engine on top. */
export function lifeReducer(state: GameState, action: AnyAction, career: Career, lifestyle: Lifestyle): GameState {
  let next: GameState;
  let events: LifeEvent[];
  if (isLifeAction(action)) {
    if (action.type === 'visit') ({ state: next, events } = visit(state, action.placeId, career));
    else if (action.type === 'drove') { next = state; events = Number.isFinite(action.metres) && action.metres > 0 && action.metres < 5000 ? [{ kind: 'drive', metres: action.metres }] : []; }
    else { next = lifeOnly(state, action, career); events = []; }
  } else {
    next = gameReducer(state, action, career, lifestyle);
    events = eventsFor(state, action, next, career);
    next = recordMoney(state, action, next);
    // A qualification earned is worth a moment
    if (action.type === 'sitExam' && !(action.id in state.qualifications.earned) && action.id in next.qualifications.earned) {
      next = pay(next, 0, '', 'Qualified', `You passed: ${qualificationById(action.id)?.name ?? 'your exam'}`, 8);
    }
  }
  if (!next.life.cities.includes(next.districtId)) next = { ...next, life: { ...next.life, cities: [...next.life.cities, next.districtId] } };
  next = rollOver(next, career);
  next = applyEvents(next, events, career, state.time.totalMinutes);
  next = settle(next, career);
  next = topUpWishes(next, career);
  return next;
}

// ---------------------------------------------------------------- views for the dashboard

export interface Suggestion {
  text: string;
  why: string;
  link: LifeLink;
  urgent: boolean;
}

/** What to do next, from your real situation: most pressing first. */
export function suggestions(s: GameState, career: Career): Suggestion[] {
  const out: Suggestion[] = [];
  if (s.fullness < 35) out.push({ text: 'Eat something', why: s.fullness < 20 ? 'You\'re hungry: pay is halved.' : 'You\'re getting peckish.', link: s.home ? { to: 'homeUse', use: 'cook' } : { to: 'food' }, urgent: s.fullness < 20 });
  if (s.needs.energy < 30) out.push({ text: 'Get some sleep', why: s.needs.energy < 15 ? 'Exhausted: pay is halved.' : 'You\'re tired.', link: s.home ? { to: 'homeUse', use: 'sleep' } : { to: 'homes' }, urgent: s.needs.energy < 15 });
  if (s.needs.hygiene < 30 && s.home) out.push({ text: 'Take a shower', why: 'Freshen up: it lifts your mood.', link: { to: 'homeUse', use: 'shower' }, urgent: false });
  if (s.needs.social < 35) out.push({ text: 'See a friend', why: 'You\'re feeling lonely.', link: { to: 'friend' }, urgent: false });
  if (s.needs.fun < 35) out.push({ text: 'Do something fun', why: 'You\'re bored.', link: s.home ? { to: 'homeUse', use: 'relax' } : { to: 'park' }, urgent: false });
  const hour = s.time.hour;
  if (career !== 'none' && hour >= 9 && hour < 17) out.push({ text: 'Go to work', why: 'Working hours: 09:00–17:00.', link: { to: 'work' }, urgent: false });
  if (!s.home) out.push({ text: 'Find a home', why: 'Sleeping rough leaves you hungry and tired.', link: { to: 'homes' }, urgent: false });
  return out;
}

/** People you know in this district (computer-controlled residents), closest friends first. */
export function peopleHere(s: GameState) {
  return residentsIn(s.districtId)
    .map((r) => ({ resident: r, rel: s.relationships[r.id] ?? { points: 0, lastDay: -1 } }))
    .sort((x, y) => y.rel.points - x.rel.points);
}

export const moodNow = currentMood;

/**
 * For a save from before Life OS: achievements you'd already earned are
 * recognised, without paying their rewards again for past play.
 */
export function recogniseExisting(s: GameState, career: Career): GameState {
  const ctx = { career, state: s };
  const done = ACHIEVEMENTS.filter((x) => x.check(ctx)).map((x) => ({ id: x.id, t: s.time.totalMinutes }));
  return { ...s, life: { ...s.life, achievements: done, cities: [s.districtId] } };
}

/**
 * A new life's opening choices (character creation), applied once through the
 * normal rules: traits and a dream on the profile, then moving into the chosen
 * home if the starting money covers its move-in fee.
 */
export function applyStart(state: GameState, start: { bio?: string; traits: readonly TraitId[]; dream: DreamId | null; homeId: string | null } | undefined, career: Career, lifestyle: Lifestyle): GameState {
  if (!start) return state;
  let s = state;
  if (start.traits.length || start.bio) s = lifeReducer(s, { type: 'setProfile', bio: start.bio ?? s.life.profile.bio, traits: [...start.traits] }, career, lifestyle);
  if (start.dream) s = lifeReducer(s, { type: 'setDream', dream: start.dream }, career, lifestyle);
  if (start.homeId) s = lifeReducer(s, { type: 'moveIn', homeId: start.homeId }, career, lifestyle);
  return s;
}
