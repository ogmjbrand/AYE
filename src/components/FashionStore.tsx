import { useEffect, useState } from 'react';
import {
  Armchair,
  Check,
  Footprints,
  ScanEye,
  Scissors,
  Shirt,
  ShoppingBag,
  Sparkles,
  UserRound,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  ADORNMENT_SLOTS,
  FASHION_ITEMS,
  MAX_OUTFITS,
  SLOT_LABEL,
  SLOTS,
  itemById,
  stockedIn,
  styleIn,
  swatchCss,
  type FashionItem,
  type Slot,
  type Wardrobe,
} from '../lib/fashion';
import { HOME_DECOR_ITEMS, decorItemById, type HomeDecorPlacement } from '../lib/homeDecor';
import { fashionShowcaseResult } from '../lib/fashionShowcase';
import { FASHION_MISSION_REWARD, fashionMissionStage } from '../lib/fashionMission';
import { GarmentPreviewPanel } from './GarmentPreviewPanel';
import { assetUrl } from '../lib/assetManifest';
import { SkinTonePicker } from './SkinTonePicker';
import type { SkinToneId } from '../lib/skinTone';

interface FashionStoreProps {
  mode: 'shop' | 'wardrobe' | 'decor';
  shop: { name: string; kind: string };
  districtId: string;
  onSaveOutfit?: (name: string) => void;
  onWearOutfit?: (index: number) => void;
  onDeleteOutfit?: (index: number) => void;
  wardrobe: Wardrobe;
  homeId: string | null;
  homeDecor: readonly HomeDecorPlacement[];
  balance: number;
  tryOn: Partial<Record<Slot, string | null>>;
  onTryOn: (slot: Slot, id: string | null) => void;
  onBuy: (item: FashionItem) => void;
  onEquip: (slot: Slot, id: string | null) => void;
  today: number;
  lastShowcaseDay: number;
  fashionMissionItemId: string | null;
  fashionMissionCompleted: boolean;
  onAttendShowcase: () => string | null;
  onPreviewDecor: (itemId: string) => string | null;
  onMoveDecor: (placementId: string) => string | null;
  onRemoveDecor: (placementId: string) => void;
  skinTone?: SkinToneId;
  skinColor?: string;
  onSkinChange: (tone: SkinToneId, color: string) => void;
  onClose: () => void;
}

type Category = 'clothes' | 'shoes' | 'hair' | 'accessories' | 'decor' | 'fitting-room' | 'skin';

const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  clothes: Shirt,
  shoes: Footprints,
  hair: Scissors,
  accessories: Sparkles,
  decor: Armchair,
  'fitting-room': ScanEye,
  skin: UserRound,
};

const CATEGORY_LABELS: Record<Category, string> = {
  clothes: 'Clothes',
  shoes: 'Shoes',
  hair: 'Hair',
  accessories: 'Accessories',
  decor: 'Decor',
  'fitting-room': 'Fitting Room',
  skin: 'Skin & Tone',
};

const CATEGORY_SLOT: Partial<Record<Category, Slot>> = {
  clothes: 'top',
  shoes: 'shoes',
  hair: 'hairstyle',
  accessories: 'bag',
  'fitting-room': 'top',
};

/** Bags, jewellery, sunglasses, nails and fragrance (OGM Atelier). */
const ACCESSORY_SLOTS: readonly Slot[] = ['bag', ...ADORNMENT_SLOTS, 'scent'];

const BUTTON =
  'inline-flex items-center justify-center gap-1.5 border px-2.5 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d2b36f] disabled:cursor-not-allowed disabled:opacity-45';

