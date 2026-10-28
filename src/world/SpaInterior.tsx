import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { DoubleSide, type PointLight } from 'three';
import type { GameTime } from '../lib/gameState';
import type { PlayerHandle } from '../hooks/usePlayerController';
import { lightingAt } from './timeOfDay';
import {
  DESK, LOBBY_Z1, ROOM, ROOMS, SPA_NAME, SPA_STAFF, STOREY, TABLE, WAITING_SEATS, roomDoorX, spaWalls, type Client, type TreatmentRoom,
} from '../lib/spa';
import { WALL_T } from '../lib/buildingShell';
import { hotelPlasterTexture } from './hotelTextures';
import { marbleTexture } from './venueTextures';
import { HotelWalls } from './HotelInterior';
import { VenueNpc } from './VenueNpc';
import { UNIFORMS } from '../lib/uniforms';
import { Ceiling, Downlight } from './VenueShell';
import { PottedPalm } from './PottedPalm';
import { RealModel } from './RealModel';
import { pbr } from './pbr';

const H = STOREY;
const FACE = WALL_T / 2 + 0.01;
const TEAK = '#6e4a2c';
const SHEET = '#f6f2ea';

/** A candle in a glass with a flickering flame and its own small light. */
function Candle({ p, size = 1 }: { p: [number, number, number]; size?: number }) {
  const light = useRef<PointLight>(null);
  // Each candle flickers out of step with the others, from where it stands
  const seed = (p[0] * 7.3 + p[2] * 3.1) % 10;
  useFrame(({ clock }) => {
    if (light.current) light.current.intensity = 0.55 + 0.15 * Math.sin(clock.elapsedTime * 9 + seed) + 0.08 * Math.sin(clock.elapsedTime * 23 + seed);
  });
  return (
    <group position={p} scale={size}>
      <mesh position={[0, 0.04, 0]}><cylinderGeometry args={[0.035, 0.035, 0.08, 16, 1, true]} /><meshStandardMaterial color="#d8a060" transparent opacity={0.55} roughness={0.1} side={DoubleSide} /></mesh>
      <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.03, 0.03, 0.06, 16]} /><meshStandardMaterial color="#f6efe0" roughness={0.9} /></mesh>
      <mesh position={[0, 0.085, 0]}><sphereGeometry args={[0.009, 8, 8]} /><meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={3} toneMapped={false} /></mesh>
      <pointLight ref={light} position={[0, 0.12, 0]} intensity={0.6} distance={1.6} decay={2} color="#ffb877" />
    </group>
  );
}

/** A rolled white towel with an embroidered leaf, lying across the table. */
function RolledTowel({ p, ry }: { p: [number, number, number]; ry: number }) {
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.065, 0.065, 0.42, 20]} /><meshStandardMaterial color="#f3ece2" roughness={1} /></mesh>
      <mesh position={[0, 0.0, 0.066]} rotation={[0, 0, 0.5]}><planeGeometry args={[0.07, 0.035]} /><meshStandardMaterial color="#4f6b3a" roughness={1} side={DoubleSide} /></mesh>
    </group>
  );
}

/** An amber oil bottle with a pump. */
function OilBottle({ p }: { p: [number, number, number] }) {
  return (
    <group position={p}>
      <mesh position={[0, 0.08, 0]} castShadow><cylinderGeometry args={[0.035, 0.035, 0.16, 16]} /><meshStandardMaterial color="#3a1c0c" roughness={0.15} metalness={0.1} transparent opacity={0.92} /></mesh>
      <mesh position={[0, 0.11, 0.0355]}><planeGeometry args={[0.05, 0.05]} /><meshStandardMaterial color="#f1e3cc" /></mesh>
      <mesh position={[0, 0.18, 0]}><cylinderGeometry args={[0.012, 0.016, 0.04, 10]} /><meshStandardMaterial color="#1b1b1b" /></mesh>
    </group>
  );
}

