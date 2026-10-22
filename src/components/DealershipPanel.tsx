import { useEffect, useState } from 'react';
import { CARS, carResale, type CarModel, type OwnedCar } from '../lib/cars';
import { CarBody } from '../world/CarBody';
import { Snapshot } from './snapshot/Snapshot';
import type { SnapshotJob } from './snapshot/store';
import { Icon } from './os/icons';

const carJob = (car: CarModel, color: string): SnapshotJob => ({
  key: `car:${car.id}:${color}`,
  scene: () => <CarBody model={car.id} color={color} />,
  view: [1, 0.55, 1.15],
  size: 320,
});

function Coin({ amount, dark = false }: { amount: number; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 font-display text-sm font-bold tabular-nums ${dark ? 'text-[#2a1c06]' : 'text-ui-gold-strong'}`}>
      <span className="grid h-4 w-4 place-items-center rounded-full bg-gradient-to-b from-[#f3d48f] to-[#b8862f] text-[#3a2606]"><Icon name="coin" className="h-3 w-3" /></span>
      {Math.round(amount).toLocaleString()}
    </span>
  );
}

/**
 * The car dealer: every model with its price, speed and fuel use. Pick a
 * colour and buy; cars you own can be sold back for half.
 */
export function DealershipPanel({ name, balance, owned, onBuy, onSell, onClose }: {
  name: string;
  balance: number;
  owned: readonly OwnedCar[];
  onBuy: (id: string, color: string) => void;
  onSell: (id: string) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState<CarModel | null>(null);
  const [color, setColor] = useState<string>('');
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (open) setOpen(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  const mine = (id: string) => owned.find((o) => o.id === id);
  const pick = (car: CarModel) => { setOpen(car); setColor(mine(car.id)?.color ?? car.colors[0]); setNote(null); };

  return (
    <aside role="dialog" aria-label={name}
      className="fixed inset-x-0 bottom-0 z-40 flex max-h-[80vh] flex-col rounded-t-3xl border border-ui-gold/40 bg-[#0d1412]/95 text-ui-ink shadow-2xl sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-[5.5rem] sm:max-h-[calc(100vh-11rem)] sm:w-[28rem] sm:rounded-3xl">
      <header className="flex shrink-0 items-center gap-3 border-b border-ui-gold/20 px-4 py-3">
        <button type="button" onClick={() => (open ? setOpen(null) : onClose())} aria-label={open ? 'Back to the showroom' : `Close ${name}`}
          className="grid h-9 w-9 place-items-center rounded-full border border-ui-gold/40 text-ui-gold-strong hover:border-ui-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
          <Icon name="back" className="h-4 w-4" />
        </button>
        <h2 className="m-0 font-display text-xl font-bold">{open ? open.name : name}</h2>
        <span className="ml-auto"><Coin amount={balance} /></span>
      </header>

      {!open ? (
        <ul className="m-0 grid min-h-0 list-none gap-2.5 overflow-y-auto p-3">
          {CARS.map((car) => {
            const have = mine(car.id);
            return (
              <li key={car.id}>
                <button type="button" onClick={() => pick(car)}
                  className="flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-ui-gold/20 bg-gradient-to-b from-[#1a2622] to-[#111916] p-2 text-left hover:border-ui-gold/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
                  <span className="block h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_40%,#2c3a34,#121a17)]">
                    <Snapshot job={carJob(car, have?.color ?? car.colors[0])} alt={car.name} className="h-full w-full" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{car.name}</span>
                    <span className="block text-[11px] text-ui-muted">{car.kind} · {Math.round(car.speed * 3.6)} km/h · {car.fuelPerKm} GHAI/km</span>
                    <span className="mt-1 block">{have ? <span className="text-xs font-semibold text-ui-accent-strong">Yours</span> : <Coin amount={car.price} />}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="min-h-0 overflow-y-auto p-4">
          <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl border border-ui-gold/20 bg-[radial-gradient(circle_at_50%_40%,#2c3a34,#121a17)]">
            <Snapshot job={carJob(open, color)} alt={`${open.name} in this colour`} className="h-full w-full" />
          </div>
          <p className="m-0 mt-3 text-sm text-ui-ink/90">{open.description}</p>
          <dl className="m-0 mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl border border-ui-line/70 p-2.5"><dt className="text-ui-muted">Top speed</dt><dd className="m-0 mt-0.5 font-semibold">{Math.round(open.speed * 3.6)} km/h</dd></div>
            <div className="rounded-xl border border-ui-line/70 p-2.5"><dt className="text-ui-muted">Fuel</dt><dd className="m-0 mt-0.5 font-semibold">{open.fuelPerKm} GHAI/km</dd></div>
            <div className="rounded-xl border border-ui-line/70 p-2.5"><dt className="text-ui-muted">Walking</dt><dd className="m-0 mt-0.5 font-semibold">{(open.speed / 4.2).toFixed(1)}× faster</dd></div>
          </dl>
          {!mine(open.id) && (
            <div className="mt-3">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-ui-muted">Colour</p>
              <div className="mt-1.5 flex gap-2" role="radiogroup" aria-label="Colour">
                {open.colors.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-full border-2 ${color === c ? 'border-ui-gold' : 'border-transparent'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold`} style={{ background: c }} />
                ))}
              </div>
            </div>
          )}
          {mine(open.id) ? (
            <button type="button" onClick={() => { onSell(open.id); setNote(`Sold the ${open.name} for ${carResale(open).toLocaleString()} GHAI.`); setOpen(null); }}
              className="mt-4 w-full rounded-2xl border border-ui-gold/40 px-4 py-3 font-semibold text-ui-gold-strong hover:border-ui-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
              Sell back · {carResale(open).toLocaleString()} GHAI
            </button>
          ) : (
            <button type="button" disabled={balance < open.price} onClick={() => { onBuy(open.id, color); setNote(`The ${open.name} is yours. Tap Drive on the bar to get in.`); setOpen(null); }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#e9c77e] to-[#b8862f] px-4 py-3 font-semibold text-[#2a1c06] shadow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:from-ui-line disabled:to-ui-line disabled:text-ui-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-gold">
              {balance < open.price ? 'Not enough GHAI' : <>Buy · <Coin amount={open.price} dark /></>}
            </button>
          )}
        </div>
      )}
      <footer className="shrink-0 border-t border-ui-gold/20 px-4 py-3 text-[11px] text-ui-muted" aria-live="polite">
        {note ?? 'Fuel is paid as you drive. Cars are the game’s own models; prices are in GHAI.'}
      </footer>
    </aside>
  );
}
