import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, ExtrudeGeometry, Matrix4, MeshPhysicalMaterial, MeshStandardMaterial, Quaternion, Shape, Vector3, type Bone, type Group, type Material, type Object3D } from 'three';
import type { EarKind, EyeKind, NailKind, NeckKind, Pendant, RingKind, Slot, Style, WristKind } from '../lib/fashion';

/**
 * Jewellery, sunglasses and nails on a character: necklaces round the neck,
 * earrings at the ear lobes, a watch on the left wrist and bangles on the right,
 * a frame over the eyes and long nails on every finger. Each piece follows its
 * bones every frame (a frame of reference made from the eyes, collarbones, wrist
 * and fingers), so it moves with the body. Original designs, no brand marks.
 */

type Bones = Record<string, Bone | undefined>;
const WANTED = ['Head', 'Neck', 'Spine2', 'LEye', 'REye', 'L Clavicle', 'R Clavicle', 'L Forearm', 'R Forearm', 'L Hand', 'R Hand',
  ...['L', 'R'].flatMap((side) => [0, 1, 2, 3, 4].flatMap((f) => [`${side} Finger${f}`, `${side} Finger${f}1`, `${side} Finger${f}2`]))];
const bipedName = (name: string) => name.replace(/[_\s]+/g, ' ').replace(/^Bip01 /, '');

// Scratch maths, reused every frame
const P = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
const X = new Vector3(), Y = new Vector3(), Z = new Vector3();
const ACROSS = new Vector3(), F1 = new Vector3(), F2 = new Vector3(), TIP = new Vector3();
const M = new Matrix4();
const Q = new Quaternion();

/** Sets a group to an origin and a frame (x to the person's left, y up, z forward), all in its parent's space. */
function place(g: Group | null, origin: Vector3, x: Vector3, y: Vector3) {
  if (!g) return;
  Z.crossVectors(x, y).normalize();
  Y.crossVectors(Z, x).normalize();
  M.makeBasis(X.copy(x).normalize(), Y, Z);
  Q.setFromRotationMatrix(M);
  g.position.copy(origin);
  g.quaternion.copy(Q);
}

function useMaterials(style: Style) {
  return useMemo(() => {
    const [a, b, c] = style.colors;
    const f = style.fabric?.name;
    const metal = new MeshStandardMaterial({ color: a, metalness: f === 'acrylic' || f === 'patent' ? 0 : 1, roughness: f === 'acrylic' || f === 'patent' ? 0.15 : 0.22 });
    // Stones and lenses: glossy, a little see-through sparkle
    const stone = new MeshPhysicalMaterial({ color: b, roughness: 0.05, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.02, side: DoubleSide, transparent: style.piece?.kind && ['oval', 'cat-eye', 'rect', 'round', 'rimless', 'shield'].includes(style.piece.kind) ? true : false, opacity: 0.88 });
    const accent = new MeshPhysicalMaterial({ color: c, roughness: 0.2, metalness: 0.3, clearcoat: 0.6 });
    const polish = new MeshPhysicalMaterial({ color: a, roughness: f === 'metallic' ? 0.2 : 0.12, metalness: f === 'metallic' ? 0.9 : 0, clearcoat: 1, clearcoatRoughness: 0.03 });
    const tip = new MeshPhysicalMaterial({ color: b, roughness: 0.12, metalness: f === 'metallic' ? 0.9 : 0, clearcoat: 1, clearcoatRoughness: 0.03 });
    return { metal, stone, accent, polish, tip };
  }, [style]);
}

/** A heart about 1 unit across (for pendants). */
const HEART_GEO = (() => {
  const sh = new Shape();
  sh.moveTo(0, -0.45);
  sh.bezierCurveTo(-0.15, -0.3, -0.5, -0.05, -0.5, 0.18);
  sh.bezierCurveTo(-0.5, 0.42, -0.25, 0.5, 0, 0.3);
  sh.bezierCurveTo(0.25, 0.5, 0.5, 0.42, 0.5, 0.18);
  sh.bezierCurveTo(0.5, -0.05, 0.15, -0.3, 0, -0.45);
  return new ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 });
})();

