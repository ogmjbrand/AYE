import { useEffect, useMemo, useState } from 'react';
import { DIETS, dietBadge, dishById, suitsDiet, whyNot, type Diet, type Dish, type FoodVendor } from '../lib/food';
import { hungerLabel } from '../lib/gameState';
import { Check, Clock3, Utensils } from 'lucide-react';

interface FoodMenuProps {
  vendor: FoodVendor;
  diet: Diet;
  balance: number;
  fullness: number;
  phase: 'host' | 'walking' | 'menu' | 'ordered' | 'served' | 'eating' | 'finished';
  tableChoices: readonly { id: string; label: string }[];
  selectedTable: string | null;
  orderedDish: Dish | null;
  onChooseTable: (tableId: string) => void;
  onOrder: (dish: Dish) => void;
  onWaitForService: () => void;
  onEatMeal: () => void;
  onLeave: () => void;
  onClose: () => void;
}

/** Menu for one food vendor. Shows the dishes that suit the player's diet first. */
export function FoodMenu({
  vendor, diet, balance, fullness, phase, tableChoices, selectedTable, orderedDish,
  onChooseTable, onOrder, onWaitForService, onEatMeal, onLeave, onClose,
}: FoodMenuProps) {
  const [showAll, setShowAll] = useState(false);
  const dishes = useMemo(() => vendor.menu.map((id) => dishById(id)!).filter(Boolean), [vendor]);
  const suitable = dishes.filter((d) => suitsDiet(d, diet));
  const shown = showAll ? dishes : suitable;
  const dietLabel = DIETS.find((d) => d.id === diet)!.label;
  const isAffordable = (dish: Dish) => balance >= dish.price;
  const preview = (dish: Dish) => {
    const name = `${dish.id} ${dish.name}`.toLowerCase();
    if (/drink|tea|coffee|alouda|juice|water/.test(name)) return '🥤';
    if (/fish|tilapia|catfish|prawn|shrimp|salmon|octopus/.test(name)) return '🐟';
    if (/suya|kebab|chicken|meat|goat|beef|grill|roast/.test(name)) return '🍢';
    if (/pizza/.test(name)) return '🍕';
    if (/burger/.test(name)) return '🍔';
    if (/cake|tart|dessert|bun|puff|chin-chin|croissant/.test(name)) return '🍰';
    if (/soup|stew|curry|wat|shakshuka/.test(name)) return '🍲';
    if (/rice|jollof|waakye|githeri|koshari|paella|plov/.test(name)) return '🍚';
    return '🍛';
  };

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
              Your diet: <span className="text-ui-ink">{dietLabel}</span> · {hungerLabel(fullness)} · {balance.toLocaleString()} ⓒ
            </p>
          </div>
          <button onClick={onClose} className="text-ui-muted hover:text-ui-ink text-sm px-2 py-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent" aria-label="Close menu">
            Close
          </button>
        </header>

        {phase === 'host' && (
          <section className="space-y-4 overflow-y-auto p-5">
            <div>
              <p className="m-0 text-xs uppercase tracking-[0.16em] text-ui-muted">Welcome</p>
              <h3 className="m-0 mt-1 font-display text-xl font-semibold">A table for you?</h3>
              <p className="m-0 mt-2 max-w-prose text-sm leading-relaxed text-ui-muted">Choose an open table. Your server will bring the menu once you are seated.</p>
            </div>
            <div className="grid gap-2">
              {tableChoices.map((table) => (
                <button key={table.id} type="button" onClick={() => onChooseTable(table.id)}
                  className="flex min-h-14 items-center justify-between border-b border-ui-line px-1 text-left transition hover:border-ui-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">
                  <span><span className="block text-sm font-semibold">{table.label}</span><span className="text-xs text-ui-muted">Available now · seats for two</span></span>
                  <span aria-hidden="true" className="text-ui-accent-strong">›</span>
                </button>
              ))}
              {tableChoices.length === 0 && <p className="m-0 text-sm text-ui-muted">Every table is occupied. Please wait a moment or come back shortly.</p>}
            </div>
          </section>
        )}
        {phase === 'walking' && (
          <section className="space-y-3 p-5">
            <p className="m-0 text-sm">Your table is ready. Walk to {selectedTable ?? 'your table'}; the menu will open when you sit down.</p>
            <button type="button" onClick={onClose} className="rounded-md border border-ui-line px-4 py-2 text-sm font-semibold hover:border-ui-accent">Close and continue walking</button>
          </section>
        )}
        {phase === 'menu' && (
          <ul className="overflow-y-auto p-5 grid gap-3">
            {shown.map((dish) => {
              const reason = whyNot(dish, diet);
              const tooPricey = !isAffordable(dish);
              const badge = dietBadge(dish);
              return (
                <li key={dish.id} className="grid grid-cols-[4.5rem_1fr_auto] gap-x-3 gap-y-1 border-b border-ui-line/80 pb-3">
                  <div aria-label={`Visual preview of ${dish.name}`} className="row-span-3 grid aspect-square place-items-center rounded-sm border border-ui-accent/25 bg-[radial-gradient(ellipse_at_center,#f1dfb8_0%,#d1ae75_56%,#62442e_58%,#251e19_100%)] text-3xl">{preview(dish)}</div>
                  <div className="min-w-0">
                    <p className="m-0 font-semibold">{dish.name}</p>
                    <p className="m-0 text-xs text-ui-muted">{dish.origin}</p>
                  </div>
                  <p className="m-0 text-right font-mono tabular-nums">{dish.price} ⓒ</p>
                  <p className="col-span-2 m-0 text-sm leading-relaxed text-ui-muted">{dish.description}</p>
                  {dish.note && <p className="col-span-2 m-0 text-xs text-ui-faint">{dish.note}</p>}
                  <div className="col-span-3 mt-1 flex items-center justify-between gap-3">
                    <span className="flex flex-wrap gap-2 text-xs">
                      {badge && <span className="border-l-2 border-ui-accent pl-2 text-ui-accent-strong">{badge}</span>}
                      <span className="text-ui-muted">+{dish.fullness} fullness</span>
                    </span>
                    <button type="button" disabled={!!reason || tooPricey}
                      title={reason ?? (tooPricey ? 'Not enough money to order this dish' : undefined)}
                      onClick={() => onOrder(dish)}
                      className="inline-flex items-center gap-2 rounded-sm bg-ui-accent px-3 py-2 text-sm font-semibold text-ui-panel transition hover:bg-ui-accent-strong active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-transparent disabled:text-ui-faint focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">
                      <Utensils size={15} />{reason ? reason : tooPricey ? 'Not enough' : 'Order'}
                    </button>
                  </div>
                </li>
              );
            })}
            {shown.length === 0 && <li className="text-sm text-ui-muted">Nothing here suits a {dietLabel.toLowerCase()} diet.</li>}
          </ul>
        )}
        {(phase === 'ordered' || phase === 'served' || phase === 'eating' || phase === 'finished') && orderedDish && (
          <section className="space-y-4 overflow-y-auto p-5">
            <div className="flex items-center gap-4 border-b border-ui-line pb-4">
              <div aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-full border-4 border-[#c9a86a] bg-[#eee2cc] text-3xl shadow-inner">{preview(orderedDish)}</div>
              <div>
                <p className="m-0 text-xs uppercase tracking-[0.16em] text-ui-muted">
                  {phase === 'ordered' ? 'In the kitchen' : phase === 'served' ? 'At your table' : phase === 'eating' ? 'Eating' : 'Settled'}
                </p>
                <h3 className="m-0 mt-1 font-display text-lg font-semibold">{orderedDish.name}</h3>
                <p className="m-0 mt-1 text-sm text-ui-muted">{orderedDish.price} ⓒ · +{orderedDish.fullness} fullness</p>
              </div>
            </div>
            {phase === 'ordered' && (
              <>
                <p className="m-0 text-sm leading-relaxed text-ui-muted">The kitchen has your order. Wait five in-game minutes while your meal is prepared.</p>
                <button type="button" onClick={onWaitForService} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-ui-accent px-4 py-2 text-sm font-semibold text-ui-panel hover:bg-ui-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent"><Clock3 size={16} />Wait for service · 5 minutes</button>
              </>
            )}
            {phase === 'served' && (
              <>
                <p role="status" className="m-0 text-sm leading-relaxed">Your meal has arrived on the table. Payment is taken once when you eat.</p>
                <button type="button" disabled={!isAffordable(orderedDish)} onClick={onEatMeal}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-ui-accent px-4 py-2 text-sm font-semibold text-ui-panel hover:bg-ui-accent-strong disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">
                  <Utensils size={16} />{isAffordable(orderedDish) ? `Eat and pay · ${orderedDish.price} ⓒ` : 'Not enough GHAI to pay'}
                </button>
              </>
            )}
            {phase === 'eating' && (
              <p role="status" className="m-0 animate-pulse text-sm leading-relaxed text-ui-muted">You are enjoying your meal. Payment settles when you finish eating.</p>
            )}
            {phase === 'finished' && (
              <>
                <p role="status" className="m-0 flex items-center gap-2 text-sm"><Check size={16} className="text-ui-accent-strong" />Paid once · {orderedDish.price} ⓒ deducted · hunger restored by {orderedDish.fullness}.</p>
                <button type="button" onClick={onLeave} className="min-h-11 w-full rounded-sm border border-ui-line px-4 py-2 text-sm font-semibold hover:border-ui-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">Stand up and leave</button>
              </>
            )}
          </section>
        )}

        <footer className="px-5 py-3 border-t border-ui-line flex items-center justify-between text-sm">
          <span className="text-ui-muted">{phase === 'menu' ? `${suitable.length} of ${dishes.length} dishes suit you` : `${hungerLabel(fullness)} · ${balance.toLocaleString()} ⓒ`}</span>
          {phase === 'menu' && suitable.length < dishes.length && (
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
