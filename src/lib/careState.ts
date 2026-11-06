/**
 * Your healthcare, saved with your game: the remedies in your cabinet, your diagnosis and the
 * care plan you chose, the optional extras you took on an emergency stay, and your herbal
 * profession (lib/herbalCareer.ts). Pure rules; the reducer applies time, money and effects.
 *
 * Every purchase is checked before anything is taken: the price, that you can afford it and
 * that you have room to carry it. Emergency treatment is free while your health is critical,
 * and emergency recovery never depends on what you can afford (lib/health.ts).
 */
import { CRITICAL } from './health';
import { CARE_SERVICES, CONDITIONS, RECOVERY_EXTRAS, conditionById, plansFor, serviceById, type CarePlanKind } from './healthcare';
import { remedyById } from './herbal';
import { emptyHerbal, sanitiseHerbal, type HerbalState } from './herbalCareer';

export interface CareState {
  /** Remedies you carry, by id. */
  cabinet: Record<string, number>;
  diagnosis: { condition: string; at: number; plan: CarePlanKind | null } | null;
  /** The extras taken on the current (or last) emergency stay, by the stay's start. */
  extras: { stay: number; taken: string[] } | null;
  herbal: HerbalState;
  /** Services and remedies had, for your record. */
  servicesHad: number;
  remediesTaken: number;
}

export function emptyCare(): CareState {
  return { cabinet: {}, diagnosis: null, extras: null, herbal: emptyHerbal(), servicesHad: 0, remediesTaken: 0 };
}

export type CareCheck = { ok: true } | { ok: false; reason: string };

export const cabinetCount = (c: CareState, id: string) => c.cabinet[id] ?? 0;

/** Can you buy this remedy at the dispensary now? */
export function canBuyRemedy(c: CareState, remedyId: string, balance: number, researched: readonly string[] = []): CareCheck {
  const r = remedyById(remedyId);
  if (!r) return { ok: false, reason: 'No such remedy.' };
  if (r.service) return { ok: false, reason: 'That is a treatment at the centre, not one to carry.' };
  if (r.research && !researched.includes(r.research)) return { ok: false, reason: 'Not on sale yet: the centre is still researching it.' };
  if (cabinetCount(c, r.id) >= r.max) return { ok: false, reason: `You can carry ${r.max}.` };
  if (balance < r.price) return { ok: false, reason: 'Not enough GHAI.' };
  return { ok: true };
}

export const addToCabinet = (c: CareState, id: string, n = 1): CareState => ({ ...c, cabinet: { ...c.cabinet, [id]: cabinetCount(c, id) + n } });

export function canTakeRemedy(c: CareState, remedyId: string, recovering: boolean): CareCheck {
  if (!remedyById(remedyId)) return { ok: false, reason: 'No such remedy.' };
  if (recovering) return { ok: false, reason: 'The ward is looking after you: no remedies during an emergency stay.' };
  if (cabinetCount(c, remedyId) <= 0) return { ok: false, reason: 'You have none.' };
  return { ok: true };
}

export function takeFromCabinet(c: CareState, id: string): CareState {
  const left = cabinetCount(c, id) - 1;
  const cabinet = { ...c.cabinet };
  if (left > 0) cabinet[id] = left; else delete cabinet[id];
  return { ...c, cabinet, remediesTaken: c.remediesTaken + 1 };
}

/** What a service costs you now: the emergency bay is free while your health is critical. */
export function servicePrice(serviceId: string, health: number): number {
  const s = serviceById(serviceId);
  if (!s) return Infinity;
  return s.freeWhenCritical && health <= CRITICAL ? 0 : s.price;
}

export function canHaveService(serviceId: string, balance: number, health: number, recovering: boolean): CareCheck {
  const s = serviceById(serviceId);
  if (!s) return { ok: false, reason: 'No such service.' };
  if (recovering) return { ok: false, reason: 'You are already being treated.' };
  if (balance < servicePrice(serviceId, health)) return { ok: false, reason: 'Not enough GHAI.' };
  return { ok: true };
}

/**
 * What a check-up, test or scan finds: a fictional condition, the same for the same minute.
 * A red-flag emergency is only found when your health really is critical.
 */
export function diagnose(now: number, health: number): string {
  if (health <= CRITICAL) return 'collapse';
  const everyday = CONDITIONS.filter((c) => !c.emergency);
  return everyday[Math.abs(Math.floor(now * 7.31)) % everyday.length].id;
}

export function choosePlan(c: CareState, plan: CarePlanKind): CareState | null {
  const condition = conditionById(c.diagnosis?.condition);
  if (!condition || !plansFor(condition).includes(plan)) return null;
  return { ...c, diagnosis: { ...c.diagnosis!, plan } };
}

/** An optional extra on an emergency stay: free, once each per stay. */
export function takeExtra(c: CareState, extraId: string, stay: number): CareState | null {
  if (!RECOVERY_EXTRAS.some((e) => e.id === extraId)) return null;
  const taken = c.extras?.stay === stay ? c.extras.taken : [];
  if (taken.includes(extraId)) return null;
  return { ...c, extras: { stay, taken: [...taken, extraId] } };
}

export function sanitiseCare(raw: unknown): CareState {
  const base = emptyCare();
  if (!raw || typeof raw !== 'object') return base;
  const p = raw as Record<string, unknown>;
  const int = (v: unknown, max = 1_000_000) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max ? v : 0);
  const cabinet = Object.fromEntries(Object.entries(p.cabinet && typeof p.cabinet === 'object' ? (p.cabinet as Record<string, unknown>) : {})
    .map(([id, n]) => [id, remedyById(id) && !remedyById(id)!.service ? Math.min(int(n, 99), remedyById(id)!.max) : 0] as const).filter(([, n]) => n > 0));
  const d = p.diagnosis as { condition?: unknown; at?: unknown; plan?: unknown } | null | undefined;
  const diagnosis = d && typeof d.condition === 'string' && conditionById(d.condition) && typeof d.at === 'number'
    ? { condition: d.condition, at: d.at, plan: (['modern', 'herbal', 'combined'] as const).find((k) => k === d.plan && plansFor(conditionById(d.condition as string)!).includes(k)) ?? null }
    : null;
  const e = p.extras as { stay?: unknown; taken?: unknown } | null | undefined;
  const extras = e && typeof e.stay === 'number' && Array.isArray(e.taken)
    ? { stay: e.stay, taken: RECOVERY_EXTRAS.map((x) => x.id as string).filter((id) => (e.taken as unknown[]).includes(id)) }
    : null;
  return { cabinet, diagnosis, extras, herbal: sanitiseHerbal(p.herbal), servicesHad: int(p.servicesHad), remediesTaken: int(p.remediesTaken) };
}

/** Every service is in a real department and priced. */
export const SERVICE_IDS = CARE_SERVICES.map((s) => s.id);