/** The wooden massage tools (maderotherapy): bead roller, disc roller, paddle and suction cup, laid on a tray. */
function WoodTools({ p, ry = 0 }: { p: [number, number, number]; ry?: number }) {
  const wood = '#a5774a', dark = '#5a3a22';
  return (
    <group position={p} rotation={[0, ry, 0]}>
      {/* Disc roller */}
      <group position={[-0.16, 0.025, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.008, 0.008, 0.3, 8]} /><meshStandardMaterial color={wood} /></mesh>
        {Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[-0.09 + i * 0.03, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.025, 0.025, 0.018, 12]} /><meshStandardMaterial color={dark} roughness={0.6} /></mesh>)}
      </group>
      {/* Bead strap */}
      <group position={[0.02, 0.012, -0.12]}>
        {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[-0.12 + i * 0.03, 0, 0]}><sphereGeometry args={[0.013, 10, 8]} /><meshStandardMaterial color={wood} roughness={0.5} /></mesh>)}
      </group>
      {/* Paddle */}
      <mesh position={[0.12, 0.008, 0.06]} rotation={[-Math.PI / 2, 0, 0.4]}><circleGeometry args={[0.07, 20]} /><meshStandardMaterial color={wood} side={DoubleSide} roughness={0.5} /></mesh>
      <mesh position={[0.21, 0.01, 0.12]} rotation={[0, -0.4, Math.PI / 2]}><cylinderGeometry args={[0.012, 0.012, 0.14, 8]} /><meshStandardMaterial color={wood} /></mesh>
      {/* Cup */}
      <mesh position={[0.02, 0.035, 0.12]}><cylinderGeometry args={[0.022, 0.04, 0.07, 14]} /><meshStandardMaterial color={dark} roughness={0.5} /></mesh>
    </group>
  );
}

/** A spa massage table: padded top with a face hole, a white sheet, teak legs. Along z, head at +z. */
function MassageTable({ x, z }: { x: number; z: number }) {
  const { w, l, h } = TABLE;
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[w, 0.1, l]} radius={0.04} smoothness={3} position={[0, h - 0.05, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={SHEET} roughness={1} />
      </RoundedBox>
      {/* The sheet hanging over the sides */}
      {[-1, 1].map((k) => <mesh key={k} position={[k * (w / 2 + 0.005), h - 0.16, 0]}><boxGeometry args={[0.01, 0.2, l]} /><meshStandardMaterial color={SHEET} roughness={1} /></mesh>)}
      {/* Face rest ring at the head end */}
      <mesh position={[0, h + 0.02, l / 2 + 0.12]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[0.1, 0.04, 10, 24, Math.PI * 1.6]} /><meshStandardMaterial color={SHEET} roughness={1} /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => (
        <mesh key={`${a}${b}`} position={[a * (w / 2 - 0.08), (h - 0.1) / 2, b * (l / 2 - 0.12)]} castShadow><boxGeometry args={[0.06, h - 0.1, 0.06]} /><meshStandardMaterial color={TEAK} roughness={0.5} /></mesh>
      ))}
      <mesh position={[0, 0.25, 0]}><boxGeometry args={[w - 0.2, 0.03, l - 0.3]} /><meshStandardMaterial color={TEAK} roughness={0.5} /></mesh>
    </group>
  );
}

