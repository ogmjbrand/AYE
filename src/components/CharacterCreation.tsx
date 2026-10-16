import { useState, type ReactNode } from 'react';
import { CharacterPreview } from './CharacterPreview';
import { STARTING_BALANCE } from '../lib/gameState';
import { loadCharacter, saveCharacter } from '../lib/save';
import { DIETS, type Diet } from '../lib/food';
import { GENDERS, HERITAGES, genderLabel, type Gender } from '../lib/identity';
import { HEIGHT_RANGE, bodyForGender, defaultHeightCm, lookById, looksFor, type BodyType } from '../lib/looks';
import { DEFAULT_COUNTRY, SUBDIVISIONS, countryOptions, formatHome, regionTerm } from '../lib/places';
import { assetUrl } from '../lib/assetManifest';

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
  gender: Gender;
  /** Self-identified heritage (see lib/identity.ts) and an optional specific ethnic group, e.g. "Yoruba". */
  heritage: string;
  ethnicGroup: string;
  /** ISO 3166-1 alpha-2 country code and state/region name. */
  country: string;
  region: string;
  body: BodyType;
  /** Which 3D person (lib/looks.ts) and how tall, in centimetres. */
  lookId: string;
  heightCm: number;
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
  // Natural denim, so a recolourable look keeps its real colour unless the player changes it
  const [colorR, setColorR] = useState(54);
  const [colorG, setColorG] = useState(82);
  const [colorB, setColorB] = useState(125);
  const [gender, setGender] = useState<Gender>('unspecified');
  const [heritage, setHeritage] = useState('unspecified');
  const [ethnicGroup, setEthnicGroup] = useState('');
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [region, setRegion] = useState('Lagos');
  const [body, setBody] = useState<BodyType>('feminine');
  const [lookId, setLookId] = useState(() => looksFor('feminine')[0].id);
  const [heightCm, setHeightCm] = useState(defaultHeightCm('feminine'));
  const [countries] = useState(countryOptions);

  const chooseBody = (next: BodyType) => {
    if (next === body) return;
    setBody(next);
    setLookId(looksFor(next)[0].id);
    setHeightCm(defaultHeightCm(next));
  };
  const chooseGender = (next: Gender) => {
    setGender(next);
    const implied = bodyForGender(next);
    if (implied) chooseBody(implied);
  };
  const chooseCountry = (next: string) => {
    setCountry(next);
    setRegion('');
  };

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
      gender,
      heritage,
      ethnicGroup: ethnicGroup.trim(),
      country,
      region: region.trim(),
      body,
      lookId,
      heightCm,
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
    setCountry(DEFAULT_COUNTRY);
    setRegion('Lagos');
  };

  const previewColor = mode === 'menu' && savedCharacter
    ? `rgb(${savedCharacter.colorR}, ${savedCharacter.colorG}, ${savedCharacter.colorB})`
    : `rgb(${colorR}, ${colorG}, ${colorB})`;

  if (mode === 'menu' && hasSavedCharacter) {
    const char = savedCharacter;
    return (
      <Shell previewColor={previewColor} previewName={char.name} previewSub={`${formatHome(char.country, char.region)} · ${CAREER_LABEL[char.career]}`} lookId={char.lookId} heightCm={char.heightCm}>
        <section className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cc-gold">Welcome back</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-cc-ink mt-2 text-balance">Continue your life</h1>
          </div>
          <div className="rounded-xl border border-cc-line bg-cc-field p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-cc-muted">Saved character</p>
            <p className="font-display text-2xl font-semibold text-cc-ink mt-1">{char.name}</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-cc-muted">Home</dt><dd className="text-cc-ink text-right">{formatHome(char.country, char.region)}</dd>
              <dt className="text-cc-muted">Gender</dt><dd className="text-cc-ink text-right">{genderLabel(char.gender)}</dd>
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
    <Shell previewColor={previewColor} previewName={name.trim() || 'Your character'} previewSub={`${formatHome(country, region)} · ${CAREER_LABEL[career]}`} lookId={lookId} heightCm={heightCm}>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="gender" label="Gender">
              <select id="gender" value={gender} onChange={(e) => chooseGender(e.target.value as Gender)} className={INPUT}>
                {GENDERS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
            </Field>
            <Field id="heritage" label="Race / heritage">
              <select id="heritage" value={heritage} onChange={(e) => setHeritage(e.target.value)} className={INPUT}>
                {HERITAGES.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
              </select>
            </Field>
          </div>
          <Field id="ethnic-group" label="Ethnic group (optional)" hint="Your own words, e.g. Yoruba, Igbo, Hausa, Zulu, Punjabi.">
            <input id="ethnic-group" type="text" value={ethnicGroup} onChange={(e) => setEthnicGroup(e.target.value)} maxLength={40} autoComplete="off" className={INPUT} />
          </Field>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className={SECTION_LABEL}>Home</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="country" label="Country">
              <select id="country" value={country} onChange={(e) => chooseCountry(e.target.value)} className={INPUT}>
                {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </Field>
            <Field id="region" label={regionTerm(country)}>
              {SUBDIVISIONS[country] ? (
                <select id="region" value={region} onChange={(e) => setRegion(e.target.value)} className={INPUT}>
                  <option value="">Choose…</option>
                  {SUBDIVISIONS[country].names.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              ) : (
                <input id="region" type="text" value={region} onChange={(e) => setRegion(e.target.value)} maxLength={60} autoComplete="off" placeholder="Optional" className={INPUT} />
              )}
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className={SECTION_LABEL}>Appearance</legend>
          {!bodyForGender(gender) && (
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Body type">
              {(['feminine', 'masculine'] as const).map((b) => (
                <button key={b} type="button" role="radio" aria-checked={body === b} onClick={() => chooseBody(b)}
                  className={`rounded-lg border py-2 text-sm capitalize transition ${body === b ? 'border-cc-gold bg-cc-gold/10 text-cc-ink' : 'border-cc-line text-cc-muted hover:border-cc-gold/60'}`}>
                  {b} body
                </button>
              ))}
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-medium text-cc-ink">Look</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3" role="radiogroup" aria-label="Look">
              {looksFor(body).map((l, i) => (
                <button key={l.id} type="button" role="radio" aria-checked={lookId === l.id} aria-label={`Look ${i + 1}`} onClick={() => setLookId(l.id)}
                  className={`overflow-hidden rounded-lg border bg-cc-field transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold ${lookId === l.id ? 'border-cc-gold ring-2 ring-cc-gold/40' : 'border-cc-line hover:border-cc-gold/60'}`}>
                  <img src={assetUrl(`models/characters/rocketbox/thumbs/${l.id}.webp`)} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-cc-muted">Real people from the Rocketbox library. More faces, skin tones and hairstyles are coming with the new character system.</p>
          </div>
          <div className="grid grid-cols-[4rem_1fr_3.5rem] items-center gap-3">
            <label htmlFor="height" className="text-sm text-cc-muted">Height</label>
            <input id="height" type="range" min={HEIGHT_RANGE.min} max={HEIGHT_RANGE.max} value={heightCm}
              onChange={(e) => setHeightCm(parseInt(e.target.value))} className="w-full accent-cc-gold cursor-pointer" />
            <span className="font-mono text-sm text-cc-ink text-right tabular-nums">{heightCm} cm</span>
          </div>
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

        {lookById(lookId).outfit !== 'none' && <fieldset className="space-y-4">
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
        </fieldset>}

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
function Shell({ children, previewColor, previewName, previewSub, lookId, heightCm }: {
  children: ReactNode; previewColor: string; previewName: string; previewSub: string; lookId: string; heightCm: number;
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
          <aside className="order-1 lg:order-2 relative min-h-[22rem] lg:sticky lg:top-6 lg:h-[calc(100dvh-8rem)] lg:min-h-[36rem] lg:self-start rounded-2xl border border-cc-line bg-gradient-to-b from-cc-panel to-cc-bg overflow-hidden" aria-label="Character preview">
            <CharacterPreview outfitColor={previewColor} lookId={lookId} heightCm={heightCm} />
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