export function FashionStore({
  mode,
  shop,
  districtId,
  onSaveOutfit,
  onWearOutfit,
  onDeleteOutfit,
  wardrobe,
  homeId,
  homeDecor,
  balance,
  tryOn,
  onTryOn,
  onBuy,
  onEquip,
  today,
  lastShowcaseDay,
  fashionMissionItemId,
  fashionMissionCompleted,
  onAttendShowcase,
  onPreviewDecor,
  onMoveDecor,
  onRemoveDecor,
  skinTone = 'original',
  skinColor,
  onSkinChange,
  onClose,
}: FashionStoreProps) {
  const [category, setCategory] = useState<Category>(mode === 'shop' ? 'clothes' : mode === 'decor' ? 'decor' : 'fitting-room');
  const [slot, setSlot] = useState<Slot>(CATEGORY_SLOT[category] ?? 'top');
  const [message, setMessage] = useState('');
  const [outfitName, setOutfitName] = useState('');
  const [decorRoom, setDecorRoom] = useState<'All' | 'Living Room' | 'Bedroom' | 'Kitchen' | 'Bathroom'>('All');
  const [shoePreviewId, setShoePreviewId] = useState<string | null>(null);
  const [hairstylePreviewId, setHairstylePreviewId] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const outfits = wardrobe.outfits ?? [];
  const homeDecorItems = homeDecor.filter((placement) => placement.homeId === homeId);
  const catalogue = mode === 'shop' ? stockedIn(districtId) : FASHION_ITEMS.filter((item) => wardrobe.owned.includes(item.id));
  const items = catalogue.filter((item) => {
    if (category === 'clothes') return item.slot === slot;
    if (category === 'shoes') return item.slot === 'shoes';
    if (category === 'hair') return item.slot === slot && (slot === 'hair' || slot === 'hairstyle');
    if (category === 'accessories') return item.slot === slot;
    if (category === 'fitting-room') return item.slot === slot;
    return false;
  });
  const wornOrPreviewedShoeId = tryOn.shoes !== undefined ? tryOn.shoes : wardrobe.equipped.shoes;
  const wornOrPreviewedHairstyleId = tryOn.hairstyle !== undefined ? tryOn.hairstyle : wardrobe.equipped.hairstyle;
  const shoePreview = category === 'shoes'
    ? items.find((item) => item.id === shoePreviewId)
      ?? items.find((item) => item.id === wornOrPreviewedShoeId)
      ?? items[0]
    : undefined;
  const hairstylePreview = category === 'hair' && slot === 'hairstyle'
    ? items.find((item) => item.id === hairstylePreviewId)
      ?? items.find((item) => item.id === wornOrPreviewedHairstyleId)
      ?? items.find((item) => item.id === wardrobe.equipped.hairstyle)
      ?? items[0]
    : undefined;
  const equippedId = wardrobe.equipped[slot] ?? null;
  const showcase = fashionShowcaseResult(wardrobe);
  const attendedShowcase = lastShowcaseDay === today;
  const missionStage = fashionMissionStage(fashionMissionItemId, fashionMissionCompleted, wardrobe);
  const missionItem = itemById(fashionMissionItemId);
  const isShop = mode === 'shop';
  const fittingRoom = category === 'fitting-room';
  const visibleDecorItems = HOME_DECOR_ITEMS.filter((item) => decorRoom === 'All' || item.room === decorRoom);

  const selectCategory = (next: Category) => {
    setCategory(next);
    setSlot(CATEGORY_SLOT[next] ?? slot);
    setMessage('');
  };

  const previewItem = (item: FashionItem) => {
    if (item.slot === 'shoes') setShoePreviewId(item.id);
    if (item.slot === 'hairstyle') setHairstylePreviewId(item.id);
    onTryOn(item.slot, item.id);
    setMessage(`${item.name} previewed on your character.`);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-40 text-white">
      {isShop && (
        <div className="pointer-events-auto absolute left-1/2 top-4 -translate-x-1/2 border border-[#c9a35e]/50 bg-[#171615]/90 px-6 py-2 text-center shadow-xl">
          <p className="m-0 flex items-center justify-center gap-2 font-display text-lg font-semibold tracking-[0.12em]">
            <Sparkles size={16} className="text-[#e3bd70]" aria-hidden="true" />
            FASHION HOUSE
          </p>
          <p className="m-0 text-[10px] uppercase tracking-[0.2em] text-[#e3bd70]">Boutique &amp; salon</p>
        </div>
      )}

      <aside
        role="dialog"
        aria-modal="false"
        aria-labelledby="fashion-title"
        className={`pointer-events-auto absolute right-3 top-16 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101317]/95 shadow-2xl backdrop-blur-sm max-sm:inset-x-2 max-sm:bottom-24 max-sm:top-auto max-sm:max-h-[60dvh] ${isShop ? 'bottom-20 w-[21rem] max-w-[calc(100vw-1.5rem)]' : 'bottom-16 w-[21rem] max-w-[calc(100vw-1.5rem)]'}`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="m-0 truncate text-[10px] uppercase tracking-[0.18em] text-white/55">
              {isShop
                ? `${shop.name} · ${shop.kind}`
                : mode === 'decor'
                  ? 'Your home'
                  : 'Your wardrobe'}
            </p>
            <h2 id="fashion-title" className="m-0 mt-0.5 text-lg font-semibold">
              {category === 'fitting-room' ? 'Fitting Room' : category === 'decor' ? 'Home Decor' : CATEGORY_LABELS[category]}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-medium tabular-nums">
              <Wallet size={14} className="text-[#e3bd70]" aria-hidden="true" />
              {balance.toLocaleString()} GHAI
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close fashion catalogue"
              className="border border-white/15 p-1.5 text-white/70 transition hover:border-[#d2b36f] hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {(category === 'clothes' || fittingRoom) && (
          <nav className="flex gap-1.5 overflow-x-auto border-b border-white/10 px-4 py-2" aria-label="Clothing type">
            {(category === 'clothes' ? SLOTS.filter((itemSlot) => itemSlot === 'top' || itemSlot === 'bottom') : SLOTS).map((itemSlot) => (
              <button
                key={itemSlot}
                type="button"
                aria-pressed={slot === itemSlot}
                onClick={() => { setSlot(itemSlot); setMessage(''); }}
                className={`whitespace-nowrap border px-3 py-1.5 text-xs transition ${slot === itemSlot ? 'border-[#e3bd70] bg-[#d2b36f]/15 text-white' : 'border-white/10 text-white/65 hover:border-white/30 hover:text-white'}`}
              >
                {SLOT_LABEL[itemSlot]}
              </button>
            ))}
          </nav>
        )}
        {category === 'accessories' && (
          <nav className="flex gap-1.5 overflow-x-auto border-b border-white/10 px-4 py-2" aria-label="Accessory type">
            {ACCESSORY_SLOTS.map((itemSlot) => (
              <button
                key={itemSlot}
                type="button"
                aria-pressed={slot === itemSlot}
                onClick={() => { setSlot(itemSlot); setMessage(''); }}
                className={`whitespace-nowrap border px-3 py-1.5 text-xs transition ${slot === itemSlot ? 'border-[#e3bd70] bg-[#d2b36f]/15 text-white' : 'border-white/10 text-white/65 hover:border-white/30 hover:text-white'}`}
              >
                {SLOT_LABEL[itemSlot]}
              </button>
            ))}
          </nav>
        )}
        {category === 'hair' && (
          <nav className="flex gap-1.5 border-b border-white/10 px-4 py-2" aria-label="Hair options">
            {(['hairstyle', 'hair'] as const).map((hairSlot) => (
              <button
                key={hairSlot}
                type="button"
                aria-pressed={slot === hairSlot}
                onClick={() => { setSlot(hairSlot); setMessage(''); }}
                className={`whitespace-nowrap border px-3 py-1.5 text-xs transition ${slot === hairSlot ? 'border-[#e3bd70] bg-[#d2b36f]/15 text-white' : 'border-white/10 text-white/65 hover:border-white/30 hover:text-white'}`}
              >
                {SLOT_LABEL[hairSlot]}
              </button>
            ))}
          </nav>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {isShop && (
            <details className="mb-3 border-b border-white/10 pb-3">
              <summary className="cursor-pointer text-xs font-medium text-[#e3bd70]">First Look &amp; Style Showcase</summary>
              <section aria-label="First Look style mission" className="mt-3">
                <p className="m-0 text-xs text-white/75">
                  {missionStage === 'shop' && 'Buy a clothing item, wear it, then enter the City Style Showcase.'}
                  {missionStage === 'wear' && `Wear ${missionItem?.name ?? 'your new piece'} from your wardrobe, then enter the showcase.`}
                  {missionStage === 'showcase' && `Your ${missionItem?.name ?? 'new piece'} is ready. Walk today’s showcase to finish.`}
                  {missionStage === 'complete' && 'Complete · your mission reward has been paid.'}
                  {missionStage === 'complete' && <Check size={14} className="ml-1 inline text-[#e3bd70]" aria-label="Mission complete" />}
                </p>
                <ol className="m-0 mt-2 grid list-none gap-1 p-0 text-[11px] text-white/70">
                  <li>{missionStage === 'shop' ? '1' : '✓'} Buy one clothing item</li>
                  <li>{missionStage === 'wear' || missionStage === 'shop' ? '2' : '✓'} Wear it{missionItem ? ` · ${missionItem.name}` : ''}</li>
                  <li>{missionStage === 'complete' ? '✓' : '3'} Attend the showcase · +{FASHION_MISSION_REWARD} GHAI</li>
                </ol>
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-white/65">Today’s look · {showcase.wornPieces} owned · {showcase.score}/100 · {showcase.tier}</span>
                  <span className="shrink-0 text-[#e3bd70]">{showcase.reward} GHAI</span>
                </div>
                <button
                  type="button"
                  disabled={attendedShowcase}
                  onClick={() => setMessage(onAttendShowcase() ?? 'You already attended today. Come back tomorrow.')}
                  className={`${BUTTON} mt-2 w-full border-[#c9a35e] text-[#f0d797] hover:bg-[#d2b36f]/15`}
                >
                  {attendedShowcase ? 'Showcase attended today' : 'Walk today’s showcase · 30 min'}
                </button>
              </section>
            </details>
          )}

          {category === 'skin' ? (
            <SkinTonePicker
              skinTone={skinTone}
              skinColor={skinColor}
              onChange={onSkinChange}
              variant="dark"
            />
          ) : category === 'decor' ? (
            <>
              <nav className="mb-3 flex gap-1 overflow-x-auto" aria-label="Home décor room">
                {(['All', 'Living Room', 'Bedroom', 'Kitchen', 'Bathroom'] as const).map((room) => (
                  <button
                    key={room}
                    type="button"
                    aria-pressed={decorRoom === room}
                    onClick={() => setDecorRoom(room)}
                    className={`whitespace-nowrap border px-2.5 py-1.5 text-[10px] transition ${decorRoom === room ? 'border-[#e3bd70] bg-[#d2b36f]/15 text-white' : 'border-white/10 text-white/65 hover:border-white/30'}`}
                  >
                    {room}
                  </button>
                ))}
              </nav>
              {homeId === null && (
                <p className="mb-3 border-l-2 border-[#c9a35e] bg-white/5 px-3 py-2 text-xs text-white/70">
                  Choose a home before purchasing furniture. Items can be previewed and placed in your own interior.
                </p>
              )}
              <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-2">
                {visibleDecorItems.map((item) => {
                  const owned = homeDecorItems.filter((placement) => placement.itemId === item.id).length;
                  return (
                    <article key={item.id} className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#181c21] p-2">
                      <div
                        className="mb-2 flex h-20 items-center justify-center rounded-lg border border-white/10"
                        style={{ background: `linear-gradient(145deg, ${item.color}, #1a1b1e)` }}
                        role="img"
                        aria-label={`Illustrated preview of ${item.name}`}
                      >
                        <Armchair size={28} className="text-white/75" aria-hidden="true" />
                      </div>
                      <h3 className="m-0 truncate text-xs font-semibold">{item.name}</h3>
                      <p className="m-0 mt-1 truncate text-[10px] text-white/55">
                        {owned ? `${owned} owned` : `${item.price.toLocaleString()} GHAI`}
                      </p>
                      <button
                        type="button"
                        disabled={!homeId}
                        onClick={() => setMessage(onPreviewDecor(item.id) ?? `Traveling to your home to preview ${item.name}.`)}
                        className={`${BUTTON} mt-2 w-full border-white/20 text-white/80 hover:border-[#c9a35e]`}
                      >
                        Preview
                      </button>
                    </article>
                  );
                })}
                {visibleDecorItems.length === 0 && <p className="col-span-3 py-8 text-center text-sm text-white/65">No furniture in this room yet.</p>}
              </div>
              {homeDecorItems.length > 0 && (
                <section className="mt-4 border-t border-white/10 pt-3">
                  <h3 className="m-0 text-sm font-semibold">Your home furnishings</h3>
                  <ul className="m-0 mt-2 list-none space-y-1.5 p-0">
                    {homeDecorItems.map((placement) => {
                      const item = decorItemById(placement.itemId);
                      if (!item) return null;
                      return (
                        <li key={placement.id} className="flex items-center gap-2 border-b border-white/10 py-2">
                          <span className="min-w-0 flex-1 truncate text-xs">{item.name}</span>
                          <button
                            type="button"
                            onClick={() => setMessage(onMoveDecor(placement.id) ?? `${placement.at ? 'Moving' : 'Placing'} ${item.name}.`)}
                            className={`${BUTTON} border-white/20 text-white/80 hover:border-[#c9a35e]`}
                          >
                            {placement.at ? 'Move' : 'Place'}
                          </button>
                          {placement.at && (
                            <button
                              type="button"
                              onClick={() => { onRemoveDecor(placement.id); setMessage(`${item.name} returned to your furniture inventory.`); }}
                              className={`${BUTTON} border-white/20 text-white/60 hover:border-red-300 hover:text-white`}
                            >
                              Store
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </>
          ) : items.length === 0 ? (
            <p className="m-0 py-10 text-center text-sm text-white/65">
              {fittingRoom ? 'You do not own anything in this category yet.' : 'No items in this category.'}
            </p>
          ) : (
            <>
            {shoePreview && (
              <section className="mb-3 overflow-hidden border border-[#c9a35e]/35 bg-[#181b20]">
                <div className="h-28">
                  <GarmentPreviewPanel item={shoePreview} className="h-full w-full" />
                </div>
                <div className="border-t border-white/10 px-3 py-2">
                  <h3 className="m-0 text-xs font-semibold">{shoePreview.name}</h3>
                  <p className="m-0 mt-1 text-[10px] text-amber-100/70">
                    Procedural placeholder preview — no fitted shoe model is installed yet.
                  </p>
                </div>
              </section>
            )}
            {hairstylePreview?.model?.thumbnail && (
              <section className="mb-3 overflow-hidden border border-[#c9a35e]/35 bg-[#181b20]">
                <img
                  src={assetUrl(hairstylePreview.model.thumbnail)}
                  alt={`${hairstylePreview.name} hairstyle`}
                  className="h-28 w-full bg-[#1a1e24] object-contain"
                />
                <div className="border-t border-white/10 px-3 py-2">
                  <h3 className="m-0 text-xs font-semibold">{hairstylePreview.name}</h3>
                  <p className="m-0 mt-1 text-[10px] text-amber-100/70">
                    CC0 3D hairstyle preview · follows the head during movement.
                  </p>
                </div>
              </section>
            )}
            {(equippedId || slot in tryOn) && (
              <div className="mb-3 flex items-center justify-between gap-2 border border-white/10 bg-[#232730] px-3 py-2">
                <span className="text-xs text-white/70">{equippedId ? `Wearing ${itemById(equippedId)?.name ?? 'a saved item'}` : 'Previewing an item'}</span>
                <div className="flex gap-1.5">
                  {slot in tryOn && (
                    <button type="button" onClick={() => onTryOn(slot, null)} className={`${BUTTON} border-white/20 text-white/75`}>
                      Clear preview
                    </button>
                  )}
                  {equippedId && (
                    <button type="button" onClick={() => onEquip(slot, null)} className={`${BUTTON} border-white/20 text-white/75`}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              {items.map((item) => {
                const owned = wardrobe.owned.includes(item.id);
                    const itemEquippedId = wardrobe.equipped[item.slot] ?? null;
                    const itemShownId = item.slot in tryOn ? tryOn[item.slot] ?? null : itemEquippedId;
                    const wearing = itemEquippedId === item.id;
                    const selected = itemShownId === item.id;
                const affordable = balance >= item.price;
                return (
                  <article key={item.id} className={`min-w-0 border p-2 ${selected ? 'border-[#d2b36f]' : 'border-white/10'} bg-[#232730]`}>
                    {item.slot === 'shoes' ? (
                      <button
                        type="button"
                        aria-pressed={shoePreview?.id === item.id}
                        onClick={() => setShoePreviewId(item.id)}
                        className={`mb-2 flex h-20 w-full flex-col items-center justify-center gap-1 border text-[10px] transition ${shoePreview?.id === item.id ? 'border-[#c9a35e]/60 text-[#f0d797]' : 'border-white/10 text-white/55 hover:border-white/30'}`}
                      >
                        <Footprints size={24} aria-hidden="true" />
                        Inspect placeholder
                      </button>
                    ) : item.model?.thumbnail ? (
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => previewItem(item)}
                        className="relative mb-2 flex h-20 w-full items-center justify-center overflow-hidden border border-white/10 bg-[#1a1e24]"
                      >
                        <img
                          src={assetUrl(item.model.thumbnail)}
                          alt={`${item.name} hairstyle`}
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                        {selected && <Check className="absolute right-1 top-1 drop-shadow-md" size={18} aria-hidden="true" />}
                      </button>
                    ) : (
                      <div
                        className="mb-2 flex h-20 items-center justify-center border border-white/10"
                        style={{ background: swatchCss(styleIn(item, wardrobe.colours?.[item.id])) }}
                        role="img"
                        aria-label={`${item.name} fabric preview`}
                      >
                        {selected && <Check className="drop-shadow-md" size={22} aria-hidden="true" />}
                      </div>
                    )}
                    <h3 className="m-0 truncate text-xs font-semibold">{item.name}</h3>
                    <p className="m-0 mt-1 truncate text-[10px] text-white/55">
                      {item.style.fabric?.name ?? item.collection}{owned ? ' · Owned' : ` · ${item.price.toLocaleString()} GHAI`}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {!wearing && (
                        <button
                          type="button"
                          onClick={() => previewItem(item)}
                          className={`${BUTTON} border-white/20 text-white/80 hover:border-white/50`}
                        >
                          <ScanEye size={13} /> Preview
                        </button>
                      )}
                      {owned ? (
                        <button
                          type="button"
                          disabled={wearing}
                          onClick={() => { onEquip(item.slot, item.id); setMessage(`You are wearing ${item.name}.`); }}
                          className={`${BUTTON} ${wearing ? 'col-span-2' : ''} border-[#c9a35e] text-[#f0d797] hover:bg-[#d2b36f]/15`}
                        >
                          {wearing ? 'Wearing' : 'Wear'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!affordable}
                          title={affordable ? undefined : 'Not enough money'}
                          onClick={() => { onBuy(item); setMessage(`Bought ${item.name}. You're wearing it now.`); }}
                          className={`${BUTTON} border-[#c9a35e] text-[#f0d797] hover:bg-[#d2b36f]/15`}
                        >
                          <ShoppingBag size={13} /> Buy
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            </>
          )}

          {fittingRoom && (
            <section className="mt-4 border-t border-white/10 pt-3">
              <h3 className="m-0 text-sm font-semibold">Saved looks</h3>
              {outfits.length === 0 && <p className="m-0 mt-1 text-xs text-white/55">Save an outfit to find it here.</p>}
              <ul className="m-0 mt-2 list-none space-y-1.5 p-0">
                {outfits.map((outfit, index) => (
                  <li key={`${outfit.name}-${index}`} className="flex items-center gap-2 border-b border-white/10 py-2">
                    <span className="min-w-0 flex-1 truncate text-xs">{outfit.name}</span>
                    <button
                      type="button"
                      onClick={() => { onWearOutfit?.(index); setMessage(`Wearing ${outfit.name}.`); }}
                      className={`${BUTTON} border-white/20 text-white/80 hover:border-white/50`}
                    >
                      Wear
                    </button>
                    <button
                      type="button"
                      onClick={() => { onDeleteOutfit?.(index); setMessage(`Deleted ${outfit.name}.`); }}
                      className={`${BUTTON} border-white/20 text-white/60 hover:border-red-300 hover:text-white`}
                      aria-label={`Delete ${outfit.name}`}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
              {onSaveOutfit && (
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const name = outfitName.trim();
                    if (!name || outfits.length >= MAX_OUTFITS) return;
                    onSaveOutfit(name);
                    setOutfitName('');
                    setMessage('Look saved.');
                  }}
                >
                  <label className="sr-only" htmlFor="fashion-outfit-name">Name this look</label>
                  <input
                    id="fashion-outfit-name"
                    value={outfitName}
                    maxLength={24}
                    onChange={(event) => setOutfitName(event.target.value)}
                    placeholder="Name your look"
                    className="min-w-0 flex-1 border border-white/20 bg-black/25 px-2.5 py-2 text-xs text-white placeholder:text-white/45 focus:border-[#d2b36f] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!outfitName.trim() || outfits.length >= MAX_OUTFITS}
                    className={`${BUTTON} border-[#c9a35e] text-[#f0d797] hover:bg-[#d2b36f]/15`}
                  >
                    Save
                  </button>
                </form>
              )}
              {outfits.length >= MAX_OUTFITS && <p className="m-0 mt-2 text-xs text-white/55">Delete a saved look before adding another.</p>}
            </section>
          )}
        </div>

        <footer className="border-t border-white/10 px-4 py-2 text-[10px] text-white/55" aria-live="polite">
          {message || (category === 'decor'
            ? 'Preview in your 3D home before purchasing; placed furniture remains saved to that home.'
            : category === 'skin'
              ? 'Skin texture and colour update on your character immediately and save with your appearance.'
            : category === 'hair'
            ? 'Choose a real CC0 hairstyle model, or switch to Hair colour to recolour the built-in hair.'
            : 'Previews apply fabric and print to the clothing currently modeled; distinct garment meshes are not yet available.')}
        </footer>
      </aside>

      <nav
        aria-label="Fashion House categories"
        className="pointer-events-auto absolute bottom-4 left-1/2 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 overflow-x-auto border border-white/15 bg-[#171615]/95 shadow-xl max-sm:bottom-2"
      >
        {(Object.keys(CATEGORY_LABELS) as Category[]).filter((itemCategory) => mode === 'wardrobe' || itemCategory !== 'skin').map((itemCategory) => {
          const Icon = CATEGORY_ICONS[itemCategory];
          const selected = category === itemCategory;
          return (
            <button
              key={itemCategory}
              type="button"
              aria-pressed={selected}
              onClick={() => selectCategory(itemCategory)}
              className={`flex min-w-[6.4rem] flex-col items-center gap-1 border-r border-white/10 px-3 py-2.5 text-[11px] transition last:border-r-0 max-sm:min-w-[4.8rem] max-sm:px-2 ${selected ? 'bg-[#d2b36f]/15 text-[#f0d797]' : 'text-white/75 hover:bg-white/5'}`}
            >
              <Icon size={19} aria-hidden="true" />
              <span className="whitespace-nowrap">{CATEGORY_LABELS[itemCategory]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
