import { useEffect, useMemo, useState } from 'react';
import { DISTRICTS, type District } from '../lib/geography';
import { homeById } from '../lib/homes';
import { countryName } from '../lib/places';
import { distanceKm, formatDuration, travelOptions, type TravelMode } from '../lib/travel';

interface TravelPanelProps {
  from: District;
  balance: number;
  homeId: string | null;
  onTravel: (to: District, mode: TravelMode) => void;
  onClose: () => void;
}

/** A district's travel desk: coaches and flights to every other city, grouped by country, nearest first. */
export function TravelPanel({ from, balance, homeId, onTravel, onClose }: TravelPanelProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const [query, setQuery] = useState('');

  const home = homeById(homeId);
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (d: District) =>
      !q || [d.city.name, d.city.region, d.name, countryName(d.city.country)].some((s) => s.toLowerCase().includes(q));
    const rows = DISTRICTS.filter((d) => d.id !== from.id && matches(d))
      .map((d) => ({ d, km: distanceKm(from.city, d.city), options: travelOptions(from.city, d.city) }))
      .sort((a, b) => a.km - b.km);
    // Your own country first, then the others by their nearest city
    const byCountry = new Map<string, typeof rows>();
    for (const r of rows) byCountry.set(r.d.city.country, [...(byCountry.get(r.d.city.country) ?? []), r]);
    return [...byCountry.entries()].sort(([a], [b]) => (a === from.city.country ? -1 : b === from.city.country ? 1 : 0));
  }, [from, query]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="travel-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full flex-col rounded-t-2xl border border-ui-line bg-ui-panel text-ui-ink shadow-2xl sm:max-w-lg sm:rounded-2xl"
      >
        <header className="border-b border-ui-line p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="m-0 text-xs uppercase tracking-widest text-ui-muted">{from.travelDesk.kind}</p>
              <h2 id="travel-title" className="m-0 mt-1 font-display text-2xl font-bold">{from.travelDesk.name}</h2>
              <p className="m-0 mt-1 text-sm text-ui-muted">Balance <span className="tabular-nums text-ui-ink">{balance.toLocaleString()} ⓒ</span></p>
            </div>
            <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm text-ui-muted hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">Close</button>
          </div>
          <label className="mt-3 block">
            <span className="sr-only">Find a city</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a city, state or country"
              className="w-full rounded-md border border-ui-line bg-transparent px-3 py-2 text-sm text-ui-ink placeholder:text-ui-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent"
            />
          </label>
        </header>
        <div className="space-y-5 overflow-y-auto p-5">
          {groups.length === 0 && <p className="m-0 text-sm text-ui-muted">No city matches “{query}”.</p>}
          {groups.map(([country, rows]) => (
            <section key={country} aria-labelledby={`country-${country}`}>
              <h3 id={`country-${country}`} className="m-0 text-xs uppercase tracking-widest text-ui-muted">
                {countryName(country)} · {rows.length} {rows.length === 1 ? 'city' : 'cities'}
              </h3>
              <ul className="m-0 mt-2 grid list-none gap-2 p-0">
                {rows.map(({ d, km, options }) => (
                  <li key={d.id} className="rounded-xl border border-ui-line p-3">
                    <p className="m-0 font-display text-base font-semibold">{d.city.name}</p>
                    <p className="m-0 text-xs text-ui-muted">{d.city.region} · {d.name} · {Math.round(km).toLocaleString()} km</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {options.map((o) => (
                        <button
                          key={o.mode}
                          type="button"
                          disabled={balance < o.fare}
                          title={balance < o.fare ? 'Not enough money' : o.description}
                          onClick={() => onTravel(d, o.mode)}
                          className="rounded-md border border-ui-accent bg-ui-accent/20 px-3 py-1.5 text-xs font-semibold tabular-nums hover:bg-ui-accent/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {o.label} · {formatDuration(o.minutes)} · {o.fare.toLocaleString()} ⓒ
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="m-0 text-xs text-ui-muted">
            Fares and journey times depend on the distance. The clock keeps running on the way: living costs and hunger carry on.
            {home && <> Your home at {home.name} stays rented while you're away, and its rent is still due each night.</>}
          </p>
        </div>
      </div>
    </div>
  );
}
