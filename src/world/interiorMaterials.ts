import {
  LinearSRGBColorSpace,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from 'three';
import { assetUrl } from '../lib/assetManifest';
import type { Interior } from '../lib/interiors';

type TileSet = 'tiles074' | 'tiles075' | 'tiles076' | 'tiles078';

const TILE_SET: Record<TileSet, string> = {
  tiles074: 'Tiles074_1K-JPG',
  tiles075: 'Tiles075_1K-JPG',
  tiles076: 'Tiles076_1K-JPG',
  tiles078: 'Tiles078_1K-JPG',
};

const loader = new TextureLoader();
const sourceTextures = new Map<string, Texture>();
const floorMaterials = new Map<string, MeshStandardMaterial>();
const tileMeters = 2.5;

function texture(path: string, color: boolean): Texture {
  const cached = sourceTextures.get(path);
  if (cached) return cached;
  const loaded = loader.load(assetUrl(path));
  loaded.colorSpace = color ? SRGBColorSpace : LinearSRGBColorSpace;
  loaded.wrapS = loaded.wrapT = RepeatWrapping;
  loaded.anisotropy = 8;
  sourceTextures.set(path, loaded);
  return loaded;
}

function floorTile(interior: Interior): TileSet {
  if (interior.architecture === 'boutique') return 'tiles074';
  if (interior.architecture === 'dealership') return 'tiles076';
  if (interior.tier === 'penthouse') return 'tiles076';
  if (interior.architecture === 'office') return 'tiles075';
  return 'tiles078';
}

export function interiorFloorMaterial(interior: Interior): MeshStandardMaterial {
  const set = floorTile(interior);
  const key = `${set}:${interior.width}x${interior.depth}`;
  const cached = floorMaterials.get(key);
  if (cached) return cached;

  const base = TILE_SET[set];
  const repeat = (map: Texture) => {
    const copy = map.clone();
    copy.repeat.set(interior.width / tileMeters, interior.depth / tileMeters);
    copy.needsUpdate = true;
    return copy;
  };
  const material = new MeshStandardMaterial({
    map: repeat(texture(`environment/${set}/${base}_Color.jpg`, true)),
    normalMap: repeat(texture(`environment/${set}/${base}_NormalGL.jpg`, false)),
    roughnessMap: repeat(texture(`environment/${set}/${base}_Roughness.jpg`, false)),
    roughness: interior.architecture === 'boutique' || interior.architecture === 'office' || interior.architecture === 'dealership' ? 0.52 : 0.78,
    metalness: 0,
  });
  material.normalScale.setScalar(0.45);
  floorMaterials.set(key, material);
  return material;
}
