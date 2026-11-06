/**
 * The herbal medicine profession, taken up at any hospital's Herbal Medicine Centre alongside
 * your main career: Beginner → Apprentice → Herbal Practitioner → Experienced Herbalist →
 * Senior Herbal Specialist → Master Herbal Practitioner.
 *
 * Each rank needs experience and a training course (paid for, and taking time). What you can
 * do grows with your rank:
 * - Beginner: identify plants; tend the garden.
 * - Apprentice: harvest; prepare the basic remedies; the plant survey.
 * - Herbal Practitioner: consult patients (and know when to send them to a doctor).
 * - Experienced Herbalist: run the dispensary and sell what you have prepared.
 * - Senior Herbal Specialist: research, and develop new preparations.
 * - Master Herbal Practitioner: your own herbal business (a bigger share of every sale).
 *
 * Progress rewards knowing things, not clicking: identifications, preparations and research
 * questions are right or wrong, and only right answers count. Everything here is pure; the
 * game reducer applies the money, time and effects (lib/gameState.ts).
 */
import { CONDITIONS, conditionById, type Condition } from './healthcare';
import { PLANTS, REMEDIES, plantById, remedyById, type PrepStep } from './herbal';

export const RANKS = [
  { name: 'Beginner', xp: 0, course: null },
  { name: 'Apprentice', xp: 60, course: 'course-plant-id' },
  { name: 'Herbal Practitioner', xp: 220, course: 'course-preparation' },
  { name: 'Experienced Herbalist', xp: 520, course: 'course-dispensary' },
  { name: 'Senior Herbal Specialist', xp: 1000, course: 'course-clinical' },
  { name: 'Master Herbal Practitioner', xp: 1800, course: 'course-research' },
] as const;

export const COURSES = [
  { id: 'course-plant-id', name: 'Plant identification', fee: 150, minutes: 60, note: 'The garden\'s plants by leaf, smell and local name.' },
  { id: 'course-preparation', name: 'Safe preparation', fee: 300, minutes: 90, note: 'Cleanliness, measures and labelling in the preparation room.' },
  { id: 'course-dispensary', name: 'Dispensary practice', fee: 500, minutes: 120, note: 'Stock, records and serving patients at the counter.' },
  { id: 'course-clinical', name: 'Working with doctors', fee: 800, minutes: 120, note: 'When herbal care fits, and when a patient must see a doctor now.' },
  { id: 'course-research', name: 'Research methods', fee: 1200, minutes: 180, note: 'Careful records, comparisons and honest results.' },
] as const;

export type CourseId = (typeof COURSES)[number]['id'];
export const GARDEN_PLOTS = 4;
/** Your share of a remedy's price when you sell from your own stock: as an employee, and as a master with your own business. */
export const SALE_SHARE = { employee: 0.6, master: 0.85 } as const;

export interface HerbalState {
  xp: number;
  trained: string[];
  /** Correct identifications, by plant. */
  identified: Record<string, number>;
  garden: ({ plant: string; plantedAt: number } | null)[];
  ingredients: Record<string, number>;
  /** Remedies you have prepared and can sell at the dispensary. */
  stock: Record<string, number>;
  /** Research projects finished. */
  research: string[];
  prepared: number;
  consults: number;
  harvests: number;
  sold: number;
}

export function emptyHerbal(): HerbalState {
  return { xp: 0, trained: [], identified: {}, garden: Array.from({ length: GARDEN_PLOTS }, () => null), ingredients: {}, stock: {}, research: [], prepared: 0, consults: 0, harvests: 0, sold: 0 };
}

/** Your rank (0 to 5): the highest whose experience you have and whose course (and every earlier one) you've passed. */
export function herbalRank(h: Pick<HerbalState, 'xp' | 'trained'>): number {
  let rank = 0;
  for (let i = 1; i < RANKS.length; i++) {
    const r = RANKS[i];
    if (h.xp >= r.xp && r.course && h.trained.includes(r.course)) rank = i;
    else break;
  }
  // The master's title also needs three research projects (checked by the caller with the full state)
  return rank;
}

export function rankOf(h: HerbalState): number {
  const r = herbalRank(h);
  return r === 5 && h.research.length < 3 ? 4 : r;
}

