/**
 * Health and the no-death rule. In AYE every player survives.
 *
 * Rules (tunable):
 *   - Health runs from SURVIVAL_FLOOR (5) to 100. Nothing can take it lower:
 *     every source of harm goes through `damage`, which clamps to the floor.
 *   - At CRITICAL (10) or below you're in critical survival: further harm is
 *     halved, a warning shows, and you can use a healing item or call a medic.
 *   - At EMERGENCY (5) emergency recovery starts by itself, with no button to
 *     press: you're protected from all harm, taken to your recovery place and
 *     restored there over a short stay. Ordinary players go to hospital;
 *     players with Divine Evolution unlocked and a home go to the healing
 *     chamber in their sanctuary; on a mission with a field medic you're
 *     treated in the field. When the place isn't available, hospital is the
 *     fallback, and it always is.
 *   - Recovery is never charged for and never takes anything away: no money,
 *     items, property, career progress or achievements. Healing items are an
 *     extra option, never a requirement.
 *   - A single hit is capped (MAX_HIT) and bad values are ignored, so no one
 *     event can skip the critical stage. After recovery you're protected for
 *     a short while so nothing can knock you straight back down.
 *   - The state is saved; an interrupted recovery carries on after a reload,
 *     and a save stuck at the floor starts its recovery on load.
 *
 * Health checks run in the game reducer on this device until AYE's server
 * exists; then the server applies damage and recovery and the client only
 * shows the result (docs/SURVIVAL.md).
 */

export const MAX_HEALTH = 100;
export const CRITICAL = 10;
export const EMERGENCY = 5;
/** The lowest health can ever be. */
export const SURVIVAL_FLOOR = EMERGENCY;
/** No single event can take more than this. */
export const MAX_HIT = 35;
/** Share of harm taken while critical. */
export const CRITICAL_DAMAGE_SHARE = 0.5;
/** Game minutes of full protection after a recovery ends. */
export const PROTECTION_MINUTES = 30;
/** How long a stay takes, in game minutes. */
export const RECOVERY_MINUTES = { hospital: 60, sanctuary: 30, field: 15 } as const;
/** A medic reaches you after this many game minutes and restores MEDIC_HEAL. */
export const MEDIC_MINUTES = 8;
export const MEDIC_HEAL = 35;
/** You can call a medic at or below this. */
export const MEDIC_THRESHOLD = 50;
/** Natural recovery per game minute while fed and rested. */
export const REGEN_PER_MINUTE = 0.05;
/** Harm per game minute from going without food or sleep. */
export const STARVING_PER_MINUTE = 0.12;
export const EXHAUSTED_PER_MINUTE = 0.08;
/** Health back from a night's sleep. */
export const SLEEP_HEAL = { home: 50, away: 25 } as const;
/** Game minutes between uses of healing items. */
export const ITEM_COOLDOWN = 3;

export type RecoveryPlace = keyof typeof RECOVERY_MINUTES;

export interface Recovery {
  place: RecoveryPlace;
  /** What happened, in a few words ("went without food too long"). */
  reason: string;
  /** Health when it started. */
  from: number;
  startedAt: number;
  until: number;
}

export interface Health {
  value: number;
  recovery: Recovery | null;
  /** No harm until this game minute (after a recovery). */
  protectedUntil: number;
  /** A medic on the way: when they arrive. */
  medicAt: number | null;
  /** Healing items you own, by item id. */
  kit: Record<string, number>;
  lastItemAt: number;
  /** Times emergency recovery has looked after you, by place. */
  rescues: Record<RecoveryPlace, number>;
  /** Times a medic treated you. */
  medicVisits: number;
  /** The last thing that hurt you. */
  lastHurt: { reason: string; at: number } | null;
}

export function emptyHealth(): Health {
  return {
    value: MAX_HEALTH,
    recovery: null,
    protectedUntil: 0,
    medicAt: null,
    kit: {},
    lastItemAt: -Infinity,
    rescues: { hospital: 0, sanctuary: 0, field: 0 },
    medicVisits: 0,
    lastHurt: null,
  };
}

