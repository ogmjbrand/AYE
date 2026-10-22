import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { MeshStandardMaterial, Vector3, type Group } from 'three';
import type { PlayerHandle } from '../hooks/usePlayerController';
import {
  CONSULT_DESKS, ER_BAYS, H_BUILDING, H_CORRIDOR, H_ROOMS, H_SITE, H_STOREY, H_WALLS, HOSPITAL_STAFF, PATIENTS, RECEPTION, SUPERVISOR_DESK,
  WAITING_PEOPLE, WAITING_ROWS, WARD_BEDS, hDoorWidth, insideHospital, type HospitalPerson,
} from '../lib/hospital';
import { B, Chairs, Pic, Walls } from './University';
import { useMats } from './buildingMats';
import { asphaltTexture, crestBoard, listBoard, pavingTexture, poster, roomPlate, screenTexture } from './campusTextures';
import { marbleTexture } from './venueTextures';
import { PottedPalm } from './PottedPalm';
import { VenueNpc } from './VenueNpc';
import { Instances, type Placement } from './Instances';
import { useQuality } from './quality';
import { UNIFORMS } from '../lib/uniforms';
import type { Slot, Style } from '../lib/fashion';

/**
 * AYE General Hospital (lib/hospital.ts has the plan): a forecourt with an
 * ambulance bay, then reception and waiting, emergency, the staff room, the
 * corridor, two consulting rooms and the general ward. Built from shapes and
 * canvas-painted signs; staff, visitors and patients are the game's own
 * computer-controlled people.
 */

const MID_Z = (H_BUILDING.z0 + H_BUILDING.z1) / 2;
const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z);

function useHospitalMats() {
  return useMemo(() => ({
    teal: new MeshStandardMaterial({ color: '#2f8f8a', roughness: 0.7 }),
    tealDeep: new MeshStandardMaterial({ color: '#1d5f5c', roughness: 0.7 }),
    sheet: new MeshStandardMaterial({ color: '#f4f6f7', roughness: 0.9 }),
    blanket: new MeshStandardMaterial({ color: '#7fb6cf', roughness: 0.9 }),
    steel: new MeshStandardMaterial({ color: '#b9c0c6', roughness: 0.3, metalness: 0.8 }),
    red: new MeshStandardMaterial({ color: '#c62828', roughness: 0.5 }),
    white: new MeshStandardMaterial({ color: '#f7f7f5', roughness: 0.4 }),
    curtain: new MeshStandardMaterial({ color: '#9fd0cc', roughness: 0.95, transparent: true, opacity: 0.85 }),
  }), []);
}

