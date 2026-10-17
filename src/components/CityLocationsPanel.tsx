import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlayerHandle } from '../hooks/usePlayerController';
import type { District } from '../lib/geography';
import {
  ARRIVE_RADIUS,
  CATEGORY_LABEL,
  LOCATION_CATEGORIES,
  compass,
  distanceTo,
  matchesQuery,
  type LocationCategory,
  type LocationEntry,
} from '../lib/locations';

interface CityLocationsPanelProps {
  district: District;
  entries: readonly LocationEntry[];
  controller: PlayerHandle;
  trackedId: string | null;
  /** Whether the player is standing at this location right now (so its existing panel can open). */
  canUseNow: (entry: LocationEntry) => boolean;
  onTrack: (entry: LocationEntry) => void;
  onStopTracking: () => void;
  onUse: (entry: LocationEntry) => void;
  onClose: () => void;
}

const CARD =
  'flex w-full items-start gap-3 rounded-xl border border-ui-line bg-ui-panel/60 p-3 text-left transition hover:border-ui-accent focus-visible:outline-2 focus-visible:outline-ui-accent';
const CHIP =
  'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-ui-accent';
const BADGE = 'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]';

const categoryColor = (id: LocationCategory) => LOCATION_CATEGORIES.find((c) => c.id === id)!.color;
const categoryIndex = (e: LocationEntry) => LOCATION_CATEGORIES.findIndex((c) => c.id === e.category);

function Tile({ category, size = 'sm' }: { category: LocationCategory; size?: 'sm' | 'lg' }) {
  const label = CATEGORY_LABEL[category];
  return (
    <span
      aria-hidden
      className={`${size === 'lg' ? 'h-20 w-20 text-3xl' : 'h-12 w-12 text-lg'} flex shrink-0 items-center justify-center rounded-lg font-display font-bold text-black/70`}
      style={{ background: `linear-gradient(135deg, ${categoryColor(category)}, ${categoryColor(category)}99)` }}
    >
      {label.charAt(0)}
    </span>
  );
}

