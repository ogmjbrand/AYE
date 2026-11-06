/**
 * The hospital's equipment, drawn from simple shapes (lib/hospitalSite.ts places it, with a
 * `hosp-` design). Every piece belongs to a department and is used there (lib/healthcare.ts):
 * the trolley bed and monitors of the emergency bay, the examination couch, the CT scanner, the
 * operating table, the laboratory bench, and the Herbal Medicine Centre's shelves, tables,
 * drying racks, copper pot, bath, steam chair and raised beds.
 */
import type { ReactNode } from 'react';
import type { Furniture } from '../lib/interiors';
import { PLANTS } from '../lib/herbal';

const STEEL = '#b9c2c7';
const WHITE = '#eef2f3';
const DARK = '#2b3236';
const SCREEN = '#0e2a2c';
const WOOD = '#8a5f38';

function Box({ p, s, c, r = 0.5, m = 0, e }: { p: [number, number, number]; s: [number, number, number]; c: string; r?: number; m?: number; e?: string }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={r} metalness={m} emissive={e ?? '#000000'} emissiveIntensity={e ? 0.9 : 0} />
    </mesh>
  );
}

function Cyl({ p, rad, h, c, r = 0.4, m = 0, rot }: { p: [number, number, number]; rad: number; h: number; c: string; r?: number; m?: number; rot?: [number, number, number] }) {
  return (
    <mesh position={p} rotation={rot} castShadow>
      <cylinderGeometry args={[rad, rad, h, 20]} />
      <meshStandardMaterial color={c} roughness={r} metalness={m} />
    </mesh>
  );
}

/** A monitor on a stand: the trace line glows. */
function Monitor({ h, x = 0, z = 0 }: { h: number; x?: number; z?: number }) {
  return (
    <group position={[x, 0, z]}>
      <Cyl p={[0, 0.04, 0]} rad={0.2} h={0.08} c={DARK} />
      <Cyl p={[0, h * 0.4, 0]} rad={0.025} h={h * 0.8} c={STEEL} m={0.6} />
      <Box p={[0, h - 0.18, 0]} s={[0.42, 0.32, 0.08]} c={DARK} />
      <Box p={[0, h - 0.18, 0.042]} s={[0.36, 0.26, 0.005]} c={SCREEN} e="#0d3b3a" />
      <Box p={[0, h - 0.16, 0.046]} s={[0.3, 0.012, 0.004]} c="#3ef08f" e="#3ef08f" />
      <Box p={[0.06, h - 0.24, 0.046]} s={[0.12, 0.008, 0.004]} c="#f5d142" e="#f5d142" />
    </group>
  );
}

function Wheels({ w, d }: { w: number; d: number }) {
  return <>{[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <Cyl key={i} p={[a * (w / 2 - 0.06), 0.05, b * (d / 2 - 0.08)]} rad={0.05} h={0.04} c={DARK} rot={[0, 0, Math.PI / 2]} />)}</>;
}

/** A plant in a raised bed, by its habit. */
function BedPlant({ plantId, x, z }: { plantId: string; x: number; z: number }) {
  const p = PLANTS.find((q) => q.id === plantId) ?? PLANTS[0];
  const c = p.color;
  switch (p.habit) {
    case 'grass':
      return <group position={[x, 0.55, z]}>{[0, 1, 2, 3, 4].map((k) => <Box key={k} p={[(k - 2) * 0.05, 0.22, (k % 2) * 0.05]} s={[0.025, 0.45, 0.025]} c={c} r={0.7} />)}</group>;
    case 'rosette':
      return <group position={[x, 0.55, z]}>{[0, 1, 2, 3, 4, 5].map((k) => <mesh key={k} position={[Math.cos(k) * 0.08, 0.12, Math.sin(k) * 0.08]} rotation={[Math.cos(k) * 0.5, 0, Math.sin(k) * 0.5]}><coneGeometry args={[0.04, 0.32, 6]} /><meshStandardMaterial color={c} roughness={0.6} /></mesh>)}</group>;
    case 'tree':
      return <group position={[x, 0.55, z]}><Cyl p={[0, 0.2, 0]} rad={0.025} h={0.4} c="#6b4a2f" /><mesh position={[0, 0.45, 0]}><sphereGeometry args={[0.2, 10, 8]} /><meshStandardMaterial color={c} roughness={0.75} /></mesh></group>;
    default:
      return <group position={[x, 0.55, z]}>{[0, 1, 2].map((k) => <mesh key={k} position={[(k - 1) * 0.09, 0.12 + (k % 2) * 0.05, 0]}><sphereGeometry args={[0.12, 10, 8]} /><meshStandardMaterial color={c} roughness={0.75} /></mesh>)}</group>;
  }
}

