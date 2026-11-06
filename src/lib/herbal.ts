/**
 * AYE's herbal medicine: the plants grown in every hospital's medicinal garden, and the remedies
 * prepared from them in its Herbal Medicine Centre.
 *
 * Two kinds of information are kept apart on purpose, and the game shows them apart:
 * - `traditional`: how the plant has been used, as documented in West African food and folk
 *   practice. It is history and culture, not medical advice, and it never claims the plant
 *   treats or cures any real condition.
 * - `game`: what it does in AYE, a fictional gameplay effect.
 *
 * Remedies are fictional game items. They never replace emergency care: a red-flag emergency is
 * always sent to the modern emergency department (lib/healthcare.ts), and emergency recovery is
 * free whatever you can afford (lib/health.ts).
 */

export const HERBAL_DISCLAIMER =
  'Herbal remedies in AYE are fictional game items with game effects only. The traditional uses shown are history and culture, not medical advice: in real life, see a qualified health professional.';

export type PlantPart = 'leaves' | 'root' | 'rhizome' | 'stalk' | 'gel' | 'calyces' | 'seeds' | 'bark';

export interface Plant {
  id: string;
  name: string;
  botanical: string;
  /** Names in Songhai's languages, as the plant is known in markets (Yoruba, Igbo, Hausa where common). */
  localNames: readonly string[];
  /** The part that's used. */
  part: PlantPart;
  /** Documented traditional and culinary use, worded as history, never as a cure. */
  traditional: string;
  /** What it does in the game. */
  game: string;
  /** Game minutes from planting to harvest in the hospital garden. */
  growMinutes: number;
  /** Handfuls a harvest gives. */
  yield: number;
  /** Colour of its leaves or flowers (the garden draws it). */
  color: string;
  /** How it grows: the garden's shapes. */
  habit: 'shrub' | 'tree' | 'grass' | 'clump' | 'rosette' | 'vine';
}

