import { Suspense, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import {
  Color, DoubleSide, Euler, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, Vector3,
} from 'three';
import {
  DANFO_SIZE, DANFOS, MARKET_STALLS, PALMS, POWER_POLES, STREET_LAMPS, seeded, type Vehicle,
} from '../lib/world';
import { Instances, type Placement } from './Instances';
import { materials } from './materials';
import { frondTexture } from './textures';

// ---------------------------------------------------------------- palms

const PALM_HEIGHT = 7.5;
const FRONDS = 14;

/** A frond that arches outwards and droops at the tip. */
function useFrondGeometry() {
  return useMemo(() => {
    const L = 4.4;
    const g = new PlaneGeometry(1.6, L, 1, 10);
    g.translate(0, L / 2, 0); // base at the origin, extending along +Y
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = p.getY(i) / L;
      // Lay the frond out along +Z and droop it
      const along = p.getY(i);
      p.setXYZ(i, p.getX(i) * (1 - t * 0.4), 0.8 * along * (1 - t) - 1.8 * t * t, along * 0.92);
    }
    g.computeVertexNormals();
    return g;
  }, []);
}

function Palms() {
  const frondGeo = useFrondGeometry();
  const frondMat = useMemo(
    () => new MeshStandardMaterial({ map: frondTexture(), alphaTest: 0.5, side: DoubleSide, roughness: 0.8 }),
    [],
  );
  const trunkMat = useMemo(() => new MeshStandardMaterial({ color: '#7b6b55', roughness: 0.95 }), []);
  const { trunks, fronds } = useMemo(() => {
    const rand = seeded(29);
    const trunks: Placement[] = [];
    const fronds: Placement[] = [];
    for (const [x, , z] of PALMS) {
      const h = PALM_HEIGHT * (0.85 + rand() * 0.3);
      trunks.push({ position: new Vector3(x, h / 2, z), scale: new Vector3(1, h, 1) });
      const spin = rand() * Math.PI * 2;
      for (let i = 0; i < FRONDS; i++) {
        const yaw = spin + (i / FRONDS) * Math.PI * 2 + (rand() - 0.5) * 0.3;
        fronds.push({
          position: new Vector3(x, h - 0.1, z),
          scale: new Vector3(1, 1, 0.85 + rand() * 0.3),
          rotation: new Euler(-0.15 + (rand() - 0.5) * 0.4, yaw, 0, 'YXZ'),
        });
      }
    }
    return { trunks, fronds };
  }, []);
  return (
    <>
      <Instances items={trunks} material={trunkMat} geometry={<cylinderGeometry args={[0.16, 0.24, 1, 8]} />} />
      <Instances items={fronds} material={frondMat} geometry={<primitive object={frondGeo} attach="geometry" />} />
    </>
  );
}

// ---------------------------------------------------------------- street lamps

const LAMP_HEIGHT = 6.5;

function StreetLamps({ night }: { night: number }) {
  const m = materials();
  const { poles, arms, heads, pools } = useMemo(() => {
    const poles: Placement[] = [], arms: Placement[] = [], heads: Placement[] = [], pools: Placement[] = [];
    for (const [x, , z] of STREET_LAMPS) {
      const toRoad = -Math.sign(x);
      poles.push({ position: new Vector3(x, LAMP_HEIGHT / 2, z), scale: new Vector3(1, LAMP_HEIGHT, 1) });
      arms.push({ position: new Vector3(x + toRoad * 0.8, LAMP_HEIGHT - 0.1, z), scale: new Vector3(1.6, 0.08, 0.08) });
      heads.push({ position: new Vector3(x + toRoad * 1.55, LAMP_HEIGHT - 0.2, z), scale: new Vector3(0.7, 0.14, 0.32) });
      pools.push({ position: new Vector3(x + toRoad * 1.5, 0.15, z), scale: new Vector3(7, 7, 1), rotation: new Euler(-Math.PI / 2, 0, 0) });
    }
    return { poles, arms, heads, pools };
  }, []);
  return (
    <>
      <Instances items={poles} material={m.darkMetal} geometry={<cylinderGeometry args={[0.07, 0.1, 1, 8]} />} />
      <Instances items={arms} material={m.darkMetal} geometry={<boxGeometry args={[1, 1, 1]} />} />
      <Instances items={heads} material={m.lampHead} geometry={<boxGeometry args={[1, 1, 1]} />} castShadow={false} />
      <Instances items={pools} castShadow={false} material={m.lightPool} geometry={<planeGeometry args={[1, 1]} />} visible={night > 0.05} />
    </>
  );
}

