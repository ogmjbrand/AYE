import { useEffect, useRef, useState } from 'react';
import type { Celebration } from '../../lib/lifeState';
import { Icon } from './icons';

const SHOW_MS = 5200;

/**
 * Milestone toasts: missions, wishes, dream milestones, achievements, skill
 * levels and perks, each shown once as it happens (rewards are already in
 * your wallet by the time it appears).
 */
export function Celebrations({ items }: { items: readonly Celebration[] }) {
  const seen = useRef(new Set<string>());
  const [showing, setShowing] = useState<Celebration[]>([]);
  useEffect(() => {
    const fresh = items.filter((c) => !seen.current.has(c.id));
    if (!fresh.length) return;
    fresh.forEach((c) => seen.current.add(c.id));
    setShowing((s) => [...s, ...fresh].slice(-3));
    const ids = fresh.map((c) => c.id);
    // Not cleared on the next batch: each toast keeps its own time on screen
    setTimeout(() => setShowing((s) => s.filter((c) => !ids.includes(c.id))), SHOW_MS);
  }, [items]);
  if (!showing.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[9.5rem] z-50 flex flex-col items-center gap-2 px-3 sm:top-24" role="status" aria-live="polite">
      {showing.map((c) => (
        <div key={c.id} className="os-glass os-rise relative flex max-w-sm items-center gap-3 overflow-hidden rounded-2xl border border-ui-gold/50 px-4 py-2.5 text-ui-ink">
          <span className="os-shine pointer-events-none absolute inset-0" aria-hidden />
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ui-gold/20 text-ui-gold-strong"><Icon name={c.kind === 'Achievement' || c.kind === 'Dream milestone' ? 'skills' : c.kind === 'Perk unlocked' ? 'spark' : 'check'} /></span>
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-ui-gold-strong">{c.kind}</span>
            <span className="block truncate text-sm font-semibold">{c.text}</span>
          </span>
          {c.reward > 0 && <span className="shrink-0 text-sm font-bold tabular-nums text-ui-gold-strong">+{c.reward.toLocaleString()}</span>}
        </div>
      ))}
    </div>
  );
}
