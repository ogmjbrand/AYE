import { describe, expect, it } from 'vitest';
import { AnimationClip, QuaternionKeyframeTrack, VectorKeyframeTrack } from 'three';
import { withRelaxedHands } from './handPose';

const quat = (name: string, q: number[]) => new QuaternionKeyframeTrack(name, [0, 1], [...q, ...q.map((v) => v * 0.9)]);
const curl = [0.1, 0.2, 0.3, 0.927];

describe('withRelaxedHands', () => {
  const idle = new AnimationClip('Idle', 2, [quat('Bip01_R_Finger1.quaternion', curl), quat('Bip01_R_Hand.quaternion', [0, 0, 0, 1])]);
  const walk = new AnimationClip('Walk', 1.2, [
    new VectorKeyframeTrack('Bip01_R_Finger1.position', [0, 1], [0, 0, 0, 0, 0, 0]),
    quat('Bip01_R_Hand.quaternion', [0, 0.1, 0, 0.995]),
  ]);
  const run = new AnimationClip('Run', 0.7, [quat('Bip01_R_Finger1.quaternion', [0, 0, 0.7, 0.714])]);

  it('holds the idle finger pose in a clip that has no finger rotations', () => {
    const [, w] = withRelaxedHands([idle, walk, run]);
    const t = w.tracks.find((x) => x.name === 'Bip01_R_Finger1.quaternion')!;
    expect(Array.from(t.values)).toEqual([...curl, ...curl].map((v) => expect.closeTo(v, 6)));
    expect(Array.from(t.times)).toEqual([0, expect.closeTo(1.2, 6)]);
  });

  it('leaves wrists, authored finger tracks and the source clips alone', () => {
    const [i, w, r] = withRelaxedHands([idle, walk, run]);
    expect(i).toBe(idle);
    expect(r).toBe(run);
    expect(w).not.toBe(walk);
    expect(walk.tracks.length).toBe(2);
    expect(w.tracks.filter((x) => x.name === 'Bip01_R_Hand.quaternion')[0].values).toEqual(walk.tracks[1].values);
  });

  it('does nothing without an idle clip', () => {
    const list = [walk, run];
    expect(withRelaxedHands(list)).toBe(list);
  });
});
