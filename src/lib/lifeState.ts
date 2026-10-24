/**
 * The saved shape of a character's life beyond money and needs: profile
 * (bio, personality traits), skills, counters of what they've done, places
 * and cities discovered, missions, wishes, dream, achievements, savings goal,
 * a short money history and recent celebrations.
 *
 * This module also turns traits and skill perks into the numbers the game
 * rules use (`modifiers`), so their effects are real and in one place. The
 * rules that move missions, wishes, dreams and achievements forward are in
 * lib/life.ts.
 */

// ---------------------------------------------------------------- skills

export type SkillId = 'cooking' | 'fitness' | 'social' | 'creativity' | 'business' | 'technology' | 'fashion';

export const SKILLS: readonly { id: SkillId; label: string; how: string }[] = [
  { id: 'cooking', label: 'Cooking', how: 'Cook meals at home.' },
  { id: 'fitness', label: 'Fitness', how: 'Go for runs in the park; athletes train at work.' },
  { id: 'social', label: 'Social', how: 'Chat, hang out and go out with friends.' },
  { id: 'creativity', label: 'Creativity', how: 'Read, listen to music; artists create at work.' },
  { id: 'business', label: 'Business', how: 'Good calls at work; entrepreneurs grow it on every shift.' },
  { id: 'technology', label: 'Technology', how: 'Study at a desk, play games; engineers and pilots use it at work.' },
  { id: 'fashion', label: 'Fashion', how: 'Buy clothes and restyle at the boutique.' },
];

export const MAX_SKILL_LEVEL = 10;
/** Experience needed to reach a level: 60, 240, 540 … 6,000 for level 10. */
export const xpForLevel = (level: number) => 60 * level * level;
export const skillLevel = (xp: number) => Math.min(MAX_SKILL_LEVEL, Math.floor(Math.sqrt(Math.max(0, xp) / 60)));
/** Progress 0 … 1 towards the next level. */
export function skillProgress(xp: number): number {
  const l = skillLevel(xp);
  if (l >= MAX_SKILL_LEVEL) return 1;
  return (xp - xpForLevel(l)) / (xpForLevel(l + 1) - xpForLevel(l));
}

// ---------------------------------------------------------------- traits

export type TraitId = 'ambitious' | 'foodie' | 'sociable' | 'homebody' | 'active' | 'creative' | 'thrifty';

export const MAX_TRAITS = 2;

export const TRAITS: readonly { id: TraitId; label: string; effect: string }[] = [
  { id: 'ambitious', label: 'Ambitious', effect: 'Work-task bonuses +10%; business and technology skills grow 20% faster.' },
  { id: 'foodie', label: 'Foodie', effect: 'Every meal out or cooked at home is fun (+8 fun); cooking grows 25% faster.' },
  { id: 'sociable', label: 'Sociable', effect: 'Friendships grow 20% faster; the social need runs down 20% slower.' },
  { id: 'homebody', label: 'Homebody', effect: 'Relaxing at home is 25% more fun.' },
  { id: 'active', label: 'Active', effect: 'Fitness grows 50% faster; energy runs down 10% slower.' },
  { id: 'creative', label: 'Creative', effect: 'Creativity grows 50% faster; books and music are 20% more fun.' },
  { id: 'thrifty', label: 'Thrifty', effect: 'Living costs 10% lower.' },
];

// ---------------------------------------------------------------- perks

export type PerkId = 'home-chef' | 'stamina' | 'people-person' | 'quick-learner' | 'negotiator' | 'style-sense' | 'muse' | 'dreamer';

/** Perks unlock at skill level 3 (one per skill), plus one for completing a dream. */
export const PERK_LEVEL = 3;

