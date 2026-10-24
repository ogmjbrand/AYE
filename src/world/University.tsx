import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import {
  Color, DoubleSide, Euler, MeshStandardMaterial, Vector3, type Group, type Material, type Mesh,
} from 'three';
import type { PlayerHandle } from '../hooks/usePlayerController';
import type { GameTime } from '../lib/gameState';
import {
  BUILDING, CAFE, CAMPUS, CAMPUS_STAFF, CAMPUS_STUDENTS, CENTRE, COURTYARD, CORRIDOR, DESTINATIONS, GATE, GATE_Z, HALL,
  HALL_CLASSMATES, HALL_DESKS, LAB, LIBRARY, LOBBY, ROOMS, SERVICES, STOREY, WALLS, doorWidth, insideBuilding, wallBox,
  type CampusPerson, type WallSeg,
} from '../lib/university';
import { CAFETERIA_MENU, CHECK_IN_EARLY, CLUBS, TIMETABLE } from '../lib/school';
import { marbleTexture } from './venueTextures';
import {
  asphaltTexture, banner, crestBoard, gateSign, lawnTexture, lectureSlide, listBoard, pavingTexture, poster, roomPlate, screenTexture,
} from './campusTextures';
import { Instances, type Placement } from './Instances';
import { PalmGrove } from './Props';
import { PottedPalm } from './PottedPalm';
import { VenueNpc } from './VenueNpc';
import { CarBody } from './CarBody';
import { Downlight } from './VenueShell';
import { UNIFORMS } from '../lib/uniforms';
import { useQuality } from './quality';
import { useMats } from './buildingMats';

/**
 * AYE Global University (lib/university.ts has the plan): the street and
 * drop-off lane, the gate with its sign and security booths, the courtyard
 * with its fountain and gardens, and the academic building, whose rooms you
 * walk into through real doorways. Built from shapes, canvas-painted signs and
 * textures, palms and the game's own character models; no photographs.
 *
 * Walls between the camera and you are cut away so you can always see
 * yourself, and the upper floor and roof lift off while you're inside.
 */

// ---------------------------------------------------------------- materials (shared)



export function B({ p, s, m, r, cast = true }: { p: [number, number, number]; s: [number, number, number]; m: Material; r?: [number, number, number]; cast?: boolean }) {
  return (
    <mesh position={p} rotation={r} material={m} castShadow={cast} receiveShadow>
      <boxGeometry args={s} />
    </mesh>
  );
}

/** A flat picture (sign, screen, poster) facing +z, unless turned. */
export function Pic({ p, w, h, map, ry = 0, glow = 0.35 }: { p: [number, number, number]; w: number; h: number; map: import('three').Texture; ry?: number; glow?: number }) {
  return (
    <mesh position={p} rotation={[0, ry, 0]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={map} emissive="#ffffff" emissiveMap={map} emissiveIntensity={glow} roughness={0.5} />
    </mesh>
  );
}

const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z);

// ---------------------------------------------------------------- chairs (instanced)

export interface ChairSpot { x: number; z: number; facing: number }

/** Office/classroom chairs: a seat, a back and a stem, many at once. */
export function Chairs({ list, material }: { list: readonly ChairSpot[]; material: Material }) {
  const m = useMats();
  const { seats, backs, stems } = useMemo(() => {
    const seats: Placement[] = [], backs: Placement[] = [], stems: Placement[] = [];
    for (const c of list) {
      seats.push({ position: v3(c.x, 0.46, c.z), scale: v3(0.46, 0.06, 0.44), rotationY: c.facing });
      backs.push({ position: v3(c.x - Math.sin(c.facing) * 0.21, 0.75, c.z - Math.cos(c.facing) * 0.21), scale: v3(0.44, 0.5, 0.05), rotationY: c.facing });
      stems.push({ position: v3(c.x, 0.22, c.z), scale: v3(0.05, 0.44, 0.05), rotationY: c.facing });
    }
    return { seats, backs, stems };
  }, [list]);
  const box = <boxGeometry args={[1, 1, 1]} />;
  return (
    <>
      <Instances items={seats} material={material} geometry={box} />
      <Instances items={backs} material={material} geometry={box} />
      <Instances items={stems} material={m.frame} geometry={box} />
    </>
  );
}

// ---------------------------------------------------------------- ground, street and gate

function Ground() {
  const m = useMats();
  const courtW = CAMPUS.x1 - CAMPUS.x0;
  const paving = useMemo(() => pavingTexture([courtW / 4, 33 / 4]), [courtW]);
  const pavement = useMemo(() => pavingTexture([courtW / 2, 2]), [courtW]);
  const road = useMemo(() => asphaltTexture([16, 3]), []);
  const lawn = useMemo(() => lawnTexture([3, 3]), []);
  const floor = useMemo(() => marbleTexture('white', [14, 7]), []);
  return (
    <group>
      {/* Road and the far kerb beyond */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -44]} receiveShadow>
        <planeGeometry args={[courtW + 40, 8]} />
        <meshStandardMaterial map={road} roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, -54]} receiveShadow>
        <planeGeometry args={[courtW + 40, 12]} />
        <meshStandardMaterial map={lawn} roughness={1} />
      </mesh>
      {/* Drop-off lane, separated by a painted island */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, -38.75]} receiveShadow>
        <planeGeometry args={[34, 2.5]} />
        <meshStandardMaterial map={road} color="#cfcfcf" roughness={0.9} />
      </mesh>
      {/* Pavement up to the gate */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, -34.75]} receiveShadow>
        <planeGeometry args={[courtW + 40, 6.5]} />
        <meshStandardMaterial map={pavement} roughness={0.85} />
      </mesh>
      {/* Courtyard paving */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, (GATE_Z + BUILDING.z0) / 2 - 0.5]} receiveShadow>
        <planeGeometry args={[courtW, BUILDING.z0 - GATE_Z + 1]} />
        <meshStandardMaterial map={paving} roughness={0.7} />
      </mesh>
      {/* The building's polished floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, (BUILDING.z0 + BUILDING.z1) / 2]} receiveShadow>
        <planeGeometry args={[BUILDING.x1 - BUILDING.x0, BUILDING.z1 - BUILDING.z0]} />
        <meshStandardMaterial map={floor} roughness={0.18} metalness={0.05} />
      </mesh>
      {/* Lawns either side of the building and behind */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} rotation={[-Math.PI / 2, 0, 0]} position={[sx * 29, 0.002, 16]} receiveShadow>
          <planeGeometry args={[2, 28]} />
          <meshStandardMaterial map={lawn} roughness={1} />
        </mesh>
      ))}
      {/* Kerbs */}
      <B p={[0, 0.08, -40.05]} s={[courtW + 40, 0.16, 0.2]} m={m.stoneDark} />
      <B p={[0, 0.08, -37.45]} s={[34, 0.16, 0.2]} m={m.stoneDark} />
      {[-17.1, 17.1].map((x) => <B key={x} p={[x, 0.08, -38.75]} s={[0.2, 0.16, 2.8]} m={m.stoneDark} />)}
    </group>
  );
}

function RoadMarkings() {
  const white = useMemo(() => new MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.6 }), []);
  const yellow = useMemo(() => new MeshStandardMaterial({ color: '#e6b422', roughness: 0.6 }), []);
  const dashes = useMemo(() => Array.from({ length: 24 }, (_, i) => ({ position: v3(-46 + i * 4, 0.01, -44), scale: v3(2, 1, 0.15), rotation: new Euler(-Math.PI / 2, 0, 0) })), []);
  const zebra = useMemo(() => Array.from({ length: 6 }, (_, i) => ({ position: v3(-13 + i * 0.9, 0.012, -44), scale: v3(0.5, 1, 7.4), rotation: new Euler(-Math.PI / 2, 0, 0) })), []);
  const plane = <planeGeometry args={[1, 1]} />;
  return (
    <>
      <Instances items={dashes} material={white} geometry={plane} castShadow={false} />
      <Instances items={zebra} material={white} geometry={plane} castShadow={false} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, -39.9]}>
        <planeGeometry args={[34, 0.12]} />
        <primitive object={yellow} attach="material" />
      </mesh>
      {/* "DROP-OFF" painted in the lane is left to the sign; a few chevrons point the way */}
      {[-10, -4, 2, 8].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, -Math.PI / 2]} position={[x, 0.012, -38.75]}>
          <circleGeometry args={[0.5, 3]} />
          <primitive object={white} attach="material" />
        </mesh>
      ))}
    </>
  );
}

