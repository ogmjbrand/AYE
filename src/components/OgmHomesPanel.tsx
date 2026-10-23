import { useEffect, useState } from 'react';
import { BAND_LABEL, homeById, homesForSale, type Home } from '../lib/homes';
import { interiorFor } from '../lib/interiors';
import { Icon } from './os/icons';

function Coin({ amount, dark = false }: { amount: number; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 font-display text-sm font-bold tabular-nums ${dark ? 'text-[#2a1c06]' : 'text-ui-gold-strong'}`}>
      <span className="grid h-4 w-4 place-items-center rounded-full bg-gradient-to-b from-[#f3d48f] to-[#b8862f] text-[#3a2606]"><Icon name="coin" className="h-3 w-3" /></span>
      {Math.round(amount).toLocaleString()}
    </span>
  );
}

/**
 * OGM Homes, the estate agency: homes for sale (a starter home, a middle
 * class house and a luxury villa), bought outright in GHAI and yours with no
 * rent. A home you own can be moved back into at any time.
 */
export function OgmHomesPanel({ balance, homeId, owned, onBuy, onMoveIn, onClose }: {
  balance: number;
  /** The home you live in now. */
  homeId: string | null;
  owned: readonly string[];
  onBuy: (id: string) => void;
  onMoveIn: (id: string) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState<Home | null>(null);
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
  const current = homeById(homeId);
  const area = (h: Home) => { const i = interiorFor(h); return Math.round(i.width * i.depth); };

  return (
    <aside role="dialog" aria-label="OGM Homes"
      className="fixed inset-x-0 bottom-0 z-40 flex max-h-[80vh] flex-col rounded-t-3xl border border-ui-gold/40 bg-[#0d1412]/95 text-ui-ink shadow-2xl sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-[5.5rem] sm:max-h-[calc(100vh-11rem)] sm:w-[28rem] sm:rounded-3xl">
      <header className="flex shrink-0 items-center gap-3 border-b border-ui-gold/20 px-4 py-3">
        <button type="button" onClick={() => (open ? setOpen(null) : onClose())} aria-label={open ? 'Back to the listings' : 'Close OGM Homes'}
          className="grid h-9 w-9 place-items-center rounded-full border border-ui-gold/40 text-ui-gold-strong hover:border-ui-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
          <Icon name="back" className="h-4 w-4" />
        </button>
        <h2 className="m-0 font-display text-xl font-bold">{open ? open.name : 'OGM Homes'}</h2>
        <span className="ml-auto"><Coin amount={balance} /></span>
      </header>

      {!open ? (
        <div className="min-h-0 overflow-y-auto p-3">
          <p className="m-0 mb-3 rounded-xl border border-ui-gold/25 bg-ui-gold/10 px-3 py-2 text-xs text-ui-gold-strong">
            {current ? `You live at ${current.name}.` : 'You have no home right now.'} Every creator starts in a one-room flat to rent; when you're ready to buy, these are for sale.
          </p>
          <ul className="m-0 grid list-none gap-2.5 p-0">
            {homesForSale().map((h) => {
              const mine = owned.includes(h.id);
              return (
                <li key={h.id}>
                  <button type="button" onClick={() => { setOpen(h); setNote(null); }}
                    className="flex w-full flex-col gap-1 rounded-2xl border border-ui-gold/20 bg-gradient-to-b from-[#1a2622] to-[#111916] p-3 text-left hover:border-ui-gold/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ui-muted">{BAND_LABEL[h.band!]} · {area(h)} m²</span>
                    <span className="text-sm font-semibold">{h.name}</span>
                    <span className="text-[11px] text-ui-muted">{h.kind}</span>
                    <span className="mt-1">{mine ? <span className="text-xs font-semibold text-ui-accent-strong">Yours</span> : <Coin amount={h.price!} />}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="min-h-0 overflow-y-auto p-4">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-ui-muted">{BAND_LABEL[open.band!]} · {open.kind}</p>
          <p className="m-0 mt-2 text-sm text-ui-ink/90">{open.description}</p>
          <dl className="m-0 mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl border border-ui-line/70 p-2.5"><dt className="text-ui-muted">Floor</dt><dd className="m-0 mt-0.5 font-semibold">{area(open)} m²</dd></div>
            <div className="rounded-xl border border-ui-line/70 p-2.5"><dt className="text-ui-muted">Rent</dt><dd className="m-0 mt-0.5 font-semibold">None</dd></div>
            <div className="rounded-xl border border-ui-line/70 p-2.5"><dt className="text-ui-muted">Where</dt><dd className="m-0 mt-0.5 font-semibold">{open.building}</dd></div>
          </dl>
          {owned.includes(open.id) ? (
            <button type="button" disabled={homeId === open.id} onClick={() => { onMoveIn(open.id); setNote(`You've moved back into ${open.name}.`); setOpen(null); }}
              className="mt-4 w-full rounded-2xl border border-ui-gold/40 px-4 py-3 font-semibold text-ui-gold-strong hover:border-ui-gold disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
              {homeId === open.id ? 'You live here' : 'Move in (it’s yours)'}
            </button>
          ) : (
            <button type="button" disabled={balance < open.price!} onClick={() => { onBuy(open.id); setNote(`${open.name} is yours. Its door has a Home sign; no rent to pay.`); setOpen(null); }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#e9c77e] to-[#b8862f] px-4 py-3 font-semibold text-[#2a1c06] shadow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:from-ui-line disabled:to-ui-line disabled:text-ui-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-gold">
              {balance < open.price! ? `Not enough GHAI (${(open.price! - balance).toLocaleString()} more)` : <>Buy · <Coin amount={open.price!} dark /></>}
            </button>
          )}
          {!owned.includes(open.id) && current && !owned.includes(current.id) && <p className="m-0 mt-2 text-[11px] text-ui-muted">Buying moves you in and gives up {current.name}.</p>}
        </div>
      )}
      <footer className="shrink-0 border-t border-ui-gold/20 px-4 py-3 text-[11px] text-ui-muted" aria-live="polite">
        {note ?? 'Prices are in GHAI, the game’s own currency, not real money.'}
      </footer>
    </aside>
  );
}
