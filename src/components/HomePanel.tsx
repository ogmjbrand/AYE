import { useEffect, useState } from 'react';
import { MOVE_IN_NIGHTS, homeById, moveInFee, type Home } from '../lib/homes';

interface HomePanelProps {
  home: Home;
  /** The home the player rents now, if any. */
  currentHomeId: string | null;
  balance: number;
  onMoveIn: () => void;
  onMoveOut: () => void;
  onSleep: () => void;
  /** Walk inside (your own home only). */
  onGoInside?: () => void;
  onClose: () => void;
}

const BUTTON = 'w-full rounded-lg py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY = `${BUTTON} bg-ui-accent text-black hover:bg-ui-accent-strong`;
const SECONDARY = `${BUTTON} border border-ui-line text-ui-ink hover:border-ui-accent`;

/** The front door of a home: a listing to rent, or your own place to sleep in or leave. */
export function HomePanel({ home, currentHomeId, balance, onMoveIn, onMoveOut, onSleep, onGoInside, onClose }: HomePanelProps) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const mine = currentHomeId === home.id;
  const current = homeById(currentHomeId);
  const fee = moveInFee(home);
  const affordable = balance >= fee;

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
        aria-labelledby="home-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-2xl border border-ui-line bg-ui-panel text-ui-ink shadow-2xl sm:max-w-md sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-ui-line p-5">
          <div>
            <p className="m-0 text-xs uppercase tracking-widest text-ui-muted">{mine ? 'Your home' : `To let · ${home.kind}`}</p>
            <h2 id="home-title" className="m-0 mt-1 font-display text-2xl font-bold">{home.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm text-ui-muted hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">Close</button>
        </header>

        <div className="space-y-4 p-5">
          <p className="m-0 text-sm text-ui-muted">{home.description}</p>
          <dl className="m-0 grid grid-cols-2 gap-y-1.5 rounded-lg bg-black/20 p-3 text-sm">
            <dt className="text-ui-muted">Rent</dt>
            <dd className="m-0 text-right tabular-nums">{home.rentPerNight.toLocaleString()} ⓒ a night</dd>
            {!mine && (
              <>
                <dt className="text-ui-muted">Move-in fee</dt>
                <dd className="m-0 text-right tabular-nums">{fee.toLocaleString()} ⓒ</dd>
              </>
            )}
            <dt className="text-ui-muted">Your balance</dt>
            <dd className="m-0 text-right tabular-nums">{balance.toLocaleString()} ⓒ</dd>
          </dl>

          {mine ? (
            confirmLeave ? (
              <div className="space-y-3">
                <p className="m-0 text-sm">Give up {home.name}? The move-in fee isn't refunded, and you'll sleep rough until you rent again.</p>
                <button type="button" className={SECONDARY} onClick={() => { onMoveOut(); onClose(); }}>Yes, move out</button>
                <button type="button" className={PRIMARY} onClick={() => setConfirmLeave(false)}>Stay</button>
              </div>
            ) : (
              <div className="space-y-3">
                {onGoInside && <button type="button" autoFocus className={PRIMARY} onClick={onGoInside}>Go inside</button>}
                <button type="button" className={onGoInside ? SECONDARY : PRIMARY} onClick={onSleep}>Sleep here until 07:00</button>
                <button type="button" className={SECONDARY} onClick={() => setConfirmLeave(true)}>Move out</button>
                <p className="m-0 text-xs text-ui-muted">Rent is paid each night you sleep, wherever you sleep. If you can't pay, you lose the home.</p>
              </div>
            )
          ) : (
            <div className="space-y-3">
              <button type="button" autoFocus className={PRIMARY} disabled={!affordable} onClick={onMoveIn}>
                {current ? `Move here for ${fee.toLocaleString()} ⓒ` : `Rent it for ${fee.toLocaleString()} ⓒ`}
              </button>
              {!affordable && <p className="m-0 text-xs text-ui-warn">You need {(fee - balance).toLocaleString()} ⓒ more for the move-in fee.</p>}
              <p className="m-0 text-xs text-ui-muted">
                The move-in fee is {MOVE_IN_NIGHTS} nights' rent (agency fee and deposit, not refunded).
                {current && <> Moving here gives up {current.name}.</>}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
