import { Utensils, X } from 'lucide-react';
import { dishById, suitsDiet, whyNot, type Diet, type Dish, type FoodVendor } from '../lib/food';
import { STALL_MINUTES } from '../lib/foodService';

/**
 * Ordering at a street stall: the menu at the window, paid on the spot, eaten
 * standing at the stall. No dining room; the street carries on round you.
 */
export function StallMenu({ vendor, diet, balance, eating, onBuy, onClose }: {
  vendor: FoodVendor;
  diet: Diet;
  balance: number;
  /** The dish being eaten now, if any. */
  eating: Dish | null;
  onBuy: (dish: Dish) => void;
  onClose: () => void;
}) {
  const dishes = vendor.menu.map(dishById).filter((d): d is Dish => !!d);
  return (
    <section role="dialog" aria-modal="false" aria-labelledby="stall-title"
      className="pointer-events-auto fixed inset-x-2 bottom-2 z-40 mx-auto flex max-h-[58dvh] max-w-md flex-col overflow-hidden rounded-2xl border border-ui-gold/30 bg-[#16120e]/95 text-ui-ink shadow-2xl landscape:max-h-[86dvh] landscape:inset-x-auto landscape:right-3 landscape:w-[22rem]"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <header className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <p className="m-0 text-[10px] uppercase tracking-[0.18em] text-ui-gold-strong">{vendor.kind} · at the stall</p>
          <h2 id="stall-title" className="m-0 truncate text-lg font-semibold">{vendor.name}</h2>
          <p className="m-0 text-[11px] text-ui-muted">Pay at the window and eat here on the pavement · about {STALL_MINUTES} minutes</p>
        </div>
        <button type="button" onClick={onClose} disabled={!!eating} aria-label="Leave the stall"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 text-white/75 hover:text-white disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
          <X size={18} />
        </button>
      </header>
      {eating ? (
        <p role="status" className="m-0 flex items-center gap-2 px-4 py-6 text-sm"><Utensils size={16} className="animate-pulse text-ui-gold-strong" aria-hidden="true" /> Eating {eating.name}…</p>
      ) : (
        <ul className="m-0 min-h-0 flex-1 list-none space-y-1.5 overflow-y-auto p-3">
          {dishes.map((d) => {
            const blocked = !suitsDiet(d, diet) ? whyNot(d, diet) : balance < d.price ? 'Not enough GHAI' : null;
            return (
              <li key={d.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-sm font-semibold">{d.name}</p>
                  <p className="m-0 line-clamp-2 text-[11px] text-ui-muted">{d.description}</p>
                  {blocked && <p className="m-0 text-[11px] text-ui-warn">{blocked}</p>}
                </div>
                <button type="button" disabled={!!blocked} onClick={() => onBuy(d)} aria-label={`Buy and eat ${d.name} for ${d.price} GHAI`}
                  className="min-h-11 shrink-0 rounded-xl bg-gradient-to-b from-[#f3d48f] to-[#b8862f] px-3 text-xs font-bold tabular-nums text-[#1d1406] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-gold">
                  {d.price} GHAI
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
