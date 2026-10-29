import { useGLTF } from '@react-three/drei';
import { assetUrl } from '../lib/assetManifest';

/** Photoreal pieces built by scripts/khronos/build-furniture.mjs (CC0 / CC-BY 4.0, see CREDITS.md). */
type FurnitureName = 'sofa-velvet-champagne' | 'sofa-velvet-blush' | 'chair-velvet-peacock' | 'chair-velvet-mango' | 'vase-flowers' | 'plant-potted';
/** Props built by scripts/sketchfab/build-props.mjs (CC-BY 4.0, see CREDITS.md). */
export type PropName = 'sub-sandwich' | 'bento-box' | 'vending-machine' | 'motorhome' | 'fridge-retro';
/** Real-size food scanned by ambientCG (CC0), built by scripts/ambientcg/build-food.mjs. */
export type FoodName = 'bread-loaf' | 'bread-rustic' | 'bread-roll' | 'bread-baguette' | 'cookie' | 'avocado' | 'kiwi' | 'pear' | 'pear-green'
  | 'pastry' | 'cake' | 'apple' | 'apple-red' | 'melon';
export type RealModelName = FurnitureName | PropName | FoodName;
const PROPS: ReadonlySet<string> = new Set<PropName>(['sub-sandwich', 'bento-box', 'vending-machine', 'motorhome', 'fridge-retro']);
const FOOD: ReadonlySet<string> = new Set<FoodName>(['bread-loaf', 'bread-rustic', 'bread-roll', 'bread-baguette', 'cookie', 'avocado', 'kiwi', 'pear', 'pear-green', 'pastry', 'cake', 'apple', 'apple-red', 'melon']);
export const modelPath = (name: RealModelName) => `models/${PROPS.has(name) ? 'props' : FOOD.has(name) ? 'food' : 'furniture'}/${name}.glb`;

/** Fetch and parse models ahead (the same cache RealModel reads), so a place that uses them is ready when you walk in. */
export function preloadRealModels(names: readonly RealModelName[]) {
  for (const n of names) useGLTF.preload(assetUrl(modelPath(n)), false, true);
}

/** What every home's kitchen and decor bring in: the fridge and the fruit bowl and bread board. */
export const HOME_MODELS: readonly RealModelName[] = ['fridge-retro', 'apple', 'apple-red', 'pear', 'kiwi', 'bread-loaf'];
