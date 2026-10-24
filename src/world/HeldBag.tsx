import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { CanvasTexture, MeshPhysicalMaterial, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, Shape, Vector3, type Bone, type Group, type Object3D } from 'three';
import type { BagShape, Style } from '../lib/fashion';

/** Grip, body size (width front-to-back, height, depth side-to-side) and where the body's top sits below the hand, in metres. */
const BAG: Record<BagShape, { w: number; h: number; d: number; top: number; handle: 'straps' | 'arch' | 'none' | 'cord' | 'chain' | 'twin' | 'ring' | 'hook' }> = {
  tote: { w: 0.38, h: 0.32, d: 0.13, top: -0.2, handle: 'straps' },
  'top-handle': { w: 0.28, h: 0.21, d: 0.12, top: -0.1, handle: 'arch' },
  clutch: { w: 0.26, h: 0.13, d: 0.045, top: 0.05, handle: 'none' },
  bucket: { w: 0.24, h: 0.26, d: 0.24, top: -0.18, handle: 'cord' },
  mini: { w: 0.18, h: 0.13, d: 0.07, top: -0.09, handle: 'arch' },
  flap: { w: 0.26, h: 0.17, d: 0.08, top: -0.26, handle: 'chain' },
  barrel: { w: 0.3, h: 0.2, d: 0.18, top: -0.12, handle: 'twin' },
  dome: { w: 0.3, h: 0.22, d: 0.14, top: -0.12, handle: 'arch' },
  heart: { w: 0.26, h: 0.24, d: 0.08, top: -0.12, handle: 'twin' },
  saddle: { w: 0.24, h: 0.2, d: 0.07, top: -0.22, handle: 'chain' },
  baguette: { w: 0.28, h: 0.13, d: 0.06, top: -0.22, handle: 'arch' },
  box: { w: 0.2, h: 0.12, d: 0.06, top: -0.26, handle: 'chain' },
  ring: { w: 0.22, h: 0.16, d: 0.1, top: -0.07, handle: 'ring' },
  knot: { w: 0.24, h: 0.16, d: 0.1, top: -0.02, handle: 'none' },
  pleat: { w: 0.26, h: 0.14, d: 0.07, top: -0.07, handle: 'ring' },
  pouch: { w: 0.28, h: 0.2, d: 0.11, top: -0.2, handle: 'arch' },
  kelly: { w: 0.28, h: 0.2, d: 0.11, top: -0.1, handle: 'arch' },
  oval: { w: 0.21, h: 0.12, d: 0.07, top: 0.04, handle: 'none' },
  fringe: { w: 0.22, h: 0.12, d: 0.08, top: -0.06, handle: 'hook' },
};

/** Surface relief for the finishes, drawn once each and used as bump maps. */
const bumps = new Map<string, CanvasTexture>();
function bumpTexture(kind: 'glitter' | 'rhinestone' | 'quilted' | 'knit' | 'fur') {
  const have = bumps.get(kind);
  if (have) return have;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  // A fixed seed so every bag of a kind looks the same
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  if (kind === 'glitter' || kind === 'fur') {
    for (let i = 0; i < (kind === 'fur' ? 9000 : 5000); i++) {
      const v = Math.floor(rnd() * 255);
      g.fillStyle = `rgb(${v},${v},${v})`;
      if (kind === 'fur') { g.fillRect(rnd() * 256, rnd() * 256, 1, 3 + rnd() * 5); } else g.fillRect(rnd() * 256, rnd() * 256, 2, 2);
    }
  } else if (kind === 'rhinestone') {
    for (let y = 6; y < 256; y += 12) for (let x = (y / 12) % 2 ? 6 : 0; x < 256; x += 12) {
      const grad = g.createRadialGradient(x, y, 0, x, y, 5.5);
      grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#303030');
      g.fillStyle = grad; g.beginPath(); g.arc(x, y, 5.5, 0, Math.PI * 2); g.fill();
    }
  } else if (kind === 'quilted') {
    g.strokeStyle = '#2a2a2a'; g.lineWidth = 4;
    for (let i = -256; i < 512; i += 48) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke();
      g.beginPath(); g.moveTo(i, 256); g.lineTo(i + 256, 0); g.stroke();
    }
  } else {
    for (let x = 0; x < 256; x += 8) { const grad = g.createLinearGradient(x, 0, x + 8, 0); grad.addColorStop(0, '#404040'); grad.addColorStop(0.5, '#d0d0d0'); grad.addColorStop(1, '#404040'); g.fillStyle = grad; g.fillRect(x, 0, 8, 256); }
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(2, 2);
  bumps.set(kind, t);
  return t;
}

