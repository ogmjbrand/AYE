import { useState, type ReactNode } from 'react';
import { CharacterPreview } from './CharacterPreview';
import { STARTING_BALANCE } from '../lib/gameState';
import { loadCharacter, saveCharacter } from '../lib/save';
import { DIETS, type Diet } from '../lib/food';

export type Lifestyle = 'student' | 'ordinary' | 'middle-class' | 'luxury';
export type Career =
  | 'none'
  | 'student'
  | 'artist'
  | 'entrepreneur'
  | 'athlete'
  | 'engineer'
  | 'doctor'
  | 'pilot';

export interface Character {
  id: string;
  name: string;
  lifestyle: Lifestyle;
  career: Career;
  diet: Diet;
  colorR: number;
  colorG: number;
  colorB: number;
  balance: number;
  createdAt: number;
  lastBalanceUpdate: number;
}

interface CharacterCreationProps {
  onCharacterCreate: (character: Character) => void;
  onLoadCharacter?: (character: Character) => void;
}

export function CharacterCreation({
  onCharacterCreate,
  onLoadCharacter,
}: CharacterCreationProps) {
  const [mode, setMode] = useState<'menu' | 'create'>('menu');
  const [name, setName] = useState('');
  const [lifestyle, setLifestyle] = useState<Character['lifestyle']>('ordinary');
  const [career, setCareer] = useState<Character['career']>('none');
  const [diet, setDiet] = useState<Diet>('everything');
  const [colorR, setColorR] = useState(139);
  const [colorG, setColorG] = useState(93);
  const [colorB, setColorB] = useState(62);

  const [savedCharacter] = useState(() => loadCharacter());
  const hasSavedCharacter = savedCharacter !== null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const now = Date.now();
    const character: Character = {
      id: crypto.randomUUID(),
      name: name.trim(),
      lifestyle,
      career,
      diet,
      colorR,
      colorG,
      colorB,
      balance: STARTING_BALANCE[lifestyle],
      createdAt: now,
      lastBalanceUpdate: now,
    };

    saveCharacter(character);
    onCharacterCreate(character);
  };

  const handleLoad = () => {
    if (!savedCharacter) return;
    onLoadCharacter?.(savedCharacter);
    onCharacterCreate(savedCharacter);
  };

  const handleNewGame = () => {
    setMode('create');
    setName('');
    setLifestyle('ordinary');
  };

  const previewColor = mode === 'menu' && savedCharacter
    ? `rgb(${savedCharacter.colorR}, ${savedCharacter.colorG}, ${savedCharacter.colorB})`
    : `rgb(${colorR}, ${colorG}, ${colorB})`;

  if (mode === 'menu' && hasSavedCharacter) {
    const char = savedCharacter;
    return (
      <Shell previewColor={previewColor} previewName={char.name} previewSub={`${LIFESTYLE_LABEL[char.lifestyle]} · ${CAREER_LABEL[char.career]}`}>
        <section className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cc-gold">Welcome back</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-cc-ink mt-2 text-balance">Continue your life</h1>
          </div>
          <div className="rounded-xl border border-cc-line bg-cc-field p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-cc-muted">Saved character</p>
            <p className="font-display text-2xl font-semibold text-cc-ink mt-1">{char.name}</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-cc-muted">Lifestyle</dt><dd className="text-cc-ink text-right">{LIFESTYLE_LABEL[char.lifestyle]}</dd>
              <dt className="text-cc-muted">Career</dt><dd className="text-cc-ink text-right">{CAREER_LABEL[char.career]}</dd>
              <dt className="text-cc-muted">Diet</dt><dd className="text-cc-ink text-right">{DIETS.find((d) => d.id === char.diet)?.label}</dd>
            </dl>
          </div>
          <div className="grid gap-3">
            <button type="button" onClick={handleLoad} className={PRIMARY_BUTTON}>Continue</button>
            <button type="button" onClick={handleNewGame} className={SECONDARY_BUTTON}>New character</button>
          </div>
        </section>
      </Shell>
    );
  }

  return (
    <Shell previewColor={previewColor} previewName={name.trim() || 'Your character'} previewSub={`${LIFESTYLE_LABEL[lifestyle]} · ${CAREER_LABEL[career]}`}>
      <form onSubmit={handleCreate} className="space-y-8" aria-labelledby="create-title">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-cc-gold">New life</p>
          <h1 id="create-title" className="font-display text-3xl sm:text-4xl font-bold text-cc-ink mt-2 text-balance">Create your character</h1>
          <p className="text-sm text-cc-muted mt-2">Choose who you are and how you live. You can change your path later in the game.</p>
        </div>

        <fieldset className="space-y-4">
          <legend className={SECTION_LABEL}>Identity</legend>
          <Field id="character-name" label="Character name">
            <input
              id="character-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Adaeze Okafor"
              maxLength={32}
              autoComplete="off"
              required
              className={INPUT}
            />
          </Field>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className={SECTION_LABEL}>Life</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="lifestyle" label="Lifestyle">
              <select id="lifestyle" value={lifestyle} onChange={(e) => setLifestyle(e.target.value as Character['lifestyle'])} className={INPUT}>
                {(Object.keys(LIFESTYLE_LABEL) as Lifestyle[]).map((l) => (
                  <option key={l} value={l}>{LIFESTYLE_LABEL[l]}</option>
                ))}
              </select>
            </Field>
            <Field id="career" label="Career">
              <select id="career" value={career} onChange={(e) => setCareer(e.target.value as Character['career'])} className={INPUT}>
                {(Object.keys(CAREER_LABEL) as Career[]).map((c) => (
                  <option key={c} value={c}>{CAREER_LABEL[c]}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field id="diet" label="Diet" hint={`${DIETS.find((d) => d.id === diet)!.hint} Menus show what suits you.`}>
            <select id="diet" value={diet} onChange={(e) => setDiet(e.target.value as Diet)} className={INPUT}>
              {DIETS.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </Field>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className={SECTION_LABEL}>Outfit colour</legend>
          <div className="flex items-center gap-4 rounded-xl border border-cc-line bg-cc-field p-4">
            <span
              className="h-12 w-12 shrink-0 rounded-lg border border-cc-line shadow-inner"
              style={{ backgroundColor: `rgb(${colorR}, ${colorG}, ${colorB})` }}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-sm text-cc-ink">Shown on the preview</p>
              <p className="font-mono text-xs text-cc-muted tabular-nums">rgb({colorR}, {colorG}, {colorB})</p>
            </div>
          </div>
          {([
            ['red', 'Red', colorR, setColorR],
            ['green', 'Green', colorG, setColorG],
            ['blue', 'Blue', colorB, setColorB],
          ] as const).map(([key, label, value, set]) => (
            <div key={key} className="grid grid-cols-[4rem_1fr_2.5rem] items-center gap-3">
              <label htmlFor={`color-${key}`} className="text-sm text-cc-muted">{label}</label>
              <input
                id={`color-${key}`}
                type="range"
                min="0"
                max="255"
                value={value}
                onChange={(e) => set(parseInt(e.target.value))}
                className="w-full accent-cc-gold cursor-pointer"
              />
              <span className="font-mono text-sm text-cc-ink text-right tabular-nums">{value}</span>
            </div>
          ))}
        </fieldset>

        <div className="space-y-3">
          <button type="submit" disabled={!name.trim()} className={PRIMARY_BUTTON}>Create &amp; play</button>
          {!name.trim() && <p className="text-xs text-cc-muted text-center">Enter a name to continue.</p>}
          {hasSavedCharacter && (
            <button type="button" onClick={() => setMode('menu')} className="w-full text-sm text-cc-muted hover:text-cc-ink py-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold rounded">
              ← Back to saved character
            </button>
          )}
        </div>
      </form>
    </Shell>
  );
}

const LIFESTYLE_LABEL: Record<Lifestyle, string> = {
  student: 'Student',
  ordinary: 'Ordinary',
  'middle-class': 'Middle class',
  luxury: 'Luxury',
};

const CAREER_LABEL: Record<Career, string> = {
  none: 'Undecided',
  student: 'Student',
  artist: 'Artist',
  entrepreneur: 'Entrepreneur',
  athlete: 'Athlete',
  engineer: 'Engineer',
  doctor: 'Doctor',
  pilot: 'Pilot',
};

const SECTION_LABEL = 'text-xs font-semibold uppercase tracking-[0.18em] text-cc-gold mb-1';
const INPUT =
  'w-full rounded-lg border border-cc-line bg-cc-field px-3.5 py-2.5 text-cc-ink placeholder:text-cc-muted/70 ' +
  'focus:outline-none focus:border-cc-gold focus:ring-2 focus:ring-cc-gold/30 transition';
const PRIMARY_BUTTON =
  'w-full rounded-lg bg-cc-gold py-3 font-display font-bold tracking-wide text-cc-bg hover:bg-cc-gold-strong transition ' +
  'disabled:bg-cc-field disabled:text-cc-muted disabled:border disabled:border-cc-line disabled:cursor-not-allowed ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cc-gold-strong';
const SECONDARY_BUTTON =
  'w-full rounded-lg border border-cc-line py-3 font-display font-semibold text-cc-ink hover:border-cc-gold transition ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cc-gold';

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-cc-ink">{label}</label>
      {children}
      {hint && <p className="text-xs text-cc-muted">{hint}</p>}
    </div>
  );
}

/** Two columns on wide screens (controls | live preview); stacked on phones. */
function Shell({ children, previewColor, previewName, previewSub }: {
  children: ReactNode; previewColor: string; previewName: string; previewSub: string;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-cc-bg text-cc-ink" style={{ backgroundImage: 'radial-gradient(1200px 600px at 75% 30%, rgba(201,164,92,0.08), transparent 60%)' }}>
      <div className="mx-auto flex min-h-full max-w-6xl flex-col px-4 py-6 sm:px-8 sm:py-10">
        <header className="flex items-center gap-3 pb-6">
          <img src={`${import.meta.env.BASE_URL}assets/brand/aye-mark.webp`} alt="AYE" className="h-10 w-auto" />
          <span className="text-xs uppercase tracking-[0.25em] text-cc-muted">Your life. Your choices. Your world.</span>
        </header>
        <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-10">
          <div className="order-2 lg:order-1 rounded-2xl border border-cc-line bg-cc-panel p-5 sm:p-8 shadow-2xl shadow-black/40">
            {children}
          </div>
          <aside className="order-1 lg:order-2 relative min-h-[22rem] lg:min-h-[36rem] rounded-2xl border border-cc-line bg-gradient-to-b from-cc-panel to-cc-bg overflow-hidden" aria-label="Character preview">
            <CharacterPreview outfitColor={previewColor} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 sm:p-6 bg-gradient-to-t from-cc-bg/90 to-transparent">
              <p className="font-display text-2xl font-bold text-cc-ink truncate">{previewName}</p>
              <p className="text-sm text-cc-muted">{previewSub}</p>
            </div>
            <p className="pointer-events-none absolute top-4 left-4 text-[11px] uppercase tracking-[0.2em] text-cc-muted">
              Live preview · in-game model
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