/** One treatment room: table(s), towels, candles, oils, wooden tools, a cabinet with flowers, sheer curtains, a dim warm glow. */
function TreatmentRoomSet({ room, night, occupied }: { room: TreatmentRoom; night: number; occupied: readonly ({ lookId: string; name: string; role: string } | null)[] }) {
  const cx = (room.x0 + room.x1) / 2;
  return (
    <group>
      {room.tables.map((t, i) => (
        <group key={i}>
          <MassageTable x={t.x} z={t.z} />
          {!occupied[i] && (
            <>
              <RolledTowel p={[t.x - 0.15, TABLE.h + 0.065, t.z + 0.45]} ry={0.5} />
              <RolledTowel p={[t.x + 0.12, TABLE.h + 0.065, t.z + 0.35]} ry={-0.5} />
              <Candle p={[t.x, TABLE.h, t.z + 0.05]} size={1.1} />
              <OilBottle p={[t.x - 0.18, TABLE.h, t.z + 0.75]} />
              <OilBottle p={[t.x + 0.18, TABLE.h, t.z + 0.75]} />
              <WoodTools p={[t.x, TABLE.h, t.z - 0.55]} />
            </>
          )}
          {occupied[i] && <VenueNpc lookId={occupied[i]!.lookId} name={occupied[i]!.name} role={occupied[i]!.role} x={t.x} z={t.z} facing={0} lying={TABLE.h} />}
          {/* Side cabinet with a vase of white flowers, more candles and a diffuser */}
          <group position={[t.x + 0.8, 0, t.z + 0.9]}>
            <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[0.45, 0.8, 0.45]} /><meshStandardMaterial color={TEAK} roughness={0.5} /></mesh>
            <mesh position={[0, 0.95, 0]}><sphereGeometry args={[0.11, 16, 12]} /><meshStandardMaterial color="#efe9df" roughness={0.6} /></mesh>
            {[[-0.05, 0.02], [0.04, -0.03], [0.0, 0.05], [0.06, 0.04]].map(([a, b], k) => (
              <mesh key={k} position={[a, 1.12 + k * 0.02, b]}><sphereGeometry args={[0.045, 10, 8]} /><meshStandardMaterial color="#fbfaf6" roughness={0.8} /></mesh>
            ))}
            <Candle p={[-0.14, 0.8, 0.14]} size={0.9} />
            <group position={[0.14, 0.8, -0.12]}>
              <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.03, 0.035, 0.1, 12]} /><meshStandardMaterial color="#2a2a2a" roughness={0.2} /></mesh>
              {[-0.3, 0, 0.3].map((a) => <mesh key={a} position={[Math.sin(a) * 0.04, 0.2, 0]} rotation={[0, 0, a * 0.4]}><cylinderGeometry args={[0.003, 0.003, 0.25, 4]} /><meshStandardMaterial color="#3a2a1a" /></mesh>)}
            </group>
          </group>
        </group>
      ))}
      {/* Hot stones on a tray, in the couples suite */}
      {room.tables.length > 1 && (
        <group position={[cx, 0.82, ROOM.z1 - 0.6]}>
          <mesh position={[0, -0.42, 0]} castShadow><boxGeometry args={[0.9, 0.82, 0.4]} /><meshStandardMaterial color={TEAK} roughness={0.5} /></mesh>
          {Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[-0.3 + i * 0.1, 0.02, (i % 2) * 0.06 - 0.03]} scale={[1, 0.45, 0.8]} castShadow><sphereGeometry args={[0.05, 14, 10]} /><meshStandardMaterial color="#1d1d1f" roughness={0.25} /></mesh>)}
        </group>
      )}
      {/* Sheer white curtains on the back wall */}
      <group position={[cx, 0, ROOM.z1 - FACE]} rotation={[0, Math.PI, 0]}>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} position={[-(room.x1 - room.x0) / 2 + 0.55 + i * ((room.x1 - room.x0 - 1.1) / 5), H / 2, 0.06 + (i % 2) * 0.03]}>
            <boxGeometry args={[(room.x1 - room.x0) / 6 + 0.05, H - 0.1, 0.02]} />
            <meshStandardMaterial color="#fbf8f2" transparent opacity={0.85} roughness={1} />
          </mesh>
        ))}
      </group>
      {/* Low warm light */}
      <pointLight position={[cx, 2.4, 3.2]} intensity={2.2 + night} distance={6} decay={1.7} color="#ffc68a" />
    </group>
  );
}

/** The spa's name in gold on the wall behind reception. */
function nameCanvas() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#c9a052';
  g.textAlign = 'center';
  g.font = "600 110px 'Cormorant Garamond', Georgia, serif";
  g.fillText(SPA_NAME.toUpperCase(), 512, 130);
  g.font = "500 38px 'DM Sans', sans-serif";
  g.fillStyle = '#8a7046';
  g.fillText('RELAX · REJUVENATE · FEEL BETTER', 512, 200);
  return c;
}

