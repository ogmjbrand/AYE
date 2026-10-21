import { useEffect, useState } from 'react';
import type { Diet } from '../lib/food';
import { COURSES, menuFor, orderProblem, suitsYou, type Course, type MenuItem } from '../lib/restaurant';
import { NEED_LABEL, type NeedKey } from '../lib/needs';
import { DishModel } from '../world/Dishes';
import { Snapshot } from './snapshot/Snapshot';
import type { SnapshotJob } from './snapshot/store';
import { Icon } from './os/icons';

const VIEW: Record<'food' | 'drink', [number, number, number]> = { food: [0.5, 1.2, 0.85], drink: [0.55, 0.42, 1] };

/** The 3D dish, rendered to a picture once per session. */
const dishJob = (item: MenuItem): SnapshotJob => ({
  key: `dish:${item.id}`,
  scene: () => <DishModel id={item.id} />,
  view: VIEW[item.course === 'drink' ? 'drink' : 'food'],
  size: 256,
});

function Coin({ amount, className = '' }: { amount: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-display font-bold tabular-nums text-ui-gold-strong ${className}`}>
      <span className="grid h-4 w-4 place-items-center rounded-full bg-gradient-to-b from-[#f3d48f] to-[#b8862f] text-[#3a2606]"><Icon name="coin" className="h-3 w-3" /></span>
      {amount.toLocaleString()}
    </span>
  );
}

/**
 * The Palms' menu: tabs for each course, a two-column grid of dishes with
 * their pictures and prices, and a detail view to order from. Ordering needs
 * a seat at a table (you can read the menu anywhere inside).
 */
export function RestaurantMenu({ diet, balance, seated, eating, kitchenOpen, onOrder, onClose }: {
  diet: Diet;
  kitchenOpen: boolean;
  balance: number;
  seated: boolean;
  /** What you're eating now, if anything (ordering waits until you've finished). */
  eating: string | null;
  onOrder: (item: MenuItem) => void;
  onClose: () => void;
}) {
  const [course, setCourse] = useState<Course | 'all'>('all');
  const [open, setOpen] = useState<MenuItem | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (open) setOpen(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  const items = menuFor(course);
  const problem = open ? (!kitchenOpen ? 'The kitchen is closed' : eating ? `Finish your ${eating} first` : orderProblem(open, diet, balance, seated)) : null;
  return (
    <aside
      role="dialog"
      aria-label="Menu"
      className="fixed inset-x-0 bottom-0 z-40 flex max-h-[78vh] flex-col rounded-t-3xl border border-ui-gold/40 bg-[#0d1412]/95 text-ui-ink shadow-2xl sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-[5.5rem] sm:max-h-[calc(100vh-11rem)] sm:w-[25rem] sm:rounded-3xl"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-ui-gold/20 px-4 py-3">
        <button type="button" onClick={() => (open ? setOpen(null) : onClose())} aria-label={open ? 'Back to the menu' : 'Close the menu'}
          className="grid h-9 w-9 place-items-center rounded-full border border-ui-gold/40 text-ui-gold-strong hover:border-ui-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
          <Icon name="back" className="h-4 w-4" />
        </button>
        <h2 className="m-0 font-display text-xl font-bold">{open ? open.name : 'Menu'}</h2>
        <span className="ml-auto"><Coin amount={Math.round(balance)} className="text-sm" /></span>
      </header>

      {!open && (
        <>
          <div role="tablist" aria-label="Courses" className="flex shrink-0 gap-1 overflow-x-auto px-3 pt-3">
            {COURSES.map((c) => (
              <button key={c.id} type="button" role="tab" aria-selected={course === c.id} onClick={() => setCourse(c.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold ${course === c.id ? 'bg-ui-gold text-[#2a1c06]' : 'border border-ui-gold/25 text-ui-ink/80 hover:border-ui-gold/60'}`}>
                {c.label}
              </button>
            ))}
          </div>
          {!seated && <p className="m-0 mx-4 mt-3 shrink-0 rounded-xl border border-ui-gold/25 bg-ui-gold/10 px-3 py-2 text-xs text-ui-gold-strong">Check in with the host or sit at a free table to order.</p>}
          <ul className="m-0 grid min-h-0 list-none grid-cols-2 gap-2.5 overflow-y-auto p-3">
            {items.map((item) => {
              const ok = suitsYou(item, diet);
              return (
                <li key={item.id}>
                  <button type="button" onClick={() => setOpen(item)}
                    className="group flex w-full flex-col overflow-hidden rounded-2xl border border-ui-gold/20 bg-gradient-to-b from-[#1a2622] to-[#111916] text-left transition hover:border-ui-gold/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
                    <span className="relative block aspect-[4/3] w-full bg-[radial-gradient(circle_at_50%_40%,#2c3a34,#121a17)]">
                      <Snapshot job={dishJob(item)} alt={item.name} className="h-full w-full" />
                      {!ok && <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-ui-danger">Not for your diet</span>}
                    </span>
                    <span className="flex flex-1 flex-col gap-1 px-2.5 py-2">
                      <span className={`text-[13px] font-semibold leading-tight ${ok ? '' : 'text-ui-muted'}`}>{item.name}</span>
                      <Coin amount={item.price} className="text-sm" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {open && (
        <div className="overflow-y-auto p-4">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-ui-gold/20 bg-[radial-gradient(circle_at_50%_40%,#2c3a34,#121a17)]">
            <Snapshot job={dishJob(open)} alt={open.name} className="h-full w-full" />
          </div>
          <p className="m-0 mt-3 text-sm text-ui-ink/90">{open.description}</p>
          <dl className="m-0 mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-ui-line/70 p-2.5"><dt className="text-ui-muted">Fills you</dt><dd className="m-0 mt-0.5 font-semibold">+{open.fullness} fullness</dd></div>
            <div className="rounded-xl border border-ui-line/70 p-2.5"><dt className="text-ui-muted">Takes</dt><dd className="m-0 mt-0.5 font-semibold">{open.minutes} minutes</dd></div>
            {(Object.entries(open.lift) as [NeedKey, number][]).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-ui-line/70 p-2.5"><dt className="text-ui-muted">Lifts</dt><dd className="m-0 mt-0.5 font-semibold">+{v} {NEED_LABEL[k].toLowerCase()}</dd></div>
            ))}
            <div className="rounded-xl border border-ui-line/70 p-2.5"><dt className="text-ui-muted">Contains</dt><dd className="m-0 mt-0.5 font-semibold capitalize">{open.contains.length ? open.contains.join(', ') : 'Plants only'}</dd></div>
          </dl>
          <button type="button" disabled={!!problem} onClick={() => { onOrder(open); setOpen(null); }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#e9c77e] to-[#b8862f] px-4 py-3 font-semibold text-[#2a1c06] shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-ui-line disabled:to-ui-line disabled:text-ui-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-gold">
            {problem ?? <>Order · <Coin amount={open.price} className="text-[#2a1c06]" /></>}
          </button>
          <p className="m-0 mt-2 text-center text-[11px] text-ui-faint">Prices are in GHAI, the game&rsquo;s own currency.</p>
        </div>
      )}
    </aside>
  );
}

/** The host's welcome at the desk. */
export function HostPanel({ name, open, onTable, onMenu, onClose }: { name: string; open: boolean; onTable: () => void; onMenu: () => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-label={`${name}, the host`} className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-md rounded-3xl border border-ui-gold/40 bg-[#0d1412]/95 p-4 text-ui-ink shadow-2xl sm:bottom-28">
      <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-ui-gold-strong">{name} · Host · computer-controlled</p>
      <p className="m-0 mt-2 text-sm">
        {open ? '“Good evening, and welcome to The Palms. A table for one? Right this way.”' : '“I’m sorry, the kitchen is closed. We open again at 11:00.”'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {open && (
          <button type="button" onClick={onTable} className="rounded-full bg-gradient-to-b from-[#e9c77e] to-[#b8862f] px-4 py-2 text-sm font-semibold text-[#2a1c06] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-gold">
            Show me to a table
          </button>
        )}
        <button type="button" onClick={onMenu} className="rounded-full border border-ui-gold/40 px-4 py-2 text-sm font-semibold text-ui-gold-strong hover:border-ui-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">See the menu</button>
        <button type="button" onClick={onClose} className="rounded-full px-3 py-2 text-sm text-ui-muted hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">Not now</button>
      </div>
    </div>
  );
}
