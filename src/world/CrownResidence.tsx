/**
 * The Crown Residence's interior (lib/interiors.ts CROWN_INTERIOR): a double-height salon in
 * sculpted off-white plaster.
 * - Architecture (CrownDecor): a contour-line microcement floor, a coved ceiling with a lit tray,
 *   fluted and beaded wall panels with light strips, our own plaster relief at the back of the
 *   salon, a media wall of draped swags between columns and lit niches, a library wall of
 *   rounded columns, a tall window with linen and sheer curtains, three fringe chandeliers, a
 *   bead pendant and a stacked-stone sculpture.
 * - Furniture (CrownPiece, by `crown-*` design): curved sofas with pom-pom trim, tube armchairs
 *   on ball feet, nesting cloud tables with ottomans, olive trees, stacked side tables and
 *   lamps, the media screen, and the 14 ft straight kitchen (sage and oak with glass crockery
 *   shutters, loft storage, a cove-lit false ceiling and fluted side panels) with its tall unit.
 * Everything is built here from simple geometry and canvas textures: nothing is downloaded.
 */
import { useMemo, type ReactNode } from 'react';
import {
  BufferGeometry, CanvasTexture, CatmullRomCurve3, Color, DoubleSide, ExtrudeGeometry, Float32BufferAttribute, Object3D,
  RepeatWrapping, Shape, SRGBColorSpace, Vector3, type InstancedMesh,
} from 'three';
import { RoundedBox } from '@react-three/drei';
import type { Furniture, Interior } from '../lib/interiors';
import { wallHeight } from '../lib/interiors';
import { sofaFacing } from '../lib/furniture';
import { skyMoodAt, skylineTexture } from './venueTextures';

const PLASTER = '#e6e3de';
const SOFT = '#ece8e2';
const OLIVE = '#7a7a2e';
const WARM = '#ffd9a0';

const M = ({ color, rough = 0.85, metal = 0, glow = 0, emissive }: { color: string; rough?: number; metal?: number; glow?: number; emissive?: string }) =>
  <meshStandardMaterial color={color} roughness={rough} metalness={metal} emissive={emissive ?? (glow ? color : '#000000')} emissiveIntensity={glow} />;

// ——— Canvas textures ———————————————————————————————————————————————

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!] as const;
};
const tex = (c: HTMLCanvasElement, srgb = true) => {
  const t = new CanvasTexture(c);
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

let floorTex: CanvasTexture | null = null;
/** Off-white microcement with flowing contour grooves, as inlaid in the salon floor. */
function contourFloor() {
  if (floorTex) return floorTex;
  const [c, g] = canvas(2048, 1480);
  g.fillStyle = '#e9e6e1'; g.fillRect(0, 0, c.width, c.height);
  // A faint trowelled cloud
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '160,150,140'},${0.025 + Math.random() * 0.03})`;
    const r = 8 + Math.random() * 40;
    g.beginPath(); g.arc(Math.random() * c.width, Math.random() * c.height, r, 0, Math.PI * 2); g.fill();
  }
  // Contour lines: smooth waves across the room, each a dark groove with a light edge
  const lines = 16;
  for (let k = 0; k < lines; k++) {
    const base = ((k + 0.5) / lines) * c.height;
    const a1 = 30 + Math.random() * 70, f1 = 0.002 + Math.random() * 0.003, p1 = Math.random() * 6;
    const a2 = 10 + Math.random() * 40, f2 = 0.006 + Math.random() * 0.006, p2 = Math.random() * 6;
    const y = (x: number) => base + a1 * Math.sin(x * f1 + p1) + a2 * Math.sin(x * f2 + p2);
    for (const [dy, col, wid] of [[2, 'rgba(255,255,255,0.8)', 2], [0, 'rgba(90,86,80,0.75)', 3]] as const) {
      g.strokeStyle = col; g.lineWidth = wid; g.beginPath();
      for (let x = 0; x <= c.width; x += 8) { if (x === 0) g.moveTo(x, y(x) + dy); else g.lineTo(x, y(x) + dy); }
      g.stroke();
    }
  }
  floorTex = tex(c);
  return floorTex;
}

let reliefTex: CanvasTexture | null = null;
/**
 * Our own plaster relief (a bump map): a serene mask with closed eyes in profile, a crescent and
 * flowing lines, over a fluted ground. Light (high) is raised, dark is set back.
 */
function relief() {
  if (reliefTex) return reliefTex;
  const [c, g] = canvas(1024, 720);
  g.fillStyle = '#5a5a5a'; g.fillRect(0, 0, c.width, c.height);
  // Fluted ground
  for (let x = 0; x < c.width; x += 14) {
    const grad = g.createLinearGradient(x, 0, x + 14, 0);
    grad.addColorStop(0, '#4a4a4a'); grad.addColorStop(0.5, '#707070'); grad.addColorStop(1, '#4a4a4a');
    g.fillStyle = grad; g.fillRect(x, 0, 14, c.height);
  }
  // The mask: a soft oval face, raised, with a crescent cut from its back
  const face = (cx: number, cy: number, rx: number, ry: number) => {
    const grad = g.createRadialGradient(cx - rx * 0.2, cy - ry * 0.2, rx * 0.1, cx, cy, rx * 1.1);
    grad.addColorStop(0, '#f2f2f2'); grad.addColorStop(0.75, '#c8c8c8'); grad.addColorStop(1, '#8a8a8a');
    g.fillStyle = grad; g.beginPath(); g.ellipse(cx, cy, rx, ry, -0.12, 0, Math.PI * 2); g.fill();
  };
  face(470, 360, 230, 290);
  g.fillStyle = '#6a6a6a'; g.beginPath(); g.ellipse(300, 330, 120, 250, -0.12, 0, Math.PI * 2); g.fill();
  // Closed eyes, nose ridge and lips, cut in
  g.strokeStyle = '#7a7a7a'; g.lineWidth = 9; g.lineCap = 'round';
  for (const ex of [430, 570]) { g.beginPath(); g.arc(ex, 330, 46, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
  g.strokeStyle = '#ffffff'; g.lineWidth = 7;
  g.beginPath(); g.moveTo(505, 330); g.quadraticCurveTo(495, 420, 520, 450); g.stroke();
  g.strokeStyle = '#8a8a8a'; g.lineWidth = 10;
  g.beginPath(); g.moveTo(470, 512); g.quadraticCurveTo(512, 530, 556, 512); g.stroke();
  // A crescent moon and flowing lines to the right
  g.fillStyle = '#e8e8e8'; g.beginPath(); g.arc(820, 230, 110, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#5a5a5a'; g.beginPath(); g.arc(860, 205, 100, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#d8d8d8'; g.lineWidth = 12;
  for (let k = 0; k < 4; k++) {
    g.beginPath(); g.moveTo(700, 420 + k * 55);
    g.bezierCurveTo(780, 380 + k * 55, 860, 470 + k * 55, 980, 420 + k * 55); g.stroke();
  }
  reliefTex = tex(c, false);
  return reliefTex;
}

let flutedOakTex: CanvasTexture | null = null;
/** Vertically fluted oak, as on the kitchen's side panels. */
function flutedOak() {
  if (flutedOakTex) return flutedOakTex;
  const [c, g] = canvas(256, 512);
  for (let x = 0; x < c.width; x += 16) {
    const grad = g.createLinearGradient(x, 0, x + 16, 0);
    grad.addColorStop(0, '#7a5232'); grad.addColorStop(0.5, '#b4824f'); grad.addColorStop(1, '#7a5232');
    g.fillStyle = grad; g.fillRect(x, 0, 16, c.height);
  }
  for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(60,35,15,0.12)'; g.fillRect(Math.random() * 256, Math.random() * 512, 1, 20 + Math.random() * 60); }
  flutedOakTex = tex(c);
  flutedOakTex.wrapS = flutedOakTex.wrapT = RepeatWrapping;
  return flutedOakTex;
}

let oakDoorTex: CanvasTexture | null = null;
/** Oak cabinet doors with a diagonal V-groove, as on the upper wall units. */
function oakDoor() {
  if (oakDoorTex) return oakDoorTex;
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#a8784a'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '70,40,15' : '210,170,120'},0.08)`; g.fillRect(0, y, 256, 1); }
  g.strokeStyle = 'rgba(70,45,25,0.6)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, 256); g.lineTo(256, 0); g.stroke();
  oakDoorTex = tex(c);
  return oakDoorTex;
}