/**
 * Inside Alafia Spa: travertine reception with a teak desk and the spa's name
 * in gold, a waiting sofa, a shelf of oils; three treatment rooms behind
 * (Lotus, Jasmine, and the Baobab couples suite) with massage tables, rolled
 * towels, candles, amber oils and wooden tools, sheer curtains and low warm
 * light. Staff and clients are computer-controlled.
 */
export function SpaInterior({ gameTime, player, busy, waiting, serving, children }: {
  gameTime: GameTime;
  player: PlayerHandle;
  /** A colleague's client in the Lotus Room (shown while the spa is open). */
  busy: boolean;
  /** Today's clients still waiting for you (sitting in reception). */
  waiting: readonly Client[];
  /** The client you're treating now, on their table (room and table index). */
  serving: { client: Client; room: string; table: number } | null;
  children: ReactNode;
}) {
  const l = lightingAt(gameTime.hour, gameTime.minute);
  const night = l.night;
  const w = ROOM.x1 - ROOM.x0;
  const stone = useMemo(() => marbleTexture('cream', [w / 2.5, (LOBBY_Z1 - ROOM.z0) / 2.5]), [w]);
  // Real oak boards in the treatment rooms, bamboo on the reception's feature wall, backlit onyx on the desk
  const wood = useMemo(() => pbr('wood-floor', [w / 2.2, (ROOM.z1 - LOBBY_Z1) / 2.2]), [w]);
  const bamboo = useMemo(() => pbr('bamboo', [3, 1.5]), []);
  const onyx = useMemo(() => pbr('onyx', [1.5, 0.4]), []);
  const plaster = useMemo(() => hotelPlasterTexture([1, 1]), []);
  const walls = useMemo(() => spaWalls(), []);
  const sign = useMemo(() => nameCanvas(), []);
  const lotus = ROOMS[0];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow><planeGeometry args={[120, 120]} /><meshStandardMaterial color="#1c1f1e" roughness={1} /></mesh>
      <mesh position={[0, 0.001, (ROOM.z0 + LOBBY_Z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, LOBBY_Z1 - ROOM.z0]} />
        <meshStandardMaterial map={stone} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.001, (LOBBY_Z1 + ROOM.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, ROOM.z1 - LOBBY_Z1]} />
        <meshStandardMaterial {...wood} />
      </mesh>
      <HotelWalls player={player} walls={walls} plaster={plaster} />

      {/* Reception: teak desk with a stone top, the name in gold behind, an orchid and a bell */}
      <group position={[DESK.x, 0, DESK.z]}>
        <mesh position={[0, DESK.h / 2, 0]} castShadow receiveShadow><boxGeometry args={[DESK.w, DESK.h, DESK.d]} /><meshStandardMaterial color={TEAK} roughness={0.45} /></mesh>
        {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[-DESK.w / 2 + 0.17 + i * 0.33, DESK.h / 2, -DESK.d / 2 - 0.006]}><boxGeometry args={[0.03, DESK.h - 0.1, 0.012]} /><meshStandardMaterial color="#4a3020" /></mesh>)}
        <mesh position={[0, DESK.h + 0.03, 0]}><boxGeometry args={[DESK.w + 0.1, 0.06, DESK.d + 0.1]} /><meshStandardMaterial {...onyx} emissive="#ffd9a0" emissiveIntensity={0.12} /></mesh>
        <RealModel name="vase-flowers" fit={[0.25, 0.45, 0.25]} />
        <Candle p={[-1.0, DESK.h + 0.06, -0.1]} />
        <Candle p={[1.0, DESK.h + 0.06, -0.1]} />
      </group>
      <group position={[DESK.x, 0, LOBBY_Z1 - FACE]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 2.2, 0]}><planeGeometry args={[3.4, 0.85]} />
          <meshStandardMaterial transparent alphaTest={0.05} metalness={0.4} roughness={0.4}><canvasTexture attach="map" args={[sign]} /></meshStandardMaterial>
        </mesh>
      </group>
      <VenueNpc {...SPA_STAFF.receptionist} chatty uniform={UNIFORMS.spa} />
      <VenueNpc {...SPA_STAFF.manager} chatty uniform={UNIFORMS.black} />

      {/* Bamboo feature wall behind the waiting area */}
      <mesh position={[ROOM.x0 + FACE, H / 2, (ROOM.z0 + LOBBY_Z1) / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[LOBBY_Z1 - ROOM.z0 - 0.2, H - 0.02]} />
        <meshStandardMaterial {...bamboo} />
      </mesh>
      {/* Waiting: a cream sofa, a low table with a candle, and a shelf of oils and towels */}
      <group position={[-6.2, 0, -5.9]}>
        <RealModel name="sofa-velvet-champagne" fit={[2.2, 0.85, 0.9]} rotationY={0} />
      </group>
      <group position={[-6.2, 0, -4.8]}>
        <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.4, 0.4, 0.04, 28]} /><meshStandardMaterial color={TEAK} roughness={0.4} /></mesh>
        <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.05, 0.08, 0.2, 12]} /><meshStandardMaterial color="#4a3020" /></mesh>
        <Candle p={[0, 0.24, 0]} size={1.4} />
      </group>
      <group position={[-8.6, 0, -4.0]}>
        <mesh position={[0, 0.9, 0]} castShadow><boxGeometry args={[0.5, 1.8, 1.8]} /><meshStandardMaterial color={TEAK} roughness={0.5} /></mesh>
        {[0.45, 0.95, 1.45].map((y) => [-0.6, -0.2, 0.2, 0.6].map((z) => (
          y < 1.2 ? <OilBottle key={`${y}${z}`} p={[0.2, y, z]} /> : <RolledTowel key={`${y}${z}`} p={[0.2, y + 0.06, z]} ry={Math.PI / 2} />
        )))}
      </group>
      {waiting.slice(0, WAITING_SEATS.length).map((c, i) => <VenueNpc key={c.id} lookId={c.lookId} name={c.name} role="Client" x={WAITING_SEATS[i].x} z={WAITING_SEATS[i].z} facing={0} seat={WAITING_SEATS[i]} />)}
      <PottedPalm position={[ROOM.x0 + 0.6, 0, ROOM.z0 + 0.6]} height={2.2} />
      <PottedPalm position={[ROOM.x1 - 0.6, 0, ROOM.z0 + 0.6]} height={2.2} rotation={1.2} />
      <PottedPalm position={[1.4, 0, LOBBY_Z1 - 0.6]} height={1.6} rotation={0.6} />

      {/* Treatment rooms */}
      {ROOMS.map((r) => {
        const occ = r.tables.map((_, i) => {
          if (serving && serving.room === r.id && serving.table === i) return { lookId: serving.client.lookId, name: serving.client.name, role: 'Client' };
          if (busy && r.id === lotus.id && i === 0) return { lookId: 'female-adult-06', name: 'Aisha', role: 'Client' };
          return null;
        });
        return <TreatmentRoomSet key={r.id} room={r} night={night} occupied={occ} />;
      })}
      {busy && <VenueNpc {...SPA_STAFF.therapist} x={lotus.tables[0].x + TABLE.w / 2 + 0.45} z={lotus.tables[0].z} facing={-Math.PI / 2} uniform={UNIFORMS.spa} />}
      {/* Room name plaques by each door */}
      {ROOMS.map((r) => (
        <mesh key={r.id} position={[roomDoorX(r) + 1.1, 1.6, LOBBY_Z1 - FACE]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.5, 0.18]} /><meshStandardMaterial color="#c9a052" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}

      <group position={[0, 0, (ROOM.z0 + LOBBY_Z1) / 2]}>
        <Ceiling width={w} depth={LOBBY_Z1 - ROOM.z0} height={H} color="#efe7da">
          {[-6, -2, 2, 6].map((x) => <Downlight key={x} x={x} z={0} />)}
        </Ceiling>
      </group>
      <hemisphereLight args={['#ffeeda', '#5a4a3a', 0.45]} />
      <pointLight position={[0, 2.6, -4]} intensity={5 + 2 * night} distance={14} decay={1.5} color="#ffe2c0" />
      {children}
    </group>
  );
}
