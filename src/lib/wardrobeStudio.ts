/**
 * The wardrobe studio (components/WardrobeStudio.tsx): pick from what you
 * own by tab, see it on your character, then confirm or cancel. A draft is
 * the equipped map you're trying; nothing is saved until you confirm.
 *
 * Most tops, bottoms, dresses and shoes restyle the fabric, print and finish
 * of the clothes your character already wears, so their thumbnail is a fabric
 * swatch, labelled as such. The OGM Atelier 3D pieces (`style.garment`) are
 * real garments built on the body (world/skinnedGarment.ts), labelled
 * "3D garment". Hairstyles are real 3D hair and show their own picture.
 */
import { ADORNMENT_SLOTS, FASHION_ITEMS, MAX_OUTFITS, itemById, type FashionItem, type Outfit, type Slot, type Wardrobe } from './fashion';

export type StudioTab = 'tops' | 'bottoms' | 'dresses' | 'shoes' | 'accessories' | 'hairstyles' | 'outfits';
export const STUDIO_TABS: readonly { id: StudioTab; label: string }[] = [
  { id: 'tops', label: 'Tops' },
  { id: 'bottoms', label: 'Bottoms' },
  { id: 'dresses', label: 'Dresses' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'hairstyles', label: 'Hairstyles' },
  { id: 'outfits', label: 'Complete Outfits' },
];

export type Draft = Partial<Record<Slot, string>>;

const ACCESSORY_SLOTS: readonly Slot[] = ['bag', ...ADORNMENT_SLOTS, 'scent'];

/** The skirt sold with a dress (its top), if there is one. */
export function dressBottom(top: FashionItem): FashionItem | undefined {
  return top.dress ? itemById(top.id.replace(/^top-/, 'bottom-')) : undefined;
}
const isDressBottom = (item: FashionItem) => item.slot === 'bottom' && !!itemById(item.id.replace(/^bottom-/, 'top-'))?.dress;

/** What you own on a tab (outfits are listed separately), hearted pieces first. */
export function itemsForTab(wardrobe: Wardrobe, tab: StudioTab, favouritesOnly = false): FashionItem[] {
  const owned = new Set(wardrobe.owned);
  const favs = new Set(wardrobe.favourites ?? []);
  const fits = (i: FashionItem) => {
    switch (tab) {
      case 'tops': return i.slot === 'top' && !i.dress && i.style.garment?.kind !== 'gown' && !i.style.sewn;
      case 'bottoms': return i.slot === 'bottom' && !isDressBottom(i);
      case 'dresses': return i.slot === 'top' && (!!i.dress || i.style.garment?.kind === 'gown' || !!i.style.sewn);
      case 'shoes': return i.slot === 'shoes';
      case 'accessories': return ACCESSORY_SLOTS.includes(i.slot);
      case 'hairstyles': return i.slot === 'hairstyle' || i.slot === 'hair';
      case 'outfits': return false;
    }
  };
  const list = FASHION_ITEMS.filter((i) => owned.has(i.id) && fits(i) && (!favouritesOnly || favs.has(i.id)));
  return [...list.filter((i) => favs.has(i.id)), ...list.filter((i) => !favs.has(i.id))];
}

/** Is this piece in the draft (a dress: its bodice is on)? */
export const isPicked = (draft: Draft, item: FashionItem) => draft[item.slot] === item.id;

/**
 * Tap a thumbnail: put it on, or take it off if it's already on. A dress
 * brings its skirt; a plain top after a dress takes the dress's skirt off.
 */
export function pick(draft: Draft, item: FashionItem, owned: readonly string[]): Draft {
  const next: Draft = { ...draft };
  const worn = itemById(draft.top);
  if (isPicked(draft, item)) {
    delete next[item.slot];
    if (item.dress) { const b = dressBottom(item); if (b && next.bottom === b.id) delete next.bottom; }
    return next;
  }
  next[item.slot] = item.id;
  if (item.dress) {
    const b = dressBottom(item);
    if (b && owned.includes(b.id)) next.bottom = b.id;
  } else if (item.slot === 'top' && worn?.dress) {
    const b = dressBottom(worn);
    if (b && next.bottom === b.id) delete next.bottom;
  } else if (item.slot === 'bottom' && worn?.dress) {
    delete next.top;
  }
  return next;
}

/** Slots the draft changes from what you're wearing. */
export function changedSlots(equipped: Draft, draft: Draft): Slot[] {
  const slots = new Set([...Object.keys(equipped), ...Object.keys(draft)] as Slot[]);
  return [...slots].filter((s) => equipped[s] !== draft[s]);
}

/** Save the draft as a named look; the oldest goes when you're at the limit. A name you've used replaces that look. */
export function saveOutfit(outfits: readonly Outfit[], name: string, draft: Draft): Outfit[] {
  const clean = name.trim().slice(0, 24) || `Look ${outfits.length + 1}`;
  const rest = outfits.filter((o) => o.name.toLowerCase() !== clean.toLowerCase());
  return [...rest, { name: clean, equipped: { ...draft } }].slice(-MAX_OUTFITS);
}

/** A saved look as a draft, keeping only pieces you still own. */
export function outfitDraft(outfit: Outfit, owned: readonly string[]): Draft {
  const out: Draft = {};
  for (const [slot, id] of Object.entries(outfit.equipped) as [Slot, string][]) if (owned.includes(id)) out[slot] = id;
  return out;
}

/** What a thumbnail stands for, said plainly (it is never a separate 3D garment). */
export function thumbnailNote(item: FashionItem): string {
  if (item.style.garment || item.style.sewn) return '3D garment';
  if (item.slot === 'hairstyle') return '3D hairstyle';
  if (item.slot === 'hair') return 'Hair colour';
  if (item.dress) return 'Fabric for your top and bottom';
  if (item.slot === 'top' || item.slot === 'bottom' || item.slot === 'shoes') return `Fabric for your ${item.slot === 'shoes' ? 'shoes' : item.slot}`;
  return 'Worn accessory';
}