let sageDoorTex: CanvasTexture | null = null;
/** Sage matt doors with a crossed V-groove (the corner units). */
function sageX() {
  if (sageDoorTex) return sageDoorTex;
  const [c, g] = canvas(128, 192);
  g.fillStyle = '#7d8f80'; g.fillRect(0, 0, 128, 192);
  g.strokeStyle = 'rgba(40,52,42,0.55)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 192); g.moveTo(128, 0); g.lineTo(0, 192); g.stroke();
  sageDoorTex = tex(c);
  return sageDoorTex;
}

// ——— Instanced repeats (flutes and beads) ——————————————————————————————

/** Many copies of one small mesh at these positions. */
function Repeat({ at, children }: { at: readonly (readonly [number, number, number])[]; children: [ReactNode, ReactNode] }) {
  const ref = (m: InstancedMesh | null) => {
    if (!m) return;
    const o = new Object3D();
    at.forEach((p, i) => { o.position.set(p[0], p[1], p[2]); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true;
  };
  return <instancedMesh ref={ref} args={[undefined, undefined, at.length]} castShadow={false}>{children}</instancedMesh>;
}

/** A fluted panel against a wall, facing +z in its own frame: half-round flutes side by side. */
function FlutedPanel({ width, height, pitch = 0.07 }: { width: number; height: number; pitch?: number }) {
  const at = useMemo(() => Array.from({ length: Math.floor(width / pitch) }, (_, i) => [-width / 2 + pitch / 2 + i * pitch, height / 2, 0] as const), [width, height, pitch]);
  return (
    <group>
      <mesh position={[0, height / 2, -0.02]}><boxGeometry args={[width, height, 0.02]} /><M color={PLASTER} /></mesh>
      <Repeat at={at}>{[<cylinderGeometry key="g" args={[pitch * 0.42, pitch * 0.42, height, 8, 1, false, -Math.PI / 2, Math.PI]} />, <M key="m" color={PLASTER} rough={0.8} />]}</Repeat>
    </group>
  );
}

/** A vertical string of plaster beads, as framing the wall panels. */
function BeadStrip({ height, r = 0.024 }: { height: number; r?: number }) {
  const at = useMemo(() => Array.from({ length: Math.floor(height / (r * 2.3)) }, (_, i) => [0, r + i * r * 2.3, 0] as const), [height, r]);
  return <Repeat at={at}>{[<sphereGeometry key="g" args={[r, 10, 8]} />, <M key="m" color={PLASTER} rough={0.7} />]}</Repeat>;
}

/** A warm LED strip, set into the wall. */
const Strip = ({ len, vertical = true, night }: { len: number; vertical?: boolean; night: number }) => (
  <mesh position={vertical ? [0, len / 2, 0] : [0, 0, 0]}>
    <boxGeometry args={vertical ? [0.025, len, 0.02] : [len, 0.025, 0.02]} />
    <meshStandardMaterial color="#fff4e2" emissive={WARM} emissiveIntensity={1.4 + night * 1.6} toneMapped={false} />
  </mesh>
);

// ——— Fringe chandelier ————————————————————————————————————————————————

/** The outline of three overlapping circles (a cloud), as points round its edge. */
function cloudOutline(r: number, n = 96): [number, number][] {
  const centres = [[-r * 0.55, -r * 0.2], [r * 0.55, -r * 0.2], [0, r * 0.45]] as const;
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
    // Farthest hit of the ray from the middle with any of the circles
    let best = 0;
    for (const [cx, cz] of centres) {
      const b = dx * cx + dz * cz, cc = cx * cx + cz * cz - r * r * 0.62 * 0.62, disc = b * b - cc;
      if (disc >= 0) best = Math.max(best, b + Math.sqrt(disc));
    }
    out.push([dx * best, dz * best]);
  }
  return out;
}

/** An open band of fringe hanging round an outline, `height` tall, its top at y = 0. */
function fringeBand(outline: [number, number][], height: number) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  let run = 0;
  const n = outline.length;
  for (let i = 0; i <= n; i++) {
    const [x, z] = outline[i % n];
    if (i > 0) { const [px, pz] = outline[i - 1]; run += Math.hypot(x - px, z - pz); }
    pos.push(x, 0, z, x, -height, z);
    uv.push(run / 0.6, 1, run / 0.6, 0);
    if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Cords hanging round an outline: one every `pitch` metres, their lengths varying a little. */
function cordsAround(outline: [number, number][], length: number, pitch = 0.022): (readonly [number, number, number, number])[] {
  const out: (readonly [number, number, number, number])[] = [];
  const n = outline.length;
  let carry = 0, k = 0;
  for (let i = 0; i < n; i++) {
    const [x0, z0] = outline[i], [x1, z1] = outline[(i + 1) % n];
    const seg = Math.hypot(x1 - x0, z1 - z0);
    for (let t = carry; t < seg; t += pitch) {
      const u = t / seg, len = length * (0.86 + 0.14 * Math.abs(Math.sin(k++ * 12.9898) * 43758.5453 % 1));
      out.push([x0 + (x1 - x0) * u, -len / 2, z0 + (z1 - z0) * u, len] as const);
    }
    carry = (carry + Math.ceil((seg - carry) / pitch) * pitch) - seg;
  }
  return out;
}

/** Many thin cords (instanced), each its own length. */
function Cords({ cords, color }: { cords: readonly (readonly [number, number, number, number])[]; color: string }) {
  const ref = (m: InstancedMesh | null) => {
    if (!m) return;
    const o = new Object3D();
    cords.forEach(([x, y, z, len], i) => { o.position.set(x, y, z); o.scale.set(1, len, 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true;
  };
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, cords.length]}>
      <boxGeometry args={[0.009, 1, 0.009]} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </instancedMesh>
  );
}

/** A two-tier cloud of hanging fringe round a warm glowing core, on three cables from the ceiling. */
function FringeChandelier({ x, z, size, drop, ceiling, night, lightsOn, tone = '#b8b4ad' }: { x: number; z: number; size: number; drop: number; ceiling: number; night: number; lightsOn: boolean; tone?: string }) {
  const tiers = useMemo(() => {
    const outer = cloudOutline(size), inner = cloudOutline(size * 0.78);
    return {
      outerCords: cordsAround(outer, size * 0.7), innerCords: cordsAround(inner, size * 0.65),
      outerSleeve: fringeBand(outer.map(([a, b]) => [a * 0.985, b * 0.985]), size * 0.6),
      innerSleeve: fringeBand(inner.map(([a, b]) => [a * 0.985, b * 0.985]), size * 0.55),
    };
  }, [size]);
  const top = ceiling - drop;
  const glow = lightsOn ? 1.2 + night * 1.6 : 0.05;
  const sleeve = new Color(tone).multiplyScalar(0.8).getStyle();
  return (
    <group position={[x, top, z]}>
      {[[-size * 0.5, -size * 0.2], [size * 0.5, -size * 0.2], [0, size * 0.4]].map(([cx, cz], i) => (
        <mesh key={i} position={[cx, drop / 2, cz]}><cylinderGeometry args={[0.004, 0.004, drop, 4]} /><M color="#d8d4cc" metal={0.6} rough={0.4} /></mesh>
      ))}
      {/* The outer tier: a dense cord fringe over a sleeve, so it reads full from any side */}
      <Cords cords={tiers.outerCords} color={tone} />
      <mesh geometry={tiers.outerSleeve}><meshStandardMaterial color={sleeve} side={DoubleSide} roughness={0.9} /></mesh>
      <group position={[0, -size * 0.45, 0]}>
        <Cords cords={tiers.innerCords} color={tone} />
        <mesh geometry={tiers.innerSleeve}><meshStandardMaterial color={sleeve} side={DoubleSide} roughness={0.9} /></mesh>
      </group>
      <mesh position={[0, -size * 0.75, 0]}>
        <cylinderGeometry args={[size * 0.2, size * 0.2, size * 0.3, 24]} />
        <meshStandardMaterial color="#fff1d8" emissive={WARM} emissiveIntensity={glow} toneMapped={false} />
      </mesh>
      {lightsOn && <pointLight position={[0, -size * 0.95, 0]} intensity={2.2 + night * 6} distance={size * 9} decay={1.7} color="#ffd9a8" />}
    </group>
  );
}

// ——— Swags (the media wall) ————————————————————————————————————————————

/** A plaster swag: a crescent sweeping down from an outer top corner to a point at the middle. */
function swagGeometry(width: number, height: number, thick: number) {
  const s = new Shape();
  s.moveTo(0, 0);
  s.lineTo(width, 0);
  s.quadraticCurveTo(width * 0.95, -height * 0.95, 0, -height);
  s.quadraticCurveTo(width * 0.62, -height * 0.55, width * 0.92, 0);
  s.lineTo(0, 0);
  return new ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 24 });
}

