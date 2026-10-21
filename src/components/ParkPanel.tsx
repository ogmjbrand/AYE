import { useEffect } from 'react';
import { WAIT_OPTIONS, type Park, type WaitMinutes } from '../lib/parks';
import { RUN_EFFECT_PER_30, RUN_OPTIONS, formatGameTime, type GameTime } from '../lib/gameState';

interface ParkPanelProps {
  park: Park;
  time: GameTime;
  /** Walk to a free bench and sit there while this much time passes. */
  onSit: (minutes: WaitMinutes) => void;
  /** Energy now (0 … 100): too tired, and you can't run. */
  energy: number;
  /** Go for a run (minutes). */
  onRun: (minutes: number) => void;
  onClose: () => void;
}

const label = (m: number) => (m < 60 ? `${m} minutes` : m === 60 ? 'An hour' : `${m / 60} hours`);
const clockAfter = (t: GameTime, m: number) => {
  const total = t.hour * 60 + t.minute + m;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/** A park bench: sit for a while and let time pass. */
export function ParkPanel({ park, time, energy, onSit, onRun, onClose }: ParkPanelProps) {
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
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-ui-muted">Sit on a bench</p>
          <ul className="m-0 grid list-none gap-2 p-0">
            {WAIT_OPTIONS.map((m) => (
              <li key={m}>
                <button
                  type="button"
                  onClick={() => onSit(m)}
                  className="flex w-full items-center justify-between rounded-xl border border-ui-line p-3 text-left text-sm hover:border-ui-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent"
                >
                  <span className="font-semibold">{label(m)}</span>
                  <span className="text-xs text-ui-muted">until {clockAfter(time, m)}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-ui-muted">Go for a run</p>
          <div className="grid grid-cols-2 gap-2">
            {RUN_OPTIONS.map((m) => (
              <button key={m} type="button" disabled={energy < 15} onClick={() => onRun(m)}
                className="rounded-xl border border-ui-line p-3 text-left text-sm hover:border-ui-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent disabled:cursor-not-allowed disabled:opacity-50">
                <span className="block font-semibold">{label(m)}</span>
                <span className="block text-xs text-ui-muted">until {clockAfter(time, m)} · +{(RUN_EFFECT_PER_30.fun * m) / 30} fun, {(RUN_EFFECT_PER_30.energy * m) / 30} energy, builds fitness</span>
              </button>
            ))}
          </div>
          {energy < 15 && <p className="m-0 text-xs text-ui-danger">Too tired to run. Rest first.</p>}
          <p className="m-0 text-xs text-ui-muted">The clock keeps running while you sit: living costs and hunger carry on, and you aren&rsquo;t paid. Get up any time; you&rsquo;re only charged for the time you sat.</p>
        </div>
      </div>
    </div>
  );
}
