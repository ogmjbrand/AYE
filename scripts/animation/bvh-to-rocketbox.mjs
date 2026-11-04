// Retargets a BVH motion (RGB MoCap's default "Generic / Blender" export, or
// any BVH with the same 52-bone Hips hierarchy) onto AYE's Rocketbox Biped
// skeleton and adds it to a body type's gestures file, like
// scripts/rocketbox/add-gestures.mjs does for Rocketbox FBX clips.
//
//   node scripts/animation/bvh-to-rocketbox.mjs <in.bvh> <ClipName> <feminine|masculine> <out.glb> [--tpose-frame N] [--keep-travel]
//   npm run assets:optimize -- <out.glb> public/assets/models/characters/rocketbox/gestures-<body>.glb
//
// Export from RGB MoCap with "Add T-pose before motion" ticked: frame 0 is then
// a T-pose. The Rocketbox binds in an A-pose, so each limb and spine bone is
// first swung to lie along the capture's T-pose; then each bone's motion is
// its rotation away from that T-pose (a world-space delta) applied on top.
// That handles the two rigs' different bone axes and rest poses, which
// copying rotations bone for bone would not. The hips' travel is scaled by leg length;
// unless --keep-travel, it's held on the spot horizontally (the game moves the
// character), as the Rocketbox clips are.
//
// Runs on any machine with Node; RGB MoCap itself needs Windows and an NVIDIA
// GPU (docs/ANIMATION_PIPELINE.md). Nothing here ships with the game except the
// clip it writes.
import { readFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader.js';

/** RGB MoCap's generic BVH joints (Mixamo-style names) to the Rocketbox Biped's. */
export function rgbToBip01() {
  const map = {
    Hips: 'Bip01 Pelvis', Spine: 'Bip01 Spine', Spine1: 'Bip01 Spine1', Spine2: 'Bip01 Spine2', Neck: 'Bip01 Neck', Head: 'Bip01 Head',
  };
  for (const [side, s] of [['Left', 'L'], ['Right', 'R']]) {
    Object.assign(map, {
      [`${side}Shoulder`]: `Bip01 ${s} Clavicle`, [`${side}Arm`]: `Bip01 ${s} UpperArm`, [`${side}ForeArm`]: `Bip01 ${s} Forearm`, [`${side}Hand`]: `Bip01 ${s} Hand`,
      [`${side}UpLeg`]: `Bip01 ${s} Thigh`, [`${side}Leg`]: `Bip01 ${s} Calf`, [`${side}Foot`]: `Bip01 ${s} Foot`, [`${side}ToeBase`]: `Bip01 ${s} Toe0`,
    });
    ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'].forEach((finger, digit) => {
      for (let seg = 1; seg <= 3; seg++) map[`${side}Hand${finger}${seg}`] = `Bip01 ${s} Finger${digit}${seg === 1 ? '' : seg - 1}`;
    });
  }
  return map;
}

const LOOK_FOR_BODY = { feminine: 'female-adult-08', masculine: 'male-adult-04' };
const ROCKETBOX = 'public/assets/models/characters/rocketbox';

let decoderReady = null;
async function io() {
  decoderReady ??= MeshoptDecoder.ready;
  await decoderReady;
  return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
}

/**
 * The Rocketbox skeleton in its bind pose (from the skin's inverse bind
 * matrices), with each joint's parent and rest local transform.
 */
export async function loadRocketboxRig(glbPath) {
  const doc = await (await io()).read(glbPath);
  const skin = doc.getRoot().listSkins()[0];
  const joints = skin.listJoints();
  const ibm = skin.getInverseBindMatrices();
  const bind = new Map(joints.map((j, i) => [j.getName(), new Matrix4().fromArray(ibm.getElement(i, [])).invert()]));
  const bones = [];
  const byName = new Map();
  // Parents first: walk down from each joint's topmost ancestor
  const order = [];
  const visit = (n) => { if (order.includes(n)) return; const p = n.getParentNode(); if (p && bind.has(p.getName())) visit(p); order.push(n); };
  joints.forEach(visit);
  for (const n of order) {
    const name = n.getName();
    const parentNode = n.getParentNode();
    const parent = parentNode && bind.has(parentNode.getName()) ? parentNode.getName() : null;
    // A joint under a non-joint (the Pelvis under Bip01): that node stays where the file puts it
    const fixedParent = parent ? null : parentNode ? { name: parentNode.getName(), world: new Matrix4().fromArray(parentNode.getWorldMatrix()), local: { t: parentNode.getTranslation(), r: parentNode.getRotation() } } : null;
    const world = bind.get(name);
    const parentWorld = parent ? bind.get(parent) : fixedParent ? fixedParent.world : new Matrix4();
    const local = new Matrix4().copy(parentWorld).invert().multiply(world);
    const t = new Vector3(), q = new Quaternion(), s = new Vector3();
    local.decompose(t, q, s);
    // Rest scale too: the Biped's pelvis carries one (about 1.15) that its children inherit
    const bone = { name, parent, fixedParent, bindWorld: world, restPos: t, restQuat: q, restScale: s };
    bones.push(bone);
    byName.set(name, bone);
  }
  return { bones, byName };
}

