import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
// @ts-expect-error: a plain Node script, tested here without its own type declarations
import { jointPositions, loadRocketboxRig, retargetBvh, rgbToBip01 } from '../../scripts/animation/bvh-to-rocketbox.mjs';

/**
 * A BVH in RGB MoCap's generic hierarchy (Y up, facing +Z, left arm along +X),
 * frame 0 a T-pose. Frame 1 bends the left forearm straight up and steps the
 * hips forward and down.
 */
function bvh(): string {
  type J = { name: string; offset: [number, number, number]; children: J[] };
  const j = (name: string, offset: [number, number, number], children: J[] = []): J => ({ name, offset, children });
  const fingers = (side: 'Left' | 'Right', sx: number) => ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'].map((f, i) =>
    j(`${side}Hand${f}1`, [sx * 0.03, 0, 0.03 - i * 0.015], [j(`${side}Hand${f}2`, [sx * 0.03, 0, 0], [j(`${side}Hand${f}3`, [sx * 0.025, 0, 0])])]));
  const arm = (side: 'Left' | 'Right', sx: number) => j(`${side}Shoulder`, [sx * 0.05, 0.12, 0], [j(`${side}Arm`, [sx * 0.12, 0, 0], [j(`${side}ForeArm`, [sx * 0.28, 0, 0], [j(`${side}Hand`, [sx * 0.25, 0, 0], fingers(side, sx))])])]);
  const leg = (side: 'Left' | 'Right', sx: number) => j(`${side}UpLeg`, [sx * 0.09, -0.05, 0], [j(`${side}Leg`, [0, -0.42, 0], [j(`${side}Foot`, [0, -0.42, 0], [j(`${side}ToeBase`, [0, -0.05, 0.12])])])]);
  const hips = j('Hips', [0, 0.95, 0], [
    j('Spine', [0, 0.1, 0], [j('Spine1', [0, 0.12, 0], [j('Spine2', [0, 0.12, 0], [j('Neck', [0, 0.12, 0], [j('Head', [0, 0.1, 0])]), arm('Left', 1), arm('Right', -1)])])]),
    leg('Left', 1), leg('Right', -1),
  ]);
  const order: string[] = [];
  const lines: string[] = ['HIERARCHY'];
  const write = (n: J, depth: number, root: boolean) => {
    const pad = '  '.repeat(depth);
    order.push(n.name);
    lines.push(`${pad}${root ? 'ROOT' : 'JOINT'} ${n.name}`, `${pad}{`, `${pad}  OFFSET ${n.offset.join(' ')}`,
      `${pad}  CHANNELS ${root ? '6 Xposition Yposition Zposition Zrotation Xrotation Yrotation' : '3 Zrotation Xrotation Yrotation'}`);
    if (n.children.length) n.children.forEach((c) => write(c, depth + 1, false));
    else lines.push(`${pad}  End Site`, `${pad}  {`, `${pad}    OFFSET 0 0.05 0`, `${pad}  }`);
    lines.push(`${pad}}`);
  };
  write(hips, 0, true);
  const row = (f: number) => order.flatMap((n) => {
    if (n === 'Hips') return f === 0 ? [0, 0.95, 0, 0, 0, 0] : [0, 0.85, 0.3, 0, 0, 0];
    if (n === 'LeftForeArm' && f === 1) return [90, 0, 0]; // about Z: the forearm along +X turns to +Y (up)
    return [0, 0, 0];
  }).join(' ');
  lines.push('MOTION', 'Frames: 2', 'Frame Time: 0.0333333', row(0), row(1));
  return lines.join('\n');
}

describe('RGB MoCap BVH to the Rocketbox skeleton', () => {
  it('maps every generic joint to a real Rocketbox bone', async () => {
    const rig = await loadRocketboxRig('public/assets/models/characters/rocketbox/female-adult-08.glb');
    const map = rgbToBip01() as Record<string, string>;
    expect(Object.keys(map)).toHaveLength(52);
    for (const target of Object.values(map)) expect(rig.byName.has(target), target).toBe(true);
  }, 60_000);

  it('puts the Biped in the capture\'s T-pose, then carries a bent forearm and a drop of the hips across', async () => {
    const rig = await loadRocketboxRig('public/assets/models/characters/rocketbox/female-adult-08.glb');
    const r = retargetBvh(bvh(), rig);
    expect(r.frames).toBe(2);
    expect(r.driven.length).toBe(52);
    const up = (p: Map<string, Vector3>) => p.get('Bip01 Head')!.clone().sub(p.get('Bip01 Pelvis')!).normalize();
    const p0 = jointPositions(rig, r, 0), p1 = jointPositions(rig, r, 1);
    // Frame 0 is the capture's T-pose on the Biped: arms out level to the sides
    const left = p0.get('Bip01 L Thigh')!.clone().sub(p0.get('Bip01 R Thigh')!).normalize();
    const lForearm0 = p0.get('Bip01 L Hand')!.clone().sub(p0.get('Bip01 L Forearm')!).normalize();
    const rForearm0 = p0.get('Bip01 R Hand')!.clone().sub(p0.get('Bip01 R Forearm')!).normalize();
    expect(lForearm0.dot(left)).toBeGreaterThan(0.97);
    expect(rForearm0.dot(left)).toBeLessThan(-0.97);
    // The legs still hang straight down
    const shin = p0.get('Bip01 L Foot')!.clone().sub(p0.get('Bip01 L Calf')!).normalize();
    expect(shin.dot(up(p0))).toBeLessThan(-0.97);
    // Frame 1: the left forearm points up the body
    const fore = p1.get('Bip01 L Hand')!.clone().sub(p1.get('Bip01 L Forearm')!).normalize();
    expect(fore.dot(up(p0))).toBeGreaterThan(0.95);
    // The right arm hasn't moved (relative to the hips, which dropped)
    const rel = (p: Map<string, Vector3>) => p.get('Bip01 R Hand')!.clone().sub(p.get('Bip01 Pelvis')!);
    expect(rel(p1).distanceTo(rel(p0))).toBeLessThan(0.01);
    // The hips dropped (scaled to the Rocketbox legs) but, held on the spot, didn't travel forward
    const drop = p0.get('Bip01 Pelvis')!.clone().sub(p1.get('Bip01 Pelvis')!).dot(up(p0));
    expect(drop).toBeGreaterThan(0.05);
    const travel = p1.get('Bip01 Pelvis')!.clone().sub(p0.get('Bip01 Pelvis')!);
    // (within millimetres: "up" here is measured on the T-posed spine, the converter's on the bind pose)
    expect(travel.sub(up(p0).multiplyScalar(travel.dot(up(p0)))).length()).toBeLessThan(0.005);
  }, 60_000);
});
