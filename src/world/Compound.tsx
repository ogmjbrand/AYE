/**
 * Walled private compounds (lib/compound.ts): the Crown Residence. A stone boundary wall with a
 * terracotta coping and a black sliding gate (standing open), lawns, an asphalt drive with a
 * green canopy carport, and a two-storey house in white render with terracotta pillars, slab
 * bands and window surrounds, a pillared porch under a balcony, roof parapets with rails and a
 * rooftop stair tower. Its parked cars are the district's own parked vehicles.
 */
import { useMemo } from 'react';
import { CanvasTexture, DoubleSide, RepeatWrapping, SRGBColorSpace } from 'three';
import { COMPOUND_WALL, HOUSE_STOREY, PORCH_DEPTH, carportPosts, porchPillars, type CompoundSpec } from '../lib/compound';
import { useLayout } from './DistrictContext';
import { pbr } from './pbr';

const WHITE = '#ebe8e2';
const TERRACOTTA = '#c8673a';
const GLASS = '#26303a';

const M = ({ color, rough = 0.85, metal = 0, glow = 0, emissive }: { color: string; rough?: number; metal?: number; glow?: number; emissive?: string }) =>
  <meshStandardMaterial color={color} roughness={rough} metalness={metal} emissive={emissive ?? (glow ? color : '#000000')} emissiveIntensity={glow} />;

let stoneTex: CanvasTexture | null = null;
/** Coursed rubble stone in buff, tan and grey, with pale mortar. */
function stone() {
  if (stoneTex) return stoneTex;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#cfc4b0'; g.fillRect(0, 0, 512, 256);
  const tones = ['#b9a88c', '#a89880', '#c8b898', '#9c8e7a', '#bdb3a2', '#a4917a', '#d1c2a4'];
  for (let y = 0; y < 256;) {
    const h = 18 + Math.random() * 16;
    for (let x = -Math.random() * 30; x < 512;) {
      const w = 30 + Math.random() * 50;
      g.fillStyle = tones[Math.floor(Math.random() * tones.length)];
      g.fillRect(x + 2, y + 2, w - 4, h - 4);
      g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x + 2, y + h - 6, w - 4, 4);
      x += w;
    }
    y += h;
  }
  stoneTex = new CanvasTexture(c);
  stoneTex.colorSpace = SRGBColorSpace;
  stoneTex.wrapS = stoneTex.wrapT = RepeatWrapping;
  return stoneTex;
}

let lawnTex: CanvasTexture | null = null;
/** Mown lawn: fine green speckle. */
function lawn() {
  if (lawnTex) return lawnTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#4f8a35'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6000; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(110,170,70,0.5)' : 'rgba(40,90,30,0.5)';
    g.fillRect(Math.random() * 256, Math.random() * 256, 1, 2 + Math.random() * 3);
  }
  lawnTex = new CanvasTexture(c);
  lawnTex.colorSpace = SRGBColorSpace;
  lawnTex.wrapS = lawnTex.wrapT = RepeatWrapping;
  return lawnTex;
}

let signTex: CanvasTexture | null = null;
function sign(name: string) {
  if (signTex) return signTex;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1e1f22'; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#c9a052'; g.lineWidth = 4; g.strokeRect(8, 8, 496, 112);
  g.fillStyle = '#e8cf8f'; g.textAlign = 'center'; g.font = "600 46px 'Playfair Display', Georgia, serif";
  g.fillText(name, 256, 80);
  signTex = new CanvasTexture(c);
  signTex.colorSpace = SRGBColorSpace;
  return signTex;
}

export function Compounds({ night }: { night: number }) {
  const { compounds } = useLayout();
  if (!compounds?.length) return null;
  return <>{compounds.map((c) => <Compound key={c.id} c={c} night={night} />)}</>;
}

