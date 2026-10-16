import { useEffect } from 'react';
import { DISTRICTS, type District } from '../lib/geography';
import { homeById } from '../lib/homes';
import { TRAVEL_OPTIONS, formatDuration, type TravelMode } from '../lib/travel';

interface TravelPanelProps {
  from: District;
  balance: number;
  homeId: string | null;
  onTravel: (to: District, mode: TravelMode) => void;
  onClose: () => void;
}

/** A district's travel desk: flights and coaches to every other city. */
export function TravelPanel({ from, balance, homeId, onTravel, onClose }: TravelPanelProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const home = homeById(homeId);
  const destinations = DISTRICTS.filter((d) => d.id !== from.id);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="travel-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full flex-col rounded-t-2xl border border-ui-line bg-ui-panel text-ui-ink shadow-2xl sm:max-w-lg sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-ui-line p-5">
          <div>
            <p className="m-0 text-xs uppercase tracking-widest text-ui-muted">{from.travelDesk.kind}</p>
            <h2 id="travel-title" className="m-0 mt-1 font-display text-2xl font-bold">{from.travelDesk.name}</h2>
            <p className="m-0 mt-1 text-sm text-ui-muted">Balance <span className="tabular-nums text-ui-ink">{balance.toLocaleString()} ⓒ</span></p>
          </div>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm text-ui-muted hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">Close</button>
        </header>
        <div className="space-y-4 overflow-y-auto p-5">
          {destinations.map((d) => (
            <section key={d.id} aria-labelledby={`dest-${d.id}`}>
              <h3 id={`dest-${d.id}`} className="m-0 font-display text-lg font-semibold">{d.city.name}</h3>
              <p className="m-0 text-xs text-ui-muted">Arrive at {d.name}</p>
              <ul className="m-0 mt-2 grid list-none gap-2 p-0">
                {Object.values(TRAVEL_OPTIONS).map((o) => (
                  <li key={o.mode} className="flex items-center gap-3 rounded-xl border border-ui-line p-3">
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-sm font-semibold">{o.label} · {formatDuration(o.minutes)}</p>
                      <p className="m-0 text-xs text-ui-muted">{o.description}</p>
                    </div>
                    <button
                      type="button"
                      disabled={balance < o.fare}
                      title={balance < o.fare ? 'Not enough money' : undefined}
                      onClick={() => onTravel(d, o.mode)}
                      className="shrink-0 rounded-md border border-ui-accent bg-ui-accent/20 px-3 py-1.5 text-xs font-semibold tabular-nums hover:bg-ui-accent/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Book · {o.fare.toLocaleString()} ⓒ
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="m-0 text-xs text-ui-muted">
            The clock keeps running on the way: living costs and hunger carry on.
            {home && <> Your home at {home.name} stays rented while you're away, and its rent is still due each night.</>}
          </p>
        </div>
      </div>
    </div>
  );
}
