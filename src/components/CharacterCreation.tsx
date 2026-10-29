import { useMemo, useState, type ReactNode } from 'react';
import { CharacterPreview, type PreviewFocus } from './CharacterPreview';
import { BodyTypeChart } from './mh/BodyTypeChart';
import { saveCharacter } from '../lib/save';
import { MAX_TRAITS, TRAITS, type DreamId, type TraitId } from '../lib/lifeState';
import { DREAMS } from '../lib/life';
import { DEFAULT_DISTRICT_ID, districtById } from '../lib/geography';
import { moveInFee } from '../lib/homes';
import { SONGHAI, stateById } from '../lib/songhai';
import { CAREER_LABEL, LIFESTYLE_LABEL } from '../lib/labels';
import { DIETS, type Diet } from '../lib/food';
import { GENDERS, HERITAGES, type Gender } from '../lib/identity';
import { HEIGHT_RANGE, bodyForGender, lookById, looksFor, type BodyType } from '../lib/looks';
import { FASHION_ITEMS, SLOT_LABEL, resolveStyles, swatchCss, type Slot, type Wardrobe } from '../lib/fashion';
import { presetFor, shapePresets, shapeSliders, type BodyShape } from '../lib/bodyShape';
import { DEFAULT_COUNTRY, SUBDIVISIONS, countryOptions, formatHome, regionTerm } from '../lib/places';
import { assetManifest, assetUrl } from '../lib/assetManifest';

/** The player's body is the Character Creator 5 character (lib/assetManifest.ts), unless it isn't available. */
const hasPlayerBody = () => assetManifest().avatar !== null;
/** What the person looks like, for the stages' descriptions: the CC5 character (HUMAN.fbx: Classic_Slick_Back, Stubble) or the chosen look. */
const describedLook = (lookId: string): { hair: string; facialHair?: string; covered?: boolean; outfit: string } =>
  hasPlayerBody() ? { hair: 'Slicked back', facialHair: 'Stubble', outfit: 'Shirt, slim trousers and sneakers' } : lookById(lookId);
import { STARTING_BALANCE } from '../lib/gameState';
import {
  EDIT_STAGES, STAGES, STARTER_PRESETS, applyPreset, buildCharacter, draftFrom, newDraft, problems, randomise, starterItems, withBody,
  type Draft, type StageId,
} from '../lib/creator';
import type { HomeDecorPlacement } from '../lib/homeDecor';
import type { SkinToneId } from '../lib/skinTone';
import { SkinTonePicker } from './SkinTonePicker';

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
  /** Build, muscle, curves, belly, bust, waist, shoulders and legs (lib/bodyShape.ts). */
  shape: BodyShape;
  /** -1 lighter … 1 deeper than the person's own skin; 0 (or missing in old saves) keeps it. */
  skinTone?: number;
  /** A skin tint over the person's own skin (lib/skinTone.ts); 'original' or missing keeps it. */
  skinToneId?: SkinToneId;
  /** A custom colour for the tint. */
  skinColor?: string;
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
  /**
   * Choices made when the life was created (traits, a dream, a first home),
   * applied once when the game starts. Never saved with the character.
   */
  start?: StartChoices;
}

export interface StartChoices {
  /** A short background story, shown on your Life OS profile. */
  bio?: string;
  traits: TraitId[];
  dream: DreamId | null;
  homeId: string | null;
}

interface CharacterCreationProps {
  /** Called with the saved character (new, or the edited one). */
  onCharacterCreate: (character: Character) => void;
  /** Back without creating or changing anyone. */
  onBack?: () => void;
  /** Editing an existing character's appearance: id, money, progress and owned clothes are kept. */
  editing?: Character;
}

const FOCUS: Record<StageId, PreviewFocus> = {
  identity: 'body', body: 'body', proportions: 'body', face: 'face', hair: 'face', clothes: 'body', review: 'body',
};