// ——— The interior's architecture ————————————————————————————————————————

export function CrownDecor({ interior, night, hour, lightsOn }: { interior: Interior; night: number; hour: number; lightsOn: boolean }) {
  const H = wallHeight(interior);
  const { width: w, depth: d } = interior;
  const floor = contourFloor();
  const reliefMap = relief();
  const sky = skylineTexture(skyMoodAt(night, hour), 31);
  const swag = useMemo(() => swagGeometry(1.25, 1.05, 0.07), []);
  const back = d / 2 - 0.02;
  return (
    <group>
      {/* The contour-line microcement floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={floor} roughness={0.55} />
      </mesh>

      {/* The partition between the bedroom wing and the salon (its walls are solid in the layout) */}
      {interior.partitions.map((p, i) => (
        <mesh key={i} position={[p.position[0], H / 2, p.position[2]]} castShadow receiveShadow>
          <boxGeometry args={[p.size[0], H, p.size[2]]} />
          <M color={PLASTER} />
        </mesh>
      ))}

      {/* Bulkhead along the back wall with the air-conditioning slots and downlights */}
      <mesh position={[0.8, H - 0.32, back - 0.32]}><boxGeometry args={[w - 1.6, 0.64, 0.64]} /><M color={PLASTER} /></mesh>
      {[0, 1, 2, 3].map((k) => (
        <mesh key={k} position={[0.8, H - 0.5 + k * 0.07, back - 0.645]}><boxGeometry args={[6.5, 0.02, 0.01]} /><M color="#5b5955" /></mesh>
      ))}
      {[-2.6, -0.4, 1.8, 4.0, 6.2].map((x) => (
        <mesh key={x} position={[x, H - 0.645, back - 0.4]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.06, 16]} /><meshStandardMaterial color="#fff6e6" emissive={WARM} emissiveIntensity={lightsOn ? 1.5 : 0.05} side={DoubleSide} /></mesh>
      ))}

      {/* The salon's feature wall: fluted panels and bead strips either side of the relief, with light strips */}
      <group position={[0, 0, back - 0.66]}>
        <group position={[-2.45, 0, 0]}><FlutedPanel width={1.7} height={H - 0.66} /></group>
        <group position={[3.95, 0, 0]}><FlutedPanel width={1.9} height={H - 0.66} /></group>
        {[-1.55, -3.3, 3.0, 4.95].map((x) => <group key={x} position={[x, 0, 0.03]}><BeadStrip height={H - 0.7} /></group>)}
        <group position={[-3.36, 0, 0.02]}><Strip len={H - 0.7} night={night} /></group>
        <group position={[4.98, 0, 0.02]}><Strip len={H - 0.7} night={night} /></group>
        {/* Our plaster relief: a serene mask and a crescent over a fluted ground */}
        <mesh position={[0.72, 2.25, 0.0]} receiveShadow castShadow>
          <planeGeometry args={[4.4, 3.1, 220, 155]} />
          <meshStandardMaterial color={PLASTER} displacementMap={reliefMap} displacementScale={0.09} displacementBias={-0.03} bumpMap={reliefMap} bumpScale={8} roughness={0.85} />
        </mesh>
      </group>

      {/* The media wall on the partition's salon face: swags over the screen between columns, lit niches */}
      <group position={[-3.33, 0, -3.2]} rotation={[0, Math.PI / 2, 0]}>
        {[-1.6, 1.6].map((dx) => (
          <mesh key={dx} position={[dx, (H - 0.66) / 2, 0.2]} castShadow><cylinderGeometry args={[0.17, 0.17, H - 0.66, 24]} /><M color={PLASTER} /></mesh>
        ))}
        {[0, 1].map((layer) => [1, -1].map((side) => (
          <mesh key={`${layer}${side}`} geometry={swag} position={[side * 0.02, 3.55 - layer * 0.25, 0.04 + layer * 0.07]} scale={[side * (1.2 - layer * 0.1), 1 - layer * 0.12, 1]} rotation={[0, side < 0 ? Math.PI : 0, 0]}>
            <M color={PLASTER} rough={0.8} />
          </mesh>
        )))}
        {/* The low floating shelf under the screen */}
        <mesh position={[0, 0.3, 0.2]}><boxGeometry args={[2.6, 0.12, 0.4]} /><M color="#dedad4" /></mesh>
        {/* Lit niches either side: shelves with vases and books */}
        {[-2.45, 2.45].map((dx) => (
          <group key={dx} position={[dx, 0, 0.12]}>
            <mesh position={[0, (H - 0.8) / 2 + 0.1, -0.02]}><boxGeometry args={[0.62, H - 0.8, 0.04]} /><meshStandardMaterial color="#f3e6cf" emissive={WARM} emissiveIntensity={lightsOn ? 0.5 + night * 0.6 : 0.05} /></mesh>
            {[0.7, 1.35, 2.0, 2.65, 3.3].map((y) => <mesh key={y} position={[0, y, 0.1]}><boxGeometry args={[0.62, 0.035, 0.26]} /><M color="#d9d4cc" /></mesh>)}
            {[0.7, 2.0, 3.3].map((y, i) => <mesh key={i} position={[0.1 - i * 0.05, y + 0.15, 0.12]}><cylinderGeometry args={[0.06, 0.08, 0.26, 16]} /><M color={['#d9d3c9', '#c9c1b5', '#e3ddd3'][i]} rough={0.4} /></mesh>)}
            {[1.35, 2.65].map((y) => <mesh key={y} position={[-0.12, y + 0.11, 0.12]}><boxGeometry args={[0.22, 0.2, 0.15]} /><M color="#e9e5df" /></mesh>)}
          </group>
        ))}
        {/* A bead pendant beside the screen, and a stacked-stone sculpture on the floor */}
        <group position={[1.95, 0, 0.45]}>
          {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[0, 2.05 + i * 0.105, 0]}><sphereGeometry args={[0.055, 16, 12]} /><M color={OLIVE} rough={0.25} /></mesh>)}
          <mesh position={[0, 1.93, 0]}><cylinderGeometry args={[0.04, 0.11, 0.18, 20, 1, true]} /><meshStandardMaterial color={OLIVE} roughness={0.25} side={DoubleSide} /></mesh>
          <mesh position={[0, 1.86, 0]}><circleGeometry args={[0.1, 20]} /><meshStandardMaterial color="#f2d36a" emissive="#f2c24a" emissiveIntensity={lightsOn ? 1.2 : 0.05} side={DoubleSide} /></mesh>
          <mesh position={[0, 2.95 + 0.6, 0]}><cylinderGeometry args={[0.004, 0.004, 1.2, 4]} /><M color="#333" /></mesh>
        </group>
        <group position={[-1.95, 0, 0.4]}>
          {[0.1, 0.3, 0.52, 0.76, 1.0, 1.22].map((y, i) => <mesh key={i} position={[0, y, 0]} scale={[1, 0.55, 0.8]}><sphereGeometry args={[0.13 - i * 0.008, 18, 14]} /><M color="#dcd7cf" rough={0.6} /></mesh>)}
        </group>
      </group>

      {/* The library wall at the back of the east wing: rounded columns with shelves between */}
      <group position={[7.05, 0, back - 0.18]}>
        {[-1.6, 0, 1.6].map((dx) => <mesh key={dx} position={[dx, (H - 0.66) / 2, 0]}><cylinderGeometry args={[0.2, 0.2, H - 0.66, 24, 1, false, -Math.PI / 2, Math.PI]} /><M color={PLASTER} /></mesh>)}
        {[-0.8, 0.8].flatMap((dx, side) => [0.55, 1.0, 1.45, 1.9, 2.35, 2.8, 3.25].map((y, i) => (
          <group key={`${dx}${y}`} position={[dx, y + (side ? 0.2 : 0), -0.02]}>
            <mesh><boxGeometry args={[1.25, 0.03, 0.28]} /><M color="#dcd8d2" /></mesh>
            {(i + side) % 3 === 0 && <mesh position={[-0.3, 0.11, 0]}><boxGeometry args={[0.22, 0.2, 0.18]} /><M color="#ebe7e1" /></mesh>}
            {(i + side) % 3 === 1 && <mesh position={[0.25, 0.1, 0]}><sphereGeometry args={[0.07, 14, 10]} /><M color="#d4cec4" /></mesh>}
            {(i + side) % 4 === 2 && <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.04, 0.05, 0.22, 12]} /><M color="#7a3a2a" rough={0.4} /></mesh>}
          </group>
        )))}
      </group>

      {/* The tall window on the east wall, with linen and sheer curtains */}
      <group position={[w / 2 - 0.02, 0, 2.6]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 2.05, 0]}>
          <planeGeometry args={[3.4, 3.2]} />
          <meshStandardMaterial map={sky} emissiveMap={sky} emissive="#ffffff" emissiveIntensity={night > 0.5 ? 0.7 : 0.9} toneMapped={false} />
        </mesh>
        {[-1.7, -0.57, 0.57, 1.7].map((dx) => <mesh key={dx} position={[dx, 2.05, 0.02]}><boxGeometry args={[0.06, 3.2, 0.05]} /><M color="#4a3424" rough={0.4} /></mesh>)}
        {[0.45, 3.65].map((y) => <mesh key={y} position={[0, y, 0.02]}><boxGeometry args={[3.5, 0.06, 0.05]} /><M color="#4a3424" rough={0.4} /></mesh>)}
        <Curtain x={-2.15} width={1.0} height={H - 0.35} color="#bfb2a3" />
        <Curtain x={2.15} width={1.0} height={H - 0.35} color="#bfb2a3" />
        <mesh position={[0, (H - 0.35) / 2, 0.25]}>
          <planeGeometry args={[3.3, H - 0.35]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.28} side={DoubleSide} roughness={1} />
        </mesh>
      </group>

      {/* The bedroom wing's headboard wall: fluted panelling with light strips */}
      <group position={[-6.3, 0, back - 0.02]}>
        <FlutedPanel width={4.2} height={H - 0.7} pitch={0.09} />
        {[-2.15, 2.15].map((dx) => <group key={dx} position={[dx, 0, 0.03]}><Strip len={H - 0.75} night={night} /></group>)}
      </group>

      {/* The coved ceiling: a dropped band round the room with a warm light in its lip, the middle raised */}
      <CeilingTray w={w} d={d} H={H} night={night} lightsOn={lightsOn} />
      <FringeChandelier x={0.75} z={2.6} size={1.0} drop={1.15} ceiling={H} night={night} lightsOn={lightsOn} />
      <FringeChandelier x={-0.6} z={-3.1} size={0.8} drop={1.25} ceiling={H} night={night} lightsOn={lightsOn} tone="#8d8a84" />
      <FringeChandelier x={6.6} z={2.4} size={0.75} drop={1.2} ceiling={H} night={night} lightsOn={lightsOn} />
    </group>
  );
}

