import { useMemo, type ReactNode } from 'react';
import { RoundedBox } from '@react-three/drei';
import { DoubleSide, LatheGeometry, Vector2 } from 'three';

/**
 * The Palms' dishes as small 3D models, plated at real size (a dinner plate
 * is 27 cm across). The same models are served on your table and rendered as
 * the menu's pictures. Built from simple shapes, so they cost no downloads.
 * The origin is the middle of the plate's base, on the table.
 */

type V3 = [number, number, number];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const M = ({ color, rough = 0.6, metal = 0, emissive, glossy = false }: { color: string; rough?: number; metal?: number; emissive?: string; glossy?: boolean }) =>
  <meshStandardMaterial color={color} roughness={glossy ? 0.18 : rough} metalness={metal} emissive={emissive ?? '#000000'} emissiveIntensity={emissive ? 0.25 : 0} />;

/** Ellipsoid: a sphere scaled on each axis. */
function Blob({ p, s, color, rough = 0.6, rot = [0, 0, 0], detail = 16, glossy = false }: { p: V3; s: V3; color: string; rough?: number; rot?: V3; detail?: number; glossy?: boolean }) {
  return (
    <mesh position={p} scale={s} rotation={rot} castShadow>
      <sphereGeometry args={[1, detail, Math.max(8, detail * 0.75)]} />
      <M color={color} rough={rough} glossy={glossy} />
    </mesh>
  );
}

function Cyl({ p, r, h, color, rot = [0, 0, 0], r2, seg = 20, rough = 0.6, metal = 0, theta }: { p: V3; r: number; h: number; color: string; rot?: V3; r2?: number; seg?: number; rough?: number; metal?: number; theta?: [number, number] }) {
  return (
    <mesh position={p} rotation={rot} castShadow>
      <cylinderGeometry args={[r2 ?? r, r, h, seg, 1, false, theta?.[0] ?? 0, theta?.[1] ?? Math.PI * 2]} />
      <M color={color} rough={rough} metal={metal} />
    </mesh>
  );
}

/** A curled prawn: part of a ring, pink-orange, with a darker tail. */
function Prawn({ p, rot = [0, 0, 0], size = 1 }: { p: V3; rot?: V3; size?: number }) {
  return (
    <group position={p} rotation={rot} scale={size}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.022, 0.0085, 10, 18, Math.PI * 1.25]} />
        <M color="#f2895a" rough={0.45} />
      </mesh>
      <mesh position={[0.022, 0, 0.001]} rotation={[0, 0, 0.4]}>
        <coneGeometry args={[0.008, 0.016, 6]} />
        <M color="#d4502a" />
      </mesh>
    </group>
  );
}

function useLathe(points: [number, number][], seg = 40) {
  return useMemo(() => new LatheGeometry(points.map(([x, y]) => new Vector2(x, y)), seg), [points, seg]);
}

const PLATE_PTS: [number, number][] = [[0, 0.004], [0.09, 0.004], [0.1, 0.008], [0.118, 0.016], [0.135, 0.022], [0.136, 0.019], [0.12, 0.012], [0.1, 0.0], [0, 0]];
const BOWL_PTS: [number, number][] = [[0, 0], [0.045, 0], [0.05, 0.006], [0.085, 0.03], [0.1, 0.06], [0.096, 0.061], [0.08, 0.034], [0.045, 0.012], [0, 0.012]];

/** White porcelain dinner plate with a gold rim line. */
function Plate({ scale = 1 }: { scale?: number }) {
  const geo = useLathe(PLATE_PTS);
  return (
    <group scale={[scale, 1, scale]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color="#f6f3ee" roughness={0.22} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.0215, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.1355, 0.0012, 4, 48]} />
        <meshStandardMaterial color="#d7b062" metalness={0.9} roughness={0.25} />
      </mesh>
    </group>
  );
}

function Bowl({ scale = 1, color = '#f6f3ee' }: { scale?: number; color?: string }) {
  const geo = useLathe(BOWL_PTS);
  return (
    <mesh geometry={geo} scale={scale} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.25} side={DoubleSide} />
    </mesh>
  );
}

