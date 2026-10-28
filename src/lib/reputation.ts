/**
 * Reputation: what the city thinks of you, in a few separate ways, built by
 * what you actually do (helping at events, running a business well). It never
 * goes below zero and can always be rebuilt, so one bad moment doesn't follow
 * you for good. Unknown is a fine place to start: nothing basic needs it.
 */
export type RepId = 'community' | 'professional' | 'business' | 'social' | 'fashion';

export const REPUTATIONS: readonly { id: RepId; label: string; how: string }[] = [
  { id: 'community', label: 'Community trust', how: 'Help people at accidents and emergencies, and find the lost.' },
  { id: 'professional', label: 'Professional standing', how: 'Use your career’s skills when it matters, and finish what you start.' },
  { id: 'business', label: 'Business reputation', how: 'Help businesses through busy times, and run them well.' },
  { id: 'social', label: 'Social popularity', how: 'Be there for people.' },
  { id: 'fashion', label: 'Fashion influence', how: 'Win showcases and competitions.' },
];

export type Reputation = Record<RepId, number>;

export const MAX_REPUTATION = 1000;

export function emptyReputation(): Reputation {
  return { community: 0, professional: 0, business: 0, social: 0, fashion: 0 };
}

const clamp = (n: number) => Math.max(0, Math.min(MAX_REPUTATION, Math.round(n)));

export function addReputation(r: Reputation, change: Partial<Record<RepId, number>>): Reputation {
  const next = { ...r };
  for (const [k, v] of Object.entries(change) as [RepId, number][]) if (k in next && Number.isFinite(v)) next[k] = clamp(next[k] + v);
  return next;
}

/** Standing names, from the points needed to reach them. */
export const TIERS: readonly { min: number; name: string }[] = [
  { min: 0, name: 'Unknown' },
  { min: 25, name: 'Known locally' },
  { min: 100, name: 'Respected' },
  { min: 300, name: 'Renowned' },
  { min: 700, name: 'Legendary' },
];

export function tierOf(points: number): { index: number; name: string; next: number | null } {
  let index = 0;
  for (let i = 0; i < TIERS.length; i++) if (points >= TIERS[i].min) index = i;
  return { index, name: TIERS[index].name, next: TIERS[index + 1]?.min ?? null };
}

export function sanitiseReputation(data: unknown): Reputation {
  const r = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  const out = emptyReputation();
  for (const k of Object.keys(out) as RepId[]) out[k] = typeof r[k] === 'number' && Number.isFinite(r[k]) ? clamp(r[k] as number) : 0;
  return out;
}
