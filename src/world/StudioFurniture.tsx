import { useMemo } from 'react';
import { CanvasTexture, DoubleSide, SRGBColorSpace } from 'three';
import { useLightsOn } from './lights';
import type { Furniture } from '../lib/interiors';
import { RealModel } from './RealModel';
import { pbr } from './pbr';

/**
 * The Studio collection (lib/furniture.ts `design` starting "studio-"): the
 * pieces from a warm loft studio — a tripod floor lamp, an egg chair, a guitar
 * on its stand, framed records, landmark prints, a coat stand, a vase of
 * pampas grass, a low bookshelf, linen storage boxes and a slatted bench.
 * Drawn here at their real size; the origin is the middle of the footprint.
 */


const OAK = '#b58a5a';
const WALNUT = '#5a3a24';
const BLACK = '#1b1b1d';

/** Facing away from the nearest wall (art and shelves hang or stand against one). */
function wallFacing(f: Furniture) {
  const [w, , d] = f.size;
  const turned = d > w;
  return turned ? (f.at[0] >= 0 ? -Math.PI / 2 : Math.PI / 2) : f.at[1] >= 0 ? Math.PI : 0;
}

/** A vinyl record sleeve, drawn: our own album art (no real covers). */
function sleeveTexture(seed: number) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const palettes = [['#e8b04a', '#1d3c5c', '#f2ede2'], ['#c0392b', '#f4d03f', '#1a1a1a'], ['#2e8b78', '#f2c0a0', '#283040']];
  const [a, b, bg] = palettes[seed % palettes.length];
  g.fillStyle = bg; g.fillRect(0, 0, 256, 256);
  g.fillStyle = a; g.beginPath(); g.arc(128, 128, 90 - seed * 6, 0, Math.PI * 2); g.fill();
  g.fillStyle = b; g.fillRect(40 + seed * 10, 170, 180 - seed * 20, 30);
  g.fillStyle = '#111'; g.beginPath(); g.arc(128, 128, 14, 0, Math.PI * 2); g.fill();
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}

/** A framed landmark print, painted: skyline silhouettes of our own (a bridge, a tower, a dome). */
function printTexture(seed: number) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 320;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 320);
  grad.addColorStop(0, ['#f2d9b6', '#cfe0ea', '#f0e2d0'][seed % 3]); grad.addColorStop(1, '#f7f2ea');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 320);
  g.fillStyle = '#2b2f36';
  if (seed % 3 === 0) { g.fillRect(118, 80, 20, 200); g.fillRect(100, 160, 56, 10); g.beginPath(); g.moveTo(128, 40); g.lineTo(140, 80); g.lineTo(116, 80); g.fill(); }
  if (seed % 3 === 1) { g.fillRect(20, 220, 216, 10); for (const x of [70, 186]) g.fillRect(x - 6, 120, 12, 110); g.beginPath(); g.moveTo(20, 220); g.quadraticCurveTo(128, 120, 236, 220); g.lineWidth = 4; g.strokeStyle = '#2b2f36'; g.stroke(); }
  if (seed % 3 === 2) { g.beginPath(); g.arc(128, 200, 70, Math.PI, 0); g.fill(); g.fillRect(58, 200, 140, 70); g.fillRect(124, 110, 8, 30); }
  g.fillStyle = '#2b2f36'; g.font = '600 18px Georgia, serif'; g.textAlign = 'center';
  g.fillText(['SONGHAI TOWER', 'LAGOON BRIDGE', 'CITY DOME'][seed % 3], 128, 305);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}

function TripodLamp({ h }: { h: number }) {
  const lampOn = useLightsOn();
  return (
    <group>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return <mesh key={i} position={[Math.sin(a) * 0.14, (h - 0.35) / 2, Math.cos(a) * 0.14]} rotation={[Math.cos(a) * 0.17, 0, -Math.sin(a) * 0.17]} castShadow><cylinderGeometry args={[0.012, 0.016, h - 0.3, 8]} /><meshStandardMaterial color={WALNUT} roughness={0.5} /></mesh>;
      })}
      <mesh position={[0, h - 0.2, 0]}><cylinderGeometry args={[0.17, 0.22, 0.28, 24, 1, true]} /><meshStandardMaterial color="#efe6d4" emissive="#ffd9a0" emissiveIntensity={lampOn ? 0.5 : 0} side={DoubleSide} roughness={0.9} /></mesh>
      <pointLight position={[0, h - 0.25, 0]} intensity={lampOn ? 1.6 : 0} distance={4} decay={1.8} color="#ffd9a0" />
    </group>
  );
}