function PendantMesh({ kind, metal, stone, accent }: { kind: Pendant; metal: Material; stone: Material; accent: Material }) {
  switch (kind) {
    case 'cross': return (
      <group>
        <mesh position={[0, -0.016, 0]} material={metal}><boxGeometry args={[0.004, 0.03, 0.003]} /></mesh>
        <mesh position={[0, -0.01, 0]} material={metal}><boxGeometry args={[0.018, 0.004, 0.003]} /></mesh>
        <mesh position={[0, -0.01, 0.002]} material={stone}><sphereGeometry args={[0.0028, 10, 8]} /></mesh>
      </group>
    );
    case 'heart': return <mesh position={[0, -0.012, 0]} scale={0.022} material={metal} geometry={HEART_GEO} />;
    case 'drop': return <mesh position={[0, -0.014, 0]} scale={[1, 1.5, 0.7]} material={stone}><sphereGeometry args={[0.007, 14, 10]} /></mesh>;
    case 'solitaire': return <mesh position={[0, -0.006, 0]} material={stone}><octahedronGeometry args={[0.005]} /></mesh>;
    case 'flower': return (
      <group position={[0, -0.012, 0]}>
        {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[Math.cos((i * Math.PI * 2) / 5) * 0.007, Math.sin((i * Math.PI * 2) / 5) * 0.007, 0]} scale={[1, 1, 0.4]} material={metal}><sphereGeometry args={[0.006, 10, 8]} /></mesh>)}
        <mesh position={[0, 0, 0.002]} material={stone}><sphereGeometry args={[0.003, 10, 8]} /></mesh>
      </group>
    );
    case 'clover': return (
      <group position={[0, -0.01, 0]}>
        {[0, 1, 2, 3].map((i) => <mesh key={i} position={[Math.cos(i * Math.PI / 2) * 0.004, Math.sin(i * Math.PI / 2) * 0.004, 0]} scale={[1, 1, 0.4]} material={stone}><sphereGeometry args={[0.0045, 10, 8]} /></mesh>)}
      </group>
    );
    case 'bow': return (
      <group position={[0, -0.01, 0]}>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.007, 0, 0]} rotation={[0, 0, s * 0.5]} scale={[1, 0.7, 0.5]} material={accent}><torusGeometry args={[0.005, 0.0018, 6, 14]} /></mesh>)}
        <mesh material={accent}><sphereGeometry args={[0.0028, 8, 6]} /></mesh>
      </group>
    );
    case 'knot': return (
      <group position={[0, -0.008, 0]}>
        <mesh position={[-0.004, 0, 0]} material={metal}><torusGeometry args={[0.006, 0.0014, 8, 18]} /></mesh>
        <mesh position={[0.004, 0, 0]} rotation={[0, 0.6, 0]} material={metal}><torusGeometry args={[0.006, 0.0014, 8, 18]} /></mesh>
      </group>
    );
    case 'sun': return (
      <group position={[0, -0.012, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={metal}><cylinderGeometry args={[0.007, 0.007, 0.002, 16]} /></mesh>
        {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[Math.cos((i * Math.PI) / 4) * 0.01, Math.sin((i * Math.PI) / 4) * 0.01, 0]} rotation={[0, 0, (i * Math.PI) / 4 + Math.PI / 2]} material={metal}><coneGeometry args={[0.002, 0.005, 4]} /></mesh>)}
      </group>
    );
    case 'drops': return (
      <group>
        {[-2, -1, 0, 1, 2].map((i) => <mesh key={i} position={[i * 0.014, -0.006 + Math.abs(i) * 0.004, -Math.abs(i) * 0.003]} scale={[1, 1.4, 0.7]} material={stone}><sphereGeometry args={[0.0028, 8, 6]} /></mesh>)}
      </group>
    );
    default: return null;
  }
}

