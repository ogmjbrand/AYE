/**
 * Kinds of people for the resident population, as data: which base models
 * can play them, what they wear, and whether a real uniform exists for them.
 *
 * A uniform here means a model whose own clothes are that uniform (the
 * Rocketbox medics, police officer, pilots, construction worker and business
 * people). Where none exists, the archetype uses everyday people dressed from
 * the matching outfit pool, and says so: no firefighter, soldier, chef or
 * athlete kit is modelled yet.
 */
import { LOOKS } from './looks';
import { appearanceCount, generateNpcAppearance, type NpcAppearance } from './npcFashion';

export interface Archetype {
  id: string;
  label: string;
  /** The role text the outfit generator reads (lib/npcFashion.ts). */
  role: string;
  /** Base models that can play this archetype. */
  looks: readonly string[];
  /** A modelled uniform is part of those models (otherwise everyday clothes). */
  uniform: boolean;
  /** What's missing for a faithful version, if anything. */
  needs?: string;
}

const ADULTS = LOOKS.filter((l) => /^(fe)?male-adult-/.test(l.id)).map((l) => l.id);
const BUSINESS = ['business-female-02', 'business-male-05'];
const of = (...ids: string[]) => ids;

export const ARCHETYPES: readonly Archetype[] = [
  { id: 'resident', label: 'Everyday resident', role: 'City resident', looks: ADULTS, uniform: false },
  { id: 'student', label: 'Student', role: 'University student', looks: ADULTS, uniform: false },
  { id: 'teacher', label: 'Teacher', role: 'Teacher', looks: [...ADULTS, ...BUSINESS], uniform: false },
  { id: 'entrepreneur', label: 'Entrepreneur', role: 'Business owner, executive', looks: BUSINESS, uniform: true },
  { id: 'office', label: 'Office worker', role: 'Office manager', looks: BUSINESS, uniform: true },
  { id: 'doctor', label: 'Doctor', role: 'Doctor at General Hospital', looks: of('medical-female-02', 'medical-male-02'), uniform: true },
  { id: 'nurse', label: 'Nurse', role: 'Nurse at General Hospital', looks: of('medical-female-02', 'medical-male-02'), uniform: true },
  { id: 'police', label: 'Police officer', role: 'Police officer', looks: of('police-male-01'), uniform: true, needs: 'a policewoman model' },
  { id: 'military', label: 'Military', role: 'Soldier', looks: ADULTS, uniform: false, needs: 'military uniform models' },
  { id: 'firefighter', label: 'Firefighter', role: 'Firefighter, emergency worker', looks: ADULTS, uniform: false, needs: 'firefighter turnout gear models' },
  { id: 'construction', label: 'Construction worker', role: 'Construction worker', looks: of('construction-male-03'), uniform: true, needs: 'a woman in workwear' },
  { id: 'engineer', label: 'Engineer', role: 'Engineer', looks: [...BUSINESS, 'construction-male-03'], uniform: true },
  { id: 'pilot', label: 'Pilot', role: 'Airline pilot', looks: of('pilot-female-01', 'pilot-male-01'), uniform: true },
  { id: 'driver', label: 'Driver', role: 'Bus driver', looks: ADULTS, uniform: false },
  { id: 'chef', label: 'Chef', role: 'Chef', looks: ADULTS, uniform: false, needs: 'chef whites models' },
  { id: 'retail', label: 'Retail worker', role: 'Shop worker', looks: ADULTS, uniform: false },
  { id: 'fashion', label: 'Fashion model', role: 'Fashion designer', looks: ADULTS, uniform: false },
  { id: 'musician', label: 'Musician', role: 'Musician', looks: ADULTS, uniform: false },
  { id: 'creator', label: 'Content creator', role: 'Content creator', looks: ADULTS, uniform: false },
  { id: 'athlete', label: 'Athlete', role: 'Footballer, athlete', looks: ADULTS, uniform: false, needs: 'sportswear models' },
  { id: 'security', label: 'Security', role: 'Security guard', looks: of('police-male-01', ...ADULTS.filter((id) => id.startsWith('male'))), uniform: false, needs: 'a security uniform' },
  { id: 'tourist', label: 'Tourist', role: 'Tourist', looks: ADULTS, uniform: false },
  { id: 'luxury', label: 'Luxury lifestyle', role: 'Wealthy celebrity', looks: [...BUSINESS, ...ADULTS], uniform: false },
];

export const archetypeById = (id: string) => ARCHETYPES.find((a) => a.id === id);

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export interface Person {
  identity: string;
  archetype: Archetype;
  lookId: string;
  appearance: NpcAppearance;
}

/** The same identity always gives the same person: base model, clothes, skin, shape and hair. */
export function personFor(identity: string, archetypeId: string): Person {
  const archetype = archetypeById(archetypeId);
  if (!archetype) throw new Error(`Unknown archetype: ${archetypeId}`);
  if (!archetype.looks.length) throw new Error(`Archetype ${archetypeId} has no base models`);
  const lookId = archetype.looks[hash(`${identity}|look`) % archetype.looks.length];
  const look = LOOKS.find((l) => l.id === lookId);
  if (!look) throw new Error(`Archetype ${archetypeId} names a missing base model: ${lookId}`);
  return { identity, archetype, lookId, appearance: generateNpcAppearance(identity, archetype.role, look.body === 'feminine') };
}

/**
 * How many different appearances an archetype can produce: for each base
 * model it may use, the generator's combinations for that body. Variety of
 * dress and colour, not new faces: the faces are the base models'.
 */
export function archetypeVariety(archetypeId: string): { baseModels: number; appearances: number } {
  const a = archetypeById(archetypeId);
  if (!a) throw new Error(`Unknown archetype: ${archetypeId}`);
  const appearances = a.looks.reduce((sum, id) => sum + appearanceCount(a.role, LOOKS.find((l) => l.id === id)?.body === 'feminine').total, 0);
  return { baseModels: a.looks.length, appearances };
}
