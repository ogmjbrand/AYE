import { Suspense, useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { Check, Heart, Loader2, Palette, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { MAX_OUTFITS, itemById, resolveStyles, styleIn, swatchCss, type FashionItem, type Outfit, type Wardrobe } from '../lib/fashion';
import { assetUrl } from '../lib/assetManifest';
import { STUDIO_TABS, changedSlots, isPicked, itemsForTab, outfitDraft, pick, saveOutfit, thumbnailNote, type Draft, type StudioTab } from '../lib/wardrobeStudio';
import { CharacterPreview, type PreviewView } from './CharacterPreview';

/** A dress is named as the dress, not its bodice. */
const shown = (item: FashionItem) => item.name.replace(/ · bodice$/, '');
import type { Character } from './CharacterCreation';

/**
 * The wardrobe: your character on a stage, turned with a drag or the
 * Front / Side / Back buttons, and a sheet of what you own by tab. Tapping a
 * thumbnail dresses the character there and then; Confirm wears the look,
 * Cancel puts back what you had on, Save Outfit keeps it under a name.
 * Upright phones stack the stage over the sheet; sideways and on desktops
 * they sit side by side.
 */
export function WardrobeStudio({ character, onConfirm, onSaveOutfits, onToggleFavourite, onMore, onClose }: {
  character: Character;
  /** Wear the draft (only the changed slots differ). */
  onConfirm: (draft: Draft) => void;
  onSaveOutfits: (outfits: Outfit[]) => void;
  onToggleFavourite: (id: string) => void;
  /** Skin, colours and the fashion showcase, in the full wardrobe panel. */
  onMore?: () => void;
  onClose: () => void;
}) {
  const wardrobe: Wardrobe = character.wardrobe;
  const [draft, setDraft] = useState<Draft>(() => ({ ...wardrobe.equipped }));
  const [tab, setTab] = useState<StudioTab>('tops');
  const [favOnly, setFavOnly] = useState(false);
  const [view, setView] = useState<PreviewView | null>(null);
  const [naming, setNaming] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const loading = useProgress((s) => s.active);
  const changed = changedSlots(wardrobe.equipped, draft);
  const outfits = wardrobe.outfits ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const items = tab === 'outfits' ? [] : itemsForTab(wardrobe, tab, favOnly);
  const tap = (item: FashionItem) => {
    const next = pick(draft, item, wardrobe.owned);
    setDraft(next);
    setNote(isPicked(next, item) ? `Trying on ${shown(item)}` : `Took off ${shown(item)}`);
  };
  const save = () => {
    if (naming === null) { setNaming(''); return; }
    onSaveOutfits(saveOutfit(outfits, naming, draft));
    setNote(`Saved “${naming.trim() || `Look ${outfits.length + 1}`}” to Complete Outfits`);
    setNaming(null);
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="studio-title"
      className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#3a3d44] via-[#2b2d33] to-[#16171b] text-ui-ink landscape:flex-row"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }}>
      {/* The stage */}
      <section className="relative min-h-0 flex-[1_1_46%] landscape:flex-[1_1_42%]" aria-label="Your character">
        <div className="absolute inset-0" title="Drag to turn">
          <Suspense fallback={null}>
            <CharacterPreview
              lookId={character.lookId}
              heightCm={character.heightCm}
              styles={resolveStyles(draft, undefined, wardrobe.colours)}
              shape={character.shape}
              skinTone={character.skinTone}
              skinToneId={character.skinToneId}
              skinColor={character.skinColor}
              hairstyleItemId={draft.hairstyle}
              view={view}
              onViewReleased={() => setView(null)}
              interactive
            />
          </Suspense>
        </div>
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div>
            <p className="m-0 text-[10px] uppercase tracking-[0.2em] text-ui-gold-strong">Your wardrobe</p>
            <h2 id="studio-title" className="m-0 font-display text-lg font-semibold">{character.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close the wardrobe without changing" className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/30 text-white/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
            <X size={18} />
          </button>
        </div>
        {loading && (
          <p role="status" className="absolute left-1/2 top-1/2 m-0 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs">
            <Loader2 size={14} className="animate-spin text-ui-gold-strong" aria-hidden="true" /> Dressing your character…
          </p>
        )}
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5" role="group" aria-label="Turn your character">
          {(['front', 'side', 'back'] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v}
              className={`min-h-9 rounded-full border px-3 text-xs font-semibold capitalize focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold ${view === v ? 'border-ui-gold bg-ui-gold/20 text-ui-gold-strong' : 'border-white/15 bg-black/35 text-white/80'}`}>{v}</button>
          ))}
        </div>
      </section>

      {/* The sheet */}
      <section className="flex min-h-0 flex-[1_1_54%] flex-col border-t border-white/10 bg-[#121316]/95 landscape:flex-[1_1_58%] landscape:border-l landscape:border-t-0" aria-label="Clothes you own">
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 px-2 py-1.5" role="tablist" aria-label="Wardrobe sections">
          {STUDIO_TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`min-h-9 shrink-0 whitespace-nowrap rounded-full px-3 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold ${tab === t.id ? 'bg-ui-gold text-[#1d1406]' : 'text-white/70 hover:text-white'}`}>{t.label}</button>
          ))}
        </nav>
        <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-1.5 text-[11px] text-white/60">
          <span aria-live="polite" className="min-w-0 truncate">{note || (tab === 'outfits' ? `${outfits.length} of ${MAX_OUTFITS} looks saved` : 'Tap to try on · tap again to take off')}</span>
          {tab !== 'outfits' && (
            <button type="button" onClick={() => setFavOnly((v) => !v)} aria-pressed={favOnly} className={`flex min-h-8 shrink-0 items-center gap-1 rounded-full border px-2.5 ${favOnly ? 'border-[#e5484d] text-[#ff8a8e]' : 'border-white/15'}`}>
              <Heart size={12} className={favOnly ? 'fill-current' : ''} aria-hidden="true" /> Favourites
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
          {tab === 'outfits' ? (
            outfits.length === 0
              ? <p className="m-0 p-4 text-center text-sm text-white/60">No saved looks yet. Dress your character and tap Save Outfit.</p>
              : (
                <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3">
                  {outfits.map((o, i) => {
                    const on = changedSlots(outfitDraft(o, wardrobe.owned), draft).length === 0;
                    return (
                      <li key={`${o.name}-${i}`} className={`relative rounded-xl border p-2 ${on ? 'border-ui-gold bg-ui-gold/10' : 'border-white/10 bg-white/5'}`}>
                        <button type="button" onClick={() => { setDraft(outfitDraft(o, wardrobe.owned)); setNote(`Trying on ${o.name}`); }} className="block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold" aria-pressed={on}>
                          <span className="flex h-12 gap-1" aria-hidden="true">
                            {(['top', 'bottom', 'shoes'] as const).map((s) => {
                              const it = itemById(o.equipped[s]);
                              return <span key={s} className="flex-1 rounded-md border border-white/10" style={{ background: it ? swatchCss(styleIn(it, wardrobe.colours?.[it.id])) : '#2a2b30' }} />;
                            })}
                          </span>
                          <span className="mt-1.5 block truncate text-xs font-semibold">{o.name}</span>
                        </button>
                        <button type="button" onClick={() => onSaveOutfits(outfits.filter((_, k) => k !== i))} aria-label={`Delete ${o.name}`} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/50 text-white/70 hover:text-white">
                          <Trash2 size={12} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )
          ) : items.length === 0 ? (
            <p className="m-0 p-4 text-center text-sm text-white/60">{favOnly ? 'Nothing hearted here yet.' : 'Nothing here yet. The Fashion House sells these.'}</p>
          ) : (
            <ul className="m-0 grid list-none grid-cols-4 gap-2 p-0 sm:grid-cols-5 landscape:grid-cols-5 lg:grid-cols-6">
              {items.map((item) => {
                const on = isPicked(draft, item);
                const fav = (wardrobe.favourites ?? []).includes(item.id);
                const thumb = item.model?.thumbnail;
                return (
                  <li key={item.id} className="relative">
                    <button type="button" onClick={() => tap(item)} aria-pressed={on} title={`${shown(item)} · ${thumbnailNote(item)}`}
                      className={`block w-full overflow-hidden rounded-xl border-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold ${on ? 'border-ui-gold shadow-[0_0_0_2px_rgba(240,198,126,0.35)]' : 'border-white/10'}`}>
                      <span className="relative block aspect-square" style={thumb ? { background: '#1d1f24' } : { background: swatchCss(styleIn(item, wardrobe.colours?.[item.id])) }}>
                        {thumb && <img src={assetUrl(thumb)} alt="" className="h-full w-full object-cover" draggable={false} />}
                        {on && <span className="absolute bottom-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-ui-gold text-[#1d1406]" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>}
                      </span>
                      <span className="block bg-black/60 px-1.5 py-1">
                        <span className="block truncate text-[10px] font-semibold leading-tight">{shown(item).replace(/^OGM Atelier /, '')}</span>
                        <span className="block truncate text-[9px] leading-tight text-white/55">{thumbnailNote(item)}</span>
                      </span>
                    </button>
                    <button type="button" onClick={() => onToggleFavourite(item.id)} aria-pressed={fav} aria-label={fav ? `Remove ${shown(item)} from favourites` : `Add ${shown(item)} to favourites`}
                      className="absolute right-0.5 top-0.5 grid h-8 w-8 place-items-center rounded-full text-white drop-shadow">
                      <Heart size={14} className={fav ? 'fill-[#e5484d] text-[#e5484d]' : ''} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {naming !== null && (
          <form className="flex shrink-0 gap-2 border-t border-white/10 px-3 py-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <label className="sr-only" htmlFor="outfit-name">Name this look</label>
            <input id="outfit-name" autoFocus maxLength={24} value={naming} onChange={(e) => setNaming(e.target.value)} placeholder={`Look ${outfits.length + 1}`}
              className="min-h-10 min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-3 text-sm text-white placeholder:text-white/40" />
            <button type="submit" className="min-h-10 rounded-lg bg-ui-gold px-3 text-xs font-bold text-[#1d1406]">Save</button>
            <button type="button" onClick={() => setNaming(null)} className="min-h-10 rounded-lg border border-white/15 px-3 text-xs">Back</button>
          </form>
        )}

        <footer className="flex shrink-0 items-center gap-2 border-t border-white/10 px-3 py-2">
          <button type="button" onClick={() => { setDraft({ ...wardrobe.equipped }); onClose(); }}
            className="flex min-h-11 items-center gap-1.5 rounded-xl border border-white/15 px-3 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
            <RotateCcw size={14} aria-hidden="true" /> Cancel
          </button>
          <button type="button" onClick={save} disabled={naming !== null}
            className="flex min-h-11 items-center gap-1.5 rounded-xl border border-ui-gold/60 px-3 text-xs font-semibold text-ui-gold-strong disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
            <Save size={14} aria-hidden="true" /> Save Outfit
          </button>
          {onMore && (
            <button type="button" onClick={onMore} aria-label="Skin, colours and showcase" title="Skin, colours and showcase"
              className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-white/15 text-white/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
              <Palette size={16} />
            </button>
          )}
          <button type="button" onClick={() => onConfirm(draft)}
            className="ml-auto flex min-h-11 items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#f3d48f] to-[#b8862f] px-4 text-xs font-bold text-[#1d1406] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-gold">
            <Check size={15} aria-hidden="true" /> Confirm{changed.length ? ` (${changed.length})` : ''}
          </button>
        </footer>
      </section>
    </div>
  );
}