export type HerbalResult = { ok: true; herbal: HerbalState; xp: number; pay: number; message: string } | { ok: false; reason: string };
const fail = (reason: string): HerbalResult => ({ ok: false, reason });
const gain = (h: HerbalState, xp: number, pay: number, message: string, change: Partial<HerbalState> = {}): HerbalResult =>
  ({ ok: true, herbal: { ...h, ...change, xp: h.xp + xp }, xp, pay, message });

/** The next course you can take: the one for the next rank, once you have that rank's experience. */
export function nextCourse(h: HerbalState) {
  const rank = herbalRank(h);
  const next = RANKS[rank + 1];
  if (!next || !next.course || h.trained.includes(next.course)) return null;
  return COURSES.find((c) => c.id === next.course) ?? null;
}

export function train(h: HerbalState, courseId: string, balance: number): HerbalResult & { fee?: number; minutes?: number } {
  const course = COURSES.find((c) => c.id === courseId);
  if (!course) return fail('No such course.');
  if (h.trained.includes(course.id)) return fail('You have done this course.');
  const rank = herbalRank(h);
  const forRank = RANKS.findIndex((r) => r.course === course.id);
  if (forRank !== rank + 1) return fail('Take the courses in order.');
  if (h.xp < RANKS[forRank].xp) return fail(`You need ${RANKS[forRank].xp} experience first (you have ${h.xp}).`);
  if (balance < course.fee) return fail('Not enough GHAI for the course fee.');
  return { ...gain(h, 0, 0, `Passed: ${course.name}. You are now ${RANKS[forRank].name}.`, { trained: [...h.trained, course.id] }), fee: course.fee, minutes: course.minutes };
}

// ——— Identifying plants ——————————————————————————————————————————————————

/** A plant to identify and four names to choose from, the same for a given seed. */
export function identificationQuestion(seed: number) {
  const n = PLANTS.length;
  const answer = PLANTS[Math.abs(seed) % n];
  const others = PLANTS.filter((p) => p.id !== answer.id);
  const picks = [answer, ...[0, 1, 2].map((k) => others[(Math.abs(seed) * 7 + k * 5) % others.length])];
  const options = [...new Map(picks.map((p) => [p.id, p])).values()];
  while (options.length < 4) { const extra = others.find((p) => !options.includes(p)); if (!extra) break; options.push(extra); }
  // Shuffled by the seed, so the answer isn't always first
  const order = options.map((p, i) => ({ p, k: (i * 31 + Math.abs(seed) * 17) % 97 })).sort((a, b) => a.k - b.k).map((o) => o.p);
  const clue = (Math.abs(seed) >> 3) % 2 === 0 ? `Its ${answer.part} are used. It is known as ${answer.localNames[0]}.` : `${answer.botanical}: ${answer.traditional.split(';')[0]}.`;
  return { plantId: answer.id, clue, options: order.map((p) => ({ id: p.id, name: p.name })) };
}

export function identify(h: HerbalState, plantId: string, answerId: string): HerbalResult {
  if (!plantById(plantId)) return fail('No such plant.');
  if (answerId !== plantId) return { ok: true, herbal: h, xp: 0, pay: 0, message: `Not quite: that was ${plantById(plantId)!.name}.` };
  const seen = h.identified[plantId] ?? 0;
  // Experience for the first few of each plant, so learning all of them counts more than repeating one
  const xp = seen < 3 ? 8 : 1;
  return gain(h, xp, 0, `Right: ${plantById(plantId)!.name}.`, { identified: { ...h.identified, [plantId]: seen + 1 } });
}

// ——— The garden ————————————————————————————————————————————————————————

export function plant(h: HerbalState, plot: number, plantId: string, now: number): HerbalResult {
  if (plot < 0 || plot >= GARDEN_PLOTS) return fail('No such bed.');
  if (h.garden[plot]) return fail('That bed is already planted.');
  if (!plantById(plantId)) return fail('No such plant.');
  const garden = h.garden.map((g, i) => (i === plot ? { plant: plantId, plantedAt: now } : g));
  return gain(h, 2, 0, `Planted ${plantById(plantId)!.name}.`, { garden });
}