export function CityLocationsPanel({ district, entries, controller, trackedId, canUseNow, onTrack, onStopTracking, onUse, onClose }: CityLocationsPanelProps) {
  const [shown, setShown] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<LocationCategory | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, setFrame] = useState(0);
  const closeTimer = useRef(0);

  // Opening slides the sheet up; closing slides it down before unmounting
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);
  const close = useCallback(() => {
    setShown(false);
    closeTimer.current = window.setTimeout(onClose, 180);
  }, [onClose]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  // Distances follow the player while the panel is open
  useEffect(() => {
    const id = setInterval(() => setFrame((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

  const { x, z } = controller.position;
  const sorted = useMemo(
    () => [...entries].sort((a, b) => (a.built === b.built ? categoryIndex(a) - categoryIndex(b) || a.name.localeCompare(b.name) : a.built ? -1 : 1)),
    [entries],
  );
  const counts = useMemo(() => {
    const c = new Map<LocationCategory, number>();
    for (const e of sorted) c.set(e.category, (c.get(e.category) ?? 0) + 1);
    return c;
  }, [sorted]);
  const visible = sorted.filter((e) => (category === 'all' || e.category === category) && matchesQuery(e, query));
  const selected = selectedId ? entries.find((e) => e.id === selectedId) ?? null : null;

  const statusBadges = (e: LocationEntry) => (
    <>
      {!e.built && <span className={`${BADGE} bg-ui-warn/20 text-ui-warn`}>Not built yet</span>}
      {e.yours && <span className={`${BADGE} bg-ui-accent/20 text-ui-accent-strong`}>{e.category === 'stays' ? 'Your home' : 'Your career'}</span>}
      {e.id === trackedId && <span className={`${BADGE} bg-ui-accent/20 text-ui-accent-strong`}>Tracking</span>}
    </>
  );

  const distanceLabel = (e: LocationEntry) => {
    const d = distanceTo(e, x, z);
    if (d === null) return null;
    if (d < ARRIVE_RADIUS) return "You're here";
    return `${Math.round(d)} m ${compass(e.position![0] - x, e.position![2] - z)}`;
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 transition-opacity duration-200 motion-reduce:transition-none sm:items-center ${shown ? 'opacity-100' : 'opacity-0'}`}
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="locations-title"
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[90vh] w-full flex-col rounded-t-2xl border border-ui-line bg-ui-panel text-ui-ink shadow-2xl transition duration-200 ease-out motion-reduce:transition-none sm:max-w-2xl sm:rounded-2xl ${shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-ui-line p-5">
          <div className="min-w-0">
            <p className="m-0 text-xs uppercase tracking-[0.16em] text-ui-muted">{district.city.name} · {district.name}</p>
            <h2 id="locations-title" className="m-0 mt-1 font-display text-2xl font-bold">City locations</h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="shrink-0 rounded-lg border border-ui-line px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-ui-muted hover:border-ui-accent hover:text-ui-ink focus-visible:outline-2 focus-visible:outline-ui-accent"
          >
            Close
          </button>
        </header>

        {selected ? (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-xs uppercase tracking-[0.14em] text-ui-muted hover:text-ui-ink focus-visible:outline-2 focus-visible:outline-ui-accent"
            >
              ← All locations
            </button>
            <div className="flex items-start gap-4">
              <Tile category={selected.category} size="lg" />
              <div className="min-w-0">
                <p className="m-0 text-xs uppercase tracking-[0.14em] text-ui-muted">
                  {CATEGORY_LABEL[selected.category]}{selected.area ? ` · ${selected.area}` : ''}
                </p>
                <h3 className="m-0 mt-1 font-display text-2xl font-bold">{selected.name}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">{statusBadges(selected)}</div>
              </div>
            </div>
            <p className="m-0 text-sm text-ui-ink/90">{selected.description}</p>

            <dl className="m-0 grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-ui-line p-3">
                <dt className="text-[11px] uppercase tracking-[0.12em] text-ui-muted">Availability</dt>
                <dd className="m-0 mt-1">{selected.built ? 'Open to visit (no opening hours in this build)' : 'Not built yet'}</dd>
              </div>
              {selected.rentPerNight !== undefined && (
                <div className="rounded-lg border border-ui-line p-3">
                  <dt className="text-[11px] uppercase tracking-[0.12em] text-ui-muted">Rent</dt>
                  <dd className="m-0 mt-1 tabular-nums">{selected.rentPerNight.toLocaleString()} ⓒ a night</dd>
                </div>
              )}
              {distanceLabel(selected) && (
                <div className="rounded-lg border border-ui-line p-3">
                  <dt className="text-[11px] uppercase tracking-[0.12em] text-ui-muted">From you</dt>
                  <dd className="m-0 mt-1 tabular-nums">{distanceLabel(selected)}</dd>
                </div>
              )}
            </dl>

            <section aria-labelledby="activities-title">
              <h4 id="activities-title" className="m-0 text-[11px] uppercase tracking-[0.14em] text-ui-muted">Activities</h4>
              {selected.activities.length > 0 ? (
                <ul className="m-0 mt-2 list-none space-y-1.5 p-0 text-sm">
                  {selected.activities.map((a) => (
                    <li key={a} className="flex gap-2"><span aria-hidden className="text-ui-accent">•</span>{a}</li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 mt-2 text-sm text-ui-muted">Nothing to do here yet.</p>
              )}
            </section>

            <div className="flex flex-col gap-2 sm:flex-row">
              {selected.built && selected.position && (selected.id === trackedId ? (
                <button type="button" onClick={onStopTracking} className="flex-1 rounded-lg border border-ui-line px-4 py-2.5 text-sm font-semibold hover:border-ui-accent">
                  Stop tracking
                </button>
              ) : (
                <button type="button" onClick={() => onTrack(selected)} className="flex-1 rounded-lg border border-ui-accent bg-ui-accent/20 px-4 py-2.5 text-sm font-semibold hover:bg-ui-accent/30">
                  Track on the way
                </button>
              ))}
              {selected.built && selected.use && canUseNow(selected) && (
                <button type="button" onClick={() => onUse(selected)} className="flex-1 rounded-lg border border-ui-accent px-4 py-2.5 text-sm font-semibold hover:bg-ui-accent/20">
                  Use it now
                </button>
              )}
              {!selected.built && (
                <button type="button" disabled className="flex-1 rounded-lg border border-ui-line px-4 py-2.5 text-sm text-ui-muted disabled:cursor-not-allowed">
                  Not built yet
                </button>
              )}
            </div>
            {selected.built && selected.position && (
              <p className="m-0 text-xs text-ui-muted">
                Tracking shows a straight-line direction and distance. Roads and routing are not in this build.
              </p>
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-3 border-b border-ui-line p-4">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, area or activity"
                aria-label="Search locations"
                className="w-full rounded-lg border border-ui-line bg-black/30 px-3 py-2.5 text-sm text-ui-ink placeholder:text-ui-faint focus-visible:outline-2 focus-visible:outline-ui-accent"
              />
              <div role="group" aria-label="Filter by category" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  aria-pressed={category === 'all'}
                  onClick={() => setCategory('all')}
                  className={`${CHIP} ${category === 'all' ? 'border-ui-accent bg-ui-accent/20 text-ui-accent-strong' : 'border-ui-line text-ui-muted hover:text-ui-ink'}`}
                >
                  All · {sorted.length}
                </button>
                {LOCATION_CATEGORIES.filter((c) => counts.has(c.id)).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={category === c.id}
                    onClick={() => setCategory(c.id)}
                    className={`${CHIP} ${category === c.id ? 'border-ui-accent bg-ui-accent/20 text-ui-accent-strong' : 'border-ui-line text-ui-muted hover:text-ui-ink'}`}
                  >
                    {c.label} · {counts.get(c.id)}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {visible.length === 0 ? (
                <p className="m-0 py-10 text-center text-sm text-ui-muted">
                  No locations match{query ? ` "${query.trim()}"` : ' this filter'}. Try another search or category.
                </p>
              ) : (
                <ul className="m-0 grid list-none gap-2.5 p-0 sm:grid-cols-2">
                  {visible.map((e) => (
                    <li key={e.id}>
                      <button type="button" onClick={() => setSelectedId(e.id)} className={CARD} aria-label={`${e.name}, ${CATEGORY_LABEL[e.category]}`}>
                        <Tile category={e.category} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{e.name}</span>
                          <span className="block truncate text-xs text-ui-muted">
                            {CATEGORY_LABEL[e.category]}{e.area ? ` · ${e.area}` : ''}
                          </span>
                          <span className="mt-1 line-clamp-2 block text-xs text-ui-muted">{e.description}</span>
                          <span className="mt-2 flex flex-wrap items-center gap-1.5">
                            {statusBadges(e)}
                            {distanceLabel(e) && <span className="text-[11px] tabular-nums text-ui-muted">{distanceLabel(e)}</span>}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