/** "Create your life": seven stages with a live, rotatable 3D preview of the in-game model. */
export function CharacterCreation({ onCharacterCreate, onBack, editing }: CharacterCreationProps) {
  const [draft, setDraft] = useState<Draft>(() => (editing ? draftFrom(editing) : { ...newDraft(DEFAULT_COUNTRY), region: stateById(SONGHAI.capitalStateId)!.name }));
  const stageIds: readonly StageId[] = editing ? EDIT_STAGES : STAGES.map((s) => s.id);
  const [stageIndex, setStageIndex] = useState(0);
  const stage = STAGES.find((s) => s.id === stageIds[stageIndex])!;
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const issues = problems(draft);
  const canLeaveIdentity = !!draft.name.trim();
  const last = stageIndex === stageIds.length - 1;

  const styles = useMemo(() => {
    const equipped: Partial<Record<Slot, string>> = {};
    for (const [slot, id] of Object.entries(draft.outfit) as [Slot, string | null][]) if (id) equipped[slot] = id;
    return resolveStyles(equipped, undefined, editing?.wardrobe.colours);
  }, [draft.outfit, editing]);

  const finish = () => {
    if (issues.length) return;
    const character = buildCharacter(draft, { existing: editing });
    saveCharacter(character);
    onCharacterCreate(character);
  };
  const next = () => {
    if (stage.id === 'identity' && !canLeaveIdentity) return;
    if (last) finish();
    else setStageIndex((i) => i + 1);
  };

  const [focusOverride, setFocusOverride] = useState<PreviewFocus | null>(null);
  const focus = focusOverride ?? FOCUS[stage.id];
  const go = (i: number) => { setFocusOverride(null); setStageIndex(i); };
  const nav = stageIds.map((id, i) => ({
    id,
    label: STUDIO_LABEL[id],
    active: i === stageIndex,
    // The name comes first; everything else is open once you have one
    disabled: i > stageIndex && stage.id === 'identity' && !canLeaveIdentity,
    onClick: () => go(i),
  }));

  return (
    <Shell
      lookId={draft.lookId} heightCm={draft.heightCm} shape={draft.shape} skinTone={draft.skinTone} skinToneId={draft.skinToneId} skinColor={draft.skinColor} styles={styles} focus={focus}
      avatarName={draft.name.trim() || 'New avatar'}
      previewSub={hasPlayerBody()
        ? `Character Creator 5 · ${draft.heightCm} cm`
        : `${lookById(draft.lookId).hair}${lookById(draft.lookId).facialHair ? ` · ${lookById(draft.lookId).facialHair}` : ''} · ${draft.heightCm} cm`}
      nav={nav}
      title={stage.title}
      kicker={editing ? 'Change your appearance' : 'Create your life'}
      onFocus={setFocusOverride}
      onRandomise={stage.id === 'identity' || stage.id === 'review' ? undefined : () => setDraft((d) => randomise(d))}
      footer={(
        <div className="space-y-2">
          {stage.id === 'identity' && !canLeaveIdentity && <p className="m-0 text-center text-xs text-cc-muted">Enter a name to continue.</p>}
          {last && issues.length > 0 && <p className="m-0 text-center text-xs text-cc-muted">{issues.join(' ')}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => (stageIndex === 0 ? onBack?.() : go(stageIndex - 1))} disabled={stageIndex === 0 && !onBack}
              className="rounded-full border border-cc-line px-4 py-2.5 text-sm text-cc-muted transition hover:text-cc-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold disabled:opacity-40">
              ← Back
            </button>
            <button type="button" onClick={next} disabled={(stage.id === 'identity' && !canLeaveIdentity) || (last && issues.length > 0)} className={PRIMARY_BUTTON}>
              {last ? (editing ? 'Save changes' : 'Create & play') : `Next: ${STUDIO_LABEL[stageIds[stageIndex + 1]]}`}
            </button>
          </div>
        </div>
      )}
    >
      {stage.id === 'identity' && <IdentityStage draft={draft} set={set} />}
      {stage.id === 'body' && <BodyStage draft={draft} set={set} setDraft={setDraft} />}
      {stage.id === 'proportions' && <ProportionsStage draft={draft} set={set} />}
      {stage.id === 'face' && <FaceStage draft={draft} set={set} />}
      {stage.id === 'hair' && <HairStage draft={draft} set={set} editing={editing} />}
      {stage.id === 'clothes' && <ClothesStage draft={draft} set={set} editing={editing} />}
      {stage.id === 'review' && <ReviewStage draft={draft} set={set} editing={editing} />}
    </Shell>
  );
}

/** The studio's category names, in the style of a character-creator suite. */
const STUDIO_LABEL: Record<StageId, string> = {
  identity: 'Avatar', body: 'Person', proportions: 'Body', face: 'Skin', hair: 'Hair', clothes: 'Wardrobe', review: 'Life',
};

interface StageProps {
  draft: Draft;
  set: (patch: Partial<Draft>) => void;
}