function Grounds() {
  const m = useMats();
  const paving = useMemo(() => pavingTexture([8, 3]), []);
  const road = useMemo(() => asphaltTexture([8, 2]), []);
  const floor = useMemo(() => marbleTexture('white', [8, 6]), []);
  const W = H_SITE.x1 - H_SITE.x0;
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -12]} receiveShadow><planeGeometry args={[W + 30, 6]} /><meshStandardMaterial map={road} roughness={0.9} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, -4.5]} receiveShadow><planeGeometry args={[W, 9]} /><meshStandardMaterial map={paving} roughness={0.75} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, MID_Z]} receiveShadow>
        <planeGeometry args={[H_BUILDING.x1 - H_BUILDING.x0, H_BUILDING.z1 - H_BUILDING.z0]} />
        <meshStandardMaterial map={floor} roughness={0.2} />
      </mesh>
      {/* Ambulance bay markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-10, 0.01, -4.5]}><planeGeometry args={[3.2, 6.2]} /><meshStandardMaterial color="#e6b422" transparent opacity={0.35} /></mesh>
      <B p={[0, 0.08, -9]} s={[W + 30, 0.16, 0.2]} m={m.stoneDark} />
    </>
  );
}

/** A plain ambulance in the bay: white, a red stripe, a light bar. */
function Ambulance() {
  const h = useHospitalMats();
  const m = useMats();
  const lights = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (lights.current) lights.current.children.forEach((c, i) => { c.visible = Math.floor(clock.elapsedTime * 2 + i) % 2 === 0; });
  });
  return (
    <group position={[-10, 0, -4.5]}>
      <RoundedBox args={[2.1, 2.3, 4]} radius={0.12} position={[0, 1.45, -0.4]} castShadow material={h.white} />
      <RoundedBox args={[2.0, 1.4, 1.4]} radius={0.12} position={[0, 1.0, 2.1]} castShadow material={h.white} />
      <B p={[0, 1.9, 2.82]} s={[1.7, 0.5, 0.02]} m={m.glass} cast={false} />
      <B p={[0, 1.2, -0.4]} s={[2.12, 0.18, 4.02]} m={h.red} />
      <B p={[0, 1.2, 2.1]} s={[2.02, 0.18, 1.42]} m={h.red} />
      {[[-0.85, 1.6], [0.85, 1.6], [-0.85, -1.6], [0.85, -1.6]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x * 1.15, 0.38, z]} rotation={[0, 0, Math.PI / 2]} material={m.rubber}><cylinderGeometry args={[0.38, 0.38, 0.28, 18]} /></mesh>
      ))}
      <group ref={lights}>
        {[-0.5, 0.5].map((x, i) => (
          <mesh key={x} position={[x, 2.68, 0.9]}>
            <boxGeometry args={[0.5, 0.12, 0.25]} />
            <meshStandardMaterial color={i ? '#2962ff' : '#e53935'} emissive={i ? '#2962ff' : '#e53935'} emissiveIntensity={2} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Exterior({ player }: { player: PlayerHandle }) {
  const m = useMats();
  const h = useHospitalMats();
  const top = useRef<Group>(null);
  useFrame(() => { if (top.current) top.current.visible = !insideHospital(player.position.x, player.position.z); });
  const sign = useMemo(() => crestBoard('AYE GENERAL HOSPITAL', 'Emergency · Clinics · Wards', 1536, 300), []);
  const W = H_BUILDING.x1 - H_BUILDING.x0;
  const D = H_BUILDING.z1 - H_BUILDING.z0;
  const up = H_BUILDING.height - H_STOREY;
  const panes = useMemo(() => {
    const out: Placement[] = [];
    for (let x = H_BUILDING.x0 + 1.5; x < H_BUILDING.x1; x += 3) {
      out.push({ position: v3(x, H_STOREY + up / 2, H_BUILDING.z0 - 0.17), scale: v3(2.4, up - 1, 0.06) });
      if (Math.abs(x) > 5) out.push({ position: v3(x, H_STOREY / 2 + 0.2, H_BUILDING.z0 - 0.17), scale: v3(2.4, H_STOREY - 1.4, 0.06) });
    }
    return out;
  }, [up]);
  return (
    <group>
      <group ref={top}>
        <B p={[0, H_STOREY + up / 2, H_BUILDING.z0]} s={[W + 0.3, up, 0.3]} m={m.plaster} />
        <B p={[0, H_STOREY + up / 2, H_BUILDING.z1]} s={[W + 0.3, up, 0.3]} m={m.plaster} />
        {[-1, 1].map((sx) => <B key={sx} p={[sx * W / 2, H_STOREY + up / 2, MID_Z]} s={[0.3, up, D]} m={m.plaster} />)}
        <B p={[0, H_BUILDING.height + 0.15, MID_Z]} s={[W + 0.8, 0.3, D + 0.8]} m={h.tealDeep} />
        <Instances items={panes} material={m.facadeGlass} geometry={<boxGeometry args={[1, 1, 1]} />} castShadow={false} />
        {/* A red cross high on the front */}
        <group position={[10, H_BUILDING.height - 1.4, H_BUILDING.z0 - 0.3]}>
          <B p={[0, 0, 0]} s={[1.6, 0.5, 0.15]} m={h.red} />
          <B p={[0, 0, 0]} s={[0.5, 1.6, 0.15]} m={h.red} />
        </group>
      </group>
      {/* Canopy over the doors with the name */}
      <B p={[0, 3.3, H_BUILDING.z0 - 1.8]} s={[8, 0.25, 3.6]} m={h.tealDeep} />
      {[-3.6, 3.6].map((x) => <B key={x} p={[x, 1.65, H_BUILDING.z0 - 3.4]} s={[0.25, 3.3, 0.25]} m={m.frame} />)}
      <B p={[0, 3.85, H_BUILDING.z0 - 3.62]} s={[7.4, 0.8, 0.1]} m={m.navyWall} />
      <Pic p={[0, 3.85, H_BUILDING.z0 - 3.68]} w={7.2} h={0.75} map={sign} ry={Math.PI} glow={0.35} />
      {[8, -4.5].map((x) => (
        <group key={x} position={[x, 0, -1.2]}>
          <B p={[0, 0.3, 0]} s={[x > 0 ? 4 : 1.4, 0.6, 1]} m={m.stoneDark} />
          <B p={[0, 0.75, 0]} s={[x > 0 ? 3.8 : 1.2, 0.35, 0.8]} m={m.hedge} />
        </group>
      ))}
      <Ambulance />
    </group>
  );
}

function Doorways() {
  const m = useMats();
  return (
    <>
      {(Object.entries(H_ROOMS) as [keyof typeof H_ROOMS, (typeof H_ROOMS)[keyof typeof H_ROOMS]][]).map(([id, r]) => {
        const w = hDoorWidth(id);
        const side = r.door[1] === H_CORRIDOR.z0 ? 0.2 : r.door[1] === H_CORRIDOR.z1 ? -0.2 : -0.2;
        return (
          <group key={id}>
            {[-1, 1].map((s) => <B key={s} p={[r.door[0] + s * (w / 2 + 0.05), 1.25, r.door[1]]} s={[0.1, 2.5, 0.36]} m={m.frame} />)}
            <B p={[r.door[0], 2.55, r.door[1]]} s={[w + 0.2, 0.1, 0.36]} m={m.frame} />
            {r.code && <Pic p={[r.door[0], 3, r.door[1] + side]} w={1.9} h={0.4} map={roomPlate(r.code, r.name)} ry={side > 0 ? 0 : Math.PI} glow={0.4} />}
          </group>
        );
      })}
    </>
  );
}

function Ceiling() {
  const m = useMats();
  const panels = useMemo(() => {
    const out: Placement[] = [];
    for (let x = H_BUILDING.x0 + 2.5; x < H_BUILDING.x1; x += 4) for (let z = H_BUILDING.z0 + 2; z < H_BUILDING.z1; z += 3.5) out.push({ position: v3(x, H_STOREY - 0.02, z), scale: v3(1.2, 0.03, 0.6) });
    return out;
  }, []);
  return (
    <>
      <mesh position={[0, H_STOREY, MID_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[H_BUILDING.x1 - H_BUILDING.x0, H_BUILDING.z1 - H_BUILDING.z0]} />
        <meshStandardMaterial color="#f6f7f5" roughness={0.9} />
      </mesh>
      <Instances items={panels} material={m.lightPanel} geometry={<boxGeometry args={[1, 1, 1]} />} castShadow={false} />
    </>
  );
}

function Bed({ x, z, facing = 0 }: { x: number; z: number; facing?: number }) {
  const h = useHospitalMats();
  return (
    <group position={[x, 0, z]} rotation={[0, facing, 0]}>
      <B p={[0, 0.3, 0]} s={[0.95, 0.08, 2]} m={h.steel} />
      {[[-0.42, -0.92], [0.42, -0.92], [-0.42, 0.92], [0.42, 0.92]].map(([a, b]) => <B key={`${a}${b}`} p={[a, 0.15, b]} s={[0.04, 0.3, 0.04]} m={h.steel} />)}
      <B p={[0, 0.45, 0]} s={[0.9, 0.2, 1.95]} m={h.sheet} />
      <B p={[0, 0.57, -0.3]} s={[0.92, 0.05, 1.2]} m={h.blanket} />
      <B p={[0, 0.62, 0.75]} s={[0.6, 0.12, 0.35]} m={h.sheet} />
      <B p={[0, 0.75, 1.0]} s={[0.95, 0.9, 0.05]} m={h.steel} />
    </group>
  );
}

function Rooms({ seen }: { seen: readonly string[] }) {
  const m = useMats();
  const h = useHospitalMats();
  const brand = useMemo(() => crestBoard('AYE', 'General Hospital', 1024, 384), []);
  const queue = useMemo(() => listBoard('Clinics today', [['General ward', 'W1'], ['Consulting room 1', 'C1'], ['Consulting room 2', 'C2'], ['Emergency', 'ER'], ['Staff room', 'S1']], { w: 768, h: 768 }), []);
  const board = useMemo(() => listBoard('Today’s patients', PATIENTS.map((p) => [`${p.name} · ${p.complaint}`, seen.includes(p.id) ? 'Seen' : 'Waiting'] as const), { w: 1024, h: 900 }), [seen]);
  const posters = useMemo(() => [poster('Wash your hands', 'Every patient, every time', '#1d5f5c'), poster('Free blood pressure checks', 'Ask reception', '#7a2f2f')], []);
  const waiting = useMemo(() => WAITING_ROWS.flatMap((r) => Array.from({ length: Math.round(r.len / 0.8) }, (_, i) => ({ x: r.x - r.len / 2 + 0.4 + i * 0.8, z: r.z + 0.1, facing: 0 }))), []);
  return (
    <group>
      {/* Reception */}
      <B p={[RECEPTION.x, 0.55, RECEPTION.z]} s={[RECEPTION.w, 1.1, RECEPTION.d]} m={h.teal} />
      <B p={[RECEPTION.x, 1.12, RECEPTION.z]} s={[RECEPTION.w + 0.1, 0.05, RECEPTION.d + 0.1]} m={m.white} />
      <B p={[RECEPTION.x - 0.8, 1.3, RECEPTION.z + 0.1]} s={[0.5, 0.32, 0.03]} m={m.black} />
      <B p={[3, 2.3, 8.82]} s={[4.4, 1.7, 0.1]} m={m.navyWall} />
      <Pic p={[3, 2.3, 8.76]} w={4.2} h={1.58} map={brand} ry={Math.PI} glow={0.35} />
      <Pic p={[-5.82, 2.2, 4.5]} w={2.2} h={2.2} map={queue} ry={Math.PI / 2} glow={0.5} />
      <Chairs list={waiting} material={h.teal} />
      <PottedPalm position={[5.4, 0, 0.8]} height={2.1} />
      <PottedPalm position={[-5.4, 0, 0.8]} height={2.1} rotation={1} />
      {/* Corridor posters and a handrail */}
      {posters.map((t, i) => <Pic key={i} p={[-3 + i * 6, 1.7, H_CORRIDOR.z1 - 0.17]} w={0.6} h={0.85} map={t} ry={Math.PI} glow={0.2} />)}
      <B p={[0, 0.9, H_CORRIDOR.z0 + 0.2]} s={[29.4, 0.06, 0.06]} m={h.steel} />
      {/* Ward: four beds with curtain rails, monitors */}
      {WARD_BEDS.map((b) => (
        <group key={b.id}>
          <Bed x={b.x} z={b.z} />
          <B p={[b.x + 0.75, 1.4, b.z + 0.7]} s={[0.4, 0.3, 0.06]} m={m.black} />
          <Pic p={[b.x + 0.75, 1.4, b.z + 0.665]} w={0.36} h={0.26} map={screenTexture(1)} ry={Math.PI} glow={0.8} />
          <B p={[b.x - 0.8, 1.6, b.z]} s={[0.04, 3.2, 2]} m={h.curtain} cast={false} />
        </group>
      ))}
      <Pic p={[0, 2.3, H_BUILDING.z1 - 0.17]} w={3.6} h={3.2} map={board} ry={Math.PI} glow={0.5} />
      {/* Consulting rooms: a desk, a computer, two chairs and an examination couch */}
      {CONSULT_DESKS.map((d) => (
        <group key={d.room}>
          <B p={[d.x, 0.74, d.z]} s={[0.8, 0.05, 1.4]} m={m.woodLight} />
          <B p={[d.x, 0.37, d.z]} s={[0.7, 0.74, 0.05]} m={m.frame} />
          <B p={[d.x, 1.0, d.z + 0.45]} s={[0.04, 0.34, 0.5]} m={m.black} />
          <Bed x={d.x + (d.x < 0 ? -1.5 : 1.5)} z={14.4} facing={Math.PI / 2} />
        </group>
      ))}
      <Chairs list={[{ x: -9.6, z: 19, facing: -Math.PI / 2 }, { x: -12.4, z: 19, facing: Math.PI / 2 }, { x: 9.6, z: 19, facing: Math.PI / 2 }, { x: 12.4, z: 19, facing: -Math.PI / 2 }]} material={h.tealDeep} />
      {/* Emergency: two trolleys, a crash cart, red signage */}
      {ER_BAYS.map((b) => <Bed key={b.id} x={b.x - 0.5} z={b.z} facing={Math.PI / 2} />)}
      <B p={[-7, 0.5, 2]} s={[0.6, 1, 0.5]} m={h.red} />
      <mesh position={[-10.5, 3, 0.18]}>
        <planeGeometry args={[2.4, 0.5]} />
        <meshStandardMaterial color="#c62828" emissive="#ff3b30" emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
      {/* Staff room: supervisor's desk, lockers, a rota board */}
      <B p={[SUPERVISOR_DESK.x, 0.74, SUPERVISOR_DESK.z]} s={[SUPERVISOR_DESK.w, 0.05, SUPERVISOR_DESK.d]} m={m.woodLight} />
      <B p={[SUPERVISOR_DESK.x, 0.37, SUPERVISOR_DESK.z + 0.35]} s={[SUPERVISOR_DESK.w, 0.74, 0.05]} m={m.frame} />
      <B p={[SUPERVISOR_DESK.x + 0.5, 1.0, SUPERVISOR_DESK.z + 0.2]} s={[0.5, 0.34, 0.04]} m={m.black} />
      {[7, 7.7, 8.4].map((x) => <B key={x} p={[x, 1, 8.5]} s={[0.65, 2, 0.5]} m={h.steel} />)}
      <Pic p={[14.82, 2, 4.5]} w={2.4} h={2.1} map={board} ry={-Math.PI / 2} glow={0.4} />
    </group>
  );
}

function People() {
  const quality = useQuality();
  const one = (p: HospitalPerson, k: string, uniform?: Partial<Record<Slot, Style>>) => (
    <VenueNpc key={k} lookId={p.lookId} name={p.name} role={p.role} x={p.x} z={p.z} facing={p.facing} route={p.route} seat={p.seat} chatty={p.chatty}
      uniform={uniform} />
  );
  // Every patient you can be asked to see is always there; visitors are the first thing cut on the low tier
  const visitors = quality.quality === 'high' ? WAITING_PEOPLE : WAITING_PEOPLE.slice(0, 1);
  const dress = (role: string) => (role === 'Nurse' ? UNIFORMS.scrubs : role === 'Supervisor' ? UNIFORMS.chef : role === 'Receptionist' ? UNIFORMS.black : undefined);
  return (
    <>
      {HOSPITAL_STAFF.map((p, i) => one(p, `s${i}`, dress(p.role)))}
      {visitors.map((p, i) => one(p, `w${i}`))}
      {PATIENTS.map((p) => one({ lookId: p.lookId, name: p.name, role: 'Patient', x: 0, z: 0, facing: 0, seat: p.seat }, p.id))}
    </>
  );
}

export function Hospital({ player, seen, children }: { player: PlayerHandle; seen: readonly string[]; children?: ReactNode }) {
  return (
    <group>
      <Grounds />
      <Exterior player={player} />
      <Walls player={player} walls={H_WALLS} midZ={MID_Z} height={H_STOREY} />
      <Doorways />
      <Ceiling />
      <Rooms seen={seen} />
      <People />
      {children}
    </group>
  );
}
