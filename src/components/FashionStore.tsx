import { useEffect, useState } from 'react';
import { FASHION_ITEMS, SLOTS, SLOT_LABEL, swatchCss, type FashionItem, type Slot, type Wardrobe } from '../lib/fashion';

interface FashionStoreProps {
  /** 'shop' sells everything; 'wardrobe' shows only what the player owns. */
  mode: 'shop' | 'wardrobe';
  wardrobe: Wardrobe;
  balance: number;
  tryOn: Partial<Record<Slot, string | null>>;
  onTryOn: (slot: Slot, id: string | null) => void;
  onBuy: (item: FashionItem) => void;
  onEquip: (slot: Slot, id: string | null) => void;
  onClose: () => void;
}

const BUTTON = 'rounded-md border px-2.5 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Boutique and wardrobe. A side panel so the player's 3D character stays in
 * view: "Try on" shows an item on the character without buying it.
 */
export function FashionStore({ mode, wardrobe, balance, tryOn, onTryOn, onBuy, onEquip, onClose }: FashionStoreProps) {
  const [slot, setSlot] = useState<Slot>('top');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const items = FASHION_ITEMS.filter((i) => i.slot === slot && (mode === 'shop' || wardrobe.owned.includes(i.id)));
  const equippedId = wardrobe.equipped[slot] ?? null;
  const shownId = slot in tryOn ? tryOn[slot] ?? null : equippedId;

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="store-title"
      className="fixed inset-x-0 bottom-0 z-40 flex max-h-[70dvh] flex-col rounded-t-2xl border border-ui-line bg-ui-panel/95 text-ui-ink shadow-2xl sm:inset-x-auto sm:inset-y-4 sm:right-4 sm:max-h-none sm:w-[24rem] sm:rounded-2xl"
    >
      <header className="flex items-start justify-between gap-3 border-b border-ui-line/70 px-5 pb-3 pt-4">
        <div>
          <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-ui-muted">{mode === 'shop' ? 'Fashion House · Boutique & salon' : 'Your wardrobe'}</p>
          <h2 id="store-title" className="m-0 mt-1 font-display text-xl font-semibold">{mode === 'shop' ? 'Find your look' : 'Get dressed'}</h2>
          <p className="m-0 mt-1 text-xs text-ui-muted">Balance <span className="font-semibold tabular-nums text-ui-ink">{balance.toLocaleString()} ⓒ</span></p>
        </div>
        <button type="button" onClick={onClose} className={`${BUTTON} border-ui-line text-ui-muted hover:text-ui-ink`}>Done</button>
      </header>

      <nav className="flex gap-1 overflow-x-auto px-4 pt-3" role="tablist" aria-label="Category">
        {SLOTS.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={slot === s} onClick={() => setSlot(s)}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs transition ${slot === s ? 'border-ui-accent bg-ui-accent/15 text-ui-ink' : 'border-ui-line text-ui-muted hover:text-ui-ink'}`}>
            {SLOT_LABEL[s]}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
        <ItemRow
          title={slot === 'hair' ? 'Natural colour' : 'Original'}
          subtitle={slot === 'hair' ? 'Your own hair colour' : 'What you were wearing'}
          swatch="repeating-linear-gradient(45deg, #2a2d33 0 6px, #353a42 6px 12px)"
          active={shownId === null}
          actions={
            <>
              {mode === 'shop' && <button type="button" className={`${BUTTON} border-ui-line hover:border-ui-accent`} onClick={() => onTryOn(slot, null)}>Try on</button>}
              <button type="button" className={`${BUTTON} border-ui-line hover:border-ui-accent`} disabled={equippedId === null} onClick={() => onEquip(slot, null)}>
                {equippedId === null ? 'Wearing' : 'Wear'}
              </button>
            </>
          }
        />
        {items.length === 0 && (
          <p className="px-1 py-6 text-center text-sm text-ui-muted">Nothing here yet. Visit the Fashion House to shop.</p>
        )}
        {items.map((item) => {
          const owned = wardrobe.owned.includes(item.id);
          const wearing = equippedId === item.id;
          const affordable = balance >= item.price;
          return (
            <ItemRow
              key={item.id}
              title={item.name}
              subtitle={`${item.collection}${owned ? ' · Owned' : ` · ${item.price.toLocaleString()} ⓒ`}`}
              swatch={swatchCss(item.style)}
              active={shownId === item.id}
              actions={
                <>
                  {mode === 'shop' && !wearing && (
                    <button type="button" className={`${BUTTON} border-ui-line hover:border-ui-accent`} onClick={() => onTryOn(slot, item.id)}>Try on</button>
                  )}
                  {owned ? (
                    <button type="button" className={`${BUTTON} border-ui-line hover:border-ui-accent`} disabled={wearing} onClick={() => onEquip(slot, item.id)}>
                      {wearing ? 'Wearing' : 'Wear'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`${BUTTON} border-ui-accent bg-ui-accent/20 text-ui-ink hover:bg-ui-accent/30`}
                      disabled={!affordable}
                      title={affordable ? undefined : 'Not enough money'}
                      onClick={() => { onBuy(item); setMessage(`Bought ${item.name}. You're wearing it now.`); }}
                    >
                      Buy
                    </button>
                  )}
                </>
              }
            />
          );
        })}
      </div>

      <footer className="border-t border-ui-line/70 px-5 py-3 text-xs text-ui-muted" aria-live="polite">
        {message || (mode === 'shop'
          ? 'Fabrics and prints restyle the outfit your character has on. New cuts and hairstyles are coming with the new character system.'
          : 'Change into anything you own, anywhere, for free.')}
      </footer>
    </aside>
  );
}

function ItemRow({ title, subtitle, swatch, active, actions }: {
  title: string; subtitle: string; swatch: string; active: boolean; actions: React.ReactNode;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-2.5 ${active ? 'border-ui-accent bg-ui-accent/10' : 'border-ui-line/70 bg-ui-panel'}`}>
      <span className="h-11 w-11 shrink-0 rounded-lg border border-ui-line" style={{ background: swatch }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-sm font-medium">{title}</p>
        <p className="m-0 truncate text-xs text-ui-muted">{subtitle}</p>
      </div>
      <div className="flex shrink-0 gap-1.5">{actions}</div>
    </div>
  );
}
