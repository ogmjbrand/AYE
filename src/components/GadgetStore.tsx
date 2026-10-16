import { useEffect } from 'react';
import type { Career } from './CharacterCreation';
import { EQUIPMENT, GADGET_HUB, type EquipmentItem } from '../lib/equipment';

interface GadgetStoreProps {
  owned: readonly string[];
  balance: number;
  career: Career;
  onBuy: (item: EquipmentItem) => void;
  onClose: () => void;
}

/** The Gadget Hub: one-off purchases that change how you live and work. */
export function GadgetStore({ owned, balance, career, onBuy, onClose }: GadgetStoreProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Your own career's kit first, then the phone, then everything else
  const items = [...EQUIPMENT].sort((a, b) => rank(a, career) - rank(b, career));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gadget-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full flex-col rounded-t-2xl border border-ui-line bg-ui-panel text-ui-ink shadow-2xl sm:max-w-lg sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-ui-line p-5">
          <div>
            <p className="m-0 text-xs uppercase tracking-widest text-ui-muted">{GADGET_HUB.kind}</p>
            <h2 id="gadget-title" className="m-0 mt-1 font-display text-2xl font-bold">{GADGET_HUB.name}</h2>
            <p className="m-0 mt-1 text-sm text-ui-muted">Balance <span className="tabular-nums text-ui-ink">{balance.toLocaleString()} ⓒ</span></p>
          </div>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm text-ui-muted hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">Close</button>
        </header>
        <ul className="m-0 grid list-none gap-2 overflow-y-auto p-4">
          {items.map((item) => {
            const have = owned.includes(item.id);
            const useful = !item.career || item.career === career;
            return (
              <li key={item.id} className={`flex items-center gap-3 rounded-xl border p-3 ${useful ? 'border-ui-line' : 'border-ui-line/50 opacity-70'}`}>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-semibold">{item.name}</p>
                  <p className="m-0 text-xs text-ui-muted">{item.description}{!useful && ' Not for your career.'}</p>
                </div>
                {have ? (
                  <span className="shrink-0 text-xs font-semibold text-ui-accent-strong">Owned</span>
                ) : (
                  <button
                    type="button"
                    disabled={balance < item.price}
                    title={balance < item.price ? 'Not enough money' : undefined}
                    onClick={() => onBuy(item)}
                    className="shrink-0 rounded-md border border-ui-accent bg-ui-accent/20 px-3 py-1.5 text-xs font-semibold tabular-nums hover:bg-ui-accent/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Buy · {item.price.toLocaleString()} ⓒ
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const rank = (item: EquipmentItem, career: Career) => (item.career === career ? 0 : item.map ? 1 : 2);