export const ripe = (bed: { plant: string; plantedAt: number } | null, now: number) => !!bed && now - bed.plantedAt >= (plantById(bed.plant)?.growMinutes ?? Infinity);

export function harvest(h: HerbalState, plot: number, now: number): HerbalResult {
  if (rankOf(h) < 1) return fail('Harvesting starts at Apprentice.');
  const bed = h.garden[plot];
  if (!bed) return fail('Nothing is growing there.');
  if (!ripe(bed, now)) return fail('Not ready yet.');
  const p = plantById(bed.plant)!;
  const bonus = h.research.includes('res-plant-survey') ? 1 : 0;
  const ingredients = { ...h.ingredients, [p.id]: (h.ingredients[p.id] ?? 0) + p.yield + bonus };
  return gain(h, 5, 0, `Harvested ${p.yield + bonus} handfuls of ${p.name}.`, { ingredients, garden: h.garden.map((g, i) => (i === plot ? null : g)), harvests: h.harvests + 1 });
}

// ——— Preparing remedies ————————————————————————————————————————————————

/** How well the steps were done: the share in the right place. */
export function prepQuality(steps: readonly PrepStep[], order: readonly PrepStep[]): number {
  if (!order.length) return 0;
  let right = 0;
  for (let i = 0; i < steps.length; i++) if (order[i] === steps[i]) right++;
  return right / steps.length;
}

export function canPrepare(h: HerbalState, remedyId: string): { ok: true } | { ok: false; reason: string } {
  const r = remedyById(remedyId);
  if (!r) return { ok: false, reason: 'No such remedy.' };
  if (rankOf(h) < r.prepareRank) return { ok: false, reason: `Needs ${RANKS[r.prepareRank].name}.` };
  if (r.research && !h.research.includes(r.research)) return { ok: false, reason: 'Not developed yet: it needs research.' };
  for (const [id, n] of Object.entries(r.ingredients)) if ((h.ingredients[id] ?? 0) < n) return { ok: false, reason: `Needs ${n} × ${plantById(id)?.name ?? id}.` };
  return { ok: true };
}

export function prepare(h: HerbalState, remedyId: string, order: readonly PrepStep[]): HerbalResult & { quality?: number } {
  const check = canPrepare(h, remedyId);
  if (!check.ok) return fail(check.reason);
  const r = remedyById(remedyId)!;
  const ingredients = { ...h.ingredients };
  for (const [id, n] of Object.entries(r.ingredients)) ingredients[id] = (ingredients[id] ?? 0) - n;
  const quality = prepQuality(r.steps, order);
  if (quality < 0.5) return { ...gain(h, 1, 0, 'The batch spoiled: the steps were out of order. Try again with fresh ingredients.', { ingredients }), quality };
  const extra = quality === 1 && h.research.includes('res-preparation-methods') ? 1 : 0;
  const made = (r.service ? 0 : 1) + (r.service ? 0 : extra);
  return {
    ...gain(h, 10 + Math.round(10 * quality), 0, `Prepared ${r.name} (${Math.round(quality * 100)}% quality).`, {
      ingredients, prepared: h.prepared + 1, stock: made ? { ...h.stock, [r.id]: (h.stock[r.id] ?? 0) + made } : h.stock,
    }),
    quality,
  };
}

// ——— Consultations ————————————————————————————————————————————————————

export type ConsultChoice = 'refer' | `herbal:${string}` | `combined:${string}`;

/** The right choice for a patient with this condition: herbal care, combined care with a doctor, or straight to the doctor. */
export function consultCorrect(condition: Condition, choice: ConsultChoice): boolean {
  if (condition.emergency || condition.plan === 'modern') return choice === 'refer';
  const [kind, remedy] = choice.split(':');
  return kind === condition.plan && condition.remedies.includes(remedy);
}

