/**
 * Every human body the game can draw, with what it is made of, where it came
 * from, what it can do and what can be changed on it.
 *
 * The measured facts (triangles, textures, bones, clips, which gesture files
 * fit its skeleton) come from the files themselves, written by
 * `npm run check:characters -- --write`; they are never typed in by hand.
 *
 * - The 20 Microsoft Rocketbox people (MIT licence) are in the repository.
 * - The Character Creator 5 character is private (your own export, built by
 *   scripts/cc5/build.mjs): it is listed, and is the player's body only on a
 *   machine that has built it. Elsewhere its status is 'not-built'.
 */
import { LOOKS, type Look } from './looks';
import measured from './characterAssets.json';

export type CharacterSource = 'rocketbox' | 'cc5';
export type CharacterStatus = 'available' | 'not-built' | 'missing';

export interface CharacterLicence {
  name: string;
  holder: string;
  /** Where the licence text is, inside public/assets. */
  file?: string;
  source: string;
  /** Can the model files be published with the game? */
  redistributable: boolean;
}

/** What a player or the resident generator can genuinely change on this body. */
export interface Customisation {
  /** Skin tints over the photographed skin. */
  skinTone: boolean;
  /** Hair (or headwear) colour; the hairstyle itself is part of the model. */
  hairColour: boolean;
  /** Separate 3D hairstyles that can be worn instead. */
  hairstyles: boolean;
  /** Fabrics and colours on the modelled clothes (through garment maps, or by material on CC5). */
  clothing: 'fabrics' | 'colours';
  /** Bone-based body shaping (slimmer/fuller per part), within natural limits. */
  bodyShape: boolean;
  height: boolean;
  /** Separate face shaping (nose, jaw, eyes): needs morph targets none of these models have. */
  faceShape: false;
}

export interface CharacterEntry {
  id: string;
  displayName: string;
  source: CharacterSource;
  body: Look['body'];
  /** Inside public/assets. */
  file: string;
  /** Skeleton family: clips are shared only within one. */
  rig: 'rocketbox-biped' | 'cc5-cc-base';
  /** Clips in the model's own file. */
  clips: readonly string[];
  /** Shared gesture files whose clips drive only bones this skeleton has (talk, listen, wave, sit). */
  gestureFiles: readonly string[];
  hair: string;
  facialHair?: string;
  outfit: string;
  triangles?: number;
  materials?: number;
  textures?: number;
  maxTexture?: number;
  mb?: number;
  /** One detail level per model today; phones get textures scaled to 1024 px when uploaded. */
  lods: readonly string[];
  licence: CharacterLicence;
  customisation: Customisation;
  status: CharacterStatus;
}

interface Measured { file: string; mb: number; triangles: number; materials: number; textures: number; maxTexture: number; bones: number; clips: string[]; gestureFiles: string[] }
const MEASURED = measured as Record<string, Measured>;

const ROCKETBOX_LICENCE: CharacterLicence = {
  name: 'MIT',
  holder: 'Microsoft',
  file: 'models/characters/ROCKETBOX-LICENSE.md',
  source: 'https://github.com/microsoft/Microsoft-Rocketbox',
  redistributable: true,
};

/** A readable name from the library's file name: "female-adult-08" → "Woman 08", "pilot-male-01" → "Pilot (man) 01". */
export function displayNameFor(id: string): string {
  const m = /^(?:(business|construction|medical|pilot|police)-)?(female|male)(?:-adult)?-(\d+)$/.exec(id);
  if (!m) return id;
  const [, job, sex, n] = m;
  const person = sex === 'female' ? 'woman' : 'man';
  const role: Record<string, string> = { business: 'Businessperson', construction: 'Construction worker', medical: 'Medic', pilot: 'Pilot', police: 'Police officer' };
  return job ? `${role[job]} (${person}) ${n}` : `${person[0].toUpperCase()}${person.slice(1)} ${n}`;
}

function rocketboxEntry(look: Look): CharacterEntry {
  const m = MEASURED[look.id];
  return {
    id: look.id,
    displayName: displayNameFor(look.id),
    source: 'rocketbox',
    body: look.body,
    file: look.url,
    rig: 'rocketbox-biped',
    clips: m?.clips ?? [],
    gestureFiles: m?.gestureFiles ?? [],
    hair: look.hair,
    facialHair: look.facialHair,
    outfit: look.outfit,
    triangles: m?.triangles,
    materials: m?.materials,
    textures: m?.textures,
    maxTexture: m?.maxTexture,
    mb: m?.mb,
    lods: ['full'],
    licence: ROCKETBOX_LICENCE,
    customisation: { skinTone: true, hairColour: true, hairstyles: look.body === 'feminine', clothing: 'fabrics', bodyShape: true, height: true, faceShape: false },
    status: m ? 'available' : 'missing',
  };
}

/** The Character Creator 5 player body (scripts/cc5/build.mjs, HUMAN.fbx: Classic_Slick_Back, Stubble). */
export const CC5_CHARACTER: CharacterEntry = {
  id: 'cc5-aaron',
  displayName: 'Your Character Creator 5 character',
  source: 'cc5',
  body: 'masculine',
  file: 'private/characters/cc5/aaron.glb',
  rig: 'cc5-cc-base',
  // Converted with the character by scripts/cc5 (its own clips, retargeted to its skeleton); the hug is built at run time
  clips: ['Idle', 'Walk', 'Run', 'Talk', 'Listen', 'Wave', 'Sit'],
  gestureFiles: [],
  hair: 'Slicked back',
  facialHair: 'Stubble',
  outfit: 'Shirt, slim trousers and sneakers',
  lods: ['full', 'lite'],
  licence: {
    name: 'Reallusion Character Creator 5 export',
    holder: 'The project owner (made in Character Creator 5)',
    source: 'Exported from Character Creator 5 on the project owner\'s PC',
    // Kept private: never committed or published with the site
    redistributable: false,
  },
  customisation: { skinTone: true, hairColour: true, hairstyles: false, clothing: 'colours', bodyShape: false, height: true, faceShape: false },
  status: 'not-built',
};

export const ROCKETBOX_CHARACTERS: readonly CharacterEntry[] = LOOKS.map(rocketboxEntry);

/**
 * Every body, with the CC5 character marked available when this machine has
 * built it (pass assetManifest().avatar?.url).
 */
export function characterRegistry(playerBodyUrl: string | null = null): readonly CharacterEntry[] {
  const cc5: CharacterEntry = { ...CC5_CHARACTER, status: playerBodyUrl === CC5_CHARACTER.file ? 'available' : 'not-built' };
  return [...ROCKETBOX_CHARACTERS, cc5];
}

export const characterById = (id: string, playerBodyUrl: string | null = null) => characterRegistry(playerBodyUrl).find((c) => c.id === id);