/** A necklace: drawn round the neck in its own frame (x left, y up, z forward), the ring tilted so the front drops onto the chest. */
function Necklace({ kind, pendant, mats }: { kind: NeckKind; pendant?: Pendant; mats: ReturnType<typeof useMaterials> }) {
  const { metal, stone, accent } = mats;
  // Radius round the neck and how far the front drops (radians of tilt)
  const ring = (r: number, tilt: number, tube: number, children?: ReactNode, mat: Material = metal) => (
    <group rotation={[tilt, 0, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.12, 1]} material={mat}><torusGeometry args={[r, tube, 6, 48]} /></mesh>
      {children}
    </group>
  );
  const beads = (r: number, tilt: number, n: number, size: number, mat: (i: number) => Material, front = 1) => (
    <group rotation={[tilt, 0, 0]}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 * front + (front < 1 ? Math.PI / 2 - Math.PI * front : 0);
        return <mesh key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r * 1.12]} material={mat(i)}><sphereGeometry args={[size, 10, 8]} /></mesh>;
      })}
    </group>
  );
  // The pendant hangs straight down from the front of the ring
  const hang = (r: number, tilt: number) => pendant && pendant !== 'none' && (
    <group rotation={[tilt, 0, 0]}><group position={[0, 0, r * 1.12]} rotation={[-tilt, 0, 0]} scale={1.5}><PendantMesh kind={pendant} metal={metal} stone={stone} accent={accent} /></group></group>
  );
  switch (kind) {
    case 'choker': return <>{ring(0.062, 0.15, 0.0045)}{hang(0.062, 0.15)}</>;
    case 'chain': return <>{ring(0.078, 0.55, 0.0012)}{hang(0.078, 0.55)}</>;
    case 'snake': return <>{ring(0.075, 0.5, 0.0019)}{hang(0.075, 0.5)}</>;
    case 'pearls': return <>{beads(0.07, 0.4, 34, 0.0042, () => stone)}{hang(0.07, 0.4)}</>;
    case 'collar': return <>{ring(0.066, 0.35, 0.0035)}{beads(0.068, 0.35, 15, 0.0045, () => stone, 0.5)}{hang(0.068, 0.35)}</>;
    case 'layered': return (
      <>{ring(0.064, 0.2, 0.0016)}{beads(0.072, 0.45, 32, 0.0035, () => stone)}{ring(0.082, 0.68, 0.0018)}{hang(0.082, 0.68)}</>
    );
    case 'roses': return <>{ring(0.062, 0.15, 0.0015)}{beads(0.064, 0.15, 7, 0.007, () => stone, 0.42)}</>;
    case 'charms': return <>{ring(0.064, 0.2, 0.0012)}{beads(0.066, 0.2, 20, 0.0048, (i) => (i % 3 === 0 ? metal : i % 3 === 1 ? stone : accent))}</>;
    default: return null;
  }
}

/** One earring at an ear lobe (its frame: x out from the head, y up, z forward). */
function Earring({ kind, mats }: { kind: EarKind; mats: ReturnType<typeof useMaterials> }) {
  const { metal, stone } = mats;
  switch (kind) {
    case 'stud': return <><mesh material={stone}><sphereGeometry args={[0.0035, 10, 8]} /></mesh><mesh position={[-0.002, 0, 0]} material={metal}><cylinderGeometry args={[0.0045, 0.0045, 0.001, 12]} /></mesh></>;
    case 'hoop': return <mesh position={[0, -0.009, 0]} rotation={[0, Math.PI / 2, 0]} material={metal}><torusGeometry args={[0.009, 0.0018, 8, 24]} /></mesh>;
    case 'chunky-hoop': return <mesh position={[0, -0.014, 0]} rotation={[0, Math.PI / 2, 0]} material={metal}><torusGeometry args={[0.013, 0.004, 10, 24, Math.PI * 1.6]} /></mesh>;
    case 'drop': return (
      <>
        <mesh material={metal}><sphereGeometry args={[0.0025, 8, 6]} /></mesh>
        <mesh position={[0, -0.009, 0]} material={metal}><cylinderGeometry args={[0.0006, 0.0006, 0.014, 4]} /></mesh>
        <mesh position={[0, -0.02, 0]} scale={[0.7, 1.5, 0.7]} material={stone}><sphereGeometry args={[0.0055, 12, 10]} /></mesh>
      </>
    );
    case 'tassel': return (
      <>
        <mesh position={[0, -0.006, 0]} material={metal}><sphereGeometry args={[0.003, 8, 6]} /></mesh>
        <mesh position={[0, -0.04, 0]} material={stone}><cylinderGeometry args={[0.004, 0.009, 0.065, 10]} /></mesh>
      </>
    );
    case 'bow': return <>{[-1, 1].map((s) => <mesh key={s} position={[0, 0, s * 0.006]} rotation={[0, Math.PI / 2, s * 0.5]} scale={[1, 0.7, 0.5]} material={metal}><torusGeometry args={[0.005, 0.002, 6, 14]} /></mesh>)}</>;
    case 'flower': return (
      <>
        {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[0, Math.sin((i * Math.PI * 2) / 5) * 0.006, Math.cos((i * Math.PI * 2) / 5) * 0.006]} scale={[0.4, 1, 1]} material={metal}><sphereGeometry args={[0.005, 10, 8]} /></mesh>)}
        <mesh position={[0.001, 0, 0]} material={stone}><sphereGeometry args={[0.0028, 10, 8]} /></mesh>
      </>
    );
    case 'chandelier': return (
      <>
        {[0, 1, 2].map((i) => <mesh key={i} position={[0, -0.008 - i * 0.01, 0]} scale={[0.7, 1.2 + i * 0.2, 0.7]} material={i === 2 ? stone : metal}><octahedronGeometry args={[0.0045 + i * 0.001]} /></mesh>)}
      </>
    );
    case 'clover': return <>{[0, 1, 2, 3].map((i) => <mesh key={i} position={[0, Math.sin(i * Math.PI / 2) * 0.004, Math.cos(i * Math.PI / 2) * 0.004]} scale={[0.4, 1, 1]} material={stone}><sphereGeometry args={[0.0042, 10, 8]} /></mesh>)}</>;
    default: return null;
  }
}