/** A linen curtain hanging in soft folds. */
function Curtain({ x, width, height, color }: { x: number; width: number; height: number; color: string }) {
  const geom = useMemo(() => {
    const segs = 24, g = new BufferGeometry(), pos: number[] = [], idx: number[] = [];
    for (let i = 0; i <= segs; i++) for (let j = 0; j <= 1; j++) {
      const u = i / segs;
      pos.push(-width / 2 + u * width, j * height, Math.sin(u * Math.PI * 7) * 0.06);
    }
    for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [width, height]);
  return <mesh geometry={geom} position={[x, 0.02, 0.18]}><meshStandardMaterial color={color} roughness={0.95} side={DoubleSide} /></mesh>;
}

/** The ceiling tray: a dropped plaster band round the room's edge, its inner lip lit. */
function CeilingTray({ w, d, H, night, lightsOn }: { w: number; d: number; H: number; night: number; lightsOn: boolean }) {
  const geom = useMemo(() => {
    const outer = new Shape();
    outer.moveTo(-w / 2, -d / 2); outer.lineTo(w / 2, -d / 2); outer.lineTo(w / 2, d / 2); outer.lineTo(-w / 2, d / 2); outer.lineTo(-w / 2, -d / 2);
    // The raised middle: a soft cushion shape
    const iw = w / 2 - 2.2, id = d / 2 - 1.9, r = 2.2;
    const hole = new Shape();
    hole.moveTo(-iw + r, -id);
    hole.lineTo(iw - r, -id); hole.quadraticCurveTo(iw, -id, iw, -id + r);
    hole.lineTo(iw, id - r); hole.quadraticCurveTo(iw, id, iw - r, id);
    hole.lineTo(-iw + r, id); hole.quadraticCurveTo(-iw, id, -iw, id - r);
    hole.lineTo(-iw, -id + r); hole.quadraticCurveTo(-iw, -id, -iw + r, -id);
    outer.holes.push(hole);
    return new ExtrudeGeometry(outer, { depth: 0.3, bevelEnabled: false, curveSegments: 20 });
  }, [w, d]);
  const lip = useMemo(() => {
    const iw = w / 2 - 2.2, id = d / 2 - 1.9;
    return new CatmullRomCurve3([
      new Vector3(-iw + 1, 0, -id), new Vector3(iw - 1, 0, -id), new Vector3(iw, 0, -id + 1), new Vector3(iw, 0, id - 1), new Vector3(iw - 1, 0, id),
      new Vector3(-iw + 1, 0, id), new Vector3(-iw, 0, id - 1), new Vector3(-iw, 0, -id + 1),
    ], true);
  }, [w, d]);
  return (
    <group>
      <mesh geometry={geom} position={[0, H - 0.32, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow><M color="#ece9e4" rough={0.9} /></mesh>
      <mesh position={[0, H - 0.335, 0]}>
        <tubeGeometry args={[lip, 120, 0.02, 6, true]} />
        <meshStandardMaterial color="#fff4e2" emissive={WARM} emissiveIntensity={lightsOn ? 1.2 + night * 1.4 : 0.05} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ——— Furniture ————————————————————————————————————————————————————————

/** A Crown Residence piece (design `crown-*`), drawn round its centre on the floor. */
export function CrownPiece({ f, night = 0 }: { f: Furniture; night?: number }) {
  const [w, h, d] = f.size;
  switch (f.design) {
    case 'crown-sofa': {
      const long = w >= d, L = long ? w : d, D = long ? d : w;
      return <group rotation={[0, sofaFacing(f), 0]}><CurvedSofa L={L} D={D} h={h} color={f.color} /></group>;
    }
    case 'crown-tube-chair': return <TubeChair w={w} d={d} color={f.color} />;
    case 'crown-side-lamp': return <SideTable withLamp night={night} />;
    case 'crown-side-table': return <SideTable />;
    case 'crown-cloud-table': return <CloudTables w={w} d={d} h={h} color={f.color} />;
    case 'crown-cloud-table-small': return <group rotation={[0, Math.PI / 2, 0]}><CloudTables w={d} d={w} h={h} color={f.color} single /></group>;
    case 'crown-olive': return <OliveTree h={h} r={Math.max(w, d) / 2} />;
    case 'crown-tv': return (
      <group>
        <mesh position={[0, 1.55, 0]}><boxGeometry args={[0.04, h, d]} /><M color="#0c0d10" rough={0.15} metal={0.4} /></mesh>
        <mesh position={[0.025, 1.55, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[d * 0.97, h * 0.95]} /><meshStandardMaterial color="#141820" emissive="#1c2a3a" emissiveIntensity={0.25} roughness={0.1} /></mesh>
      </group>
    );
    case 'crown-kitchen': return <StraightKitchen depth={w} length={d} night={night} />;
    case 'crown-tall-unit': return (
      <group>
        <mesh position={[0, h / 2, 0]} castShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial map={oakDoor()} roughness={0.6} /></mesh>
        {[-0.2, 0.2].map((dz) => <mesh key={dz} position={[-w / 2 - 0.02, 1.2, dz]}><boxGeometry args={[0.02, 0.6, 0.025]} /><M color="#1b1b1b" metal={0.6} rough={0.35} /></mesh>)}
      </group>
    );
    default: return null;
  }
}

/** A curved low sofa facing +z: plinth, deep cushions, oval arm panels, pom-pom trim, pillows and a throw. */
function CurvedSofa({ L, D, h, color }: { L: number; D: number; h: number; color: string }) {
  const trim = useMemo(() => Array.from({ length: Math.floor((L - 0.6) / 0.07) }, (_, i) => [-(L - 0.6) / 2 + i * 0.07, h + 0.02, -D / 2 + 0.16] as const), [L, D, h]);
  const shade = new Color(color).multiplyScalar(0.94).getStyle();
  return (
    <group>
      <RoundedBox args={[L - 0.7, 0.14, D - 0.45]} radius={0.06} position={[0, 0.07, -0.02]}><M color={shade} rough={0.9} /></RoundedBox>
      <RoundedBox args={[L - 0.5, 0.26, D - 0.28]} radius={0.1} position={[0, 0.3, 0.04]} castShadow><M color={color} rough={0.95} /></RoundedBox>
      <RoundedBox args={[L - 0.5, 0.48, 0.3]} radius={0.12} position={[0, 0.62, -D / 2 + 0.18]} castShadow><M color={color} rough={0.95} /></RoundedBox>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (L / 2 - 0.15), 0, 0]}>
          <RoundedBox args={[0.3, 0.78, D]} radius={0.14} position={[0, 0.42, 0]} castShadow><M color={color} rough={0.95} /></RoundedBox>
          <RoundedBox args={[0.32, 0.62, D - 0.18]} radius={0.12} position={[0, 0.42, 0]}><M color={shade} rough={0.95} /></RoundedBox>
        </group>
      ))}
      <Repeat at={trim}>{[<sphereGeometry key="g" args={[0.028, 8, 6]} />, <M key="m" color="#f4f1ec" />]}</Repeat>
      {[-0.32, 0.32].map((k, i) => (
        <RoundedBox key={i} args={[0.48, 0.46, 0.14]} radius={0.06} position={[k * L * 0.75, 0.66, -D / 2 + 0.38]} rotation={[-0.25, i ? -0.15 : 0.15, 0]}><M color="#f1eee9" /></RoundedBox>
      ))}
      <mesh position={[0, 0.55, -D / 2 + 0.42]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.1, 0.1, 0.55, 20]} /><M color="#e9e5df" /></mesh>
      {/* A throw over one arm */}
      <mesh position={[L / 2 - 0.4, 0.45, 0.1]} rotation={[0, 0, -0.1]}><boxGeometry args={[0.5, 0.02, D * 0.8]} /><M color="#e2ddd6" /></mesh>
    </group>
  );
}