function StreetLamp({ x, z }: { x: number; z: number }) {
  const m = useMats();
  return (
    <group position={[x, 0, z]}>
      <B p={[0, 2.6, 0]} s={[0.12, 5.2, 0.12]} m={m.frame} />
      <B p={[0, 5.2, 0.4]} s={[0.1, 0.08, 0.9]} m={m.frame} />
      <mesh position={[0, 5.12, 0.8]}>
        <boxGeometry args={[0.36, 0.08, 0.2]} />
        <meshStandardMaterial color="#fff" emissive="#fff3d6" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Street() {
  const m = useMats();
  const sign = useMemo(() => listBoard('AYE Global University', [['Main gate · pedestrians', '→'], ['Drop-off lane', '→']], { w: 768, h: 384 }), []);
  return (
    <group>
      <RoadMarkings />
      {[-26, -14, 14, 26].map((x) => <StreetLamp key={x} x={x} z={-36.8} />)}
      {/* Direction sign before the entrance */}
      <group position={[-15.5, 0, -37]}>
        <B p={[0, 1.6, 0]} s={[0.1, 3.2, 0.1]} m={m.frame} />
        <B p={[0, 3, 0.07]} s={[2.5, 1.26, 0.06]} m={m.frame} />
        <Pic p={[0, 3, 0.105]} w={2.4} h={1.2} map={sign} glow={0.25} />
      </group>
      {/* A taxi waiting in the drop-off lane */}
      <group position={[9, 0, -38.75]} rotation={[0, -Math.PI / 2, 0]}>
        <CarBody model="saloon" color="#e8b923" />
      </group>
      <group position={[-30, 0, -45.5]} rotation={[0, Math.PI / 2, 0]}>
        <CarBody model="suv" color="#2b2f36" />
      </group>
    </group>
  );
}

function Gate() {
  const m = useMats();
  const sign = useMemo(() => gateSign(), []);
  const stripe = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 16;
    const g = c.getContext('2d')!;
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f4f4f4' : '#c0392b'; g.fillRect(i * 32, 0, 32, 16); }
    return c;
  }, []);
  const H = 6;
  const fence: Placement[] = useMemo(() => {
    const out: Placement[] = [];
    for (const [a, b] of [[CAMPUS.x0, GATE.pylons[0] - 0.7], [GATE.pylons[1] + 0.7, CAMPUS.x1]]) {
      for (let x = a; x <= b; x += 0.25) out.push({ position: v3(x, 0.9, GATE_Z), scale: v3(0.035, 1.8, 0.035) });
    }
    return out;
  }, []);
  return (
    <group>
      {/* Pylons in warm stone, the beam carrying the name */}
      {GATE.pylons.map((x) => (
        <group key={x}>
          <B p={[x, H / 2, GATE_Z]} s={[1.4, H, 1.4]} m={m.stone} />
          <B p={[x, H + 0.1, GATE_Z]} s={[1.6, 0.2, 1.6]} m={m.stoneDark} />
          <B p={[x, 0.4, GATE_Z]} s={[1.6, 0.8, 1.6]} m={m.stoneDark} />
        </group>
      ))}
      <B p={[0, H - 0.75, GATE_Z]} s={[GATE.pylons[1] - GATE.pylons[0] + 1.4, 1.5, 1]} m={m.stone} />
      <B p={[0, H + 0.05, GATE_Z]} s={[GATE.pylons[1] - GATE.pylons[0] + 1.8, 0.1, 1.2]} m={m.gold} />
      <Pic p={[0, H - 0.75, GATE_Z - 0.505]} w={13} h={1.3} map={sign} glow={0.2} ry={Math.PI} />
      <Pic p={[0, H - 0.75, GATE_Z + 0.505]} w={13} h={1.3} map={sign} glow={0.2} />
      {/* Uplights on the pylons */}
      {GATE.pylons.map((x) => (
        <mesh key={`u${x}`} position={[x, 0.85, GATE_Z - 0.82]}>
          <boxGeometry args={[0.5, 0.06, 0.06]} />
          <meshStandardMaterial color="#fff" emissive="#ffe0a8" emissiveIntensity={1.5} toneMapped={false} />
        </mesh>
      ))}
      {/* Security booths: glass on three sides, a flat roof */}
      {GATE.booths.map((x) => (
        <group key={x} position={[x, 0, GATE_Z]}>
          <B p={[0, 0.5, 0]} s={[1.8, 1, 2.2]} m={m.stone} />
          <B p={[0, 1.75, 0]} s={[1.7, 1.5, 2.1]} m={m.glass} cast={false} />
          <B p={[0, 2.6, 0]} s={[2.2, 0.2, 2.6]} m={m.frame} />
          <B p={[0, 0.95, -0.5]} s={[1.4, 0.06, 0.5]} m={m.wood} />
        </group>
      ))}
      {/* Barrier across the vehicle lane */}
      <group position={[GATE.vehicleLane - 0.2, 0, GATE_Z - 0.5]}>
        <B p={[0, 0.55, 0]} s={[0.35, 1.1, 0.35]} m={m.gold} />
        <mesh position={[-GATE.vehicleLane + 0.2, 1.0, 0]} castShadow>
          <boxGeometry args={[GATE.vehicleLane * 2 - 0.4, 0.09, 0.09]} />
          <meshStandardMaterial roughness={0.5}>
            <canvasTexture attach="map" args={[stripe]} />
          </meshStandardMaterial>
        </mesh>
      </group>
      {/* Pedestrian gates: open steel frames */}
      {GATE.walkGates.map(([a, b]) => (
        <group key={a}>
          <B p={[a, 1.25, GATE_Z]} s={[0.08, 2.5, 0.08]} m={m.frame} />
          <B p={[b, 1.25, GATE_Z]} s={[0.08, 2.5, 0.08]} m={m.frame} />
          <B p={[(a + b) / 2, 2.5, GATE_Z]} s={[b - a, 0.08, 0.08]} m={m.frame} />
        </group>
      ))}
      <Instances items={fence} material={m.frame} geometry={<boxGeometry args={[1, 1, 1]} />} />
      {[[CAMPUS.x0, GATE.pylons[0] - 0.7], [GATE.pylons[1] + 0.7, CAMPUS.x1]].map(([a, b]) => (
        <group key={a}>
          <B p={[(a + b) / 2, 1.8, GATE_Z]} s={[b - a, 0.06, 0.06]} m={m.frame} />
          <B p={[(a + b) / 2, 0.15, GATE_Z]} s={[b - a, 0.3, 0.3]} m={m.stoneDark} />
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- courtyard

function Fountain() {
  const m = useMats();
  const { x, z, r } = COURTYARD.fountain;
  const jet = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (jet.current) jet.current.scale.y = 1 + Math.sin(clock.elapsedTime * 3) * 0.06;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow material={m.stone}><cylinderGeometry args={[r, r + 0.15, 0.6, 48]} /></mesh>
      <mesh position={[0, 0.56, 0]} material={m.water}><cylinderGeometry args={[r - 0.2, r - 0.2, 0.05, 48]} /></mesh>
      <mesh position={[0, 0.9, 0]} castShadow material={m.stone}><cylinderGeometry args={[0.35, 0.5, 0.8, 24]} /></mesh>
      <mesh position={[0, 1.32, 0]} castShadow material={m.stone}><cylinderGeometry args={[1.2, 0.9, 0.18, 32]} /></mesh>
      <mesh position={[0, 1.42, 0]} material={m.water}><cylinderGeometry args={[1.05, 1.05, 0.03, 32]} /></mesh>
      <mesh ref={jet} position={[0, 2.1, 0]}>
        <cylinderGeometry args={[0.04, 0.16, 1.4, 12, 1, true]} />
        <meshStandardMaterial color="#d8eef8" transparent opacity={0.55} emissive="#9fd4ea" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

/** Raised beds with clipped hedges and flowers. */
function Gardens() {
  const m = useMats();
  const { flowers, shrubs } = useMemo(() => {
    const flowers: Placement[] = [], shrubs: Placement[] = [];
    const palette = ['#e84a5f', '#f6c90e', '#ff8c42', '#f2f2f2', '#c06bd6'].map((c) => new Color(c));
    let k = 0;
    for (const g of COURTYARD.beds) {
      for (let i = 0; i < Math.floor(g.w / 0.5); i++) {
        for (const side of [-1, 1]) {
          flowers.push({ position: v3(g.x - g.w / 2 + 0.3 + i * 0.5, 0.62, g.z + side * (g.d / 2 - 0.3)), scale: v3(0.18, 0.18, 0.18), color: palette[k++ % palette.length] });
        }
      }
      for (let i = 0; i < Math.floor(g.w / 1.4); i++) shrubs.push({ position: v3(g.x - g.w / 2 + 0.9 + i * 1.4, 0.95, g.z), scale: v3(0.75, 0.6, 0.75) });
    }
    return { flowers, shrubs };
  }, []);
  const flowerMat = useMemo(() => new MeshStandardMaterial({ roughness: 0.7 }), []);
  return (
    <>
      {COURTYARD.beds.map((g, i) => (
        <group key={i} position={[g.x, 0, g.z]}>
          <B p={[0, 0.25, 0]} s={[g.w, 0.5, g.d]} m={m.stoneDark} />
          <B p={[0, 0.5, 0]} s={[g.w - 0.2, 0.04, g.d - 0.2]} m={m.soil} cast={false} />
          <B p={[0, 0.72, 0]} s={[g.w - 0.5, 0.42, 0.6]} m={m.hedge} />
        </group>
      ))}
      <Instances items={flowers} material={flowerMat} geometry={<sphereGeometry args={[1, 8, 6]} />} castShadow={false} />
      <Instances items={shrubs} material={m.hedge} geometry={<sphereGeometry args={[1, 10, 8]} />} />
    </>
  );
}

function Bench({ x, z, facing }: { x: number; z: number; facing: number }) {
  const m = useMats();
  return (
    <group position={[x, 0, z]} rotation={[0, facing, 0]}>
      <B p={[0, 0.43, 0]} s={[1.7, 0.06, 0.45]} m={m.woodLight} />
      <B p={[0, 0.72, -0.22]} s={[1.7, 0.4, 0.05]} m={m.woodLight} />
      {[-0.7, 0.7].map((dx) => <B key={dx} p={[dx, 0.21, 0]} s={[0.06, 0.42, 0.42]} m={m.frame} />)}
    </group>
  );
}

function Courtyard() {
  const m = useMats();
  const palms = useMemo(() => COURTYARD.trees.map(([x, z]) => [x, 0, z] as const), []);
  const dir = useMemo(() => listBoard('Campus directory', DESTINATIONS.filter((d) => d.id !== 'gate').map((d) => [d.name] as const), { arrows: true }), []);
  const monument = useMemo(() => crestBoard('AYE', 'Global University', 1024, 384), []);
  const posters = useMemo(() => [poster('Tech Society hackathon', 'Student Centre · Fri', '#2f5fb3'), poster('Spring Fashion Show', 'Join the Fashion Club', '#a33b5f'), poster('Library late nights', 'Open until 21:00', '#1f6b52')], []);
  const arrows = useMemo(() => ['Lecture Halls', 'Library', 'Student Centre', 'Cafeteria', 'Student Services'], []);
  const arrowTex = useMemo(() => arrows.map((a) => listBoard(a, [], { w: 768, h: 128 })), [arrows]);
  return (
    <group>
      <Fountain />
      <Gardens />
      <PalmGrove spots={palms} seed={41} />
      {/* Low monument with the crest in front of the fountain */}
      <group position={[0, 0, -19]}>
        <B p={[0, 0.55, 0]} s={[4.2, 1.1, 0.6]} m={m.navyWall} />
        <Pic p={[0, 0.6, -0.305]} w={4} h={1} map={monument} ry={Math.PI} glow={0.15} />
      </group>
      {COURTYARD.benches.map((b, i) => <Bench key={i} {...b} />)}
      {/* Directory map board */}
      <group position={[COURTYARD.directory.x, 0, COURTYARD.directory.z]}>
        <B p={[0, 1.2, 0]} s={[1.6, 2.4, 0.3]} m={m.frame} />
        <Pic p={[0, 1.35, -0.16]} w={1.4} h={1.86} map={dir} ry={Math.PI} glow={0.3} />
      </group>
      {/* Signpost with arrows to the buildings */}
      <group position={[COURTYARD.signpost.x, 0, COURTYARD.signpost.z]}>
        <B p={[0, 1.6, 0]} s={[0.14, 3.2, 0.14]} m={m.frame} />
        {arrowTex.map((t, i) => (
          <group key={i} position={[0.85, 2.9 - i * 0.36, 0]}>
            <B p={[0, 0, 0]} s={[1.6, 0.3, 0.05]} m={m.navyWall} />
            <Pic p={[0, 0, -0.03]} w={1.56} h={0.26} map={t} ry={Math.PI} glow={0.3} />
          </group>
        ))}
      </group>
      {/* Noticeboard with event posters */}
      <group position={[COURTYARD.noticeboard.x, 0, COURTYARD.noticeboard.z]} rotation={[0, Math.PI / 2, 0]}>
        <B p={[0, 1.3, 0]} s={[2, 1.4, 0.12]} m={m.wood} />
        {[-1, 1].map((dx) => <B key={dx} p={[dx * 0.9, 0.6, 0]} s={[0.08, 1.2, 0.08]} m={m.frame} />)}
        {posters.map((t, i) => <Pic key={i} p={[-0.6 + i * 0.6, 1.3, 0.065]} w={0.5} h={0.7} map={t} glow={0.15} />)}
      </group>
      {/* Bicycle rack */}
      <group position={[COURTYARD.bikes.x, 0, COURTYARD.bikes.z]}>
        {[-1.2, -0.4, 0.4, 1.2].map((dx) => (
          <mesh key={dx} position={[dx, 0.45, 0]} rotation={[0, Math.PI / 2, 0]} material={m.frame}>
            <torusGeometry args={[0.4, 0.025, 6, 16, Math.PI]} />
          </mesh>
        ))}
      </group>
      {/* Outdoor tables under umbrellas */}
      {COURTYARD.umbrellas.map((u, i) => (
        <group key={i} position={[u.x, 0, u.z]}>
          <B p={[0, 0.37, 0]} s={[0.06, 0.74, 0.06]} m={m.frame} />
          <mesh position={[0, 0.74, 0]} material={m.white} castShadow><cylinderGeometry args={[0.55, 0.55, 0.04, 20]} /></mesh>
          <B p={[0, 1.4, 0]} s={[0.05, 1.4, 0.05]} m={m.frame} />
          <mesh position={[0, 2.3, 0]} castShadow><coneGeometry args={[1.6, 0.6, 8, 1, true]} /><meshStandardMaterial color="#1b2a55" side={DoubleSide} roughness={0.8} /></mesh>
        </group>
      ))}
      <Chairs list={COURTYARD.umbrellas.flatMap((u) => [0, 1, 2, 3].map((k) => ({ x: u.x + Math.sin(k * Math.PI / 2) * 0.9, z: u.z + Math.cos(k * Math.PI / 2) * 0.9, facing: k * Math.PI / 2 + Math.PI })))} material={m.white} />
      {/* Lamp posts along the main walk */}
      {[-24, -16, -8].map((z) => [-3.2, 3.2].map((x) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <B p={[0, 1.8, 0]} s={[0.1, 3.6, 0.1]} m={m.frame} />
          <mesh position={[0, 3.7, 0]}><sphereGeometry args={[0.2, 16, 12]} /><meshStandardMaterial color="#fff" emissive="#ffeccc" emissiveIntensity={0.8} /></mesh>
        </group>
      )))}
    </group>
  );
}

// ---------------------------------------------------------------- the building

/** Whether the segment from a to b (on the ground plan) passes through a box. */
function segmentHitsBox(ax: number, az: number, bx: number, bz: number, cx: number, cz: number, hx: number, hz: number) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dz = bz - az;
  for (const [p, d, lo, hi] of [[ax, dx, cx - hx, cx + hx], [az, dz, cz - hz, cz + hz]] as const) {
    if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return false; continue; }
    let a = (lo - p) / d, b = (hi - p) / d;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return false;
  }
  return true;
}

/** Interior and outer walls; any wall standing between the camera and you is hidden. */
export function Walls({ player, walls = WALLS, midZ = (BUILDING.z0 + BUILDING.z1) / 2, height = STOREY }: {
  player: PlayerHandle;
  walls?: readonly WallSeg[];
  /** The building's middle, to tell an outer wall's outside face (stone) from its inside (plaster). */
  midZ?: number;
  height?: number;
}) {
  const m = useMats();
  const refs = useRef<(Mesh | null)[]>([]);
  const boxes = useMemo(() => walls.map((w) => ({ w, ...wallBox(w) })), [walls]);
  useFrame(({ camera }) => {
    const px = player.position.x, pz = player.position.z;
    boxes.forEach((b, i) => {
      const mesh = refs.current[i];
      if (!mesh) return;
      // Ignore the last half metre next to you, so the wall you're standing beside stays
      const len = Math.hypot(camera.position.x - px, camera.position.z - pz) || 1;
      const ex = px + ((camera.position.x - px) / len) * 0.45, ez = pz + ((camera.position.z - pz) / len) * 0.45;
      mesh.visible = !segmentHitsBox(ex, ez, camera.position.x, camera.position.z, b.x, b.z, b.sx / 2 + 0.05, b.sz / 2 + 0.05);
    });
  });
  const materialFor = (w: WallSeg) => {
    if (w.glass) return m.glass;
    if (!w.outer) return m.plaster;
    // Stone outside, plaster inside: box faces are +x, −x, +y, −y, +z, −z
    const alongX = w.z0 === w.z1;
    const outsideIsPositive = alongX ? w.z0 > midZ : w.x0 > 0;
    const faces = [m.plaster, m.plaster, m.stone, m.stone, m.plaster, m.plaster];
    faces[alongX ? (outsideIsPositive ? 4 : 5) : outsideIsPositive ? 0 : 1] = m.stone;
    return faces;
  };
  return (
    <>
      {boxes.map((b, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }} position={[b.x, height / 2, b.z]} material={materialFor(b.w)} castShadow={!b.w.glass} receiveShadow>
          <boxGeometry args={[b.sx, height, b.sz]} />
        </mesh>
      ))}
    </>
  );
}

/** Door frames (dark metal) round every doorway, and the plates over them. */
function Doorways() {
  const m = useMats();
  return (
    <>
      {(Object.entries(ROOMS) as [keyof typeof ROOMS, (typeof ROOMS)[keyof typeof ROOMS]][]).map(([id, r]) => {
        const w = doorWidth(id);
        const front = id === 'lobby';
        const name = DESTINATIONS.find((d) => d.id === id || (id === 'cafeteria' && d.id === 'cafeteria'))?.name.replace(/ \(G\d+\)/, '') ?? '';
        // Plate on the corridor side (south rooms: −z face is inside; it hangs at z−0.2 on the corridor side for north rooms)
        const corridorSide = r.door[1] === CORRIDOR.z0 ? 0.2 : -0.2;
        return (
          <group key={id}>
            {[-1, 1].map((s) => <B key={s} p={[r.door[0] + s * (w / 2 + 0.05), 1.3, r.door[1]]} s={[0.1, 2.6, WALL_T_PLUS]} m={m.frame} />)}
            <B p={[r.door[0], 2.65, r.door[1]]} s={[w + 0.2, 0.1, WALL_T_PLUS]} m={m.frame} />
            {!front && (
              <Pic p={[r.door[0], 3.1, r.door[1] + corridorSide]} w={1.9} h={0.4} map={roomPlate(r.code, name)} ry={corridorSide > 0 ? 0 : Math.PI} glow={0.4} />
            )}
          </group>
        );
      })}
    </>
  );
}
const WALL_T_PLUS = 0.36;

function DoorLeaf({ side }: { side: number }) {
  const m = useMats();
  return (
    <>
      <B p={[0, 1.3, 0]} s={[1.95, 2.55, 0.04]} m={m.glass} cast={false} />
      <B p={[0, 1.3, 0]} s={[2, 0.06, 0.06]} m={m.gold} />
      <B p={[-side * 0.85, 1.2, -0.05]} s={[0.04, 0.9, 0.04]} m={m.gold} />
    </>
  );
}

/** The glass entrance doors: they slide apart as you come near. */
function EntranceDoors({ player }: { player: PlayerHandle }) {
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const open = useRef(0);
  useFrame((_, dt) => {
    const near = Math.hypot(player.position.x - ROOMS.lobby.door[0], player.position.z - ROOMS.lobby.door[1]) < 4;
    open.current += ((near ? 1 : 0) - open.current) * Math.min(1, dt * 4);
    const o = open.current * 1.0;
    if (left.current) left.current.position.x = -1 - o;
    if (right.current) right.current.position.x = 1 + o;
  });
  return (
    <group position={[0, 0, BUILDING.z0]}>
      <group ref={left} position={[-1, 0, -0.05]}><DoorLeaf side={-1} /></group>
      <group ref={right} position={[1, 0, -0.05]}><DoorLeaf side={1} /></group>
    </group>
  );
}

/** Upper floor, cornice, roof, canopy, signs and banners: the building as seen from outside. Lifted off while you're in. */
function Exterior({ player }: { player: PlayerHandle }) {
  const m = useMats();
  const top = useRef<Group>(null);
  useFrame(() => {
    if (top.current) top.current.visible = !insideBuilding(player.position.x, player.position.z);
  });
  const W = BUILDING.x1 - BUILDING.x0;
  const D = BUILDING.z1 - BUILDING.z0;
  const H = BUILDING.height;
  const cz = (BUILDING.z0 + BUILDING.z1) / 2;
  const up = H - STOREY;
  const sign = useMemo(() => crestBoard('ACADEMIC BUILDING', 'AYE Global University', 1536, 320), []);
  const crest = useMemo(() => crestBoard('AYE', 'Global University', 1024, 384), []);
  const banners = useMemo(() => [banner(['LEARN', 'GROW', 'CREATE']), banner(['GLOBAL', 'MINDS', 'BRIGHTER', 'FUTURES']), banner(['YOUR', 'IDEAS', 'CHANGE', 'THE', 'WORLD']), banner(['STUDENT', 'TODAY', 'LEADER', 'TOMORROW'])], []);
  const { piers, panes, mullions } = useMemo(() => {
    const piers: Placement[] = [], panes: Placement[] = [], mullions: Placement[] = [];
    for (let x = BUILDING.x0; x <= BUILDING.x1 + 0.01; x += 4) {
      piers.push({ position: v3(x, H / 2, BUILDING.z0 - 0.3), scale: v3(0.6, H, 0.45) });
    }
    // Upper storey glass on all four sides, ground floor glass on the front outside the lobby
    for (let x = BUILDING.x0 + 2; x < BUILDING.x1; x += 4) {
      panes.push({ position: v3(x, STOREY + up / 2, BUILDING.z0 - 0.17), scale: v3(3.3, up - 1, 0.06) });
      panes.push({ position: v3(x, STOREY + up / 2, BUILDING.z1 + 0.17), scale: v3(3.3, up - 1, 0.06) });
      if (Math.abs(x) > 9) panes.push({ position: v3(x, STOREY / 2 + 0.2, BUILDING.z0 - 0.17), scale: v3(3.3, STOREY - 1.2, 0.06) });
      mullions.push({ position: v3(x, STOREY + up / 2, BUILDING.z0 - 0.21), scale: v3(0.05, up - 1, 0.05) });
    }
    for (let z = BUILDING.z0 + 2; z < BUILDING.z1; z += 4) {
      for (const sx of [-1, 1]) panes.push({ position: v3(sx * (W / 2 + 0.17), STOREY + up / 2, z), scale: v3(0.06, up - 1, 3.3) });
    }
    return { piers, panes, mullions };
  }, [H, W, up]);
  const box = <boxGeometry args={[1, 1, 1]} />;
  return (
    <group>
      <group ref={top}>
        {/* Upper storey walls (stone), cornice and roof */}
        <B p={[0, STOREY + up / 2, BUILDING.z0]} s={[W + 0.3, up, 0.3]} m={m.stone} />
        <B p={[0, STOREY + up / 2, BUILDING.z1]} s={[W + 0.3, up, 0.3]} m={m.stone} />
        {[-1, 1].map((sx) => <B key={sx} p={[sx * W / 2, STOREY + up / 2, cz]} s={[0.3, up, D]} m={m.stone} />)}
        <B p={[0, H + 0.15, cz]} s={[W + 1, 0.3, D + 1]} m={m.stoneDark} />
        <B p={[0, H + 0.35, cz]} s={[W - 2, 0.2, D - 2]} m={m.frame} />
        <Instances items={panes} material={m.facadeGlass} geometry={box} castShadow={false} />
        <Instances items={mullions} material={m.frame} geometry={box} castShadow={false} />
        {/* Crest high on the façade */}
        <B p={[0, H - 1.2, BUILDING.z0 - 0.3]} s={[6.2, 2.4, 0.2]} m={m.navyWall} />
        <Pic p={[0, H - 1.2, BUILDING.z0 - 0.41]} w={6} h={2.25} map={crest} ry={Math.PI} glow={0.2} />
      </group>
      <Instances items={piers} material={m.stone} geometry={box} />
      {/* Banners on the piers */}
      {banners.map((t, i) => {
        const x = [-14, -10, 10, 14][i];
        return <Pic key={i} p={[x + 2, 5.6, BUILDING.z0 - 0.55]} w={1.2} h={3.6} map={t} ry={Math.PI} glow={0.15} />;
      })}
      {/* Entrance canopy on two columns, with the building's name */}
      <B p={[0, 3.6, BUILDING.z0 - 2]} s={[9, 0.3, 4]} m={m.stoneDark} />
      <B p={[0, 3.42, BUILDING.z0 - 2]} s={[8.6, 0.05, 3.6]} m={m.lightPanel} cast={false} />
      {[-4, 4].map((x) => <B key={x} p={[x, 1.8, BUILDING.z0 - 3.7]} s={[0.35, 3.6, 0.35]} m={m.stone} />)}
      <B p={[0, 4.15, BUILDING.z0 - 3.98]} s={[7.2, 0.8, 0.1]} m={m.navyWall} />
      <Pic p={[0, 4.15, BUILDING.z0 - 4.04]} w={7} h={0.75} map={sign} ry={Math.PI} glow={0.3} />
      {/* Steps and a ramp up to the doors (visual: the floor is level) */}
      <B p={[0, 0.04, BUILDING.z0 - 1.5]} s={[8, 0.08, 3]} m={m.stone} cast={false} />
      <B p={[-6, 0.03, BUILDING.z0 - 1]} s={[4, 0.06, 2]} m={m.stoneDark} cast={false} />
      {/* Planters along the front */}
      {[-20, -12, 12, 20].map((x) => (
        <group key={x} position={[x, 0, BUILDING.z0 - 1.6]}>
          <B p={[0, 0.35, 0]} s={[3, 0.7, 1]} m={m.stoneDark} />
          <B p={[0, 0.9, 0]} s={[2.8, 0.4, 0.8]} m={m.hedge} />
        </group>
      ))}
    </group>
  );
}

/** Ceiling (seen from below only) with panel lights, over the whole ground floor. */
function CeilingAndLights() {
  const m = useMats();
  const panels = useMemo(() => {
    const out: Placement[] = [];
    for (let x = BUILDING.x0 + 3; x < BUILDING.x1; x += 5) for (let z = BUILDING.z0 + 2.5; z < BUILDING.z1; z += 4.5) out.push({ position: v3(x, STOREY - 0.02, z), scale: v3(1.2, 0.03, 0.6) });
    return out;
  }, []);
  return (
    <>
      <mesh position={[0, STOREY, (BUILDING.z0 + BUILDING.z1) / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BUILDING.x1 - BUILDING.x0, BUILDING.z1 - BUILDING.z0]} />
        <meshStandardMaterial color="#f6f4ef" roughness={0.9} />
      </mesh>
      <Instances items={panels} material={m.lightPanel} geometry={<boxGeometry args={[1, 1, 1]} />} castShadow={false} />
    </>
  );
}

// ---------------------------------------------------------------- rooms

function Lobby() {
  const m = useMats();
  const brand = useMemo(() => crestBoard('AYE', 'Global University', 1024, 384), []);
  const directory = useMemo(() => listBoard('Directory', DESTINATIONS.filter((d) => d.room !== 'lobby' && d.room !== 'outside').map((d) => [d.name] as const), { arrows: true }), []);
  const timetable = useMemo(() => listBoard('Today’s classes', TIMETABLE.map((c) => [`${String(Math.floor(c.start / 60)).padStart(2, '0')}:${String(c.start % 60).padStart(2, '0')} ${c.course}`, c.room === 'lab' ? 'G05' : 'G01'] as const), { w: 1024, h: 512 }), []);
  const d = LOBBY.desk;
  return (
    <group>
      {/* Reception desk: wood front, white top, a gold reveal */}
      <B p={[d.x, 0.55, d.z]} s={[d.w, 1.1, d.d]} m={m.woodLight} />
      <B p={[d.x, 1.12, d.z]} s={[d.w + 0.1, 0.05, d.d + 0.1]} m={m.white} />
      <B p={[d.x, 0.12, d.z - d.d / 2 - 0.01]} s={[d.w, 0.04, 0.02]} m={m.lightPanel} cast={false} />
      <B p={[d.x - 0.6, 1.3, d.z + 0.1]} s={[0.5, 0.32, 0.03]} m={m.black} />
      {/* Branding wall behind reception (on the lobby side of the corridor's east wall) */}
      <B p={[5.5, 2.4, 11.3]} s={[5, 2.6, 0.15]} m={m.navyWall} />
      <Pic p={[5.5, 2.4, 11.22]} w={4.6} h={1.72} map={brand} ry={Math.PI} glow={0.35} />
      {/* Directory screen */}
      <group position={[LOBBY.directory.x, 0, LOBBY.directory.z]}>
        <B p={[0, 1.1, 0]} s={[0.25, 2.2, 1.3]} m={m.frame} />
        <Pic p={[0.14, 1.3, 0]} w={1.15} h={1.55} map={directory} ry={Math.PI / 2} glow={0.6} />
      </group>
      {/* Timetable screen on the west wall */}
      <Pic p={[ROOMS.lobby.x0 + 0.17, 2.4, 9]} w={2.4} h={1.2} map={timetable} ry={Math.PI / 2} glow={0.6} />
      {/* Seating and plants */}
      {LOBBY.seating.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]}>
          <RoundedBox args={[2.2, 0.45, 0.9]} radius={0.08} position={[0, 0.25, 0]} castShadow material={m.sofaBlue} />
          <RoundedBox args={[2.2, 0.5, 0.2]} radius={0.08} position={[0, 0.65, 0.35]} castShadow material={m.sofaBlue} />
        </group>
      ))}
      <PottedPalm position={[-7.6, 0, 2.8]} height={2.4} />
      <PottedPalm position={[7.6, 0, 2.8]} height={2.4} rotation={1} />
      <PottedPalm position={[-7.6, 0, 11.3]} height={2} rotation={2} />
    </group>
  );
}