function Compound({ c, night }: { c: CompoundSpec; night: number }) {
  const w = c.maxX - c.minX, d = c.maxZ - c.minZ;
  const t = COMPOUND_WALL.thickness, h = COMPOUND_WALL.height;
  const stoneMap = stone();
  const grass = useMemo(() => { const g = lawn().clone(); g.needsUpdate = true; g.repeat.set(w / 3, d / 3); return g; }, [w, d]);
  const asphalt = useMemo(() => pbr('road', [w / 6, 12 / 6]), [w]);
  const driveZ1 = c.house.minZ - PORCH_DEPTH - 0.4;
  // Wall runs: [x0, x1, z0, z1]
  const runs: [number, number, number, number][] = [
    [c.minX, c.maxX, c.maxZ - t / 2, c.maxZ + t / 2],
    [c.minX, c.maxX, c.minZ - t / 2, c.minZ + t / 2],
    [c.minX - t / 2, c.minX + t / 2, c.minZ, c.maxZ],
    [c.maxX - t / 2, c.maxX + t / 2, c.minZ, c.gate.z0],
    [c.maxX - t / 2, c.maxX + t / 2, c.gate.z1, c.maxZ],
  ];
  return (
    <group>
      {/* Lawn over the whole plot, the asphalt drive and parking over its south part, a paved porch apron */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(c.minX + c.maxX) / 2, 0.012, (c.minZ + c.maxZ) / 2]} receiveShadow>
        <planeGeometry args={[w, d]} /><meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(c.minX + 0.5 + c.maxX) / 2, 0.02, (c.minZ + 0.3 + driveZ1) / 2]} receiveShadow>
        <planeGeometry args={[w - 0.5, driveZ1 - c.minZ - 0.3]} /><meshStandardMaterial {...asphalt} color="#8a8c90" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(c.house.minX + c.house.maxX) / 2, 0.025, c.house.minZ - (PORCH_DEPTH + 0.4) / 2]} receiveShadow>
        <planeGeometry args={[6.4, PORCH_DEPTH + 0.4]} /><M color="#d8d2c6" rough={0.7} />
      </mesh>

      {/* The boundary wall: stone with a terracotta coping */}
      {runs.map(([x0, x1, z0, z1], i) => {
        const sx = x1 - x0, sz = z1 - z0, along = Math.max(sx, sz);
        const map = stoneMap.clone(); map.needsUpdate = true; map.repeat.set(along / 3, h / 1.5);
        return (
          <group key={i} position={[(x0 + x1) / 2, 0, (z0 + z1) / 2]}>
            <mesh position={[0, h / 2, 0]} castShadow receiveShadow><boxGeometry args={[sx, h, sz]} /><meshStandardMaterial map={map} roughness={0.95} /></mesh>
            <mesh position={[0, h + 0.05, 0]}><boxGeometry args={[sx + 0.06, 0.1, sz + 0.06]} /><M color={TERRACOTTA} rough={0.7} /></mesh>
          </group>
        );
      })}
      {/* Gate posts and the black slatted gate, slid open along the inside of the wall */}
      {[c.gate.z0, c.gate.z1].map((z) => (
        <group key={z} position={[c.maxX, 0, z]}>
          <mesh position={[0, 1.15, 0]} castShadow><boxGeometry args={[0.5, 2.3, 0.5]} /><M color={WHITE} /></mesh>
          <mesh position={[0, 2.35, 0]}><boxGeometry args={[0.58, 0.1, 0.58]} /><M color={TERRACOTTA} /></mesh>
          <pointLight position={[0.4, 2.2, 0]} intensity={night * 3} distance={6} decay={2} color="#ffd9a8" />
          <mesh position={[0.26, 2.15, 0]}><sphereGeometry args={[0.1, 12, 10]} /><meshStandardMaterial color="#fff2d6" emissive="#ffcf8a" emissiveIntensity={0.2 + night * 1.5} /></mesh>
        </group>
      ))}
      <group position={[c.maxX - t / 2 - 0.12, 0, c.gate.z1 + (c.gate.z1 - c.gate.z0) / 2 + 0.1]}>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={i} position={[0, 0.15 + i * 0.165, 0]}><boxGeometry args={[0.05, 0.12, c.gate.z1 - c.gate.z0]} /><M color="#1c1c1e" metal={0.6} rough={0.4} /></mesh>
        ))}
      </group>
      {/* The name on the wall by the gate */}
      <mesh position={[c.maxX + t / 2 + 0.01, 1.35, c.gate.z0 - 1.6]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.0, 0.5]} /><meshStandardMaterial map={sign('The Crown Residence')} emissiveMap={sign('The Crown Residence')} emissive="#ffffff" emissiveIntensity={0.15 + night * 0.6} />
      </mesh>

      <Carport c={c} />
      <House c={c} night={night} />
    </group>
  );
}