/** A clear glass (lathe outline) with liquid filled to `fill` of its height. */
function Glass({ profile, fill, liquid, children }: { profile: [number, number][]; fill: number; liquid: string; children?: ReactNode }) {
  const geo = useLathe(profile, 32);
  const liquidPts = useMemo(() => {
    // The outer wall going up (the outline then comes back down the inside)
    const top = profile.reduce((a, [, y]) => Math.max(a, y), 0);
    const up: [number, number][] = [];
    for (const pt of profile.slice(1)) { up.push(pt); if (pt[1] >= top) break; }
    const radiusAt = (y: number) => {
      for (let i = 1; i < up.length; i++) {
        const [x0, y0] = up[i - 1];
        const [x1, y1] = up[i];
        if (y <= y1 && y1 > y0) return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
      }
      return up[up.length - 1][0];
    };
    const base = 0.012;
    const h = top * fill;
    const pts: [number, number][] = [[0, base]];
    for (let k = 0; k <= 8; k++) {
      const y = base + ((h - base) * k) / 8;
      pts.push([Math.max(0.002, radiusAt(y) - 0.004), y]);
    }
    pts.push([0, h]);
    return pts;
  }, [profile, fill]);
  const liq = useLathe(liquidPts, 32);
  return (
    <group>
      <mesh geometry={liq}>
        <meshStandardMaterial color={liquid} roughness={0.15} transparent opacity={0.92} />
      </mesh>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial color="#e9f2f2" roughness={0.04} metalness={0.1} transparent opacity={0.28} side={DoubleSide} depthWrite={false} />
      </mesh>
      {children}
    </group>
  );
}

const TALL_GLASS: [number, number][] = [[0, 0], [0.032, 0], [0.034, 0.01], [0.038, 0.16], [0.036, 0.16], [0.032, 0.012], [0, 0.012]];
const TUMBLER: [number, number][] = [[0, 0], [0.036, 0], [0.04, 0.1], [0.038, 0.1], [0.034, 0.01], [0, 0.01]];
const HURRICANE: [number, number][] = [[0, 0], [0.032, 0], [0.034, 0.006], [0.006, 0.02], [0.006, 0.06], [0.04, 0.09], [0.03, 0.14], [0.046, 0.19], [0.044, 0.19], [0.028, 0.14], [0.038, 0.09], [0.004, 0.06], [0, 0.06]];

function Straw({ p, color = '#1f5c4a', tilt = 0.18 }: { p: V3; color?: string; tilt?: number }) {
  return <Cyl p={p} r={0.0035} h={0.17} color={color} rot={[tilt, 0, tilt * 0.6]} seg={8} />;
}

function Ice({ base, n, r = 0.03, seed = 3 }: { base: number; n: number; r?: number; seed?: number }) {
  const rand = rng(seed);
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[(rand() - 0.5) * r, base + i * 0.02, (rand() - 0.5) * r]} rotation={[rand(), rand(), rand()]}>
          <boxGeometry args={[0.018, 0.018, 0.018]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.45} roughness={0.05} />
        </mesh>
      ))}
    </>
  );
}

function GrillMarks({ y, len, n, spacing, color = '#3a1c10', rotY = 0.6 }: { y: number; len: number; n: number; spacing: number; color?: string; rotY?: number }) {
  return (
    <group position={[0, y, 0]} rotation={[0, rotY, 0]}>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[0, 0, (i - (n - 1) / 2) * spacing]}>
          <boxGeometry args={[len, 0.002, 0.004]} />
          <M color={color} rough={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Greens({ center, n, spread, seed, color = '#4f8a3a' }: { center: V3; n: number; spread: number; seed: number; color?: string }) {
  const rand = rng(seed);
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <Blob key={i} p={[center[0] + (rand() - 0.5) * spread, center[1] + rand() * 0.01, center[2] + (rand() - 0.5) * spread]} s={[0.014, 0.004, 0.009]} rot={[rand(), rand() * 3, rand()]} color={i % 3 ? color : '#6aa448'} detail={8} />
      ))}
    </>
  );
}

function Rice({ p, r, h, color, seed, specks }: { p: V3; r: number; h: number; color: string; seed: number; specks?: string }) {
  const rand = rng(seed);
  return (
    <group position={p}>
      <mesh scale={[r, h, r]} castShadow>
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial color={color} roughness={0.85} flatShading />
      </mesh>
      {specks && Array.from({ length: 14 }, (_, i) => {
        const a = rand() * Math.PI * 2;
        const rr = Math.sqrt(rand()) * r * 0.8;
        return <Blob key={i} p={[Math.cos(a) * rr, h * Math.sqrt(Math.max(0, 1 - (rr / r) ** 2)), Math.sin(a) * rr]} s={[0.004, 0.002, 0.003]} color={specks} detail={6} />;
      })}
    </group>
  );
}