const BED_PLANTS: Record<string, string[]> = {
  'hosp-herb-bed-a': ['bitter-leaf', 'scent-leaf', 'lemongrass', 'aloe'],
  'hosp-herb-bed-b': ['ginger', 'turmeric', 'hibiscus', 'uziza'],
  'hosp-herb-bed-c': ['moringa', 'neem', 'utazi', 'pawpaw-leaf'],
};

/** Jars and bottles on a shelf: the dispensary's labelled remedies. */
function Jars({ w, y, z, seed }: { w: number; y: number; z: number; seed: number }) {
  const n = Math.floor(w / 0.22);
  const colors = ['#c7893a', '#6c8f3a', '#a83f3a', '#d8c06a', '#4f7a3a', '#8b5a2b'];
  return <>{Array.from({ length: n }, (_, i) => {
    const c = colors[(i + seed) % colors.length];
    const h = 0.16 + ((i * 7 + seed) % 3) * 0.04;
    return (
      <group key={i} position={[-w / 2 + 0.14 + i * 0.22, y, z]}>
        <Cyl p={[0, h / 2, 0]} rad={0.06} h={h} c={c} r={0.2} />
        <Box p={[0, h * 0.5, 0.061]} s={[0.08, 0.06, 0.003]} c="#f3ecd9" r={0.8} />
        <Cyl p={[0, h + 0.015, 0]} rad={0.045} h={0.03} c="#3b2a1e" />
      </group>
    );
  })}</>;
}

