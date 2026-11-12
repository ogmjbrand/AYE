import { afterEach, describe, expect, it } from 'vitest';
import { moveCircle, overlaps, solveCircle, type Body } from './collision';
import { BODY_RADIUS, PERSONAL_SPACE, avoidStep, bodyOf, clearBodies, setBody, type Avoidance } from './bodies';
import { CAMERA_MIN_DISTANCE, clearCameraDistance, liftCameraClear, nextCameraDistance } from './cameraCollision';
import { DANFO_SIZE, PLAYER_RADIUS, WORLD_BOUND, setActiveLayout, type Obstacle } from './world';
import { DISTRICTS } from './geography';
import { INTERIORS, interiorLayout } from './interiors';
import { findPath, walkGridFor } from './pathfinding';

const R = PLAYER_RADIUS;
const box = (x: number, z: number, w: number, d: number, h = 3): Obstacle => ({ position: [x, 0, z], size: [w, h, d] });
/** Walk at run speed (3.5 m/s) for `seconds` at `fps`, heading (hx, hz). */
function walk(x: number, z: number, hx: number, hz: number, obstacles: readonly Obstacle[], { seconds = 3, fps = 60, bodies = [] as Body[] } = {}) {
  const dt = 1 / fps, n = Math.round(seconds * fps), len = Math.hypot(hx, hz);
  let p = { x, z };
  for (let i = 0; i < n; i++) p = moveCircle(p.x, p.z, (hx / len) * 3.5 * dt, (hz / len) * 3.5 * dt, R, obstacles, bodies);
  return p;
}
const inside = (p: { x: number; z: number }, obstacles: readonly Obstacle[], bodies: readonly Body[] = []) => overlaps(p.x, p.z, R - 1e-3, obstacles, bodies);

afterEach(() => clearBodies());

describe('characters and the world', () => {
  const wall = box(0, 5, 10, 0.2);

  it('1. walking straight into a wall stops at it', () => {
    const p = walk(0, 0, 0, 1, [wall]);
    expect(p.z).toBeCloseTo(5 - 0.1 - R, 3);
    expect(inside(p, [wall])).toBe(false);
  });

  it('2. walking into a wall at an angle slides along it', () => {
    const p = walk(0, 4, 1, 1, [wall], { seconds: 1 });
    expect(p.z).toBeLessThanOrEqual(5 - 0.1 - R + 1e-6);
    expect(p.x).toBeGreaterThan(1.5); // kept moving along the wall
  });

  it('3. a bus is solid from every side', () => {
    const bus: Obstacle = { position: [0, 0, 0], size: DANFO_SIZE };
    for (let a = 0; a < 16; a++) {
      const th = (a / 16) * Math.PI * 2;
      const p = walk(Math.sin(th) * 6, Math.cos(th) * 6, -Math.sin(th), -Math.cos(th), [bus]);
      expect(inside(p, [bus]), `from direction ${a}`).toBe(false);
    }
  });

  it('4. another person is solid, and you slide round them', () => {
    const other: Body = { x: 0, z: 3, r: BODY_RADIUS };
    const head = walk(0, 0, 0, 1, [], { bodies: [other], seconds: 1 });
    expect(Math.hypot(head.x - other.x, head.z - other.z)).toBeGreaterThanOrEqual(R + other.r - 1e-3);
    // Slightly off-centre, you go round them and carry on
    const past = walk(0.2, 0, 0, 1, [], { bodies: [other], seconds: 2 });
    expect(past.z).toBeGreaterThan(other.z + 0.5);
  });

  it('no tunnelling through thin things, even at 10 fps', () => {
    const lamp = box(0, 2, 0.25, 0.25, 4);
    for (const off of [-0.2, 0, 0.2]) {
      const p = walk(off, 0, 0, 1, [lamp], { fps: 10, seconds: 2 });
      expect(inside(p, [lamp])).toBe(false);
    }
    const thinWall = box(0, 2, 6, 0.1);
    expect(walk(0, 0, 0, 1, [thinWall], { fps: 10 }).z).toBeLessThan(2);
  });

  it('a corner between two boxes never leaves you inside either', () => {
    const corner = [box(0, 3, 4, 1), box(2.5, 1, 1, 4)];
    const p = walk(0, 0, 1, 1, corner);
    expect(inside(p, corner)).toBe(false);
  });

  it('the world edge holds, and a building at the edge does not push you through it', () => {
    const edge = box(-WORLD_BOUND + 4, 0, 8, 6);
    const p = walk(-WORLD_BOUND + 0.5, 0, -1, 0.2, [edge]);
    expect(p.x).toBeGreaterThanOrEqual(-WORLD_BOUND);
    expect(inside(p, [edge])).toBe(false);
  });

  it('wedged with no room, you stay where you last stood clear', () => {
    const jaws = [box(-0.5, 0, 0.6, 2), box(0.5, 0, 0.6, 2)];
    expect(solveCircle(0, 0, R, jaws)).toBeNull();
    const p = moveCircle(0, -3, 0, 2.5, R, jaws);
    expect(inside(p, jaws)).toBe(false);
    expect(p.blocked).toBe(true);
  });

  it('every walk in every city ends clear of everything (the bug players hit)', () => {
    for (const d of DISTRICTS) {
      setActiveLayout(d.layout);
      const os = d.layout.obstacles;
      for (let sx = -40; sx <= 40; sx += 10) for (let sz = -40; sz <= 40; sz += 10) {
        const start = solveCircle(sx, sz, R, os);
        if (!start) continue;
        for (let a = 0; a < 8; a++) {
          const th = (a / 8) * Math.PI * 2;
          const p = walk(start.x, start.z, Math.sin(th), Math.cos(th), os, { seconds: 1.5, fps: 20 });
          expect(inside(p, os), `${d.id} from ${sx},${sz} heading ${a}: ${p.x.toFixed(2)},${p.z.toFixed(2)}`).toBe(false);
        }
      }
    }
  }, 60_000);
});

