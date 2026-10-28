import {
  AnimationClip,
  Euler,
  Quaternion,
  QuaternionKeyframeTrack,
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
