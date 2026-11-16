// Adds one native CC5 motion clip (e.g. Ariana's own CATWALK or IDLE project export)
// onto an already-built player body GLB, as one more playable animation alongside its
// existing Idle/Walk/Run/Talk/Listen/Wave/Sit. The body's mesh, materials, skin and
// every clip it already had are kept exactly as they are; this only adds one NLA track.
// See scripts/cc5/export_cc5_motion.py for the Blender half (duplicates build.mjs's
// material/texture finishing touches deliberately, to keep the proven main pipeline
// untouched -- same reasoning as build-garment.mjs).
//
//   node scripts/cc5/build-motion.mjs <targetGlbPath> <motionFbxPath> <clipName> [outGlbPath]
//
// targetGlbPath: the already-built body to extend (e.g. public/assets/private/
// characters/cc5/woman.glb).
// motionFbxPath: the native CC5 motion export (has its own mesh/skeleton/animation;
// only the skeleton and animation are used).
// clipName: the name the new clip gets (e.g. "Catwalk").
// outGlbPath: defaults to targetGlbPath (overwrite in place, same convention as
// build.mjs/build-garment.mjs); pass a different path for a dry run.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, resample, textureCompress } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..', '..');
const [targetGlbArg, motionFbxArg, clipName, outGlbArg] = process.argv.slice(2);
if (!targetGlbArg || !motionFbxArg || !clipName) {
  console.error('[cc5-motion] usage: node scripts/cc5/build-motion.mjs <targetGlbPath> <motionFbxPath> <clipName> [outGlbPath]');
  process.exit(1);
}
const targetGlb = resolve(targetGlbArg);
const motionFbx = resolve(motionFbxArg);
const outGlb = resolve(outGlbArg ?? targetGlbArg);
if (!existsSync(targetGlb)) { console.error(`\n[cc5-motion] ${targetGlb} not found`); process.exit(1); }
if (!existsSync(motionFbx)) { console.error(`\n[cc5-motion] ${motionFbx} not found`); process.exit(1); }

// Same regex rules as build.mjs's 'main' profile, duplicated on purpose (see header) --
// the already-built body's textures are already at these sizes, so re-applying them is
// an idempotent safety net against anything Blender's import/export roundtrip changes.
const TEXTURE_RULES = [
  [/^Std_Skin_Head(_Pbr)?_Diffuse/, 2048],
  [/^Std_Skin_(Body|Leg)(_Pbr)?_Diffuse/, 512],
  [/^Std_Skin_(Body|Leg)|Teeth|Tongue|Std_Nails/, 256],
  [/Std_Eye_|Std_Cornea|Eyelash|Lash_|Brows|Beard|Hair_Clap/, 512],
  [/^Std_Skin_Head(_Pbr)?_Normal|^Std_Skin_Arm(_Pbr)?_Diffuse|^Hair_Transparency_Diffuse/, 1024],
  [/_(Diffuse|Diffuse-.*)$/, 1024],
  [/./, 512],
];
const ALPHA_CUTOFF = [
  [/^(Hair\d*_|Scalp_)/, 0.35],
  [/^Beard_/, 0.3],
  [/Eyelash|^Lash_|^Brows_/, 0.2],
  [/^Character$/, 0.4],
];
const SINGLE_SIDED = /^Std_(Skin_|Nails|Eye_|Upper_Teeth|Lower_Teeth|Tongue)/;

function findBlender() {
  const candidates = [process.env.BLENDER];
  const base = 'C:/Program Files/Blender Foundation';
  if (existsSync(base)) {
    for (const dir of readdirSync(base).sort().reverse()) candidates.push(join(base, dir, 'blender.exe'));
  }
  candidates.push('/Applications/Blender.app/Contents/MacOS/Blender', '/usr/bin/blender');
  return candidates.find((p) => p && existsSync(p));
}

const fail = (msg) => { console.error(`\n[cc5-motion] ${msg}`); process.exit(1); };
const blender = findBlender();
if (!blender) fail('Blender was not found. Install Blender 4.2 or newer or set BLENDER to blender.exe.');

const rawDir = join(root, 'assets-src/cc5');
mkdirSync(rawDir, { recursive: true });
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const mb = (bytes) => Math.round((bytes / 1024 / 1024) * 10) / 10;

const stem = `${basename(targetGlb, '.glb')}-${clipName.toLowerCase()}`;
const raw = join(rawDir, `${stem}-raw.glb`);
const reportPath = join(rawDir, `${stem}-report.json`);
console.log(`[cc5-motion] ${clipName}: Blender bake onto ${basename(targetGlb)}…`);
const r = spawnSync(blender, [
  '--background', '--factory-startup',
  '--python', join(root, 'scripts/cc5/export_cc5_motion.py'),
  '--', targetGlb, motionFbx, clipName, raw, reportPath,
], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
writeFileSync(join(rawDir, `blender-${stem}.log`), `${r.stdout}\n${r.stderr}`);
if (r.status !== 0 || !existsSync(reportPath) || /Traceback/.test(r.stdout + r.stderr)) {
  fail(`Blender bake failed; see assets-src/cc5/blender-${stem}.log`);
}
const report = JSON.parse(readFileSync(reportPath, 'utf8'));

console.log(`[cc5-motion] ${clipName}: optimising…`);
const doc = await io.read(raw);
for (const mat of doc.getRoot().listMaterials()) {
  const name = mat.getName();
  const cutoff = ALPHA_CUTOFF.find(([re]) => re.test(name))?.[1];
  if (cutoff !== undefined) mat.setAlphaMode('MASK').setAlphaCutoff(cutoff);
  if (SINGLE_SIDED.test(name)) mat.setDoubleSided(false);
  if (/^Std_Eye_[LR]$/.test(name)) {
    mat.setMetallicRoughnessTexture(null).setRoughnessFactor(0.18).setBaseColorFactor([0.86, 0.84, 0.82, 1]);
  }
}
await doc.transform(dedup(), prune(), resample());
for (const tex of doc.getRoot().listTextures()) {
  const size = TEXTURE_RULES.find(([re]) => re.test(tex.getName()))[1];
  const exact = new RegExp(`^${tex.getName().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
  await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 85, resize: [size, size], pattern: exact }));
}
await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));

await io.write(outGlb, doc);
const clips = doc.getRoot().listAnimations().map((a) => a.getName());
console.log(`[cc5-motion] ${mb(statSync(outGlb).size)} MB, clips: ${clips.join(', ')}`);
if (report.warnings.length) console.warn('[cc5-motion] warnings:', report.warnings);
console.log(`[cc5-motion] wrote ${outGlb}`);