export const PERKS: readonly { id: PerkId; label: string; effect: string; skill?: SkillId }[] = [
  { id: 'home-chef', label: 'Home chef', effect: 'Home-cooked meals fill you 25% more.', skill: 'cooking' },
  { id: 'stamina', label: 'Stamina', effect: 'Energy runs down 15% slower.', skill: 'fitness' },
  { id: 'people-person', label: 'People person', effect: 'Friendships grow 25% faster.', skill: 'social' },
  { id: 'muse', label: 'Muse', effect: 'Fun at home (TV, games, books, music) +20%.', skill: 'creativity' },
  { id: 'negotiator', label: 'Negotiator', effect: '10% off furniture.', skill: 'business' },
  { id: 'quick-learner', label: 'Quick learner', effect: 'Studying at a desk counts 50% more towards promotion.', skill: 'technology' },
  { id: 'style-sense', label: 'Style sense', effect: 'Looking good: mood +5.', skill: 'fashion' },
  { id: 'dreamer', label: 'Living the dream', effect: 'You achieved your dream: mood +5 for good.' },
];

// ---------------------------------------------------------------- missions, wishes, dreams

export interface Mission {
  /** Template id plus the day or week it belongs to, e.g. "d-cook@12". */
  id: string;
  template: string;
  progress: number;
  target: number;
  reward: number;
  done: boolean;
}

export interface Wish {
  id: string;
  template: string;
  progress: number;
  target: number;
  reward: number;
  /** Who or what it's about, e.g. a resident id for "Become friends with…". */
  subject?: string;
}

/** One thing you did with someone. */
export interface Interaction {
  /** Resident id. */
  who: string;
  /** "Chat", "Treat", "Hang out", "Night out". */
  what: string;
  t: number;
}

export const HISTORY_SIZE = 60;

export type DreamId = 'mogul' | 'luxury' | 'career' | 'fashion' | 'social' | 'globetrotter' | 'chef';

export interface LedgerEntry {
  /** Game minute it happened (totalMinutes). */
  t: number;
  label: string;
  /** Positive in, negative out (GHAI). */
  amount: number;
}

export interface Celebration {
  id: string;
  /** "Mission complete", "Achievement", "Wish fulfilled", "Dream milestone", "Skill up", "Perk unlocked". */
  kind: string;
  text: string;
  reward: number;
  t: number;
}

export type StatKey =
  | 'goodTasks' | 'mealsOut' | 'mealsCooked' | 'washes' | 'runs' | 'chats' | 'nightsOut'
  | 'furnitureBought' | 'clothesBought' | 'trips' | 'earned' | 'missionsDone' | 'wishesDone' | 'relaxed' | 'studied' | 'events' | 'met' | 'driven';

export interface LifeState {
  profile: { bio: string; traits: TraitId[] };
  /** Experience per skill. */
  skills: Record<SkillId, number>;
  stats: Record<StatKey, number>;
  /** Place ids (lib/cityDirectory.ts) you've been to. */
  visited: string[];
  /** Districts you've been to. */
  cities: string[];
  /** Game day and week the current missions belong to (-1: none yet). */
  day: number;
  week: number;
  daily: Mission[];
  weekly: Mission[];
  wishes: Wish[];
  wishSeq: number;
  /** Game minute a wish was last added (wishes arrive at most one an hour). */
  wishAt: number;
  dream: { id: DreamId; since: number } | null;
  /** Dream stage ids already rewarded, e.g. "luxury:2". */
  dreamStages: string[];
  achievements: { id: string; t: number }[];
  savingsGoal: number | null;
  /** A temporary lift in mood from something good happening. */
  boost: { amount: number; until: number } | null;
  ledger: LedgerEntry[];
  celebrations: Celebration[];
  /** Recent time with people, newest last. */
  history: Interaction[];
}

const SKILL_IDS = SKILLS.map((s) => s.id);
const STAT_KEYS: readonly StatKey[] = ['goodTasks', 'mealsOut', 'mealsCooked', 'washes', 'runs', 'chats', 'nightsOut', 'furnitureBought', 'clothesBought', 'trips', 'earned', 'missionsDone', 'wishesDone', 'relaxed', 'studied', 'events', 'met', 'driven'];
const DREAM_IDS: readonly DreamId[] = ['mogul', 'luxury', 'career', 'fashion', 'social', 'globetrotter', 'chef'];