function LectureHall({ classOn }: { classOn: (typeof TIMETABLE)[number] | null }) {
  const m = useMats();
  const r = ROOMS['hall-a'];
  const slide = useMemo(() => lectureSlide(classOn?.course ?? 'Global Business and Innovation', classOn?.lecturer ?? 'Dr. Funmi Adebayo'), [classOn]);
  const chairs = useMemo(() => HALL.rows.flatMap((x) => HALL.seatZ.map((z) => ({ x: x + 0.65, z, facing: -Math.PI / 2 }))), []);
  return (
    <group>
      {/* Screen and whiteboards on the west wall */}
      <B p={[r.x0 + 0.2, 2.4, HALL.screen.z]} s={[0.08, 2.3, 4.1]} m={m.black} />
      <Pic p={[r.x0 + 0.25, 2.4, HALL.screen.z]} w={4} h={2.25} map={slide} ry={Math.PI / 2} glow={classOn ? 0.9 : 0.25} />
      {[-1, 1].map((s) => <B key={s} p={[r.x0 + 0.18, 1.9, HALL.screen.z + s * 3.6]} s={[0.05, 1.2, 2.2]} m={m.white} />)}
      {/* Lectern */}
      <B p={[HALL.lectern.x, 0.55, HALL.lectern.z]} s={[0.7, 1.1, 1.4]} m={m.wood} />
      <B p={[HALL.lectern.x + 0.1, 1.13, HALL.lectern.z]} s={[0.6, 0.04, 1.3]} m={m.white} />
      <B p={[HALL.lectern.x, 1.25, HALL.lectern.z + 0.3]} s={[0.3, 0.2, 0.4]} m={m.black} />
      {/* Rows of desks */}
      {HALL_DESKS.map((d, i) => (
        <group key={i}>
          <B p={[d.x, 0.74, d.z]} s={[0.55, 0.04, d.len]} m={m.woodLight} />
          <B p={[d.x - 0.22, 0.37, d.z]} s={[0.04, 0.74, d.len]} m={m.frame} />
        </group>
      ))}
      <Chairs list={chairs} material={m.seat} />
      {/* Exit sign and clock */}
      <mesh position={[r.x1 - 0.17, 3, 3]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.6, 0.22]} />
        <meshStandardMaterial color="#1a8f4a" emissive="#1fbf5f" emissiveIntensity={1} toneMapped={false} />
      </mesh>
      <mesh position={[r.x1 - 0.17, 3.1, 7]} rotation={[0, -Math.PI / 2, 0]}><circleGeometry args={[0.25, 24]} /><meshStandardMaterial color="#fafafa" /></mesh>
    </group>
  );
}

