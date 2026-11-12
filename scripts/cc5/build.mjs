// Builds the game-ready Character Creator 5 character from the CC export.
// The FBX, JSON, textures/ folder and .ccRestore are only read, never changed.
//
//   node scripts/cc5/build.mjs [sourceDir] [--reuse-raw] [--character aaron|woman]
//
// aaron (default): sourceDir holds HUMAN.fbx + HUMAN.json + textures/ (default:
// OneDrive\Documents, or CC5_SOURCE_DIR). woman: WOMAN.fbx + WOMAN.json (default:
// Downloads), the women's player body, animated with the feminine Rocketbox clips. Needs Blender 4.2+ (BLENDER=path\to\blender.exe if it isn't
// in Program Files). Writes:
//   assets-src/cc5/<name>-<profile>-raw.glb   Blender export, full-size textures (git-ignored)
//   public/assets/private/characters/cc5/<name>.glb       close-up player model
//   public/assets/private/characters/cc5/<name>-lite.glb  distance LOD
//   public/assets/private/characters/cc5/<name>.json      what was built, for the viewer and checks
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, resample, textureCompress } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..', '..');
// --reuse-raw skips Blender when its exports exist (for tuning the optimise step)
const reuseRaw = process.argv.includes('--reuse-raw');
// Each player body: its CC export, where it usually is, and the Rocketbox look whose
// clips (and gestures for the same body type) are retargeted onto it. Ground speeds
// of those clips are src/lib/looks.ts FEMININE / MASCULINE.
const CHARACTERS = {
  aaron: { file: 'HUMAN', dir: join(homedir(), 'OneDrive', 'Documents'), anim: 'male-adult-12', gestures: 'masculine', speeds: { walk: 1.03, run: 2.8 } },
  woman: { file: 'WOMAN', dir: join(homedir(), 'Downloads'), anim: 'female-adult-08', gestures: 'feminine', speeds: { walk: 1.21, run: 2.76 } },
};
const charAt = process.argv.indexOf('--character');
const name = charAt >= 0 ? process.argv[charAt + 1] : 'aaron';
const character = CHARACTERS[name];
if (!character) {
  console.error(`[cc5] unknown --character ${name}; use ${Object.keys(CHARACTERS).join(' or ')}`);
  process.exit(1);
}
const sourceArg = process.argv.slice(2).find((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--character');
const sourceDir = resolve(sourceArg ?? process.env.CC5_SOURCE_DIR ?? character.dir);
const animSource = join(root, `public/assets/models/characters/rocketbox/${character.anim}.glb`);
// Talk, Listen, Wave and Sit for the same body type, retargeted into the close-up model
const gestureSource = join(root, `public/assets/models/characters/rocketbox/gestures-${character.gestures}.glb`);
const rawDir = join(root, 'assets-src/cc5');
// Reallusion content: usable in the game, not redistributable, so private/ (git-ignored)
const outDir = join(root, 'public/assets/private/characters/cc5');
const SOURCE_SPEEDS = character.speeds;

// Longest texture side per profile; the first matching rule wins (texture names come
// from CC). Budgeted by what the camera sees: the face gets the detail, skin under
// the shirt and trousers and the teeth get little. CC ships up to 4096 px.
const TEXTURE_RULES = {
  main: [
    [/^Std_Skin_Head_Diffuse/, 2048],
    [/^Std_Skin_(Body|Leg)_Diffuse/, 512],
    [/^Std_Skin_(Body|Leg)|Teeth|Tongue|Std_Nails/, 256],
    [/Std_Eye_|Std_Cornea|Eyelash|Brows|Beard|Hair_Clap/, 512],
    [/^Std_Skin_Head_Normal|^Std_Skin_Arm_Diffuse|^Hair_Transparency_Diffuse/, 1024],
    [/_(Diffuse|Diffuse-.*)$/, 1024],
    [/./, 512],
  ],
  lite: [
    [/^Std_Skin_Head_Diffuse|^Hair_Transparency_Diffuse/, 512],
    [/_(Diffuse|Diffuse-.*)$/, 256],
    [/./, 128],
  ],
};
// Card-based hair sorts badly with blending; alpha-tested cards are stable and cheap
const ALPHA_CUTOFF = [
  [/^Hair_/, 0.35],
  [/^Beard_/, 0.3],
  [/Eyelash|^Brows_/, 0.2],
  // A ready-dressed ActorScan (WOMAN.fbx) is one material whose opacity only cuts out
  // hair strands; blending the whole body would sort it against itself
  [/^Character$/, 0.4],
];
// Closed surfaces: drawing their back faces only costs fill rate
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

function findSource(name) {
  if (!existsSync(sourceDir)) return null;
  const hit = readdirSync(sourceDir).find((f) => f.toLowerCase() === name.toLowerCase());
  return hit ? join(sourceDir, hit) : null;
}

const fail = (msg) => {
  console.error(`\n[cc5] ${msg}`);
  process.exit(1);
};

const fbx = findSource(`${character.file}.fbx`);
const json = findSource(`${character.file}.json`);
if (!fbx || !json) fail(`${character.file}.fbx and ${character.file}.json not found in ${sourceDir}`);
if (!existsSync(join(sourceDir, 'textures'))) console.warn(`[cc5] no textures/ folder next to ${character.file}.json; roughness, AO and opacity maps will be missing`);
const blender = findBlender();
if (!blender) fail('Blender was not found. Install Blender 4.2 or newer (https://www.blender.org/download/) or set BLENDER to blender.exe.');
mkdirSync(rawDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const mb = (bytes) => Math.round((bytes / 1024 / 1024) * 10) / 10;

/**
 * The gesture file holds only clips (no skinned mesh), and Blender only builds an
 * armature from a skin. So the gesture clips are copied onto the skinned Rocketbox
 * body they were made for (same Bip01 bone names) and retargeted from there.
 */
async function gesturesOnRig(out) {
  const doc = await io.read(animSource);
  const gestures = await io.read(gestureSource);
  const buffer = doc.getRoot().listBuffers()[0];
  const nodes = new Map(doc.getRoot().listNodes().map((n) => [n.getName(), n]));
  const copy = (a) => doc.createAccessor().setType(a.getType()).setArray(a.getArray().slice()).setBuffer(buffer);
  for (const a of doc.getRoot().listAnimations()) a.dispose();
  for (const a of gestures.getRoot().listAnimations()) {
    const anim = doc.createAnimation(a.getName());
    const samplers = new Map();
    for (const ch of a.listChannels()) {
      const target = nodes.get(ch.getTargetNode()?.getName());
      if (!target) continue;
      const s = ch.getSampler();
      if (!samplers.has(s)) {
        const ns = doc.createAnimationSampler().setInterpolation(s.getInterpolation()).setInput(copy(s.getInput())).setOutput(copy(s.getOutput()));
        anim.addSampler(ns);
        samplers.set(s, ns);
      }
      anim.addChannel(doc.createAnimationChannel().setTargetNode(target).setTargetPath(ch.getTargetPath()).setSampler(samplers.get(s)));
    }
  }
  await io.write(out, doc);
  return out;
}
const gesturesRig = await gesturesOnRig(join(rawDir, `rocketbox-gestures-${character.gestures}-rig.glb`));
// Only file names: this JSON is served from public/, so no local paths
const meta = { source: { fbx: basename(fbx), json: basename(json), fbxMB: mb(statSync(fbx).size) }, builtAt: new Date().toISOString(), profiles: {} };

for (const profile of ['main', 'lite']) {
  const raw = join(rawDir, `${name}-${profile}-raw.glb`);
  const reportPath = join(rawDir, `${name}-${profile}-report.json`);
  if (reuseRaw && existsSync(raw) && existsSync(reportPath)) {
    console.log(`\n[cc5] ${profile}: reusing ${raw}`);
  } else {
    console.log(`\n[cc5] ${profile}: Blender conversion…`);
    const r = spawnSync(blender, [
      '--background', '--factory-startup',
      '--python', join(root, 'scripts/cc5/convert_cc5.py'),
      '--', fbx, json, animSource, raw, reportPath, profile, gesturesRig,
    ], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    writeFileSync(join(rawDir, `blender-${name}-${profile}.log`), `${r.stdout}\n${r.stderr}`);
    if (r.status !== 0 || !existsSync(reportPath) || /Traceback/.test(r.stdout + r.stderr)) {
      fail(`Blender conversion failed (${profile}); see assets-src/cc5/blender-${name}-${profile}.log`);
    }
  }
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));

  console.log(`[cc5] ${profile}: optimising…`);
  const doc = await io.read(raw);
  for (const mat of doc.getRoot().listMaterials()) {
    const name = mat.getName();
    const cutoff = ALPHA_CUTOFF.find(([re]) => re.test(name))?.[1];
    if (cutoff !== undefined) mat.setAlphaMode('MASK').setAlphaCutoff(cutoff);
    if (SINGLE_SIDED.test(name)) mat.setDoubleSided(false);
    // CC's eye shader adds wetness and lid shadow; without it the eyes read matte and
    // staring. A wet, slightly dimmer eyeball is the closest plain-PBR match.
    if (/^Std_Eye_[LR]$/.test(name)) {
      mat.setMetallicRoughnessTexture(null).setRoughnessFactor(0.18).setBaseColorFactor([0.86, 0.84, 0.82, 1]);
    }
  }
  await doc.transform(dedup(), prune(), resample());
  const rules = TEXTURE_RULES[profile];
  const textures = doc.getRoot().listTextures();
  for (const tex of textures) {
    const size = rules.find(([re]) => re.test(tex.getName()))[1];
    const exact = new RegExp(`^${tex.getName().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
    await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 85, resize: [size, size], pattern: exact }));
  }
  await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));

  // GPU memory: RGBA8 with a full mip chain is about 4/3 x w x h x 4 bytes
  let gpuBytes = 0;
  const textureList = [];
  for (const tex of doc.getRoot().listTextures()) {
    const [w, h] = tex.getSize() ?? [0, 0];
    gpuBytes += (w * h * 4 * 4) / 3;
    textureList.push(`${tex.getName()} ${w}x${h}`);
  }
  const out = join(outDir, profile === 'main' ? `${name}.glb` : `${name}-lite.glb`);
  await io.write(out, doc);
  const clips = doc.getRoot().listAnimations().map((a) => a.getName());
  meta.profiles[profile] = {
    file: `private/characters/cc5/${profile === 'main' ? `${name}.glb` : `${name}-lite.glb`}`,
    fileMB: mb(statSync(out).size),
    rawMB: mb(statSync(raw).size),
    triangles: report.triangles,
    meshes: report.meshes,
    heightM: report.height_m,
    bones: report.source.bones,
    clips,
    textures: textureList.length,
    textureGpuMB: mb(gpuBytes),
    textureList,
    warnings: report.warnings,
  };
  meta.retarget = { from: `rocketbox/${character.anim}.glb`, turnDegrees: report.turn_degrees, hipRatio: report.hip_ratio, maxAlignDegrees: report.max_align_degrees, clips: report.clips };
  if (profile === 'main') {
    // The game scales the body to the player's height; strides scale with leg length
    // relative to height, so the clip ground speeds do too (keeps feet from sliding)
    const legs = (report.hip_m / report.height_m) / (report.source_hip_m / report.source_height_m);
    const round = (v) => Math.round(v * 100) / 100;
    meta.avatar = { url: meta.profiles.main.file, height: report.height_m, walkSpeed: round(SOURCE_SPEEDS.walk * legs), runSpeed: round(SOURCE_SPEEDS.run * legs) };
  }
  console.log(`[cc5] ${profile}: ${meta.profiles[profile].fileMB} MB, ${report.triangles} triangles, ${textureList.length} textures ≈ ${meta.profiles[profile].textureGpuMB} MB GPU, clips: ${clips.join(', ')}`);
}

writeFileSync(join(outDir, `${name}.json`), `${JSON.stringify(meta, null, 2)}\n`);
console.log(`\n[cc5] wrote ${join(outDir, `${name}.json`)}`);
