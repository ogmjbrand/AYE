import { useEffect, useMemo, useRef, useState } from 'react';
import type { Career } from './CharacterCreation';
import type { District } from '../lib/geography';
import { CATEGORIES, categoryCounts, cityDirectory, filterDirectory, type Category, type Destination, type Status } from '../lib/cityDirectory';

interface CityLocationsPanelProps {
  district: District;
  /** Where the player stands, for distances. */
  from: { x: number; z: number };
  career: Career;
  homeId: string | null;
  showRoute: boolean;
  onShowRouteChange: (show: boolean) => void;
  /** Starts walking there; returns why not if there's no way there. */
  onGo: (destination: Destination) => string | null;
  onClose: () => void;
}

const STATUS: Record<Status, { label: string; className: string }> = {
  open: { label: 'Open', className: 'border-ui-accent/60 text-ui-accent' },
  visit: { label: 'Visit only', className: 'border-ui-line text-ui-muted' },
  planned: { label: 'Planned', className: 'border-dashed border-ui-line text-ui-muted' },
};

const CHIP = 'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent';

/**
 * The ⋯ panel: every place in this part of the city by category, with search.
 * Choosing one walks you there with the click-to-move route finder.
 */
export function CityLocationsPanel({ district, from, career, homeId, showRoute, onShowRouteChange, onGo, onClose }: CityLocationsPanelProps) {
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [query, setQuery] = useState('');
  const [problem, setProblem] = useState<{ id: string; message: string } | null>(null);
  const search = useRef<HTMLInputElement>(null);

  const all = useMemo(() => cityDirectory(district, career, homeId), [district, career, homeId]);
  const counts = useMemo(() => categoryCounts(all), [all]);
  const shown = filterDirectory(all, category, query, from);

  useEffect(() => {
    search.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const go = (d: Destination) => {
    const why = onGo(d);
    setProblem(why ? { id: d.id, message: why } : null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="locations-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full flex-col rounded-t-2xl border border-ui-line bg-ui-panel text-ui-ink shadow-2xl sm:max-w-xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-ui-line p-4 sm:p-5">
          <div className="min-w-0">
            <p className="m-0 text-xs uppercase tracking-widest text-ui-muted">{district.name} · {district.city.name}</p>
            <h2 id="locations-title" className="m-0 mt-1 font-display text-2xl font-bold">City locations</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm text-ui-muted hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">Close</button>
        </header>

        <div className="space-y-3 border-b border-ui-line p-4 sm:px-5">
          <input
            ref={search}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search places, food, shops…"
            aria-label="Search city locations"
            className="w-full rounded-lg border border-ui-line bg-black/20 px-3 py-2 text-sm text-ui-ink placeholder:text-ui-muted focus:border-ui-accent focus:outline-none"
          />
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Categories">
            {[{ id: 'all' as const, label: 'All', count: all.length }, ...CATEGORIES.map((c) => ({ ...c, count: counts[c.id] }))].map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={category === c.id}
                onClick={() => setCategory(c.id)}
                className={`${CHIP} ${category === c.id ? 'border-ui-accent bg-ui-accent/20 text-ui-ink' : 'border-ui-line text-ui-muted hover:text-ui-ink'}`}
              >
                {c.label} <span className="tabular-nums opacity-70">{c.count}</span>
              </button>
            ))}
          </div>
        </div>

        <ul className="m-0 flex-1 list-none space-y-2 overflow-y-auto p-4 sm:px-5" aria-label="Places">
          {shown.length === 0 && <li className="py-6 text-center text-sm text-ui-muted">No places match “{query}”.</li>}
          {shown.map((d) => (
            <li key={d.id} className={`rounded-xl border p-3 ${d.status === 'planned' ? 'border-dashed border-ui-line opacity-75' : 'border-ui-line'}`}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="m-0 flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {d.name}
                    <span className={`rounded-full border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider ${STATUS[d.status].className}`}>{STATUS[d.status].label}</span>
                  </p>
                  <p className="m-0 text-xs text-ui-muted">{d.kind}</p>
                  <p className="m-0 mt-1 text-xs">{d.note}</p>
                </div>
                {d.status !== 'planned' && (
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs tabular-nums text-ui-muted">{Math.round(d.distance ?? 0)} m</span>
                    <button
                      type="button"
                      onClick={() => go(d)}
                      aria-label={`Go to ${d.name}`}
                      className="rounded-md border border-ui-accent bg-ui-accent/20 px-3 py-1.5 text-xs font-semibold hover:bg-ui-accent/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent"
                    >
                      Go
                    </button>
                  </div>
                )}
              </div>
              {problem?.id === d.id && <p role="alert" className="m-0 mt-2 rounded-md bg-ui-warn/10 px-2 py-1 text-xs text-ui-warn">{problem.message}</p>}
            </li>
          ))}
        </ul>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-ui-line p-4 text-xs text-ui-muted sm:px-5">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={showRoute} onChange={(e) => onShowRouteChange(e.target.checked)} className="accent-[#8ab4d8]" />
            Show the route on the ground
          </label>
          <span>Places in other cities appear when you travel there.</span>
        </footer>
      </div>
    </div>
  );
}
