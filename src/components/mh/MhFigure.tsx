import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Mesh, MeshStandardMaterial, SRGBColorSpace, SphereGeometry, Vector3, type Object3D } from 'three';
import { assetUrl } from '../../lib/assetManifest';
import { MH_BODY_URL, MH_MORPHS, mhInfluences, mhSkinColor, type MhHair } from '../../lib/mhBody';
import type { BodyShape } from '../../lib/bodyShape';

interface Landmarks {
  height: number;
  nipple: [number, number, number];
  pelvis: [number, number, number];
  crotch: [number, number, number];
  hipSide: [number, number, number];
}

const REST_VERTEX = (shader: { vertexShader: string }) => {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nattribute vec3 _rest;\nvarying vec3 vRest;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = _rest;');
};

/**
 * Skin with a black two-piece placed by the body's rest-pose coordinates
 * (so it follows every morph): triangle cups with halter and under-bust
 * strings, and a bottom whose leg line runs from the hips to the crotch.
 */
function skinMaterial(lm: Landmarks) {
  const m = new MeshStandardMaterial({ roughness: 0.52, metalness: 0 });
  const uniforms = { uNip: { value: new Vector3(...lm.nipple) }, uCrotchY: { value: lm.crotch[1] }, uPelvisZ: { value: lm.pelvis[2] }, uHipX: { value: lm.hipSide[0] }, uSuit: { value: 1 } };
  m.userData.suit = uniforms.uSuit;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    REST_VERTEX(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vRest;
uniform vec3 uNip; uniform float uCrotchY; uniform float uPelvisZ; uniform float uHipX; uniform float uSuit;
float ayeEdge(vec2 p, vec2 a, vec2 b) { vec2 e = b - a; vec2 n = normalize(vec2(-e.y, e.x)); return dot(p - a, n); }
float ayeSeg(vec2 p, vec2 a, vec2 b) { vec2 e = b - a; float h = clamp(dot(p - a, e) / dot(e, e), 0.0, 1.0); return length(p - a - e * h); }
float ayeSuit(vec3 p) {
  float ax = abs(p.x);
  vec2 q = vec2(ax, p.y);
  vec2 A = vec2(uNip.x - 0.014, uNip.y + 0.092);
  vec2 B = vec2(uNip.x - 0.088, uNip.y - 0.047);
  vec2 C = vec2(uNip.x + 0.078, uNip.y - 0.047);
  float s = sign(ayeEdge(C, A, B));
  float d = min(min(s * ayeEdge(q, A, B), s * ayeEdge(q, B, C)), s * ayeEdge(q, C, A));
  float front = step(uNip.z - 0.11, p.z);
  float tri = smoothstep(-0.0012, 0.0012, d) * front;
  float band = (1.0 - smoothstep(0.0032, 0.0052, abs(p.y - (uNip.y - 0.05)))) * step(ax, 0.2);
  float halter = (1.0 - smoothstep(0.0028, 0.0048, ayeSeg(q, A, vec2(0.052, uNip.y + 0.215)))) * step(uNip.z - 0.13, p.z);
  float top = uCrotchY + 0.1;
  float t = clamp((p.y - uCrotchY) / (top - uCrotchY), 0.0, 1.0);
  float back = smoothstep(uPelvisZ + 0.02, uPelvisZ - 0.04, p.z);
  float g = mix(0.024, 0.055, back);
  float w = g + (uHipX + 0.02 - g) * pow(t, 0.75);
  float bottom = (1.0 - smoothstep(w - 0.002, w + 0.002, ax)) * step(uCrotchY - 0.04, p.y) * (1.0 - smoothstep(top - 0.0015, top + 0.0015, p.y));
  float tie = (1.0 - smoothstep(0.003, 0.005, abs(p.y - (top - 0.004)))) * step(ax, 0.22);
  return uSuit * max(max(tri, band), max(halter, max(bottom, tie)));
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float ayeM = ayeSuit(vRest);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.018, 0.018, 0.02), ayeM);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.78, ayeM);');
  };
  m.customProgramCacheKey = () => 'aye-mh-skin-v1';
  return m;
}

