/**
 * Copies the ambientCG assets the game uses (CC0, ambientcg.com; credits in
 * public/assets/CREDITS.md) from assets-src/ambientcg/ (git-ignored, the
 * unzipped downloads) into public/assets/, made web-sized:
 *
 *   node scripts/ambientcg/build.mjs
 *
 * Surfaces: colour, OpenGL normal, roughness and AO maps as WebP.
 * HDRIs: the 1K .exr files, unchanged (lighting and reflections only).
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import sharp from 'sharp';

const SRC = 'assets-src/ambientcg';
const OUT = 'public/assets';

const SURFACES = {
  road: 'Road007_1K-JPG',
  ground: 'Grass001_1K-JPG',
  bricks: 'Bricks104_1K-JPG',
  'wood-floor': 'WoodFloor051_1K-JPG',
  onyx: 'Onyx006_1K-JPG',
  bamboo: 'Bamboo001C_1K-JPG',
  fabric: 'Fabric080_1K-JPG',
  metal: 'Metal049A_1K-JPG',
};
const MAPS = { color: 'Color', normal: 'NormalGL', roughness: 'Roughness', ao: 'AmbientOcclusion' };

for (const [name, dir] of Object.entries(SURFACES)) {
  mkdirSync(`${OUT}/textures/${name}`, { recursive: true });
  for (const [key, suffix] of Object.entries(MAPS)) {
    const src = `${SRC}/${dir}/${dir}_${suffix}.jpg`;
    if (!existsSync(src)) continue;
    const out = `${OUT}/textures/${name}/${key}.webp`;
    await sharp(src).resize(1024, 1024, { fit: 'inside' }).webp({ quality: key === 'color' ? 82 : 88 }).toFile(out);
    console.log(out, `${statSync(out).size >> 10} KB`);
  }
}

const HDRIS = {
  'city-day': 'DayEnvironmentHDRI052_1K',
  'town-dusk': 'EveningEnvironmentHDRI002_1K',
  'street-night': 'NightEnvironmentHDRI010_1K',
  'lounge-indoor': 'IndoorEnvironmentHDRI013_1K',
};
mkdirSync(`${OUT}/hdri`, { recursive: true });
for (const [name, dir] of Object.entries(HDRIS)) {
  const out = `${OUT}/hdri/${name}_1k.exr`;
  copyFileSync(`${SRC}/${dir}/${dir}_HDR.exr`, out);
  console.log(out, `${statSync(out).size >> 10} KB`);
}
