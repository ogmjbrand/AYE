import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  CATALOGUE, DECOR_ROOMS, catalogueItem, effectLine, findSpot, fits, resaleValue, walkable,
  type CatalogueItem, type DecorRoom, type OwnedFurniture,
} from '../lib/furniture';
import type { Interior } from '../lib/interiors';
import { Piece } from '../world/HomeInterior';
import { Snapshot } from './snapshot/Snapshot';
import type { SnapshotJob } from './snapshot/store';
import { Icon } from './os/icons';

const asPiece = (item: CatalogueItem) => ({ kind: item.kind, at: [0, 0] as const, size: item.size, color: item.color, style: item.style, design: item.design });

/** The piece, rendered to a picture once per session. */
const pieceJob = (item: CatalogueItem): SnapshotJob => ({
  key: `piece:${item.id}`,
  scene: () => <Piece f={asPiece(item)} />,
  view: [0.75, 0.6, -1],
  size: 256,
});

function Coin({ amount, dark = false }: { amount: number; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 font-display text-sm font-bold tabular-nums ${dark ? 'text-[#2a1c06]' : 'text-ui-gold-strong'}`}>
      <span className="grid h-4 w-4 place-items-center rounded-full bg-gradient-to-b from-[#f3d48f] to-[#b8862f] text-[#3a2606]"><Icon name="coin" className="h-3 w-3" /></span>
      {Math.round(amount).toLocaleString()}
    </span>
  );
}

/** A turntable you can drag round, for the Preview. */
function PiecePreview({ item }: { item: CatalogueItem }) {
  const size = Math.max(item.size[0], item.size[1], item.size[2]);
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [size * 1.1, size * 0.9, -size * 1.5], fov: 35 }} gl={{ alpha: true }}>
      <hemisphereLight args={['#fff4e2', '#2a2420', 0.9]} />
      <directionalLight position={[3, 5, -2]} intensity={2.2} />
      <directionalLight position={[-3, 2, 3]} intensity={0.8} color="#e8c27a" />
      <Piece f={asPiece(item)} />
      <OrbitControls target={[0, item.kind === 'art' ? 1.55 : item.size[1] / 2, 0]} enablePan={false} autoRotate autoRotateSpeed={1.2} minDistance={size * 0.8} maxDistance={size * 4} />
    </Canvas>
  );
}

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

const PILL = 'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold';
const SMALL = 'rounded-full border border-ui-gold/30 px-2.5 py-1 text-xs hover:border-ui-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold disabled:cursor-not-allowed disabled:opacity-40';
const NUDGE = 0.25;

/**
 * The home catalogue: browse and buy furniture by category or search, see
 * each piece in 3D, then arrange what you own (move, turn, put away, sell).
 * Opens as a side panel so the room stays in view.
 */
export function FurnitureCatalogue({ balance, owned, interior, onBuy, onSell, onPlace, onStore, onClose }: FurnitureCatalogueProps) {
  const [tab, setTab] = useState<'shop' | 'mine'>('shop');
  const [room, setRoom] = useState<DecorRoom | 'all'>('all');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Escape steps back from a preview first
      if (previewId) setPreviewId(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewId, onClose]);

  // The Luxe collection first, then the rest
  const items = useMemo(() => CATALOGUE.filter((c) => room === 'all' || c.room === room).slice().sort((a, b) => Number(b.style === 'luxe') - Number(a.style === 'luxe')), [room]);

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

  const preview = previewId ? catalogueItem(previewId) : null;
  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full justify-end sm:w-auto" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalogue-title"
        onClick={(e) => e.stopPropagation()}
        className="mt-auto flex max-h-[82vh] w-full flex-col rounded-t-3xl border border-ui-gold/40 bg-[#0b0a09]/95 text-ui-ink shadow-2xl sm:m-4 sm:mt-[5.5rem] sm:max-h-[calc(100vh-11rem)] sm:w-[34rem] sm:rounded-3xl"
      >
        <header className="shrink-0 border-b border-ui-gold/20 px-4 pb-3 pt-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => (preview ? setPreviewId(null) : onClose())} aria-label={preview ? 'Back to the catalogue' : 'Close Home Decor'}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ui-gold/40 text-ui-gold-strong hover:border-ui-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
              <Icon name="back" className="h-4 w-4" />
            </button>
            <h2 id="catalogue-title" className="m-0 font-display text-xl font-bold">{preview ? preview.name : 'Home Decor'}</h2>
            <span className="ml-auto"><Coin amount={balance} /></span>
          </div>
          {!preview && (
            <div className="mt-3 flex gap-1 overflow-x-auto" role="tablist" aria-label="Rooms">
              {DECOR_ROOMS.map((r) => (
                <button key={r.id} type="button" role="tab" aria-selected={tab === 'shop' && room === r.id} onClick={() => { setTab('shop'); setRoom(r.id); }}
                  className={`${PILL} ${tab === 'shop' && room === r.id ? 'bg-ui-gold text-[#2a1c06]' : 'border border-ui-gold/25 text-ui-ink/80 hover:border-ui-gold/60'}`}>
                  {r.label}
                </button>
              ))}
              <button type="button" role="tab" aria-selected={tab === 'mine'} onClick={() => setTab('mine')}
                className={`${PILL} ${tab === 'mine' ? 'bg-ui-gold text-[#2a1c06]' : 'border border-ui-gold/25 text-ui-ink/80 hover:border-ui-gold/60'}`}>
                Yours ({owned.length})
              </button>
            </div>
          )}
          {note && <p role="status" className="m-0 mt-2 text-xs text-ui-gold-strong">{note}</p>}
        </header>

        {preview ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-ui-gold/20 bg-[radial-gradient(circle_at_50%_40%,#2c3a34,#100d0b)]">
              <PiecePreview item={preview} />
            </div>
            <p className="m-0 mt-1 text-center text-[11px] text-ui-faint">Drag to turn it round.</p>
            <p className="m-0 mt-3 text-sm text-ui-ink/90">{preview.description}</p>
            <p className="m-0 mt-2 text-xs text-ui-gold-strong">{effectLine(preview)}</p>
            <p className="m-0 mt-1 text-[11px] text-ui-faint">{preview.size[0]} × {preview.size[2]} m{preview.style === 'luxe' ? ' · Luxe collection' : ''}</p>
            <button type="button" disabled={balance < preview.price} onClick={() => buy(preview)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#e9c77e] to-[#b8862f] px-4 py-3 font-semibold text-[#2a1c06] shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-ui-line disabled:to-ui-line disabled:text-ui-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-gold">
              {balance < preview.price ? 'Not enough GHAI' : <>Buy · <Coin amount={preview.price} dark /></>}
            </button>
            <p className="m-0 mt-2 text-center text-[11px] text-ui-faint">{interior ? 'Delivered straight into your home, where there\u2019s room.' : 'You have no home yet, so it goes into storage.'} Sell back any time for half.</p>
          </div>
        ) : tab === 'shop' ? (
          <ul className="m-0 grid min-h-0 flex-1 list-none grid-cols-2 gap-2.5 overflow-y-auto p-3 sm:grid-cols-3">
            {items.map((item) => (
              <li key={item.id}>
                <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-ui-gold/20 bg-gradient-to-b from-[#1a2622] to-[#111916]">
                  <button type="button" onClick={() => setPreviewId(item.id)} className="block aspect-square w-full bg-[radial-gradient(circle_at_50%_40%,#2c3a34,#100d0b)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold" aria-label={`Preview the ${item.name}`}>
                    <Snapshot job={pieceJob(item)} alt={item.name} className="h-full w-full" />
                  </button>
                  <div className="flex flex-1 flex-col gap-1 px-2.5 pb-2.5 pt-2">
                    <p className="m-0 text-[13px] font-semibold leading-tight">{item.name}</p>
                    <Coin amount={item.price} />
                    <button type="button" onClick={() => setPreviewId(item.id)}
                      className="mt-auto flex items-center justify-center gap-1 rounded-full border border-ui-gold/40 px-2 py-1 text-[11px] font-semibold text-ui-gold-strong hover:border-ui-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
                      <Icon name="eye" className="h-3.5 w-3.5" /> Preview
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {owned.length === 0 && <p className="m-0 text-sm text-ui-muted">You haven't bought any furniture yet. Your home comes furnished; anything you buy goes alongside.</p>}
            {!interior && owned.length > 0 && <p className="m-0 mb-2 text-sm text-ui-muted">You have no home, so everything is in storage.</p>}
            <ul className="m-0 grid list-none gap-2 p-0">
              {owned.map((o) => {
                const item = catalogueItem(o.itemId)!;
                return (
                  <li key={o.uid} className="flex gap-3 rounded-2xl border border-ui-gold/20 bg-[#141d1a] p-2.5">
                    <span className="block h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_40%,#2c3a34,#100d0b)]"><Snapshot job={pieceJob(item)} alt="" className="h-full w-full" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="m-0 text-sm font-semibold">{item.name}</p>
                        <span className="text-xs text-ui-muted">{o.at ? 'In your home' : 'In storage'}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {o.at && interior && (
                          <>
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
                          Sell · {resaleValue(item).toLocaleString()}
                        </button>
                      </div>
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