/** Eyes: white, a dark brown iris and pupil facing forward. */
function eyeMaterial(centres: [Vector3, Vector3]) {
  const m = new MeshStandardMaterial({ roughness: 0.25 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uL = { value: centres[0] };
    shader.uniforms.uR = { value: centres[1] };
    REST_VERTEX(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRest; uniform vec3 uL; uniform vec3 uR;')
      .replace('#include <color_fragment>', `#include <color_fragment>
vec3 c = vRest.x > 0.0 ? uL : uR;
float f = normalize(vRest - c).z;
diffuseColor.rgb = f > 0.975 ? vec3(0.02) : f > 0.9 ? vec3(0.16, 0.08, 0.04) : vec3(0.86, 0.84, 0.8);`);
  };
  m.customProgramCacheKey = () => 'aye-mh-eye-v1';
  return m;
}

const HAIR = new MeshStandardMaterial({ color: new Color().setRGB(0.07, 0.055, 0.05, SRGBColorSpace), roughness: 0.95, side: DoubleSide });

/** The mesh's shape (no morphs) as plain floats in the figure's own metres: the file stores compact, quantised positions under a node scale. */
function inMetres(mesh: Mesh): BufferGeometry {
  const src = mesh.geometry;
  const pos = src.getAttribute('position');
  const out = new Float32Array(pos.count * 3);
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mesh.matrixWorld);
    out.set([v.x, v.y, v.z], i * 3);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(out, 3));
  if (src.index) g.setIndex(src.index.clone());
  return g;
}

/** A hair shell from the scalp cap: pushed out along its normals (more on top and at the back for an afro). */
function hairShell(scalp: BufferGeometry, lift: number, crownBoost: number): BufferGeometry {
  const g = scalp.clone();
  g.computeVertexNormals();
  const pos = g.attributes.position;
  const nrm = g.attributes.normal;
  let top = -Infinity, front = -Infinity, back = Infinity;
  for (let i = 0; i < pos.count; i++) { top = Math.max(top, pos.getY(i)); front = Math.max(front, pos.getZ(i)); back = Math.min(back, pos.getZ(i)); }
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), z = pos.getZ(i);
    // Less at the hairline (front, low), more at the crown and back
    const crown = Math.max(0, 1 - (top - y) / 0.12);
    const fromFront = (front - z) / (front - back);
    const d = lift * (0.35 + 0.65 * Math.min(1, fromFront * 1.6)) + crownBoost * crown;
    pos.setXYZ(i, pos.getX(i) + nrm.getX(i) * d, y + nrm.getY(i) * d, z + nrm.getZ(i) * d);
  }
  g.computeVertexNormals();
  return g;
}

interface Built { meshes: Mesh[]; skin: MeshStandardMaterial; shells: Record<MhHair, Mesh> }

/** Sets the morph weights, skin colour, two-piece and hairstyle on a built figure. */
function applyLook(built: Built, shape: BodyShape, skinTone: number, hair: MhHair, suit: boolean) {
  const inf = mhInfluences(shape);
  for (const m of built.meshes) {
    if (!m.morphTargetDictionary || !m.morphTargetInfluences) continue;
    for (const k of MH_MORPHS) {
      const i = m.morphTargetDictionary[k];
      if (i !== undefined) m.morphTargetInfluences[i] = inf[k];
    }
  }
  built.skin.color.setRGB(...mhSkinColor(skinTone), SRGBColorSpace);
  (built.skin.userData.suit as { value: number }).value = suit ? 1 : 0;
  for (const [id, mesh] of Object.entries(built.shells)) mesh.visible = id === hair;
}

