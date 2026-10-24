/**
 * The 3D people a player can be. Each look is a different real person from
 * the Microsoft Rocketbox library (MIT), with motion-captured idle, walk and
 * run clips for that body (see public/assets/CREDITS.md). Only the chosen
 * look is downloaded.
 */
import type { AvatarFile } from './assetManifest';

export type BodyType = 'feminine' | 'masculine';

export interface Look extends AvatarFile {
  id: string;
  body: BodyType;
  /** The hairstyle (or headwear) this person has. Hair is part of each person's model, so style comes with the person; colour can change. */
  hair: string;
  /** True when the head is covered (hijab, hood, cap): hair colour then changes the headwear. */
  covered?: boolean;
  facialHair?: string;
  /** What they're wearing: the garment cuts that fabrics restyle. */
  outfit: string;
}

/** Clip ground speeds measured from the root travel of each motion capture. */
const FEMININE = { walkSpeed: 1.21, runSpeed: 2.76 };
const MASCULINE = { walkSpeed: 1.03, runSpeed: 2.8 };

const look = (id: string, body: BodyType, hair: string, outfit: string, extra: Partial<Pick<Look, 'covered' | 'facialHair'>> = {}): Look => ({
  id,
  body,
  hair,
  outfit,
  ...extra,
  url: `models/characters/rocketbox/${id}.glb`,
  height: body === 'feminine' ? 1.65 : 1.78,
  ...(body === 'feminine' ? FEMININE : MASCULINE),
});

export const LOOKS: readonly Look[] = [
  look('female-adult-08', 'feminine', 'Shoulder-length, straight', 'T-shirt and jeans'),
  look('female-adult-03', 'feminine', 'Short bob with fringe', 'Camisole and trousers'),
  look('female-adult-06', 'feminine', 'Hijab', 'Long tunic and trousers', { covered: true }),
  look('female-adult-11', 'feminine', 'Pulled back in a bun', 'Fitted top and trousers'),
  look('female-adult-10', 'feminine', 'Long khimar', 'Abaya', { covered: true }),
  look('female-adult-04', 'feminine', 'Short pixie cut', 'Leather jacket and jeans'),
  look('male-adult-12', 'masculine', 'Close crop', 'Denim jacket, tee and jeans'),
  look('male-adult-18', 'masculine', 'Short, under a hood', 'Hoodie and joggers', { covered: true }),
  look('male-adult-04', 'masculine', 'Natural curls', 'Jacket over a tee', { facialHair: 'Stubble' }),
  look('male-adult-15', 'masculine', 'Kufi cap', 'Kaftan', { covered: true, facialHair: 'Full beard' }),
  look('male-adult-10', 'masculine', 'Short, straight', 'Track jacket'),
  look('male-adult-01', 'masculine', 'Short, swept back', 'Striped polo'),
];

export const DEFAULT_LOOK_ID = 'male-adult-12';

export const lookById = (id: string | undefined): Look =>
  LOOKS.find((l) => l.id === id) ?? LOOKS.find((l) => l.id === DEFAULT_LOOK_ID)!;

export const looksFor = (body: BodyType) => LOOKS.filter((l) => l.body === body);

/** Height range the player can pick, in centimetres. */
export const HEIGHT_RANGE = { min: 150, max: 200 } as const;
export const defaultHeightCm = (body: BodyType) => (body === 'feminine' ? 165 : 177);

/** The body a gender starts with; non-binary and unspecified players choose. */
export const bodyForGender = (gender: string): BodyType | null =>
  gender === 'woman' ? 'feminine' : gender === 'man' ? 'masculine' : null;
