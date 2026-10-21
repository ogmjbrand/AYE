/**
 * Rules behind "Create your life": the stages, the free starter wardrobe,
 * quick-start presets, a coherent Randomise, and turning the choices into
 * the saved character. The same draft is used to edit an existing
 * character's appearance (money, progress and owned clothes are kept).
 */
import type { Career, Character, Lifestyle } from '../components/CharacterCreation';
import type { Diet } from './food';
import type { Gender } from './identity';
import { FASHION_ITEMS, sanitiseWardrobe, type FashionItem, type Slot, type Wardrobe } from './fashion';
import { HEIGHT_RANGE, LOOKS, defaultHeightCm, looksFor, type BodyType } from './looks';
import { AVERAGE_SHAPE, SHAPE_PRESETS, FEMININE_SHAPE_PRESETS, sanitiseShape, shapePresets, type BodyShape } from './bodyShape';
import { STARTING_BALANCE } from './gameState';

export type StageId = 'identity' | 'body' | 'proportions' | 'face' | 'hair' | 'clothes' | 'review';

export const STAGES: readonly { id: StageId; label: string; title: string }[] = [
  { id: 'identity', label: 'Identity', title: 'Who are you?' },
  { id: 'body', label: 'Body', title: 'Gender presentation and person' },
  { id: 'proportions', label: 'Shape', title: 'Body size and proportions' },
  { id: 'face', label: 'Face & skin', title: 'Face, skin tone and features' },
  { id: 'hair', label: 'Hair', title: 'Hairstyle and hair colour' },
  { id: 'clothes', label: 'Clothes', title: 'Clothes and shoes' },
  { id: 'review', label: 'Review', title: 'Your life' },
];

/** Stages used when changing an existing character's appearance. */
export const EDIT_STAGES: readonly StageId[] = ['body', 'proportions', 'face', 'hair', 'clothes', 'review'];

export interface Draft {
  name: string;
  gender: Gender;
  heritage: string;
  ethnicGroup: string;
  country: string;
  region: string;
  body: BodyType;
  lookId: string;
  heightCm: number;
  shape: BodyShape;
  /** -1 lighter … 1 deeper than the person's own skin. */
  skinTone: number;
  /** What's worn per slot: an item id, or null for the person's own garment or hair. */
  outfit: Partial<Record<Slot, string | null>>;
  lifestyle: Lifestyle;
  career: Career;
  diet: Diet;
}

export const SKIN_TONE_RANGE = { min: -1, max: 1 } as const;

/**
 * Starter clothes you can pick for free when creating a life: everyday
 * pieces and prints (up to 550 GHAI) and salon colours up to 300, from
 * shops in your home country or everywhere. Anything else is bought in game.
 */
export function starterItems(country: string): FashionItem[] {
  return FASHION_ITEMS.filter((i) =>
    (!i.stockedIn || i.stockedIn.includes(country)) &&
    (i.slot === 'hair' ? i.price <= 300 : (i.collection === 'Everyday' || i.collection === 'African prints') && i.price <= 550));
}

export const isStarter = (id: string, country: string) => starterItems(country).some((i) => i.id === id);

export function newDraft(country = 'NG'): Draft {
  const body: BodyType = 'feminine';
  return {
    name: '', gender: 'unspecified', heritage: 'unspecified', ethnicGroup: '', country, region: '',
    body, lookId: looksFor(body)[0].id, heightCm: defaultHeightCm(body), shape: AVERAGE_SHAPE, skinTone: 0,
    outfit: {}, lifestyle: 'ordinary', career: 'none', diet: 'everything',
  };
}

/** A draft from a saved character, for changing appearance. Owned clothes stay as they are. */
export function draftFrom(c: Character): Draft {
  return {
    name: c.name, gender: c.gender, heritage: c.heritage, ethnicGroup: c.ethnicGroup, country: c.country, region: c.region,
    body: c.body, lookId: c.lookId, heightCm: c.heightCm, shape: sanitiseShape(c.shape), skinTone: c.skinTone ?? 0,
    outfit: { ...c.wardrobe.equipped }, lifestyle: c.lifestyle, career: c.career, diet: c.diet,
  };
}

