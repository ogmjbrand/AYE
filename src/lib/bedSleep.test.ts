import { describe, expect, it } from 'vitest';
import { duvetHeight, mattressTop, sleepPose } from './bedSleep';
import { INTERIORS } from './interiors';

const beds = Object.values(INTERIORS).map((i) => i.furniture.find((f) => f.kind === 'bed')!).filter(Boolean);

describe('sleeping in bed', () => {
  it('lays every home bed’s sleeper on the mattress, head by the pillows and feet inside the bed', () => {
    expect(beds.length).toBeGreaterThan(5);
    for (const bed of beds) {
      for (const cm of [150, 170, 200]) {
        const pose = sleepPose(bed, cm);
        const d = bed.size[2];
        expect(pose.feetZ).toBeGreaterThanOrEqual(-d / 2 - 0.05);
        expect(pose.feetZ + cm / 100).toBeLessThanOrEqual(d / 2);
        expect(pose.chestZ).toBeGreaterThan(pose.feetZ);
        expect(pose.chestZ).toBeLessThan(d / 2 - 0.3);
        expect(pose.feet[1]).toBeCloseTo(mattressTop(bed) + 0.07, 5);
      }
    }
  });

  it('shapes the duvet over the body and lets it hang over the edges', () => {
    const bed = beds[0];
    const [w, , d] = bed.size;
    const pose = sleepPose(bed, 170);
    const mid = (pose.feetZ + pose.chestZ) / 2;
    // Higher over the body than beside it, and hanging below the surface over the side and the foot
    expect(duvetHeight(0, mid, w, d, pose)).toBeGreaterThan(duvetHeight(w / 2 - 0.1, mid, w, d, pose));
    expect(duvetHeight(w / 2 + 0.1, mid, w, d, pose)).toBeLessThan(0);
    expect(duvetHeight(0, -d / 2 - 0.1, w, d, pose)).toBeLessThan(0);
    // The chest and the upturned feet stand higher than the shins
    const shins = pose.feetZ + (pose.chestZ - pose.feetZ) * 0.3;
    expect(duvetHeight(0, pose.chestZ - 0.05, w, d, pose)).toBeGreaterThan(duvetHeight(0, shins, w, d, pose));
    expect(duvetHeight(0, pose.feetZ + 0.05, w, d, pose)).toBeGreaterThan(duvetHeight(0, shins, w, d, pose));
  });
});