function EggChair({ w, h }: { w: number; h: number }) {
  const r = w / 2;
  return (
    <group>
      <mesh position={[0, 0.18, 0]}><cylinderGeometry args={[0.03, 0.22, 0.36, 16]} /><meshStandardMaterial color="#d8d8d8" metalness={0.8} roughness={0.25} /></mesh>
      <mesh position={[0, 0.36 + (h - 0.36) / 2, 0.05]} rotation={[-0.15, Math.PI, 0]} scale={[1, (h - 0.36) / (2 * r), 1]} castShadow>
        <sphereGeometry args={[r, 32, 20, -Math.PI * 0.75, Math.PI * 1.5]} />
        <meshStandardMaterial color="#e8e2d6" roughness={0.95} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.48, 0]}><cylinderGeometry args={[r * 0.8, r * 0.75, 0.14, 24]} /><meshStandardMaterial color="#d9cfbf" roughness={1} /></mesh>
    </group>
  );
}

function Guitar() {
  return (
    <group rotation={[0, 0, 0.12]}>
      {/* Stand */}
      {[-1, 1].map((k) => <mesh key={k} position={[k * 0.12, 0.2, 0]} rotation={[0, 0, k * 0.4]}><cylinderGeometry args={[0.01, 0.01, 0.42, 6]} /><meshStandardMaterial color={BLACK} /></mesh>)}
      {/* Body: two lobes and a waist, a sound hole, the neck and head */}
      <mesh position={[0, 0.42, 0]} scale={[1, 1.1, 0.35]} castShadow><sphereGeometry args={[0.2, 24, 16]} /><meshStandardMaterial color="#c58a4a" roughness={0.35} /></mesh>
      <mesh position={[0, 0.7, 0]} scale={[1, 1, 0.35]} castShadow><sphereGeometry args={[0.15, 24, 16]} /><meshStandardMaterial color="#c58a4a" roughness={0.35} /></mesh>
      <mesh position={[0, 0.6, 0.072]}><circleGeometry args={[0.05, 20]} /><meshStandardMaterial color="#1a120c" /></mesh>
      <mesh position={[0, 1.08, 0.02]}><boxGeometry args={[0.05, 0.6, 0.03]} /><meshStandardMaterial color={WALNUT} /></mesh>
      <mesh position={[0, 1.42, 0.02]}><boxGeometry args={[0.07, 0.14, 0.03]} /><meshStandardMaterial color={BLACK} /></mesh>
    </group>
  );
}

function RecordFrames({ f }: { f: Furniture }) {
  const tex = useMemo(() => [0, 1, 2].map(sleeveTexture), []);
  return (
    <group position={[0, 1.6, 0]} rotation={[0, wallFacing(f), 0]}>
      {[-0.42, 0, 0.42].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh castShadow><boxGeometry args={[0.36, 0.36, 0.03]} /><meshStandardMaterial color={BLACK} roughness={0.5} /></mesh>
          <mesh position={[0, 0, 0.016]}><planeGeometry args={[0.31, 0.31]} /><meshStandardMaterial map={tex[i]} roughness={0.6} /></mesh>
        </group>
      ))}
    </group>
  );
}

function LandmarkPrints({ f }: { f: Furniture }) {
  const tex = useMemo(() => [0, 1, 2].map(printTexture), []);
  return (
    <group position={[0, 1.55, 0]} rotation={[0, wallFacing(f), 0]}>
      {[-0.5, 0, 0.5].map((x, i) => (
        <group key={i} position={[x, (i % 2) * 0.06, 0]}>
          <mesh castShadow><boxGeometry args={[0.4, 0.5, 0.025]} /><meshStandardMaterial color={OAK} roughness={0.5} /></mesh>
          <mesh position={[0, 0, 0.014]}><planeGeometry args={[0.34, 0.44]} /><meshStandardMaterial map={tex[i]} roughness={0.8} /></mesh>
        </group>
      ))}
    </group>
  );
}

function CoatStand({ h }: { h: number }) {
  return (
    <group>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.2, 0.22, 0.04, 20]} /><meshStandardMaterial color={WALNUT} /></mesh>
      <mesh position={[0, h / 2, 0]} castShadow><cylinderGeometry args={[0.022, 0.03, h, 10]} /><meshStandardMaterial color={WALNUT} roughness={0.5} /></mesh>
      {[0, 1, 2, 3].map((i) => <mesh key={i} position={[Math.sin(i * 1.57) * 0.1, h - 0.12, Math.cos(i * 1.57) * 0.1]} rotation={[Math.cos(i * 1.57) * 0.8, 0, -Math.sin(i * 1.57) * 0.8]}><cylinderGeometry args={[0.012, 0.012, 0.2, 6]} /><meshStandardMaterial color={WALNUT} /></mesh>)}
      {/* A camel coat and a bag hanging on it */}
      <mesh position={[0.12, h - 0.55, 0]} castShadow><boxGeometry args={[0.32, 0.8, 0.14]} /><meshStandardMaterial color="#b78a5a" roughness={0.95} /></mesh>
      <mesh position={[-0.12, h - 0.45, 0]} castShadow><boxGeometry args={[0.22, 0.26, 0.1]} /><meshStandardMaterial color="#3a2a20" roughness={0.6} /></mesh>
    </group>
  );
}