/** Changing body keeps everything coherent: a person, height and figure for that body. */
export function withBody(d: Draft, body: BodyType): Draft {
  if (d.body === body) return d;
  const shape = body === 'masculine' ? { ...d.shape, bust: 0, waist: 0 } : d.shape;
  return { ...d, body, lookId: looksFor(body)[0].id, heightCm: defaultHeightCm(body), shape };
}

// ---------------------------------------------------------------- presets and randomise

export interface StarterPreset {
  id: string;
  label: string;
  body: BodyType;
  lookId: string;
  heightCm: number;
  shape: string;
  skinTone: number;
  outfit: Partial<Record<Slot, string>>;
}

/** Quick starting points (fully editable afterwards). */
export const STARTER_PRESETS: readonly StarterPreset[] = [
  { id: 'city-curvy', label: 'City curvy', body: 'feminine', lookId: 'female-adult-08', heightCm: 166, shape: 'curvy', skinTone: 0.9, outfit: { top: 'top-ankara-sunset', bottom: 'bottom-denim-classic', shoes: 'shoes-clean-white', hair: 'hair-natural-black' } },
  { id: 'runner', label: 'Lean runner', body: 'feminine', lookId: 'female-adult-11', heightCm: 172, shape: 'athletic', skinTone: 1, outfit: { top: 'top-cotton-terracotta', bottom: 'bottom-denim-black', shoes: 'shoes-clean-white' } },
  { id: 'hourglass', label: 'Hourglass', body: 'feminine', lookId: 'female-adult-03', heightCm: 164, shape: 'hourglass', skinTone: 0.7, outfit: { top: 'top-adire-indigo', bottom: 'bottom-linen-cream', shoes: 'shoes-suede-burgundy', hair: 'hair-dark-brown' } },
  { id: 'plus', label: 'Plus-size curvy', body: 'feminine', lookId: 'female-adult-06', heightCm: 163, shape: 'plus-curvy', skinTone: 0.6, outfit: { top: 'top-bogolan-earth', bottom: 'bottom-chino-khaki' } },
  { id: 'everyday-man', label: 'Everyday', body: 'masculine', lookId: 'male-adult-12', heightCm: 178, shape: 'average', skinTone: 0, outfit: { top: 'top-linen-ivory', bottom: 'bottom-denim-classic', shoes: 'shoes-clean-white' } },
  { id: 'gym', label: 'Gym regular', body: 'masculine', lookId: 'male-adult-04', heightCm: 182, shape: 'muscular', skinTone: 0.4, outfit: { top: 'top-cotton-midnight', bottom: 'bottom-chino-khaki' } },
  { id: 'big-man', label: 'Big man', body: 'masculine', lookId: 'male-adult-18', heightCm: 180, shape: 'larger', skinTone: 0.2, outfit: { top: 'top-ankara-royal', bottom: 'bottom-denim-black' } },
  { id: 'slim-man', label: 'Slim', body: 'masculine', lookId: 'male-adult-10', heightCm: 175, shape: 'slim', skinTone: 0.5, outfit: { top: 'top-breton-navy', bottom: 'bottom-linen-cream', shoes: 'shoes-clean-white' } },
];

export function applyPreset(d: Draft, p: StarterPreset): Draft {
  const shape = shapePresets(p.body).find((s) => s.id === p.shape)?.shape ?? AVERAGE_SHAPE;
  const outfit = Object.fromEntries(Object.entries(p.outfit).filter(([, id]) => isStarter(id!, d.country)));
  return { ...d, body: p.body, lookId: p.lookId, heightCm: p.heightCm, shape, skinTone: p.skinTone, outfit };
}

