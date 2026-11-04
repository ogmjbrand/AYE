/**
 * Real 3D garments for the Rocketbox people, built from the person's own
 * body and skinned to their own skeleton (`Bip01`), so they move with every
 * clip the person plays: idle, walk, run, sit, gestures.
 *
 * How each garment is made, in the skeleton's bind pose:
 * - Fitted parts (a bodice, a blazer, the seat of trousers) are cut from the
 *   body's own surface where it is driven by the right bones, pushed out by
 *   the fabric's thickness, and keep the body's skin weights.
 * - Loose parts (a wrapper skirt, wide trouser legs, bell sleeves, a peplum)
 *   are rings measured round the body at each height with ease added, and
 *   shared between hip, thigh and calf (lib/garmentMath.ts) so they swing
 *   with the legs instead of being walked through.
 * - A gele is pleated rings round the head and hair, weighted to the head.
 *
 * Each garment is one mesh and one material (one draw call), cached per body
 * so every copy of a person shares its geometry.
 */
import {
  BufferAttribute, BufferGeometry, CanvasTexture, DoubleSide, FrontSide, Matrix3, Matrix4, MeshStandardMaterial,
  RepeatWrapping, SRGBColorSpace, SkinnedMesh, Vector3, type Material, type Mesh, type Object3D,
} from 'three';
import { geleShape, limbInfluences, ringRadii, skirtInfluences, smoothstep, topFour, type Influences } from '../lib/garmentMath';
import type { GarmentKind, GarmentFabric } from '../lib/fashion';

const SECTORS = 32;

interface Rig {
  pelvis: number; spine: number; spine1: number; spine2: number; neck: number; head: number;
  lClav: number; rClav: number; lUpper: number; rUpper: number; lFore: number; rFore: number; lHand: number; rHand: number;
  lThigh: number; rThigh: number; lCalf: number; rCalf: number; lFoot: number; rFoot: number; lToe: number; rToe: number;
}
const RIG_NAMES: Record<keyof Rig, string> = {
  pelvis: 'pelvis', spine: 'spine', spine1: 'spine1', spine2: 'spine2', neck: 'neck', head: 'head',
  lClav: 'lclavicle', rClav: 'rclavicle', lUpper: 'lupperarm', rUpper: 'rupperarm', lFore: 'lforearm', rFore: 'rforearm', lHand: 'lhand', rHand: 'rhand',
  lThigh: 'lthigh', rThigh: 'rthigh', lCalf: 'lcalf', rCalf: 'rcalf', lFoot: 'lfoot', rFoot: 'rfoot', lToe: 'ltoe0', rToe: 'rtoe0',
};

/** The body in the skeleton's bind space, with a person-sized frame (up, left, forward) and a metre. */
interface BodyFrame {
  body: SkinnedMesh;
  rig: Rig;
  bones: Vector3[];
  /** Bind-space positions and welded normals of the body's vertices. */
  pos: Vector3[];
  nrm: Vector3[];
  skinIndex: number[][];
  skinWeight: number[][];
  index: number[];
  /** Head and hair vertices (other meshes on the same skeleton). */
  headPos: Vector3[];
  origin: Vector3;
  up: Vector3; left: Vector3; fwd: Vector3;
  /** Bind units per metre. */
  m: number;
}

const norm = (name: string) => name.toLowerCase().replace(/^bip01/, '').replace(/[\s_.:-]/g, '');