/** A green tensile canopy over the parking, its steel posts along the south edge. */
function Carport({ c }: { c: CompoundSpec }) {
  const cw = c.carport.maxX - c.carport.minX, cd = c.carport.maxZ - c.carport.minZ;
  const cx = (c.carport.minX + c.carport.maxX) / 2, cz = (c.carport.minZ + c.carport.maxZ) / 2;
  return (
    <group>
      {carportPosts(c).map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 1.35, 0]} castShadow><cylinderGeometry args={[0.07, 0.07, 2.7, 10]} /><M color="#3a3c40" metal={0.6} rough={0.4} /></mesh>
          {/* A cantilever arm reaching out over the cars */}
          <mesh position={[0, 2.62, cd / 2]} rotation={[Math.PI / 2 - 0.12, 0, 0]}><cylinderGeometry args={[0.04, 0.04, cd, 8]} /><M color="#3a3c40" metal={0.6} rough={0.4} /></mesh>
        </group>
      ))}
      {/* The membrane: a shallow vault across the parking */}
      <mesh position={[cx, 2.85 - cd * 0.9, cz]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[cd * 0.9, cd * 0.9, cw + 0.4, 24, 1, true, Math.PI / 2 - 0.31, 0.62]} />
        <meshStandardMaterial color="#2fbf3e" roughness={0.6} side={DoubleSide} transparent opacity={0.92} />
      </mesh>
    </group>
  );
}

/** The two-storey house: white render with terracotta pillars, bands and window surrounds; the porch and balcony to the south. */
function House({ c, night }: { c: CompoundSpec; night: number }) {
  const { minX, maxX, minZ, maxZ } = c.house;
  const w = maxX - minX, d = maxZ - minZ, cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const S = HOUSE_STOREY, top = S * 2;
  const lit = night > 0.35;
  /** A window on a facade facing +z in its own frame. */
  const Window = ({ x, y, wide = 1.5 }: { x: number; y: number; wide?: number }) => (
    <group position={[x, y, 0]}>
      <mesh position={[0, 0, 0.03]}><boxGeometry args={[wide + 0.3, 1.75, 0.08]} /><M color={TERRACOTTA} rough={0.7} /></mesh>
      <mesh position={[0, 0, 0.075]}><boxGeometry args={[wide, 1.45, 0.02]} /><M color={WHITE} /></mesh>
      {[-wide / 4, wide / 4].map((k) => (
        <mesh key={k} position={[k, 0, 0.09]}><planeGeometry args={[wide / 2 - 0.08, 1.35]} /><meshStandardMaterial color={GLASS} roughness={0.08} metalness={0.4} emissive="#ffcf8a" emissiveIntensity={lit ? 0.35 : 0} /></mesh>
      ))}
    </group>
  );
  const facade = (len: number, count: number, y: number) => Array.from({ length: count }, (_, i) => -len / 2 + ((i + 0.5) * len) / count).map((x) => <Window key={`${x}${y}`} x={x} y={y} />);
  return (
    <group>
      {/* The body of the house */}
      <mesh position={[cx, top / 2, cz]} castShadow receiveShadow><boxGeometry args={[w, top, d]} /><M color={WHITE} rough={0.9} /></mesh>
      {/* Terracotta ground-floor walls between the pillars, slab bands and a projecting roof fascia */}
      <mesh position={[cx, S / 2, cz]}><boxGeometry args={[w + 0.04, S, d + 0.04]} /><M color="#d27848" rough={0.8} /></mesh>
      {[S, top].map((y) => <mesh key={y} position={[cx, y, cz]} castShadow><boxGeometry args={[w + (y === top ? 0.7 : 0.3), 0.36, d + (y === top ? 0.7 : 0.3)]} /><M color={TERRACOTTA} rough={0.7} /></mesh>)}
      {[[minX, minZ], [maxX, minZ], [minX, maxZ], [maxX, maxZ]].map(([x, z], i) => (
        <mesh key={i} position={[x, top / 2, z]} castShadow><boxGeometry args={[0.5, top, 0.5]} /><M color={TERRACOTTA} rough={0.7} /></mesh>
      ))}
      {/* Windows on every side, both storeys (the porch's door is in the middle of the south side) */}
      <group position={[cx, 0, minZ - 0.01]} rotation={[0, Math.PI, 0]}>
        {[-w * 0.36, w * 0.36].map((x) => <Window key={x} x={x} y={1.6} />)}
        {facade(w * 0.85, 3, S + 1.65)}
      </group>
      <group position={[cx, 0, maxZ + 0.01]}>{facade(w * 0.85, 3, 1.6)}{facade(w * 0.85, 3, S + 1.65)}</group>
      <group position={[maxX + 0.01, 0, cz]} rotation={[0, Math.PI / 2, 0]}>{facade(d * 0.8, 3, 1.6)}{facade(d * 0.8, 3, S + 1.65)}</group>
      <group position={[minX - 0.01, 0, cz]} rotation={[0, -Math.PI / 2, 0]}>{facade(d * 0.8, 3, 1.6)}{facade(d * 0.8, 3, S + 1.65)}</group>

      {/* The porch: steps up to a double door, two pillars carrying the balcony above */}
      <group position={[cx, 0, minZ]}>
        <mesh position={[0, 0.08, -PORCH_DEPTH / 2]} receiveShadow><boxGeometry args={[6.2, 0.16, PORCH_DEPTH]} /><M color="#d8d2c6" rough={0.6} /></mesh>
        <mesh position={[0, 1.3, -0.04]}><boxGeometry args={[1.9, 2.6, 0.06]} /><M color={TERRACOTTA} /></mesh>
        {[-0.42, 0.42].map((k) => <mesh key={k} position={[k, 1.28, -0.08]}><boxGeometry args={[0.8, 2.4, 0.04]} /><M color="#3c2a1e" rough={0.5} /></mesh>)}
        {[-0.08, 0.08].map((k) => <mesh key={k} position={[k, 1.2, -0.11]}><boxGeometry args={[0.02, 0.5, 0.02]} /><M color="#c9a052" metal={0.8} rough={0.3} /></mesh>)}
        <mesh position={[0, S - 0.05, -PORCH_DEPTH / 2]} castShadow><boxGeometry args={[6.4, 0.3, PORCH_DEPTH + 0.2]} /><M color={TERRACOTTA} rough={0.7} /></mesh>
        <pointLight position={[0, S - 0.5, -PORCH_DEPTH / 2]} intensity={night * 5} distance={7} decay={2} color="#ffd9a8" />
        <mesh position={[0, S - 0.21, -PORCH_DEPTH / 2]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.12, 16]} /><meshStandardMaterial color="#fff2d6" emissive="#ffcf8a" emissiveIntensity={0.1 + night * 1.6} side={DoubleSide} /></mesh>
        {/* The balcony's railing */}
        <Railing w={6.2} d={PORCH_DEPTH} y={S + 0.1} />
      </group>
      {porchPillars(c).map(([x, z]) => (
        <mesh key={x} position={[x, S / 2, z]} castShadow><boxGeometry args={[0.4, S, 0.4]} /><M color={TERRACOTTA} rough={0.7} /></mesh>
      ))}

      {/* Roof: parapet rails round the edge and the stair tower */}
      <group position={[cx, top + 0.18, cz]}>
        <Railing w={w + 0.4} d={d + 0.4} y={0} full />
        <group position={[-w * 0.12, 0, d * 0.12]}>
          <mesh position={[0, 1.3, 0]} castShadow><boxGeometry args={[3.0, 2.6, 3.0]} /><M color={WHITE} /></mesh>
          <mesh position={[0, 2.7, 0]}><boxGeometry args={[3.3, 0.3, 3.3]} /><M color={TERRACOTTA} /></mesh>
          <mesh position={[0, 1.1, -1.51]}><boxGeometry args={[0.9, 2.0, 0.02]} /><M color="#3c2a1e" /></mesh>
        </group>
      </group>
    </group>
  );
}