export function HospitalPiece({ f }: { f: Furniture }) {
  const [w, h, d] = f.size;
  const design = f.design ?? '';
  let parts: ReactNode;
  switch (design) {
    case 'hosp-ward-monitor':
    case 'hosp-vitals-monitor':
    case 'hosp-bp-monitor':
      parts = <>
        <Monitor h={h} />
        {design === 'hosp-bp-monitor' && <Box p={[0.16, h * 0.55, 0.06]} s={[0.12, 0.08, 0.05]} c="#1f4f7a" />}
      </>;
      break;
    case 'hosp-parallel-bars':
      parts = <>
        <Box p={[0, 0.02, 0]} s={[w, 0.04, d]} c="#3d6b80" r={0.8} />
        {[-1, 1].map((s) => <group key={s}>
          <Cyl p={[0, h, s * d * 0.38]} rad={0.022} h={w} c={STEEL} m={0.7} rot={[0, 0, Math.PI / 2]} />
          {[-1, 1].map((a) => <Cyl key={a} p={[a * w * 0.45, h / 2, s * d * 0.38]} rad={0.025} h={h} c={STEEL} m={0.7} />)}
        </group>)}
      </>;
      break;
    case 'hosp-treadmill':
      parts = <>
        <Box p={[0, 0.1, 0]} s={[w, 0.16, d]} c={DARK} />
        <Box p={[0, 0.19, 0.05]} s={[w * 0.8, 0.02, d * 0.8]} c="#1a1d1f" r={0.9} />
        {[-1, 1].map((s) => <Box key={s} p={[s * w * 0.45, h * 0.6, -d * 0.42]} s={[0.05, h * 1.1, 0.05]} c={STEEL} m={0.6} />)}
        <Box p={[0, h, -d * 0.42]} s={[w, 0.18, 0.2]} c={DARK} />
        <Box p={[0, h + 0.02, -d * 0.36]} s={[w * 0.5, 0.1, 0.01]} c={SCREEN} e="#0d3b3a" />
      </>;
      break;
    case 'hosp-trolley-bed':
    case 'hosp-exam-couch':
    case 'hosp-or-table': {
      const top = design === 'hosp-or-table' ? '#3f6e7d' : design === 'hosp-exam-couch' ? f.color : WHITE;
      parts = <>
        <Box p={[0, h * 0.45, 0]} s={[w * 0.3, h * 0.9, 0.12]} c={STEEL} m={0.6} />
        <Box p={[0, h * 0.1, 0]} s={[w * 0.9, 0.06, d * 0.85]} c={STEEL} m={0.5} />
        <Box p={[0, h - 0.06, 0]} s={[w, 0.12, d]} c={top} r={0.6} />
        {design === 'hosp-exam-couch' && <Box p={[0, h + 0.02, 0]} s={[w * 0.82, 0.01, d * 0.96]} c="#f4f1ea" r={0.95} />}
        <Box p={[0, h + 0.06, d / 2 - 0.25]} s={[w * 0.7, 0.08, 0.35]} c={WHITE} r={0.7} />
        {design !== 'hosp-or-table' && <Wheels w={w} d={d} />}
        {design === 'hosp-trolley-bed' && [-1, 1].map((s) => <Box key={s} p={[s * (w / 2 + 0.02), h + 0.12, 0]} s={[0.03, 0.2, d * 0.6]} c={STEEL} m={0.7} />)}
      </>;
      break;
    }
    case 'hosp-crash-cart':
      parts = <>
        <Box p={[0, h * 0.48, 0]} s={[w, h * 0.92, d]} c={f.color} r={0.45} />
        {[0.2, 0.42, 0.64].map((y) => <Box key={y} p={[0, h * y, d / 2 + 0.005]} s={[w * 0.9, 0.012, 0.01]} c="#7d1f17" />)}
        <Box p={[0, h + 0.1, -0.05]} s={[0.36, 0.2, 0.26]} c="#f2c230" />
        <Box p={[0, h + 0.16, 0.08]} s={[0.24, 0.1, 0.01]} c={SCREEN} e="#103b2c" />
        <Wheels w={w} d={d} />
      </>;
      break;
    case 'hosp-oxygen':
      parts = <>
        <Cyl p={[0, h * 0.42, 0]} rad={w / 2} h={h * 0.84} c={f.color} r={0.35} m={0.3} />
        <mesh position={[0, h * 0.84, 0]}><sphereGeometry args={[w / 2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={f.color} roughness={0.35} metalness={0.3} /></mesh>
        <Cyl p={[0, h * 0.97, 0]} rad={0.035} h={0.1} c={STEEL} m={0.8} />
      </>;
      break;
    case 'hosp-ct-scanner':
      parts = <>
        {/* The gantry ring and the sliding table through it */}
        <group position={[0, h * 0.52, -d * 0.18]}>
          <mesh castShadow><torusGeometry args={[h * 0.36, h * 0.13, 16, 40]} /><meshStandardMaterial color={WHITE} roughness={0.35} /></mesh>
          <Box p={[0, -h * 0.4, 0]} s={[w * 0.9, h * 0.2, 0.6]} c={WHITE} r={0.35} />
          <mesh position={[0, 0, 0.18]}><torusGeometry args={[h * 0.24, 0.02, 8, 40]} /><meshStandardMaterial color="#4fb3c7" emissive="#4fb3c7" emissiveIntensity={0.8} /></mesh>
        </group>
        <Box p={[0, 0.3, d * 0.2]} s={[0.55, 0.6, d * 0.55]} c={WHITE} r={0.35} />
        <Box p={[0, 0.66, d * 0.08]} s={[0.45, 0.08, d * 0.85]} c="#d7e1e5" r={0.6} />
      </>;
      break;
    case 'hosp-xray-console':
      parts = <>
        <Box p={[0, h * 0.4, 0]} s={[w, h * 0.8, d]} c={f.color} />
        {[-0.22, 0.22].map((x) => <Box key={x} p={[x, h + 0.16, -0.05]} s={[0.4, 0.3, 0.04]} c={DARK} />)}
        {[-0.22, 0.22].map((x) => <Box key={x} p={[x, h + 0.16, -0.028]} s={[0.36, 0.26, 0.004]} c="#cfe1ea" e="#6f8f9c" />)}
        <Box p={[0, h * 0.82, 0.1]} s={[0.4, 0.02, 0.16]} c="#20262a" />
      </>;
      break;
    case 'hosp-anaesthesia':
      parts = <>
        <Box p={[0, h * 0.35, 0]} s={[w, h * 0.7, d]} c="#d9dfe2" r={0.45} />
        <Box p={[0, h * 0.78, 0]} s={[w * 0.9, 0.3, d * 0.6]} c={DARK} />
        <Box p={[0, h * 0.8, d * 0.31]} s={[w * 0.7, 0.22, 0.005]} c={SCREEN} e="#0d3b3a" />
        <Cyl p={[w * 0.35, h * 0.95, 0]} rad={0.05} h={0.25} c="#2f8f5b" />
        <Wheels w={w} d={d} />
      </>;
      break;
    case 'hosp-instrument-trolley':
      parts = <>
        {[0.25, h].map((y) => <Box key={y} p={[0, y, 0]} s={[w, 0.03, d]} c={STEEL} m={0.75} r={0.25} />)}
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <Cyl key={i} p={[a * w * 0.46, h / 2, b * d * 0.42]} rad={0.015} h={h} c={STEEL} m={0.8} />)}
        <Box p={[0, h + 0.02, 0]} s={[w * 0.8, 0.005, d * 0.7]} c="#3d7fa8" r={0.9} />
        {[-0.2, -0.05, 0.1, 0.25].map((x) => <Box key={x} p={[x, h + 0.03, 0]} s={[0.012, 0.008, 0.16]} c="#e2e6e8" m={0.9} r={0.2} />)}
      </>;
      break;
    case 'hosp-lab-bench':
      parts = <>
        <Box p={[0, h * 0.45, 0]} s={[w, h * 0.9, d]} c="#c9d2d4" />
        <Box p={[0, h - 0.02, 0]} s={[w + 0.04, 0.04, d + 0.04]} c="#2b2f31" r={0.3} />
        {/* Microscope */}
        <group position={[-w * 0.3, h, 0]}>
          <Box p={[0, 0.02, 0]} s={[0.18, 0.04, 0.24]} c={DARK} />
          <Box p={[0, 0.2, -0.07]} s={[0.05, 0.36, 0.05]} c={DARK} />
          <Cyl p={[0, 0.3, 0]} rad={0.03} h={0.22} c="#dfe3e5" rot={[0.5, 0, 0]} />
          <Box p={[0, 0.12, 0.01]} s={[0.12, 0.012, 0.12]} c={STEEL} m={0.6} />
        </group>
        {/* Centrifuge */}
        <group position={[-w * 0.05, h, 0]}><Cyl p={[0, 0.1, 0]} rad={0.16} h={0.2} c={WHITE} /><Cyl p={[0, 0.205, 0]} rad={0.12} h={0.01} c="#4a7a90" /></group>
        {/* Blood analyser */}
        <group position={[w * 0.22, h, 0]}><Box p={[0, 0.18, 0]} s={[0.5, 0.36, 0.45]} c={WHITE} r={0.35} /><Box p={[0, 0.26, 0.226]} s={[0.22, 0.14, 0.005]} c={SCREEN} e="#0d3b3a" /></group>
        {/* A rack of sample tubes */}
        <group position={[w * 0.42, h, 0.05]}>{[0, 1, 2, 3, 4].map((k) => <Cyl key={k} p={[(k - 2) * 0.04, 0.06, 0]} rad={0.012} h={0.12} c={k % 2 ? '#b43a3a' : '#e0c34a'} r={0.2} />)}</group>
      </>;
      break;
    case 'hosp-sample-fridge':
      parts = <>
        <Box p={[0, h / 2, 0]} s={[w, h, d]} c={WHITE} r={0.35} />
        <Box p={[0, h * 0.55, d / 2 + 0.005]} s={[w * 0.8, h * 0.7, 0.01]} c="#a8c8d4" r={0.1} m={0.1} />
        {[0.35, 0.55, 0.75].map((y) => <Box key={y} p={[0, h * y, 0]} s={[w * 0.8, 0.01, d * 0.8]} c={STEEL} />)}
        <Box p={[0, h * 0.95, d / 2 + 0.01]} s={[0.12, 0.04, 0.005]} c="#3a91d6" e="#3a91d6" />
      </>;
      break;

    // ——— The Herbal Medicine Centre ———
    case 'hosp-herb-shelves':
      parts = <>
        <Box p={[0, h / 2, -d / 2 + 0.03]} s={[w, h, 0.06]} c={f.color} r={0.7} />
        {[0.05, 0.55, 1.05, 1.55, 2.05].map((y) => <Box key={y} p={[0, y, 0]} s={[w, 0.04, d]} c={f.color} r={0.65} />)}
        {[-1, 1].map((s) => <Box key={s} p={[s * w / 2, h / 2, 0]} s={[0.05, h, d]} c={f.color} r={0.65} />)}
        {[0.07, 0.57, 1.07, 1.57].map((y, i) => <Jars key={y} w={w - 0.2} y={y + 0.02} z={0} seed={i * 3} />)}
      </>;
      break;
    case 'hosp-herb-counter':
      parts = <>
        <Box p={[0, h * 0.47, 0]} s={[w, h * 0.94, d]} c={f.color} r={0.6} />
        <Box p={[0, h - 0.02, 0]} s={[w + 0.06, 0.05, d + 0.06]} c="#5c3d22" r={0.45} />
        {/* Brass scale and a basket of dried leaves */}
        <group position={[-w * 0.3, h, 0]}><Cyl p={[0, 0.12, 0]} rad={0.015} h={0.24} c="#b8902f" m={0.8} /><Box p={[0, 0.24, 0]} s={[0.36, 0.012, 0.012]} c="#b8902f" m={0.8} />{[-0.16, 0.16].map((x) => <Cyl key={x} p={[x, 0.17, 0]} rad={0.07} h={0.012} c="#c9a23f" m={0.8} />)}</group>
        <group position={[w * 0.25, h, 0]}><Cyl p={[0, 0.06, 0]} rad={0.16} h={0.12} c="#b28a52" r={0.9} /><mesh position={[0, 0.12, 0]}><sphereGeometry args={[0.14, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#6d7a3a" roughness={0.9} /></mesh></group>
      </>;
      break;
    case 'hosp-herb-prep-table':
      parts = <>
        <Box p={[0, h - 0.03, 0]} s={[w, 0.06, d]} c={f.color} r={0.7} />
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <Box key={i} p={[a * (w / 2 - 0.06), (h - 0.06) / 2, b * (d / 2 - 0.06)]} s={[0.07, h - 0.06, 0.07]} c="#6b4a2f" />)}
        {/* The tray, laid out tool by tool: basin, board and knife, mortar and pestle, muslin, bottles */}
        <Box p={[0, h + 0.01, 0]} s={[w * 0.8, 0.015, d * 0.6]} c="#c9a774" r={0.8} />
        <Cyl p={[-w * 0.3, h + 0.05, 0]} rad={0.13} h={0.08} c="#dfe6e8" r={0.3} m={0.3} />
        <Box p={[-w * 0.08, h + 0.03, 0.05]} s={[0.3, 0.02, 0.2]} c="#b8864f" r={0.7} />
        <Box p={[-w * 0.08, h + 0.045, -0.06]} s={[0.18, 0.004, 0.025]} c="#dde2e4" m={0.9} r={0.2} />
        <group position={[w * 0.14, h + 0.02, 0]}><Cyl p={[0, 0.06, 0]} rad={0.09} h={0.12} c="#8a7a68" r={0.9} /><Cyl p={[0.03, 0.15, 0]} rad={0.018} h={0.2} c="#6b4a2f" rot={[0, 0, 0.4]} /></group>
        <Box p={[w * 0.32, h + 0.02, 0.05]} s={[0.2, 0.01, 0.2]} c="#efe7d6" r={0.95} />
        {[0, 1, 2].map((k) => <Cyl key={k} p={[w * 0.32 + (k - 1) * 0.07, h + 0.08, -0.12]} rad={0.025} h={0.12} c="#7d9a4a" r={0.2} />)}
      </>;
      break;
    case 'hosp-herb-drying-rack':
      parts = <>
        {[-1, 1].map((s) => <Box key={s} p={[0, h / 2, s * d / 2]} s={[0.05, h, 0.05]} c={f.color} />)}
        {[0.5, 0.95, 1.4, 1.85].map((y, i) => <group key={y}>
          <Cyl p={[0, y, 0]} rad={0.012} h={d} c={f.color} rot={[Math.PI / 2, 0, 0]} />
          {Array.from({ length: 6 }, (_, k) => <mesh key={k} position={[0, y - 0.12, -d / 2 + 0.15 + k * (d - 0.3) / 5]}><coneGeometry args={[0.05, 0.24, 5]} /><meshStandardMaterial color={['#7a8a3a', '#6d5a2f', '#8a9a4a', '#a06a3a'][(i + k) % 4]} roughness={0.95} /></mesh>)}
        </group>)}
      </>;
      break;
    case 'hosp-herb-stove':
      parts = <>
        <Box p={[0, h / 2, 0]} s={[w, h, d]} c={f.color} r={0.6} m={0.3} />
        <Cyl p={[0, h + 0.01, 0]} rad={0.14} h={0.02} c="#1a1a1a" />
        <Cyl p={[0, h + 0.13, 0]} rad={0.17} h={0.22} c="#b8733a" r={0.3} m={0.85} />
        <Cyl p={[0, h + 0.25, 0]} rad={0.175} h={0.02} c="#9a5f2f" r={0.3} m={0.85} />
        <mesh position={[0, h + 0.012, 0]}><torusGeometry args={[0.1, 0.012, 6, 20]} /><meshStandardMaterial color="#ff7a2a" emissive="#ff5a1a" emissiveIntensity={1.2} /></mesh>
      </>;
      break;
    case 'hosp-herb-bath':
      parts = <>
        {/* A wooden tub: floor, four sides, and warm water strewn with leaves */}
        <Box p={[0, 0.06, 0]} s={[w, 0.12, d]} c={f.color} r={0.55} />
        {[-1, 1].map((k) => <Box key={`x${k}`} p={[k * (w / 2 - 0.04), h / 2, 0]} s={[0.08, h, d]} c={f.color} r={0.55} />)}
        {[-1, 1].map((k) => <Box key={`z${k}`} p={[0, h / 2, k * (d / 2 - 0.04)]} s={[w, h, 0.08]} c={f.color} r={0.55} />)}
        <Box p={[0, h - 0.1, 0]} s={[w - 0.16, 0.02, d - 0.16]} c="#6a7a4a" r={0.05} />
        {[0, 1, 2, 3, 4, 5].map((k) => <mesh key={k} rotation={[-Math.PI / 2, 0, 0]} position={[-w * 0.3 + k * w * 0.12, h - 0.085, (k % 2 ? 1 : -1) * 0.15]}><circleGeometry args={[0.04, 8]} /><meshStandardMaterial color="#9fbf5a" roughness={0.9} /></mesh>)}
      </>;
      break;
    case 'hosp-herb-consult-table':
      parts = <>
        <Cyl p={[0, h - 0.03, 0]} rad={w / 2} h={0.06} c={f.color} r={0.65} />
        <Cyl p={[0, (h - 0.06) / 2, 0]} rad={0.06} h={h - 0.06} c="#5c3d22" />
        <Cyl p={[0, 0.02, 0]} rad={0.28} h={0.04} c="#5c3d22" />
        <Cyl p={[0.18, h + 0.04, 0]} rad={0.045} h={0.08} c="#e8e1d2" r={0.3} />
        <Box p={[-0.15, h + 0.01, 0.05]} s={[0.25, 0.01, 0.18]} c="#f3ecd9" r={0.9} />
      </>;
      break;
    case 'hosp-herb-steam-chair':
      parts = <>
        <Box p={[0, 0.45, 0]} s={[w, 0.08, d]} c={WOOD} r={0.7} />
        <Box p={[0, 0.85, -d / 2 + 0.05]} s={[w, 0.8, 0.08]} c={WOOD} r={0.7} />
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <Box key={i} p={[a * (w / 2 - 0.05), 0.22, b * (d / 2 - 0.05)]} s={[0.06, 0.44, 0.06]} c="#5c3d22" />)}
        <Cyl p={[0, 0.12, d * 0.6]} rad={0.16} h={0.22} c="#b8733a" m={0.8} r={0.3} />
        <Box p={[0, 1.0, 0]} s={[w + 0.1, 0.02, d + 0.2]} c={f.color} r={0.95} />
      </>;
      break;
    case 'hosp-herb-bed-a':
    case 'hosp-herb-bed-b':
    case 'hosp-herb-bed-c': {
      const ids = BED_PLANTS[design];
      parts = <>
        <Box p={[0, h / 2, 0]} s={[w, h, d]} c="#7a5232" r={0.85} />
        <Box p={[0, h - 0.01, 0]} s={[w - 0.1, 0.04, d - 0.1]} c="#3f2c1d" r={1} />
        {ids.map((id, k) => <BedPlant key={id} plantId={id} x={0} z={-d / 2 + 0.45 + k * (d - 0.9) / (ids.length - 1)} />)}
      </>;
      break;
    }
    case 'hosp-herb-research':
      parts = <>
        <Box p={[0, h - 0.03, 0]} s={[w, 0.06, d]} c={f.color} r={0.55} />
        {[-1, 1].map((s) => <Box key={s} p={[s * (w / 2 - 0.05), (h - 0.06) / 2, 0]} s={[0.06, h - 0.06, d - 0.1]} c="#a89a82" />)}
        <group position={[-w * 0.3, h, 0]}>
          <Box p={[0, 0.02, 0]} s={[0.16, 0.04, 0.2]} c={DARK} />
          <Box p={[0, 0.18, -0.06]} s={[0.045, 0.32, 0.045]} c={DARK} />
          <Cyl p={[0, 0.27, 0]} rad={0.026} h={0.2} c="#dfe3e5" rot={[0.5, 0, 0]} />
        </group>
        {[0, 1, 2].map((k) => <group key={k} position={[w * 0.02 + k * 0.16, h, -0.12]}><Cyl p={[0, 0.09, 0]} rad={0.05} h={0.18} c="#cfe3e0" r={0.05} /><Cyl p={[0, 0.07, 0]} rad={0.04} h={0.1} c={['#6d8f3a', '#b87a2a', '#a83f3a'][k]} r={0.8} /></group>)}
        <Box p={[w * 0.3, h + 0.02, 0.12]} s={[0.3, 0.04, 0.22]} c="#2f5a3a" r={0.8} />
      </>;
      break;
    default:
      parts = <Box p={[0, h / 2, 0]} s={[w, h, d]} c={f.color} />;
  }
  return <>{parts}</>;
}
