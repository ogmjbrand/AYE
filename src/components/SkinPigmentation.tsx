import { RefreshCw } from 'lucide-react';
import {
  ALBINISM_EYES, BASE_SKINS, SKIN_PRESETS, VITILIGO_LOCATIONS, presetSkin, skinColour, skinPreset,
  type AlbinismEyes, type AlbinismHair, type SkinAppearance, type SkinPresetId, type VitiligoLocation,
} from '../lib/skinAppearance';

const LABEL = 'text-xs font-semibold uppercase tracking-[0.18em] text-cc-gold mb-2';
const SHADE_NAMES = ['Lighter', 'Middle', 'Deeper'] as const;
const HAIR: readonly { id: AlbinismHair; label: string; color?: string }[] = [
  { id: 'white', label: 'White', color: '#f4f1ea' }, { id: 'platinum', label: 'Platinum', color: '#e6dcc4' },
  { id: 'pale-blonde', label: 'Pale blonde', color: '#e3cf9c' }, { id: 'own', label: 'Keep own' },
];
const EYES: readonly { id: AlbinismEyes; label: string }[] = [
  { id: 'blue', label: 'Blue' }, { id: 'grey', label: 'Grey' }, { id: 'violet', label: 'Violet' }, { id: 'light-brown', label: 'Light brown' },
];

function Range({ id, label, value, onChange, ends }: { id: string; label: string; value: number; onChange: (v: number) => void; ends: [string, string] }) {
  const pct = Math.round(Math.abs(value) * 100);
  const display = value === 0 ? 'Natural' : `${pct}% ${value > 0 ? ends[1].toLowerCase() : ends[0].toLowerCase()}`;
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-center gap-3">
      <label htmlFor={id} className="text-sm text-cc-muted">{label}</label>
      <div>
        <input id={id} type="range" min={-1} max={1} step={0.05} value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-valuetext={display} className="w-full cursor-pointer accent-cc-gold" />
        <div className="flex justify-between text-[11px] text-cc-muted"><span>{ends[0]}</span><span className="text-cc-ink">{display}</span><span>{ends[1]}</span></div>
      </div>
    </div>
  );
}

const chip = (on: boolean) => `min-h-9 rounded-full border px-3 text-[13px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold ${on ? 'border-cc-gold bg-cc-gold/15 text-cc-ink' : 'border-cc-line text-cc-muted hover:border-cc-gold/60'}`;

/** A preset's tile swatch: Vitiligo shows its base and a patch, split on the diagonal. */
function Swatch({ id, size = 'h-14 w-14' }: { id: SkinPresetId; size?: string }) {
  const p = skinPreset(id);
  const style = id === 'vitiligo'
    ? { background: `linear-gradient(135deg, ${p.shades[1]} 50%, #f2d8cb 50%)` }
    : { background: p.shades[1] };
  return <span aria-hidden="true" className={`${size} shrink-0 rounded-2xl border border-black/10 shadow-inner`} style={style} />;
}

/**
 * The creator's Skin & pigmentation section: eight starting points, a shade within each, fine-tuning
 * of pigmentation, undertone and saturation, and the settings for vitiligo and albinism. It changes
 * only the skin's pigmentation: the person's face, body, hair style and clothes stay theirs.
 */
