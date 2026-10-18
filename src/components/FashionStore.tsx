import { useEffect, useState } from 'react';
import { FASHION_ITEMS, MAX_OUTFITS, SLOTS, SLOT_LABEL, itemById, resolveStyles, stockedIn, swatchCss, type FashionItem, type Slot, type Wardrobe } from '../lib/fashion';
import { Check, Footprints, Scissors, ScanEye, Shirt, ShoppingBag, Wallet, X, type LucideIcon } from 'lucide-react';

interface FashionStoreProps {
  /** 'shop' sells everything; 'wardrobe' shows only what the player owns. */
  mode: 'shop' | 'wardrobe';
  /** The boutique's name and what it sells. */
  shop: { name: string; kind: string };
  /** The district the boutique is in: each stocks its own range. */
  districtId: string;
  onSaveOutfit?: (name: string) => void;
  onWearOutfit?: (index: number) => void;
  onDeleteOutfit?: (index: number) => void;
  wardrobe: Wardrobe;
  balance: number;
  tryOn: Partial<Record<Slot, string | null>>;
  onTryOn: (slot: Slot, id: string | null) => void;
  onBuy: (item: FashionItem) => void;
  onEquip: (slot: Slot, id: string | null) => void;
  onClose: () => void;
}

const BUTTON = 'rounded-md border px-2.5 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent disabled:cursor-not-allowed disabled:opacity-50';
const SLOT_ICON: Record<Slot, LucideIcon> = { top: Shirt, bottom: Shirt, shoes: Footprints, hair: Scissors };

/**
 * Boutique and wardrobe. A side panel so the player's 3D character stays in
 * view: "Try on" shows an item on the character without buying it.
 */
