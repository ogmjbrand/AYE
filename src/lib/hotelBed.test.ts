import { describe, expect, it } from 'vitest';
import { GUEST_ROOM, ROOMS, bedsideSpot, hotelBed, hotelLayout, roomById } from './hotel';
import { bedToRoom, sideSleepPose } from './bedSleep';
import { resolveCollisions } from './world';

describe('the hotel bed', () => {
  const room = roomById(GUEST_ROOM)!;
  const bed = hotelBed(room)!;

  it('is a bed you can go to bed in, in the guest room (west rooms are mirrored, so not there)', () => {
    expect(bed.kind).toBe('bed');
    for (const r of ROOMS) expect(hotelBed(r) === null).toBe(r.side < 0);
  });

  it('lays you on the mattress, head by the pillows and feet inside the bed', () => {
    const [, , d] = bed.size;
    for (const cm of [150, 170, 200]) {
      const p = sideSleepPose(bed, cm);
      expect(p.pelvis[1] + 0.53 * (cm / 100)).toBeLessThanOrEqual(d / 2);
      expect(p.toes[1]).toBeGreaterThanOrEqual(-d / 2);
    }
  });

  it('gets you up on the window side, beside the bed and clear of the furniture', () => {
    const p = sideSleepPose(bed, 170);
    const [x, z] = bedToRoom(p, p.standX, p.pelvis[1]);
    const r = resolveCollisions(x, z, undefined, hotelLayout(true).obstacles);
    expect(Math.hypot(r.x - x, r.z - z)).toBeLessThan(0.01);
    const [sx, sz] = bedsideSpot(room);
    expect(Math.hypot(sx - x, sz - z)).toBeLessThan(0.5);
  });
});
