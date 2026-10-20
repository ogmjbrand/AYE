import { useState, type ReactNode } from 'react';
import { CharacterPreview } from './CharacterPreview';
import { STARTING_BALANCE } from '../lib/gameState';
import { saveCharacter } from '../lib/save';
import { CAREER_LABEL, LIFESTYLE_LABEL } from '../lib/labels';
import { DIETS, type Diet } from '../lib/food';
import { GENDERS, HERITAGES, type Gender } from '../lib/identity';
import { HEIGHT_RANGE, bodyForGender, defaultHeightCm, looksFor, type BodyType } from '../lib/looks';
import type { Slot, Style, Wardrobe } from '../lib/fashion';
import type { HomeDecorPlacement } from '../lib/homeDecor';
import { AVERAGE_SHAPE, SHAPE_PRESETS, SHAPE_SLIDERS, presetFor, type BodyShape } from '../lib/bodyShape';
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
  /** Build, muscle, curves and belly (lib/bodyShape.ts). */
  shape: BodyShape;
  /** Clothes and hair dye bought in the game (lib/fashion.ts). */
  wardrobe: Wardrobe;
  /** Furniture owned and placed in the player's homes. Older saves omit this. */
  homeDecor?: HomeDecorPlacement[];
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
  /** Back to the entry screen without creating anyone. */
  onBack?: () => void;
}

export function CharacterCreation({ onCharacterCreate, onBack }: CharacterCreationProps) {
  const [name, setName] = useState('');
  const [lifestyle, setLifestyle] = useState<Character['lifestyle']>('ordinary');
  const [career, setCareer] = useState<Character['career']>('none');
  const [diet, setDiet] = useState<Diet>('everything');
  // Legacy outfit colour, kept in saves for compatibility; clothes now come from the wardrobe
  const [colorR, colorG, colorB] = [54, 82, 125];
  const [gender, setGender] = useState<Gender>('unspecified');
  const [heritage, setHeritage] = useState('unspecified');
  const [ethnicGroup, setEthnicGroup] = useState('');
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [region, setRegion] = useState('Lagos');
  const [body, setBody] = useState<BodyType>('feminine');
  const [lookId, setLookId] = useState(() => looksFor('feminine')[0].id);
  const [heightCm, setHeightCm] = useState(defaultHeightCm('feminine'));
  const [shape, setShape] = useState<BodyShape>(AVERAGE_SHAPE);
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
      shape,
      wardrobe: { owned: [], equipped: {} },
      homeDecor: [],
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

  const previewColor = `rgb(${colorR}, ${colorG}, ${colorB})`;

  return (
    <Shell previewColor={previewColor} previewName={name.trim() || 'Your character'} previewSub={`${formatHome(country, region)} · ${CAREER_LABEL[career]}`} lookId={lookId} heightCm={heightCm} shape={shape}>
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
          <div>
            <p className="mb-2 text-sm font-medium text-cc-ink">Body shape</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Body shape">
              {SHAPE_PRESETS.map((p) => {
                const on = presetFor(shape)?.id === p.id;
                return (
                  <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => setShape(p.shape)}
                    className={`rounded-full border px-3 py-1 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold ${on ? 'border-cc-gold bg-cc-gold/10 text-cc-ink' : 'border-cc-line text-cc-muted hover:border-cc-gold/60'}`}>
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 space-y-2">
              {SHAPE_SLIDERS.map((s) => (
                <div key={s.key} className="grid grid-cols-[6.5rem_1fr] items-center gap-3">
                  <label htmlFor={`shape-${s.key}`} className="text-sm text-cc-muted">{s.label}</label>
                  <div>
                    <input id={`shape-${s.key}`} type="range" min={s.min * 100} max={100} step={5} value={Math.round(shape[s.key] * 100)}
                      aria-valuetext={`${s.ends[0]} to ${s.ends[1]}: ${Math.round(((shape[s.key] - s.min) / (1 - s.min)) * 100)}%`}
                      onChange={(e) => setShape({ ...shape, [s.key]: parseInt(e.target.value) / 100 })}
                      className="w-full accent-cc-gold cursor-pointer" />
                    <div className="flex justify-between text-[11px] text-cc-muted"><span>{s.ends[0]}</span><span>{s.ends[1]}</span></div>
                  </div>
                </div>
              ))}
            </div>
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


        <div className="space-y-3">
          <button type="submit" disabled={!name.trim()} className={PRIMARY_BUTTON}>Create &amp; play</button>
          {!name.trim() && <p className="text-xs text-cc-muted text-center">Enter a name to continue.</p>}
          {onBack && (
            <button type="button" onClick={onBack} className="w-full text-sm text-cc-muted hover:text-cc-ink py-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold rounded">
              ← Back
            </button>
          )}
        </div>
      </form>
    </Shell>
  );
}

const SECTION_LABEL = 'text-xs font-semibold uppercase tracking-[0.18em] text-cc-gold mb-1';
const INPUT =
  'w-full rounded-lg border border-cc-line bg-cc-field px-3.5 py-2.5 text-cc-ink placeholder:text-cc-muted/70 ' +
  'focus:outline-none focus:border-cc-gold focus:ring-2 focus:ring-cc-gold/30 transition';
const PRIMARY_BUTTON =
  'w-full rounded-lg bg-cc-gold py-3 font-display font-bold tracking-wide text-cc-bg hover:bg-cc-gold-strong transition ' +
  'disabled:bg-cc-field disabled:text-cc-muted disabled:border disabled:border-cc-line disabled:cursor-not-allowed ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cc-gold-strong';

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
function Shell({ children, previewColor, previewName, previewSub, lookId, heightCm, styles, shape }: {
  children: ReactNode; previewColor: string; previewName: string; previewSub: string; lookId: string; heightCm: number;
  shape?: BodyShape;
  styles?: Partial<Record<Slot, Style>>;
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
            <CharacterPreview outfitColor={previewColor} lookId={lookId} heightCm={heightCm} styles={styles} shape={shape} />
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