const clamp = (n: number) => Math.max(SURVIVAL_FLOOR, Math.min(MAX_HEALTH, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

export type HealthStatus = 'healthy' | 'hurt' | 'low' | 'critical' | 'recovering';

export function healthStatus(h: Health): HealthStatus {
  if (h.recovery) return 'recovering';
  if (h.value <= CRITICAL) return 'critical';
  if (h.value <= 25) return 'low';
  if (h.value < 75) return 'hurt';
  return 'healthy';
}

/** Where you can go to recover. Anything unavailable falls back to hospital. */
export interface RecoveryContext {
  /** Divine Evolution unlocked. */
  supernatural: boolean;
  /** You have a home with its sanctuary to return to. */
  hasSanctuary: boolean;
  /** On a mission with a field medic who can reach you. */
  fieldMedic?: boolean;
}

export function recoveryPlace(ctx: RecoveryContext): RecoveryPlace {
  if (ctx.fieldMedic) return 'field';
  if (ctx.supernatural && ctx.hasSanctuary) return 'sanctuary';
  return 'hospital';
}

export const isProtected = (h: Health, now: number) => !!h.recovery || now < h.protectedUntil;

function startRecovery(h: Health, reason: string, now: number, ctx: RecoveryContext): Health {
  const place = recoveryPlace(ctx);
  return {
    ...h,
    value: SURVIVAL_FLOOR,
    medicAt: null,
    recovery: { place, reason, from: h.value, startedAt: now, until: now + RECOVERY_MINUTES[place] },
    rescues: { ...h.rescues, [place]: h.rescues[place] + 1 },
  };
}

/**
 * Harm from any source. Never takes health below the survival floor; at the
 * emergency threshold recovery begins by itself. Ignored while protected and
 * for amounts that aren't a positive number.
 */
export function damage(h: Health, amount: number, reason: string, now: number, ctx: RecoveryContext): Health {
  if (!Number.isFinite(amount) || amount <= 0 || isProtected(h, now)) return h;
  const share = h.value <= CRITICAL ? CRITICAL_DAMAGE_SHARE : 1;
  const value = clamp(round2(h.value - Math.min(amount, MAX_HIT) * share));
  const hurt = { ...h, value, lastHurt: { reason, at: now } };
  return value <= EMERGENCY ? startRecovery(hurt, reason, now, ctx) : hurt;
}

/** Healing (items, medics, rest). Never during a recovery, which restores you itself. */
export function healBy(h: Health, amount: number): Health {
  if (!Number.isFinite(amount) || amount <= 0 || h.recovery) return h;
  const value = clamp(round2(h.value + amount));
  return value === h.value ? h : { ...h, value };
}

/** Health during a stay rises steadily from where it started to full. */
export function recoveryProgress(r: Recovery, now: number): number {
  const span = Math.max(1, r.until - r.startedAt);
  return Math.max(0, Math.min(1, (now - r.startedAt) / span));
}

function finishRecovery(h: Health, now: number): Health {
  return { ...h, value: MAX_HEALTH, recovery: null, protectedUntil: now + PROTECTION_MINUTES };
}

/**
 * One game minute. Recovery advances (and ends on time), a medic who has
 * arrived treats you, and otherwise health drifts: down while starving or
 * exhausted, slowly up while fed and rested.
 */
export function passHealthMinute(h: Health, now: number, ctx: RecoveryContext & { starving: boolean; exhausted: boolean; resting: boolean }): Health {
  if (h.recovery) {
    if (now >= h.recovery.until) return finishRecovery(h, now);
    const value = round2(SURVIVAL_FLOOR + (MAX_HEALTH - SURVIVAL_FLOOR) * recoveryProgress(h.recovery, now));
    return value === h.value ? h : { ...h, value };
  }
  let next = h;
  if (next.medicAt !== null && now >= next.medicAt) {
    next = { ...healBy({ ...next, medicAt: null }, MEDIC_HEAL), medicAt: null, medicVisits: next.medicVisits + 1 };
  }
  if (ctx.starving) next = damage(next, STARVING_PER_MINUTE, 'went without food too long', now, ctx);
  if (ctx.exhausted) next = damage(next, EXHAUSTED_PER_MINUTE, 'pushed on without sleep', now, ctx);
  if (!ctx.starving && !ctx.exhausted && !next.recovery && next.value < MAX_HEALTH) {
    next = healBy(next, REGEN_PER_MINUTE * (ctx.resting ? 2 : 1));
  }
  return next;
}

export type HealthCheck = { ok: true } | { ok: false; reason: string };

export function canCallMedic(h: Health): HealthCheck {
  if (h.recovery) return { ok: false, reason: 'You’re already being looked after.' };
  if (h.medicAt !== null) return { ok: false, reason: 'A medic is on the way.' };
  if (h.value > MEDIC_THRESHOLD) return { ok: false, reason: `Medics come out for health at ${MEDIC_THRESHOLD} or below.` };
  return { ok: true };
}

/** Calls a medic: free, and they reach you in a few minutes. */
export function callMedic(h: Health, now: number): Health {
  return canCallMedic(h).ok ? { ...h, medicAt: now + MEDIC_MINUTES } : h;
}

/** A night's sleep heals too. */
export function sleepHeal(h: Health, atHome: boolean): Health {
  return healBy(h, atHome ? SLEEP_HEAL.home : SLEEP_HEAL.away);
}

/** Harm from a car crash at this impact speed (metres a second): nothing below 6, up to a hard knock at full speed. */
export function crashDamage(impact: number): number {
  if (!Number.isFinite(impact) || impact < 6) return 0;
  return Math.min(MAX_HIT, Math.round((impact - 6) * 3.5 + 6));
}

// ── Healing items ───────────────────────────────────────────────────────────

export interface MedicalItem {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Health restored. */
  heal: number;
  /** Supernatural energy restored (sanctuary resources). */
  spirit?: number;
  /** Game minutes it takes to use. */
  minutes: number;
  /** Needs Divine Evolution unlocked to buy or use. */
  supernatural?: boolean;
  /** How many you can carry. */
  max: number;
}

export const MEDICAL_ITEMS: readonly MedicalItem[] = [
  { id: 'med-plasters', name: 'Plasters & antiseptic', description: 'For cuts and scrapes. Takes a minute.', price: 40, heal: 8, minutes: 1, max: 10 },
  { id: 'med-first-aid', name: 'First-aid kit', description: 'Bandages, dressings and painkillers: modest relief, fast.', price: 150, heal: 20, minutes: 2, max: 5 },
  { id: 'med-pack', name: 'Advanced medical pack', description: 'Stronger field treatment for serious injuries.', price: 450, heal: 40, minutes: 4, max: 3 },
  { id: 'med-trauma', name: 'Emergency trauma kit', description: 'Tourniquet, haemostatic dressings and a splint: for the worst moments.', price: 900, heal: 60, minutes: 6, max: 2 },
  { id: 'med-spirit', name: 'Sanctuary restorative', description: 'Restores health and supernatural energy. For Divine Evolution players.', price: 600, heal: 25, spirit: 40, minutes: 3, supernatural: true, max: 3 },
];

export const medicalItem = (id: string) => MEDICAL_ITEMS.find((i) => i.id === id);
export const kitCount = (h: Health, id: string) => h.kit[id] ?? 0;
export const kitTotal = (h: Health) => Object.values(h.kit).reduce((a, b) => a + b, 0);

export function canBuyMedical(h: Health, item: MedicalItem, balance: number, supernatural: boolean): HealthCheck {
  if (item.supernatural && !supernatural) return { ok: false, reason: 'For Divine Evolution players.' };
  if (kitCount(h, item.id) >= item.max) return { ok: false, reason: `You can carry ${item.max}.` };
  if (balance < item.price) return { ok: false, reason: 'Not enough GHAI.' };
  return { ok: true };
}

export function addToKit(h: Health, id: string): Health {
  return { ...h, kit: { ...h.kit, [id]: kitCount(h, id) + 1 } };
}

export function canUseItem(h: Health, item: MedicalItem, now: number, supernatural: boolean): HealthCheck {
  if (kitCount(h, item.id) <= 0) return { ok: false, reason: 'You have none.' };
  if (item.supernatural && !supernatural) return { ok: false, reason: 'For Divine Evolution players.' };
  if (h.recovery) return { ok: false, reason: 'You’re already being looked after.' };
  if (now - h.lastItemAt < ITEM_COOLDOWN) return { ok: false, reason: 'Give the last treatment a moment.' };
  if (h.value >= MAX_HEALTH && !item.spirit) return { ok: false, reason: 'You’re at full health.' };
  return { ok: true };
}

/** The strongest item you can use right now, if any. */
export function bestUsableItem(h: Health, now: number, supernatural: boolean): MedicalItem | null {
  const usable = MEDICAL_ITEMS.filter((i) => canUseItem(h, i, now, supernatural).ok);
  return usable.sort((a, b) => b.heal - a.heal)[0] ?? null;
}

/** Uses one item from your kit: it's gone, and you heal by its amount. */
export function applyItem(h: Health, item: MedicalItem, now: number): Health {
  const left = kitCount(h, item.id) - 1;
  const kit = { ...h.kit };
  if (left > 0) kit[item.id] = left;
  else delete kit[item.id];
  return { ...healBy(h, item.heal), kit, lastItemAt: now };
}

// ── Saves ───────────────────────────────────────────────────────────────────

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const PLACES: readonly RecoveryPlace[] = ['hospital', 'sanctuary', 'field'];

/** Loads health from a save. Missing → full health; at the floor with no recovery → recovery starts. */
export function sanitiseHealth(data: unknown, now: number): Health {
  const base = emptyHealth();
  if (!data || typeof data !== 'object') return base;
  const d = data as Record<string, unknown>;
  const kit: Record<string, number> = {};
  if (d.kit && typeof d.kit === 'object') {
    for (const [id, n] of Object.entries(d.kit as Record<string, unknown>)) {
      const item = medicalItem(id);
      const count = Math.floor(num(n, 0));
      if (item && count > 0) kit[id] = Math.min(item.max, count);
    }
  }
  const r = d.recovery as Record<string, unknown> | null | undefined;
  let recovery: Recovery | null = null;
  if (r && typeof r === 'object' && PLACES.includes(r.place as RecoveryPlace)) {
    const place = r.place as RecoveryPlace;
    const startedAt = Math.min(num(r.startedAt, now), now);
    // A stay never lasts longer than its place allows, whatever the save says
    const until = Math.min(num(r.until, startedAt + RECOVERY_MINUTES[place]), startedAt + RECOVERY_MINUTES[place]);
    recovery = { place, reason: typeof r.reason === 'string' ? r.reason.slice(0, 80) : 'emergency recovery', from: clamp(num(r.from, SURVIVAL_FLOOR)), startedAt, until };
  }
  const rescues = { ...base.rescues };
  if (d.rescues && typeof d.rescues === 'object') {
    for (const p of PLACES) rescues[p] = Math.max(0, Math.floor(num((d.rescues as Record<string, unknown>)[p], 0)));
  }
  const lastHurt = d.lastHurt && typeof d.lastHurt === 'object' && typeof (d.lastHurt as { reason?: unknown }).reason === 'string'
    ? { reason: String((d.lastHurt as { reason: string }).reason).slice(0, 80), at: num((d.lastHurt as { at?: unknown }).at, now) }
    : null;
  const h: Health = {
    value: clamp(num(d.value, MAX_HEALTH)),
    recovery,
    protectedUntil: Math.min(num(d.protectedUntil, 0), now + PROTECTION_MINUTES),
    medicAt: d.medicAt === null || d.medicAt === undefined ? null : Math.min(num(d.medicAt, now), now + MEDIC_MINUTES),
    kit,
    lastItemAt: Math.min(num(d.lastItemAt, -Infinity), now),
    rescues,
    medicVisits: Math.max(0, Math.floor(num(d.medicVisits, 0))),
    lastHurt,
  };
  // Never left stranded at the floor: a save from mid-emergency resumes its recovery
  if (!h.recovery && h.value <= EMERGENCY) {
    return { ...h, recovery: { place: 'hospital', reason: 'emergency recovery', from: h.value, startedAt: now, until: now + RECOVERY_MINUTES.hospital } };
  }
  return h;
}
