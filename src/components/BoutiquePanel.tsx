import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Vector3 } from 'three';
import { swatchCss, type FashionItem, type Slot, type Style, type Wardrobe } from '../lib/fashion';
import type { BodyShape } from '../lib/bodyShape';
import { Avatar } from './Avatar';
import { useSnapshot, type SnapshotJob } from './snapshot/store';
import { CLOTHES_TABS, NOT_YET, cartTotal, rangeFor, setsIn, type BoutiqueSection, type ClothesTab, type FashionSet } from '../lib/boutique';
import { Icon } from './os/icons';

const svg = (path: string) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='${path}'/></svg>`)}")`;
const SHAPE: Record<Slot, string> = {
  top: svg('M30 10 L44 5 Q50 13 56 5 L70 10 L90 30 L77 41 L70 34 L70 93 L30 93 L30 34 L23 41 L10 30 Z'),
  bottom: svg('M29 7 L71 7 L76 93 L57 93 L50 38 L43 93 L24 93 Z'),
  shoes: svg('M8 64 Q10 40 30 42 L44 46 Q55 28 67 40 L88 58 Q95 67 90 74 L10 74 Z'),
  hair: svg('M50 6 C20 6 13 34 18 60 C20 78 14 90 9 95 L34 95 C30 80 34 64 34 50 C34 30 42 22 50 22 C58 22 66 30 66 50 C66 64 70 80 66 95 L91 95 C86 90 80 78 82 60 C87 34 80 6 50 6 Z'),  // 3D hairstyles share the hair silhouette
  hairstyle: svg('M50 6 C20 6 13 34 18 60 C20 78 14 90 9 95 L34 95 C30 80 34 64 34 50 C34 30 42 22 50 22 C58 22 66 30 66 50 C66 64 70 80 66 95 L91 95 C86 90 80 78 82 60 C87 34 80 6 50 6 Z'),
};

