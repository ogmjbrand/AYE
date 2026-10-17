import { useEffect, useState } from 'react';
import { WAIT_OPTIONS, type Park, type WaitMinutes } from '../lib/parks';
import { formatGameTime, type GameTime } from '../lib/gameState';

interface ParkPanelProps {
  park: Park;
  time: GameTime;
  onWait: (minutes: WaitMinutes) => void;
  onClose: () => void;
}

const label = (m: number) => (m < 60 ? `${m} minutes` : m === 60 ? 'An hour' : `${m / 60} hours`);
const clockAfter = (t: GameTime, m: number) => {
  const total = t.hour * 60 + t.minute + m;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/** A park bench: sit for a while and let time pass. */
export function ParkPanel({ park, time, onWait, onClose }: ParkPanelProps) {
  const [sat, setSat] = useState<number | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="park-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-2xl border border-ui-line bg-ui-panel text-ui-ink shadow-2xl sm:max-w-md sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-ui-line p-5">
          <div>
            <p className="m-0 text-xs uppercase tracking-widest text-ui-muted">{park.kind} · {formatGameTime(time)}</p>
            <h2 id="park-title" className="m-0 mt-1 font-display text-2xl font-bold">{park.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm text-ui-muted hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">Close</button>
        </header>
        <div className="space-y-4 p-5">
          <p className="m-0 text-sm">{park.description}</p>
          {sat !== null ? (
            <p role="status" className="m-0 rounded-lg bg-black/20 px-3 py-2 text-sm">
              You sat for {label(sat).toLowerCase()}. It&rsquo;s now {formatGameTime(time)}.
            </p>
          ) : (
            <>
              <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-ui-muted">Sit on a bench</p>
              <ul className="m-0 grid list-none gap-2 p-0">
                {WAIT_OPTIONS.map((m) => (
                  <li key={m}>
                    <button
                      type="button"
                      onClick={() => { onWait(m); setSat(m); }}
                      className="flex w-full items-center justify-between rounded-xl border border-ui-line p-3 text-left text-sm hover:border-ui-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent"
                    >
                      <span className="font-semibold">{label(m)}</span>
                      <span className="text-xs text-ui-muted">until {clockAfter(time, m)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="m-0 text-xs text-ui-muted">The clock keeps running while you sit: living costs and hunger carry on, and you aren&rsquo;t paid.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