/** Sunglasses in the eyes' frame (x left, y up, z forward, origin between the eyes). */
function Glasses({ kind, mats }: { kind: EyeKind; mats: ReturnType<typeof useMaterials> }) {
  const { metal: frame, stone: lens } = mats;
  const shape = {
    oval: { sx: 1.35, sy: 0.85, r: 0.021, tilt: 0 },
    'cat-eye': { sx: 1.45, sy: 0.7, r: 0.02, tilt: 0.25 },
    rect: { sx: 1.45, sy: 0.75, r: 0.02, tilt: 0 },
    round: { sx: 1, sy: 1, r: 0.019, tilt: 0 },
    rimless: { sx: 1.4, sy: 0.75, r: 0.02, tilt: 0 },
    shield: { sx: 1.4, sy: 0.85, r: 0.022, tilt: 0 },
  }[kind];
  const rim = kind !== 'rimless';
  const square = kind === 'rect';
  return (
    <group position={[0, 0.002, 0.03]}>
      {kind === 'shield' ? (
        <mesh scale={[3.6, 1, 1]} material={lens}><circleGeometry args={[shape.r, 32]} /></mesh>
      ) : [-1, 1].map((s) => (
        <group key={s} position={[s * 0.032, 0, 0]} rotation={[0, 0, s * shape.tilt]} scale={[shape.sx, shape.sy, 1]}>
          {square ? <mesh material={lens}><planeGeometry args={[shape.r * 1.9, shape.r * 1.9]} /></mesh> : <mesh material={lens}><circleGeometry args={[shape.r, 32]} /></mesh>}
          {rim && (square
            ? [[0, shape.r], [0, -shape.r]].map(([x, y], i) => <mesh key={i} position={[x, y, 0]} material={frame}><boxGeometry args={[shape.r * 2.1, 0.0035, 0.004]} /></mesh>)
            : <mesh material={frame}><torusGeometry args={[shape.r, 0.0028, 8, 36]} /></mesh>)}
          {rim && square && [-1, 1].map((k) => <mesh key={`v${k}`} position={[k * shape.r, 0, 0]} material={frame}><boxGeometry args={[0.0035, shape.r * 2.1, 0.004]} /></mesh>)}
        </group>
      ))}
      {/* Bridge and the arms back to the ears */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.006, 0]} material={frame}><cylinderGeometry args={[0.0018, 0.0018, 0.018, 6]} /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.072, 0.004, -0.05]} rotation={[Math.PI / 2, 0, 0]} material={frame}><cylinderGeometry args={[0.0018, 0.0018, 0.1, 6]} /></mesh>
      ))}
    </group>
  );
}