function Pampas({ h }: { h: number }) {
  const stems = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ a: (i / 9) * Math.PI * 2, tilt: 0.15 + (i % 3) * 0.08, len: h * (0.55 + (i % 4) * 0.08) })), [h]);
  return (
    <group>
      <mesh position={[0, 0.22, 0]} castShadow><cylinderGeometry args={[0.1, 0.14, 0.44, 20]} /><meshStandardMaterial color="#e9e2d6" roughness={0.6} /></mesh>
      {stems.map((s, i) => (
        <group key={i} position={[0, 0.4, 0]} rotation={[Math.cos(s.a) * s.tilt, 0, -Math.sin(s.a) * s.tilt]}>
          <mesh position={[0, s.len / 2, 0]}><cylinderGeometry args={[0.004, 0.004, s.len, 4]} /><meshStandardMaterial color="#a8916a" /></mesh>
          <mesh position={[0, s.len, 0]} scale={[1, 2.6, 1]}><sphereGeometry args={[0.05, 10, 8]} /><meshStandardMaterial color="#e6d6b8" roughness={1} /></mesh>
        </group>
      ))}
    </group>
  );
}

function LowShelf({ f }: { f: Furniture }) {
  const [w, h, d] = f.size;
  const turned = d > w;
  const L = turned ? d : w, D = turned ? w : d;
  const wood = useMemo(() => pbr('wood-floor', [1, 0.5]), []);
  return (
    <group rotation={[0, turned ? -Math.PI / 2 : 0, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow><boxGeometry args={[L, h, D]} /><meshStandardMaterial {...wood} /></mesh>
      {Array.from({ length: Math.floor(L / 0.06) }, (_, i) => (
        <mesh key={i} position={[-L / 2 + 0.05 + i * 0.06, h * 0.32, D / 2 - 0.08]}><boxGeometry args={[0.035, h * 0.5 * (0.8 + (i % 3) * 0.1), 0.18]} /><meshStandardMaterial color={['#7a2e2a', '#2b4a6a', '#d8c7a0', '#3a5a3a', '#1f1f22'][i % 5]} roughness={0.8} /></mesh>
      ))}
      <group position={[L / 2 - 0.25, h, 0]}><RealModel name="vase-flowers" fit={[0.22, 0.4, 0.22]} /></group>
    </group>
  );
}

function StorageBoxes({ w }: { w: number }) {
  return (
    <group>
      {[[-w / 4, 0.18, 0], [w / 4, 0.18, 0], [0, 0.52, 0]].map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh castShadow><boxGeometry args={[w / 2 - 0.04, 0.34, 0.4]} /><meshStandardMaterial color={['#d9cdb6', '#c8b89c', '#e4dac8'][i]} roughness={1} /></mesh>
          <mesh position={[0, 0.08, 0.201]}><planeGeometry args={[0.1, 0.03]} /><meshStandardMaterial color="#8a6a48" /></mesh>
        </group>
      ))}
    </group>
  );
}

function SlatBench({ f }: { f: Furniture }) {
  const [w, h, d] = f.size;
  const turned = d > w;
  const L = turned ? d : w, D = turned ? w : d;
  return (
    <group rotation={[0, turned ? -Math.PI / 2 : 0, 0]}>
      {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[0, h - 0.02, -D / 2 + 0.04 + i * ((D - 0.08) / 5)]} castShadow><boxGeometry args={[L, 0.035, (D - 0.08) / 6.5]} /><meshStandardMaterial color={OAK} roughness={0.5} /></mesh>)}
      {[-1, 1].map((k) => <mesh key={k} position={[k * (L / 2 - 0.08), (h - 0.04) / 2, 0]}><boxGeometry args={[0.05, h - 0.04, D - 0.04]} /><meshStandardMaterial color={BLACK} metalness={0.6} roughness={0.4} /></mesh>)}
    </group>
  );
}

export function StudioPiece({ f }: { f: Furniture }) {
  const [w, h, d] = f.size;
  switch (f.design) {
    case 'studio-tripod-lamp': return <TripodLamp h={h} />;
    case 'studio-egg-chair': return <group rotation={[0, wallFacing(f) + Math.PI, 0]}><EggChair w={Math.min(w, d)} h={h} /></group>;
    case 'studio-guitar': return <group rotation={[0, wallFacing(f), 0]}><Guitar /></group>;
    case 'studio-records': return <RecordFrames f={f} />;
    case 'studio-prints': return <LandmarkPrints f={f} />;
    case 'studio-coat-stand': return <CoatStand h={h} />;
    case 'studio-pampas': return <Pampas h={h} />;
    case 'studio-low-shelf': return <LowShelf f={f} />;
    case 'studio-boxes': return <group rotation={[0, wallFacing(f), 0]}><StorageBoxes w={Math.max(w, d)} /></group>;
    case 'studio-bench': return <SlatBench f={f} />;
    case 'studio-sofa': {
      const turned = d > w;
      return <group rotation={[0, turned ? -Math.PI / 2 : 0, 0]}><RealModel name="sofa-velvet-champagne" fit={[turned ? d : w, h, turned ? w : d]} rotationY={Math.PI} recolor={{ match: /fabric/i, color: f.color }} /></group>;
    }
    default: return null;
  }
}