/** A tube armchair: one rounded tube looping over a round seat, on ball feet; its open front faces -z. */
function TubeChair({ w, d, color }: { w: number; d: number; color: string }) {
  const loop = useMemo(() => new CatmullRomCurve3([
    new Vector3(-w / 2 + 0.11, 0.1, -d / 2 + 0.12), new Vector3(-w / 2 + 0.11, 0.6, -d / 2 + 0.12), new Vector3(-w / 2 + 0.11, 0.66, d / 2 - 0.2),
    new Vector3(0, 0.68, d / 2 - 0.11), new Vector3(w / 2 - 0.11, 0.66, d / 2 - 0.2), new Vector3(w / 2 - 0.11, 0.6, -d / 2 + 0.12), new Vector3(w / 2 - 0.11, 0.1, -d / 2 + 0.12),
  ], false, 'catmullrom', 0.2), [w, d]);
  return (
    <group>
      <mesh castShadow><tubeGeometry args={[loop, 60, 0.11, 16, false]} /><M color={color} rough={0.95} /></mesh>
      <mesh position={[0, 0.22, 0.02]} castShadow><cylinderGeometry args={[w * 0.33, w * 0.33, 0.36, 32]} /><M color={color} rough={0.95} /></mesh>
      <mesh position={[0, 0.41, 0.02]}><cylinderGeometry args={[w * 0.32, w * 0.33, 0.04, 32]} /><M color="#efebe6" rough={0.95} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * (w / 2 - 0.11), 0.09, -d / 2 + 0.12]}><sphereGeometry args={[0.09, 16, 12]} /><M color={color} /></mesh>)}
    </group>
  );
}

/** A stacked side table (disc, ball, cone), optionally with an olive ball lamp. */
function SideTable({ withLamp = false, night = 0 }: { withLamp?: boolean; night?: number }) {
  return (
    <group>
      <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.16, 0.2, 0.12, 24]} /><M color={PLASTER} /></mesh>
      <mesh position={[0, 0.22, 0]}><sphereGeometry args={[0.12, 20, 16]} /><M color={PLASTER} /></mesh>
      <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.05, 0.14, 0.2, 20]} /><M color={PLASTER} /></mesh>
      <mesh position={[0, 0.53, 0]} castShadow><cylinderGeometry args={[0.24, 0.24, 0.05, 32]} /><M color={PLASTER} /></mesh>
      {withLamp ? (
        <group position={[0, 0.555, 0]}>
          {[0.07, 0.19, 0.3].map((y, i) => <mesh key={i} position={[0, y, 0]}><sphereGeometry args={[0.065 - i * 0.006, 18, 14]} /><M color={OLIVE} rough={0.25} /></mesh>)}
          <mesh position={[0, 0.52, 0]}><cylinderGeometry args={[0.13, 0.16, 0.24, 28, 1, true]} /><meshStandardMaterial color="#f5ead6" emissive="#ffd9a0" emissiveIntensity={0.7 + night} side={DoubleSide} /></mesh>
          <pointLight position={[0, 0.5, 0]} intensity={0.4 + night * 1.6} distance={3} decay={2} color="#ffd9a0" />
        </group>
      ) : (
        <group position={[0, 0.555, 0]}>
          <mesh position={[0, 0.02, 0]}><boxGeometry args={[0.28, 0.04, 0.2]} /><M color="#efebe6" /></mesh>
          <mesh position={[0, 0.2, 0]}><boxGeometry args={[0.18, 0.22, 0.02]} /><M color="#f4f1ec" /></mesh>
        </group>
      )}
    </group>
  );
}