function ComputerLab() {
  const m = useMats();
  const r = ROOMS.lab;
  const sign = useMemo(() => crestBoard('COMPUTER LAB', 'AYE Global University', 1536, 320), []);
  const { monitors, screens, keyboards, towers } = useMemo(() => {
    const monitors: Placement[] = [], screens: Placement[] = [], keyboards: Placement[] = [], towers: Placement[] = [];
    for (const d of LAB.desks) for (const dx of [-3, -1, 1, 3]) {
      monitors.push({ position: v3(d.x + dx, 1.05, d.z + 0.15), scale: v3(0.6, 0.38, 0.04) });
      screens.push({ position: v3(d.x + dx, 1.05, d.z + 0.125), scale: v3(0.56, 0.34, 1), rotation: new Euler(0, Math.PI, 0) });
      keyboards.push({ position: v3(d.x + dx, 0.775, d.z - 0.12), scale: v3(0.45, 0.02, 0.15) });
      towers.push({ position: v3(d.x + dx + 0.45, 0.95, d.z + 0.15), scale: v3(0.06, 0.08, 0.08) });
    }
    return { monitors, screens, keyboards, towers };
  }, []);
  const screenMat = useMemo(() => new MeshStandardMaterial({ map: screenTexture(1), emissive: '#ffffff', emissiveMap: screenTexture(1), emissiveIntensity: 0.8, toneMapped: false }), []);
  const box = <boxGeometry args={[1, 1, 1]} />;
  const chairs = useMemo(() => LAB.desks.flatMap((d) => [-3, -1, 1, 3].map((dx) => ({ x: d.x + dx, z: d.z - 0.75, facing: 0 }))), []);
  return (
    <group>
      <B p={[LAB.screen.x, 2.6, r.z1 - 0.2]} s={[5.2, 1.1, 0.1]} m={m.navyWall} />
      <Pic p={[LAB.screen.x, 2.6, r.z1 - 0.26]} w={5} h={1.04} map={sign} ry={Math.PI} glow={0.4} />
      {LAB.desks.map((d, i) => (
        <group key={i}>
          <B p={[d.x, 0.74, d.z]} s={[d.len, 0.04, 0.7]} m={m.white} />
          {[-1, 1].map((s) => <B key={s} p={[d.x + s * (d.len / 2 - 0.05), 0.37, d.z]} s={[0.06, 0.74, 0.6]} m={m.frame} />)}
        </group>
      ))}
      <Instances items={monitors} material={m.black} geometry={box} />
      <Instances items={screens} material={screenMat} geometry={<planeGeometry args={[1, 1]} />} castShadow={false} />
      <Instances items={keyboards} material={m.seatGrey} geometry={box} />
      <Instances items={towers} material={m.black} geometry={box} castShadow={false} />
      <Chairs list={chairs} material={m.black} />
      {/* Network cabinet */}
      <B p={[r.x1 - 0.5, 1, r.z1 - 0.5]} s={[0.7, 2, 0.7]} m={m.black} />
      {[0.5, 0.9, 1.3, 1.7].map((y) => <B key={y} p={[r.x1 - 0.5, y, r.z1 - 0.86]} s={[0.5, 0.04, 0.02]} m={m.lightPanel} cast={false} />)}
    </group>
  );
}