export function consult(h: HerbalState, conditionId: string, choice: ConsultChoice): HerbalResult & { correct?: boolean } {
  if (rankOf(h) < 2) return fail('Consultations start at Herbal Practitioner.');
  const c = conditionById(conditionId);
  if (!c) return fail('No such patient.');
  const correct = consultCorrect(c, choice);
  const message = correct
    ? c.emergency ? 'Right: a red-flag emergency goes straight to the emergency doctors.' : c.plan === 'modern' ? 'Right: this one needs the doctors.' : c.plan === 'combined' ? 'Right: a remedy alongside the doctor\'s care.' : 'Right: herbal care fits here.'
    : c.emergency ? 'No: this is an emergency. Send them to the emergency department at once.' : `Not the best plan: the hospital recommends ${c.plan} care with ${c.remedies.map((id) => remedyById(id)?.name).join(' or ') || 'the doctors'}.`;
  return { ...gain(h, correct ? 12 : 0, correct ? 50 : 0, message, { consults: h.consults + 1 }), correct };
}

/** Patients for consultations, the same for a given seed: never only emergencies. */
export const consultPatient = (seed: number) => CONDITIONS[Math.abs(seed) % CONDITIONS.length];

// ——— The dispensary and your business ——————————————————————————————————

export function sell(h: HerbalState, remedyId: string): HerbalResult {
  if (rankOf(h) < 3) return fail('Running the dispensary starts at Experienced Herbalist.');
  const r = remedyById(remedyId);
  if (!r || (h.stock[remedyId] ?? 0) <= 0) return fail('None in stock.');
  const share = rankOf(h) >= 5 ? SALE_SHARE.master : SALE_SHARE.employee;
  const pay = Math.round(r.price * share);
  return gain(h, 3, pay, `Sold ${r.name}: ${pay} GHAI to you.`, { stock: { ...h.stock, [remedyId]: h.stock[remedyId] - 1 }, sold: h.sold + 1 });
}

// ——— Research ——————————————————————————————————————————————————————————

export interface ResearchQuestion { q: string; options: string[]; answer: number }
export interface ResearchProject {
  id: string;
  name: string;
  rank: number;
  /** What you must have done first. */
  needs: (h: HerbalState) => string | null;
  questions: readonly ResearchQuestion[];
  reward: string;
  xp: number;
}

const q = (question: string, options: string[], answer: number): ResearchQuestion => ({ q: question, options, answer });

export const RESEARCH: readonly ResearchProject[] = [
  {
    id: 'res-plant-survey', name: 'Garden plant survey', rank: 1, xp: 40,
    needs: (h) => Object.keys(h.identified).length >= 6 ? null : `Identify at least 6 different plants (${Object.keys(h.identified).length} so far).`,
    questions: [
      q('Which plant is sold as zobo?', ['Hibiscus (roselle)', 'Neem', 'Moringa'], 0),
      q('Which part of ginger is used?', ['Leaves', 'Rhizome', 'Seeds'], 1),
      q('Ewúro (Yoruba) and onugbu (Igbo) name which plant?', ['Bitter leaf', 'Scent leaf', 'Utazi'], 0),
    ],
    reward: 'Every harvest gives one more handful.',
  },
  {
    id: 'res-preparation-methods', name: 'Comparing preparation methods', rank: 3, xp: 60,
    needs: (h) => h.prepared >= 5 ? null : `Prepare at least 5 remedies (${h.prepared} so far).`,
    questions: [
      q('Before anything else, leaves are…', ['Boiled', 'Washed in clean water', 'Strained'], 1),
      q('Bitter leaf is squeezed to…', ['Soften its bitterness', 'Dry it out', 'Make it sweet'], 0),
      q('A tea is strained…', ['Before it boils', 'After it has steeped', 'Never'], 1),
    ],
    reward: 'A perfect preparation makes an extra bottle.',
  },
  {
    id: 'res-turmeric-recovery', name: 'Developing a recovery drink', rank: 4, xp: 80,
    needs: (h) => !h.research.includes('res-plant-survey') ? 'Finish the garden plant survey first.' : (h.harvests >= 6 ? null : `Harvest at least 6 times (${h.harvests} so far).`),
    questions: [
      q('Turmeric and ginger are both…', ['Rhizomes', 'Climbing vines', 'Trees'], 0),
      q('The recovery drink is for…', ['Emergencies instead of doctors', 'A lift and a short guard in the game', 'Curing real illness'], 1),
      q('Moringa is valued for its…', ['Bark', 'Leaves', 'Roots'], 1),
    ],
    reward: 'Unlocks the turmeric and ginger recovery drink.',
  },
  {
    id: 'res-lab-collaboration', name: 'Working with the laboratory', rank: 4, xp: 100,
    needs: (h) => h.consults >= 5 ? null : `See at least 5 patients in consultation (${h.consults} so far).`,
    questions: [
      q('A patient collapses with chest pain. You…', ['Prepare a tonic', 'Send them to emergency at once', 'Book them for next week'], 1),
      q('Lagoon fever (fictional) is cared for with…', ['Herbal care alone', 'Laboratory tests and a combined plan', 'Nothing'], 1),
      q('A deep cut that keeps bleeding needs…', ['The surgical team', 'Aloe gel only', 'A garden walk'], 0),
    ],
    reward: 'Counts towards Master Herbal Practitioner.',
  },
];