/** A random but coherent appearance for the chosen body: a real person, a real figure, starter clothes. Identity and life choices stay. */
export function randomise(d: Draft, rand: () => number = Math.random): Draft {
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length) % list.length];
  const looks = looksFor(d.body);
  const look = pick(looks);
  const base = pick(d.body === 'feminine' ? FEMININE_SHAPE_PRESETS : SHAPE_PRESETS).shape;
  // A little variation around a real preset, then clamped back into range
  const jitter = (v: number, amt: number) => v + (rand() - 0.5) * amt;
  const shape = sanitiseShape({
    ...base,
    weight: jitter(base.weight, 0.3), muscle: jitter(base.muscle, 0.2), curves: jitter(base.curves, 0.2),
    shoulders: jitter(base.shoulders, 0.4), legs: jitter(base.legs, 0.4),
  });
  const mid = defaultHeightCm(d.body);
  const heightCm = Math.round(Math.max(HEIGHT_RANGE.min, Math.min(HEIGHT_RANGE.max, mid + (rand() - 0.5) * 20)));
  const starters = starterItems(d.country);
  const outfit: Partial<Record<Slot, string | null>> = {};
  for (const slot of ['top', 'bottom', 'shoes'] as const) {
    // Sometimes keep the person's own garment: their original clothes are always a coherent outfit
    outfit[slot] = rand() < 0.25 ? null : pick(starters.filter((i) => i.slot === slot)).id;
  }
  // Natural colours most of the time, and never on covered heads (that would recolour the headwear)
  const naturals = starters.filter((i) => i.slot === 'hair' && ['hair-natural-black', 'hair-dark-brown', 'hair-blue-black'].includes(i.id));
  outfit.hair = look.covered || rand() < 0.5 ? null : pick(rand() < 0.75 ? naturals : starters.filter((i) => i.slot === 'hair')).id;
  const skinTone = Math.round((rand() * 1.4 - 0.4) * 20) / 20;
  return { ...d, lookId: look.id, shape, heightCm, skinTone, outfit };
}

// ---------------------------------------------------------------- save

const clampTone = (v: number) => Math.round(Math.max(SKIN_TONE_RANGE.min, Math.min(SKIN_TONE_RANGE.max, v)) * 100) / 100;

/** What's wrong with the draft, if anything (checked before creating). */
export function problems(d: Draft): string[] {
  const out: string[] = [];
  if (!d.name.trim()) out.push('Enter a name.');
  const look = LOOKS.find((l) => l.id === d.lookId);
  if (!look || look.body !== d.body) out.push('Choose a person for this body.');
  return out;
}

/**
 * The character to save. New: starter clothes you picked are yours. Editing:
 * only clothes you already own can be worn, and id, money and everything you
 * own are kept.
 */
export function buildCharacter(d: Draft, opts: { existing?: Character; id?: string; now?: number } = {}): Character {
  const now = opts.now ?? Date.now();
  const existing = opts.existing;
  const owned = existing ? existing.wardrobe.owned : [];
  const equipped: Partial<Record<Slot, string>> = {};
  const newlyOwned: string[] = [];
  for (const [slot, id] of Object.entries(d.outfit) as [Slot, string | null][]) {
    if (!id) continue;
    if (owned.includes(id) || (!existing && isStarter(id, d.country))) {
      equipped[slot] = id;
      if (!owned.includes(id)) newlyOwned.push(id);
    }
  }
  const wardrobe: Wardrobe = sanitiseWardrobe({ ...(existing?.wardrobe ?? {}), owned: [...owned, ...newlyOwned], equipped });
  const appearance = {
    name: d.name.trim().slice(0, 32), gender: d.gender, heritage: d.heritage, ethnicGroup: d.ethnicGroup.trim().slice(0, 40),
    country: d.country, region: d.region.trim().slice(0, 60), body: d.body, lookId: d.lookId,
    heightCm: Math.round(Math.max(HEIGHT_RANGE.min, Math.min(HEIGHT_RANGE.max, d.heightCm))),
    shape: sanitiseShape(d.shape), skinTone: clampTone(d.skinTone), wardrobe,
  };
  if (existing) return { ...existing, ...appearance };
  return {
    id: opts.id ?? crypto.randomUUID(),
    ...appearance,
    lifestyle: d.lifestyle, career: d.career, diet: d.diet,
    colorR: 54, colorG: 82, colorB: 125,
    balance: STARTING_BALANCE[d.lifestyle],
    createdAt: now,
    lastBalanceUpdate: now,
  };
}