/** What's on a wrist (frame: y along the forearm towards the hand, z out of the back of the wrist). */
function Wrist({ kind, side, mats }: { kind: WristKind; side: 'L' | 'R'; mats: ReturnType<typeof useMaterials> }) {
  const { metal, stone, accent } = mats;
  const band = (y: number, r: number, tube: number, mat: Material = metal, arc = Math.PI * 2) => (
    <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.78, 1]} material={mat}><torusGeometry args={[r, tube, 8, 28, arc]} /></mesh>
  );
  const watch = (iced: boolean) => (
    <>
      {band(-0.02, 0.031, iced ? 0.005 : 0.004, iced ? metal : accent)}
      <group position={[0, -0.02, 0.026]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={metal}><cylinderGeometry args={[0.016, 0.016, 0.007, iced ? 8 : 24]} /></mesh>
        <mesh position={[0, 0, 0.0036]} material={stone}><circleGeometry args={[0.012, 24]} /></mesh>
        {iced && Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[Math.cos(i * Math.PI / 6) * 0.0145, Math.sin(i * Math.PI / 6) * 0.0145, 0.004]} material={mats.stone}><sphereGeometry args={[0.0016, 6, 4]} /></mesh>)}
      </group>
    </>
  );
  // The watch goes on the left wrist; bangles on the right
  if (side === 'L') return kind === 'watch' || kind === 'iced-watch' || kind === 'stack' ? watch(kind === 'iced-watch') : null;
  switch (kind) {
    case 'bangle': return <>{band(-0.02, 0.034, 0.0035)}{band(-0.03, 0.035, 0.004, accent)}</>;
    case 'cuff': return <mesh position={[0, -0.022, 0]} scale={[1, 1, 0.78]} material={metal}><cylinderGeometry args={[0.035, 0.035, 0.03, 28, 1, true, 0.6, Math.PI * 2 - 1.2]} /></mesh>;
    case 'stack': return <>{band(-0.018, 0.033, 0.002, stone)}{band(-0.026, 0.034, 0.003)}</>;
    case 'coil': return <>{[0, 1, 2, 3, 4].map((i) => <group key={i}>{band(-0.012 - i * 0.008, 0.033 + i * 0.0015, 0.0025)}</group>)}</>;
    case 'knot': return <>{band(-0.02, 0.034, 0.003)}<mesh position={[0, -0.02, 0.028]} material={stone}><torusKnotGeometry args={[0.005, 0.0018, 32, 6]} /></mesh></>;
    default: return null;
  }
}