/** The garment's outline filled with its fabric, lit softly from above. */
function Garment({ item, className = '', style }: { item: FashionItem; className?: string; style?: CSSProperties }) {
  const mask: CSSProperties = { WebkitMaskImage: SHAPE[item.slot], maskImage: SHAPE[item.slot], WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' };
  return (
    <span className={`relative block ${className}`} style={style} role="img" aria-label={item.name}>
      <span className="absolute inset-0" style={{ ...mask, background: swatchCss(item.style) }} />
      <span className="absolute inset-0" style={{ ...mask, background: 'linear-gradient(160deg, rgba(255,255,255,0.22), rgba(0,0,0,0) 45%, rgba(0,0,0,0.28))' }} />
    </span>
  );
}

const STILL = { position: new Vector3(), direction: 0, velocity: new Vector3(), applyMovement: () => {} };

/** Who you are, for pictures of clothes on your own character. */
export interface WearerLook {
  lookId: string;
  heightCm?: number;
  shape?: BodyShape;
  skinTone?: number;
}

/** A picture of the piece on your character, framed on where it's worn (sets: the whole outfit). */
function wearJob(items: FashionItem[], w: WearerLook): SnapshotJob {
  const h = (w.heightCm ?? 170) / 100;
  const styles = Object.fromEntries(items.map((i) => [i.slot, i.style])) as Partial<Record<Slot, Style>>;
  const where = items.length > 1 ? 'set' : items[0].slot;
  const camera = {
    top: { position: [0.2, 0.74 * h, 1.05], target: [0, 0.72 * h, 0], fov: 32 },
    bottom: { position: [0.25, 0.34 * h, 1.5], target: [0, 0.3 * h, 0], fov: 32 },
    shoes: { position: [0.45, 0.22, 0.75], target: [0, 0.06, 0.05], fov: 30 },
    hair: { position: [0.3, 0.94 * h, 0.75], target: [0, 0.92 * h, 0], fov: 30 },
    hairstyle: { position: [0.3, 0.94 * h, 0.75], target: [0, 0.92 * h, 0], fov: 30 },
    set: { position: [0.35, 0.55 * h, 2.9], target: [0, 0.5 * h, 0], fov: 32 },
  }[where] as SnapshotJob['camera'];
  return {
    key: `wear:${w.lookId}:${w.heightCm ?? 0}:${w.skinTone ?? 0}:${JSON.stringify(w.shape ?? null)}:${items.map((i) => i.id).join('+')}`,
    scene: () => <Avatar controller={STILL} own lookId={w.lookId} heightCm={w.heightCm} styles={styles} shape={w.shape} skinTone={w.skinTone} />,
    camera,
    size: 320,
  };
}

/** The piece on you once it's rendered; its fabric outline until then. */
function Worn({ items, wearer }: { items: FashionItem[]; wearer: WearerLook }) {
  const url = useSnapshot(wearJob(items, wearer));
  if (url) return <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />;
  return items.length === 2
    ? <><Garment item={items[0]} className="h-[46%] w-[46%]" /><Garment item={items[1]} className="h-[46%] w-[46%]" /></>
    : <Garment item={items[0]} className="h-[82%] w-[82%]" />;
}

function Coin({ amount, dark = false }: { amount: number; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 font-display text-sm font-bold tabular-nums ${dark ? 'text-[#2a1c06]' : 'text-ui-gold-strong'}`}>
      <span className="grid h-4 w-4 place-items-center rounded-full bg-gradient-to-b from-[#f3d48f] to-[#b8862f] text-[#3a2606]"><Icon name="coin" className="h-3 w-3" /></span>
      {Math.round(amount).toLocaleString()}
    </span>
  );
}

const TITLE: Record<BoutiqueSection, string> = { clothes: 'Clothes', shoes: 'Shoes', hair: 'Hair', accessories: 'Accessories' };

interface Card {
  id: string;
  name: string;
  price: number;
  items: FashionItem[];
}

/**
 * The boutique's collections: browse by section and tab, favourite with the
 * heart, add to the cart and check out. Tapping a piece tries it on your
 * character. Clothes restyle the fabric of what your character wears.
 */
export function BoutiquePanel({ section, districtId, wearer, wardrobe, balance, onTryOn, onBuyMany, onWear, onToggleFavourite, onClose }: {
  section: BoutiqueSection;
  /** Your character, so the pictures show each piece on you. */
  wearer: WearerLook;
  districtId: string;
  wardrobe: Wardrobe;
  balance: number;
  onTryOn: (slot: Slot, id: string | null) => void;
  /** Pays for every item at once and puts them on. */
  onBuyMany: (items: FashionItem[]) => void;
  onWear: (item: FashionItem) => void;
  onToggleFavourite: (id: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<ClothesTab>('all');
  const [cart, setCart] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sets = useMemo(() => setsIn(districtId), [districtId]);
  const cards: Card[] = useMemo(() => {
    if (section === 'clothes' && tab === 'sets') return sets.map((s: FashionSet) => ({ id: s.id, name: s.name, price: s.price, items: [s.top, s.bottom] }));
    return rangeFor(districtId, section, tab).map((i) => ({ id: i.id, name: i.name, price: i.price, items: [i] }));
  }, [section, tab, districtId, sets]);
  const notYet = section === 'clothes' ? NOT_YET[tab] : NOT_YET[section];
  const favourites = wardrobe.favourites ?? [];
  const owned = wardrobe.owned;
  const inCart = (c: Card) => c.items.every((i) => cart.includes(i.id) || owned.includes(i.id));
  // The cart keeps items from other tabs too, so look them up across everything this shop sells
  const allItems = useMemo(() => [...rangeFor(districtId, 'clothes'), ...rangeFor(districtId, 'shoes'), ...rangeFor(districtId, 'hair')], [districtId]);
  const cartFull = cart.map((id) => allItems.find((i) => i.id === id)).filter((i): i is FashionItem => !!i);
  const total = cartTotal(cartFull, owned);

  const toggleCart = (c: Card) => {
    const ids = c.items.filter((i) => !owned.includes(i.id)).map((i) => i.id);
    if (!ids.length) return;
    setCart((list) => (ids.every((id) => list.includes(id)) ? list.filter((id) => !ids.includes(id)) : [...new Set([...list, ...ids])]));
    setNote(null);
  };
  const checkout = () => {
    const buying = cartFull.filter((i) => !owned.includes(i.id));
    if (!buying.length || balance < total) return;
    onBuyMany(buying);
    setCart([]);
    setNote(`Bought ${buying.length === 1 ? buying[0].name : `${buying.length} pieces`} for ${total.toLocaleString()} GHAI. You're wearing ${buying.length === 1 ? 'it' : 'them'} now.`);
  };

  return (
    <aside role="dialog" aria-label={TITLE[section]}
      className="fixed inset-x-0 bottom-0 z-40 flex max-h-[78vh] flex-col rounded-t-3xl border border-ui-gold/40 bg-[#0d1412]/95 text-ui-ink shadow-2xl sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-[5.5rem] sm:max-h-[calc(100vh-11rem)] sm:w-[26rem] sm:rounded-3xl">
      <header className="flex shrink-0 items-center gap-3 border-b border-ui-gold/20 px-4 py-3">
        <button type="button" onClick={onClose} aria-label={`Close ${TITLE[section]}`}
          className="grid h-9 w-9 place-items-center rounded-full border border-ui-gold/40 text-ui-gold-strong hover:border-ui-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
          <Icon name="back" className="h-4 w-4" />
        </button>
        <h2 className="m-0 font-display text-xl font-bold">{TITLE[section]}</h2>
        <span className="ml-auto"><Coin amount={balance} /></span>
      </header>
      {section === 'clothes' && (
        <div role="tablist" aria-label="Clothes" className="flex shrink-0 gap-1 overflow-x-auto px-3 pt-3">
          {CLOTHES_TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold ${tab === t.id ? 'bg-ui-gold text-[#2a1c06]' : 'border border-ui-gold/25 text-ui-ink/80 hover:border-ui-gold/60'}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {notYet ? (
        <div className="m-4 rounded-2xl border border-ui-gold/25 bg-ui-gold/5 p-4">
          <p className="m-0 text-sm font-semibold text-ui-gold-strong">Not in the game yet</p>
          <p className="m-0 mt-1.5 text-sm text-ui-ink/85">{notYet}</p>
        </div>
      ) : (
        <ul className="m-0 grid min-h-0 list-none grid-cols-2 gap-2.5 overflow-y-auto p-3">
          {cards.map((c) => {
            const have = c.items.every((i) => owned.includes(i.id));
            const fav = favourites.includes(c.id);
            const wearing = c.items.every((i) => wardrobe.equipped[i.slot] === i.id);
            return (
              <li key={c.id}>
                <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-ui-gold/20 bg-gradient-to-b from-[#1a2622] to-[#111916]">
                  <div className="relative">
                    <button type="button" onClick={() => c.items.forEach((i) => onTryOn(i.slot, i.id))} aria-label={`Try on ${c.name}`}
                      className="flex aspect-square w-full flex-col items-center justify-center gap-1 overflow-hidden bg-[radial-gradient(circle_at_50%_35%,#3a3430,#16120f)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
                      <Worn items={c.items} wearer={wearer} />
                    </button>
                    <button type="button" onClick={() => onToggleFavourite(c.id)} aria-pressed={fav} aria-label={fav ? `Remove ${c.name} from favourites` : `Add ${c.name} to favourites`}
                      className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/85 shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold ${fav ? 'text-[#d6455d]' : 'text-[#5a4a42]'}`}>
                      <Icon name="heart" className={`h-4 w-4 ${fav ? '[&_path]:fill-current' : ''}`} />
                    </button>
                  </div>
                  <div className="flex flex-1 items-end justify-between gap-2 px-2.5 pb-2.5 pt-2">
                    <div className="min-w-0">
                      <p className="m-0 text-[13px] font-semibold leading-tight">{c.name}</p>
                      {have ? <p className="m-0 mt-1 text-[11px] font-semibold text-ui-accent-strong">{wearing ? 'Wearing' : 'Owned'}</p> : <span className="mt-1 block"><Coin amount={c.price} /></span>}
                    </div>
                    {have ? (
                      !wearing && (
                        <button type="button" onClick={() => c.items.forEach(onWear)} className="shrink-0 rounded-full border border-ui-gold/40 px-2.5 py-1 text-[11px] font-semibold text-ui-gold-strong hover:border-ui-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">Wear</button>
                      )
                    ) : (
                      <button type="button" onClick={() => toggleCart(c)} aria-pressed={inCart(c)} aria-label={inCart(c) ? `Remove ${c.name} from the cart` : `Add ${c.name} to the cart`}
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold ${inCart(c) ? 'bg-ui-gold text-[#2a1c06]' : 'border border-ui-gold/40 text-ui-gold-strong hover:border-ui-gold'}`}>
                        <Icon name={inCart(c) ? 'check' : 'cart'} className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="shrink-0 border-t border-ui-gold/20 px-4 py-3">
        {cart.length > 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-sm"><span className="font-semibold">Cart ({cart.length})</span> · <Coin amount={total} /></span>
            <button type="button" onClick={() => setCart([])} className="ml-auto rounded-full px-2 py-1 text-xs text-ui-muted hover:text-ui-ink">Empty</button>
            <button type="button" onClick={checkout} disabled={balance < total}
              className="rounded-full bg-gradient-to-b from-[#e9c77e] to-[#b8862f] px-4 py-2 text-sm font-semibold text-[#2a1c06] hover:brightness-110 disabled:cursor-not-allowed disabled:from-ui-line disabled:to-ui-line disabled:text-ui-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-gold">
              {balance < total ? 'Not enough GHAI' : 'Checkout'}
            </button>
          </div>
        ) : (
          <p className="m-0 text-[11px] text-ui-muted" aria-live="polite">{note ?? 'Tap a piece to try it on. Clothes restyle the fabric of what your character wears; new cuts are coming with new 3D clothes.'}</p>
        )}
      </footer>
    </aside>
  );
}

/** The store assistant's welcome at the reception desk. */
export function AssistantPanel({ name, shop, onSection, onFitting, onDecor, onClose }: {
  name: string;
  shop: string;
  onSection: (s: BoutiqueSection) => void;
  onFitting: () => void;
  onDecor: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const chip = 'rounded-full border border-ui-gold/40 px-3.5 py-2 text-sm font-semibold text-ui-gold-strong hover:border-ui-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold';
  return (
    <div role="dialog" aria-label={`${name}, the store assistant`} className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-lg rounded-3xl border border-ui-gold/40 bg-[#0d1412]/95 p-4 text-ui-ink shadow-2xl sm:bottom-28">
      <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-ui-gold-strong">{name} · Store Assistant · computer-controlled</p>
      <p className="m-0 mt-2 text-sm">“Welcome to {shop}! Explore our new collections. Anything you like, try it on before you buy.”</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onSection('clothes')} className="rounded-full bg-gradient-to-b from-[#e9c77e] to-[#b8862f] px-4 py-2 text-sm font-semibold text-[#2a1c06] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-gold">Explore new collections</button>
        <button type="button" onClick={() => onSection('shoes')} className={chip}>Shoes</button>
        <button type="button" onClick={() => onSection('hair')} className={chip}>Hair</button>
        <button type="button" onClick={onDecor} className={chip}>Decor</button>
        <button type="button" onClick={onFitting} className={chip}>Fitting Room</button>
        <button type="button" onClick={onClose} className="rounded-full px-3 py-2 text-sm text-ui-muted hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">Not now</button>
      </div>
    </div>
  );
}