const pos = (m) => new Vector3().setFromMatrixPosition(m);
const rot = (m) => new Quaternion().setFromRotationMatrix(new Matrix4().extractRotation(m));

/** A person's frame (left, up, forward) from hip, head and leg positions. */
function frame(left, right, hips, head) {
  const up = head.clone().sub(hips).normalize();
  const l = left.clone().sub(right);
  l.sub(up.clone().multiplyScalar(l.dot(up))).normalize();
  const fwd = new Vector3().crossVectors(l, up).normalize();
  return new Matrix4().makeBasis(l, up, fwd);
}

/**
 * Retargets a BVH's motion onto the rig. Returns per-frame local rotations for
 * each Rocketbox joint the BVH drives (and its parents), the pelvis's local
 * position per frame, and the times.
 */
export function retargetBvh(text, rig, { tposeFrame = 0, keepTravel = false } = {}) {
  const { skeleton, clip } = new BVHLoader().parse(text);
  const src = skeleton.bones;
  const root = src[0];
  const tracks = new Map();
  for (const t of clip.tracks) {
    // three.js names BVH tracks "<bone>.quaternion" (older versions ".bones[<bone>].quaternion")
    const m = /^(?:\.bones\[(.+)\]|(.+))\.(position|quaternion)$/.exec(t.name);
    if (m) tracks.set(`${m[1] ?? m[2]}.${m[3]}`, t);
  }
  const frames = Math.max(...clip.tracks.map((t) => t.times.length));
  const times = clip.tracks.find((t) => t.times.length === frames).times;
  const rest = new Map(src.map((b) => [b.name, b.position.clone()]));
  const pose = (f) => {
    for (const b of src) {
      const q = tracks.get(`${b.name}.quaternion`), p = tracks.get(`${b.name}.position`);
      if (q) b.quaternion.fromArray(q.values, Math.min(f, q.times.length - 1) * 4);
      if (p) b.position.fromArray(p.values, Math.min(f, p.times.length - 1) * 3); else b.position.copy(rest.get(b.name));
    }
    root.updateMatrixWorld(true);
  };
  const map = rgbToBip01();
  const sourceOf = new Map(Object.entries(map).filter(([s]) => src.some((b) => b.name === s)).map(([s, t]) => [t, s]));
  const srcBone = new Map(src.map((b) => [b.name, b]));
  if (!srcBone.has('Hips') || !srcBone.has('Head') || !srcBone.has('LeftUpLeg') || !srcBone.has('RightUpLeg')) {
    throw new Error('Expected a BVH with Hips, Head, LeftUpLeg and RightUpLeg (RGB MoCap Generic / Blender export)');
  }
  // Calibrate on the T-pose frame
  pose(tposeFrame);
  const sw = (n) => srcBone.get(n).matrixWorld;
  const sFrame = frame(pos(sw('LeftUpLeg')), pos(sw('RightUpLeg')), pos(sw('Hips')), pos(sw('Head')));
  const tw = (n) => rig.byName.get(n).bindWorld;
  const tFrame = frame(pos(tw('Bip01 L Thigh')), pos(tw('Bip01 R Thigh')), pos(tw('Bip01 Pelvis')), pos(tw('Bip01 Head')));
  const C = new Matrix4().multiplyMatrices(tFrame, new Matrix4().copy(sFrame).transpose());
  const Cq = rot(C), Ci = Cq.clone().invert();
  const restWorld = new Map([...sourceOf.values()].map((s) => [s, rot(sw(s)).invert()]));
  // The Rocketbox binds in an A-pose, the capture's first frame is a T-pose: swing each limb and spine
  // bone so its bind direction lies along the capture's, and the T-pose frame becomes a T-pose on the Biped
  const AIM = [['Spine', 'Spine1'], ['Spine1', 'Spine2'], ['Spine2', 'Neck'], ['Neck', 'Head']];
  for (const side of ['Left', 'Right']) AIM.push([`${side}Shoulder`, `${side}Arm`], [`${side}Arm`, `${side}ForeArm`], [`${side}ForeArm`, `${side}Hand`], [`${side}Hand`, `${side}HandMiddle1`],
    [`${side}UpLeg`, `${side}Leg`], [`${side}Leg`, `${side}Foot`], [`${side}Foot`, `${side}ToeBase`],
    ...['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'].flatMap((f) => [[`${side}Hand${f}1`, `${side}Hand${f}2`], [`${side}Hand${f}2`, `${side}Hand${f}3`]]));
  const swing = new Map();
  for (const [a, c] of AIM) {
    if (!srcBone.has(a) || !srcBone.has(c) || !map[a] || !map[c] || !rig.byName.has(map[a]) || !rig.byName.has(map[c])) continue;
    const want = pos(sw(c)).sub(pos(sw(a))).applyQuaternion(Cq).normalize();
    const have = pos(tw(map[c])).sub(pos(tw(map[a]))).normalize();
    if (want.lengthSq() > 0 && have.lengthSq() > 0) swing.set(map[a], new Quaternion().setFromUnitVectors(have, want));
  }
  // Each target bone's world rotation in the capture's T-pose
  const tpose = new Map(rig.bones.map((b) => [b.name, (swing.get(b.name) ?? new Quaternion()).clone().multiply(rot(b.bindWorld))]));
  const hips0 = pos(sw('Hips'));
  const sUp = new Vector3().setFromMatrixColumn(sFrame, 1), tUp = new Vector3().setFromMatrixColumn(tFrame, 1);
  const sHeight = srcBone.has('LeftFoot') ? hips0.clone().sub(pos(sw('LeftFoot'))).dot(sUp) : 0;
  const tHeight = pos(tw('Bip01 Pelvis')).sub(pos(tw('Bip01 L Foot'))).dot(tUp);
  const k = sHeight > 1e-6 ? tHeight / sHeight : 1;
  const pelvisBind = pos(tw('Bip01 Pelvis'));
  // The joints to write: every one the BVH drives, and their ancestors (so a child's world delta has a parent to sit under)
  const out = new Map();
  for (const b of rig.bones) out.set(b.name, new Float32Array(frames * 4));
  const pelvisPos = new Float32Array(frames * 3);
  const worldQ = new Map();
  const tmp = new Quaternion();
  for (let f = 0; f < frames; f++) {
    pose(f);
    worldQ.clear();
    for (const b of rig.bones) {
      const parentQ = b.parent ? worldQ.get(b.parent) : b.fixedParent ? rot(b.fixedParent.world) : new Quaternion();
      const s = sourceOf.get(b.name);
      let w;
      if (s) {
        // The bone's turn away from the T-pose, carried into the Rocketbox frame, on top of its bind pose
        const delta = rot(sw(s)).multiply(restWorld.get(s));
        w = Cq.clone().multiply(delta).multiply(Ci).multiply(tpose.get(b.name));
      } else {
        w = parentQ.clone().multiply(b.restQuat);
      }
      worldQ.set(b.name, w);
      tmp.copy(parentQ).invert().multiply(w).normalize().toArray(out.get(b.name), f * 4);
      if (b.name === 'Bip01 Pelvis') {
        const move = pos(sw('Hips')).sub(hips0).applyQuaternion(Cq).multiplyScalar(k);
        if (!keepTravel) move.projectOnVector(tUp);
        const world = pelvisBind.clone().add(move);
        const parentWorld = b.fixedParent ? b.fixedParent.world : new Matrix4();
        world.applyMatrix4(new Matrix4().copy(parentWorld).invert()).toArray(pelvisPos, f * 3);
      }
    }
  }
  return { times: Float32Array.from(times), frames, rotations: out, pelvisPosition: pelvisPos, driven: [...sourceOf.keys()] };
}