/** Two nesting cloud tables (one higher), a round ottoman tucked under, and a few things on top. */
function CloudTables({ w, d, h, color, single = false }: { w: number; d: number; h: number; color: string; single?: boolean }) {
  const slab = (sw: number, sd: number) => {
    const s = new Shape(), r = Math.min(sw, sd) * 0.48;
    s.moveTo(-sw / 2 + r, -sd / 2); s.lineTo(sw / 2 - r, -sd / 2); s.quadraticCurveTo(sw / 2, -sd / 2, sw / 2, -sd / 2 + r);
    s.lineTo(sw / 2, sd / 2 - r); s.quadraticCurveTo(sw / 2, sd / 2, sw / 2 - r, sd / 2); s.lineTo(-sw / 2 + r, sd / 2);
    s.quadraticCurveTo(-sw / 2, sd / 2, -sw / 2, sd / 2 - r); s.lineTo(-sw / 2, -sd / 2 + r); s.quadraticCurveTo(-sw / 2, -sd / 2, -sw / 2 + r, -sd / 2);
    return new ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 16 });
  };
  const big = useMemo(() => slab(w * 0.68, d * 0.9), [w, d]);
  const small = useMemo(() => slab(w * 0.5, d * 0.7), [w, d]);
  return (
    <group>
      {/* The lower, larger table on a curved panel leg */}
      <group position={[-w * 0.15, 0, 0]}>
        <mesh geometry={big} position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><M color={color} /></mesh>
        <mesh position={[-w * 0.22, h / 2, 0]}><boxGeometry args={[0.05, h, d * 0.7]} /><M color={color} /></mesh>
        <mesh position={[0, h / 2, -d * 0.36]}><boxGeometry args={[w * 0.4, h, 0.05]} /><M color={color} /></mesh>
      </group>
      {!single && (
        <group position={[w * 0.2, 0, d * 0.05]}>
          <mesh geometry={small} position={[0, h + 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><M color={color} /></mesh>
          <mesh position={[w * 0.18, (h + 0.1) / 2, 0]}><cylinderGeometry args={[d * 0.3, d * 0.3, h + 0.1, 32, 1, false, -Math.PI / 2, Math.PI]} /><M color={color} /></mesh>
        </group>
      )}
      {/* The ottoman under the table's open side */}
      <mesh position={[-w * 0.1, 0.2, d * 0.35]} castShadow><cylinderGeometry args={[0.24, 0.24, 0.4, 28]} /><M color={SOFT} rough={0.95} /></mesh>
      {/* On top: a tray with two cups, a diffuser and a small vase */}
      <group position={[-w * 0.2, h + 0.06, 0]}>
        <mesh><cylinderGeometry args={[0.16, 0.16, 0.02, 24]} /><M color="#e8e4de" /></mesh>
        {[-0.06, 0.06].map((k) => <mesh key={k} position={[k, 0.04, 0]}><cylinderGeometry args={[0.04, 0.035, 0.06, 16]} /><M color="#f2efea" rough={0.4} /></mesh>)}
      </group>
      <group position={[w * 0.2, h + 0.17, 0]}>
        <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.05, 0.05, 0.12, 16]} /><M color="#ece8e2" /></mesh>
        {[-0.02, 0.01, 0.025].map((k, i) => <mesh key={i} position={[k, 0.22, k]} rotation={[k * 3, 0, k * 4]}><cylinderGeometry args={[0.004, 0.004, 0.28, 4]} /><M color="#d8d2c8" /></mesh>)}
      </group>
      <mesh position={[-w * 0.05, h + 0.11, -d * 0.2]}><sphereGeometry args={[0.07, 14, 10]} /><M color="#e3ddd4" rough={0.4} /></mesh>
    </group>
  );
}

/** An olive tree in a taupe pot: a twisting double trunk and a rounded crown of grey-green leaves. */
function OliveTree({ h, r }: { h: number; r: number }) {
  const trunks = useMemo(() => [0, Math.PI].map((ph) => new CatmullRomCurve3(Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    return new Vector3(Math.cos(t * 7 + ph) * 0.05, 0.35 + t * (h * 0.55), Math.sin(t * 7 + ph) * 0.05);
  }))), [h]);
  const clumps = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const a = i * 2.4, k = (i % 5) / 5;
    return [Math.cos(a) * r * (0.35 + k * 0.5), h * 0.68 + (i % 3) * h * 0.08, Math.sin(a) * r * (0.35 + k * 0.5), 0.18 + (i % 4) * 0.04] as const;
  }), [h, r]);
  return (
    <group>
      <mesh position={[0, 0.18, 0]} castShadow><cylinderGeometry args={[r * 0.48, r * 0.4, 0.36, 24]} /><M color="#9a8a78" /></mesh>
      {trunks.map((c, i) => <mesh key={i} castShadow><tubeGeometry args={[c, 30, 0.028, 6, false]} /><M color="#5a4128" /></mesh>)}
      {clumps.map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} castShadow><icosahedronGeometry args={[s, 1]} /><meshStandardMaterial color={i % 2 ? '#4b5a3a' : '#56664a'} roughness={0.9} flatShading /></mesh>
      ))}
    </group>
  );
}

// ——— The 14 ft straight kitchen ——————————————————————————————————————

const FT = 0.3048;

/**
 * The 14 ft straight kitchen on a wall, its front facing -x and its length along z (the left
 * end, as you face it, at -z). Heights from the elevation: 2'6" base units with the counter,
 * a 2'6" backsplash, 2' upper cabinets and 2' loft storage, then a false ceiling with cove
 * light; fluted oak side panels at both ends.
 */
