import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  CATALOGUE, FURNITURE_CATEGORIES, catalogueItem, effectLine, findSpot, fits, resaleValue, walkable,
  type CatalogueItem, type FurnitureCategory, type OwnedFurniture,
} from '../lib/furniture';
import type { Interior } from '../lib/interiors';
import { Piece } from '../world/HomeInterior';

interface FurnitureCatalogueProps {
  balance: number;
  owned: readonly OwnedFurniture[];
  /** Your home's room, or null if you have no home (purchases go into storage). */
  interior: Interior | null;
  onBuy: (itemId: string) => void;
  onSell: (uid: string) => void;
  onPlace: (uid: string, at: readonly [number, number], rot: 0 | 1) => void;
  onStore: (uid: string) => void;
  onClose: () => void;
}

const TAB = 'rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent';
const SMALL = 'rounded-md border border-ui-line px-2 py-1 text-xs hover:border-ui-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent disabled:cursor-not-allowed disabled:opacity-40';
const NUDGE = 0.25;

/**
 * The home catalogue: browse and buy furniture by category or search, see
 * each piece in 3D, then arrange what you own (move, turn, put away, sell).
 * Opens as a side panel so the room stays in view.
 */
export function FurnitureCatalogue({ balance, owned, interior, onBuy, onSell, onPlace, onStore, onClose }: FurnitureCatalogueProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const [tab, setTab] = useState<'shop' | 'mine'>('shop');
  const [category, setCategory] = useState<FurnitureCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string>(CATALOGUE[0].id);
  const [note, setNote] = useState<string | null>(null);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOGUE.filter((c) => (category === 'all' || c.category === category) && (!q || `${c.name} ${c.description} ${c.category}`.toLowerCase().includes(q)));
  }, [category, query]);
  const preview = catalogueItem(selected) ?? CATALOGUE[0];

  const buy = (item: CatalogueItem) => {
    if (balance < item.price) return;
    const spot = interior ? findSpot(interior, owned, item) : null;
    onBuy(item.id);
    setNote(!interior ? `${item.name} bought and kept in storage until you have a home.`
      : spot ? `${item.name} delivered to your home.` : `${item.name} bought. There's no room for it, so it's in storage.`);
  };
  /** Moves or turns a placed piece, if the new spot is free and keeps the room walkable. */
  const tryPlace = (o: OwnedFurniture, at: readonly [number, number], rot: 0 | 1) => {
    const item = catalogueItem(o.itemId);
    if (!interior || !item) return;
    const next = owned.map((x) => (x.uid === o.uid ? { ...x, at, rot } : x));
    if (!fits(interior, owned, item, at, rot, o.uid) || !walkable(interior, next)) {
      setNote(`${item.name} doesn't fit there.`);
      return;
    }
    setNote(null);
    onPlace(o.uid, [Math.round(at[0] * 100) / 100, Math.round(at[1] * 100) / 100], rot);
  };
  const placeStored = (o: OwnedFurniture) => {
    const item = catalogueItem(o.itemId);
    if (!interior || !item) return;
    const spot = findSpot(interior, owned.filter((x) => x.uid !== o.uid), item);
    if (!spot) setNote(`There's no room for the ${item.name.toLowerCase()}. Put something away first.`);
    else { setNote(null); onPlace(o.uid, spot.at, spot.rot); }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full justify-end sm:w-auto" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalogue-title"
        onClick={(e) => e.stopPropagation()}
        className="mt-auto flex max-h-[80vh] w-full flex-col rounded-t-2xl border border-ui-line bg-ui-panel text-ui-ink shadow-2xl sm:m-3 sm:max-h-none sm:w-[30rem] sm:rounded-2xl"
      >
        <header className="border-b border-ui-line p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="m-0 text-xs uppercase tracking-widest text-ui-muted">Home</p>
              <h2 id="catalogue-title" className="m-0 mt-1 font-display text-2xl font-bold">Furniture</h2>
              <p className="m-0 mt-1 text-sm text-ui-muted">Balance <span className="tabular-nums text-ui-ink">{balance.toLocaleString()} GHAI</span></p>
            </div>
            <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm text-ui-muted hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">Close</button>
          </div>
          <div className="mt-3 flex gap-1" role="tablist" aria-label="Catalogue or your furniture">
            {(['shop', 'mine'] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`${TAB} ${tab === t ? 'bg-ui-accent/20 text-ui-ink' : 'text-ui-muted hover:text-ui-ink'}`}>
                {t === 'shop' ? 'Catalogue' : `Your furniture (${owned.length})`}
              </button>
            ))}
          </div>
          {note && <p role="status" className="m-0 mt-2 text-xs text-ui-accent-strong">{note}</p>}
        </header>

        {tab === 'shop' ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-2 border-b border-ui-line p-3">
              <label className="block">
                <span className="sr-only">Search furniture</span>
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search furniture"
                  className="w-full rounded-md border border-ui-line bg-transparent px-3 py-2 text-sm text-ui-ink placeholder:text-ui-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent" />
              </label>
              <div className="flex flex-wrap gap-1" role="group" aria-label="Category">
                {[{ id: 'all' as const, label: 'All' }, ...FURNITURE_CATEGORIES].map((c) => (
                  <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${category === c.id ? 'border-ui-accent bg-ui-accent/20 text-ui-ink' : 'border-ui-line text-ui-muted hover:text-ui-ink'}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 border-b border-ui-line p-3">
              <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-ui-line bg-black/20" aria-hidden>
                <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [2.6, 2.1, -2.6], fov: 35 }} onCreated={({ camera }) => camera.lookAt(0, preview.size[1] / 2, 0)}>
                  <ambientLight intensity={1.2} />
                  <directionalLight position={[3, 5, -2]} intensity={2} />
                  <group scale={1.6 / Math.max(...preview.size)}>
                    <Piece f={{ kind: preview.kind, at: [0, 0], size: preview.size, color: preview.color }} />
                  </group>
                </Canvas>
              </div>
              <div className="min-w-0">
                <p className="m-0 font-semibold">{preview.name}</p>
                <p className="m-0 text-xs text-ui-muted">{preview.description}</p>
                <p className="m-0 mt-1 text-xs text-ui-ink">{effectLine(preview)}</p>
                <p className="m-0 mt-1 text-[11px] text-ui-faint">{preview.size[0]} × {preview.size[2]} m</p>
              </div>
            </div>
            {items.length === 0 && <p className="m-0 p-4 text-sm text-ui-muted">Nothing matches “{query}”.</p>}
            <ul className="m-0 grid min-h-0 flex-1 list-none grid-cols-2 gap-2 overflow-y-auto p-3">
              {items.map((item) => (
                <li key={item.id}>
                  <div className={`flex h-full flex-col gap-2 rounded-xl border p-2.5 ${selected === item.id ? 'border-ui-accent' : 'border-ui-line'}`}>
                    <button type="button" onClick={() => setSelected(item.id)} className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">
                      <p className="m-0 text-sm font-semibold">{item.name}</p>
                      <p className="m-0 text-[11px] text-ui-muted">{effectLine(item)}</p>
                    </button>
                    <button type="button" disabled={balance < item.price} title={balance < item.price ? 'Not enough money' : undefined} onClick={() => buy(item)}
                      className="mt-auto rounded-md border border-ui-accent bg-ui-accent/20 px-2 py-1.5 text-xs font-semibold tabular-nums hover:bg-ui-accent/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent disabled:cursor-not-allowed disabled:opacity-50">
                      Buy · {item.price.toLocaleString()} GHAI
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {owned.length === 0 && <p className="m-0 text-sm text-ui-muted">You haven't bought any furniture yet. Your home comes furnished; anything you buy goes alongside.</p>}
            {!interior && owned.length > 0 && <p className="m-0 mb-2 text-sm text-ui-muted">You have no home, so everything is in storage.</p>}
            <ul className="m-0 grid list-none gap-2 p-0">
              {owned.map((o) => {
                const item = catalogueItem(o.itemId)!;
                return (
                  <li key={o.uid} className="rounded-xl border border-ui-line p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="m-0 text-sm font-semibold">{item.name}</p>
                      <span className="text-xs text-ui-muted">{o.at ? 'In your home' : 'In storage'}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {o.at && interior && (
                        <>
                          <span className="mr-1 text-xs text-ui-muted">Move</span>
                          <button type="button" className={SMALL} aria-label="Move left" onClick={() => tryPlace(o, [o.at![0] + NUDGE, o.at![1]], o.rot)}>←</button>
                          <button type="button" className={SMALL} aria-label="Move right" onClick={() => tryPlace(o, [o.at![0] - NUDGE, o.at![1]], o.rot)}>→</button>
                          <button type="button" className={SMALL} aria-label="Move towards the window" onClick={() => tryPlace(o, [o.at![0], o.at![1] + NUDGE], o.rot)}>↑</button>
                          <button type="button" className={SMALL} aria-label="Move towards the door" onClick={() => tryPlace(o, [o.at![0], o.at![1] - NUDGE], o.rot)}>↓</button>
                          <button type="button" className={SMALL} onClick={() => tryPlace(o, o.at!, o.rot ? 0 : 1)}>Turn</button>
                          <button type="button" className={SMALL} onClick={() => onStore(o.uid)}>Put away</button>
                        </>
                      )}
                      {!o.at && interior && <button type="button" className={SMALL} onClick={() => placeStored(o)}>Place in home</button>}
                      <button type="button" className={`${SMALL} ml-auto`} onClick={() => { onSell(o.uid); setNote(`Sold the ${item.name.toLowerCase()} for ${resaleValue(item).toLocaleString()} GHAI.`); }}>
                        Sell · {resaleValue(item).toLocaleString()} GHAI
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