/** A metal railing round a rectangle (three sides open to the house unless `full`), its base at y. */
function Railing({ w, d, y, full = false }: { w: number; d: number; y: number; full?: boolean }) {
  const posts: [number, number][] = [];
  const add = (x0: number, z0: number, x1: number, z1: number) => {
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.9));
    for (let i = 0; i <= n; i++) posts.push([x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n]);
  };
  // The porch balcony: three sides out from the house (z from -d to 0); the roof: all four sides
  const z0 = full ? -d / 2 : -d, z1 = full ? d / 2 : 0;
  add(-w / 2, z0, w / 2, z0);
  add(-w / 2, z0, -w / 2, z1);
  add(w / 2, z0, w / 2, z1);
  if (full) add(-w / 2, z1, w / 2, z1);
  const rails: [number, number, number, number][] = [[0, z0, w, 0.04], [-w / 2, (z0 + z1) / 2, 0.04, z1 - z0], [w / 2, (z0 + z1) / 2, 0.04, z1 - z0], ...(full ? [[0, z1, w, 0.04] as [number, number, number, number]] : [])];
  return (
    <group position={[0, y, 0]}>
      {posts.map(([x, z], i) => <mesh key={i} position={[x, 0.5, z]}><boxGeometry args={[0.05, 1.0, 0.05]} /><M color="#6a6e74" metal={0.6} rough={0.4} /></mesh>)}
      {rails.map(([x, z, sx, sz], i) => <mesh key={i} position={[x, 1.0, z]}><boxGeometry args={[sx, 0.05, sz]} /><M color="#5a5e64" metal={0.6} rough={0.4} /></mesh>)}
    </group>
  );
}
