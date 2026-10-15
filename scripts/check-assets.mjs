// Checks public/assets/manifest.json and the files it lists.
// Run: npm run assets:check   (npm.cmd run assets:check on Windows PowerShell)
import { readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';

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
  if (!(s.tileMeters > 0)) warn(`${key}: set tileMeters (how many metres one image covers)`);
}

console.log('Avatar');
if (!manifest.avatar) {
  console.log('  --    built-in avatar');
} else {
  const rel = manifest.avatar.url;
  checkFile(rel, 'avatar', 15);
  if (existsSync(join(ROOT, rel))) {
    try {
      const doc = await new NodeIO().read(join(ROOT, rel));
      const r = doc.getRoot();
      const clips = r.listAnimations().map((a) => a.getName());
      for (const want of ['idle', 'walk', 'run']) {
        if (clips.some((c) => c.toLowerCase().includes(want))) ok(`animation "${want}" found`);
        else warn(`no animation named like "${want}" (found: ${clips.join(', ') || 'none'})`);
      }
      if (r.listSkins().length === 0) fail('model has no skeleton (not rigged); it cannot animate');
      let tris = 0;
      for (const m of r.listMeshes()) for (const p of m.listPrimitives()) {
        const idx = p.getIndices();
        tris += (idx ? idx.getCount() : p.getAttribute('POSITION').getCount()) / 3;
      }
      if (tris > 80000) warn(`${Math.round(tris)} triangles; aim under 80,000 for integrated graphics`);
      else ok(`${Math.round(tris)} triangles`);
    } catch (e) {
      fail(`could not read GLB: ${e.message}. If it is meshopt/draco-compressed, it still loads in the game; check it in the browser.`);
    }
  }
}

console.log(`\n${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