/** A nail on the end of a finger (frame: y along the finger, z out of the back of the hand). */
function Nail({ kind, mats }: { kind: NailKind; mats: ReturnType<typeof useMaterials> }) {
  const len = kind === 'square' ? 0.017 : 0.024;
  const w = 0.0065;
  const two = mats.polish.color.getHex() !== mats.tip.color.getHex();
  return (
    <group position={[0, 0, 0.0035]} scale={[1, 1, 0.38]}>
      {kind === 'stiletto' ? (
        <>
          <mesh position={[0, len * 0.25, 0]} material={mats.polish}><cylinderGeometry args={[w * 0.5, w * 0.48, len * 0.5, 10]} /></mesh>
          <mesh position={[0, len * 0.75, 0]} material={two ? mats.tip : mats.polish}><coneGeometry args={[w * 0.5, len * 0.5, 10]} /></mesh>
        </>
      ) : kind === 'almond' ? (
        <>
          <mesh position={[0, len * 0.35, 0]} material={mats.polish}><capsuleGeometry args={[w * 0.5, len * 0.45, 4, 10]} /></mesh>
          {two && <mesh position={[0, len * 0.72, 0]} scale={[1.02, 1, 1.05]} material={mats.tip}><sphereGeometry args={[w * 0.5, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>}
        </>
      ) : (
        <>
          <mesh position={[0, len * 0.4, 0]} material={mats.polish}><boxGeometry args={[w * (kind === 'coffin' ? 0.95 : 1), len * 0.8, w * 0.9]} /></mesh>
          <mesh position={[0, len * 0.88, 0]} material={two ? mats.tip : mats.polish}><boxGeometry args={[w * (kind === 'coffin' ? 0.7 : 1), len * 0.24, w * 0.9]} /></mesh>
        </>
      )}
    </group>
  );
}

/** Which fingers of the right hand a ring goes on (0 thumb … 4 little finger). */
const RING_FINGERS: Record<RingKind, readonly number[]> = { band: [3], sphere: [2], cocktail: [3], stack: [2, 3], sculpt: [1], coil: [2], solitaire: [3] };

/** A ring round a finger (frame: y along the finger, z out of the back of the hand). */
function Ring({ kind, mats }: { kind: RingKind; mats: ReturnType<typeof useMaterials> }) {
  const { metal, stone } = mats;
  const band = (tube: number, y = 0) => <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.85, 1]} material={metal}><torusGeometry args={[0.0095, tube, 8, 24]} /></mesh>;
  switch (kind) {
    case 'band': return <>{band(0.0014)}{Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[Math.cos((i / 8) * Math.PI) * 0.0095, 0, Math.sin((i / 8) * Math.PI) * 0.0085]} material={stone}><sphereGeometry args={[0.0013, 6, 4]} /></mesh>)}</>;
    case 'solitaire': return <>{band(0.0012)}<mesh position={[0, 0, 0.0115]} material={stone}><octahedronGeometry args={[0.0035]} /></mesh></>;
    case 'cocktail': return <>{band(0.0016)}<mesh position={[0, 0, 0.011]} scale={[1, 1.3, 0.7]} material={stone}><sphereGeometry args={[0.005, 12, 10]} /></mesh></>;
    case 'sphere': return <>{band(0.0016)}{[[-0.004, 0.012, 0.0045], [0.004, 0.0125, 0.004], [0, 0.0105, 0.0035]].map(([x, z, r], i) => <mesh key={i} position={[x, (i - 1) * 0.004, z]} material={metal}><sphereGeometry args={[r, 14, 10]} /></mesh>)}</>;
    case 'sculpt': return <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.85, 1.6]} material={metal}><torusGeometry args={[0.0105, 0.0035, 10, 24]} /></mesh>;
    case 'coil': return <>{[0, 1, 2, 3].map((i) => <group key={i}>{band(0.0012, -0.004 + i * 0.0028)}</group>)}</>;
    case 'stack': return <>{band(0.0012, -0.002)}{band(0.0012, 0.002)}{Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[Math.cos((i / 6) * Math.PI) * 0.0095, 0, Math.sin((i / 6) * Math.PI) * 0.0085]} material={stone}><sphereGeometry args={[0.0012, 6, 4]} /></mesh>)}</>;
    default: return null;
  }
}

