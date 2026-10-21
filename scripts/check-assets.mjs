// Checks public/assets/manifest.json and the files it lists.
// Run: npm run assets:check   (npm.cmd run assets:check on Windows PowerShell)
import { readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const ROOT = join(import.meta.dirname, '..', 'public', 'assets');
const MB = 1024 * 1024;
let errors = 0, warnings = 0;
const ok = (m) => console.log(`  ok    ${m}`);
const warn = (m) => { warnings++; console.log(`  warn  ${m}`); };
const fail = (m) => { errors++; console.log(`  FAIL  ${m}`); };

let manifest;
try {
  manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
} catch (e) {
  console.log(`FAIL  public/assets/manifest.json is missing or not valid JSON: ${e.message}`);
  process.exit(1);
}

function checkFile(rel, label, maxMb) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return fail(`${label}: file not found at public/assets/${rel}`);
  const size = statSync(p).size;
  if (size > maxMb * MB) warn(`${label}: ${(size / MB).toFixed(1)} MB is heavy for integrated graphics (aim under ${maxMb} MB; use 1K or 2K images)`);
  else ok(`${label}: ${rel} (${(size / MB).toFixed(2)} MB)`);
}

console.log('Surfaces');
for (const [key, s] of Object.entries(manifest.surfaces ?? {})) {
  if (!s) { console.log(`  --    ${key}: built-in`); continue; }
  checkFile(s.color, `${key} colour`, 3);
  if (s.normal) checkFile(s.normal, `${key} normal`, 3);
  if (s.roughness) checkFile(s.roughness, `${key} roughness`, 2);
  if (s.ao) checkFile(s.ao, `${key} ambient occlusion`, 2);
  if (s.normal && /normaldx/i.test(s.normal)) warn(`${key}: ${s.normal} looks like a DirectX normal map; use the NormalGL file from ambientCG`);
  if (!(s.tileMeters > 0)) warn(`${key}: set tileMeters (how many metres one image covers)`);
}

/** Shared GLB checks: triangle budget, texture sizes, compression the game can't decode. */
async function inspectGlb(rel, label, maxTris) {
  try {
    const doc = await io.read(join(ROOT, rel));
    const r = doc.getRoot();
    const used = r.listExtensionsUsed().map((e) => e.extensionName);
    if (used.includes('KHR_draco_mesh_compression')) {
      fail(`${label}: Draco compression is not supported by the game loader; re-export with meshopt (npm run assets:optimize)`);
    }
    let tris = 0;
    for (const m of r.listMeshes()) for (const p of m.listPrimitives()) {
      const idx = p.getIndices();
      tris += (idx ? idx.getCount() : p.getAttribute('POSITION').getCount()) / 3;
    }
    if (tris > maxTris) warn(`${label}: ${Math.round(tris)} triangles; aim under ${maxTris.toLocaleString()} for integrated graphics`);
    else ok(`${label}: ${Math.round(tris)} triangles`);
    for (const t of r.listTextures()) {
      const size = t.getSize();
      if (size && Math.max(...size) > 2048) warn(`${label}: texture "${t.getName() || t.getURI()}" is ${size[0]}×${size[1]}; resize to 2048 or less`);
    }
    return r;
  } catch (e) {
    fail(`${label}: could not read GLB: ${e.message}`);
    return null;
  }
}

console.log('Avatar');
if (!manifest.avatar) {
  console.log('  --    built-in avatar');
} else {
  const rel = manifest.avatar.url;
  checkFile(rel, 'avatar', 15);
  if (existsSync(join(ROOT, rel))) {
    const r = await inspectGlb(rel, 'avatar', 80000);
    if (r) {
      const clips = r.listAnimations().map((a) => a.getName());
      for (const want of ['idle', 'walk', 'run']) {
        if (clips.some((c) => c.toLowerCase().includes(want))) ok(`animation "${want}" found`);
        else warn(`no animation named like "${want}" (found: ${clips.join(', ') || 'none'})`);
      }
      if (r.listSkins().length === 0) fail('avatar has no skeleton (not rigged); it cannot animate');
    }
  }
}

console.log('Vehicles');
for (const [key, v] of Object.entries(manifest.vehicles ?? {})) {
  if (!v) { console.log(`  --    ${key}: built-in`); continue; }
  checkFile(v.url, key, 8);
  if (existsSync(join(ROOT, v.url))) await inspectGlb(v.url, key, 40000);
  if (!(v.length >= 2 && v.length <= 20)) warn(`${key}: set length (metres, bumper to bumper; a danfo is about 5)`);
  if (v.rotateY !== undefined && ![0, 90, 180, 270].includes(v.rotateY)) warn(`${key}: rotateY must be 0, 90, 180 or 270`);
}

console.log(`\n${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
