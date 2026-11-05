/**
 * Garments made offline as skinned GLB files (scripts/garments/: a GarmentCode
 * sewing pattern, draped on a Rocketbox body in Blender and weighted to its
 * Bip01 skeleton), put on a person in the game.
 *
 * The file carries its own copy of the skeleton. The garment is rebound to the
 * person's own skeleton by bone name: its vertices are moved from the file's
 * bind space into the person's (fitted on the bones' rest positions, so units
 * and placement don't have to match), and each skin index is renamed to the
 * person's bone. The garment then plays every clip the person plays, as the
 * built garments in world/skinnedGarment.ts do.
 */
import {
  BufferAttribute, BufferGeometry, DoubleSide, Matrix4, Quaternion, Vector3, SkinnedMesh,
  type Material, type MeshStandardMaterial, type Object3D,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { assetUrl } from '../lib/assetManifest';
import { findBody } from './skinnedGarment';

/** A bone's name, the same however a tool spelled it ("Bip01 L Thigh", "Bip01_L_Thigh"). */
export const boneKey = (name: string) => name.toLowerCase().replace(/[\s_.:-]/g, '');

/**
 * The rotation, uniform scale and translation taking points `from` onto points `to` (least
 * squares: Horn's quaternion method), and how far off the worst point lands.
 */
export function fitSimilarity(from: readonly Vector3[], to: readonly Vector3[]): { matrix: Matrix4; scale: number; worst: number } {
  const n = from.length;
  const cf = new Vector3(), ct = new Vector3();
  for (let i = 0; i < n; i++) { cf.add(from[i]); ct.add(to[i]); }
  cf.divideScalar(n); ct.divideScalar(n);
  // Cross-covariance S[r][c] = sum of a_r * b_c over the centred points
  const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  let sf = 0, st = 0;
  for (let i = 0; i < n; i++) {
    const a = from[i].clone().sub(cf).toArray(), b = to[i].clone().sub(ct).toArray();
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) S[r][c] += a[r] * b[c];
    sf += a[0] ** 2 + a[1] ** 2 + a[2] ** 2;
    st += b[0] ** 2 + b[1] ** 2 + b[2] ** 2;
  }
  const [[xx, xy, xz], [yx, yy, yz], [zx, zy, zz]] = S;
  const N = [
    [xx + yy + zz, yz - zy, zx - xz, xy - yx],
    [yz - zy, xx - yy - zz, xy + yx, zx + xz],
    [zx - xz, xy + yx, -xx + yy - zz, yz + zy],
    [xy - yx, zx + xz, yz + zy, -xx - yy + zz],
  ];
  // The quaternion is N's top eigenvector: power iteration, shifted so every eigenvalue is positive
  const shift = Math.abs(xx) + Math.abs(xy) + Math.abs(xz) + Math.abs(yx) + Math.abs(yy) + Math.abs(yz) + Math.abs(zx) + Math.abs(zy) + Math.abs(zz);
  let q = [1, 0.01, 0.02, 0.03];
  for (let it = 0; it < 200; it++) {
    const next = N.map((row, r) => row.reduce((acc, v, c) => acc + v * q[c], 0) + shift * q[r]);
    const len = Math.hypot(...next) || 1;
    q = next.map((v) => v / len);
  }
  const rotation = new Matrix4().makeRotationFromQuaternion(new Quaternion(q[1], q[2], q[3], q[0]));
  const scale = sf > 0 ? Math.sqrt(st / sf) : 1;
  const matrix = new Matrix4().makeTranslation(ct.x, ct.y, ct.z)
    .multiply(rotation)
    .multiply(new Matrix4().makeScale(scale, scale, scale))
    .multiply(new Matrix4().makeTranslation(-cf.x, -cf.y, -cf.z));
  let worst = 0;
  for (let i = 0; i < n; i++) worst = Math.max(worst, from[i].clone().applyMatrix4(matrix).distanceTo(to[i]));
  return { matrix, scale, worst };
}

const restPositions = (mesh: SkinnedMesh) =>
  mesh.skeleton.boneInverses.map((inv) => new Vector3().setFromMatrixPosition(new Matrix4().copy(inv).invert()));

/**
 * The garment's geometry in `body`'s bind space with skin indices into `body.skeleton`, or null
 * if the two skeletons don't share enough bones or don't stand the same way.
 */