function Library() {
  const m = useMats();
  const quote = useMemo(() => banner(['SILENCE', 'BUILDS', 'BRIGHTER', 'FUTURES']), []);
  const { books } = useMemo(() => {
    const books: Placement[] = [];
    const palette = ['#7a2f2f', '#1f4a6b', '#2f6b4a', '#c9a052', '#5a3b6b', '#e6dccb', '#2b2b2b', '#b4543a'].map((c) => new Color(c));
    let k = 0;
    for (const s of LIBRARY.shelves) {
      for (const y of [0.35, 0.85, 1.35, 1.85]) {
        const n = Math.floor(s.len / 0.07);
        for (let i = 0; i < n; i++) {
          if ((i * 7 + k) % 23 === 0) continue;
          const h = 0.24 + ((i * 13 + k) % 7) * 0.012;
          const along = -s.len / 2 + 0.05 + i * 0.07;
          books.push({
            position: s.along === 'z' ? v3(s.x, y + h / 2, s.z + along) : v3(s.x + along, y + h / 2, s.z),
            scale: s.along === 'z' ? v3(0.22, h, 0.055) : v3(0.055, h, 0.22),
            color: palette[(i * 5 + k) % palette.length],
          });
        }
        k++;
      }
    }
    return { books };
  }, []);
  const bookMat = useMemo(() => new MeshStandardMaterial({ roughness: 0.75 }), []);
  const chairs = useMemo(() => LIBRARY.tables.flatMap((t) => [{ x: t.x, z: t.z - 0.85, facing: 0 }, { x: t.x, z: t.z + 0.85, facing: Math.PI }]), []);
  return (
    <group>
      {LIBRARY.shelves.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[0, s.along === 'z' ? Math.PI / 2 : 0, 0]}>
          <B p={[0, 1.1, 0]} s={[s.len, 2.2, 0.08]} m={m.wood} />
          {[0.33, 0.83, 1.33, 1.83, 2.18].map((y) => <B key={y} p={[0, y, 0]} s={[s.len, 0.03, 0.4]} m={m.wood} />)}
          {[-1, 1].map((e) => <B key={e} p={[e * s.len / 2, 1.1, 0]} s={[0.04, 2.2, 0.42]} m={m.wood} />)}
        </group>
      ))}
      <Instances items={books} material={bookMat} geometry={<boxGeometry args={[1, 1, 1]} />} castShadow={false} />
      {LIBRARY.tables.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <B p={[0, 0.74, 0]} s={[1.6, 0.05, 0.9]} m={m.woodLight} />
          {[-0.7, 0.7].map((dx) => <B key={dx} p={[dx, 0.37, 0]} s={[0.06, 0.74, 0.8]} m={m.frame} />)}
          <mesh position={[0.4, 0.95, 0]}><cylinderGeometry args={[0.08, 0.1, 0.12, 16]} /><meshStandardMaterial color="#1f5a47" emissive="#ffe8b0" emissiveIntensity={0.4} /></mesh>
          <B p={[-0.3, 0.78, 0.1]} s={[0.25, 0.03, 0.32]} m={m.white} />
        </group>
      ))}
      <Chairs list={chairs} material={m.wood} />
      {/* Help desk */}
      <B p={[LIBRARY.desk.x, 0.55, LIBRARY.desk.z]} s={[LIBRARY.desk.w, 1.1, LIBRARY.desk.d]} m={m.woodLight} />
      <B p={[LIBRARY.desk.x + 0.5, 1.3, LIBRARY.desk.z + 0.1]} s={[0.5, 0.32, 0.03]} m={m.black} />
      {/* Library computers along the west wall */}
      <group position={[LIBRARY.computers.x, 0, LIBRARY.computers.z]}>
        <B p={[0, 0.74, 0]} s={[0.6, 0.04, 2.2]} m={m.white} />
        {[-0.6, 0.6].map((dz) => (
          <group key={dz}>
            <B p={[-0.1, 1.05, dz]} s={[0.04, 0.38, 0.6]} m={m.black} />
            <Pic p={[-0.075, 1.05, dz]} w={0.56} h={0.34} map={screenTexture(2)} ry={Math.PI / 2} glow={0.8} />
          </group>
        ))}
      </group>
      <Pic p={[-13.05, 2.4, 23]} w={1.2} h={3.6} map={quote} ry={-Math.PI / 2} glow={0.2} />
      <PottedPalm position={[-13.6, 0, 29]} height={2} />
    </group>
  );
}