/** World positions of every joint in one frame of a retargeted clip (for checks). */
export function jointPositions(rig, result, f) {
  const world = new Map();
  for (const b of rig.bones) {
    const parent = b.parent ? world.get(b.parent) : b.fixedParent ? b.fixedParent.world : new Matrix4();
    const q = new Quaternion().fromArray(result.rotations.get(b.name), f * 4);
    const t = b.name === 'Bip01 Pelvis' ? new Vector3().fromArray(result.pelvisPosition, f * 3) : b.restPos;
    world.set(b.name, new Matrix4().copy(parent).multiply(new Matrix4().compose(t, q, b.restScale)));
  }
  return new Map([...world].map(([n, m]) => [n, pos(m)]));
}

/** Adds the clip to a copy of a gestures file (flat named nodes, as three.js binds them by name). */
export async function addClip(gesturesPath, outPath, name, rig, result) {
  const nodeIo = await io();
  const doc = await nodeIo.read(gesturesPath);
  const root = doc.getRoot();
  if (root.listAnimations().some((a) => a.getName() === name)) throw new Error(`${gesturesPath} already has a clip called ${name}`);
  const buffer = root.listBuffers()[0] ?? doc.createBuffer();
  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  const nodes = new Map(root.listNodes().map((n) => [n.getName(), n]));
  const nodeFor = (n) => { if (!nodes.has(n)) { const node = doc.createNode(n); scene.addChild(node); nodes.set(n, node); } return nodes.get(n); };
  const anim = doc.createAnimation(name);
  const input = doc.createAccessor().setType('SCALAR').setArray(result.times).setBuffer(buffer);
  const channel = (node, path, array, type) => {
    const output = doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
    const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');
    anim.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(sampler));
  };
  // Bip01 (the Biped root) held where the rig was measured, so the pelvis lands where it was computed
  const pelvis = rig.byName.get('Bip01 Pelvis');
  if (pelvis.fixedParent) {
    const { t, r } = pelvis.fixedParent.local;
    channel(nodeFor(pelvis.fixedParent.name), 'rotation', Float32Array.from({ length: result.frames * 4 }, (_, i) => r[i % 4]), 'VEC4');
    channel(nodeFor(pelvis.fixedParent.name), 'translation', Float32Array.from({ length: result.frames * 3 }, (_, i) => t[i % 3]), 'VEC3');
  }
  for (const b of rig.bones) channel(nodeFor(b.name), 'rotation', result.rotations.get(b.name), 'VEC4');
  channel(nodeFor('Bip01 Pelvis'), 'translation', result.pelvisPosition, 'VEC3');
  for (const ext of root.listExtensionsUsed()) if (ext.extensionName === 'EXT_meshopt_compression') ext.dispose();
  await nodeIo.write(outPath, doc);
  return anim.listChannels().length;
}