/** Every worn piece the character has on, following its bones. */
export function Adornments({ scene, styles }: { scene: Object3D; styles: Partial<Record<Slot, Style>> }) {
  const bones = useMemo(() => {
    const out: Bones = {};
    scene.traverse((o) => { if ((o as Bone).isBone) { const n = bipedName(o.name); if (WANTED.includes(n)) out[n] = o as Bone; } });
    return out;
  }, [scene]);
  const root = useRef<Group>(null);
  const head = useRef<Group>(null);
  const neck = useRef<Group>(null);
  const wrists = { L: useRef<Group>(null), R: useRef<Group>(null) };
  const nails = useRef<(Group | null)[]>([]);
  const rings = useRef<(Group | null)[]>([]);
  const neckMats = useMaterials(styles.neck ?? EMPTY);
  const earMats = useMaterials(styles.ears ?? EMPTY);
  const wristMats = useMaterials(styles.wrist ?? EMPTY);
  const eyeMats = useMaterials(styles.eyes ?? EMPTY);
  const nailMats = useMaterials(styles.nails ?? EMPTY);
  const ringMats = useMaterials(styles.rings ?? EMPTY);
  const ringFingers = styles.rings?.piece ? RING_FINGERS[styles.rings.piece.kind as RingKind] ?? [] : [];

  useFrame(() => {
    const parent = root.current;
    if (!parent) return;
    const at = (name: string, v: Vector3) => {
      const b = bones[name];
      if (!b) return false;
      b.getWorldPosition(v);
      parent.worldToLocal(v);
      return true;
    };
    const [a, b, c, d] = P;
    // Head: between the eyes, x towards the left eye, so z is where the face looks
    if ((styles.eyes || styles.ears) && at('LEye', a) && at('REye', b) && at('Neck', c)) {
      const mid = d.copy(a).add(b).multiplyScalar(0.5);
      const left = a.sub(b);
      // The body's vertical (the neck leans forward, which would tip the frame into the face)
      place(head.current, mid, left, c.set(0, 1, 0));
    }
    if (styles.neck && at('Neck', a) && at('L Clavicle', b) && at('R Clavicle', c) && at('Head', d)) {
      const up = d.sub(a);
      const left = b.sub(c);
      place(neck.current, a, left, up);
    }
    // Wrists and fingers: along the forearm, with the back of the hand from the index and little fingers
    for (const side of ['L', 'R'] as const) {
      const sign = side === 'L' ? -1 : 1;
      const wantWrist = !!styles.wrist;
      const wantNails = !!styles.nails;
      const wantRings = side === 'R' && ringFingers.length > 0;
      if (!wantWrist && !wantNails && !wantRings) continue;
      if (!at(`${side} Hand`, a) || !at(`${side} Forearm`, b) || !at(`${side} Finger1`, c) || !at(`${side} Finger4`, d)) continue;
      const along = b.subVectors(a, b).normalize();
      const across = ACROSS.subVectors(d, c).multiplyScalar(sign);
      // y along the arm, x across the knuckles: the frame's z is out of the back of the hand
      if (wantWrist) place(wrists[side].current, a, across, along);
      if (wantRings) {
        ringFingers.forEach((f, i) => {
          const g = rings.current[i];
          if (!g || !at(`R Finger${f}`, F1) || !at(`R Finger${f}1`, F2)) return;
          const dir = F2.sub(F1);
          // Round the first bone of the finger, a little past its middle
          TIP.copy(F1).addScaledVector(dir, 0.55);
          place(g, TIP, across, dir);
        });
      }
      if (wantNails) {
        for (let f = 0; f < 5; f++) {
          const g = nails.current[(side === 'L' ? 0 : 5) + f];
          if (!g || !at(`${side} Finger${f}1`, F1) || !at(`${side} Finger${f}2`, F2)) continue;
          const dir = F1.subVectors(F2, F1);
          // The nail sits on the last bone, just short of where the finger ends
          TIP.copy(F2).addScaledVector(dir, 0.55);
          place(g, TIP, across, dir);
        }
      }
    }
  });

  const neckPiece = styles.neck?.piece;
  const earPiece = styles.ears?.piece;
  const wristPiece = styles.wrist?.piece;
  const eyePiece = styles.eyes?.piece;
  const nailPiece = styles.nails?.piece;
  return (
    <group ref={root}>
      <group ref={head}>
        {eyePiece && <Glasses kind={eyePiece.kind as EyeKind} mats={eyeMats} />}
        {earPiece && [-1, 1].map((s) => (
          // Ear lobes: out to each side, down and back from between the eyes
          <group key={s} position={[s * 0.074, -0.045, -0.085]} scale={[s, 1, 1]}><Earring kind={earPiece.kind as EarKind} mats={earMats} /></group>
        ))}
      </group>
      <group ref={neck}>
        {neckPiece && <group position={[0, -0.02, 0.012]}><Necklace kind={neckPiece.kind as NeckKind} pendant={neckPiece.pendant} mats={neckMats} /></group>}
      </group>
      {(['L', 'R'] as const).map((side) => (
        <group key={side} ref={wrists[side]}>{wristPiece && <Wrist kind={wristPiece.kind as WristKind} side={side} mats={wristMats} />}</group>
      ))}
      {styles.rings?.piece && ringFingers.map((f, i) => (
        <group key={`ring${f}`} ref={(g) => { rings.current[i] = g; }}><Ring kind={styles.rings!.piece!.kind as RingKind} mats={ringMats} /></group>
      ))}
      {nailPiece && Array.from({ length: 10 }, (_, i) => (
        <group key={i} ref={(g) => { nails.current[i] = g; }}><Nail kind={nailPiece.kind as NailKind} mats={nailMats} /></group>
      ))}
    </group>
  );
}

const EMPTY: Style = { pattern: 'solid', colors: ['#ffffff', '#ffffff', '#ffffff'], scale: 1 };