function StraightKitchen({ depth, length, night }: { depth: number; length: number; night: number }) {
  const L = length, D = depth;
  const front = -D / 2;
  const baseTop = 2.5 * FT, splashTop = baseTop + 2.5 * FT, upperTop = splashTop + 2 * FT, loftTop = upperTop + 2 * FT;
  const upperDepth = 0.36;
  const sage = '#7d8f80';
  // Upper columns, left to right: open lit shelf, sage doors over a glass flap, glass crockery shutters, oak doors (two rows)
  const upper: { w: number; kind: 'open' | 'sage' | 'glass' | 'oak' }[] = [
    { w: 1.5 * FT, kind: 'open' }, { w: 1.5 * FT, kind: 'sage' }, { w: 1.5 * FT, kind: 'sage' },
    { w: 1.5 * FT, kind: 'glass' }, { w: 1.5 * FT, kind: 'glass' },
  ];
  const oakW = (L - upper.reduce((s, u) => s + u.w, 0)) / 4;
  for (let i = 0; i < 4; i++) upper.push({ w: oakW, kind: 'oak' });
  // Base units, left to right: corner, door, tall pull-out, door, door, three drawers, door, two drawers, corner
  const baseSpec: { w: number; kind: 'x' | 'door' | 'pull' | 'drawers3' | 'drawers2' }[] = [
    { w: 0.6, kind: 'x' }, { w: 0.44, kind: 'door' }, { w: 0.26, kind: 'pull' }, { w: 0.44, kind: 'door' }, { w: 0.44, kind: 'door' },
    { w: 0.84, kind: 'drawers3' }, { w: 0.44, kind: 'door' }, { w: 0.7, kind: 'drawers2' },
  ];
  baseSpec.push({ w: L - baseSpec.reduce((s, b) => s + b.w, 0), kind: 'x' });
  const zStart = (list: { w: number }[], i: number) => -L / 2 + list.slice(0, i).reduce((s, u) => s + u.w, 0);
  const handle = (y: number, z: number, vertical = true, len = 0.22) => (
    <mesh position={[front - 0.025, y, z]}><boxGeometry args={[0.02, vertical ? len : 0.02, vertical ? 0.02 : len]} /><M color="#1a1a1a" metal={0.6} rough={0.35} /></mesh>
  );
  const glow = 1.2 + night * 1.4;
  return (
    <group>
      {/* Plinth, base carcass and the quartz counter */}
      <mesh position={[0, 0.05, 0.03]}><boxGeometry args={[D - 0.06, 0.1, L]} /><M color="#3e463f" /></mesh>
      {baseSpec.map((b, i) => {
        const z0 = zStart(baseSpec, i), zc = z0 + b.w / 2;
        const doorH = baseTop - 0.12;
        return (
          <group key={i}>
            <mesh position={[0, 0.1 + doorH / 2, zc]} castShadow>
              <boxGeometry args={[D, doorH, b.w - 0.006]} />
              {b.kind === 'x' ? <meshStandardMaterial map={sageX()} roughness={0.7} /> : <M color={sage} rough={0.7} />}
            </mesh>
            {b.kind === 'door' && handle(0.1 + doorH - 0.12, z0 + b.w - 0.05)}
            {b.kind === 'pull' && handle(0.1 + doorH - 0.12, zc)}
            {b.kind === 'drawers3' && [0.33, 0.58].map((y) => <group key={y}><mesh position={[front - 0.003, y, zc]}><boxGeometry args={[0.005, 0.01, b.w - 0.02]} /><M color="#3e463f" /></mesh>{handle(y + 0.1, zc, false, 0.3)}</group>)}
            {b.kind === 'drawers2' && [0.42].map((y) => <group key={y}><mesh position={[front - 0.003, y, zc]}><boxGeometry args={[0.005, 0.01, b.w - 0.02]} /><M color="#3e463f" /></mesh>{handle(y + 0.17, zc, false, 0.3)}{handle(y - 0.1, zc, false, 0.3)}</group>)}
          </group>
        );
      })}
      <mesh position={[-0.01, baseTop + 0.02, 0]} castShadow receiveShadow><boxGeometry args={[D + 0.03, 0.04, L]} /><M color="#efe9e0" rough={0.25} /></mesh>
      {/* Stone backsplash */}
      <mesh position={[D / 2 - 0.01, (baseTop + splashTop) / 2 + 0.02, 0]}><boxGeometry args={[0.02, splashTop - baseTop, L]} /><M color="#e3d8c8" rough={0.6} /></mesh>

      {/* Upper cabinets and loft */}
      <group position={[D / 2 - upperDepth / 2, 0, 0]}>
        {upper.map((u, i) => {
          const z0 = zStart(upper, i), zc = z0 + u.w / 2;
          const h = loftTop - splashTop;
          if (u.kind === 'open') return (
            <group key={i}>
              <mesh position={[0, splashTop + h / 2, zc]}><boxGeometry args={[upperDepth, h, u.w]} /><meshStandardMaterial color="#8a5f38" roughness={0.6} side={DoubleSide} transparent opacity={0.0001} /></mesh>
              {[0, 1].map((k) => <mesh key={k} position={[0, splashTop + h / 2, z0 + 0.01 + k * (u.w - 0.02)]}><boxGeometry args={[upperDepth, h, 0.02]} /><M color="#9a6b40" rough={0.6} /></mesh>)}
              <mesh position={[upperDepth / 2 - 0.01, splashTop + h / 2, zc]}><boxGeometry args={[0.01, h, u.w]} /><meshStandardMaterial color="#6b4a2c" emissive="#ffb060" emissiveIntensity={0.35 + night * 0.4} /></mesh>
              {[splashTop + 0.02, splashTop + h * 0.5, loftTop - 0.02].map((y) => <mesh key={y} position={[0, y, zc]}><boxGeometry args={[upperDepth, 0.025, u.w - 0.02]} /><M color="#9a6b40" /></mesh>)}
              <mesh position={[0, splashTop + h * 0.5 + 0.14, zc]}><cylinderGeometry args={[0.035, 0.05, 0.24, 14]} /><M color="#e9e2d6" rough={0.4} /></mesh>
            </group>
          );
          if (u.kind === 'glass') return (
            <group key={i}>
              <mesh position={[upperDepth / 2 - 0.01, splashTop + h / 2, zc]}><boxGeometry args={[0.01, h, u.w]} /><meshStandardMaterial color="#5a4632" emissive="#ffb060" emissiveIntensity={0.5 + night * 0.6} /></mesh>
              {[0.3, 0.6, 0.9].map((k) => (
                <group key={k}>
                  <mesh position={[0, splashTop + h * k, zc]}><boxGeometry args={[upperDepth - 0.04, 0.02, u.w - 0.04]} /><M color="#2a2a2a" /></mesh>
                  {[-1, 0, 1].map((j) => <mesh key={j} position={[0, splashTop + h * k + 0.07, zc + j * u.w * 0.28]}><cylinderGeometry args={[0.03, 0.025, 0.12, 12]} /><meshStandardMaterial color="#f2f0ec" transparent opacity={0.85} roughness={0.15} /></mesh>)}
                </group>
              ))}
              {/* Black aluminium frame and glass */}
              <mesh position={[-upperDepth / 2, splashTop + h / 2, zc]}><boxGeometry args={[0.02, h, u.w - 0.01]} /><meshStandardMaterial color="#9fb0b4" transparent opacity={0.22} roughness={0.05} metalness={0.3} /></mesh>
              {[z0 + 0.012, z0 + u.w - 0.012].map((z) => <mesh key={z} position={[-upperDepth / 2, splashTop + h / 2, z]}><boxGeometry args={[0.03, h, 0.025]} /><M color="#1e1e1e" metal={0.5} rough={0.4} /></mesh>)}
              {[splashTop + 0.012, loftTop - 0.012].map((y) => <mesh key={y} position={[-upperDepth / 2, y, zc]}><boxGeometry args={[0.03, 0.025, u.w]} /><M color="#1e1e1e" metal={0.5} rough={0.4} /></mesh>)}
              {handle(splashTop + 0.25, i === 3 ? z0 + u.w - 0.05 : z0 + 0.05, true, 0.3)}
            </group>
          );
          if (u.kind === 'sage') return (
            <group key={i}>
              <mesh position={[0, splashTop + 0.3 + (h - 0.3) / 2, zc]} castShadow><boxGeometry args={[upperDepth, h - 0.3, u.w - 0.006]} /><M color={sage} rough={0.7} /></mesh>
              {handle(splashTop + 0.42, i === 1 ? z0 + u.w - 0.05 : z0 + 0.05, true, 0.25)}
            </group>
          );
          return (
            <group key={i}>
              {[0, 1].map((row) => (
                <mesh key={row} position={[0, splashTop + (row + 0.5) * (h / 2), zc]} castShadow>
                  <boxGeometry args={[upperDepth, h / 2 - 0.006, u.w - 0.006]} />
                  <meshStandardMaterial map={oakDoor()} roughness={0.6} />
                </mesh>
              ))}
              {handle(splashTop + 0.2, i % 2 ? z0 + 0.05 : z0 + u.w - 0.05, true, 0.25)}
              {handle(upperTop + 0.1, i % 2 ? z0 + 0.05 : z0 + u.w - 0.05, true, 0.25)}
            </group>
          );
        })}
        {/* The reeded glass flap under the sage doors */}
        <mesh position={[-upperDepth / 2 + 0.01, splashTop + 0.15, zStart(upper, 1) + 1.5 * FT]}>
          <boxGeometry args={[0.03, 0.28, 3 * FT - 0.02]} />
          <meshStandardMaterial color="#d8c8a8" emissive="#ffc070" emissiveIntensity={0.25 + night * 0.3} roughness={0.4} />
        </mesh>
        <mesh position={[-upperDepth / 2 - 0.005, splashTop + 0.15, zStart(upper, 1) + 1.5 * FT]}><boxGeometry args={[0.012, 0.3, 3 * FT]} /><meshStandardMaterial color="#1e1e1e" transparent opacity={0.6} /></mesh>
        {/* Warm light under the upper units */}
        <mesh position={[-upperDepth / 2 + 0.05, splashTop - 0.01, 0]}><boxGeometry args={[0.03, 0.012, L - 0.1]} /><meshStandardMaterial color="#fff2d6" emissive={WARM} emissiveIntensity={glow} toneMapped={false} /></mesh>
      </group>
      <pointLight position={[-0.1, splashTop - 0.15, -L / 4]} intensity={0.8 + night * 1.6} distance={2.4} decay={2} color="#ffcf8a" />
      <pointLight position={[-0.1, splashTop - 0.15, L / 4]} intensity={0.8 + night * 1.6} distance={2.4} decay={2} color="#ffcf8a" />

      {/* False ceiling over the run, with a cove light along its front and downlights */}
      <mesh position={[-0.12, loftTop + 0.25, 0]}><boxGeometry args={[D + 0.25, 0.14, L + 0.3]} /><M color="#f2efea" /></mesh>
      <mesh position={[-D / 2 - 0.25, loftTop + 0.17, 0]}><boxGeometry args={[0.03, 0.02, L + 0.2]} /><meshStandardMaterial color="#fff2d6" emissive={WARM} emissiveIntensity={glow} toneMapped={false} /></mesh>
      {[-L / 3, 0, L / 3].map((z) => <mesh key={z} position={[-D / 2 - 0.15, loftTop + 0.175, z]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.04, 14]} /><meshStandardMaterial color="#fff6e6" emissive={WARM} emissiveIntensity={glow} side={DoubleSide} /></mesh>)}
      {/* Fluted oak side panels at both ends, floor to false ceiling */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-0.04, (loftTop + 0.32) / 2, s * (L / 2 + 0.05)]} castShadow>
          <boxGeometry args={[D + 0.12, loftTop + 0.32, 0.1]} />
          <meshStandardMaterial map={flutedOak()} roughness={0.55} />
        </mesh>
      ))}

      {/* On the counter: fruit bowl, kettle, utensils, pot, microwave, hob with a pan, toaster, air fryer, spices */}
      <CounterTop front={front} y={baseTop + 0.04} L={L} />
    </group>
  );
}

