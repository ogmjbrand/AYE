// Builds one standalone, game-ready garment GLB from a CC5 FBX export: a single
// skinned mesh bound to the CC_Base rig, with no animation of its own. At runtime
// (src/components/Cc5Garment.tsx) its skeleton is discarded and its SkinnedMesh is
// rebound bone-for-bone (by name) onto the player's own avatar skeleton, so it
// deforms with whichever CC5 body wears it. See scripts/cc5/export_cc5_garment.py
// for the Blender half of this (duplicates convert_cc5.py's material rebuild --
// deliberately, to keep the proven player-body pipeline in build.mjs untouched).
//
//   node scripts/cc5/build-garment.mjs <name> <sourceDir> <fbxBaseName> <meshName> <rocketboxAnim>
//
// name: output file stem (public/assets/private/characters/cc5/garments/<name>.glb).
// sourceDir: folder holding <fbxBaseName>.fbx and .json (e.g. the CC5 export folder).
// meshName: the exact mesh/object name inside that FBX to extract.
// rocketboxAnim: the same Rocketbox look name build.mjs's CHARACTERS entry for this
// garment's body uses as `anim` (e.g. female-adult-08) -- needed so this garment's
// bind pose gets the same forward-facing correction as the body it's rebound onto.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, resample, textureCompress } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..', '..');
const [name, sourceDirArg, fbxBaseName, meshName, rocketboxAnim] = process.argv.slice(2);
if (!name || !sourceDirArg || !fbxBaseName || !meshName || !rocketboxAnim) {
  console.error('[cc5-garment] usage: node scripts/cc5/build-garment.mjs <name> <sourceDir> <fbxBaseName> <meshName> <rocketboxAnim>');
  process.exit(1);
}
const sourceDir = resolve(sourceDirArg);
const rawDir = join(root, 'assets-src/cc5');
const outDir = join(root, 'public/assets/private/characters/cc5/garments');
const animSource = join(root, `public/assets/models/characters/rocketbox/${rocketboxAnim}.glb`);
if (!existsSync(animSource)) { console.error(`\n[cc5-garment] ${animSource} not found`); process.exit(1); }

function findBlender() {
  const candidates = [process.env.BLENDER];
  const base = 'C:/Program Files/Blender Foundation';
  if (existsSync(base)) {
    for (const dir of readdirSync(base).sort().reverse()) candidates.push(join(base, dir, 'blender.exe'));
  }
  candidates.push('/Applications/Blender.app/Contents/MacOS/Blender', '/usr/bin/blender');
  return candidates.find((p) => p && existsSync(p));
}

const fail = (msg) => {
  console.error(`\n[cc5-garment] ${msg}`);
  process.exit(1);
};

const fbx = join(sourceDir, `${fbxBaseName}.fbx`);
const json = join(sourceDir, `${fbxBaseName}.json`);
if (!existsSync(fbx) || !existsSync(json)) fail(`${fbxBaseName}.fbx and .json not found in ${sourceDir}`);
const blender = findBlender();
if (!blender) fail('Blender was not found. Install Blender 4.2 or newer or set BLENDER to blender.exe.');
mkdirSync(rawDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const mb = (bytes) => Math.round((bytes / 1024 / 1024) * 10) / 10;

const raw = join(rawDir, `garment-${name}-raw.glb`);
const reportPath = join(rawDir, `garment-${name}-report.json`);
console.log(`[cc5-garment] ${name}: Blender conversion…`);
const r = spawnSync(blender, [
  '--background', '--factory-startup',
  '--python', join(root, 'scripts/cc5/export_cc5_garment.py'),
  '--', fbx, json, meshName, animSource, raw, reportPath,
], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
writeFileSync(join(rawDir, `blender-garment-${name}.log`), `${r.stdout}\n${r.stderr}`);
if (r.status !== 0 || !existsSync(reportPath) || /Traceback/.test(r.stdout + r.stderr)) {
  fail(`Blender conversion failed; see assets-src/cc5/blender-garment-${name}.log`);
}
const report = JSON.parse(readFileSync(reportPath, 'utf8'));

console.log(`[cc5-garment] ${name}: optimising…`);
const doc = await io.read(raw);
await doc.transform(dedup(), prune(), resample());
// One garment, one material family: a flat budget is enough (no skin/eye/hair rules to juggle)
const SIZE = { diffuse: 1024, normal: 1024, ao: 512, other: 512 };
for (const tex of doc.getRoot().listTextures()) {
  const n = tex.getName();
  const size = /diffuse/i.test(n) ? SIZE.diffuse : /normal/i.test(n) ? SIZE.normal : /\bao\b/i.test(n) ? SIZE.ao : SIZE.other;
  const exact = new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
  await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 85, resize: [size, size], pattern: exact }));
}
await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));

let gpuBytes = 0;
const textureList = [];
for (const tex of doc.getRoot().listTextures()) {
  const [w, h] = tex.getSize() ?? [0, 0];
  gpuBytes += (w * h * 4 * 4) / 3;
  textureList.push(`${tex.getName()} ${w}x${h}`);
}
const out = join(outDir, `${name}.glb`);
await io.write(out, doc);
const meta = {
  source: { fbx: `${fbxBaseName}.fbx`, json: `${fbxBaseName}.json`, mesh: meshName },
  builtAt: new Date().toISOString(),
  fileMB: mb(statSync(out).size),
  rawMB: mb(statSync(raw).size),
  vertices: report.vertices,
  vertexGroups: report.vertex_groups,
  materialsRebuilt: report.materials_rebuilt,
  textures: textureList,
  gpuMB: Math.round((gpuBytes / 1024 / 1024) * 10) / 10,
  warnings: report.warnings,
};
writeFileSync(join(outDir, `${name}.json`), JSON.stringify(meta, null, 2));
console.log(`[cc5-garment] ${name}: ${meta.fileMB} MB, ${report.vertices} vertices, ${textureList.length} textures ≈ ${meta.gpuMB} MB GPU`);
if (report.warnings.length) console.warn(`[cc5-garment] warnings:`, report.warnings);
console.log(`[cc5-garment] wrote ${out}`);