/** Embossed croc scales, drawn once, used as a bump map on croc bags. */
let crocBump: CanvasTexture | null = null;
function crocTexture() {
  if (crocBump) return crocBump;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 22) for (let x = (y / 22) % 2 ? 0 : 14; x < 256; x += 28) {
    const grad = g.createRadialGradient(x, y, 2, x, y, 13);
    grad.addColorStop(0, '#d8d8d8'); grad.addColorStop(1, '#4a4a4a');
    g.fillStyle = grad; g.beginPath(); g.roundRect(x - 12, y - 9, 24, 18, 6); g.fill();
  }
  crocBump = new CanvasTexture(c);
  crocBump.wrapS = crocBump.wrapT = RepeatWrapping;
  crocBump.repeat.set(2, 2);
  return crocBump;
}

/** The OGM Atelier plate: the game's own house brand, in gold. */
let ogmPlate: CanvasTexture | null = null;
function plateTexture() {
  if (ogmPlate) return ogmPlate;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#d4b26a'; g.fillRect(0, 0, 128, 64);
  g.fillStyle = '#7a5a20'; g.font = '700 34px Georgia, serif'; g.textAlign = 'center'; g.fillText('OGM', 64, 44);
  ogmPlate = new CanvasTexture(c);
  ogmPlate.colorSpace = SRGBColorSpace;
  return ogmPlate;
}

/** A heart outline (for the heart bag), centred, about 1 unit across. */
const HEART = (() => {
  const sh = new Shape();
  sh.moveTo(0, -0.45);
  sh.bezierCurveTo(-0.15, -0.3, -0.5, -0.05, -0.5, 0.18);
  sh.bezierCurveTo(-0.5, 0.42, -0.25, 0.5, 0, 0.3);
  sh.bezierCurveTo(0.25, 0.5, 0.5, 0.42, 0.5, 0.18);
  sh.bezierCurveTo(0.5, -0.05, 0.15, -0.3, 0, -0.45);
  return sh;
})();
/** The saddle bag's curved profile. */
const SADDLE = (() => {
  const sh = new Shape();
  sh.moveTo(-0.5, 0.5);
  sh.lineTo(0.45, 0.5);
  sh.quadraticCurveTo(0.55, 0.0, 0.2, -0.45);
  sh.quadraticCurveTo(-0.3, -0.6, -0.5, -0.1);
  sh.closePath();
  return sh;
})();

const HAND = /L[_ ]?Hand$/;
// Scratch vector for the hand's position each frame
const HAND_AT = new Vector3();

