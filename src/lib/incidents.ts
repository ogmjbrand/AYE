/**
 * Dynamic emergency-response events: an occasional accept/decline mission
 * offered in the player's current district, auto-travelled to and resolved
 * with a short on-scene interaction. Pure and deterministic, like
 * lib/weather.ts, so it's testable without a GPU and doesn't change on
 * reload.
 */
import type { Career } from '../components/CharacterCreation';

export type IncidentKind = 'road-accident';
export type IncidentStage = 'offered' | 'travelling' | 'arrived' | 'complete';
export type IncidentObjective = 'treat' | 'assist';

export interface ActiveIncident {
  id: string;
  kind: IncidentKind;
  districtId: string;
  position: readonly [number, number, number];
  stage: IncidentStage;
  /** 'treat' for a doctor, 'assist' for everyone else (the only two careers this MVP covers). */
  objective: IncidentObjective;
  offeredAt: number;
}

export interface IncidentHistoryEntry {
  id: string;
  kind: IncidentKind;
  completedAt: number;
}

export const INCIDENT_HISTORY_SIZE = 20;
/** No new incident within this many game minutes of the last one offered. */
export const INCIDENT_COOLDOWN_MINUTES = 180;
/** How close the player must be to the scene to act on it. */
export const INCIDENT_INTERACT_RADIUS = 3;

const OFFER_CHANCE = 0.12;

/** A small, stable hash (same approach as lib/life.ts's mission picker), so a given
 * district/hour always rolls the same way: reproducible across a reload. */
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

function offerRoll(districtId: string, hourBucket: number): number {
  return (hash(`${districtId}:${hourBucket}`) % 10000) / 10000;
}

export function objectiveFor(career: Career): IncidentObjective {
  return career === 'doctor' ? 'treat' : 'assist';
}

export function rewardFor(objective: IncidentObjective): { amount: number; label: string } {
  return objective === 'treat'
    ? { amount: 280, label: 'Treated the injured at a road accident' }
    : { amount: 160, label: 'Assisted at a road accident' };
}

/**
 * Offers a new incident at most once per INCIDENT_COOLDOWN_MINUTES, anchored
 * at the district's own spawn point (an already-guaranteed-walkable, named
 * location used elsewhere for exactly this "safe known point" purpose) so
 * this doesn't need a new "find a safe spot on the road" generator.
 */
export function maybeOfferIncident(
  totalMinutes: number,
  lastOfferedAt: number,
  districtId: string,
  spawn: readonly [number, number, number],
  career: Career,
): ActiveIncident | null {
  if (totalMinutes - lastOfferedAt < INCIDENT_COOLDOWN_MINUTES) return null;
  const hourBucket = Math.floor(totalMinutes / 60);
  if (offerRoll(districtId, hourBucket) >= OFFER_CHANCE) return null;
  return {
    id: `road-accident:${districtId}:${totalMinutes}`,
    kind: 'road-accident',
    districtId,
    position: spawn,
    stage: 'offered',
    objective: objectiveFor(career),
    offeredAt: totalMinutes,
  };
}

const KINDS: readonly IncidentKind[] = ['road-accident'];
const STAGES: readonly IncidentStage[] = ['offered', 'travelling', 'arrived', 'complete'];
const OBJECTIVES: readonly IncidentObjective[] = ['treat', 'assist'];

function isTuple3(v: unknown): v is readonly [number, number, number] {
  return Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n));
}

/** Validated reconstruction for a saved game, like lib/save.ts's other sanitise* helpers. */
export function sanitiseActiveIncident(v: unknown): ActiveIncident | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (
    typeof o.id !== 'string' ||
    !(KINDS as readonly string[]).includes(o.kind as string) ||
    typeof o.districtId !== 'string' ||
    !isTuple3(o.position) ||
    !(STAGES as readonly string[]).includes(o.stage as string) ||
    !(OBJECTIVES as readonly string[]).includes(o.objective as string) ||
    typeof o.offeredAt !== 'number' || !Number.isFinite(o.offeredAt)
  ) {
    return null;
  }
  return {
    id: o.id, kind: o.kind as IncidentKind, districtId: o.districtId, position: o.position,
    stage: o.stage as IncidentStage, objective: o.objective as IncidentObjective, offeredAt: o.offeredAt,
  };
}

export function sanitiseIncidentHistory(v: unknown): IncidentHistoryEntry[] {
  if (!Array.isArray(v)) return [];
  const out: IncidentHistoryEntry[] = [];
  for (const entry of v) {
    if (typeof entry !== 'object' || entry === null) continue;
    const o = entry as Record<string, unknown>;
    if (typeof o.id === 'string' && (KINDS as readonly string[]).includes(o.kind as string) && typeof o.completedAt === 'number' && Number.isFinite(o.completedAt)) {
      out.push({ id: o.id, kind: o.kind as IncidentKind, completedAt: o.completedAt });
    }
  }
  return out.slice(-INCIDENT_HISTORY_SIZE);
}