describe('homes', () => {
  const room = INTERIORS.flat;
  const layout = interiorLayout(room);

  it('11. you walk round furniture, never into it', () => {
    const o = layout.obstacles;
    for (const f of room.furniture) {
      // From a clear spot in front of each piece (any of four sides), walk straight at it
      for (const [ox, oz] of [[0, 1.6], [0, -1.6], [1.6, 0], [-1.6, 0]]) {
        const start = solveCircle(f.at[0] + ox, f.at[1] + oz, R, o);
        if (!start || inside(start, o)) continue;
        const p = walk(start.x, start.z, -ox, -oz, o, { seconds: 2 });
        expect(inside(p, o), f.kind).toBe(false);
      }
    }
  });

  it('12. a doorway wide enough for a body lets you through; a gap too narrow does not', () => {
    const doorway = (gap: number) => [box(-2 - gap / 2, 0, 4, 0.2), box(2 + gap / 2, 0, 4, 0.2)];
    expect(walk(0, -2, 0, 1, doorway(0.9), { seconds: 2 }).z).toBeGreaterThan(1);
    expect(walk(0, -2, 0, 1, doorway(0.5), { seconds: 2 }).z).toBeLessThan(0);
    // Slightly off the middle of a 0.9 m door, you're guided through rather than stopped
    expect(walk(0.25, -2, 0, 1, doorway(0.9), { seconds: 2 }).z).toBeGreaterThan(1);
  });
});

describe('NPCs', () => {
  const free = () => true;

  it('5. two people walking at each other pass, keeping their distance, without a stand-off', () => {
    const a: Avoidance = { ox: 0, oz: 0 }, b: Avoidance = { ox: 0, oz: 0 };
    let az = 0, bz = 8, minGap = Infinity, aRight = 0, bRight = 0;
    for (let i = 0; i < 400; i++) {
      az += 1.2 / 60; bz -= 1.2 / 60;
      const pa = avoidStep(a, 'a', 0, az, 0, 1, 1 / 60, free);
      const pb = avoidStep(b, 'b', 0, bz, 0, -1, 1 / 60, free);
      minGap = Math.min(minGap, Math.hypot(pa.x - pb.x, pa.z - pb.z));
      aRight = Math.max(aRight, pa.x); bRight = Math.min(bRight, pb.x);
    }
    // They kept clear of each other's bodies (most of the way to full personal space), and stepped opposite ways
    expect(minGap).toBeGreaterThan(2 * BODY_RADIUS);
    expect(minGap).toBeGreaterThan(2 * BODY_RADIUS + PERSONAL_SPACE * 0.5);
    // Each kept to their own right (east for the one heading north, west for the one heading south)
    expect(aRight).toBeGreaterThan(0.1);
    expect(bRight).toBeLessThan(-0.1);
  });

  it('someone standing still is walked round, and the walker returns to their path afterwards', () => {
    setBody('still', 0, 3, { still: true });
    const s: Avoidance = { ox: 0, oz: 0 };
    let minGap = Infinity, p = { x: 0, z: 0 };
    for (let i = 0; i < 600; i++) {
      p = avoidStep(s, 'walker', 0, i * 1.2 / 60, 0, 1, 1 / 60, free);
      minGap = Math.min(minGap, Math.hypot(p.x, p.z - 3));
    }
    expect(minGap).toBeGreaterThan(2 * BODY_RADIUS);
    expect(Math.abs(p.x)).toBeLessThan(0.05); // back on the path
    expect(bodyOf('walker')).toBeTruthy();
  });

  it('6. stepping aside never takes an NPC into a wall', () => {
    setBody('other', 0.1, 1);
    const wallRight = box(0.6, 1, 0.4, 4);
    const isClear = (x: number, z: number) => !overlaps(x, z, BODY_RADIUS, [wallRight]);
    const s: Avoidance = { ox: 0, oz: 0 };
    for (let i = 0; i < 120; i++) {
      const p = avoidStep(s, 'npc', 0, 0.2 + i * 0.01, 0, 1, 1 / 60, isClear);
      expect(isClear(p.x, p.z)).toBe(true);
    }
  });

  it('6. NPC routes round buildings come from the walk grid, so they go round, not through', () => {
    const lagos = DISTRICTS[0].layout;
    const g = walkGridFor(lagos.obstacles);
    const path = findPath(g, { x: -6, z: 20 }, { x: 6, z: -20 });
    expect(path).not.toBeNull();
    for (let i = 1; i < path!.length; i++) {
      const [a, b] = [path![i - 1], path![i]];
      for (let t = 0; t <= 1; t += 0.05) {
        expect(overlaps(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, BODY_RADIUS - 0.05, lagos.obstacles)).toBe(false);
      }
    }
  });
});

