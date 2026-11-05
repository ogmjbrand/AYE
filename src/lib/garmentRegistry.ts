/**
 * The registry of garments made by the offline pattern pipeline
 * (docs/GARMENT_PIPELINE.md): a sewing pattern drafted from a reference photo
 * in GarmentCode, sewn and draped on each Rocketbox body in Blender, weighted
 * to its Bip01 skeleton and exported as a skinned GLB per body.
 *
 * Each body gets its own file because people differ in build: a garment draped
 * on one is rebound to another's skeleton only if theirs is listed here. The
 * test (garmentRegistry.test.ts) checks every file exists and every listed look
 * is a real person.
 *
 * No brand marks, logos or watermarks from a reference photo are carried into
 * a garment: only its cut and colour are, under our own label (OGM Atelier).
 */
import type { BodyType } from './looks';

export type SewnCategory = 'dress' | 'top' | 'bottom';
export type SewnStatus = 'in-game' | 'in-review' | 'planned';

export interface SewnGarment {
  id: string;
  name: string;
  category: SewnCategory;
  /** Finer kind within the category (pencil, A-line, wrapper…). */
  subcategory: string;
  /** Where the cut came from: a description of the reference photo (the photo itself isn't shipped). */
  source: string;
  /** The GarmentCode design: the template and the measurements that were changed from its defaults. */
  pattern: { template: string; params: Readonly<Record<string, string | number | boolean>> };
  /** Per-look skinned GLB, under public/assets/. */
  files: Readonly<Partial<Record<string, string>>>;
  body: BodyType;
  rig: 'rocketbox-bip01';
  /** Base colour (hex); no texture maps yet. */
  color: string;
  material: { kind: 'cloth'; roughness: number };
  /** Vertices in one body's file, after the pipeline. */
  vertices: number;
  /** What it replaces when worn: a dress covers the top and the bottom. */
  layers: readonly ('top' | 'bottom')[];
  /** Tools and data the garment was made with, and their licences. */
  licence: string;
  status: SewnStatus;
  /** What's known to be missing against the reference, said plainly. */
  limits: readonly string[];
}

const dir = 'models/garments/sewn';

export const SEWN_GARMENTS: readonly SewnGarment[] = [
  {
    id: 'pencil-dress-tangerine',
    name: 'OGM Atelier sewn pencil dress · Tangerine',
    category: 'dress',
    subcategory: 'pencil, midi, short sleeves',
    source: 'Supplied reference photo: a tangerine short-sleeved pencil dress, mid-calf, fitted at the waist (its watermark and the bag were not used)',
    pattern: {
      template: 'GarmentCode FittedShirt + PencilSkirt, body mean_female',
      params: { sleeveLength: 0.18, skirtLength: 0.62, collarDepth: 0.3, sleeveless: false, meshResolution: 2.5 },
    },
    files: { 'female-adult-08': `${dir}/pencil-dress-tangerine/female-adult-08.glb` },
    body: 'feminine',
    rig: 'rocketbox-bip01',
    color: '#e8701e',
    material: { kind: 'cloth', roughness: 0.82 },
    vertices: 2247,
    layers: ['top', 'bottom'],
    licence: 'Pattern from GarmentCode (MIT); draped with our own solver in Blender (GPL tool, output unencumbered); body and skeleton Microsoft Rocketbox (MIT). Ours to ship.',
    status: 'in-game',
    limits: [
      'The cape with pearl trim and the flap pockets in the photo are not made: GarmentCode has no cape or pocket pieces yet',
      'Plain colour, no fabric texture',
      'Fitted to one body so far (female-adult-08); other people cannot wear it until it is draped on them',
      'Skinned, not simulated: the skirt follows the legs rather than swinging',
    ],
  },
];

export const sewnById = (id: string | undefined) => SEWN_GARMENTS.find((g) => g.id === id);

/** The file for this person, or undefined if the garment hasn't been draped on them. */
export const sewnFileFor = (g: SewnGarment, lookId: string | undefined) => (lookId ? g.files[lookId] : undefined);