function IdentityStage({ draft, set }: StageProps) {
  const [countries] = useState(countryOptions);
  return (
    <>
      <Field id="character-name" label="Character name">
        <input id="character-name" type="text" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Adaeze Okafor" maxLength={32} autoComplete="off" required className={INPUT} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="heritage" label="Race / heritage">
          <select id="heritage" value={draft.heritage} onChange={(e) => set({ heritage: e.target.value })} className={INPUT}>
            {HERITAGES.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
          </select>
        </Field>
        <Field id="ethnic-group" label="Ethnic group (optional)">
          <input id="ethnic-group" type="text" value={draft.ethnicGroup} onChange={(e) => set({ ethnicGroup: e.target.value })} maxLength={40} autoComplete="off" placeholder="e.g. Yoruba, Igbo, Zulu" className={INPUT} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="country" label="Home country">
          <select id="country" value={draft.country} onChange={(e) => set({ country: e.target.value, region: '' })} className={INPUT}>
            {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </Field>
        <Field id="region" label={regionTerm(draft.country)}>
          {SUBDIVISIONS[draft.country] ? (
            <select id="region" value={draft.region} onChange={(e) => set({ region: e.target.value })} className={INPUT}>
              <option value="">Choose…</option>
              {SUBDIVISIONS[draft.country].names.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          ) : (
            <input id="region" type="text" value={draft.region} onChange={(e) => set({ region: e.target.value })} maxLength={60} autoComplete="off" placeholder="Optional" className={INPUT} />
          )}
        </Field>
      </div>
      <p className="text-xs text-cc-muted">Your home country decides which local clothes you can start with. Your life choices (lifestyle, career, diet) come at the end.</p>
    </>
  );
}

function BodyStage({ draft, set, setDraft }: StageProps & { setDraft: (f: (d: Draft) => Draft) => void }) {
  const chooseGender = (gender: Gender) => {
    const implied = bodyForGender(gender);
    setDraft((d) => ({ ...(implied ? withBody(d, implied) : d), gender }));
  };
  return (
    <>
      <Field id="gender" label="Gender">
        <select id="gender" value={draft.gender} onChange={(e) => chooseGender(e.target.value as Gender)} className={INPUT}>
          {GENDERS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
      </Field>
      <div>
        <p className={SECTION_LABEL}>Body</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Body">
          {(['feminine', 'masculine'] as const).map((b) => (
            <button key={b} type="button" role="radio" aria-checked={draft.body === b} onClick={() => setDraft((d) => withBody(d, b))}
              disabled={!!bodyForGender(draft.gender) && bodyForGender(draft.gender) !== b}
              className={`rounded-lg border py-2 text-sm capitalize transition disabled:opacity-40 ${draft.body === b ? 'border-cc-gold bg-cc-gold/10 text-cc-ink' : 'border-cc-line text-cc-muted hover:border-cc-gold/60'}`}>
              {b} body
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className={SECTION_LABEL}>Quick start</p>
        <div className="flex flex-wrap gap-2">
          {STARTER_PRESETS.filter((p) => p.body === draft.body).map((p) => (
            <button key={p.id} type="button" onClick={() => setDraft((d) => applyPreset(d, p))}
              className="rounded-full border border-cc-line px-3 py-1 text-sm text-cc-muted transition hover:border-cc-gold/60 hover:text-cc-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold">
              {p.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-cc-muted">A starting point for person, figure, skin and clothes. Change anything afterwards, or press Randomise on the preview.</p>
      </div>
      {hasPlayerBody() ? (
        <div>
          <p className={SECTION_LABEL}>Person</p>
          <div className="rounded-lg border border-cc-gold bg-cc-gold/10 px-3 py-2.5 text-sm text-cc-ink">
            Your character, made in Character Creator 5
          </div>
          <p className="mt-2 text-xs text-cc-muted">Their own face, hair and modelled clothes. Choose the height, skin tone, hair colour and the colours you wear; the 3D preview shows them as you go.</p>
        </div>
      ) : (
      <div>
        <p className={SECTION_LABEL}>Person</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Person">
          {looksFor(draft.body).map((l, i) => (
            <button key={l.id} type="button" role="radio" aria-checked={draft.lookId === l.id} aria-label={`Person ${i + 1}: ${l.hair}`} onClick={() => set({ lookId: l.id })}
              className={`overflow-hidden rounded-lg border bg-cc-field text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold ${draft.lookId === l.id ? 'border-cc-gold ring-2 ring-cc-gold/40' : 'border-cc-line hover:border-cc-gold/60'}`}>
              <img src={assetUrl(`models/characters/rocketbox/thumbs/${l.id}.webp`)} alt="" loading="lazy" className="aspect-square w-full object-cover" />
              <span className="block truncate px-1.5 py-1 text-[10px] text-cc-muted">{l.hair}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-cc-muted">Real people from the Microsoft Rocketbox library. Each comes with their own face, hairstyle and clothes cut; you shape the body, skin, hair colour and fabrics next.</p>
      </div>
      )}
    </>
  );
}

function Slider({ id, label, min, max, step, value, onChange, ends, display }: {
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

function ProportionsStage({ draft, set }: StageProps) {
  const { shape } = draft;
  return (
    <>
      {draft.body === 'feminine' ? (
        <div>
          <p className={SECTION_LABEL}>Body type</p>
          <BodyTypeChart shape={shape} lookId={draft.lookId} heightCm={draft.heightCm} skinTone={draft.skinTone} onPick={(s) => set({ shape: s })} />
        </div>
      ) : (
      <div>
        <p className={SECTION_LABEL}>Body type</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Body type">
          {shapePresets(draft.body).map((p) => {
            const on = presetFor(shape, draft.body)?.id === p.id;
            return (
              <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => set({ shape: p.shape })}
                className={`rounded-full border px-3 py-1 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold ${on ? 'border-cc-gold bg-cc-gold/10 text-cc-ink' : 'border-cc-line text-cc-muted hover:border-cc-gold/60'}`}>
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
      )}
      <div className="space-y-2.5">
        <p className={SECTION_LABEL}>Fine-tune</p>
        <Slider id="height" label="Height" min={HEIGHT_RANGE.min} max={HEIGHT_RANGE.max} step={1} value={draft.heightCm} onChange={(v) => set({ heightCm: v })} ends={['Shorter', 'Taller']} display={`${draft.heightCm} cm`} />
        {shapeSliders(draft.body).map((s) => (
          <Slider key={s.key} id={`shape-${s.key}`} label={s.label} min={s.min} max={1} step={0.05} value={shape[s.key]} onChange={(v) => set({ shape: { ...shape, [s.key]: v } })} ends={s.ends} />
        ))}
      </div>
      {hasPlayerBody()
        ? <p className="text-xs text-cc-muted">Your Character Creator body keeps the proportions it was modelled with; these settings are saved with your life.</p>
        : <p className="text-xs text-cc-muted">Shape changes the 3D model itself: each part of the body is filled out or slimmed down around the skeleton, so walking, running and sitting animations still fit. Every slider stays within natural limits.</p>}
    </>
  );
}

function FaceStage({ draft, set }: StageProps) {
  const look = describedLook(draft.lookId);
  return (
    <>
      <div className="space-y-2.5">
        <p className={SECTION_LABEL}>Skin tone</p>
        <Slider id="skin" label="Skin" min={-1} max={1} step={0.05} value={draft.skinTone} onChange={(v) => set({ skinTone: v })} ends={['Lighter', 'Deeper']}
          display={draft.skinTone === 0 ? 'Natural' : draft.skinTone > 0 ? `${Math.round(draft.skinTone * 100)}% deeper` : `${Math.round(-draft.skinTone * 100)}% lighter`} />
        <div className="grid grid-cols-8 gap-2" role="radiogroup" aria-label="Skin tone presets">
          {SKIN_STEPS.map((t) => (
            <button key={t.value} type="button" role="radio" aria-checked={Math.abs(draft.skinTone - t.value) < 0.01} aria-label={t.label} title={t.label} onClick={() => set({ skinTone: t.value })}
              className={`aspect-square rounded-full border-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold ${Math.abs(draft.skinTone - t.value) < 0.01 ? 'border-cc-gold scale-110' : 'border-transparent hover:border-cc-gold/60'}`}
              style={{ background: t.color }} />
          ))}
        </div>
        <p className="text-xs text-cc-muted">Adjusts the person&rsquo;s own skin, keeping its texture and shading; clothes and hair aren&rsquo;t affected. The swatches are steps from lighter to deeper; the exact shade depends on the person.</p>
      </div>
      <SkinTonePicker skinTone={draft.skinToneId} skinColor={draft.skinColor} onChange={(skinToneId, skinColor) => set({ skinToneId, skinColor })} />
      <div>
        <p className={SECTION_LABEL}>Face</p>
        <p className="text-sm text-cc-ink">{look.facialHair ? `Facial hair: ${look.facialHair}.` : 'No facial hair.'}</p>
        {hasPlayerBody()
          ? <p className="mt-1 text-xs text-cc-muted">Your face as you made it in Character Creator 5.</p>
          : <p className="mt-1 text-xs text-cc-muted">Each person has their own photo-based face. Separate face shaping (nose, lips, jaw, eyes) arrives with the new morph-based character system; until then, choose a different person under Person for a different face.</p>}
      </div>
    </>
  );
}

function HairStage({ draft, set, editing }: StageProps & { editing?: Character }) {
  const look = describedLook(draft.lookId);
  const options = editing ? FASHION_ITEMS.filter((i) => i.slot === 'hair' && editing.wardrobe.owned.includes(i.id)) : starterItems(draft.country).filter((i) => i.slot === 'hair');
  return (
    <>
      <div>
        <p className={SECTION_LABEL}>Hairstyle</p>
        <p className="text-sm text-cc-ink">{look.hair}</p>
        {hasPlayerBody()
          ? <p className="mt-1 text-xs text-cc-muted">The style you gave your character in Character Creator 5. Pick a colour below.</p>
          : <p className="mt-1 text-xs text-cc-muted">Hair is part of each person&rsquo;s model, so the style comes with the person (under Person). Separate hair models (afro, braids, locs, twists, fades) need the new character system.</p>}
      </div>
      <div>
        <p className={SECTION_LABEL}>{look.covered ? 'Headwear colour' : 'Hair colour'}</p>
        <SwatchRow slot="hair" items={options} value={draft.outfit.hair ?? null} onPick={(id) => set({ outfit: { ...draft.outfit, hair: id } })} originalLabel={look.covered ? 'Original' : 'Natural'} />
        {editing && <p className="mt-2 text-xs text-cc-muted">Colours you own. Buy more at the salon in the game.</p>}
      </div>
    </>
  );
}

function SwatchRow({ items, value, onPick, originalLabel }: { slot: Slot; items: readonly (typeof FASHION_ITEMS)[number][]; value: string | null; onPick: (id: string | null) => void; originalLabel: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <button type="button" aria-pressed={value === null} onClick={() => onPick(null)}
        className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-left text-xs transition ${value === null ? 'border-cc-gold bg-cc-gold/10 text-cc-ink' : 'border-cc-line text-cc-muted hover:border-cc-gold/60'}`}>
        <span className="h-6 w-6 shrink-0 rounded-full border border-cc-line bg-cc-field" aria-hidden />{originalLabel}
      </button>
      {items.map((i) => (
        <button key={i.id} type="button" aria-pressed={value === i.id} onClick={() => onPick(i.id)}
          className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-left text-xs transition ${value === i.id ? 'border-cc-gold bg-cc-gold/10 text-cc-ink' : 'border-cc-line text-cc-muted hover:border-cc-gold/60'}`}>
          <span className="h-6 w-6 shrink-0 rounded-full border border-cc-line" style={{ background: swatchCss(i.style) }} aria-hidden />
          <span className="min-w-0 truncate">{i.name}</span>
        </button>
      ))}
    </div>
  );
}

function ClothesStage({ draft, set, editing }: StageProps & { editing?: Character }) {
  const look = describedLook(draft.lookId);
  const pool = editing ? FASHION_ITEMS.filter((i) => editing.wardrobe.owned.includes(i.id)) : starterItems(draft.country);
  return (
    <>
      <p className="text-sm text-cc-muted">
        {look.outfit}. {hasPlayerBody()
          ? 'Choose the colour of each piece; it’s applied to the garment on the 3D model, keeping its folds (patterned fabrics show their main colour).'
          : 'Choose the fabric and colour of each piece; it’s applied to the garment on the 3D model, keeping its folds.'}
        {editing ? ' These are the clothes you own; buy more at the boutique.' : ' Starter pieces are free and yours to keep.'}
      </p>
      {(['top', 'bottom', 'shoes'] as const).map((slot) => (
        <div key={slot}>
          <p className={SECTION_LABEL}>{SLOT_LABEL[slot]}</p>
          <SwatchRow slot={slot} items={pool.filter((i) => i.slot === slot)} value={draft.outfit[slot] ?? null} onPick={(id) => set({ outfit: { ...draft.outfit, [slot]: id } })} originalLabel="Original" />
        </div>
      ))}
      <div className="rounded-lg border border-cc-line p-3 text-xs text-cc-muted">
        <p className="m-0 font-semibold text-cc-ink">Not available yet</p>
        <p className="m-0 mt-1">Different garment cuts (dresses, skirts, shorts, jackets on/off), accessories (earrings, glasses, hats, bags) and other shoe styles need separate clothing models fitted to a shared skeleton. They arrive with the new character system; nothing here pretends otherwise.</p>
      </div>
    </>
  );
}

function ReviewStage({ draft, set, editing }: StageProps & { editing?: Character }) {
  const look = describedLook(draft.lookId);
  const preset = presetFor(draft.shape, draft.body);
  const wearing = (['top', 'bottom', 'shoes', 'hair'] as const)
    .map((s) => (draft.outfit[s] ? FASHION_ITEMS.find((i) => i.id === draft.outfit[s])?.name : null))
    .filter(Boolean);
  return (
    <>
      <dl className="grid grid-cols-[7rem_1fr] gap-y-1.5 text-sm">
        <dt className="text-cc-muted">Name</dt><dd className="m-0">{draft.name}</dd>
        <dt className="text-cc-muted">From</dt><dd className="m-0">{formatHome(draft.country, draft.region)}</dd>
        <dt className="text-cc-muted">Body</dt><dd className="m-0 capitalize">{draft.body} · {preset?.label ?? 'Custom shape'} · {draft.heightCm} cm</dd>
        <dt className="text-cc-muted">Hair</dt><dd className="m-0">{look.hair}</dd>
        <dt className="text-cc-muted">Wearing</dt><dd className="m-0">{wearing.length ? wearing.join(', ') : 'Their own clothes'}</dd>
      </dl>
      {editing ? (
        <p className="text-xs text-cc-muted">Only your appearance changes. Your money, home, career, progress and everything you own stay exactly as they are.</p>
      ) : (
        <div className="space-y-4">
          <p className={SECTION_LABEL}>Your life</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="lifestyle" label="Lifestyle" hint={`Start with ${STARTING_BALANCE[draft.lifestyle].toLocaleString()} GHAI.`}>
              <select id="lifestyle" value={draft.lifestyle} onChange={(e) => set({ lifestyle: e.target.value as Lifestyle })} className={INPUT}>
                {(Object.keys(LIFESTYLE_LABEL) as Lifestyle[]).map((l) => <option key={l} value={l}>{LIFESTYLE_LABEL[l]}</option>)}
              </select>
            </Field>
            <Field id="career" label="Career">
              <select id="career" value={draft.career} onChange={(e) => set({ career: e.target.value as Career })} className={INPUT}>
                {(Object.keys(CAREER_LABEL) as Career[]).map((c) => <option key={c} value={c}>{CAREER_LABEL[c]}</option>)}
              </select>
            </Field>
          </div>
          <Field id="diet" label="Diet" hint={`${DIETS.find((d) => d.id === draft.diet)!.hint} Menus show what suits you.`}>
            <select id="diet" value={draft.diet} onChange={(e) => set({ diet: e.target.value as Diet })} className={INPUT}>
              {DIETS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </Field>
          <StartChoicesFields draft={draft} set={set} />
        </div>
      )}
    </>
  );
}

/** Tone steps for the swatch row (relative to the person's own skin, as the slider is). */
const SKIN_STEPS: readonly { value: number; label: string; color: string }[] = [
  { value: -0.75, label: 'Much lighter', color: '#d9a882' },
  { value: -0.4, label: 'Lighter', color: '#c38f6a' },
  { value: 0, label: 'Natural', color: 'linear-gradient(135deg,#b07a55,#7a4a2c)' },
  { value: 0.25, label: 'A little deeper', color: '#94603d' },
  { value: 0.45, label: 'Deeper', color: '#7b4b2e' },
  { value: 0.65, label: 'Rich', color: '#623a22' },
  { value: 0.85, label: 'Deep', color: '#4a2b19' },
  { value: 1, label: 'Deepest', color: '#352013' },
];

/** Personality, a dream and a first home for a new life: the same choices the Life OS offers later. */
function StartChoicesFields({ draft, set }: StageProps) {
  const budget = STARTING_BALANCE[draft.lifestyle];
  const homes = districtById(DEFAULT_DISTRICT_ID).homes;
  const toggleTrait = (id: TraitId) => {
    const on = draft.traits.includes(id);
    if (!on && draft.traits.length >= MAX_TRAITS) return;
    set({ traits: on ? draft.traits.filter((t) => t !== id) : [...draft.traits, id] });
  };
  // A home you can't afford with your starting money is dropped if the lifestyle changes
  const chosen = homes.find((h) => h.id === draft.homeId);
  const homeOk = !chosen || moveInFee(chosen) <= budget;
  return (
    <>
      <div>
        <p className={SECTION_LABEL}>Personality (up to {MAX_TRAITS})</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TRAITS.map((t) => {
            const on = draft.traits.includes(t.id);
            const full = !on && draft.traits.length >= MAX_TRAITS;
            return (
              <button key={t.id} type="button" aria-pressed={on} disabled={full} onClick={() => toggleTrait(t.id)}
                className={`rounded-lg border px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold disabled:opacity-40 ${on ? 'border-cc-gold bg-cc-gold/10' : 'border-cc-line hover:border-cc-gold/60'}`}>
                <span className="block text-sm font-semibold text-cc-ink">{t.label}</span>
                <span className="block text-[11px] text-cc-muted">{t.effect}</span>
              </button>
            );
          })}
        </div>
      </div>
      <Field id="bio" label="Background story (optional)" hint={`${draft.bio.length}/280 · shown on your profile in the Life OS`}>
        <textarea id="bio" value={draft.bio} onChange={(e) => set({ bio: e.target.value.slice(0, 280) })} rows={3} maxLength={280}
          placeholder="e.g. Grew up in Surulere, first in the family to go to university, saving for a place of my own." className={INPUT} />
      </Field>
      <Field id="dream" label="Life dream (optional)" hint={draft.dream ? DREAMS.find((d) => d.id === draft.dream)?.description : 'A long-term goal with milestones and rewards. You can also pick one later in the Life OS.'}>
        <select id="dream" value={draft.dream ?? ''} onChange={(e) => set({ dream: (e.target.value || null) as DreamId | null })} className={INPUT}>
          <option value="">Decide later</option>
          {DREAMS.filter((d) => !d.open).map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
      </Field>
      <div>
        <p className={SECTION_LABEL}>First home in {districtById(DEFAULT_DISTRICT_ID).city.name} (optional)</p>
        <div className="grid gap-2" role="radiogroup" aria-label="First home">
          <button type="button" role="radio" aria-checked={!draft.homeId} onClick={() => set({ homeId: null })}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition ${!draft.homeId ? 'border-cc-gold bg-cc-gold/10' : 'border-cc-line hover:border-cc-gold/60'}`}>
            Find a home later <span className="text-xs text-cc-muted">· you can rent one at any front door</span>
          </button>
          {homes.map((h) => {
            const fee = moveInFee(h);
            const afford = fee <= budget;
            return (
              <button key={h.id} type="button" role="radio" aria-checked={draft.homeId === h.id} disabled={!afford} onClick={() => set({ homeId: h.id })}
                className={`rounded-lg border px-3 py-2 text-left transition disabled:opacity-40 ${draft.homeId === h.id ? 'border-cc-gold bg-cc-gold/10' : 'border-cc-line hover:border-cc-gold/60'}`}>
                <span className="block text-sm font-semibold text-cc-ink">{h.name} <span className="font-normal text-cc-muted">· {h.kind}</span></span>
                <span className="block text-[11px] text-cc-muted">Move-in {fee.toLocaleString()} GHAI, then {h.rentPerNight.toLocaleString()} GHAI a night{afford ? '' : ' · more than your starting money'}</span>
              </button>
            );
          })}
        </div>
        {!homeOk && <p className="mt-1 text-xs text-cc-muted">That home costs more than this lifestyle starts with, so you won’t move in. Choose another or a richer lifestyle.</p>}
      </div>
    </>
  );
}

const SECTION_LABEL = 'text-xs font-semibold uppercase tracking-[0.18em] text-cc-gold mb-2';
const INPUT =
  'w-full rounded-lg border border-cc-line bg-cc-field px-3.5 py-2.5 text-cc-ink placeholder:text-cc-muted/70 ' +
  'focus:outline-none focus:border-cc-gold focus:ring-2 focus:ring-cc-gold/30 transition';
const PRIMARY_BUTTON =
  'flex-1 rounded-lg bg-cc-gold py-3 font-display font-bold tracking-wide text-cc-bg hover:bg-cc-gold-strong transition ' +
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

interface NavEntry { id: string; label: string; active: boolean; disabled: boolean; onClick: () => void }

/**
 * A character-creator studio: categories down the left, the live 3D model in
 * the middle, the controls for the category on the right and a toolbar under
 * the model. On phones it stacks: categories as a scrolling row, the model,
 * then the controls.
 */
function Shell({ children, avatarName, previewSub, nav, title, kicker, footer, lookId, heightCm, styles, shape, skinTone, skinToneId, skinColor, focus, onFocus, onRandomise }: {
  children: ReactNode; avatarName: string; previewSub: string; lookId: string; heightCm: number;
  nav: readonly NavEntry[]; title: string; kicker: string; footer: ReactNode;
  shape: BodyShape; skinTone: number; skinToneId: SkinToneId; skinColor: string; focus: PreviewFocus; onFocus: (f: PreviewFocus) => void;
  styles: ReturnType<typeof resolveStyles>;
  onRandomise?: () => void;
}) {
  const tool = 'flex items-center gap-1.5 rounded-full border border-cc-line bg-cc-bg/70 px-3 py-1.5 text-xs font-semibold backdrop-blur transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold';
  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-cc-bg text-cc-ink lg:overflow-hidden" style={{ backgroundImage: 'radial-gradient(1000px 700px at 50% 35%, rgba(201,164,92,0.10), transparent 60%)' }}>
      {/* Top bar */}
      <header className="flex shrink-0 items-center gap-4 border-b border-cc-line px-4 py-2.5 sm:px-6">
        <img src={`${import.meta.env.BASE_URL}assets/brand/aye-mark.webp`} alt="AYE" className="h-8 w-auto" />
        <span className="hidden text-[11px] uppercase tracking-[0.25em] text-cc-muted sm:inline">{kicker}</span>
        <p className="m-0 ml-auto truncate text-xs uppercase tracking-[0.2em] text-cc-muted">Avatar name: <span className="text-cc-ink">{avatarName}</span></p>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[13rem_minmax(0,1fr)_25rem]">
        {/* Categories */}
        <nav aria-label="Creator categories" className="flex shrink-0 gap-2 overflow-x-auto px-4 py-3 lg:flex-col lg:justify-center lg:gap-3 lg:overflow-visible lg:px-5">
          {nav.map((n) => (
            <button key={n.id} type="button" onClick={n.onClick} disabled={n.disabled} aria-current={n.active ? 'step' : undefined}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-left text-xs font-semibold uppercase tracking-[0.3em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold disabled:cursor-not-allowed disabled:opacity-40 lg:w-full lg:py-2 ${n.active ? 'border-cc-gold bg-cc-gold/10 text-cc-gold-strong' : 'border-cc-line/80 text-cc-ink/85 hover:border-cc-gold/60'}`}>
              {n.label}
            </button>
          ))}
        </nav>

        {/* The model */}
        <section className="relative min-h-[26rem] overflow-hidden lg:min-h-0" aria-label="Character preview">
          <CharacterPreview lookId={lookId} heightCm={heightCm} styles={styles} shape={shape} skinTone={skinTone} skinToneId={skinToneId} skinColor={skinColor} focus={focus} interactive />
          <p className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap text-[11px] uppercase tracking-[0.2em] text-cc-muted">Drag to turn · scroll or pinch to zoom</p>
          <div className={`pointer-events-none absolute inset-x-0 bottom-14 text-center ${focus === 'face' ? 'hidden' : ''}`}>
            <p className="m-0 truncate font-display text-xl font-bold text-cc-ink">{avatarName}</p>
            <p className="m-0 text-xs text-cc-muted">{previewSub}</p>
          </div>
          {/* Toolbar */}
          <div className="absolute inset-x-0 bottom-3 flex flex-wrap justify-center gap-2 px-3">
            <div className="flex overflow-hidden rounded-full border border-cc-line bg-cc-bg/70 backdrop-blur" role="radiogroup" aria-label="Camera">
              {(['face', 'body'] as const).map((f) => (
                <button key={f} type="button" role="radio" aria-checked={focus === f} onClick={() => onFocus(f)}
                  className={`px-3 py-1.5 text-xs font-semibold capitalize transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold ${focus === f ? 'bg-cc-gold/20 text-cc-gold-strong' : 'text-cc-muted hover:text-cc-ink'}`}>
                  {f === 'face' ? 'Face camera' : 'Body camera'}
                </button>
              ))}
            </div>
            {onRandomise && (
              <button type="button" onClick={onRandomise} className={`${tool} border-cc-gold/60 text-cc-gold-strong hover:bg-cc-gold/15`}>Randomise</button>
            )}
          </div>
        </section>

        {/* Controls for this category */}
        <section aria-labelledby="create-title" className="flex min-h-0 flex-col border-cc-line bg-cc-panel/95 lg:border-l">
          <div className="border-b border-cc-line px-5 py-3 text-center">
            <h1 id="create-title" className="m-0 font-display text-sm font-bold uppercase tracking-[0.3em] text-cc-gold-strong">{nav.find((n) => n.active)?.label}</h1>
            <p className="m-0 mt-0.5 text-xs text-cc-muted">{title}</p>
          </div>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">{children}</div>
          <div className="border-t border-cc-line px-5 py-3">{footer}</div>
        </section>
      </div>
    </div>
  );
}