/** The dish with this menu id, plated. */
export function DishModel({ id }: { id: string }) {
  switch (id) {
    case 'grilled-salmon':
      return (
        <group>
          <Plate />
          <Greens center={[-0.035, 0.024, 0.04]} n={9} spread={0.06} seed={2} />
          {[[0.05, 0.035], [0.065, -0.005], [0.035, -0.04]].map(([x, z], i) => <Blob key={i} p={[x, 0.032, z]} s={[0.017, 0.013, 0.016]} color="#e3cf8e" rough={0.7} />)}
          <group position={[-0.015, 0.038, -0.01]} rotation={[0, 0.5, 0]}>
            <RoundedBox args={[0.13, 0.03, 0.07]} radius={0.012} smoothness={3} castShadow>
              <M color="#f0875f" rough={0.5} />
            </RoundedBox>
            <GrillMarks y={0.0155} len={0.07} n={5} spacing={0.022} rotY={1.0} />
          </group>
          <group position={[0.06, 0.03, 0.06]} rotation={[0, -0.6, Math.PI / 2]}>
            <Cyl p={[0, 0, 0]} r={0.022} h={0.02} color="#f4d94a" theta={[0, Math.PI]} rough={0.4} />
          </group>
          <Blob p={[-0.02, 0.057, -0.015]} s={[0.012, 0.004, 0.012]} color="#ffe9a8" glossy />
        </group>
      );
    case 'jollof-chicken':
      return (
        <group>
          <Plate />
          <Rice p={[-0.025, 0.022, 0]} r={0.075} h={0.04} color="#d4561e" seed={5} specks="#b33a12" />
          <group position={[0.045, 0.05, 0.02]} rotation={[0.2, -0.7, 0.35]}>
            <mesh scale={[1, 0.85, 0.9]} castShadow>
              <capsuleGeometry args={[0.026, 0.05, 6, 12]} />
              <M color="#8c3a16" rough={0.55} />
            </mesh>
            <Cyl p={[0, 0.058, 0]} r={0.006} h={0.03} color="#efe6d6" />
            <Blob p={[0, 0.074, 0]} s={[0.009, 0.007, 0.009]} color="#efe6d6" />
          </group>
          {[[-0.07, -0.06, 0.3], [-0.045, -0.075, 0.9], [-0.015, -0.083, 1.4]].map(([x, z, r], i) => (
            <Blob key={i} p={[x, 0.028, z]} s={[0.022, 0.008, 0.014]} rot={[0, r, 0]} color={i % 2 ? '#e8a22e' : '#d98a22'} rough={0.4} />
          ))}
          <Greens center={[0.07, 0.024, -0.05]} n={4} spread={0.025} seed={9} />
        </group>
      );
    case 'steak-mash':
      return (
        <group>
          <Plate />
          <group position={[0.02, 0.036, 0.01]} rotation={[0, -0.4, 0]}>
            <RoundedBox args={[0.11, 0.028, 0.075]} radius={0.012} smoothness={3} castShadow>
              <M color="#5d2a17" rough={0.55} />
            </RoundedBox>
            <GrillMarks y={0.0145} len={0.08} n={4} spacing={0.018} />
          </group>
          <Blob p={[-0.06, 0.035, -0.035]} s={[0.04, 0.026, 0.038]} color="#f0e2b8" rough={0.8} detail={20} />
          <Blob p={[-0.058, 0.06, -0.035]} s={[0.012, 0.005, 0.01]} color="#f7d35a" glossy />
          {Array.from({ length: 6 }, (_, i) => <Cyl key={i} p={[0.0 + i * 0.008, 0.03, 0.07 - i * 0.002]} r={0.0035} h={0.07} color="#3f8a2e" rot={[Math.PI / 2, 0.9 + i * 0.05, 0]} seg={6} />)}
          <mesh position={[0.025, 0.022, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.03, 20]} />
            <M color="#4a2412" glossy />
          </mesh>
        </group>
      );
    case 'seafood-pasta': {
      const rand = rng(11);
      return (
        <group>
          <Plate scale={1.05} />
          <group position={[0, 0.024, 0]}>
            {Array.from({ length: 16 }, (_, i) => (
              <mesh key={i} position={[(rand() - 0.5) * 0.06, 0.006 + i * 0.0018, (rand() - 0.5) * 0.06]} rotation={[Math.PI / 2 + (rand() - 0.5) * 0.6, (rand() - 0.5) * 0.6, rand() * 3]} castShadow>
                <torusGeometry args={[0.035 + rand() * 0.02, 0.0025, 5, 28]} />
                <M color="#f1d27a" rough={0.55} />
              </mesh>
            ))}
            <Blob p={[0, 0.018, 0]} s={[0.05, 0.012, 0.05]} color="#c8442a" glossy />
            <Prawn p={[0.03, 0.035, 0.01]} rot={[0.3, 0.4, 0]} />
            <Prawn p={[-0.03, 0.034, -0.02]} rot={[0.2, 2.2, 0]} />
            <Prawn p={[0.0, 0.038, -0.035]} rot={[-0.2, 1.1, 0]} />
            {[[0.05, -0.03], [-0.045, 0.035], [0.01, 0.05]].map(([x, z], i) => (
              <Blob key={i} p={[x, 0.026, z]} s={[0.02, 0.008, 0.011]} rot={[0, i * 1.3, 0]} color="#1d1f26" glossy />
            ))}
            {Array.from({ length: 6 }, (_, i) => <Blob key={i} p={[(rand() - 0.5) * 0.07, 0.042, (rand() - 0.5) * 0.07]} s={[0.004, 0.0015, 0.003]} color="#2f7a2a" detail={6} />)}
          </group>
        </group>
      );
    }
    case 'grilled-prawns':
      return (
        <group>
          <Plate />
          <Rice p={[0.035, 0.022, 0.03]} r={0.055} h={0.03} color="#ece0bf" seed={7} specks="#4f8a3a" />
          <group position={[-0.02, 0.05, -0.02]} rotation={[0, 0.5, 0]}>
            <Cyl p={[0, 0, 0]} r={0.0022} h={0.2} color="#b78a5a" rot={[0, 0, Math.PI / 2]} seg={6} />
            {[-0.06, -0.02, 0.02, 0.06].map((x, i) => <Prawn key={i} p={[x, 0, 0]} rot={[0, Math.PI / 2, i * 0.2]} size={1.15} />)}
          </group>
          <group position={[0.075, 0.03, -0.055]} rotation={[0, 0.8, Math.PI / 2]}>
            <Cyl p={[0, 0, 0]} r={0.02} h={0.018} color="#7cc04a" theta={[0, Math.PI]} rough={0.4} />
          </group>
          {Array.from({ length: 8 }, (_, i) => <Blob key={i} p={[-0.05 + i * 0.012, 0.062, -0.04 + (i % 2) * 0.01]} s={[0.003, 0.002, 0.003]} color="#b3381c" detail={6} />)}
        </group>
      );
    case 'vegetable-bowl': {
      const rand = rng(21);
      return (
        <group>
          <Bowl scale={1.25} />
          <Blob p={[0, 0.045, 0]} s={[0.1, 0.02, 0.1]} color="#d9c99a" rough={0.9} />
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={i} position={[-0.04 + rand() * 0.03, 0.065, -0.045 + rand() * 0.03]} rotation={[rand(), rand(), rand()]} castShadow>
              <boxGeometry args={[0.016, 0.016, 0.016]} />
              <M color="#e07a2c" rough={0.6} />
            </mesh>
          ))}
          {[0, 1, 2, 3].map((i) => <Blob key={i} p={[0.03 + i * 0.008, 0.066, -0.035 + i * 0.012]} s={[0.026, 0.008, 0.012]} rot={[0, 0.9, 0]} color="#9cc455" glossy />)}
          {Array.from({ length: 12 }, (_, i) => <Blob key={i} p={[-0.045 + rand() * 0.035, 0.064, 0.02 + rand() * 0.035]} s={[0.007, 0.005, 0.006]} color="#6b1f1a" glossy detail={8} />)}
          <Greens center={[0.035, 0.064, 0.04]} n={10} spread={0.04} seed={4} color="#3d7a2e" />
          {Array.from({ length: 10 }, (_, i) => <Blob key={i} p={[(rand() - 0.5) * 0.02, 0.07, (rand() - 0.5) * 0.02]} s={[0.006, 0.003, 0.004]} color="#c59a5a" detail={6} />)}
        </group>
      );
    }
    case 'pepper-soup':
      return (
        <group>
          <Plate scale={0.85} />
          <group position={[0, 0.02, 0]}><Bowl /></group>
          <mesh position={[0, 0.067, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.083, 32]} />
            <M color="#8a3a1a" glossy />
          </mesh>
          {[[0.02, 0.01], [-0.025, -0.015], [0.0, -0.035]].map(([x, z], i) => <Blob key={i} p={[x, 0.07, z]} s={[0.022, 0.01, 0.016]} rot={[0, i, 0]} color="#e8d7bd" rough={0.6} />)}
          <Greens center={[-0.02, 0.072, 0.03]} n={5} spread={0.03} seed={8} color="#2f6b2a" />
        </group>
      );
    case 'suya-skewers':
      return (
        <group>
          <group scale={[1.25, 1, 0.7]}><Plate /></group>
          {[-0.035, 0, 0.035].map((z, k) => (
            <group key={k} position={[0, 0.034, z]} rotation={[0, 0.05 * k, 0]}>
              <Cyl p={[0, 0, 0]} r={0.002} h={0.22} color="#b78a5a" rot={[0, 0, Math.PI / 2]} seg={6} />
              {[-0.07, -0.042, -0.014, 0.014, 0.042, 0.07].map((x, i) => (
                <mesh key={i} position={[x, 0, 0]} rotation={[i, i * 0.7, 0]} castShadow>
                  <boxGeometry args={[0.022, 0.018, 0.02]} />
                  <M color={i % 2 ? '#6e2a14' : '#5a2010'} rough={0.75} />
                </mesh>
              ))}
            </group>
          ))}
          {[[-0.09, 0.06], [0.08, 0.065]].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.026, z]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.014, 0.003, 6, 16]} />
              <M color="#c98bc0" />
            </mesh>
          ))}
          <Cyl p={[0.1, 0.026, -0.06]} r={0.016} h={0.008} color="#d63a2a" />
        </group>
      );
    case 'spring-rolls':
      return (
        <group>
          <Plate />
          {[[-0.03, 0.03, 0.3], [-0.01, -0.01, 0.2], [0.012, 0.03, 0.4], [-0.005, 0.055, 0.28]].map(([x, y, r], i) => (
            <Cyl key={i} p={[x, y, (i - 1.5) * 0.028]} r={0.014} h={0.095} color={i % 2 ? '#d99a3c' : '#e3a948'} rot={[Math.PI / 2, r, 0]} rough={0.5} seg={14} />
          ))}
          <group position={[0.07, 0.022, -0.04]} scale={0.4}><Bowl /></group>
          <mesh position={[0.07, 0.042, -0.04]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.033, 20]} />
            <M color="#d84a2a" glossy />
          </mesh>
          <Greens center={[0.07, 0.024, 0.06]} n={5} spread={0.03} seed={6} />
        </group>
      );
    case 'avocado-salad': {
      const rand = rng(13);
      return (
        <group>
          <Plate />
          <Greens center={[0, 0.026, 0]} n={18} spread={0.13} seed={12} />
          {[0, 1, 2, 3].map((i) => <Blob key={i} p={[-0.04 + i * 0.012, 0.036, -0.03 + i * 0.008]} s={[0.03, 0.009, 0.014]} rot={[0, 0.7, 0]} color="#a7cc5c" glossy />)}
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={i} position={[0.02 + rand() * 0.05, 0.036, 0.0 + rand() * 0.05]} rotation={[rand(), rand(), rand()]} castShadow>
              <boxGeometry args={[0.014, 0.014, 0.014]} />
              <M color="#f2a52a" glossy />
            </mesh>
          ))}
          {[[-0.05, 0.05], [-0.07, 0.02], [0.06, -0.05]].map(([x, z], i) => <Cyl key={i} p={[x, 0.033, z]} r={0.016} h={0.004} color="#cfe3b0" />)}
          {Array.from({ length: 10 }, (_, i) => <Blob key={i} p={[(rand() - 0.5) * 0.1, 0.042, (rand() - 0.5) * 0.1]} s={[0.006, 0.004, 0.005]} color="#b9864a" detail={6} />)}
        </group>
      );
    }
    case 'chapman':
      return (
        <group>
          <Glass profile={TALL_GLASS} fill={0.82} liquid="#c4281f">
            <Ice base={0.06} n={4} />
            <Cyl p={[0.0, 0.12, 0.012]} r={0.016} h={0.004} color="#a9cf86" rot={[Math.PI / 2.4, 0, 0]} />
            <group position={[0.03, 0.155, 0]} rotation={[0, 0, Math.PI / 2]}>
              <Cyl p={[0, 0, 0]} r={0.022} h={0.006} color="#f29a2a" theta={[0, Math.PI]} />
            </group>
            <Straw p={[-0.012, 0.13, 0]} />
          </Glass>
        </group>
      );
    case 'zobo':
      return (
        <group>
          <Glass profile={TUMBLER} fill={0.8} liquid="#5a0f2e">
            <Ice base={0.05} n={3} seed={9} />
            <group position={[0.035, 0.1, 0]} rotation={[0, 0, -0.4]}>
              <mesh castShadow><coneGeometry args={[0.018, 0.03, 3]} /><M color="#f2cd4a" /></mesh>
            </group>
          </Glass>
        </group>
      );
    case 'orange-juice':
      return (
        <group>
          <Glass profile={TUMBLER} fill={0.85} liquid="#f29a1e">
            <group position={[0.038, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
              <Cyl p={[0, 0, 0]} r={0.022} h={0.006} color="#f7b23a" theta={[0, Math.PI]} />
            </group>
          </Glass>
        </group>
      );
    case 'palm-mocktail':
      return (
        <group>
          <Glass profile={HURRICANE} fill={0.88} liquid="#f2b02a">
            <Ice base={0.1} n={3} r={0.04} seed={5} />
            <Greens center={[0.0, 0.17, 0.0]} n={6} spread={0.03} seed={14} color="#3f9a3a" />
            <Blob p={[0.035, 0.18, 0]} s={[0.018, 0.018, 0.018]} color="#6a2a4a" rough={0.5} />
            <Blob p={[0.035, 0.185, 0]} s={[0.014, 0.004, 0.014]} color="#f2c22a" glossy />
            <Straw p={[-0.015, 0.16, 0]} color="#d9b66a" />
          </Glass>
        </group>
      );
    case 'espresso':
      return (
        <group>
          <Cyl p={[0, 0.004, 0]} r={0.06} r2={0.065} h={0.008} color="#f6f3ee" rough={0.25} seg={32} />
          <Cyl p={[0, 0.03, 0]} r={0.022} r2={0.03} h={0.045} color="#f6f3ee" rough={0.25} seg={28} />
          <mesh position={[0, 0.051, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.027, 24]} />
            <M color="#3b1f10" glossy />
          </mesh>
          <mesh position={[0, 0.0515, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.016, 0.026, 24]} />
            <M color="#a0642e" rough={0.5} />
          </mesh>
          <mesh position={[0.034, 0.032, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.011, 0.0035, 8, 16, Math.PI]} />
            <M color="#f6f3ee" rough={0.25} />
          </mesh>
          <Cyl p={[-0.045, 0.012, 0.025]} r={0.004} h={0.05} color="#c9a052" metal={0.9} rough={0.3} rot={[Math.PI / 2, 0.7, 0]} seg={8} />
        </group>
      );
    case 'lava-cake':
      return (
        <group>
          <Plate />
          <Cyl p={[-0.015, 0.045, 0]} r={0.04} r2={0.036} h={0.05} color="#3a1d12" rough={0.7} seg={28} />
          <Blob p={[-0.015, 0.07, 0]} s={[0.036, 0.006, 0.036]} color="#2a120a" glossy />
          <Blob p={[0.025, 0.024, 0.01]} s={[0.04, 0.004, 0.03]} color="#2a120a" glossy />
          <Blob p={[0.06, 0.04, -0.035]} s={[0.022, 0.019, 0.022]} color="#f6efdc" rough={0.7} detail={20} />
          {[[0.05, 0.05], [0.065, 0.035], [-0.06, -0.05]].map(([x, z], i) => <Blob key={i} p={[x, 0.03, z]} s={[0.008, 0.008, 0.008]} color="#b0182a" glossy />)}
          {Array.from({ length: 10 }, (_, i) => <Blob key={i} p={[-0.05 + i * 0.006, 0.023, -0.06 + (i % 3) * 0.004]} s={[0.002, 0.001, 0.002]} color="#ffffff" detail={4} />)}
          <Greens center={[-0.015, 0.075, 0]} n={2} spread={0.01} seed={3} color="#3f9a3a" />
        </group>
      );
    case 'puff-puff-ice': {
      const rand = rng(31);
      return (
        <group>
          <Plate />
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return <Blob key={i} p={[Math.cos(a) * 0.045 - 0.015, 0.04 + (i % 2) * 0.006, Math.sin(a) * 0.045]} s={[0.022, 0.02, 0.022]} rot={[rand(), rand(), 0]} color={i % 2 ? '#c9822e' : '#d6923a'} rough={0.75} />;
          })}
          <Blob p={[-0.015, 0.058, 0]} s={[0.022, 0.02, 0.022]} color="#d08a34" rough={0.75} />
          <group position={[0.07, 0.022, 0.05]} scale={0.5}><Bowl /></group>
          <Blob p={[0.07, 0.05, 0.05]} s={[0.022, 0.019, 0.022]} color="#f6efdc" rough={0.7} detail={20} />
          {Array.from({ length: 24 }, (_, i) => <Blob key={i} p={[-0.06 + rand() * 0.09, 0.062 + rand() * 0.004, -0.045 + rand() * 0.09]} s={[0.0025, 0.0012, 0.0025]} color="#ffffff" detail={4} />)}
        </group>
      );
    }
    case 'fruit-platter':
      return (
        <group>
          <group scale={[1.2, 1, 0.85]}><Plate /></group>
          {/* Watermelon half-moons standing up, green rind round the curve */}
          {[-0.085, -0.055, -0.025].map((x, i) => (
            <group key={i} position={[x, 0.022, -0.035]} rotation={[0, Math.PI / 2 + 0.3, 0]}>
              <Cyl p={[0, 0, 0]} r={0.042} h={0.016} color="#2f7a3a" rot={[Math.PI / 2, 0, 0]} theta={[-Math.PI / 2, Math.PI]} rough={0.6} />
              <Cyl p={[0, 0, 0]} r={0.036} h={0.0165} color="#e0324a" rot={[Math.PI / 2, 0, 0]} theta={[-Math.PI / 2, Math.PI]} rough={0.45} />
            </group>
          ))}
          {[0.02, 0.045, 0.07].map((x, i) => (
            <group key={i} position={[x, 0.03, -0.035]} rotation={[0, -0.4, 0]}>
              <mesh castShadow><boxGeometry args={[0.02, 0.022, 0.05]} /><M color="#f4d03a" rough={0.5} /></mesh>
            </group>
          ))}
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={i} position={[-0.04 + (i % 3) * 0.022, 0.03, 0.035 + Math.floor(i / 3) * 0.022]} rotation={[0.2, i, 0]} castShadow>
              <boxGeometry args={[0.018, 0.018, 0.018]} />
              <M color="#f59a1e" glossy />
            </mesh>
          ))}
          {[0, 1, 2].map((i) => <Blob key={i} p={[0.05 + i * 0.012, 0.03, 0.04 + i * 0.006]} s={[0.032, 0.009, 0.013]} rot={[0, -0.6, 0]} color="#f2783a" glossy />)}
          <Greens center={[0.0, 0.03, 0.0]} n={3} spread={0.02} seed={5} color="#3f9a3a" />
        </group>
      );
    case 'cheesecake':
      return (
        <group>
          <Plate />
          <group position={[0.0, 0.022, 0.0]} rotation={[0, 0.6, 0]}>
            <Cyl p={[-0.04, 0.008, 0]} r={0.085} h={0.016} color="#9a6a3a" theta={[1.25, 0.65]} rough={0.9} seg={32} />
            <Cyl p={[-0.04, 0.034, 0]} r={0.085} h={0.036} color="#f4e6bf" theta={[1.25, 0.65]} rough={0.65} seg={32} />
            <Cyl p={[-0.04, 0.055, 0]} r={0.085} h={0.006} color="#f2a12a" theta={[1.25, 0.65]} rough={0.15} seg={32} />
          </group>
          {Array.from({ length: 5 }, (_, i) => <Blob key={i} p={[0.03 + i * 0.008, 0.08, -0.01 + (i % 2) * 0.01]} s={[0.003, 0.002, 0.003]} color="#2a1a10" detail={6} />)}
          <Blob p={[-0.06, 0.03, 0.06]} s={[0.012, 0.006, 0.012]} color="#ffffff" rough={0.7} />
          <Greens center={[-0.055, 0.04, 0.06]} n={2} spread={0.01} seed={7} color="#3f9a3a" />
        </group>
      );
    default:
      return <Plate />;
  }
}