export function emptyLife(): LifeState {
  return {
    profile: { bio: '', traits: [] },
    skills: Object.fromEntries(SKILL_IDS.map((k) => [k, 0])) as Record<SkillId, number>,
    stats: Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Record<StatKey, number>,
    visited: [],
    cities: [],
    day: -1,
    week: -1,
    daily: [],
    weekly: [],
    wishes: [],
    wishSeq: 0,
    wishAt: -Infinity,
    dream: null,
    dreamStages: [],
    achievements: [],
    savingsGoal: null,
    boost: null,
    ledger: [],
    celebrations: [],
    history: [],
  };
}

export const hasPerk = (life: LifeState, id: PerkId) => perksOf(life).includes(id);

export function perksOf(life: LifeState): PerkId[] {
  const out: PerkId[] = [];
  for (const p of PERKS) {
    if (p.skill && skillLevel(life.skills[p.skill]) >= PERK_LEVEL) out.push(p.id);
  }
  if (life.achievements.some((a) => a.id === 'dream-achieved')) out.push('dreamer');
  return out;
}

const has = (life: LifeState | undefined, t: TraitId) => !!life?.profile.traits.includes(t);

/** Everything traits and perks change, as multipliers (1 = no change) or additions. */
export interface Modifiers {
  energyDecay: number;
  socialDecay: number;
  friendship: number;
  cookFullness: number;
  furniturePrice: number;
  studyXp: number;
  homeFun: number;
  readingFun: number;
  livingCost: number;
  taskBonus: number;
  /** Added to mood. */
  mood: number;
  /** Fun from every meal. */
  mealFun: number;
  skillXp: Record<SkillId, number>;
}

export function modifiers(life: LifeState | undefined): Modifiers {
  const perk = (id: PerkId) => !!life && hasPerk(life, id);
  const xp = Object.fromEntries(SKILL_IDS.map((k) => [k, 1])) as Record<SkillId, number>;
  if (has(life, 'ambitious')) { xp.business *= 1.2; xp.technology *= 1.2; }
  if (has(life, 'foodie')) xp.cooking *= 1.25;
  if (has(life, 'active')) xp.fitness *= 1.5;
  if (has(life, 'creative')) xp.creativity *= 1.5;
  return {
    energyDecay: (has(life, 'active') ? 0.9 : 1) * (perk('stamina') ? 0.85 : 1),
    socialDecay: has(life, 'sociable') ? 0.8 : 1,
    friendship: (has(life, 'sociable') ? 1.2 : 1) * (perk('people-person') ? 1.25 : 1),
    cookFullness: perk('home-chef') ? 1.25 : 1,
    furniturePrice: perk('negotiator') ? 0.9 : 1,
    studyXp: perk('quick-learner') ? 1.5 : 1,
    homeFun: (has(life, 'homebody') ? 1.25 : 1) * (perk('muse') ? 1.2 : 1),
    readingFun: has(life, 'creative') ? 1.2 : 1,
    livingCost: has(life, 'thrifty') ? 0.9 : 1,
    taskBonus: has(life, 'ambitious') ? 1.1 : 1,
    mood: (perk('style-sense') ? 5 : 0) + (perk('dreamer') ? 5 : 0),
    mealFun: has(life, 'foodie') ? 8 : 0,
    skillXp: xp,
  };
}

// ---------------------------------------------------------------- saves

const num = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min);
const strs = (v: unknown, max: number) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && x.length < 120))].slice(0, max) : []);

function missions(v: unknown): Mission[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 10).flatMap((m): Mission[] => {
    if (typeof m !== 'object' || m === null) return [];
    const o = m as Record<string, unknown>;
    if (typeof o.id !== 'string' || typeof o.template !== 'string') return [];
    return [{ id: o.id, template: o.template, progress: num(o.progress), target: Math.max(1, num(o.target)), reward: num(o.reward, 0, 100_000), done: o.done === true }];
  });
}