/** A handbag in your left hand: its body hangs below the grip and moves with your arm. Original shapes, no brand marks. */
export function HeldBag({ scene, style }: { scene: Object3D; style: Style }) {
  const group = useRef<Group>(null);
  const hand = useMemo(() => {
    let found: Bone | null = null;
    scene.traverse((o) => { if (!found && (o as Bone).isBone && HAND.test(o.name)) found = o as Bone; });
    return found as Bone | null;
  }, [scene]);
  useFrame(() => {
    const v = HAND_AT;
    const g = group.current;
    if (!g || !hand || !g.parent) return;
    hand.getWorldPosition(v);
    g.parent.worldToLocal(v);
    // A little out from the leg so the bag doesn't pass through it
    v.x += Math.sign(v.x || 1) * 0.05;
    g.position.copy(v);
  });
  const shape = BAG[style.bag ?? 'tote'];
  const fabric = style.fabric;
  const body = useMemo(() => {
    const f = fabric?.name;
    const relief = f === 'glitter' || f === 'rhinestone' || f === 'quilted' || f === 'knit' || f === 'fur' ? f : null;
    return new MeshPhysicalMaterial({
      color: style.colors[0], roughness: fabric ? fabric.roughness : 0.5, metalness: fabric?.metalness ?? 0,
      clearcoat: f === 'patent' || f === 'acrylic' ? 1 : f === 'croc' ? 0.7 : f === 'leather' || f === 'quilted' ? 0.4 : 0,
      clearcoatRoughness: f === 'patent' || f === 'acrylic' ? 0.05 : 0.4,
      ...(f === 'croc' ? { bumpMap: crocTexture(), bumpScale: 2 } : {}),
      ...(relief ? { bumpMap: bumpTexture(relief), bumpScale: relief === 'quilted' ? 3 : 1.5 } : {}),
      // Fur and marabou: soft light across the fibres
      ...(f === 'fur' || f === 'velvet' ? { sheen: 1, sheenRoughness: 0.6, sheenColor: style.colors[0] } : {}),
    });
  }, [style.colors, fabric]);
  // A second colour on two-tone bags: the flap, trim and handles
  const trim = useMemo(() => (style.colors[1] !== style.colors[0] ? new MeshPhysicalMaterial({ color: style.colors[1], roughness: 0.45, clearcoat: 0.3 }) : body), [style.colors, body]);
  const gold = useMemo(() => new MeshStandardMaterial({ color: '#d4b26a', roughness: 0.25, metalness: 1 }), []);
  const plate = useMemo(() => new MeshStandardMaterial({ map: plateTexture(), roughness: 0.3, metalness: 0.8 }), []);
  const kind = style.bag ?? 'tote';
  if (!hand) return null;
  const { w, h, d, top } = shape;
  const cy = top - h / 2;
  return (
    <group ref={group}>
      {(kind === 'tote' || kind === 'top-handle' || kind === 'clutch' || kind === 'bucket' || kind === 'mini' || kind === 'flap' || kind === 'baguette' || kind === 'fringe') && (
        <RoundedBox args={[d, h, w]} radius={Math.min(0.03, d / 2 - 0.002)} smoothness={3} position={[0, cy, 0]} material={body} castShadow />
      )}
      {kind === 'flap' && (
        // The flap folded over the front, down to two thirds of the bag, with the gold OGM plate
        <>
          <mesh position={[d / 2 + 0.004, top - h * 0.33, 0]} rotation={[0, Math.PI / 2, 0]} material={body}><boxGeometry args={[w * 0.98, h * 0.66, 0.006]} /></mesh>
          <mesh position={[d / 2 + 0.009, top - h * 0.6, 0]} rotation={[0, Math.PI / 2, 0]} material={plate}><planeGeometry args={[0.05, 0.025]} /></mesh>
        </>
      )}
      {kind === 'baguette' && (
        // The flap and edge piping in the trim colour, and a short shoulder strap
        <>
          <mesh position={[d / 2 + 0.004, top - h * 0.3, 0]} rotation={[0, Math.PI / 2, 0]} material={trim}><boxGeometry args={[w * 0.98, h * 0.6, 0.006]} /></mesh>
          {[-1, 1].map((s) => <mesh key={s} position={[0, cy, s * (w / 2 - 0.003)]} material={trim}><boxGeometry args={[d + 0.004, h + 0.004, 0.008]} /></mesh>)}
        </>
      )}
      {kind === 'box' && (
        // A hard case with a gold frame on every edge
        <>
          <mesh position={[0, cy, 0]} material={body} castShadow><boxGeometry args={[d, h, w]} /></mesh>
          {[[0, h / 2, 0, d + 0.006, 0.008, w + 0.006], [0, -h / 2, 0, d + 0.006, 0.008, w + 0.006], [0, 0, w / 2, d + 0.006, h, 0.008], [0, 0, -w / 2, d + 0.006, h, 0.008]].map(([x, y, z, sx, sy, sz], i) => (
            <mesh key={i} position={[x, cy + y, z]} material={style.colors[1] !== style.colors[0] ? trim : gold}><boxGeometry args={[sx, sy, sz]} /></mesh>
          ))}
        </>
      )}
      {(kind === 'ring' || kind === 'pleat') && (
        // A soft half-moon body held by a round metal handle
        <group position={[0, top - h, 0]}>
          <mesh rotation={[0, Math.PI / 2, 0]} scale={[w / 2, h, d / 2]} material={body} castShadow>
            <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          {kind === 'pleat' && Array.from({ length: 9 }, (_, i) => (
            <mesh key={i} position={[0, h * 0.45, ((i - 4) / 4) * w * 0.4]} rotation={[0, 0, ((i - 4) / 4) * 0.15]} material={body}><boxGeometry args={[d * 0.9, h * 0.85, 0.006]} /></mesh>
          ))}
        </group>
      )}
      {kind === 'knot' && (
        // A crescent of crystals with a knot at one end
        <group position={[0, cy, 0]} rotation={[0, Math.PI / 2, 0]}>
          <mesh material={body} castShadow><torusGeometry args={[w * 0.32, d * 0.42, 14, 28, Math.PI * 1.55]} /></mesh>
          <mesh position={[w * 0.3, w * 0.1, 0]} material={body}><sphereGeometry args={[d * 0.55, 16, 12]} /></mesh>
        </group>
      )}
      {kind === 'pouch' && (
        <mesh position={[0, cy, 0]} rotation={[0, Math.PI / 2, 0]} scale={[w / 2, h / 2, d / 2]} material={body} castShadow><sphereGeometry args={[1, 28, 18]} /></mesh>
      )}
      {kind === 'kelly' && (
        // Trapeze body, flap over the front, turn-lock clasp
        <>
          <mesh position={[0, cy, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 1]} material={body} castShadow>
            <cylinderGeometry args={[(Math.max(w, d) / 2) * 1.2, (Math.max(w, d) / 2) * 1.32, h, 4, 1]} />
          </mesh>
          <mesh position={[d * 0.62, top - h * 0.28, 0]} rotation={[0, Math.PI / 2, 0]} material={trim}><boxGeometry args={[w * 0.9, h * 0.5, 0.006]} /></mesh>
          <mesh position={[d * 0.66, top - h * 0.48, 0]} material={gold}><boxGeometry args={[0.012, 0.026, 0.04]} /></mesh>
        </>
      )}
      {kind === 'oval' && (
        <mesh position={[0, cy, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[d / h, 1, 1]} material={body} castShadow><capsuleGeometry args={[h / 2, w - h, 10, 24]} /></mesh>
      )}
      {kind === 'fringe' && Array.from({ length: 22 }, (_, i) => (
        // Long fringe falling from the body
        <mesh key={i} position={[d * 0.3 * ((i % 2) * 2 - 1), cy - h / 2 - 0.06, (i / 21 - 0.5) * w * 0.95]} material={body}><cylinderGeometry args={[0.003, 0.003, 0.14 + (i % 3) * 0.03, 5]} /></mesh>
      ))}
      {kind === 'barrel' && (
        <mesh position={[0, cy, 0]} rotation={[Math.PI / 2, 0, 0]} material={body} castShadow><capsuleGeometry args={[h / 2, w - h, 8, 20]} /></mesh>
      )}
      {kind === 'dome' && (
        <group position={[0, top - h, 0]}>
          <mesh scale={[d / w, (h / w) * 2, 1]} material={body} castShadow><sphereGeometry args={[w / 2, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
          <mesh position={[0, 0.005, 0]} material={body}><boxGeometry args={[d, 0.012, w]} /></mesh>
          <mesh position={[0, h * 0.95, 0]} material={gold}><boxGeometry args={[d * 0.5, 0.006, w * 0.9]} /></mesh>
        </group>
      )}
      {kind === 'heart' && (
        <mesh position={[-d / 2, cy, 0]} rotation={[0, Math.PI / 2, 0]} scale={[w, h, 1]} material={body} castShadow>
          <extrudeGeometry args={[HEART, { depth: d, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 3 }]} />
        </mesh>
      )}
      {kind === 'saddle' && (
        <mesh position={[-d / 2, cy, 0]} rotation={[0, Math.PI / 2, 0]} scale={[w, h, 1]} material={body} castShadow>
          <extrudeGeometry args={[SADDLE, { depth: d, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 3 }]} />
        </mesh>
      )}
      {/* The gold OGM plate on the front (the flap bag has its own on the flap) */}
      {kind !== 'flap' && kind !== 'clutch' && kind !== 'knot' && kind !== 'fringe' && kind !== 'pouch' && kind !== 'box' && kind !== 'oval' && <mesh position={[(kind === 'barrel' ? h / 2 : d / 2) + 0.004, top - Math.min(0.06, h * 0.4), 0]} rotation={[0, Math.PI / 2, 0]} material={plate}><planeGeometry args={[0.045, 0.022]} /></mesh>}
      {/* Flap edge and clasp */}
      {shape.handle !== 'cord' && shape.handle !== 'chain' && shape.handle !== 'ring' && kind !== 'heart' && kind !== 'saddle' && kind !== 'knot' && kind !== 'pouch' && kind !== 'oval' && kind !== 'kelly' && <mesh position={[d / 2 + 0.002, top - Math.min(0.05, h * 0.35), 0]} material={gold}><boxGeometry args={[0.006, 0.02, Math.min(0.05, w * 0.25)]} /></mesh>}
      {shape.handle === 'straps' && [-1, 1].map((s) => (
        <mesh key={s} position={[s * d * 0.3, top / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={body}>
          <torusGeometry args={[Math.abs(top) / 2 + 0.02, 0.008, 6, 18, Math.PI]} />
        </mesh>
      ))}
      {shape.handle === 'arch' && (
        <mesh position={[0, top, 0]} rotation={[0, Math.PI / 2, 0]} material={body}>
          <torusGeometry args={[Math.max(0.05, Math.abs(top) + 0.01), 0.011, 8, 20, Math.PI]} />
        </mesh>
      )}
      {shape.handle === 'chain' && (
        // A gold chain strap up to the hand
        <>
          {Array.from({ length: 12 }, (_, i) => (
            <mesh key={i} position={[0, top + (Math.abs(top) * (i + 0.5)) / 12, (i % 2 ? 1 : -1) * 0.004 + w * 0.3 * (1 - (i + 0.5) / 12)]} rotation={[i % 2 ? Math.PI / 2 : 0, 0, 0]} material={gold}>
              <torusGeometry args={[0.011, 0.003, 6, 12]} />
            </mesh>
          ))}
          {Array.from({ length: 12 }, (_, i) => (
            <mesh key={`b${i}`} position={[0, top + (Math.abs(top) * (i + 0.5)) / 12, -w * 0.3 * (1 - (i + 0.5) / 12)]} rotation={[i % 2 ? Math.PI / 2 : 0, 0, 0]} material={gold}>
              <torusGeometry args={[0.011, 0.003, 6, 12]} />
            </mesh>
          ))}
        </>
      )}
      {shape.handle === 'twin' && [-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.02, top + 0.01, 0]} rotation={[0, Math.PI / 2, 0]} material={body}>
          <torusGeometry args={[Math.min(0.07, w * 0.28), 0.009, 8, 18, Math.PI]} />
        </mesh>
      ))}
      {shape.handle === 'ring' && (
        // The round metal handle you hold
        <mesh position={[0, top + 0.03, 0]} rotation={[0, Math.PI / 2, 0]} material={gold}><torusGeometry args={[0.07, 0.007, 10, 32]} /></mesh>
      )}
      {shape.handle === 'hook' && (
        <mesh position={[0, top + 0.03, 0]} rotation={[0, Math.PI / 2, 0]} material={gold}><torusGeometry args={[0.06, 0.01, 10, 28, Math.PI * 1.3]} /></mesh>
      )}
      {shape.handle === 'cord' && (
        <>
          <mesh position={[0, top + 0.004, 0]} rotation={[Math.PI / 2, 0, 0]} material={gold}><torusGeometry args={[w / 2 - 0.01, 0.006, 6, 24]} /></mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0, top / 2, s * w * 0.22]} rotation={[0, 0, 0]} material={body}>
              <cylinderGeometry args={[0.005, 0.005, Math.abs(top), 6]} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}
