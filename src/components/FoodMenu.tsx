import { useEffect, useMemo, useState } from 'react';
import { DIETS, dishById, suitsDiet, whyNot, type Diet, type Dish, type FoodVendor } from '../lib/food';
import { hungerLabel } from '../lib/gameState';
import { ArrowLeft, Check, Clock3, Utensils, Wallet } from 'lucide-react';

const MENU_COURSES = ['All', 'Starters', 'Main Course', 'Drinks', 'Dessert'] as const;
type MenuCourse = (typeof MENU_COURSES)[number];

function courseForDish(dish: Dish): Exclude<MenuCourse, 'All'> {
  const name = `${dish.id} ${dish.name}`.toLowerCase();
  if (/drink|tea|coffee|juice|water|smoothie|soda|wine|cocktail|beer|zobo|kunu|sobolo|alouda/.test(name)) return 'Drinks';
  if (/cake|dessert|ice cream|tart|chocolate|pudding|sweet|chin-chin|puff-puff|croissant/.test(name)) return 'Dessert';
  if (/starter|snack|fruit|salad|samosa|spring roll|boli|akara|suya|kilishi|masa|moi-moi/.test(name)) return 'Starters';
  return 'Main Course';
}

interface FoodMenuProps {
  vendor: FoodVendor;
  diet: Diet;
  balance: number;
  fullness: number;
  phase: 'host' | 'walking' | 'menu' | 'ordered' | 'served' | 'eating' | 'finished';
  tableChoices: readonly { id: string; label: string }[];
  selectedTable: string | null;
  orderedDish: Dish | null;
  mealDelivered: boolean;
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
  mealDelivered,
  onChooseTable, onOrder, onWaitForService, onEatMeal, onLeave, onClose,
}: FoodMenuProps) {
  const [showAll, setShowAll] = useState(false);
  const [course, setCourse] = useState<MenuCourse>('Main Course');
  const dishes = useMemo(() => vendor.menu.map((id) => dishById(id)!).filter(Boolean), [vendor]);
  const suitable = dishes.filter((d) => suitsDiet(d, diet));
  const shown = (showAll ? dishes : suitable).filter((dish) => course === 'All' || courseForDish(dish) === course);
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
    <div className="pointer-events-none fixed inset-0 z-50 text-white">
      <aside
        role="dialog"
        aria-modal="false"
        aria-labelledby="food-menu-title"
        className="pointer-events-auto absolute bottom-20 right-3 top-16 flex w-[17rem] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101317]/95 text-white shadow-2xl backdrop-blur-sm max-sm:inset-x-2 max-sm:bottom-24 max-sm:top-auto max-sm:w-auto max-sm:max-h-[60dvh]"
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <button onClick={onClose} className="shrink-0 text-white/70 hover:text-white" aria-label="Back to the restaurant">
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="m-0 truncate text-[10px] uppercase tracking-[0.14em] text-white/50">{vendor.name}</p>
              <h2 id="food-menu-title" className="m-0 text-lg font-semibold leading-tight">
                {phase === 'host' ? 'Check in with Host' : phase === 'walking' ? 'Choose a Table' : phase === 'finished' ? 'Your Meal' : 'Menu'}
              </h2>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-white/85">
            <Wallet size={14} className="text-[#e3bd70]" aria-hidden="true" />{balance.toLocaleString()} ⓒ
          </span>
        </header>

        {phase === 'host' && (
          <section className="space-y-4 overflow-y-auto p-4">
            <div>
              <p className="m-0 text-xs uppercase tracking-[0.16em] text-[#d8b96e]">Welcome</p>
              <h3 className="m-0 mt-1 text-lg font-semibold">A table for you?</h3>
              <p className="m-0 mt-1 text-xs leading-relaxed text-white/60">Choose an open table. Your server will bring the menu once you are seated.</p>
            </div>
            <div className="grid gap-1">
              {tableChoices.map((table) => (
                <button key={table.id} type="button" onClick={() => onChooseTable(table.id)}
                  className="flex min-h-14 items-center justify-between border-b border-white/10 px-1 text-left transition hover:border-[#d2b36f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d2b36f]">
                  <span><span className="block text-sm font-semibold">{table.label}</span><span className="text-xs text-white/50">Available now · seats for two</span></span>
                  <span aria-hidden="true" className="text-[#e3bd70]">›</span>
                </button>
              ))}
              {tableChoices.length === 0 && <p className="m-0 text-sm text-white/60">Every table is occupied. Please wait a moment or come back shortly.</p>}
            </div>
          </section>
        )}
        {phase === 'walking' && (
          <section className="space-y-3 p-4">
            <p className="m-0 text-sm leading-relaxed text-white/75">Your table is ready. Walk to {selectedTable ?? 'your table'}; the menu will open when you sit down.</p>
            <button type="button" onClick={onClose} className="w-full border border-white/15 px-4 py-2 text-sm font-semibold hover:border-[#d2b36f]">Close and continue walking</button>
          </section>
        )}
        {phase === 'menu' && (
          <>
            <nav className="flex gap-1 overflow-x-auto border-b border-white/10 px-2 py-2" aria-label="Menu category">
              {MENU_COURSES.map((menuCourse) => (
                <button
                  key={menuCourse}
                  type="button"
                  aria-pressed={course === menuCourse}
                  onClick={() => setCourse(menuCourse)}
                  className={`shrink-0 border px-2 py-1.5 text-[10px] transition ${course === menuCourse ? 'border-[#d2b36f] bg-[#d2b36f]/15 text-white' : 'border-white/10 text-white/65 hover:border-white/30'}`}
                >
                  {menuCourse}
                </button>
              ))}
            </nav>
            <ul className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-2">
            {shown.map((dish) => {
              const reason = whyNot(dish, diet);
              const tooPricey = !isAffordable(dish);
              return (
                <li key={dish.id} className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#181c21]">
                  <div aria-label={`Illustrated preview of ${dish.name}`} role="img" className="grid h-24 place-items-center border-b border-white/10 bg-[radial-gradient(ellipse_at_center,#d5b67f_0%,#7b5d38_38%,#29221c_70%)] text-4xl">
                    {preview(dish)}
                  </div>
                  <div className="p-2">
                    <p className="m-0 truncate text-[11px] font-medium" title={dish.name}>{dish.name}</p>
                    <div className="mt-1 flex items-center justify-between gap-1 text-[10px]">
                      <span className="truncate text-white/55">{dish.origin}</span>
                      <span className="shrink-0 tabular-nums text-white/85">{dish.price} ⓒ</span>
                    </div>
                    <button type="button" disabled={!!reason || tooPricey}
                      title={reason ?? (tooPricey ? 'Not enough money to order this dish' : undefined)}
                      onClick={() => onOrder(dish)}
                      className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-[10px] font-semibold transition hover:border-[#d2b36f] hover:text-[#f0d797] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d2b36f]">
                      <Utensils size={13} />{reason ? 'Unavailable' : tooPricey ? 'Not enough' : 'Order'}
                    </button>
                  </div>
                </li>
              );
            })}
            {shown.length === 0 && <li className="col-span-2 py-8 text-center text-sm text-white/60">{showAll ? 'No dishes in this category.' : `Nothing here suits a ${dietLabel.toLowerCase()} diet.`}</li>}
            </ul>
          </>
        )}
        {(phase === 'ordered' || phase === 'served' || phase === 'eating' || phase === 'finished') && orderedDish && (
          <section className="space-y-4 overflow-y-auto p-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-xl border border-[#c9a86a]/60 bg-[#eee2cc] text-3xl shadow-inner">{preview(orderedDish)}</div>
              <div>
                <p className="m-0 text-[10px] uppercase tracking-[0.16em] text-white/55">
                  {phase === 'ordered' ? 'In the kitchen' : phase === 'served' ? 'At your table' : phase === 'eating' ? 'Eating' : 'Settled'}
                </p>
                <h3 className="m-0 mt-1 text-sm font-semibold">{orderedDish.name}</h3>
                <p className="m-0 mt-1 text-xs text-white/55">{orderedDish.price} ⓒ · +{orderedDish.fullness} fullness</p>
              </div>
            </div>
            {phase === 'ordered' && (
              <>
                <p className="m-0 text-sm leading-relaxed text-white/65">The kitchen has your order. Wait five in-game minutes while your meal is prepared.</p>
                <button type="button" onClick={onWaitForService} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#d2b36f] px-4 py-2 text-sm font-semibold text-[#171615] hover:bg-[#e3c984] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e3bd70]"><Clock3 size={16} />Wait for service · 5 minutes</button>
              </>
            )}
            {phase === 'served' && (
              <>
                <p role="status" className="m-0 text-sm leading-relaxed">
                  {mealDelivered ? 'Your meal has arrived on the table. Payment is taken once when you eat.' : 'Your waiter is bringing the meal to your table.'}
                </p>
                <button type="button" disabled={!mealDelivered || !isAffordable(orderedDish)} onClick={onEatMeal}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#d2b36f] px-4 py-2 text-sm font-semibold text-[#171615] hover:bg-[#e3c984] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e3bd70]">
                  <Utensils size={16} />{!mealDelivered ? 'Waiting for service' : isAffordable(orderedDish) ? `Eat and pay · ${orderedDish.price} ⓒ` : 'Not enough GHAI to pay'}
                </button>
              </>
            )}
            {phase === 'eating' && (
              <p role="status" className="m-0 animate-pulse text-sm leading-relaxed text-ui-muted">You are enjoying your meal. Payment settles when you finish eating.</p>
            )}
            {phase === 'finished' && (
              <>
                <p role="status" className="m-0 flex items-center gap-2 text-sm"><Check size={16} className="text-ui-accent-strong" />Paid once · {orderedDish.price} ⓒ deducted · hunger restored by {orderedDish.fullness}.</p>
                <button type="button" onClick={onLeave} className="min-h-11 w-full rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold hover:border-[#d2b36f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d2b36f]">Stand up and leave</button>
              </>
            )}
          </section>
        )}

        <footer className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2 text-[10px]">
          <span className="text-white/55">{phase === 'menu' ? `${shown.length} dishes · ${hungerLabel(fullness)}` : `${hungerLabel(fullness)} · ${balance.toLocaleString()} GHAI`}</span>
          {phase === 'menu' && suitable.length < dishes.length && (
            <label htmlFor="show-all-dishes" className="flex shrink-0 cursor-pointer items-center gap-1.5 text-white/55">
              <input id="show-all-dishes" type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="accent-[#d2b36f]" />
              All dishes
            </label>
          )}
        </footer>
      </aside>
    </div>
  );
}