describe('camera', () => {
  const focus = { x: 0, y: 1.35, z: 0 };
  const back = (x: number, y: number, z: number) => { const l = Math.hypot(x, y, z); return { x: x / l, y: y / l, z: z / l }; };

  it('7. next to a building, the camera comes in front of the wall instead of into it', () => {
    const building = box(0, -4, 10, 4, 12); // its face is 2 m behind you
    const d = clearCameraDistance(focus, back(0, 0.35, -1), 8, [building]);
    expect(d).toBeLessThan(2.2);
    expect(d).toBeGreaterThan(1.3);
  });

  it('8. beside a bus, the camera stops short of it; a bench is looked over', () => {
    const bus: Obstacle = { position: [0, 0, -3], size: DANFO_SIZE };
    expect(clearCameraDistance(focus, back(0, 0.2, -1), 8, [bus])).toBeLessThan(1.8);
    const bench = box(0, -3, 1.6, 0.55, 0.9);
    expect(clearCameraDistance(focus, back(0, 0.2, -1), 8, [bench])).toBe(8);
  });

  it('9. indoors, a tall wardrobe between you and the camera brings it in', () => {
    const wardrobe = box(0, -1.6, 1.2, 0.6, 2.1);
    expect(clearCameraDistance(focus, back(0, 0.25, -1), 5, [wardrobe])).toBeLessThan(1.4);
    // Standing in a doorway (inside the box of the opening's wall) doesn't snap the camera onto you
    const around = box(0, 0, 1.4, 0.4, 3);
    expect(clearCameraDistance(focus, back(0, 0.3, -1), 5, [around])).toBe(5);
  });

  it('7b. right up against a wall, the camera rises over your shoulder rather than entering it', () => {
    const wall = box(0, -1.5, 10, 2, 12); // its face 0.5 m behind you
    const dir = back(0, 0.3, -1);
    expect(clearCameraDistance(focus, dir, 8, [wall])).toBeLessThan(CAMERA_MIN_DISTANCE);
    const { lift, dir: up } = liftCameraClear(focus, dir, CAMERA_MIN_DISTANCE, [wall]);
    expect(lift).toBeGreaterThan(0);
    expect(clearCameraDistance(focus, up, CAMERA_MIN_DISTANCE, [wall])).toBeGreaterThanOrEqual(CAMERA_MIN_DISTANCE - 1e-3);
    // With room, no lift at all
    expect(liftCameraClear(focus, dir, CAMERA_MIN_DISTANCE, []).lift).toBe(0);
  });

  it('10. the camera comes in at once and returns smoothly when clear', () => {
    let at = 8;
    at = nextCameraDistance(at, 8, 2, 1 / 60);
    expect(at).toBe(2); // in at once: never through the wall
    const path: number[] = [];
    for (let i = 0; i < 180; i++) { at = nextCameraDistance(at, 8, 8, 1 / 60); path.push(at); }
    expect(path[0]).toBeLessThan(2.5); // no jump back
    for (let i = 1; i < path.length; i++) expect(path[i]).toBeGreaterThanOrEqual(path[i - 1]);
    expect(at).toBeGreaterThan(7.9);
    // Never closer than the head
    expect(nextCameraDistance(8, 8, 0.2, 1 / 60)).toBe(CAMERA_MIN_DISTANCE);
  });
});
