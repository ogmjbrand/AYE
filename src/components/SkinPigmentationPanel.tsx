import {
  categoryById, clampAlbinismIntensity, clampCoverage, clampPatchScale, clampUndertone, pigmentationForCategory,
  SKIN_CATEGORIES, type SkinPigmentation,
} from '../lib/skinPigmentation';

const SECTION_LABEL = 'text-xs font-semibold uppercase tracking-[0.18em] text-cc-gold mb-2';

function MiniSlider({ id, label, min, max, step, value, onChange, ends, display }: {
  id: string; label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; ends: [string, string]; display?: string;
}) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-center gap-3">
      <label htmlFor={id} className="text-sm text-cc-muted">{label}</label>
      <div>
        <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-valuetext={display ?? `${ends[0]} to ${ends[1]}: ${Math.round(((value - min) / (max - min)) * 100)}%`} className="w-full cursor-pointer accent-cc-gold" />
        <div className="flex justify-between text-[11px] text-cc-muted"><span>{ends[0]}</span>{display && <span className="text-cc-ink">{display}</span>}<span>{ends[1]}</span></div>
      </div>
    </div>
  );
}

/**
 * The full skin picker for character creation: the eight categories
 * (lib/skinPigmentation.ts) as swatches, then depth, undertone, an optional
 * vitiligo pattern and an albinism (hair/brow/lash pigment) slider — every
 * slider stays open after picking a category, so no look is forced.
 */
export function SkinPigmentationPanel({ depth, pigmentation, onChange, preciseSkin = true, browLashControl = false }: {
  /** -1 lighter … 1 deeper than the person's own skin. */
  depth: number;
  pigmentation: SkinPigmentation;
  onChange: (depth: number, pigmentation: SkinPigmentation) => void;
  /** False for a body whose skin and clothes share one material: undertone still tints, but vitiligo patches aren't drawn. */
  preciseSkin?: boolean;
  /** True only for a body with separate eyebrow/eyelash materials. */
  browLashControl?: boolean;
}) {
  const pick = (id: (typeof SKIN_CATEGORIES)[number]['id']) => {
    const r = pigmentationForCategory(id, pigmentation);
    onChange(r.depth, r.pigmentation);
  };
  const setPigmentation = (patch: Partial<SkinPigmentation>) => onChange(depth, { ...pigmentation, category: 'custom', ...patch });
  const current = categoryById(pigmentation.category);

  return (
    <div className="space-y-4">
      <div>
        <p className={SECTION_LABEL}>Skin category</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8" role="radiogroup" aria-label="Skin categories">
          {SKIN_CATEGORIES.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={pigmentation.category === c.id} aria-label={c.label} title={c.description}
              onClick={() => pick(c.id)}
              className={`aspect-square rounded-full border-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold ${pigmentation.category === c.id ? 'border-cc-gold scale-110' : 'border-transparent hover:border-cc-gold/60'}`}
              style={{ background: c.swatch }} />
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-cc-muted">{current ? current.description : 'Custom mix — adjust the sliders below.'}</p>
      </div>

      <div className="space-y-2.5">
        <p className={SECTION_LABEL}>Depth &amp; undertone</p>
        <MiniSlider id="skin-depth" label="Depth" min={-1} max={1} step={0.05} value={depth} onChange={(v) => onChange(v, pigmentation)} ends={['Lighter', 'Deeper']}
          display={depth === 0 ? 'Natural' : depth > 0 ? `${Math.round(depth * 100)}% deeper` : `${Math.round(-depth * 100)}% lighter`} />
        <MiniSlider id="skin-undertone" label="Undertone" min={-1} max={1} step={0.05} value={pigmentation.undertone}
          onChange={(v) => setPigmentation({ undertone: clampUndertone(v) })} ends={['Cool', 'Warm']}
          display={pigmentation.undertone === 0 ? 'Neutral' : pigmentation.undertone > 0 ? `${Math.round(pigmentation.undertone * 100)}% warm` : `${Math.round(-pigmentation.undertone * 100)}% cool`} />
        <p className="text-xs text-cc-muted">Adjusts the person&rsquo;s own skin, keeping its texture and shading; clothes and hair aren&rsquo;t affected{preciseSkin ? '' : ' except on a single-material body (see the note below)'}.</p>
      </div>

      <div className="space-y-2.5 rounded-lg border border-cc-line p-3">
        <div className="flex items-center justify-between">
          <p className={`${SECTION_LABEL} mb-0`}>Vitiligo</p>
          <button type="button" role="switch" aria-checked={pigmentation.vitiligo.enabled}
            onClick={() => setPigmentation({ vitiligo: { ...pigmentation.vitiligo, enabled: !pigmentation.vitiligo.enabled } })}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold ${pigmentation.vitiligo.enabled ? 'border-cc-gold bg-cc-gold/10 text-cc-gold-strong' : 'border-cc-line text-cc-muted hover:border-cc-gold/60'}`}>
            {pigmentation.vitiligo.enabled ? 'Patches on' : 'Patches off'}
          </button>
        </div>
        {pigmentation.vitiligo.enabled && (
          <>
            <MiniSlider id="vitiligo-coverage" label="Coverage" min={0} max={1} step={0.05} value={pigmentation.vitiligo.coverage}
              onChange={(v) => setPigmentation({ vitiligo: { ...pigmentation.vitiligo, coverage: clampCoverage(v) } })} ends={['A trace', 'Widespread']} />
            <MiniSlider id="vitiligo-scale" label="Patch size" min={0.4} max={2.5} step={0.1} value={pigmentation.vitiligo.scale}
              onChange={(v) => setPigmentation({ vitiligo: { ...pigmentation.vitiligo, scale: clampPatchScale(v) } })} ends={['Fine', 'Broad']} />
            <button type="button" onClick={() => setPigmentation({ vitiligo: { ...pigmentation.vitiligo, seed: Math.floor(Math.random() * 1000) + 1 } })}
              className="rounded-full border border-cc-line px-3 py-1.5 text-xs font-semibold text-cc-muted transition hover:border-cc-gold/60 hover:text-cc-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold">
              Randomise pattern
            </button>
          </>
        )}
        {!preciseSkin && <p className="text-xs text-cc-muted">Her skin and clothes share one texture in her Character Creator model, so patches aren&rsquo;t drawn for her yet; depth and undertone still apply.</p>}
      </div>

      <div className="space-y-2.5">
        <p className={SECTION_LABEL}>Albinism</p>
        <MiniSlider id="albinism-intensity" label="Hair &amp; brows" min={0} max={1} step={0.05} value={pigmentation.albinismIntensity}
          onChange={(v) => setPigmentation({ albinismIntensity: clampAlbinismIntensity(v) })} ends={['Natural', 'Fully pale']} />
        <p className="text-xs text-cc-muted">
          {browLashControl
            ? 'Lightens hair, eyebrows and eyelashes together with the skin’s own depth and undertone above; keep it at 0 for naturally pigmented hair and brows on very light skin.'
            : 'Lightens skin by depth and undertone above; this person’s eyebrows and eyelashes are part of their face or hair model and can’t be recoloured separately yet, so pick a pale hair colour under Hair for the full look.'}
        </p>
      </div>
    </div>
  );
}
