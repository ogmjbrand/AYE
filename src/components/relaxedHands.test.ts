import { describe, expect, it } from 'vitest';
import { AnimationClip, Bone, Object3D, Quaternion, QuaternionKeyframeTrack, Vector3, type AnimationAction } from 'three';
import { createRelaxedHands } from './relaxedHands';

const DEG = Math.PI / 180;
const FLEX = new Vector3(0, 0, 1);

function rig() {
  const scene = new Object3D();
  const mid = new Bone();
  mid.name = 'Bip01_L_Finger1';
  const tip = new Bone();
  tip.name = 'Bip01_L_Finger11';
  mid.add(tip);
  scene.add(mid);
  return { scene, mid, tip };
}

const flexClip = (name: string, bone: string, degrees: number) => {
  const q = new Quaternion().setFromAxisAngle(FLEX, degrees * DEG).toArray();
  return new AnimationClip(name, 1, [new QuaternionKeyframeTrack(`${bone}.quaternion`, [0, 1], [...q, ...q])]);
};

const action = (clip: AnimationClip, weight: number) =>
  ({ getClip: () => clip, getEffectiveWeight: () => weight }) as unknown as AnimationAction;

const curlOf = (bone: Bone) => bone.quaternion.angleTo(new Quaternion()) / DEG;

describe('createRelaxedHands', () => {
  it('curls fingers that the active clip does not curl', () => {
    const { scene, tip } = rig();
    const walk = new AnimationClip('Walk', 1, []);
    createRelaxedHands(scene, [walk]).update({ Walk: action(walk, 1) });
    expect(curlOf(tip)).toBeCloseTo(22, 3);
  });

  it('does not add curl on top of a clip that already curls the finger', () => {
    const { scene, tip } = rig();
    const idle = flexClip('Idle', 'Bip01_L_Finger11', 30);
    const hands = createRelaxedHands(scene, [idle]);
    tip.quaternion.setFromAxisAngle(FLEX, 30 * DEG); // what the mixer writes for this clip
    hands.update({ Idle: action(idle, 1) });
    expect(curlOf(tip)).toBeCloseTo(30, 3);
  });

  it('blends the top-up with the clip weights during a cross-fade', () => {
    const { scene, tip } = rig();
    const walk = new AnimationClip('Walk', 1, []);
    const idle = flexClip('Idle', 'Bip01_L_Finger11', 22);
    createRelaxedHands(scene, [walk, idle]).update({ Walk: action(walk, 0.5), Idle: action(idle, 0.5) });
    expect(curlOf(tip)).toBeCloseTo(11, 3);
  });

  it('does not accumulate curl across frames', () => {
    const { scene, tip } = rig();
    const walk = new AnimationClip('Walk', 1, []);
    const hands = createRelaxedHands(scene, [walk]);
    for (let i = 0; i < 5; i++) hands.update({ Walk: action(walk, 1) });
    expect(curlOf(tip)).toBeCloseTo(22, 3);
  });

  it('builds on a pose the mixer writes between frames', () => {
    const { scene, tip } = rig();
    const walk = new AnimationClip('Walk', 1, []);
    const hands = createRelaxedHands(scene, [walk]);
    hands.update({ Walk: action(walk, 1) });
    tip.quaternion.setFromAxisAngle(FLEX, 60 * DEG);
    hands.update({ Walk: action(walk, 1) });
    expect(curlOf(tip)).toBeCloseTo(60 + 22, 3);
  });

  it('leaves the thumb and non-finger bones alone', () => {
    const { scene, mid, tip } = rig();
    const thumb = new Bone();
    thumb.name = 'Bip01_L_Finger0';
    const thigh = new Bone();
    thigh.name = 'Bip01_L_Thigh';
    scene.add(thumb, thigh);
    const walk = new AnimationClip('Walk', 1, []);
    createRelaxedHands(scene, [walk]).update({ Walk: action(walk, 1) });
    expect(curlOf(thumb)).toBeCloseTo(0, 6);
    expect(curlOf(thigh)).toBeCloseTo(0, 6);
    expect(curlOf(mid)).toBeCloseTo(16, 3);
    expect(curlOf(tip)).toBeCloseTo(22, 3);
  });
});