/** A unit sphere with gentle bumps, for the afro's coily, uneven outline. */
function afroGeometry(): BufferGeometry {
  const g = new SphereGeometry(1, 48, 36);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = 1 + 0.035 * Math.sin(x * 17 + y * 5) * Math.sin(y * 13 - z * 7) + 0.02 * Math.sin(z * 23 + x * 11);
    p.setXYZ(i, x * n, y * n, z * n);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * The MakeHuman figure, shaped by a BodyShape through real morph targets,
 * with skin tone, hair and (by default) a black two-piece.
 */
export function MhFigure({ shape, skinTone = 0.7, hair = 'afro', suit = true }: { shape: BodyShape; skinTone?: number; hair?: MhHair; suit?: boolean }) {
  const { scene } = useGLTF(assetUrl(MH_BODY_URL));
  const built = useMemo(() => {
    const root = scene.clone(true);
    const meshes: Mesh[] = [];
    let landmarks: Landmarks | null = null;
    root.traverse((o: Object3D) => {
      if (o.userData?.landmarks) landmarks = o.userData.landmarks as Landmarks;
      if ((o as Mesh).isMesh) meshes.push(o as Mesh);
    });
    const lm = landmarks as unknown as Landmarks;
    const body = meshes.find((m) => (m.material as MeshStandardMaterial).name === 'body')!;
    const eyes = meshes.find((m) => (m.material as MeshStandardMaterial).name === 'eyes')!;
    const scalp = meshes.find((m) => (m.material as MeshStandardMaterial).name === 'cap')!;
    const skin = skinMaterial(lm);
    body.material = skin;
    // Eye centres from the rest positions of each eyeball
    const rest = eyes.geometry.getAttribute('_rest');
    const sum = [new Vector3(), new Vector3()];
    const n = [0, 0];
    for (let i = 0; i < rest.count; i++) { const k = rest.getX(i) > 0 ? 0 : 1; sum[k].add(new Vector3(rest.getX(i), rest.getY(i), rest.getZ(i))); n[k]++; }
    eyes.material = eyeMaterial([sum[0].divideScalar(n[0]), sum[1].divideScalar(n[1])]);
    scalp.visible = false;
    root.updateMatrixWorld(true);
    const cap = inMetres(scalp);
    const shells: Record<MhHair, Mesh> = {
      crop: new Mesh(hairShell(cap, 0.012, 0.004), HAIR),
      afro: new Mesh(hairShell(cap, 0.006, 0), HAIR),
      puff: new Mesh(hairShell(cap, 0.009, 0), HAIR),
      bun: new Mesh(hairShell(cap, 0.012, 0.004), HAIR),
    };
    // Puff on the crown, bun at the back
    const head = new Vector3();
    cap.computeBoundingBox();
    cap.boundingBox!.getCenter(head);
    const top = cap.boundingBox!.max.y;
    const puff = new Mesh(new SphereGeometry(0.075, 24, 18), HAIR);
    puff.position.set(0, top + 0.02, head.z - 0.03);
    puff.scale.set(1.15, 0.95, 1.05);
    shells.puff.add(puff);
    // Afro: a full, rounded shape sitting behind the hairline (the face stays clear), with a soft, uneven surface
    const afro = new Mesh(afroGeometry(), HAIR);
    afro.position.set(0, top - 0.045, head.z - 0.04);
    afro.scale.set(0.135, 0.12, 0.13);
    shells.afro.add(afro);
    const bun = new Mesh(new SphereGeometry(0.038, 20, 14), HAIR);
    bun.position.set(0, top - 0.06, cap.boundingBox!.min.z - 0.015);
    shells.bun.add(bun);
    for (const s of Object.values(shells)) { s.castShadow = true; root.add(s); }
    for (const m of meshes) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; }
    return { root, meshes, skin, shells };
  }, [scene]);

  useEffect(() => applyLook(built, shape, skinTone, hair, suit), [built, shape, skinTone, hair, suit]);

  return <primitive object={built.root} />;
}