// ---------------------------------------------------------------------------- command line
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = (n) => { const i = args.indexOf(n); return i < 0 ? null : args.splice(i, 2)[1] ?? ''; };
  const keepTravel = args.includes('--keep-travel'); if (keepTravel) args.splice(args.indexOf('--keep-travel'), 1);
  const tposeFrame = Number(flag('--tpose-frame') ?? 0);
  const [bvh, name, body, out] = args;
  if (!bvh || !name || !LOOK_FOR_BODY[body] || !out) {
    console.log('Usage: node scripts/animation/bvh-to-rocketbox.mjs <in.bvh> <ClipName> <feminine|masculine> <out.glb> [--tpose-frame N] [--keep-travel]');
    process.exit(1);
  }
  const rig = await loadRocketboxRig(`${ROCKETBOX}/${LOOK_FOR_BODY[body]}.glb`);
  const result = retargetBvh(readFileSync(bvh, 'utf8'), rig, { tposeFrame, keepTravel });
  const channels = await addClip(`${ROCKETBOX}/gestures-${body}.glb`, out, name, rig, result);
  console.log(`${name}: ${result.frames} frames, ${result.times[result.times.length - 1].toFixed(2)} s, ${result.driven.length} bones driven, ${channels} channels -> ${out}`);
  console.log(`Next: npm run assets:optimize -- ${out} ${ROCKETBOX}/gestures-${body}.glb, then add ${name} to src/lib/animationLibrary.ts`);
}
