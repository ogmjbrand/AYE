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
}

/** Clip ground speeds measured from the root travel of each motion capture. */
const FEMININE = { walkSpeed: 1.21, runSpeed: 2.76 };
const MASCULINE = { walkSpeed: 1.03, runSpeed: 2.8 };

const look = (id: string, body: BodyType): Look => ({
  id,
  body,
  url: `models/characters/rocketbox/${id}.glb`,
  height: body === 'feminine' ? 1.65 : 1.78,
  ...(body === 'feminine' ? FEMININE : MASCULINE),
});

export const LOOKS: readonly Look[] = [
  look('female-adult-08', 'feminine'),
  look('female-adult-03', 'feminine'),
  look('female-adult-06', 'feminine'),
  look('female-adult-11', 'feminine'),
  look('female-adult-10', 'feminine'),
  look('female-adult-04', 'feminine'),
  look('male-adult-12', 'masculine'),
  look('male-adult-18', 'masculine'),
  look('male-adult-04', 'masculine'),
  look('male-adult-15', 'masculine'),
  look('male-adult-10', 'masculine'),
  look('male-adult-01', 'masculine'),
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