// ---------------------------------------------------------------- power lines

function PowerLines() {
  const m = materials();
  const POLE_H = 8.5;
  const { poles, arms, wires } = useMemo(() => {
    const poles: Placement[] = [], arms: Placement[] = [];
    for (const [x, , z] of POWER_POLES) {
      poles.push({ position: new Vector3(x, POLE_H / 2, z), scale: new Vector3(1, POLE_H, 1) });
      arms.push({ position: new Vector3(x, POLE_H - 0.5, z), scale: new Vector3(1.6, 0.12, 0.12) });
    }
    // Sagging cables between neighbouring poles, three per span
    const segs: number[] = [];
    for (let i = 0; i < POWER_POLES.length - 1; i++) {
      const a = POWER_POLES[i], b = POWER_POLES[i + 1];
      for (const dx of [-0.7, 0, 0.7]) {
        const at = (t: number) => [a[0] + dx, POLE_H - 0.42 - 0.9 * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
        for (let k = 0; k < 16; k++) segs.push(...at(k / 16), ...at((k + 1) / 16));
      }
    }
    // All cable spans in one draw call
    return { poles, arms, wires: new Float32Array(segs) };
  }, []);
  return (
    <>
      <Instances items={poles} material={m.wood} geometry={<cylinderGeometry args={[0.12, 0.16, 1, 8]} />} />
      <Instances items={arms} material={m.wood} geometry={<boxGeometry args={[1, 1, 1]} />} />
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[wires, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#1a1a1a" />
      </lineSegments>
    </>
  );
}

// ---------------------------------------------------------------- danfo buses

function Danfo({ vehicle }: { vehicle: Vehicle }) {
  const [w, h, l] = DANFO_SIZE;
  const paint = useMemo(() => new MeshStandardMaterial({ color: vehicle.color, roughness: 0.35, metalness: 0.3 }), [vehicle.color]);
  const glass = useMemo(() => new MeshStandardMaterial({ color: '#10161b', roughness: 0.08, metalness: 0.9 }), []);
  const black = useMemo(() => new MeshStandardMaterial({ color: '#141414', roughness: 0.6 }), []);
  const tyre = useMemo(() => new MeshStandardMaterial({ color: '#191919', roughness: 0.9 }), []);
  const bodyH = h - 0.45;
  return (
    <group position={vehicle.position} rotation={[0, vehicle.heading, 0]}>
      {/* body */}
      <mesh position={[0, 0.45 + bodyH / 2, 0]} material={paint} castShadow receiveShadow>
        <boxGeometry args={[w, bodyH, l]} />
      </mesh>
      {/* sloped bonnet */}
      <mesh position={[0, 0.85, l / 2 + 0.2]} material={paint} castShadow>
        <boxGeometry args={[w - 0.05, 0.8, 0.4]} />
      </mesh>
      {/* side window band and windscreen */}
      <mesh position={[0, 0.45 + bodyH * 0.72, -0.15]} material={glass}>
        <boxGeometry args={[w + 0.02, bodyH * 0.36, l - 1.1]} />
      </mesh>
      <mesh position={[0, 0.45 + bodyH * 0.7, l / 2 + 0.005]} material={glass}>
        <boxGeometry args={[w - 0.25, bodyH * 0.4, 0.02]} />
      </mesh>
      {/* the two black stripes that mark Lagos danfos */}
      {[0.38, 0.48].map((f) => (
        <mesh key={f} position={[0, 0.45 + bodyH * f, 0]} material={black}>
          <boxGeometry args={[w + 0.025, 0.07, l + 0.01]} />
        </mesh>
      ))}
      {/* bumpers */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.5, s * (l / 2 + (s > 0 ? 0.42 : 0.05))]} material={black}>
          <boxGeometry args={[w + 0.05, 0.18, 0.12]} />
        </mesh>
      ))}
      {/* wheels */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (w / 2 - 0.05), 0.36, sz * (l / 2 - 0.8)]} rotation={[0, 0, Math.PI / 2]} material={tyre} castShadow>
            <cylinderGeometry args={[0.36, 0.36, 0.26, 16]} />
          </mesh>
        )),
      )}
    </group>
  );
}

