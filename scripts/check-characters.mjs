/**
 * Opens every character model the game can use and reports what is really in
 * it: triangles, materials, texture sizes, skeleton, animation clips, and
 * whether its skeleton matches the shared gesture files (so the talk, wave,
 * sit and hug clips can play on it without retargeting).
 *
 *   npm run check:characters            (the table)
 *   npm run check:characters -- --json  (machine-readable, for the report)
 *   npm run check:characters -- --write (saves the measurements of the public
 *                                         models to src/lib/characterAssets.json,
 *                                         which the character registry reads)
 *
 * Exits with 1 if a model is missing, unreadable, unrigged, or lacks the
 * idle, walk and run clips the game needs. It only reads files.
 */
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = 'public/assets';
const ROCKETBOX = `${ROOT}/models/characters/rocketbox`;
const GESTURES = ['gestures-feminine', 'gestures-masculine'];
// Private builds: present only on the machine that made them (scripts/cc5/build.mjs)
const PRIVATE = [`${ROOT}/private/characters/cc5/aaron.glb`, `${ROOT}/private/characters/cc5/aaron-lite.glb`];
/** Clips the game plays on every person; names are matched loosely as the files name them differently. */
const NEEDED = { idle: /idle|stand/i, walk: /walk/i, run: /run/i };

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

async function inspect(path) {
  const doc = await io.read(path);
  const root = doc.getRoot();
  let tris = 0;
  for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) {
    const idx = p.getIndices();
    const pos = p.getAttribute('POSITION');
    tris += (idx ? idx.getCount() : pos ? pos.getCount() : 0) / 3;
  }
  const textures = [];
  for (const t of root.listTextures()) {
    const image = t.getImage();
    let size = t.getSize();
    if (!size && image) {
      try { const m = await sharp(Buffer.from(image)).metadata(); size = [m.width, m.height]; } catch { size = null; }
    }
    textures.push(size ? Math.max(...size) : 0);
  }
  const skins = root.listSkins();
  const bones = skins[0]?.listJoints().map((j) => j.getName()) ?? [];
  // Clips bind to any node by name: the skeleton's root (Bip01) is a plain node in some files, not a joint
  const nodes = root.listNodes().map((n) => n.getName());
  const clips = root.listAnimations().map((a) => {
    let end = 0;
    for (const s of a.listSamplers()) { const arr = s.getInput()?.getArray(); if (arr?.length) end = Math.max(end, arr[arr.length - 1]); }
    return { name: a.getName(), seconds: Math.round(end * 100) / 100 };
  });
  // The bones the clips drive (a gestures file has clips but no skin of its own)
  const driven = [...new Set(root.listAnimations().flatMap((a) => a.listChannels().map((c) => c.getTargetNode()?.getName()).filter(Boolean)))];
  return {
    file: path.replace(`${ROOT}/`, ''),
    mb: Math.round((statSync(path).size / 1024 / 1024) * 10) / 10,
    triangles: Math.round(tris),
    meshes: root.listMeshes().length,
    materials: root.listMaterials().length,
    textures: textures.length,
    maxTexture: textures.length ? Math.max(...textures) : 0,
    bones: bones.length,
    boneNames: bones,
    nodeNames: nodes,
    driven,
    clips,
  };
}

const json = process.argv.includes('--json');
const people = readdirSync(ROCKETBOX).filter((f) => f.endsWith('.glb') && !GESTURES.some((g) => f.startsWith(g))).map((f) => `${ROCKETBOX}/${f}`);
const gestures = {};
for (const g of GESTURES) {
  const p = `${ROCKETBOX}/${g}.glb`;
  if (existsSync(p)) gestures[g] = await inspect(p);
}

const report = [];
let failures = 0;
for (const path of [...people, ...PRIVATE.filter(existsSync)]) {
  let r;
  try { r = await inspect(path); } catch (e) { report.push({ file: path, error: String(e.message ?? e) }); failures++; continue; }
  const missing = Object.entries(NEEDED).filter(([, re]) => !r.clips.some((c) => re.test(c.name))).map(([k]) => k);
  // A gesture file fits when every bone its clips drive exists in this skeleton
  const fits = Object.entries(gestures).filter(([, g]) => {
    return g.driven.length > 0 && g.driven.every((b) => r.nodeNames.includes(b));
  }).map(([name]) => name);
  const problems = [];
  if (!r.bones) problems.push('no skeleton');
  if (missing.length) problems.push(`no ${missing.join('/')} clip`);
  if (problems.length) failures++;
  report.push({ ...r, boneNames: undefined, nodeNames: undefined, driven: undefined, gestureFiles: fits, problems, private: path.includes('/private/') });
}

if (process.argv.includes('--write')) {
  // Public models only: the private CC5 build stays off GitHub, so its numbers do too
  const measured = Object.fromEntries(report.filter((r) => !r.private && !r.error).map((r) => [
    r.file.split('/').pop().replace(/\.glb$/, ''),
    { file: r.file, mb: r.mb, triangles: r.triangles, materials: r.materials, textures: r.textures, maxTexture: r.maxTexture, bones: r.bones, clips: r.clips.map((c) => c.name), gestureFiles: r.gestureFiles },
  ]));
  writeFileSync('src/lib/characterAssets.json', `${JSON.stringify(measured, null, 2)}\n`);
  console.log(`wrote src/lib/characterAssets.json (${Object.keys(measured).length} models)`);
}

if (json) {
  console.log(JSON.stringify({ people: report, gestures: Object.fromEntries(Object.entries(gestures).map(([k, v]) => [k, { ...v, boneNames: undefined, nodeNames: undefined, driven: v.driven.length }])) }, null, 2));
} else {
  console.log('file'.padEnd(46), 'MB'.padStart(5), 'tris'.padStart(7), 'mats', 'tex', 'max px', 'bones', 'clips', 'gestures fit');
  for (const r of report) {
    if (r.error) { console.log(r.file.padEnd(46), `ERROR ${r.error}`); continue; }
    console.log(r.file.padEnd(46), String(r.mb).padStart(5), String(r.triangles).padStart(7), String(r.materials).padStart(4), String(r.textures).padStart(3), String(r.maxTexture).padStart(6), String(r.bones).padStart(5), String(r.clips.length).padStart(5), r.gestureFiles.join(',') || '-', r.problems.length ? `  PROBLEM: ${r.problems.join('; ')}` : '');
  }
  for (const [name, g] of Object.entries(gestures)) console.log(`${name}: ${g.clips.map((c) => `${c.name} ${c.seconds}s`).join(', ')}`);
  const pub = report.filter((r) => !r.private && !r.error).length;
  const priv = report.filter((r) => r.private && !r.error).length;
  console.log(`${pub} public base model(s), ${priv} private; ${failures} with problems.`);
}
process.exit(failures ? 1 : 0);