function frameOf(body: SkinnedMesh, others: SkinnedMesh[]): BodyFrame | null {
  const bones = body.skeleton.bones;
  const rig = {} as Rig;
  for (const [key, want] of Object.entries(RIG_NAMES) as [keyof Rig, string][]) {
    const i = bones.findIndex((b) => norm(b.name) === want);
    if (i < 0) return null;
    rig[key] = i;
  }
  const bonePos = body.skeleton.boneInverses.map((inv) => new Vector3().setFromMatrixPosition(new Matrix4().copy(inv).invert()));
  const g = body.geometry;
  const P = g.getAttribute('position'), N = g.getAttribute('normal'), SI = g.getAttribute('skinIndex'), SW = g.getAttribute('skinWeight');
  const nm = new Matrix3().getNormalMatrix(body.bindMatrix);
  const pos: Vector3[] = [], raw: Vector3[] = [], skinIndex: number[][] = [], skinWeight: number[][] = [];
  for (let i = 0; i < P.count; i++) {
    pos.push(new Vector3(P.getX(i), P.getY(i), P.getZ(i)).applyMatrix4(body.bindMatrix));
    raw.push(new Vector3(N.getX(i), N.getY(i), N.getZ(i)).applyMatrix3(nm).normalize());
    skinIndex.push([SI.getX(i), SI.getY(i), SI.getZ(i), SI.getW(i)]);
    skinWeight.push([SW.getX(i), SW.getY(i), SW.getZ(i), SW.getW(i)]);
  }
  // Weld normals across UV seams so the fabric pushed out along them doesn't split
  const key = (v: Vector3) => `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
  const sums = new Map<string, Vector3>();
  pos.forEach((p, i) => { const k = key(p); sums.set(k, (sums.get(k) ?? new Vector3()).add(raw[i])); });
  const nrm = pos.map((p) => sums.get(key(p))!.clone().normalize());
  const index = g.index ? Array.from(g.index.array as ArrayLike<number>) : pos.map((_, i) => i);
  const headPos: Vector3[] = [];
  for (const o of others) {
    const a = o.geometry.getAttribute('position');
    for (let i = 0; i < a.count; i++) headPos.push(new Vector3(a.getX(i), a.getY(i), a.getZ(i)).applyMatrix4(o.bindMatrix));
  }
  const feet = bonePos[rig.lFoot].clone().add(bonePos[rig.rFoot]).multiplyScalar(0.5);
  const up = bonePos[rig.head].clone().sub(feet).normalize();
  const toes = bonePos[rig.lToe].clone().add(bonePos[rig.rToe]).multiplyScalar(0.5).sub(feet);
  const fwd = toes.sub(up.clone().multiplyScalar(toes.dot(up))).normalize();
  const left = new Vector3().crossVectors(up, fwd).normalize();
  // The lowest point of the body is the ground; the person's height sets the metre
  let lo = Infinity, hi = -Infinity;
  for (const p of [...pos, ...headPos]) { const y = p.clone().sub(feet).dot(up); lo = Math.min(lo, y); hi = Math.max(hi, y); }
  const origin = feet.clone().add(up.clone().multiplyScalar(lo));
  return { body, rig, bones: bonePos, pos, nrm, skinIndex, skinWeight, index, headPos, origin, up, left, fwd, m: (hi - lo) / 1.7 };
}

/** A point as (x left, y up, z forward) from the ground between the feet. */
const local = (f: BodyFrame, p: Vector3) => { const d = p.clone().sub(f.origin); return { x: d.dot(f.left), y: d.dot(f.up), z: d.dot(f.fwd) }; };
const world = (f: BodyFrame, x: number, y: number, z: number) =>
  f.origin.clone().addScaledVector(f.left, x).addScaledVector(f.up, y).addScaledVector(f.fwd, z);

/** Builds one garment's arrays piece by piece. */
class Cloth {
  pos: number[] = []; uv: number[] = []; si: number[] = []; sw: number[] = []; idx: number[] = [];
  readonly f: BodyFrame;
  constructor(f: BodyFrame) { this.f = f; }
  vertex(p: Vector3, inf: Influences, u: number, v: number) {
    this.pos.push(p.x, p.y, p.z);
    this.uv.push(u, v);
    const four = topFour(inf);
    for (let k = 0; k < 4; k++) { this.si.push(four[k]?.[0] ?? 0); this.sw.push(four[k]?.[1] ?? 0); }
    return this.pos.length / 3 - 1;
  }
  /** Cylindrical cloth UVs: round the body and up it, in metres, so a print keeps its scale everywhere. */
  uvAt(p: Vector3) {
    const l = local(this.f, p);
    return [(Math.atan2(l.x, l.z) / (Math.PI * 2) + 0.5) * 3.2, l.y / this.f.m * 2];
  }
  /**
   * The body's own surface where `bones` drive it (over half the vertex's weight),
   * between two heights (metres), pushed out by `thickness` metres.
   */
  shell(bones: readonly number[], thickness: number, yMin = -Infinity, yMax = Infinity, outset?: (y: number) => number) {
    const f = this.f;
    const set = new Set(bones);
    const member = f.skinIndex.map((ix, i) => ix.reduce((s, b, k) => s + (set.has(b) ? f.skinWeight[i][k] : 0), 0));
    const yAt = f.pos.map((p) => local(f, p).y / f.m);
    const map = new Map<number, number>();
    const take = (i: number) => {
      let n = map.get(i);
      if (n === undefined) {
        const extra = outset ? outset(yAt[i]) : 0;
        const p = f.pos[i].clone().addScaledVector(f.nrm[i], (thickness + extra) * f.m);
        const [u, v] = this.uvAt(p);
        n = this.vertex(p, f.skinIndex[i].map((b, k) => [b, f.skinWeight[i][k]] as [number, number]), u, v);
        map.set(i, n);
      }
      return n;
    };
    for (let t = 0; t < f.index.length; t += 3) {
      const a = f.index[t], b = f.index[t + 1], c = f.index[t + 2];
      if (member[a] < 0.5 || member[b] < 0.5 || member[c] < 0.5) continue;
      if ([a, b, c].some((i) => yAt[i] < yMin || yAt[i] > yMax)) continue;
      this.idx.push(take(a), take(b), take(c));
    }
  }
  /** The body's radius round (cx, cz) at height y (metres), per sector, from vertices that `keep` allows. */
  measure(points: readonly Vector3[], y: number, cx: number, cz: number, band = 0.03, keep?: (i: number) => boolean) {
    const f = this.f;
    const out: (number | null)[] = new Array(SECTORS).fill(null);
    points.forEach((p, i) => {
      if (keep && !keep(i)) return;
      const l = local(f, p);
      if (Math.abs(l.y / f.m - y) > band) return;
      const dx = (l.x / f.m) - cx, dz = (l.z / f.m) - cz;
      const a = Math.atan2(dx, dz);
      const s = Math.floor(((a + Math.PI) / (Math.PI * 2)) * SECTORS) % SECTORS;
      const r = Math.hypot(dx, dz);
      out[s] = Math.max(out[s] ?? 0, r);
    });
    return out;
  }
  /**
   * A tube of rings round the body, top to bottom. Each ring gives its height,
   * centre and radii (metres) and an optional lift per angle; `bones` gives
   * each vertex its influences from its angle and how far down it is (0–1).
   */
  rings(rings: { y: number; cx: number; cz: number; r: number[]; lift?: (a: number) => number }[], bones: (a: number, depth: number) => Influences, cap = false) {
    const f = this.f;
    const start = this.pos.length / 3;
    rings.forEach((ring, j) => {
      for (let s = 0; s <= SECTORS; s++) {
        const a = -Math.PI + (s / SECTORS) * Math.PI * 2 + Math.PI / SECTORS;
        const r = ring.r[s % SECTORS];
        const y = ring.y + (ring.lift ? ring.lift(a) : 0);
        const p = world(f, (ring.cx + Math.sin(a) * r) * f.m, y * f.m, (ring.cz + Math.cos(a) * r) * f.m);
        this.vertex(p, bones(a, rings.length > 1 ? j / (rings.length - 1) : 0), (s / SECTORS) * 3.2, -ring.y * 2);
      }
    });
    const row = SECTORS + 1;
    for (let j = 0; j < rings.length - 1; j++) for (let s = 0; s < SECTORS; s++) {
      const a = start + j * row + s, b = a + 1, c = a + row, d = c + 1;
      this.idx.push(a, c, b, b, c, d);
    }
    if (cap) {
      const last = rings[rings.length - 1];
      const top = Math.max(...Array.from({ length: SECTORS }, (_, s) => last.y + (last.lift ? last.lift(-Math.PI + (s / SECTORS) * Math.PI * 2) : 0)));
      const c = this.vertex(world(f, last.cx * f.m, (top + 0.01) * f.m, last.cz * f.m), bones(0, 1), 1.6, 0);
      const base = start + (rings.length - 1) * row;
      for (let s = 0; s < SECTORS; s++) this.idx.push(base + s, c, base + s + 1);
    }
  }
  /** A tube along a limb from bone `from` toward bone `to` (fractions t0..t1), radius by fraction (metres). */
  sleeve(from: number, to: number, t0: number, t1: number, radius: (t: number) => number, bones: (t: number) => Influences, steps = 8) {
    const f = this.f;
    const a = f.bones[from], b = f.bones[to];
    const axis = b.clone().sub(a).normalize();
    const u = new Vector3().crossVectors(axis, Math.abs(axis.dot(f.up)) > 0.9 ? f.fwd : f.up).normalize();
    const v = new Vector3().crossVectors(axis, u).normalize();
    const start = this.pos.length / 3;
    for (let j = 0; j <= steps; j++) {
      const t = t0 + (t1 - t0) * (j / steps);
      const c = a.clone().lerp(b, t);
      for (let s = 0; s <= SECTORS; s++) {
        const ang = (s / SECTORS) * Math.PI * 2;
        const r = radius(t) * f.m;
        const p = c.clone().addScaledVector(u, Math.cos(ang) * r).addScaledVector(v, Math.sin(ang) * r);
        this.vertex(p, bones(t), (s / SECTORS) * 1.6, t * 2);
      }
    }
    const row = SECTORS + 1;
    for (let j = 0; j < steps; j++) for (let s = 0; s < SECTORS; s++) {
      const i0 = start + j * row + s, i1 = i0 + 1, i2 = i0 + row, i3 = i2 + 1;
      this.idx.push(i0, i1, i2, i1, i3, i2);
    }
  }
  geometry(): BufferGeometry {
    const g = new BufferGeometry();
    // Back from bind space into the body's own geometry space, so the garment shares its bind matrix.
    // (Not bindMatrixInverse: three.js rewrites that every frame from where the mesh is now.)
    const inv = new Matrix4().copy(this.f.body.bindMatrix).invert();
    const p = new Float32Array(this.pos);
    const v = new Vector3();
    for (let i = 0; i < p.length; i += 3) { v.set(p[i], p[i + 1], p[i + 2]).applyMatrix4(inv); p[i] = v.x; p[i + 1] = v.y; p[i + 2] = v.z; }
    g.setAttribute('position', new BufferAttribute(p, 3));
    g.setAttribute('uv', new BufferAttribute(new Float32Array(this.uv), 2));
    g.setAttribute('skinIndex', new BufferAttribute(new Uint16Array(this.si), 4));
    g.setAttribute('skinWeight', new BufferAttribute(new Float32Array(this.sw), 4));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    return g;
  }
}

/** Radii over a height range, measured on the body and eased. */
function tube(c: Cloth, points: readonly Vector3[], y0: number, y1: number, steps: number, centre: (y: number) => { x: number; z: number },
  ease: (t: number) => number, min: (t: number) => number, keep?: (i: number) => boolean) {
  const out: { y: number; cx: number; cz: number; r: number[] }[] = [];
  let prev: (number | null)[] | null = null;
  for (let j = 0; j <= steps; j++) {
    const t = j / steps;
    const y = y0 + (y1 - y0) * t;
    const { x, z } = centre(y);
    let body = c.measure(points, y, x, z, 0.035, keep);
    if (body.every((r) => r === null) && prev) body = prev;
    prev = body;
    const r = ringRadii(body, ease(t), min(t));
    // A hanging cloth never narrows below the ring above it by much
    if (out.length) { const above = out[out.length - 1].r; for (let s = 0; s < r.length; s++) r[s] = Math.max(r[s], above[s] * 0.96); }
    out.push({ y, cx: x, cz: z, r });
  }
  return out;
}

const metres = (f: BodyFrame, bone: number) => local(f, f.bones[bone]);

function build(kind: GarmentKind, f: BodyFrame): BufferGeometry {
  const c = new Cloth(f);
  const r = f.rig;
  const M = (b: number) => { const l = metres(f, b); return { x: l.x / f.m, y: l.y / f.m, z: l.z / f.m }; };
  const pelvis = M(r.pelvis), spine = M(r.spine), lCalf = M(r.lCalf), rCalf = M(r.rCalf);
  // Hips and legs are measured only from the trunk and legs: in the bind pose the hands hang beside the hips
  const trunk = new Set([r.pelvis, r.spine, r.spine1, r.spine2, r.lThigh, r.rThigh, r.lCalf, r.rCalf, r.lFoot, r.rFoot]);
  const trunkWeight = f.skinIndex.map((ix, i) => ix.reduce((s, b, k) => s + (trunk.has(b) ? f.skinWeight[i][k] : 0), 0));
  const notArms = (i: number) => trunkWeight[i] > 0.6;
  const skirtBones = { pelvis: r.pelvis, leftThigh: r.lThigh, rightThigh: r.rThigh, leftCalf: r.lCalf, rightCalf: r.rCalf };
  const sideOf = (a: number) => Math.max(-1, Math.min(1, Math.sin(a) * 1.1));
  const torso = [r.spine, r.spine1, r.spine2, r.lClav, r.rClav];
  const waist = (spine.y + pelvis.y) / 2;
  switch (kind) {
    case 'buba': {
      // A loose blouse: the torso and upper arms, a hem to the upper thigh and wide bell sleeves
      c.shell([...torso, r.lUpper, r.rUpper], 0.022, waist - 0.02, Infinity, (y) => 0.01 * smoothstep(waist + 0.25, waist, y));
      const hem = tube(c, f.pos, waist, pelvis.y - 0.13, 8, () => ({ x: pelvis.x, z: pelvis.z }), (t) => 0.04 + 0.03 * t, () => 0.12, notArms);
      c.rings(hem, (a, d) => skirtInfluences(skirtBones, sideOf(a), d, 9, 0.35));
      for (const [up, fore, hand] of [[r.lUpper, r.lFore, r.lHand], [r.rUpper, r.rFore, r.rHand]]) {
        c.sleeve(up, fore, 0.55, 1, (t) => 0.06 + 0.012 * (t - 0.55) / 0.45, (t) => limbInfluences(up, up, fore, t, 0.98));
        c.sleeve(fore, hand, 0, 0.55, (t) => 0.072 + 0.07 * smoothstep(0, 0.55, t), () => [[fore, 1]]);
      }
      break;
    }
    case 'iro': {
      // A wrapper skirt from the waist to the ankle, close at the hips and falling straight
      const rings = tube(c, f.pos, waist + 0.02, 0.06, 18, () => ({ x: pelvis.x, z: pelvis.z }), (t) => 0.022 + 0.05 * t, (t) => 0.13 + 0.07 * smoothstep(0.3, 1, t), notArms);
      const knee = Math.min(1, Math.max(0.2, ((waist + 0.02) - (lCalf.y + rCalf.y) / 2) / ((waist + 0.02) - 0.06)));
      c.rings(rings, (a, d) => skirtInfluences(skirtBones, sideOf(a), d, knee, 0.78));
      // The tied waistband: a little proud of the skirt
      const band = tube(c, f.pos, waist + 0.045, waist - 0.02, 2, () => ({ x: pelvis.x, z: pelvis.z }), () => 0.035, () => 0.12, notArms);
      c.rings(band, () => [[r.pelvis, 0.6], [r.spine, 0.4]]);
      break;
    }
    case 'gele': {
      // Pleated rings round the head and hair, rising into a fan at the back
      const head = M(r.head);
      let top = -Infinity;
      for (const p of f.headPos) top = Math.max(top, local(f, p).y / f.m);
      // No head or hair mesh found: the crown is a head's height above the head bone
      if (!Number.isFinite(top)) top = head.y + 0.16;
      const y0 = top - 0.11, y1 = top + 0.025;
      const steps = 7;
      const rings = [];
      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        const y = y0 + (y1 - y0) * t;
        const body = c.measure(f.headPos, Math.min(y, top - 0.01), head.x, head.z, 0.03);
        const base = ringRadii(body, 0.016, 0.075);
        const taper = 1 - 0.35 * smoothstep(0.82, 1, t);
        const radii = base.map((rr, s) => {
          const a = -Math.PI + (s / SECTORS) * Math.PI * 2 + Math.PI / SECTORS;
          const g = geleShape(a, t);
          // The wrap stands out more the higher it goes, most of all at the back and sides: a fan, not a cone
          const side = 0.5 + 0.5 * Math.abs(Math.sin(a));
          return (rr + 0.02 * g.out + 0.075 * smoothstep(0.25, 0.85, t) * Math.max(side, g.rise)) * taper;
        });
        rings.push({ y, cx: head.x, cz: head.z - 0.012, r: radii, lift: (a: number) => 0.05 * geleShape(a, t).rise });
      }
      c.rings(rings, () => [[r.head, 1]], true);
      break;
    }
    case 'blazer': {
      // A tailored jacket: torso and full sleeves, a short skirt over the hips
      c.shell([...torso, r.lUpper, r.rUpper, r.lFore, r.rFore], 0.02, waist - 0.02, Infinity);
      const hem = tube(c, f.pos, waist, pelvis.y - 0.09, 6, () => ({ x: pelvis.x, z: pelvis.z }), (t) => 0.03 + 0.012 * t, () => 0.12, notArms);
      c.rings(hem, (a, d) => skirtInfluences(skirtBones, sideOf(a), d, 9, 0.3));
      break;
    }
    case 'gown': {
      // A strapless bodice cut from the body, and a mermaid skirt: close to the knee, then flaring to the floor
      c.shell([r.spine, r.spine1, r.spine2], 0.014, waist - 0.02, spine.y + 0.36);
      const kneeY = (lCalf.y + rCalf.y) / 2;
      const top = waist + 0.02, bottom = 0.01;
      const kneeT = Math.min(0.9, Math.max(0.2, (top - kneeY) / (top - bottom)));
      const rings = tube(c, f.pos, top, bottom, 22, () => ({ x: pelvis.x, z: pelvis.z }),
        (t) => 0.02 + 0.03 * t + 0.2 * smoothstep(kneeT, 1, t), (t) => 0.11 + 0.22 * smoothstep(kneeT, 1, t), notArms);
      c.rings(rings, (a, d) => skirtInfluences(skirtBones, sideOf(a), d, kneeT, 0.82));
      break;
    }
    case 'shorts':
    case 'wide-trousers': {
      // The seat, then each leg falling wide from the thigh to the floor
      c.shell([r.pelvis], 0.016, pelvis.y - 0.12, waist + 0.03);
      for (const [thigh, calf, foot, sgn] of [[r.lThigh, r.lCalf, r.lFoot, 1], [r.rThigh, r.rCalf, r.rFoot, -1]] as const) {
        const T = M(thigh), C = M(calf), F = M(foot);
        const legSet = new Set([thigh, calf, foot]);
        const onLeg = (i: number) => f.skinIndex[i].reduce((s, b, k) => s + (legSet.has(b) ? f.skinWeight[i][k] : 0), 0) > 0.5
          && Math.sign(local(f, f.pos[i]).x / f.m - pelvis.x) === sgn;
        const centre = (y: number) => {
          const k = y > C.y ? (T.y - y) / Math.max(0.01, T.y - C.y) : 1 + (C.y - y) / Math.max(0.01, C.y - F.y);
          const from = k <= 1 ? T : C, to = k <= 1 ? C : F, t = k <= 1 ? k : k - 1;
          return { x: from.x + (to.x - from.x) * Math.min(1, t), z: from.z + (to.z - from.z) * Math.min(1, t) };
        };
        // Shorts stop a hand above the knee; trousers fall to the floor
        const yTop = pelvis.y - 0.06, yBot = kind === 'shorts' ? C.y + 0.12 : 0.02;
        const shorts = kind === 'shorts';
        const rings = tube(c, f.pos, yTop, yBot, shorts ? 6 : 14, centre,
          (t) => (shorts ? 0.02 + 0.02 * t : 0.02 + 0.09 * smoothstep(0.15, 1, t)),
          (t) => (shorts ? 0.08 + 0.012 * t : 0.085 + 0.08 * smoothstep(0.2, 1, t)), onLeg);
        const kneeAt = (yTop - C.y) / (yTop - yBot);
        c.rings(rings, (_a, d) => limbInfluences(r.pelvis, thigh, calf, d, kneeAt, 0.12));
      }
      break;
    }
  }
  return c.geometry();
}

// --------------------------------------------------------------------------- cloth

const textures = new Map<string, CanvasTexture>();
/** A woven cloth drawn once per fabric and colourway (a small canvas, repeated). */
function clothTexture(fabric: GarmentFabric, colors: readonly [string, string, string]): CanvasTexture {
  const key = `${fabric}|${colors.join(',')}`;
  const hit = textures.get(key);
  if (hit) return hit;
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  const [a, b, cc] = colors;
  g.fillStyle = a; g.fillRect(0, 0, S, S);
  if (fabric === 'aso-oke') {
    // Hand-loomed strips: wide ground stripes, metallic thread and a fine weft
    const bands = [[0, 46, a], [46, 10, b], [56, 6, cc], [62, 10, b], [72, 56, a], [128, 8, cc], [136, 34, b], [170, 8, cc], [178, 50, a], [228, 6, b], [234, 22, a]] as const;
    for (const [x, w, col] of bands) { g.fillStyle = col; g.fillRect(x, 0, w, S); }
    g.globalAlpha = 0.22; g.fillStyle = '#000';
    for (let y = 0; y < S; y += 3) g.fillRect(0, y, S, 1);
    g.globalAlpha = 0.5; g.fillStyle = cc;
    for (let y = 0; y < S; y += 16) for (let x = 0; x < S; x += 32) g.fillRect(x + (y % 32 ? 16 : 0), y, 12, 2);
    g.globalAlpha = 1;
  } else if (fabric === 'satin') {
    // Satin: smooth, with soft lengthwise sheen where the weave catches the light
    const grad = g.createLinearGradient(0, 0, S, 0);
    grad.addColorStop(0, a); grad.addColorStop(0.3, b); grad.addColorStop(0.5, a); grad.addColorStop(0.75, cc); grad.addColorStop(1, a);
    g.fillStyle = grad; g.fillRect(0, 0, S, S);
    g.globalAlpha = 0.06; g.fillStyle = '#fff';
    for (let x = 0; x < S; x += 2) g.fillRect(x, 0, 1, S);
    g.globalAlpha = 1;
  } else {
    // Suiting: a soft twill with a faint chalk stripe
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x += 2) {
      if ((x + y) % 4 < 2) { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x, y, 2, 1); }
    }
    g.fillStyle = b; g.globalAlpha = 0.35;
    for (let x = 0; x < S; x += 32) g.fillRect(x, 0, 1, S);
    g.globalAlpha = 1;
  }
  const t = new CanvasTexture(cv);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  textures.set(key, t);
  return t;
}

const geometries = new WeakMap<BufferGeometry, Map<GarmentKind, BufferGeometry>>();

/** The body mesh and the head and hair meshes that share its skeleton. */
export function findBody(scene: Object3D): { body: SkinnedMesh; others: SkinnedMesh[] } | null {
  const skinned: SkinnedMesh[] = [];
  scene.traverse((o) => { if ((o as SkinnedMesh).isSkinnedMesh && !o.userData.ayeGarment) skinned.push(o as SkinnedMesh); });
  if (!skinned.length) return null;
  const body = skinned.find((s) => /body/i.test((s.material as Material).name ?? '')) ?? skinned.reduce((a, b) => (b.geometry.getAttribute('position').count > a.geometry.getAttribute('position').count ? b : a));
  // Copies of a person (SkeletonUtils.clone) give each mesh its own Skeleton over the same bones: match the bones
  const root = body.skeleton.bones[0];
  return { body, others: skinned.filter((s) => s !== body && s.skeleton.bones[0] === root) };
}

/** Make a garment for this person, or null if their skeleton isn't the Rocketbox biped. */
export function makeGarment(scene: Object3D, kind: GarmentKind, fabric: GarmentFabric, colors: readonly [string, string, string]): SkinnedMesh | null {
  const found = findBody(scene);
  if (!found) return null;
  const { body, others } = found;
  let byKind = geometries.get(body.geometry);
  if (!byKind) { byKind = new Map(); geometries.set(body.geometry, byKind); }
  let geometry = byKind.get(kind);
  if (!geometry) {
    const f = frameOf(body, others);
    if (!f) return null;
    geometry = build(kind, f);
    byKind.set(kind, geometry);
  }
  const loose = kind !== 'blazer';
  const material = new MeshStandardMaterial({
    map: clothTexture(fabric, colors),
    roughness: fabric === 'aso-oke' ? 0.62 : fabric === 'satin' ? 0.3 : 0.82,
    metalness: fabric === 'aso-oke' ? 0.08 : fabric === 'satin' ? 0.12 : 0,
    side: loose ? DoubleSide : FrontSide,
    name: `garment-${kind}`,
  });
  const mesh = new SkinnedMesh(geometry, material);
  mesh.name = `garment-${kind}`;
  mesh.userData.ayeGarment = kind;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.bindMode = body.bindMode;
  mesh.position.copy(body.position);
  mesh.quaternion.copy(body.quaternion);
  mesh.scale.copy(body.scale);
  mesh.bind(body.skeleton, body.bindMatrix);
  return mesh;
}

/** Dress a person: add the garment beside their body mesh; returns the undo. */
export function wear(scene: Object3D, garment: SkinnedMesh): () => void {
  const found = findBody(scene);
  const parent = found?.body.parent;
  if (!parent) return () => {};
  parent.add(garment);
  return () => { parent.remove(garment); (garment.material as Mesh['material'] as MeshStandardMaterial).dispose(); };
}