export function rebindGeometry(garment: SkinnedMesh, body: SkinnedMesh): BufferGeometry | null {
  const byName = new Map(body.skeleton.bones.map((b, i) => [boneKey(b.name), i]));
  const map = garment.skeleton.bones.map((b) => byName.get(boneKey(b.name)) ?? -1);
  const shared = map.flatMap((j, i) => (j >= 0 ? [i] : []));
  if (shared.length < 10) return null;
  const gRest = restPositions(garment), bRest = restPositions(body);
  const fit = fitSimilarity(shared.map((i) => gRest[i]), shared.map((i) => bRest[map[i]]));
  // The rest poses must agree bone for bone (same rig, same pose): a few centimetres at most
  // (Rocketbox bind space is Z-up, glTF's Y-up: take the skeleton's longest extent as its height)
  const lo = bRest.reduce((m, p) => m.min(p), bRest[0].clone()), hi = bRest.reduce((m, p) => m.max(p), bRest[0].clone());
  const bodyHeight = Math.max(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z);
  if (fit.worst > 0.03 * bodyHeight) {
    console.warn(`[AYE garments] this garment's skeleton stands differently from the person's (off by ${(fit.worst / bodyHeight * 100).toFixed(1)}% of their height)`);
    return null;
  }
  // File bind space -> bones' rest frame -> the person's bind space
  const toBody = new Matrix4().copy(body.bindMatrix).invert().multiply(fit.matrix).multiply(garment.bindMatrix);
  const geometry = garment.geometry.clone();
  geometry.applyMatrix4(toBody);
  const si = geometry.getAttribute('skinIndex'), sw = geometry.getAttribute('skinWeight');
  const index = new Uint16Array(si.count * 4), weight = new Float32Array(si.count * 4);
  for (let v = 0; v < si.count; v++) {
    let total = 0;
    for (let k = 0; k < 4; k++) {
      const j = map[si.getComponent(v, k)] ?? -1;
      const w = j >= 0 ? sw.getComponent(v, k) : 0;
      index[v * 4 + k] = Math.max(j, 0);
      weight[v * 4 + k] = w;
      total += w;
    }
    // Weight on a bone the person doesn't have goes to the others; a vertex left with none follows the root
    for (let k = 0; k < 4; k++) weight[v * 4 + k] = total > 0 ? weight[v * 4 + k] / total : k === 0 ? 1 : 0;
  }
  geometry.setAttribute('skinIndex', new BufferAttribute(index, 4));
  geometry.setAttribute('skinWeight', new BufferAttribute(weight, 4));
  geometry.computeBoundingSphere();
  return geometry;
}

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const files = new Map<string, Promise<SkinnedMesh | null>>();
const fitted = new Map<string, WeakMap<BufferGeometry, BufferGeometry | null>>();

/** The first skinned mesh in a garment file (cached). Paths are under public/assets/. */
export function loadGlbGarment(path: string): Promise<SkinnedMesh | null> {
  let p = files.get(path);
  if (!p) {
    p = loader.loadAsync(assetUrl(path)).then(({ scene }) => {
      let found: SkinnedMesh | null = null;
      scene.updateMatrixWorld(true);
      scene.traverse((o) => { if (!found && (o as SkinnedMesh).isSkinnedMesh) found = o as SkinnedMesh; });
      return found;
    });
    files.set(path, p);
    void p.catch(() => files.delete(path));
  }
  return p;
}

/** A copy of the garment from `path` bound to this person's skeleton, or null if it can't be. */
export async function makeGlbGarment(scene: Object3D, path: string, color?: string): Promise<SkinnedMesh | null> {
  const source = await loadGlbGarment(path);
  const found = findBody(scene);
  if (!source || !found) return null;
  const { body } = found;
  let perBody = fitted.get(path);
  if (!perBody) { perBody = new WeakMap(); fitted.set(path, perBody); }
  let geometry = perBody.get(body.geometry);
  if (geometry === undefined) {
    geometry = rebindGeometry(source, body);
    perBody.set(body.geometry, geometry);
  }
  if (!geometry) return null;
  const material = (source.material as Material).clone() as MeshStandardMaterial;
  material.side = DoubleSide;
  if (color && material.color) material.color.set(color);
  const mesh = new SkinnedMesh(geometry, material);
  mesh.name = `garment-glb-${path}`;
  mesh.userData.ayeGarment = path;
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