function Cafeteria() {
  const m = useMats();
  const c = CAFE.counter;
  const menu = useMemo(() => listBoard('AYE Cafeteria', CAFETERIA_MENU.map((i) => [i.name, `${i.price} GHAI`] as const), { w: 1024, h: 640 }), []);
  const chairs = useMemo(() => CAFE.tables.flatMap((t) => [0, 1, 2, 3].map((k) => ({ x: t.x + Math.sin(k * Math.PI / 2) * 0.75, z: t.z + Math.cos(k * Math.PI / 2) * 0.75, facing: k * Math.PI / 2 + Math.PI }))), []);
  const food = useMemo(() => {
    const out: Placement[] = [];
    const cols = ['#d9822b', '#8a3b1f', '#e8c14a', '#3f7a2a', '#c94a3a'].map((x) => new Color(x));
    for (let i = 0; i < 10; i++) out.push({ position: v3(c.x - c.w / 2 + 0.6 + i * 0.95, 1.06, c.z - 0.15), scale: v3(0.32, 0.06, 0.24), color: cols[i % cols.length] });
    return out;
  }, [c]);
  const foodMat = useMemo(() => new MeshStandardMaterial({ roughness: 0.6 }), []);
  return (
    <group>
      {/* Serving counter with a glass sneeze guard and trays of food */}
      <B p={[c.x, 0.5, c.z]} s={[c.w, 1, c.d]} m={m.stoneDark} />
      <B p={[c.x, 1.02, c.z]} s={[c.w + 0.1, 0.04, c.d + 0.1]} m={m.white} />
      <B p={[c.x, 1.3, c.z - 0.35]} s={[c.w, 0.5, 0.02]} m={m.glass} cast={false} />
      <Instances items={food} material={foodMat} geometry={<boxGeometry args={[1, 1, 1]} />} castShadow={false} />
      {/* Menu board above the counter, on the back wall */}
      <B p={[c.x, 2.85, CORRIDOR.z0 - 0.2]} s={[4.2, 2.1, 0.08]} m={m.black} />
      <Pic p={[c.x, 2.85, CORRIDOR.z0 - 0.25]} w={4} h={2.5 * 0.8} map={menu} ry={Math.PI} glow={0.6} />
      {/* Drinks fridge and bins */}
      <B p={[26.8, 1, 10.9]} s={[1.2, 2, 0.8]} m={m.black} />
      <B p={[26.8, 1, 10.48]} s={[1.05, 1.8, 0.02]} m={m.glass} cast={false} />
      {[0.5, 1, 1.5].map((y) => <B key={y} p={[26.8, y, 10.7]} s={[1.0, 0.03, 0.5]} m={m.lightPanel} cast={false} />)}
      {[9.4, 10.1].map((x, i) => <B key={x} p={[x, 0.45, 2.6]} s={[0.55, 0.9, 0.55]} m={i ? m.seat : m.hedge} />)}
      {CAFE.tables.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <mesh position={[0, 0.74, 0]} material={m.white} castShadow><cylinderGeometry args={[0.5, 0.5, 0.04, 24]} /></mesh>
          <B p={[0, 0.37, 0]} s={[0.07, 0.74, 0.07]} m={m.frame} />
        </group>
      ))}
      <Chairs list={chairs} material={m.red} />
    </group>
  );
}