export const PLANTS: readonly Plant[] = [
  {
    id: 'bitter-leaf', name: 'Bitter leaf', botanical: 'Vernonia amygdalina', localNames: ['Ewúro (Yoruba)', 'Onugbu (Igbo)', 'Shiwaka (Hausa)'], part: 'leaves',
    traditional: 'Washed and squeezed to soften its bitterness, then cooked in soups such as ofe onugbu; bitter leaf infusions also have a long place in West African folk practice.',
    game: 'The base of the bitter-leaf tonic: a slow, steady lift in health.', growMinutes: 180, yield: 3, color: '#3e6b34', habit: 'shrub',
  },
  {
    id: 'neem', name: 'Neem', botanical: 'Azadirachta indica', localNames: ['Dongoyaro (Hausa, Yoruba)'], part: 'leaves',
    traditional: 'Planted for shade across the region; its twigs have long served as chewing sticks and its leaves are used in washes and as an insect deterrent in folk practice.',
    game: 'Goes into the cleansing herbal bath and the calming steam.', growMinutes: 240, yield: 3, color: '#4f7a3a', habit: 'tree',
  },
  {
    id: 'ginger', name: 'Ginger', botanical: 'Zingiber officinale', localNames: ['Atalẹ (Yoruba)', 'Jinja (Igbo)', 'Citta (Hausa)'], part: 'rhizome',
    traditional: 'A kitchen staple in drinks like zobo and kunu and in pepper soup; ginger tea is a common home drink in cold, dusty Harmattan months.',
    game: 'Warms every tea it goes into: adds energy.', growMinutes: 200, yield: 2, color: '#5d8a43', habit: 'clump',
  },
  {
    id: 'turmeric', name: 'Turmeric', botanical: 'Curcuma longa', localNames: ['Atalẹ pupa (Yoruba)', 'Gangamau (Hausa)'], part: 'rhizome',
    traditional: 'Used as a spice and colouring in cooking, and in pastes and drinks in folk practice across West Africa and beyond.',
    game: 'Unlocks the turmeric-ginger recovery drink once you have researched it.', growMinutes: 240, yield: 2, color: '#6a9a48', habit: 'clump',
  },
  {
    id: 'lemongrass', name: 'Lemongrass', botanical: 'Cymbopogon citratus', localNames: ['Ewé tii (Yoruba)', 'Achara ehi (Igbo)', 'Tsaida (Hausa)'], part: 'stalk',
    traditional: 'Brewed as a fragrant tea, sometimes called "fever grass" in folk use; grown at the edge of many compounds.',
    game: 'A calming tea and steam: restores energy.', growMinutes: 150, yield: 4, color: '#8bbf5a', habit: 'grass',
  },
  {
    id: 'aloe', name: 'Aloe vera', botanical: 'Aloe barbadensis miller', localNames: ['Ahon erin (Yoruba)'], part: 'gel',
    traditional: 'The clear gel of the leaf is applied to the skin in many cultures and is common in cosmetics.',
    game: 'The soothing gel: a small heal for minor scrapes and kitchen mishaps.', growMinutes: 300, yield: 2, color: '#7aa37a', habit: 'rosette',
  },
  {
    id: 'hibiscus', name: 'Hibiscus (roselle)', botanical: 'Hibiscus sabdariffa', localNames: ['Zobo (Hausa)', 'Isapa (Yoruba)'], part: 'calyces',
    traditional: 'Its deep red calyces are dried and steeped for zobo, a popular chilled drink with ginger and pineapple.',
    game: 'Zobo refresher: a little fullness and energy.', growMinutes: 220, yield: 3, color: '#a3203a', habit: 'shrub',
  },
  {
    id: 'moringa', name: 'Moringa', botanical: 'Moringa oleifera', localNames: ['Zogale (Hausa)', 'Ewé igbálẹ (Yoruba)', 'Okwe oyibo (Igbo)'], part: 'leaves',
    traditional: 'A fast-growing tree whose leaves are cooked as a vegetable and dried into powder; valued in nutrition programmes for its leaves.',
    game: 'The nourishment bowl: fullness and a small heal.', growMinutes: 200, yield: 3, color: '#6fa34e', habit: 'tree',
  },
  {
    id: 'scent-leaf', name: 'Scent leaf (African basil)', botanical: 'Ocimum gratissimum', localNames: ['Efinrin (Yoruba)', 'Nchanwu (Igbo)', 'Daidoya (Hausa)'], part: 'leaves',
    traditional: 'The fragrant leaf of pepper soup and many stews; also called African or clove basil. Leaf infusions appear in folk practice for an unsettled stomach.',
    game: 'Pepper soup and the nourishment bowl.', growMinutes: 160, yield: 4, color: '#4a8a3e', habit: 'shrub',
  },
  {
    id: 'uziza', name: 'Uziza', botanical: 'Piper guineense', localNames: ['Uziza (Igbo)', 'Iyere (Yoruba, the seeds)'], part: 'leaves',
    traditional: 'A peppery climbing vine; its leaves and seeds season soups across southern Songhai\'s cooking traditions.',
    game: 'Gives pepper soup its heat.', growMinutes: 260, yield: 2, color: '#3b7a3a', habit: 'vine',
  },
  {
    id: 'utazi', name: 'Utazi', botanical: 'Gongronema latifolium', localNames: ['Utazi (Igbo)', 'Arokeke (Yoruba)'], part: 'leaves',
    traditional: 'A bitter-sweet leaf used sparingly in soups and with ugba; also part of folk practice.',
    game: 'Rounds out pepper soup.', growMinutes: 260, yield: 2, color: '#5a8c4a', habit: 'vine',
  },
  {
    id: 'pawpaw-leaf', name: 'Pawpaw leaf', botanical: 'Carica papaya', localNames: ['Ewé ìbẹ́pẹ (Yoruba)', 'Gwanda (Hausa)'], part: 'leaves',
    traditional: 'Pawpaw grows in almost every compound for its fruit; its leaves appear in folk preparations.',
    game: 'A research specimen for the identification studies.', growMinutes: 300, yield: 2, color: '#5f9a3c', habit: 'tree',
  },
];

export const plantById = (id: string) => PLANTS.find((p) => p.id === id);

/** One step in preparing a remedy. */
export type PrepStep = 'wash' | 'peel' | 'slice' | 'pound' | 'squeeze' | 'boil' | 'steep' | 'strain' | 'cool' | 'mix' | 'scoop' | 'serve';

export const STEP_LABEL: Record<PrepStep, string> = {
  wash: 'Wash the leaves in clean water', peel: 'Peel the rhizome', slice: 'Slice it thin', pound: 'Pound in the mortar',
  squeeze: 'Squeeze out the bitter juice', boil: 'Bring to the boil', steep: 'Leave to steep', strain: 'Strain through muslin',
  cool: 'Let it cool', mix: 'Stir it together', scoop: 'Scoop the gel from the leaf', serve: 'Bottle it and label it',
};

export interface RemedyEffect {
  heal?: number;
  energy?: number;
  fullness?: number;
  hygiene?: number;
  /** Game minutes of protection from harm after taking it. */
  protect?: number;
}