export function FashionStore({ mode, shop, districtId, onSaveOutfit, onWearOutfit, onDeleteOutfit, wardrobe, balance, tryOn, onTryOn, onBuy, onEquip, onClose }: FashionStoreProps) {
  const [slot, setSlot] = useState<Slot>('top');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const [outfitName, setOutfitName] = useState('');
  const catalogue = mode === 'shop' ? stockedIn(districtId) : FASHION_ITEMS.filter((i) => wardrobe.owned.includes(i.id));
  const items = catalogue.filter((i) => i.slot === slot);
  const outfits = wardrobe.outfits ?? [];
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
          <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-ui-muted">{mode === 'shop' ? `${shop.name} · ${shop.kind}` : 'Your wardrobe'}</p>
          <h2 id="store-title" className="m-0 mt-1 flex items-center gap-2 font-display text-xl font-semibold">
            {mode === 'shop' ? <ShoppingBag size={19} className="text-ui-accent-strong" /> : <Shirt size={19} className="text-ui-accent-strong" />}
            {mode === 'shop' ? 'Find your look' : 'Get dressed'}
          </h2>
          <p className="m-0 mt-1 flex items-center gap-1.5 text-xs text-ui-muted"><Wallet size={14} />Balance <span className="font-semibold tabular-nums text-ui-ink">{balance.toLocaleString()} ⓒ</span></p>
        </div>
        <button type="button" onClick={onClose} className={`${BUTTON} inline-flex items-center gap-1.5 border-ui-line text-ui-muted hover:text-ui-ink`}><X size={14} />Done</button>
      </header>

      <nav className="flex gap-1 overflow-x-auto px-4 pt-3" role="tablist" aria-label="Category">
        {SLOTS.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={slot === s} onClick={() => setSlot(s)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs transition ${slot === s ? 'border-ui-accent bg-ui-accent/15 text-ui-ink' : 'border-ui-line text-ui-muted hover:text-ui-ink'}`}>
            {(() => { const Icon = SLOT_ICON[s]; return <Icon size={14} aria-hidden="true" />; })()}{SLOT_LABEL[s]}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {mode === 'wardrobe' && onSaveOutfit && (
          <section aria-labelledby="looks-title" className="mb-3 rounded-xl border border-ui-line/70 p-3">
            <h3 id="looks-title" className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-ui-muted">Saved looks</h3>
            {outfits.length === 0 && <p className="m-0 mt-1 text-xs text-ui-muted">Save what you're wearing to change back into it in one tap.</p>}
            <ul className="m-0 mt-2 grid list-none gap-1.5 p-0">
              {outfits.map((o, i) => {
                const looks = resolveStyles(o.equipped);
                return (
                  <li key={i} className="flex items-center gap-2">
                    <span className="flex shrink-0 gap-0.5" aria-hidden>
                      {SLOTS.map((s) => <span key={s} className="h-5 w-3 rounded-sm border border-ui-line" style={{ background: looks[s] ? swatchCss(looks[s]!) : '#2a2d33' }} />)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm" title={SLOTS.map((s) => itemById(o.equipped[s])?.name ?? `Original ${s}`).join(', ')}>{o.name}</span>
                    <button type="button" className={`${BUTTON} inline-flex items-center gap-1 border-ui-line hover:border-ui-accent`} onClick={() => onWearOutfit?.(i)}><Shirt size={13} />Wear</button>
                    <button type="button" className={`${BUTTON} border-ui-line text-ui-muted hover:text-ui-ink`} aria-label={`Delete look ${o.name}`} title={`Delete look ${o.name}`} onClick={() => onDeleteOutfit?.(i)}><X size={13} /></button>
                  </li>
                );
              })}
            </ul>
            {outfits.length < MAX_OUTFITS && (
              <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (outfitName.trim()) { onSaveOutfit(outfitName.trim()); setOutfitName(''); } }}>
                <label htmlFor="outfit-name" className="sr-only">Name this look</label>
                <input id="outfit-name" value={outfitName} maxLength={24} onChange={(e) => setOutfitName(e.target.value)} placeholder="Name this look, e.g. Sunday best"
                  className="min-w-0 flex-1 rounded-md border border-ui-line bg-black/20 px-2.5 py-1.5 text-sm text-ui-ink placeholder:text-ui-faint focus:border-ui-accent focus:outline-none" />
                <button type="submit" disabled={!outfitName.trim()} className={`${BUTTON} inline-flex items-center gap-1 border-ui-accent bg-ui-accent/20 text-ui-ink hover:bg-ui-accent/30`}><Check size={13} />Save</button>
              </form>
            )}
          </section>
        )}
        <ItemRow
          title={slot === 'hair' ? 'Natural colour' : 'Original'}
          subtitle={slot === 'hair' ? 'Your own hair colour' : 'What you were wearing'}
          swatch="repeating-linear-gradient(45deg, #2a2d33 0 6px, #353a42 6px 12px)"
          active={shownId === null}
          icon={SLOT_ICON[slot]}
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
              subtitle={`${item.style.fabric ? `${item.style.fabric.name[0].toUpperCase()}${item.style.fabric.name.slice(1)} · ` : ''}${item.collection}${owned ? ' · Owned' : ` · ${item.price.toLocaleString()} ⓒ`}`}
              swatch={swatchCss(item.style)}
              active={shownId === item.id}
              icon={SLOT_ICON[slot]}
              actions={
                <>
                  {mode === 'shop' && !wearing && (
                    <button type="button" className={`${BUTTON} inline-flex items-center gap-1 border-ui-line hover:border-ui-accent`} onClick={() => onTryOn(slot, item.id)}><ScanEye size={13} />Try on</button>
                  )}
                  {owned ? (
                    <button type="button" className={`${BUTTON} inline-flex items-center gap-1 border-ui-line hover:border-ui-accent`} disabled={wearing} onClick={() => onEquip(slot, item.id)}>
                      <Shirt size={13} />
                      {wearing ? 'Wearing' : 'Wear'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`${BUTTON} inline-flex items-center gap-1 border-ui-accent bg-ui-accent/20 text-ui-ink hover:bg-ui-accent/30`}
                      disabled={!affordable}
                      title={affordable ? undefined : 'Not enough money'}
                      onClick={() => { onBuy(item); setMessage(`Bought ${item.name}. You're wearing it now.`); }}
                    >
                      <ShoppingBag size={13} />
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

function ItemRow({ title, subtitle, swatch, active, actions, icon: Icon }: {
  title: string; subtitle: string; swatch: string; active: boolean; actions: React.ReactNode; icon: LucideIcon;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-2.5 ${active ? 'border-ui-accent bg-ui-accent/10' : 'border-ui-line/70 bg-ui-panel'}`}>
      <span className="h-11 w-11 shrink-0 rounded-lg border border-ui-line" style={{ background: swatch }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="m-0 flex items-center gap-1.5 truncate text-sm font-medium"><Icon size={13} aria-hidden="true" className="shrink-0 text-ui-accent-strong" />{title}</p>
        <p className="m-0 truncate text-xs text-ui-muted">{subtitle}</p>
      </div>
      <div className="flex shrink-0 gap-1.5">{actions}</div>
    </div>
  );
}
