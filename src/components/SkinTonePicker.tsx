import { isSkinColor, SKIN_TONES, skinToneById, type SkinToneId } from '../lib/skinTone';

export function SkinTonePicker({ skinTone, skinColor, onChange, variant = 'light' }: {
  skinTone: SkinToneId;
  skinColor?: string;
  onChange: (tone: SkinToneId, color: string) => void;
  variant?: 'light' | 'dark';
}) {
  const color = isSkinColor(skinColor) ? skinColor : skinToneById(skinTone).color;
  const tones = SKIN_TONES;
  const light = variant === 'light';

  return (
    <section aria-label="Skin and complexion" className="space-y-3">
      <div>
        <p className={`mb-2 text-sm font-medium ${light ? 'text-cc-ink' : 'text-white'}`}>Skin texture &amp; tone</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Skin texture and complexion">
          {tones.map((tone) => (
            <button
              key={tone.id}
              type="button"
              role="radio"
              aria-checked={skinTone === tone.id}
              aria-label={tone.label}
              title={tone.label}
              onClick={() => onChange(tone.id, tone.color)}
              className={`grid h-9 w-9 place-items-center rounded-full border-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cc-gold ${
                skinTone === tone.id
                  ? 'border-[#e3bd70] ring-2 ring-[#d2b36f]/40'
                  : light
                    ? 'border-cc-line hover:border-cc-gold/60'
                    : 'border-white/25 hover:border-[#d2b36f]'
              }`}
              style={{ backgroundColor: tone.id === 'original' ? '#e7ded2' : tone.color }}
            >
              {tone.id === 'original' && <span aria-hidden="true" className="text-xs font-semibold text-cc-muted">O</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label htmlFor="skin-color" className={`text-sm ${light ? 'text-cc-muted' : 'text-white/70'}`}>Custom colour</label>
        <input
          id="skin-color"
          type="color"
          value={color}
          onChange={(event) => onChange(skinTone === 'original' ? 'custom' : skinTone, event.target.value)}
          className="h-10 w-14 cursor-pointer rounded border border-white/20 bg-[#171615] p-1"
          aria-label="Choose a custom skin colour"
        />
        <span className={`font-mono text-xs uppercase ${light ? 'text-cc-muted' : 'text-white/60'}`}>{color}</span>
      </div>
      <p className={`m-0 text-xs leading-relaxed ${light ? 'text-cc-muted' : 'text-white/55'}`}>
        Choose a complexion, then adjust its colour. Your avatar rig and saved appearance stay intact.
      </p>
    </section>
  );
}
