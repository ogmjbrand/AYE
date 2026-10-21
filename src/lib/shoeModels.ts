/**
 * Shoe model definitions and properties.
 * Maps fashion items to their 3D geometry and styling.
 * Eventually these will reference real GLB/GLTF models; for now using procedural generation.
 */

import type { GarmentModel } from './fashion';

export interface ShoeDefinition extends GarmentModel {
  /** Shoe type: sneaker, heel, flat, boot, sandal */
  type: 'sneaker' | 'heel' | 'flat' | 'boot' | 'sandal' | 'slipper';
  /** Color palette for the shoe (hex colors) */
  baseColor: string;
  accentColor?: string;
  /** Sole/bottom color */
  soleColor?: string;
}

/**
 * Shoe model catalogue.
 * Each entry maps a fashion item ID to its model configuration.
 */
export const SHOE_MODELS: Record<string, ShoeDefinition> = {
  // These IDs match the ones in fashion.ts FASHION_ITEMS array
  'shoes-clean-white': {
    type: 'sneaker',
    baseColor: '#efefea',
    accentColor: '#d0d0c8',
    soleColor: '#cccccc',
    path: 'shoes/sneaker-white.glb',
    scale: 1.0,
    thumbnail: 'shoes/sneaker-white-thumb.jpg',
    attachBones: ['Shoe.L', 'Shoe.R', 'Foot.L', 'Foot.R'],
  },
  'shoes-leather-black': {
    type: 'flat',
    baseColor: '#1b1b1d',
    soleColor: '#3a3a3c',
    path: 'shoes/flat-black.glb',
    scale: 1.0,
    thumbnail: 'shoes/flat-black-thumb.jpg',
    attachBones: ['Shoe.L', 'Shoe.R', 'Foot.L', 'Foot.R'],
  },
  'shoes-leather-tan': {
    type: 'flat',
    baseColor: '#94623a',
    accentColor: '#7a5030',
    soleColor: '#5c4a35',
    path: 'shoes/flat-tan.glb',
    scale: 1.0,
    thumbnail: 'shoes/flat-tan-thumb.jpg',
    attachBones: ['Shoe.L', 'Shoe.R', 'Foot.L', 'Foot.R'],
  },
  'shoes-suede-burgundy': {
    type: 'flat',
    baseColor: '#5c1f2b',
    soleColor: '#3a1520',
    path: 'shoes/flat-burgundy.glb',
    scale: 1.0,
    thumbnail: 'shoes/flat-burgundy-thumb.jpg',
    attachBones: ['Shoe.L', 'Shoe.R', 'Foot.L', 'Foot.R'],
  },
  'shoes-metallic-gold': {
    type: 'heel',
    baseColor: '#c7a24f',
    accentColor: '#e0c570',
    soleColor: '#8a7a4a',
    path: 'shoes/heel-gold.glb',
    scale: 0.95,
    thumbnail: 'shoes/heel-gold-thumb.jpg',
    attachBones: ['Shoe.L', 'Shoe.R', 'Foot.L', 'Foot.R'],
  },
};

/** Get shoe model config for a fashion item ID, or null if not found. */
export function getShoeModel(itemId: string): ShoeDefinition | null {
  return SHOE_MODELS[itemId] || null;
}

/** All shoe model paths that need to exist in public/assets/. */
export const REQUIRED_SHOE_MODELS = Object.values(SHOE_MODELS).map((shoe) => shoe.path);