export const researchById = (id: string) => RESEARCH.find((r) => r.id === id);

export function doResearch(h: HerbalState, projectId: string, answers: readonly number[]): HerbalResult & { score?: number } {
  const p = researchById(projectId);
  if (!p) return fail('No such project.');
  if (h.research.includes(p.id)) return fail('Already finished.');
  if (rankOf(h) < p.rank) return fail(`Needs ${RANKS[p.rank].name}.`);
  const missing = p.needs(h);
  if (missing) return fail(missing);
  const score = p.questions.filter((qq, i) => answers[i] === qq.answer).length;
  if (score < p.questions.length) return { ok: true, herbal: h, xp: 0, pay: 0, message: `${score} of ${p.questions.length} right: check the plant guide and try again.`, score };
  return { ...gain(h, p.xp, 0, `Research complete: ${p.name}. ${p.reward}`, { research: [...h.research, p.id] }), score };
}

/** Every remedy and research project's references point at real plants and remedies. */
export function validateHerbal(): string[] {
  const problems: string[] = [];
  for (const r of REMEDIES) for (const id of Object.keys(r.ingredients)) if (!plantById(id)) problems.push(`${r.id}: unknown plant ${id}`);
  for (const r of REMEDIES) if (r.research && !researchById(r.research)) problems.push(`${r.id}: unknown research ${r.research}`);
  for (const c of CONDITIONS) for (const id of c.remedies) if (!remedyById(id)) problems.push(`${c.id}: unknown remedy ${id}`);
  return problems;
}

export function sanitiseHerbal(raw: unknown): HerbalState {
  const base = emptyHerbal();
  if (!raw || typeof raw !== 'object') return base;
  const p = raw as Record<string, unknown>;
  const int = (v: unknown, max = 1_000_000) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max ? v : 0);
  const counts = (v: unknown, known: (id: string) => boolean) =>
    Object.fromEntries(Object.entries(v && typeof v === 'object' ? (v as Record<string, unknown>) : {}).filter(([k]) => known(k)).map(([k, n]) => [k, int(n, 999)]).filter(([, n]) => (n as number) > 0));
  const garden = Array.isArray(p.garden) ? p.garden.slice(0, GARDEN_PLOTS) : [];
  return {
    xp: int(p.xp),
    trained: Array.isArray(p.trained) ? COURSES.map((c) => c.id).filter((id) => (p.trained as unknown[]).includes(id)) : [],
    identified: counts(p.identified, (id) => !!plantById(id)),
    garden: Array.from({ length: GARDEN_PLOTS }, (_, i) => {
      const g = garden[i] as { plant?: unknown; plantedAt?: unknown } | null | undefined;
      return g && typeof g.plant === 'string' && plantById(g.plant) && typeof g.plantedAt === 'number' && Number.isFinite(g.plantedAt) ? { plant: g.plant, plantedAt: g.plantedAt } : null;
    }),
    ingredients: counts(p.ingredients, (id) => !!plantById(id)),
    stock: counts(p.stock, (id) => !!remedyById(id)),
    research: Array.isArray(p.research) ? RESEARCH.map((r) => r.id).filter((id) => (p.research as unknown[]).includes(id)) : [],
    prepared: int(p.prepared), consults: int(p.consults), harvests: int(p.harvests), sold: int(p.sold),
  };
}
