import { Bone, Group } from 'three';
import { describe, expect, it } from 'vitest';
import { createHugClip } from './hugAnimation';

describe('Rocketbox hug animation', () => {
  it('creates a blended arm embrace that returns the rig to its starting pose', () => {
    const rig = new Group();
    for (const name of [
      'Bip01 L UpperArm',
      'Bip01 R UpperArm',
      'Bip01 L Forearm',
      'Bip01 R Forearm',
      'Bip01 L Hand',
      'Bip01 R Hand',
    ]) {
      const bone = new Bone();
      bone.name = name;
      rig.add(bone);
    }
    const clip = createHugClip(rig);
    expect(clip?.name).toBe('Hug');
    expect(clip?.duration).toBe(3.3);
    expect(clip?.tracks).toHaveLength(6);
    for (const track of clip!.tracks) {
      expect(track.times).toEqual(new Float32Array([0, 0.55, 2.55, 3.3]));
      expect(track.values.slice(0, 4)).toEqual(track.values.slice(-4));
    }
  });

  it('does not claim a hug animation exists for an incompatible rig', () => {
    expect(createHugClip(new Group())).toBeNull();
  });
});