export function SkinPigmentation({ skin, onChange }: { skin: SkinAppearance | undefined; onChange: (s: SkinAppearance | undefined) => void }) {
  const set = (patch: Partial<SkinAppearance>) => skin && onChange({ ...skin, ...patch });
  const vit = skin?.vitiligo;
  const alb = skin?.albinism;
  return (
    <section aria-label="Skin and pigmentation" className="space-y-4">
      <div>
        <p className={LABEL}>Skin &amp; pigmentation</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Skin presets">
          {SKIN_PRESETS.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={skin?.preset === p.id}
              onClick={() => onChange(skin?.preset === p.id ? skin : presetSkin(p.id))}
              className={`flex items-center gap-3 rounded-2xl border p-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold ${skin?.preset === p.id ? 'border-cc-gold bg-cc-gold/10' : 'border-cc-line hover:border-cc-gold/60'}`}>
              <Swatch id={p.id} size="h-11 w-11" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-cc-ink">{p.label}</span>
                <span className="block text-[11px] leading-snug text-cc-muted">{p.description}</span>
              </span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => onChange(undefined)} aria-pressed={!skin}
          className={`mt-2 ${chip(!skin)}`}>Keep this person&rsquo;s own skin</button>
      </div>

      {skin && skin.preset !== 'vitiligo' && (
        <div>
          <p className={LABEL}>Shade</p>
          <div className="flex gap-2" role="radiogroup" aria-label={`${skinPreset(skin.preset).label} shades`}>
            {skinPreset(skin.preset).shades.map((c, i) => (
              <button key={i} type="button" role="radio" aria-checked={skin.shade === i} onClick={() => set({ shade: i as 0 | 1 | 2 })}
                className={`flex items-center gap-2 ${chip(skin.shade === i)}`}>
                <span aria-hidden="true" className="h-5 w-5 rounded-full border border-black/10" style={{ background: c }} />{SHADE_NAMES[i]}
              </button>
            ))}
          </div>
        </div>
      )}

      {vit && skin && (
        <div className="space-y-3">
          <p className={LABEL}>Vitiligo</p>
          <div>
            <p className="mb-1.5 text-sm text-cc-muted">Skin around the patches</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Base skin">
              {BASE_SKINS.map((b) => (
                <button key={b} type="button" role="radio" aria-checked={vit.base === b} title={skinPreset(b).label} aria-label={skinPreset(b).label}
                  onClick={() => set({ vitiligo: { ...vit, base: b } })}
                  className={`h-9 w-9 rounded-full border-2 ${vit.base === b ? 'border-cc-gold scale-110' : 'border-transparent hover:border-cc-gold/60'}`}
                  style={{ background: skinPreset(b).shades[vit.baseShade] }} />
              ))}
            </div>
            <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Base shade">
              {SHADE_NAMES.map((n, i) => (
                <button key={n} type="button" role="radio" aria-checked={vit.baseShade === i} onClick={() => set({ vitiligo: { ...vit, baseShade: i as 0 | 1 | 2 } })} className={chip(vit.baseShade === i)}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm text-cc-muted">Where the patches are</p>
            <div className="flex flex-wrap gap-2">
              {VITILIGO_LOCATIONS.map((l) => {
                const on = vit.locations.includes(l.id);
                const next: VitiligoLocation[] = on ? vit.locations.filter((x) => x !== l.id) : [...vit.locations, l.id];
                return <button key={l.id} type="button" aria-pressed={on} onClick={() => set({ vitiligo: { ...vit, locations: next } })} className={chip(on)}>{l.label}</button>;
              })}
            </div>
          </div>
          <Range id="vit-size" label="Patch size" value={vit.size * 2 - 1} onChange={(v) => set({ vitiligo: { ...vit, size: (v + 1) / 2 } })} ends={['Small', 'Large']} />
          <Range id="vit-spread" label="How many" value={vit.spread * 2 - 1} onChange={(v) => set({ vitiligo: { ...vit, spread: (v + 1) / 2 } })} ends={['Few', 'More']} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-cc-muted">Edges</span>
            {(['irregular', 'rounded'] as const).map((shape) => (
              <button key={shape} type="button" aria-pressed={vit.shape === shape} onClick={() => set({ vitiligo: { ...vit, shape } })} className={chip(vit.shape === shape)}>{shape === 'irregular' ? 'Natural' : 'Rounded'}</button>
            ))}
            <button type="button" onClick={() => set({ vitiligo: { ...vit, seed: vit.seed + 1 } })} className={`inline-flex items-center gap-1.5 ${chip(false)}`}>
              <RefreshCw size={14} aria-hidden="true" /> New arrangement
            </button>
          </div>
        </div>
      )}

      {alb && skin && (
        <div className="space-y-3">
          <p className={LABEL}>Albinism</p>
          <div>
            <p className="mb-1.5 text-sm text-cc-muted">Hair, eyebrows and lashes</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Hair colour">
              {HAIR.map((h) => (
                <button key={h.id} type="button" role="radio" aria-checked={alb.hair === h.id} onClick={() => set({ albinism: { ...alb, hair: h.id } })} className={`flex items-center gap-2 ${chip(alb.hair === h.id)}`}>
                  {h.color && <span aria-hidden="true" className="h-4 w-4 rounded-full border border-black/10" style={{ background: h.color }} />}{h.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm text-cc-muted">Eyes</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Eye colour">
              {EYES.map((e) => (
                <button key={e.id} type="button" role="radio" aria-checked={alb.eyes === e.id} onClick={() => set({ albinism: { ...alb, eyes: e.id } })} className={`flex items-center gap-2 ${chip(alb.eyes === e.id)}`}>
                  <span aria-hidden="true" className="h-4 w-4 rounded-full border border-black/10" style={{ background: ALBINISM_EYES[e.id] }} />{e.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-cc-muted">Eye colour is saved with your character. These models paint the eyes into the face, so it shows once eyes can be recoloured.</p>
          </div>
        </div>
      )}

      {skin && (
        <div className="space-y-2.5">
          <p className={LABEL}>Fine-tune</p>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-9 w-9 rounded-full border border-black/10" style={{ background: skinColour(skin) }} />
            <span className="text-xs text-cc-muted">Your skin&rsquo;s base colour. The skin keeps its own texture, light and shade.</span>
          </div>
          <Range id="skin-depth" label="Pigmentation" value={skin.depth} onChange={(depth) => set({ depth })} ends={['Lighter', 'Deeper']} />
          <Range id="skin-undertone" label="Undertone" value={skin.undertone} onChange={(undertone) => set({ undertone })} ends={['Cool', 'Warm']} />
          <Range id="skin-saturation" label="Saturation" value={skin.saturation} onChange={(saturation) => set({ saturation })} ends={['Muted', 'Vivid']} />
        </div>
      )}
    </section>
  );
}
