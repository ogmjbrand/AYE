import {
  AnimationClip,
  AnimationMixer,
  type KeyframeTrack,
  Euler,
  Quaternion,
  QuaternionKeyframeTrack,
  Vector3,
  type Object3D,
} from 'three';

const HUG_DURATION = 3.3;

const HUG_POSES: Readonly<Record<string, readonly [number, number, number]>> = {
  'Bip01 L UpperArm': [-0.55, 0, -1.05],
  'Bip01 R UpperArm': [-0.55, 0, 1.05],
  'Bip01 L Forearm': [0, 0, 0.9],
  'Bip01 R Forearm': [0, 0, -0.9],
  'Bip01 L Hand': [0.1, 0, 0.1],
  'Bip01 R Hand': [0.1, 0, -0.1],
};

/**
 * The same embrace for a rig whose bone axes differ (the Character Creator 5
 * player body): each arm segment is aimed in a direction relative to the
 * body (x to the person's side, y up, z forward) instead of being turned
 * about its own axes. Directions are for the segment from bone to child.
 */
const REACH: readonly { bone: string; child: string; dir: readonly [number, number, number] }[] = [
  { bone: 'Upperarm', child: 'Forearm', dir: [0.45, -0.3, 0.85] },
  { bone: 'Forearm', child: 'Hand', dir: [-0.85, 0.05, 0.5] },
  { bone: 'Hand', child: 'Mid1', dir: [-0.9, 0, 0.3] },
];

/**
 * The embrace is built on `stance` (the person's idle clip) at its first frame:
 * this skeleton's bind pose doesn't face the way its clips do, so every other
 * bone holds the idle stance while the arms reach in and back.
 */
export function createReachHugClip(root: Object3D, stance: AnimationClip | undefined, prefix = 'CC_Base_'): AnimationClip | null {
  if (!stance || !root.getObjectByName(`${prefix}L_Upperarm`)) return null;
  const nodes: Object3D[] = [];
  root.traverse((o) => nodes.push(o));
  const saved = nodes.map((o) => [o.position.clone(), o.quaternion.clone(), o.scale.clone()] as const);
  // Pose the (shared) model in the idle stance just long enough to measure it
  const mixer = new AnimationMixer(root);
  mixer.clipAction(stance).play();
  mixer.update(0);
  root.updateMatrixWorld(true);
  const rootQ = root.getWorldQuaternion(new Quaternion()).invert();
  const local = (v: Vector3) => v.applyQuaternion(rootQ);
  const times = [0, 0.55, 2.55, HUG_DURATION];
  const arms = new Map<string, QuaternionKeyframeTrack>();
  for (const side of ['L', 'R']) {
    const upper = root.getObjectByName(`${prefix}${side}_Upperarm`)!;
    // Which way is this arm's side of the body, in body space
    const sideSign = Math.sign(local(upper.getWorldPosition(new Vector3())).x) || (side === 'L' ? 1 : -1);
    for (const { bone, child, dir } of REACH) {
      const b = root.getObjectByName(`${prefix}${side}_${bone}`);
      const c = root.getObjectByName(`${prefix}${side}_${child}`);
      if (!b || !c || !b.parent) continue;
      const idle = b.quaternion.clone();
      const from = local(c.getWorldPosition(new Vector3()).sub(b.getWorldPosition(new Vector3()))).normalize();
      const to = new Vector3(dir[0] * sideSign, dir[1], dir[2]).normalize();
      const turn = new Quaternion().setFromUnitVectors(from, to);
      const world = rootQ.clone().multiply(b.getWorldQuaternion(new Quaternion()));
      const parent = rootQ.clone().multiply(b.parent.getWorldQuaternion(new Quaternion()));
      const embrace = parent.invert().multiply(turn.multiply(world));
      b.quaternion.copy(embrace);
      b.updateMatrixWorld(true);
      arms.set(b.name, new QuaternionKeyframeTrack(`${b.name}.quaternion`, times, [
        ...idle.toArray(), ...embrace.toArray(), ...embrace.toArray(), ...idle.toArray(),
      ]));
    }
  }
  // Everything else holds the idle stance's first frame
  const still: KeyframeTrack[] = stance.tracks
    .filter((t) => !arms.has(t.name.slice(0, t.name.lastIndexOf('.'))) || !t.name.endsWith('.quaternion'))
    .map((t) => {
      const size = t.getValueSize();
      const first = Array.from(t.values.slice(0, size));
      const Track = t.constructor as new (name: string, times: number[], values: number[]) => KeyframeTrack;
      return new Track(t.name, [0, HUG_DURATION], [...first, ...first]);
    });
  mixer.stopAllAction();
  mixer.uncacheRoot(root);
  nodes.forEach((o, i) => { o.position.copy(saved[i][0]); o.quaternion.copy(saved[i][1]); o.scale.copy(saved[i][2]); });
  root.updateMatrixWorld(true);
  return arms.size ? new AnimationClip('Hug', HUG_DURATION, [...still, ...arms.values()]) : null;
}

/** A short paired embrace authored for the Rocketbox Biped arm rig already used by AYE. */
export function createHugClip(root: Object3D): AnimationClip | null {
  const times = [0, 0.55, 2.55, HUG_DURATION];
  const tracks = Object.entries(HUG_POSES).flatMap(([name, angles]) => {
    const bone = root.getObjectByName(name);
    if (!bone) return [];
    const base = bone.quaternion.clone();
    const embrace = base.clone().multiply(new Quaternion().setFromEuler(new Euler(...angles)));
    const values = [
      ...base.toArray(),
      ...embrace.toArray(),
      ...embrace.toArray(),
      ...base.toArray(),
    ];
    return [new QuaternionKeyframeTrack(`${name}.quaternion`, times, values)];
  });
  return tracks.length ? new AnimationClip('Hug', HUG_DURATION, tracks) : null;
}