// ---------------------------------------------------------------- market stalls

function MarketStalls() {
  const m = materials();
  const goods = useMemo(() => {
    const rand = seeded(43);
    const colors = ['#e4572e', '#f3a712', '#29335c', '#669bbc', '#a8c256', '#d1495b'];
    const out: Placement[] = [];
    for (const [x, , z] of MARKET_STALLS) {
      for (let i = 0; i < 9; i++) {
        out.push({
          position: new Vector3(x + (rand() - 0.5) * 1.0, 0.95 + rand() * 0.08, z + (rand() - 0.5) * 1.4),
          scale: new Vector3(0.18 + rand() * 0.2, 0.12 + rand() * 0.2, 0.18 + rand() * 0.2),
          color: new Color(colors[Math.floor(rand() * colors.length)]),
        });
      }
    }
    return out;
  }, []);
  const goodsMat = useMemo(() => new MeshStandardMaterial({ roughness: 0.7 }), []);
  return (
    <>
      {MARKET_STALLS.map(([x, , z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.85, 0]} material={m.wood} castShadow receiveShadow>
            <boxGeometry args={[1.3, 0.08, 1.7]} />
          </mesh>
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[sx * 0.55, 0.42, sz * 0.75]} material={m.wood}>
              <boxGeometry args={[0.06, 0.84, 0.06]} />
            </mesh>
          )))}
          <mesh position={[0, 1.4, 0]} material={m.darkMetal}>
            <cylinderGeometry args={[0.025, 0.025, 1.9, 6]} />
          </mesh>
          <mesh position={[0, 2.35, 0]} castShadow>
            <coneGeometry args={[1.5, 0.55, 8, 1, true]} />
            <meshStandardMaterial color={['#c0392b', '#1f6f8b', '#e2a400'][i % 3]} roughness={0.8} side={DoubleSide} />
          </mesh>
        </group>
      ))}
      <Instances items={goods} material={goodsMat} geometry={<boxGeometry args={[1, 1, 1]} />} />
    </>
  );
}

// ---------------------------------------------------------------- billboard

/** Roadside billboard carrying the real AYE logo artwork. */
function Billboard() {
  const logo = useTexture(`${import.meta.env.BASE_URL}assets/brand/aye-logo.webp`);
  // eslint-disable-next-line react-hooks/immutability
  logo.colorSpace = SRGBColorSpace;
  return (
    <group position={[-14, 0, -28.6]}>
      {[-1.6, 1.6].map((x) => (
        <mesh key={x} position={[x, 2.6, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 5.2, 8]} />
          <meshStandardMaterial color="#3a3d40" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 6.9, 0.04]} castShadow>
        <boxGeometry args={[4.4, 4.4, 0.12]} />
        <meshStandardMaterial color="#1b1c1e" roughness={0.6} />
      </mesh>
      <mesh position={[0, 6.9, 0.11]}>
        <planeGeometry args={[4.1, 4.1]} />
        <meshStandardMaterial map={logo} emissiveMap={logo} emissive="#ffffff" emissiveIntensity={0.25} roughness={0.5} />
      </mesh>
    </group>
  );
}

export function Props({ night }: { night: number }) {
  return (
    <group>
      <Palms />
      <StreetLamps night={night} />
      <PowerLines />
      {DANFOS.map((v, i) => (
        <Danfo key={i} vehicle={v} />
      ))}
      <MarketStalls />
      <Suspense fallback={null}>
        <Billboard />
      </Suspense>
    </group>
  );
}
