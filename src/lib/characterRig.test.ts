import { describe, expect, it } from 'vitest';
import { Bone, Object3D } from 'three';
import {
  findRigBone,
  isRocketboxFingerBone,
  normalizeRigBoneName,
  rocketboxBodyShapeBoneKey,
  rocketboxFingerSegment,
  rigBoneName,
} from './characterRig';

describe('Rocketbox rig profile', () => {
  it('defines the shared bone roles used by gameplay and accessories', () => {
    expect(rigBoneName('head')).toBe('Bip01 Head');
    expect(rigBoneName('rightUpperArm')).toBe('Bip01 R UpperArm');
    expect(findRigBone(new Object3D().add(new Bone()), 'head')).toBeUndefined();
  });

  it('resolves names across the space and underscore spellings used in GLBs', () => {
    const root = new Object3D();
    const head = new Bone();
    head.name = 'Bip01_Head';
    root.add(head);

    expect(findRigBone(root, 'head')).toBe(head);
    expect(findRigBone(root, 'Bip01 Head')).toBe(head);
    expect(normalizeRigBoneName('Bip01_L_Thigh')).toBe('Bip01 L Thigh');
    expect(rocketboxBodyShapeBoneKey('Bip01_L_Thigh')).toBe('L Thigh');
  });

  it('recognizes only supported non-thumb finger segments', () => {
    expect(isRocketboxFingerBone('Bip01_L_Finger11')).toBe(true);
    expect(rocketboxFingerSegment('Bip01_L_Finger11')).toBe(1);
    expect(rocketboxFingerSegment('Bip01_R_Finger4')).toBe(0);
    expect(isRocketboxFingerBone('Bip01_L_Finger0')).toBe(false);
    expect(isRocketboxFingerBone('Bip01_L_Thigh')).toBe(false);
  });
});
