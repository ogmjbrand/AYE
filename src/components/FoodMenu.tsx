import { useEffect, useMemo, useState } from 'react';
import { DIETS, dietBadge, dishById, suitsDiet, whyNot, type Diet, type Dish, type FoodVendor } from '../lib/food';
import { hungerLabel } from '../lib/gameState';

interface FoodMenuProps {
  vendor: FoodVendor;
  diet: Diet;
  balance: number;
  fullness: number;
  onEat: (dish: Dish) => void;
  onClose: () => void;
}

/** Menu for one food vendor. Shows the dishes that suit the player's diet first. */
export function FoodMenu({ vendor, diet, balance, fullness, onEat, onClose }: FoodMenuProps) {
  const [showAll, setShowAll] = useState(false);
  const [lastMeal, setLastMeal] = useState<string | null>(null);
  const dishes = useMemo(() => vendor.menu.map((id) => dishById(id)!).filter(Boolean), [vendor]);
  const suitable = dishes.filter((d) => suitsDiet(d, diet));
  const shown = showAll ? dishes : suitable;
  const dietLabel = DIETS.find((d) => d.id === diet)!.label;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 pointer-events-auto" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="food-menu-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xl max-h-[85vh] flex flex-col bg-ui-panel border border-ui-line rounded-t-xl sm:rounded-xl text-ui-ink shadow-2xl"
      >
        <header className="p-5 border-b border-ui-line flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-ui-muted">{vendor.kind}</p>
            <h2 id="food-menu-title" className="font-display text-2xl font-bold">{vendor.name}</h2>
            <p className="text-sm text-ui-muted mt-1">
              Your diet: <span className="text-ui-ink">{dietLabel}</span> · {hungerLabel(fullness)} · {balance.toLocaleString()} GHAI
            </p>
          </div>
          <button onClick={onClose} className="text-ui-muted hover:text-ui-ink text-sm px-2 py-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent" aria-label="Close menu">
            Close
          </button>
        </header>

        {lastMeal && (
          <p className="mx-5 mt-4 text-sm px-3 py-2 rounded bg-ui-accent/15 text-ui-accent-strong" role="status">
            You ate {lastMeal}.
          </p>
        )}

        <ul className="overflow-y-auto p-5 grid gap-3">
          {shown.map((dish) => {
            const reason = whyNot(dish, diet);
            const tooPricey = balance < dish.price;
            const badge = dietBadge(dish);
            return (
              <li key={dish.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 p-3 rounded-lg border border-ui-line">
                <div className="min-w-0">
                  <p className="font-semibold">{dish.name}</p>
                  <p className="text-xs text-ui-muted">{dish.origin}</p>
                </div>
                <p className="font-mono text-right tabular-nums">{dish.price} GHAI</p>
                <p className="text-sm text-ui-muted col-span-2">{dish.description}</p>
                {dish.note && <p className="text-xs text-ui-faint col-span-2">{dish.note}</p>}
                <div className="col-span-2 flex items-center justify-between gap-3 mt-1">
                  <span className="flex gap-2 text-xs">
                    {badge && <span className="px-2 py-0.5 rounded-full border border-ui-accent/60 text-ui-accent-strong">{badge}</span>}
                    <span className="px-2 py-0.5 rounded-full border border-ui-line text-ui-muted">+{dish.fullness} fullness</span>
                  </span>
                  <button
                    disabled={!!reason || tooPricey}
                    title={reason ?? (tooPricey ? 'Not enough money' : undefined)}
                    onClick={() => {
                      onEat(dish);
                      setLastMeal(dish.name);
                    }}
                    className="text-sm font-semibold px-4 py-1.5 rounded-md bg-ui-accent text-ui-panel hover:bg-ui-accent-strong disabled:bg-transparent disabled:text-ui-faint disabled:border disabled:border-ui-line disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent-strong"
                  >
                    {reason ? reason : tooPricey ? 'Not enough money' : 'Eat'}
                  </button>
                </div>
              </li>
            );
          })}
          {shown.length === 0 && <li className="text-ui-muted text-sm">Nothing here suits a {dietLabel.toLowerCase()} diet.</li>}
        </ul>

        <footer className="px-5 py-3 border-t border-ui-line flex items-center justify-between text-sm">
          <span className="text-ui-muted">
            {suitable.length} of {dishes.length} dishes suit you
          </span>
          {suitable.length < dishes.length && (
            <label htmlFor="show-all-dishes" className="flex items-center gap-2 text-ui-muted cursor-pointer">
              <input id="show-all-dishes" type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="accent-ui-accent" />
              Show full menu
            </label>
          )}
        </footer>
      </div>
    </div>
  );
}
