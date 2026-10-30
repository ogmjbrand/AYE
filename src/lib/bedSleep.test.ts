import { describe, expect, it } from 'vitest';
import { BED_DOWN_SECONDS, BED_UP_SECONDS, bedFrame, bedToRoom, duvetHeight, duvetTop, mattressTop, sideSleepPose } from './bedSleep';
import { INTERIORS, bedSpot } from './interiors';

const homes = Object.values(INTERIORS).filter((i) => i.furniture.some((f) => f.kind === 'bed'));
const bedOf = (i: (typeof homes)[number]) => i.furniture.find((f) => f.kind === 'bed')!;

describe('going to bed', () => {
  it('lays everyone, short or tall, on the mattress: head by the pillows, feet and knees inside the bed', () => {
    expect(homes.length).toBeGreaterThan(5);
    for (const home of homes) {
      const bed = bedOf(home);
      const [w, , d] = bed.size;
      for (const cm of [150, 170, 200]) {
        const p = sideSleepPose(bed, cm);
        const crown = p.pelvis[1] + 0.53 * (cm / 100);
        expect(crown, `${home.tier} ${cm}`).toBeLessThanOrEqual(d / 2);
        expect(p.toes[1], `${home.tier} ${cm}`).toBeGreaterThanOrEqual(-d / 2);
        expect(p.knee[0], `${home.tier} ${cm}`).toBeLessThanOrEqual(w / 2);
        expect(p.pelvis[0] - 0.2, `${home.tier} ${cm}`).toBeGreaterThanOrEqual(-w / 2);
        expect(p.lieY).toBeCloseTo(mattressTop(bed) + 0.16, 5);
      }
    }
  });

  it('starts where you stood, sits you on the edge, then tips you over onto your side under the duvet', () => {
    const home = homes[0];
    const bed = bedOf(home);
    const p = sideSleepPose(bed, 168);
    const [bx, bz] = bedSpot(home);
    const from = { x: bx, z: bz, direction: 0 };
    const start = bedFrame(p, 0, false, from);
    expect(start.pivot[0]).toBeCloseTo(bx, 5);
    expect(start.pivot[2]).toBeCloseTo(bz, 5);
    expect(start.seated).toBeNull();
    // Sitting down onto the edge with the sit-down clip, then seated
    expect(bedFrame(p, 1.5, false, from).seated).toBe('SitDown');
    // Sitting on the edge, back to the bed, upright
    const sitting = bedFrame(p, 2.8, false, from);
    expect(sitting.seated).toBe('Sit');
    expect(sitting.roll).toBe(0);
    expect(sitting.yaw).toBeCloseTo(p.heading + Math.PI / 2, 5);
    expect(sitting.pivot[0]).toBeCloseTo(bedToRoom(p, p.edgeX, p.pelvis[1])[0], 5);
    // Lying on the side, duvet up
    const lying = bedFrame(p, BED_DOWN_SECONDS, false, from);
    expect(lying.roll).toBeCloseTo(Math.PI / 2, 5);
    expect(lying.cover).toBe(1);
    expect(lying.pivot[1]).toBeCloseTo(p.lieY, 5);
    // The tip is gradual: half way through it, the body is half over
    const mid = bedFrame(p, 4, false, from);
    expect(mid.roll).toBeGreaterThan(0.3);
    expect(mid.roll).toBeLessThan(1.3);
  });

  it('gets up by the same movement backwards, ending on your feet beside the bed', () => {
    const bed = bedOf(homes[0]);
    const p = sideSleepPose(bed, 180);
    const from = { x: 0, z: 0, direction: 0 };
    expect(bedFrame(p, 0, true, from)).toEqual(bedFrame(p, BED_DOWN_SECONDS, false, from));
    // Rising off the edge with the stand-up clip, and on your feet at the end
    expect(bedFrame(p, BED_UP_SECONDS - 0.9, true, from).seated).toBe('StandUp');
    const end = bedFrame(p, BED_UP_SECONDS, true, from);
    expect(end.seated).toBeNull();
    expect(end.roll).toBe(0);
    expect(end.cover).toBe(0);
    const [sx, sz] = bedToRoom(p, p.standX, p.pelvis[1]);
    expect(end.pivot[0]).toBeCloseTo(sx, 5);
    expect(end.pivot[2]).toBeCloseTo(sz, 5);
  });

  it('shapes the duvet over the body on its side and lets it hang over the edges', () => {
    const bed = bedOf(homes[0]);
    const [w, , d] = bed.size;
    const p = sideSleepPose(bed, 170);
    const hip = duvetHeight(p.hip[0], p.hip[1], w, d, p);
    // Raised over the hip, the drawn-up knees and the stacked feet; flat away from the body
    for (const part of [p.hip, p.knee, p.ankle, p.toes]) expect(duvetHeight(part[0], part[1], w, d, p)).toBeGreaterThan(0.25);
    expect(hip).toBeGreaterThan(duvetHeight(-w / 2 + 0.05, -d / 2 + 0.1, w, d, p));
    expect(duvetHeight(w / 2 + 0.1, 0, w, d, p)).toBeLessThan(0);
    expect(duvetHeight(0, -d / 2 - 0.1, w, d, p)).toBeLessThan(0);
    // Drawn up from the foot: further up the bed the more it's pulled
    expect(duvetTop(p, d, 1)).toBeCloseTo(p.coverTo, 5);
    expect(duvetTop(p, d, 0)).toBeLessThan(duvetTop(p, d, 0.5));
  });
});