function CounterTop({ front, y, L }: { front: number; y: number; L: number }) {
  const at = (s: number) => -L / 2 + s * L;
  const x = front + 0.3;
  const black = '#1b1c1e', steel = '#b9bcc0';
  return (
    <group position={[x, y, 0]}>
      <group position={[0, 0, at(0.05)]}>
        <mesh position={[0, 0.05, 0]}><sphereGeometry args={[0.11, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><M color="#2a2a2a" /></mesh>
        {[[-0.04, 0], [0.04, 0.02], [0, -0.04], [0.01, 0.04]].map(([a, b], i) => <mesh key={i} position={[a, 0.1, b]}><sphereGeometry args={[0.04, 12, 10]} /><M color="#e8822a" /></mesh>)}
      </group>
      <group position={[0, 0, at(0.14)]}><mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.07, 0.08, 0.24, 18]} /><M color={steel} metal={0.8} rough={0.25} /></mesh><mesh position={[0, 0.26, 0]}><cylinderGeometry args={[0.03, 0.06, 0.04, 14]} /><M color={black} /></mesh></group>
      <group position={[0, 0, at(0.22)]}><mesh position={[0, 0.09, 0]}><cylinderGeometry args={[0.05, 0.05, 0.18, 14]} /><M color="#e8e3db" /></mesh>{[-0.02, 0, 0.02].map((k) => <mesh key={k} position={[k, 0.24, k]}><cylinderGeometry args={[0.01, 0.01, 0.2, 6]} /><M color="#8a6a48" /></mesh>)}</group>
      <group position={[0, 0, at(0.3)]}><mesh position={[0, 0.08, 0]}><cylinderGeometry args={[0.1, 0.1, 0.16, 20]} /><M color={black} rough={0.4} /></mesh></group>
      <group position={[0.02, 0, at(0.42)]}><mesh position={[0, 0.15, 0]}><boxGeometry args={[0.36, 0.3, 0.5]} /><M color={black} rough={0.35} /></mesh><mesh position={[-0.181, 0.15, -0.04]}><boxGeometry args={[0.005, 0.24, 0.36]} /><meshStandardMaterial color="#111" roughness={0.05} /></mesh></group>
      {/* The hob, with a steel pot */}
      <group position={[0.02, 0, at(0.56)]}>
        <mesh position={[0, 0.006, 0]}><boxGeometry args={[0.5, 0.012, 0.6]} /><M color="#0e0f10" rough={0.08} /></mesh>
        {[[-0.12, -0.16], [-0.12, 0.16], [0.12, -0.16], [0.12, 0.16]].map(([a, b], i) => <mesh key={i} position={[a, 0.014, b]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.05, 0.075, 20]} /><M color="#2e2f31" metal={0.7} /></mesh>)}
        <mesh position={[-0.12, 0.1, 0.16]}><cylinderGeometry args={[0.1, 0.1, 0.16, 20]} /><M color={steel} metal={0.85} rough={0.25} /></mesh>
      </group>
      <group position={[0.02, 0, at(0.72)]}><mesh position={[0, 0.1, 0]}><boxGeometry args={[0.2, 0.2, 0.3]} /><M color={black} rough={0.35} /></mesh></group>
      <group position={[0.02, 0, at(0.86)]}><mesh position={[0, 0.15, 0]}><boxGeometry args={[0.28, 0.3, 0.26]} /><M color={black} rough={0.35} /></mesh></group>
      {[0.93, 0.955, 0.98].map((s) => <mesh key={s} position={[0.08, 0.06, at(s)]}><cylinderGeometry args={[0.025, 0.025, 0.12, 12]} /><M color="#7a4a20" rough={0.3} /></mesh>)}
      {/* The rail with hanging ladles, boards and a spice shelf */}
      <group position={[0.24, 0.48, at(0.68)]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.008, 0.008, L * 0.42, 8]} /><M color={black} metal={0.6} /></mesh>
        {[-0.7, -0.45, -0.2, 0.05, 0.3, 0.55].map((k, i) => (
          i === 3 || i === 4
            ? <mesh key={i} position={[0, -0.16, k * L * 0.2]}><boxGeometry args={[0.02, 0.28, 0.16]} /><M color="#a4774d" /></mesh>
            : <mesh key={i} position={[0, -0.12, k * L * 0.2]}><cylinderGeometry args={[0.006, 0.006, 0.22, 6]} /><M color={i % 2 ? black : steel} metal={0.6} /></mesh>
        ))}
        <mesh position={[0, -0.06, -0.85 * L * 0.2]}><boxGeometry args={[0.08, 0.1, 0.18]} /><M color={black} /></mesh>
      </group>
    </group>
  );
}