/** Validates a saved life; anything missing (saves from before Life OS) starts fresh, nothing else is touched. */
export function sanitiseLife(data: unknown): LifeState {
  const fresh = emptyLife();
  if (typeof data !== 'object' || data === null) return fresh;
  const d = data as Record<string, unknown>;
  const profile = (d.profile ?? {}) as Record<string, unknown>;
  const skills = (d.skills ?? {}) as Record<string, unknown>;
  const stats = (d.stats ?? {}) as Record<string, unknown>;
  const dream = d.dream as Record<string, unknown> | null | undefined;
  return {
    profile: {
      bio: typeof profile.bio === 'string' ? profile.bio.slice(0, 280) : '',
      traits: strs(profile.traits, MAX_TRAITS).filter((t): t is TraitId => TRAITS.some((x) => x.id === t)),
    },
    skills: Object.fromEntries(SKILL_IDS.map((k) => [k, num(skills[k], 0, xpForLevel(MAX_SKILL_LEVEL))])) as Record<SkillId, number>,
    stats: Object.fromEntries(STAT_KEYS.map((k) => [k, num(stats[k])])) as Record<StatKey, number>,
    visited: strs(d.visited, 2000),
    cities: strs(d.cities, 400),
    day: Number.isInteger(d.day) ? (d.day as number) : -1,
    week: Number.isInteger(d.week) ? (d.week as number) : -1,
    daily: missions(d.daily),
    weekly: missions(d.weekly),
    wishes: missions(d.wishes).map((w, i) => {
      const raw = (Array.isArray(d.wishes) ? d.wishes[i] : null) as { subject?: unknown } | null;
      const subject = typeof raw?.subject === 'string' ? raw.subject.slice(0, 80) : undefined;
      return { id: w.id, template: w.template, progress: w.progress, target: w.target, reward: w.reward, ...(subject ? { subject } : {}) };
    }),
    wishSeq: num(d.wishSeq),
    wishAt: typeof d.wishAt === 'number' && Number.isFinite(d.wishAt) ? d.wishAt : -Infinity,
    dream: dream && DREAM_IDS.includes(dream.id as DreamId) ? { id: dream.id as DreamId, since: num(dream.since) } : null,
    dreamStages: strs(d.dreamStages, 100),
    achievements: Array.isArray(d.achievements)
      ? d.achievements.flatMap((a) => (typeof a === 'object' && a && typeof (a as { id?: unknown }).id === 'string' ? [{ id: (a as { id: string }).id, t: num((a as { t?: unknown }).t) }] : [])).slice(0, 200)
      : [],
    savingsGoal: typeof d.savingsGoal === 'number' && d.savingsGoal > 0 && Number.isFinite(d.savingsGoal) ? Math.round(d.savingsGoal) : null,
    boost: d.boost && typeof d.boost === 'object' ? { amount: num((d.boost as { amount?: unknown }).amount, 0, 20), until: num((d.boost as { until?: unknown }).until) } : null,
    ledger: Array.isArray(d.ledger)
      ? d.ledger.flatMap((e) => {
        const o = e as Record<string, unknown>;
        return o && typeof o.label === 'string' && typeof o.amount === 'number' && Number.isFinite(o.amount) ? [{ t: num(o.t), label: o.label.slice(0, 80), amount: o.amount }] : [];
      }).slice(-LEDGER_SIZE)
      : [],
    celebrations: [],
    history: Array.isArray(d.history)
      ? d.history.flatMap((e) => {
        const o = e as Record<string, unknown>;
        return o && typeof o.who === 'string' && typeof o.what === 'string' ? [{ who: o.who.slice(0, 80), what: o.what.slice(0, 40), t: num(o.t) }] : [];
      }).slice(-HISTORY_SIZE)
      : [],
  };
}

export const LEDGER_SIZE = 80;