function StudentCentre() {
  const m = useMats();
  const r = ROOMS.centre;
  const events = useMemo(() => listBoard('Campus clubs', CLUBS.map((c) => [c.name] as const), { w: 768, h: 768 }), []);
  const sign = useMemo(() => crestBoard('STUDENT CENTRE', 'Meet · Join · Belong', 1536, 320), []);
  return (
    <group>
      <B p={[CENTRE.board.x + 0.05, 2, CENTRE.board.z]} s={[0.1, 2.2, 2.2]} m={m.navyWall} />
      <Pic p={[CENTRE.board.x - 0.01, 2, CENTRE.board.z]} w={2} h={2} map={events} ry={-Math.PI / 2} glow={0.5} />
      <B p={[(r.x0 + r.x1) / 2, 3.2, r.z1 - 0.2]} s={[6.2, 1.3, 0.1]} m={m.navyWall} />
      <Pic p={[(r.x0 + r.x1) / 2, 3.2, r.z1 - 0.26]} w={6} h={1.25} map={sign} ry={Math.PI} glow={0.35} />
      {CENTRE.sofas.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[0, s.facing, 0]}>
          <RoundedBox args={[2.2, 0.42, 0.9]} radius={0.1} position={[0, 0.22, 0]} castShadow material={i === 2 ? m.sofaBlue : m.sofa} />
          <RoundedBox args={[2.2, 0.5, 0.22]} radius={0.1} position={[0, 0.6, -0.36]} castShadow material={i === 2 ? m.sofaBlue : m.sofa} />
        </group>
      ))}
      <mesh position={[18.5, 0.01, 24.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5, 3.4]} />
        <meshStandardMaterial color="#2f3a5a" roughness={1} />
      </mesh>
      {/* Games table */}
      <B p={[CENTRE.table.x, 0.76, CENTRE.table.z]} s={[1.6, 0.06, 0.9]} m={m.hedge} />
      {[-0.6, 0.6].map((dx) => <B key={dx} p={[CENTRE.table.x + dx, 0.38, CENTRE.table.z]} s={[0.1, 0.76, 0.8]} m={m.frame} />)}
      <B p={[CENTRE.table.x, 0.87, CENTRE.table.z]} s={[0.02, 0.15, 0.9]} m={m.white} />
      <PottedPalm position={[r.x1 - 0.7, 0, r.z1 - 0.7]} height={2.3} />
      <PottedPalm position={[r.x0 + 0.7, 0, r.z1 - 0.7]} height={2} rotation={1.4} />
    </group>
  );
}

