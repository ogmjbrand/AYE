import { describe, expect, it } from 'vitest';
import { SEAT_MOVE_SECONDS, SEAT_TURN_SECONDS, seatMoveFrame, seatedSpot, standSpot, type Seat } from './seating';
import { furnitureSeat, sofaFacing } from './furniture';
import { INTERIORS } from './interiors';

const seat: Seat = { id: 's', x: 1, z: 2, facing: Math.PI / 2, height: 0.45 };

describe('sitting down and getting up', () => {
  it('turns its back to the seat where it stands, then lowers onto it with the sit-down clip', () => {
    const from = { seat, up: false, startedAt: 0, fromYaw: -Math.PI / 2 };
    const start = seatMoveFrame(from, 0);
    expect(start.clip).toBe('Stand');
    expect(start.x).toBeCloseTo(standSpot(seat).x, 5);
    expect(start.yaw).toBeCloseTo(-Math.PI / 2, 5);
    const turned = seatMoveFrame(from, SEAT_TURN_SECONDS + 0.01);
    expect(turned.clip).toBe('SitDown');
    expect(Math.cos(turned.yaw - seat.facing)).toBeCloseTo(1, 5);
    const end = seatMoveFrame(from, SEAT_TURN_SECONDS + SEAT_MOVE_SECONDS);
    expect(end.done).toBe(true);
    expect(end.x).toBeCloseTo(seatedSpot(seat).x, 5);
    expect(end.z).toBeCloseTo(seatedSpot(seat).z, 5);
  });

  it('gets up with the stand-up clip, rising from the seat to the spot in front of it', () => {
    const up = { seat, up: true, startedAt: 0, fromYaw: seat.facing };
    expect(seatMoveFrame(up, 0).clip).toBe('StandUp');
    expect(seatMoveFrame(up, 0).x).toBeCloseTo(seatedSpot(seat).x, 5);
    const end = seatMoveFrame(up, SEAT_MOVE_SECONDS);
    expect(end.done).toBe(true);
    expect(end.x).toBeCloseTo(standSpot(seat).x, 5);
  });
});

describe('sofas and armchairs at home', () => {
  it('face into the room, so you sit facing away from the wall behind them, and are approached from the room', () => {
    let sofas = 0;
    for (const home of Object.values(INTERIORS)) {
      for (const f of home.furniture) {
        const s = furnitureSeat(f, 'x');
        if (f.kind !== 'sofa' && f.kind !== 'armchair') { expect(s).toBeNull(); continue; }
        expect(s).not.toBeNull();
        if (f.kind !== 'sofa') continue;
        sofas++;
        const face = sofaFacing(f);
        // Facing into the room: towards its middle along the facing direction
        expect(Math.sin(face) * -f.at[0] + Math.cos(face) * -f.at[1], home.tier).toBeGreaterThanOrEqual(-1e-9);
        // The approach is inside the room
        expect(Math.abs(s!.approach!.x), home.tier).toBeLessThan(home.width / 2);
        expect(Math.abs(s!.approach!.z), home.tier).toBeLessThan(home.depth / 2);
      }
    }
    expect(sofas).toBeGreaterThan(5);
  });
});