export interface Remedy {
  id: string;
  name: string;
  /** What it's for, in the game. */
  forWhat: string;
  ingredients: Readonly<Record<string, number>>;
  /** The steps, in their right order (the preparation game shuffles them). */
  steps: readonly PrepStep[];
  /** Price at the dispensary, in GHAI. */
  price: number;
  effect: RemedyEffect;
  /** Game minutes it takes to take it. */
  minutes: number;
  /** How many you can carry. */
  max: number;
  /** Rank needed to prepare it (lib/herbalCareer.ts). */
  prepareRank: number;
  /** Needs this research project done before it can be prepared or sold. */
  research?: string;
  /** A service at the centre (a bath, a steam), taken there and then, not carried. */
  service?: true;
}

export const REMEDIES: readonly Remedy[] = [
  { id: 'rem-ginger-lemongrass', name: 'Ginger and lemongrass tea', forWhat: 'A warming tea for a dusty Harmattan day.', ingredients: { ginger: 1, lemongrass: 2 }, steps: ['wash', 'peel', 'slice', 'boil', 'steep', 'strain', 'serve'], price: 30, effect: { energy: 12, heal: 6 }, minutes: 2, max: 6, prepareRank: 1 },
  { id: 'rem-bitter-tonic', name: 'Bitter-leaf tonic', forWhat: 'A slow, steady lift in health.', ingredients: { 'bitter-leaf': 3 }, steps: ['wash', 'squeeze', 'pound', 'boil', 'strain', 'cool', 'serve'], price: 45, effect: { heal: 15 }, minutes: 3, max: 5, prepareRank: 1 },
  { id: 'rem-zobo', name: 'Zobo refresher', forWhat: 'Chilled hibiscus with ginger: a pick-me-up.', ingredients: { hibiscus: 2, ginger: 1 }, steps: ['wash', 'boil', 'steep', 'strain', 'cool', 'serve'], price: 25, effect: { energy: 8, fullness: 5 }, minutes: 1, max: 8, prepareRank: 1 },
  { id: 'rem-moringa-bowl', name: 'Moringa nourishment bowl', forWhat: 'Leafy and filling.', ingredients: { moringa: 2, 'scent-leaf': 1 }, steps: ['wash', 'slice', 'boil', 'mix', 'serve'], price: 40, effect: { fullness: 20, heal: 5 }, minutes: 6, max: 4, prepareRank: 2 },
  { id: 'rem-aloe-gel', name: 'Aloe soothing gel', forWhat: 'For minor scrapes and kitchen mishaps in the game.', ingredients: { aloe: 1 }, steps: ['wash', 'slice', 'scoop', 'mix', 'serve'], price: 35, effect: { heal: 10 }, minutes: 1, max: 6, prepareRank: 2 },
  { id: 'rem-pepper-soup', name: 'Scent-leaf pepper soup', forWhat: 'Hot, peppery, restoring.', ingredients: { 'scent-leaf': 2, uziza: 1, utazi: 1, ginger: 1 }, steps: ['wash', 'slice', 'boil', 'mix', 'steep', 'serve'], price: 60, effect: { fullness: 25, heal: 10 }, minutes: 10, max: 3, prepareRank: 3 },
  { id: 'rem-turmeric-recovery', name: 'Turmeric and ginger recovery drink', forWhat: 'Developed through research: a stronger lift and a short guard.', ingredients: { turmeric: 2, ginger: 1, moringa: 1 }, steps: ['wash', 'peel', 'slice', 'pound', 'boil', 'strain', 'serve'], price: 90, effect: { heal: 20, protect: 20 }, minutes: 3, max: 3, prepareRank: 4, research: 'res-turmeric-recovery' },
  { id: 'rem-neem-bath', name: 'Neem cleansing bath', forWhat: 'A warm herbal bath in the treatment room.', ingredients: { neem: 2, lemongrass: 1 }, steps: ['wash', 'boil', 'steep', 'strain', 'serve'], price: 120, effect: { hygiene: 40, heal: 8, energy: 10 }, minutes: 30, max: 0, prepareRank: 3, service: true },
  { id: 'rem-lemongrass-steam', name: 'Lemongrass calming steam', forWhat: 'A quiet steam session to rest.', ingredients: { lemongrass: 2, neem: 1 }, steps: ['wash', 'slice', 'boil', 'serve'], price: 80, effect: { energy: 20, heal: 5 }, minutes: 20, max: 0, prepareRank: 2, service: true },
];

export const remedyById = (id: string) => REMEDIES.find((r) => r.id === id);
/** Remedies you can take away (not the centre's services). */
export const CARRIED_REMEDIES = REMEDIES.filter((r) => !r.service);