function Services() {
  const m = useMats();
  const c = SERVICES.counter;
  const sign = useMemo(() => crestBoard('STUDENT SERVICES', 'Timetables · Records · Support', 1536, 320), []);
  const chairs = useMemo(() => [4.4, 5.3, 6.2, 9.4, 10.3, 11.2].map((x) => ({ x, z: 17.4, facing: 0 })), []);
  return (
    <group>
      <B p={[c.x, 0.55, c.z]} s={[c.w, 1.1, c.d]} m={m.woodLight} />
      <B p={[c.x, 1.12, c.z]} s={[c.w + 0.1, 0.05, c.d + 0.1]} m={m.white} />
      {[-1.8, 0, 1.8].map((dx) => <B key={dx} p={[c.x + dx, 1.3, c.z + 0.15]} s={[0.5, 0.32, 0.03]} m={m.black} />)}
      <B p={[c.x, 3, ROOMS.services.z1 - 0.2]} s={[6.2, 1.1, 0.1]} m={m.navyWall} />
      <Pic p={[c.x, 3, ROOMS.services.z1 - 0.26]} w={6} h={1.25} map={sign} ry={Math.PI} glow={0.35} />
      {/* Office desks behind the counter */}
      {[5.5, 10].map((x) => <B key={x} p={[x, 0.74, 27.6]} s={[1.6, 0.04, 0.8]} m={m.woodLight} />)}
      <Chairs list={chairs} material={m.seatGrey} />
    </group>
  );
}

function Restrooms() {
  const m = useMats();
  const r = ROOMS.restrooms;
  const cx = (r.x0 + r.x1) / 2;
  return (
    <group>
      {/* Cubicles along the back wall */}
      {[-1.6, 0, 1.6].map((dx) => (
        <group key={dx} position={[cx + dx, 0, 28.6]}>
          <B p={[0, 1.05, -1.05]} s={[1.5, 1.9, 0.05]} m={m.seatGrey} />
          <B p={[0.75, 1.05, 0]} s={[0.05, 1.9, 2.2]} m={m.seatGrey} />
        </group>
      ))}
      {/* Basins and a mirror on the side wall */}
      {[19.5, 21, 22.5].map((z) => (
        <group key={z} position={[r.x1 - 0.45, 0, z]}>
          <B p={[0, 0.85, 0]} s={[0.6, 0.12, 0.5]} m={m.white} />
          <B p={[0.15, 1.05, 0]} s={[0.04, 0.25, 0.04]} m={m.gold} />
        </group>
      ))}
      <B p={[r.x1 - 0.17, 1.7, 21]} s={[0.02, 0.9, 4]} m={m.glass} cast={false} />
      {/* Accessible-toilet and gender signs by the door */}
      <mesh position={[ROOMS.restrooms.door[0] + 1.3, 1.8, CORRIDOR.z1 - 0.17]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshStandardMaterial color="#2f5fb3" />
      </mesh>
    </group>
  );
}

function Corridor() {
  const m = useMats();
  const posters = useMemo(() => [poster('Exams start 12 Nov', 'Book a study room', '#1b2a55'), poster('Careers fair', 'Student Centre · Thu', '#7a4a1f'), poster('Mental health matters', 'Talk to Student Services', '#1f6b52')], []);
  return (
    <group>
      {/* Noticeboard and benches along the corridor */}
      <group position={[-2, 0, CORRIDOR.z1 - 0.2]}>
        <B p={[0, 1.6, 0]} s={[2.2, 1.2, 0.06]} m={m.wood} />
        {posters.map((t, i) => <Pic key={i} p={[-0.7 + i * 0.7, 1.6, -0.035]} w={0.55} h={0.8} map={t} ry={Math.PI} glow={0.2} />)}
      </group>
      {[-24, 24].map((x) => (
        <group key={x} position={[x, 0, CORRIDOR.z0 + 0.45]}>
          <B p={[0, 0.45, 0]} s={[1.8, 0.06, 0.45]} m={m.woodLight} />
          {[-0.7, 0.7].map((dx) => <B key={dx} p={[dx, 0.22, 0]} s={[0.06, 0.44, 0.4]} m={m.frame} />)}
        </group>
      ))}
      {/* Fire exits at both ends */}
      {[BUILDING.x0 + 0.17, BUILDING.x1 - 0.17].map((x, i) => (
        <group key={x}>
          <mesh position={[x, 3, 14]} rotation={[0, i ? -Math.PI / 2 : Math.PI / 2, 0]}>
            <planeGeometry args={[0.7, 0.25]} />
            <meshStandardMaterial color="#1a8f4a" emissive="#1fbf5f" emissiveIntensity={1} toneMapped={false} />
          </mesh>
          <B p={[x, 1.1, 14]} s={[0.05, 2.2, 1.6]} m={m.seatGrey} />
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- people

const staffUniform = (role: string) => (role === 'Campus Security' || role === 'Lecturer' || role === 'Receptionist' ? UNIFORMS.black : undefined);

function People({ hallClassOn }: { hallClassOn: boolean }) {
  const quality = useQuality();
  // Fewer people on the low tier, to keep phones smooth
  const students = quality.quality === 'high' ? CAMPUS_STUDENTS : CAMPUS_STUDENTS.slice(0, 4);
  const one = (p: CampusPerson, k: string) => (
    <VenueNpc key={k} lookId={p.lookId} name={p.name} role={p.role} x={p.x} z={p.z} facing={p.facing} route={p.route} seat={p.seat} chatty={p.chatty} uniform={staffUniform(p.role)} />
  );
  return (
    <>
      {CAMPUS_STAFF.map((p, i) => one(p, `staff${i}`))}
      {students.map((p, i) => one(p, `st${i}`))}
      {hallClassOn && HALL_CLASSMATES.map((p, i) => one(p, `hc${i}`))}
    </>
  );
}

// ---------------------------------------------------------------- route guide

/** Glowing chevrons along the way to where the directory is guiding you, and a ring at the end. */
function RouteGuide({ points }: { points: readonly (readonly [number, number])[] }) {
  const mat = useMemo(() => new MeshStandardMaterial({ color: '#f3d48f', emissive: '#e9b949', emissiveIntensity: 1.4, toneMapped: false, transparent: true, opacity: 0.9 }), []);
  const items = useMemo(() => {
    const out: Placement[] = [];
    for (let i = 0; i + 1 < points.length; i++) {
      const [ax, az] = points[i], [bx, bz] = points[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const yaw = Math.atan2(bx - ax, bz - az);
      for (let d = 0.8; d < len; d += 1.6) {
        out.push({ position: v3(ax + ((bx - ax) * d) / len, 0.05, az + ((bz - az) * d) / len), scale: v3(0.35, 1, 0.35), rotation: new Euler(-Math.PI / 2, 0, -yaw + Math.PI, 'YXZ') });
      }
    }
    return out;
  }, [points]);
  const end = points[points.length - 1];
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.12);
  });
  if (points.length < 2) return null;
  return (
    <>
      <Instances items={items} material={mat} geometry={<circleGeometry args={[1, 3]} />} castShadow={false} />
      <mesh ref={ring} position={[end[0], 0.06, end[1]]} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
        <ringGeometry args={[0.5, 0.62, 32]} />
      </mesh>
    </>
  );
}

// ---------------------------------------------------------------- the whole campus

export function University({ player, gameTime, route, children }: {
  player: PlayerHandle;
  gameTime: GameTime;
  /** Waypoints to the place picked in the directory, starting where you stand. */
  route: readonly (readonly [number, number])[] | null;
  children?: ReactNode;
}) {
  const minute = gameTime.hour * 60 + gameTime.minute;
  const weekday = gameTime.dayOfWeek <= 4;
  const hallClass = weekday ? TIMETABLE.find((c) => c.room === 'hall-a' && minute >= c.start - CHECK_IN_EARLY && minute < c.end) ?? null : null;
  return (
    <group>
      <Ground />
      <Street />
      <Gate />
      <Courtyard />
      <Walls player={player} />
      <Doorways />
      <EntranceDoors player={player} />
      <Exterior player={player} />
      <CeilingAndLights />
      <Lobby />
      <Corridor />
      <LectureHall classOn={hallClass} />
      <ComputerLab />
      <Library />
      <Cafeteria />
      <StudentCentre />
      <Services />
      <Restrooms />
      <People hallClassOn={!!hallClass} />
      {route && <RouteGuide points={route} />}
      {/* A few warm downlights over the lobby and corridor */}
      <group position={[0, STOREY, 0]}>
        {[-6, -2, 2, 6].map((x) => <Downlight key={x} x={x} z={4} />)}
        {[-20, -10, 0, 10, 20].map((x) => <Downlight key={`c${x}`} x={x} z={14} />)}
      </group>
      {children}
    </group>
  );
}
