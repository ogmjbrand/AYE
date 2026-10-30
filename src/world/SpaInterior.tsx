import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { CylinderGeometry, DoubleSide, Shape, type PointLight } from 'three';
import type { GameTime } from '../lib/gameState';
import type { PlayerHandle } from '../hooks/usePlayerController';
import { lightingAt } from './timeOfDay';
import {
  DESK, LOBBY_Z1, ROOM, ROOMS, SHELL_CHAIR, SIDE_TABLE, VANITY_Z, lampSpot, SPA_NAME, SPA_STAFF, STOREY, TABLE, WAITING_SEATS, roomDoorX, spaWalls, type Client, type TreatmentRoom,
} from '../lib/spa';
import { WALL_T } from '../lib/buildingShell';
import { blushPlasterTexture } from './hotelTextures';
import { HotelWalls } from './HotelInterior';
import { VenueNpc } from './VenueNpc';
import { UNIFORMS } from '../lib/uniforms';
import { Ceiling, Downlight } from './VenueShell';
import { PottedPalm } from './PottedPalm';
import { RealModel } from './RealModel';
import { pbr } from './pbr';

const H = STOREY;
const FACE = WALL_T / 2 + 0.01;
const SHEET = '#faf7f4';
// The salon's palette: blush and rose, soft white, brushed gold
const BLUSH = '#f1c6cc';
const ROSE = '#e3a3ae';
const WHITE = '#fbf8f6';
const GOLD = '#c9a25a';
// Brushed gold: only half metallic, so it stays light without a reflection to show
const gold = { color: '#d9b878', metalness: 0.55, roughness: 0.32 } as const;

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

/** A rolled towel, white or blush, with an embroidered leaf. */
function RolledTowel({ p, ry, pink = false }: { p: [number, number, number]; ry: number; pink?: boolean }) {
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.065, 0.065, 0.42, 20]} /><meshStandardMaterial color={pink ? BLUSH : '#f6f1ec'} roughness={1} /></mesh>
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

/**
 * A treatment bed: white padded top with a face rest, on a white plinth with a
 * gold kick strip, and a blush throw folded across the foot. Along z, head at +z.
 */
function MassageTable({ x, z, made }: { x: number; z: number; made: boolean }) {
  const { w, l, h } = TABLE;
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[w, 0.12, l]} radius={0.05} smoothness={3} position={[0, h - 0.06, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={SHEET} roughness={0.7} />
      </RoundedBox>
      {/* Face rest ring at the head end */}
      <mesh position={[0, h + 0.02, l / 2 + 0.12]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[0.1, 0.04, 10, 24, Math.PI * 1.6]} /><meshStandardMaterial color={SHEET} roughness={0.7} /></mesh>
      {/* Plinth, set back under the top, on a gold kick strip */}
      <RoundedBox args={[w - 0.12, h - 0.2, l - 0.3]} radius={0.03} smoothness={2} position={[0, (h - 0.2) / 2 + 0.06, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={WHITE} roughness={0.55} />
      </RoundedBox>
      <mesh position={[0, 0.03, 0]}><boxGeometry args={[w - 0.16, 0.06, l - 0.34]} /><meshStandardMaterial {...gold} /></mesh>
      {/* The folded throw across the foot, hanging down both sides */}
      <group position={[0, h, -l / 2 + 0.32]}>
        <mesh position={[0, 0.012, 0]} castShadow><boxGeometry args={[w + 0.04, 0.024, 0.42]} /><meshStandardMaterial color={BLUSH} roughness={1} /></mesh>
        {[-1, 1].map((k) => <mesh key={k} position={[k * (w / 2 + 0.02), -0.11, 0]}><boxGeometry args={[0.024, 0.24, 0.42]} /><meshStandardMaterial color={BLUSH} roughness={1} /></mesh>)}
        {/* A fringe of slightly deeper rose along its edge */}
        <mesh position={[0, 0.013, 0.2]}><boxGeometry args={[w + 0.045, 0.026, 0.03]} /><meshStandardMaterial color={ROSE} roughness={1} /></mesh>
      </group>
      {/* A blush pillow at the head when the bed's made up */}
      {made && (
        <RoundedBox args={[w - 0.14, 0.1, 0.32]} radius={0.05} smoothness={3} position={[0, h + 0.05, l / 2 - 0.24]} castShadow>
          <meshStandardMaterial color={BLUSH} roughness={0.95} />
        </RoundedBox>
      )}
    </group>
  );
}

/** A magnifier lamp on a wheeled stand: five castors, a white pole, a sprung arm and a ring lamp, angled over the bed's head. */
function MagnifierLamp({ x, z, ry }: { x: number; z: number; ry: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]}>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <group key={i} rotation={[0, a, 0]}>
            <mesh position={[0.13, 0.05, 0]}><boxGeometry args={[0.26, 0.025, 0.04]} /><meshStandardMaterial color={WHITE} roughness={0.4} /></mesh>
            <mesh position={[0.25, 0.025, 0]}><sphereGeometry args={[0.025, 10, 8]} /><meshStandardMaterial color="#2a2a2a" roughness={0.5} /></mesh>
          </group>
        );
      })}
      <mesh position={[0, 0.7, 0]} castShadow><cylinderGeometry args={[0.016, 0.02, 1.3, 12]} /><meshStandardMaterial color={WHITE} roughness={0.35} /></mesh>
      <mesh position={[0, 1.36, 0]}><cylinderGeometry args={[0.028, 0.028, 0.06, 12]} /><meshStandardMaterial {...gold} /></mesh>
      {/* The arm reaches out over the bed and dips */}
      <group position={[0, 1.36, 0]} rotation={[0, 0, 0.3]}>
        <mesh position={[-0.34, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.012, 0.012, 0.68, 8]} /><meshStandardMaterial color={WHITE} roughness={0.35} /></mesh>
        <group position={[-0.7, 0, 0]} rotation={[0, 0, 1.25 - 0.3]}>
          <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.12, 0.028, 12, 32]} /><meshStandardMaterial color={WHITE} roughness={0.3} /></mesh>
          <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.1, 0.008, 8, 32]} /><meshStandardMaterial color="#fff6ee" emissive="#fff1e2" emissiveIntensity={2.2} toneMapped={false} /></mesh>
          <mesh rotation={[0, Math.PI / 2, 0]}><circleGeometry args={[0.095, 28]} /><meshStandardMaterial color="#dfe8ec" transparent opacity={0.35} metalness={0.2} roughness={0.05} side={DoubleSide} /></mesh>
        </group>
      </group>
    </group>
  );
}

/** Jars, tubes and pump bottles in blush, white and gold, as on a beauty trolley or shelf. */
function Products({ p, n = 4, spread = 0.32, seed = 0 }: { p: [number, number, number]; n?: number; spread?: number; seed?: number }) {
  const kinds = useMemo(() => Array.from({ length: n }, (_, i) => (i * 7 + seed * 3) % 4), [n, seed]);
  return (
    <group position={p}>
      {kinds.map((k, i) => {
        const x = n === 1 ? 0 : -spread / 2 + (spread / (n - 1)) * i;
        const body = (i + seed) % 2 ? BLUSH : WHITE;
        if (k === 0) return ( // pump bottle
          <group key={i} position={[x, 0, 0]}>
            <mesh position={[0, 0.07, 0]} castShadow><cylinderGeometry args={[0.028, 0.028, 0.14, 14]} /><meshStandardMaterial color={body} roughness={0.3} /></mesh>
            <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[0.01, 0.014, 0.04, 8]} /><meshStandardMaterial {...gold} /></mesh>
          </group>
        );
        if (k === 1) return ( // jar with a gold lid
          <group key={i} position={[x, 0, 0]}>
            <mesh position={[0, 0.03, 0]} castShadow><cylinderGeometry args={[0.04, 0.04, 0.06, 16]} /><meshStandardMaterial color={body} roughness={0.25} /></mesh>
            <mesh position={[0, 0.067, 0]}><cylinderGeometry args={[0.041, 0.041, 0.016, 16]} /><meshStandardMaterial {...gold} /></mesh>
          </group>
        );
        if (k === 2) return ( // tall tube, cap down
          <group key={i} position={[x, 0, 0]}>
            <mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.016, 0.016, 0.024, 10]} /><meshStandardMaterial {...gold} /></mesh>
            <mesh position={[0, 0.085, 0]} castShadow><cylinderGeometry args={[0.012, 0.022, 0.13, 12]} /><meshStandardMaterial color={body} roughness={0.4} /></mesh>
          </group>
        );
        return ( // square dropper bottle
          <group key={i} position={[x, 0, 0]}>
            <mesh position={[0, 0.045, 0]} castShadow><boxGeometry args={[0.045, 0.09, 0.045]} /><meshStandardMaterial color={ROSE} roughness={0.15} transparent opacity={0.85} /></mesh>
            <mesh position={[0, 0.11, 0]}><cylinderGeometry args={[0.012, 0.012, 0.04, 8]} /><meshStandardMaterial color={WHITE} roughness={0.5} /></mesh>
          </group>
        );
      })}
    </group>
  );
}

/** A small potted plant: a white pot and a mound of leaves. */
function LittlePlant({ p, size = 1 }: { p: [number, number, number]; size?: number }) {
  return (
    <group position={p} scale={size}>
      <mesh position={[0, 0.06, 0]} castShadow><cylinderGeometry args={[0.06, 0.045, 0.12, 16]} /><meshStandardMaterial color={WHITE} roughness={0.4} /></mesh>
      {[[0, 0.17, 0, 0.07], [0.04, 0.15, 0.03, 0.05], [-0.04, 0.16, -0.02, 0.055], [0.01, 0.21, -0.03, 0.045]].map(([a, b, c, r], i) => (
        <mesh key={i} position={[a, b, c]} castShadow><icosahedronGeometry args={[r, 1]} /><meshStandardMaterial color={i % 2 ? '#5e8a4a' : '#4c7a3c'} roughness={0.8} flatShading /></mesh>
      ))}
    </group>
  );
}

/** A white three-tier beauty trolley on castors with gold posts, stocked with products and towels. */
function Trolley({ p }: { p: [number, number, number] }) {
  const s = 0.45;
  return (
    <group position={p}>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => (
        <group key={`${a}${b}`} position={[a * (s / 2 - 0.02), 0, b * (s / 2 - 0.02)]}>
          <mesh position={[0, 0.42, 0]}><cylinderGeometry args={[0.01, 0.01, 0.78, 8]} /><meshStandardMaterial {...gold} /></mesh>
          <mesh position={[0, 0.025, 0]}><sphereGeometry args={[0.025, 10, 8]} /><meshStandardMaterial color="#2a2a2a" /></mesh>
        </group>
      ))}
      {[0.12, 0.45, 0.8].map((y) => <mesh key={y} position={[0, y, 0]} castShadow receiveShadow><boxGeometry args={[s, 0.03, s]} /><meshStandardMaterial color={WHITE} roughness={0.4} /></mesh>)}
      <Products p={[0, 0.815, -0.08]} n={4} spread={0.3} seed={1} />
      <RolledTowel p={[-0.05, 0.53, 0]} ry={Math.PI / 2} pink />
      <RolledTowel p={[0.1, 0.53, 0]} ry={Math.PI / 2} />
      <Products p={[0, 0.135, 0]} n={3} spread={0.28} seed={2} />
    </group>
  );
}

/**
 * One treatment room, styled like a beauty salon: a white bed with a blush
 * throw on a blush rug, a magnifier lamp at its head, a white trolley of
 * products and towels with flowers on top, blush sheers on the back wall, and
 * candles and wooden tools for the massage. A dim warm glow.
 */
function TreatmentRoomSet({ room, night, occupied }: { room: TreatmentRoom; night: number; occupied: readonly ({ lookId: string; name: string; role: string } | null)[] }) {
  const cx = (room.x0 + room.x1) / 2;
  return (
    <group>
      {room.tables.map((t, i) => {
        const [lx, lz] = lampSpot(t);
        return (
          <group key={i}>
            {/* A blush rug under the bed */}
            <mesh position={[t.x, 0.004, t.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[1.7, 2.6]} /><meshStandardMaterial color={BLUSH} roughness={1} /></mesh>
            <mesh position={[t.x, 0.003, t.z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.78, 2.68]} /><meshStandardMaterial color={ROSE} roughness={1} /></mesh>
            <MassageTable x={t.x} z={t.z} made={!occupied[i]} />
            {!occupied[i] && (
              <>
                <RolledTowel p={[t.x - 0.12, TABLE.h + 0.065, t.z + 0.15]} ry={0.5} />
                <RolledTowel p={[t.x + 0.12, TABLE.h + 0.065, t.z + 0.05]} ry={-0.5} pink />
                <Candle p={[t.x, TABLE.h, t.z - 0.25]} size={1.1} />
                <WoodTools p={[t.x, TABLE.h + 0.025, t.z - 0.55]} />
              </>
            )}
            {occupied[i] && <VenueNpc lookId={occupied[i]!.lookId} name={occupied[i]!.name} role={occupied[i]!.role} x={t.x} z={t.z} facing={0} lying={TABLE.h} />}
            <MagnifierLamp x={lx} z={lz} ry={Math.atan2(t.z + 0.75 - lz, -(t.x - lx))} />
            {/* The trolley, with a vase of blush roses, a candle and a diffuser on top */}
            <group position={[t.x + 0.8, 0, t.z + 0.9]}>
              <Trolley p={[0, 0, 0]} />
              <mesh position={[0.1, 0.9, 0.1]}><cylinderGeometry args={[0.045, 0.035, 0.16, 14]} /><meshStandardMaterial color="#e9eef0" transparent opacity={0.5} roughness={0.05} /></mesh>
              {[[0.08, 0.1], [0.12, 0.07], [0.1, 0.13], [0.13, 0.12], [0.07, 0.07]].map(([a, b], k) => (
                <mesh key={k} position={[a, 1.0 + (k % 3) * 0.025, b]}><sphereGeometry args={[0.035, 10, 8]} /><meshStandardMaterial color={k % 2 ? BLUSH : ROSE} roughness={0.8} /></mesh>
              ))}
              <Candle p={[-0.13, 0.815, 0.13]} size={0.8} />
              <OilBottle p={[-0.13, 0.815, 0.03]} />
            </group>
          </group>
        );
      })}
      {/* Hot stones on a tray, in the couples suite */}
      {room.tables.length > 1 && (
        <group position={[cx, 0.82, ROOM.z1 - 0.6]}>
          <mesh position={[0, -0.42, 0]} castShadow><boxGeometry args={[0.9, 0.82, 0.4]} /><meshStandardMaterial color={WHITE} roughness={0.45} /></mesh>
          <mesh position={[0, -0.8, 0]}><boxGeometry args={[0.86, 0.04, 0.36]} /><meshStandardMaterial {...gold} /></mesh>
          {Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[-0.3 + i * 0.1, 0.02, (i % 2) * 0.06 - 0.03]} scale={[1, 0.45, 0.8]} castShadow><sphereGeometry args={[0.05, 14, 10]} /><meshStandardMaterial color="#1d1d1f" roughness={0.25} /></mesh>)}
        </group>
      )}
      {/* Blush sheers on the back wall */}
      <group position={[cx, 0, ROOM.z1 - FACE]} rotation={[0, Math.PI, 0]}>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} position={[-(room.x1 - room.x0) / 2 + 0.55 + i * ((room.x1 - room.x0 - 1.1) / 5), H / 2, 0.06 + (i % 2) * 0.03]}>
            <boxGeometry args={[(room.x1 - room.x0) / 6 + 0.05, H - 0.1, 0.02]} />
            <meshStandardMaterial color="#f8e2e4" transparent opacity={0.88} roughness={1} />
          </mesh>
        ))}
      </group>
      {/* Low warm light */}
      <pointLight position={[cx, 2.4, 3.2]} intensity={2.2 + night} distance={6} decay={1.7} color="#ffc9ae" />
    </group>
  );
}

/** Alafia's own mark: a gold ring around a serif A with a lotus leaf, and the name beneath (not any real salon's logo). */
function drawMark(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, ink: string) {
  g.strokeStyle = ink;
  g.fillStyle = ink;
  g.lineWidth = r * 0.06;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  g.lineWidth = r * 0.02;
  g.beginPath(); g.arc(cx, cy, r * 0.88, 0, Math.PI * 2); g.stroke();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `500 ${Math.round(r * 1.25)}px 'Cormorant Garamond', Georgia, serif`;
  g.fillText('A', cx, cy + r * 0.08);
  // Three lotus petals over the A
  for (const k of [-1, 0, 1]) {
    g.save();
    g.translate(cx + k * r * 0.16, cy - r * 0.55);
    g.rotate(k * 0.55);
    g.beginPath(); g.ellipse(0, 0, r * 0.07, r * 0.17, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
}

/** The big wall sign behind reception: the mark, the name and the line beneath it. */
function signCanvas() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 768;
  const g = c.getContext('2d')!;
  drawMark(g, 512, 250, 190, GOLD);
  g.fillStyle = GOLD;
  g.textAlign = 'center';
  g.font = "italic 500 120px 'Cormorant Garamond', Georgia, serif";
  g.fillText(SPA_NAME, 512, 570);
  g.font = "500 34px 'DM Sans', sans-serif";
  g.fillStyle = '#b4865a';
  g.fillText('MASSAGE  ·  BEAUTY  ·  WELLNESS', 512, 670);
  return c;
}

/** The monogram on the front of the desk. */
function monogramCanvas() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  drawMark(c.getContext('2d')!, 128, 128, 100, GOLD);
  return c;
}

/** The framed print above the sofa: our own line, in rose on white. */
function printCanvas() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 640;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fffdfb';
  g.fillRect(0, 0, 512, 640);
  g.fillStyle = '#d58f9c';
  g.textAlign = 'center';
  g.font = "italic 600 92px 'Cormorant Garamond', Georgia, serif";
  ['Breathe in,', 'glow', 'out.'].forEach((t, i) => g.fillText(t, 256, 230 + i * 110));
  g.fillStyle = '#c9a25a';
  g.fillRect(206, 560, 100, 3);
  return c;
}

/** The arched mirror's outline: a rectangle with a round top, width w, straight sides up to height h. */
function archShape(w: number, h: number) {
  const s = new Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h);
  s.absarc(0, h, w / 2, 0, Math.PI, false);
  s.lineTo(-w / 2, 0);
  return s;
}

/** A white vanity with gold legs under an arched mirror lit by a soft LED halo, a blush stool before it. Faces +z. */
function Vanity() {
  const glass = useMemo(() => archShape(0.8, 0.75), []);
  const halo = useMemo(() => archShape(0.9, 0.75), []);
  return (
    <group>
      {/* Mirror and its glow, on the wall */}
      <group position={[0, 1.0, 0.02]}>
        <mesh position={[0, -0.05, 0]}><shapeGeometry args={[halo, 32]} /><meshStandardMaterial color="#fff4ea" emissive="#fff0e0" emissiveIntensity={1.6} toneMapped={false} /></mesh>
        <mesh position={[0, 0, 0.01]}><shapeGeometry args={[glass, 32]} /><meshStandardMaterial color="#d5dde0" metalness={1} roughness={0.06} /></mesh>
      </group>
      <pointLight position={[0, 1.5, 0.4]} intensity={0.9} distance={2.5} decay={2} color="#fff0e2" />
      {/* The console */}
      <mesh position={[0, 0.76, 0.22]} castShadow receiveShadow><boxGeometry args={[1.1, 0.05, 0.42]} /><meshStandardMaterial color={WHITE} roughness={0.35} /></mesh>
      <mesh position={[0, 0.66, 0.22]}><boxGeometry args={[1.04, 0.15, 0.4]} /><meshStandardMaterial color={WHITE} roughness={0.45} /></mesh>
      <mesh position={[0, 0.66, 0.425]}><boxGeometry args={[0.3, 0.015, 0.01]} /><meshStandardMaterial {...gold} /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => (
        <mesh key={`${a}${b}`} position={[a * 0.5, 0.29, 0.22 + b * 0.16]}><cylinderGeometry args={[0.012, 0.008, 0.58, 8]} /><meshStandardMaterial {...gold} /></mesh>
      ))}
      <Products p={[-0.3, 0.785, 0.16]} n={3} spread={0.22} seed={3} />
      <LittlePlant p={[0.38, 0.785, 0.15]} />
      {/* Blush velvet stool on a gold ring */}
      <group position={[0, 0, 0.72]}>
        <mesh position={[0, 0.42, 0]} castShadow><cylinderGeometry args={[0.2, 0.19, 0.12, 24]} /><meshStandardMaterial color={BLUSH} roughness={0.9} /></mesh>
        <mesh position={[0, 0.19, 0]}><cylinderGeometry args={[0.025, 0.04, 0.36, 12]} /><meshStandardMaterial {...gold} /></mesh>
        <mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.16, 0.16, 0.024, 24]} /><meshStandardMaterial {...gold} /></mesh>
      </group>
    </group>
  );
}

/** A blush velvet shell chair: a curved back of fat vertical channels round a deep cushion, on gold legs. Faces +z. */
function ShellChair() {
  const channels = 9;
  const spread = 2.7;
  return (
    <group>
      <RoundedBox args={[0.74, 0.16, 0.62]} radius={0.07} smoothness={3} position={[0, 0.42, 0.03]} castShadow><meshStandardMaterial color={BLUSH} roughness={0.95} /></RoundedBox>
      <RoundedBox args={[0.7, 0.12, 0.56]} radius={0.06} smoothness={3} position={[0, 0.3, 0.03]} castShadow><meshStandardMaterial color={ROSE} roughness={0.95} /></RoundedBox>
      {/* The shell behind the channels, so they read as one back */}
      <mesh position={[0, 0.62, 0.03]} rotation={[0, Math.PI - spread / 2, 0]} castShadow>
        <cylinderGeometry args={[0.38, 0.36, 0.42, 24, 1, true, 0, spread]} />
        <meshStandardMaterial color={ROSE} roughness={0.95} side={DoubleSide} />
      </mesh>
      {/* Channels fanning round the back, touching, the middle ones tallest */}
      {Array.from({ length: channels }, (_, i) => {
        const a = -spread / 2 + 0.15 + ((spread - 0.3) * i) / (channels - 1);
        const tall = 0.5 - Math.abs(a) * 0.09;
        return (
          <mesh key={i} position={[Math.sin(a) * 0.33, 0.4 + tall / 2, -Math.cos(a) * 0.33 + 0.03]} castShadow>
            <capsuleGeometry args={[0.072, tall - 0.144, 6, 12]} />
            <meshStandardMaterial color={BLUSH} roughness={0.95} />
          </mesh>
        );
      })}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => (
        <mesh key={`${a}${b}`} position={[a * 0.28, 0.12, 0.03 + b * 0.22]}><cylinderGeometry args={[0.015, 0.01, 0.24, 8]} /><meshStandardMaterial {...gold} /></mesh>
      ))}
    </group>
  );
}

/** A small round side table: gold frame, white top. */
function SideTable({ p }: { p: [number, number, number] }) {
  return (
    <group position={p}>
      <mesh position={[0, 0.55, 0]} castShadow><cylinderGeometry args={[0.22, 0.22, 0.025, 28]} /><meshStandardMaterial color={WHITE} roughness={0.3} /></mesh>
      <mesh position={[0, 0.535, 0]}><torusGeometry args={[0.22, 0.008, 6, 28]} /><meshStandardMaterial {...gold} /></mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return <mesh key={i} position={[Math.cos(a) * 0.15, 0.27, Math.sin(a) * 0.15]} rotation={[Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18]}><cylinderGeometry args={[0.01, 0.01, 0.55, 8]} /><meshStandardMaterial {...gold} /></mesh>;
      })}
      <LittlePlant p={[0.06, 0.565, 0.04]} size={0.8} />
    </group>
  );
}

/** Open white shelving with gold edges, stocked with products and plants. Faces +x. */
function ProductShelves() {
  const ys = [0.35, 0.8, 1.25, 1.7];
  return (
    <group>
      {[-0.88, 0.88].map((z) => <mesh key={z} position={[0, 0.9, z]} castShadow><boxGeometry args={[0.42, 1.8, 0.04]} /><meshStandardMaterial color={WHITE} roughness={0.4} /></mesh>)}
      <mesh position={[-0.2, 0.9, 0]}><boxGeometry args={[0.02, 1.8, 1.76]} /><meshStandardMaterial color={BLUSH} roughness={0.8} /></mesh>
      {ys.map((y, i) => (
        <group key={y}>
          <mesh position={[0, y, 0]} castShadow receiveShadow><boxGeometry args={[0.42, 0.03, 1.76]} /><meshStandardMaterial color={WHITE} roughness={0.4} /></mesh>
          <mesh position={[0.211, y, 0]}><boxGeometry args={[0.004, 0.03, 1.76]} /><meshStandardMaterial {...gold} /></mesh>
          <group rotation={[0, Math.PI / 2, 0]} position={[0.05, y + 0.015, 0]}>
            <Products p={[i % 2 ? -0.35 : 0.3, 0, 0]} n={4} spread={0.5} seed={i} />
            {i % 2 ? <LittlePlant p={[0.45, 0, 0]} /> : <LittlePlant p={[-0.5, 0, 0]} />}
          </group>
        </group>
      ))}
    </group>
  );
}

/** Fluted reception desk: blush half-round reeds on a gold plinth under a white top, the mark in gold on the front, an LED glow under the top. Front at −z. */
function FlutedDesk() {
  const { w, d, h } = DESK;
  const r = 0.045;
  const flute = useMemo(() => new CylinderGeometry(r, r, h - 0.14, 12, 1, false, 0, Math.PI), [h]);
  const front = Math.floor(w / (2 * r));
  const side = Math.floor(d / (2 * r));
  const monogram = useMemo(() => monogramCanvas(), []);
  const y = 0.07 + (h - 0.14) / 2;
  return (
    <group>
      <mesh position={[0, 0.035, 0]}><boxGeometry args={[w - 0.04, 0.07, d - 0.04]} /><meshStandardMaterial {...gold} /></mesh>
      <mesh position={[0, y, 0]} castShadow receiveShadow><boxGeometry args={[w - 0.1, h - 0.14, d - 0.1]} /><meshStandardMaterial color={BLUSH} roughness={0.75} /></mesh>
      {/* Reeds along the front (half-round, facing out) and the two ends */}
      {Array.from({ length: front }, (_, i) => <mesh key={`f${i}`} geometry={flute} position={[-w / 2 + r * (2 * i + 1) + (w - front * 2 * r) / 2, y, -(d - 0.1) / 2]} rotation={[0, Math.PI / 2, 0]} castShadow><meshStandardMaterial color={BLUSH} roughness={0.75} /></mesh>)}
      {[-1, 1].map((k) => Array.from({ length: side }, (_, i) => (
        <mesh key={`s${k}${i}`} geometry={flute} position={[k * (w - 0.1) / 2, y, -d / 2 + r * (2 * i + 1) + (d - side * 2 * r) / 2]} rotation={[0, k > 0 ? 0 : Math.PI, 0]}><meshStandardMaterial color={BLUSH} roughness={0.75} /></mesh>
      )))}
      {/* White top with a gold edge, and a warm glow beneath its overhang */}
      <mesh position={[0, h - 0.035, 0]} castShadow receiveShadow><boxGeometry args={[w + 0.08, 0.05, d + 0.08]} /><meshStandardMaterial color={WHITE} roughness={0.25} /></mesh>
      <mesh position={[0, h - 0.062, 0]}><boxGeometry args={[w + 0.085, 0.006, d + 0.085]} /><meshStandardMaterial {...gold} /></mesh>
      <mesh position={[0, h - 0.075, -(d - 0.1) / 2 - r - 0.002]}><boxGeometry args={[w - 0.12, 0.012, 0.01]} /><meshStandardMaterial color="#fff2e4" emissive="#ffe2c4" emissiveIntensity={2} toneMapped={false} /></mesh>
      <mesh position={[0, h * 0.55, -(d - 0.1) / 2 - r - 0.006]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.42, 0.42]} />
        <meshStandardMaterial transparent alphaTest={0.05} metalness={0.8} roughness={0.3} color="#ffffff"><canvasTexture attach="map" args={[monogram]} /></meshStandardMaterial>
      </mesh>
    </group>
  );
}

/** A slim cove of warm light all round a room's ceiling, x0…x1 by z0…z1. */
function Cove({ x0, x1, z0, z1 }: { x0: number; x1: number; z0: number; z1: number }) {
  const y = H - 0.06, inset = FACE + 0.05;
  const mat = <meshStandardMaterial color="#fff3e6" emissive="#ffd9b4" emissiveIntensity={1.8} toneMapped={false} />;
  return (
    <group>
      {[z0 + inset, z1 - inset].map((z) => <mesh key={`z${z}`} position={[(x0 + x1) / 2, y, z]}><boxGeometry args={[x1 - x0 - 2 * inset, 0.025, 0.05]} />{mat}</mesh>)}
      {[x0 + inset, x1 - inset].map((x) => <mesh key={`x${x}`} position={[x, y, (z0 + z1) / 2]}><boxGeometry args={[0.05, 0.025, z1 - z0 - 2 * inset]} />{mat}</mesh>)}
    </group>
  );
}

/**
 * Inside Alafia Spa, styled like a blush-pink beauty salon: warm oak floors, a
 * fluted blush reception desk on a gold plinth with the spa's own gold mark,
 * the mark and name large on a blush feature wall, a blush velvet sofa and a
 * shell armchair by a gold side table, an arched LED mirror over a white
 * vanity, white shelves of products and plants, a framed print, and warm cove
 * light round the ceiling. Behind: three treatment rooms (Lotus, Jasmine, and
 * the Baobab couples suite) with white beds and blush throws, magnifier lamps,
 * product trolleys, candles, oils and wooden tools. Staff and clients are
 * computer-controlled.
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
  const d = ROOM.z1 - ROOM.z0;
  // Real oak boards throughout
  const wood = useMemo(() => pbr('wood-floor', [w / 2.2, d / 2.2]), [w, d]);
  const plaster = useMemo(() => blushPlasterTexture([1, 1]), []);
  const walls = useMemo(() => spaWalls(), []);
  const sign = useMemo(() => signCanvas(), []);
  const print = useMemo(() => printCanvas(), []);
  const lotus = ROOMS[0];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow><planeGeometry args={[120, 120]} /><meshStandardMaterial color="#1c1f1e" roughness={1} /></mesh>
      <mesh position={[0, 0.001, (ROOM.z0 + ROOM.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial {...wood} />
      </mesh>
      <HotelWalls player={player} walls={walls} plaster={plaster} />

      {/* Reception: the fluted desk, with flowers, a card stand and products on top */}
      <group position={[DESK.x, 0, DESK.z]}>
        <FlutedDesk />
        <group position={[0.7, DESK.h - 0.01, 0.05]}><RealModel name="vase-flowers" fit={[0.25, 0.45, 0.25]} /></group>
        <Products p={[-0.9, DESK.h - 0.01, -0.12]} n={4} spread={0.36} seed={5} />
        <mesh position={[-0.2, DESK.h + 0.07, -0.2]} rotation={[0.25, 0, 0]}><boxGeometry args={[0.22, 0.14, 0.01]} /><meshStandardMaterial color={WHITE} roughness={0.5} /></mesh>
      </group>
      {/* The blush feature wall behind it, with the mark and name in gold and a warm wash of light from above */}
      <group position={[3.6, 0, LOBBY_Z1 - FACE]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, H / 2, 0]}><planeGeometry args={[2.8, H - 0.02]} /><meshStandardMaterial color={BLUSH} roughness={0.9} /></mesh>
        <mesh position={[0, 2.12, 0.01]}><planeGeometry args={[1.7, 1.275]} />
          <meshStandardMaterial transparent alphaTest={0.05} metalness={0.7} roughness={0.3}><canvasTexture attach="map" args={[sign]} /></meshStandardMaterial>
        </mesh>
        <mesh position={[0, H - 0.08, 0.03]}><boxGeometry args={[2.7, 0.03, 0.05]} /><meshStandardMaterial color="#fff3e6" emissive="#ffd9b4" emissiveIntensity={2} toneMapped={false} /></mesh>
        <pointLight position={[0, 2.8, 0.5]} intensity={1.6} distance={3.5} decay={2} color="#ffe0c4" />
      </group>
      <VenueNpc {...SPA_STAFF.receptionist} chatty uniform={UNIFORMS.spa} />
      <VenueNpc {...SPA_STAFF.manager} chatty uniform={UNIFORMS.black} />

      {/* Blush wall behind the waiting area, with a gold rail at dado height */}
      <mesh position={[ROOM.x0 + FACE, H / 2, (ROOM.z0 + LOBBY_Z1) / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[LOBBY_Z1 - ROOM.z0 - 0.2, H - 0.02]} />
        <meshStandardMaterial color={BLUSH} roughness={0.9} />
      </mesh>
      <mesh position={[ROOM.x0 + FACE + 0.01, 0.95, (ROOM.z0 + LOBBY_Z1) / 2]}><boxGeometry args={[0.02, 0.025, LOBBY_Z1 - ROOM.z0 - 0.2]} /><meshStandardMaterial {...gold} /></mesh>
      {/* Waiting: a blush rug, the blush velvet sofa, a white coffee table, the shell chair and a side table; the print above */}
      <mesh position={[-5.6, 0.004, -5.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[3.6, 2.2]} /><meshStandardMaterial color={BLUSH} roughness={1} /></mesh>
      <group position={[-6.2, 0, -5.9]}>
        <RealModel name="sofa-velvet-blush" fit={[2.2, 0.85, 0.9]} rotationY={0} recolor={{ match: /fabric/i, color: BLUSH }} />
      </group>
      <group position={[-6.2, 0, -4.8]}>
        <mesh position={[0, 0.4, 0]} castShadow><cylinderGeometry args={[0.4, 0.4, 0.035, 32]} /><meshStandardMaterial color={WHITE} roughness={0.25} /></mesh>
        <mesh position={[0, 0.385, 0]}><torusGeometry args={[0.4, 0.008, 6, 32]} /><meshStandardMaterial {...gold} /></mesh>
        <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.05, 0.12, 0.38, 16]} /><meshStandardMaterial {...gold} /></mesh>
        <Candle p={[0.12, 0.418, 0]} size={1.2} />
        <LittlePlant p={[-0.15, 0.418, 0.05]} />
      </group>
      <group position={[SHELL_CHAIR[0], 0, SHELL_CHAIR[1]]} rotation={[0, -0.3, 0]}><ShellChair /></group>
      <SideTable p={[SIDE_TABLE[0], 0, SIDE_TABLE[1]]} />
      <group position={[-6.2, 1.75, ROOM.z0 + FACE + 0.01]}>
        <mesh><boxGeometry args={[0.66, 0.82, 0.03]} /><meshStandardMaterial {...gold} /></mesh>
        <mesh position={[0, 0, 0.017]}><planeGeometry args={[0.6, 0.75]} /><meshStandardMaterial><canvasTexture attach="map" args={[print]} /></meshStandardMaterial></mesh>
      </group>
      {/* Products and plants on the white shelves */}
      <group position={[-8.6, 0, -4.0]}><ProductShelves /></group>
      {/* The vanity on the far wall */}
      <group position={[ROOM.x1 - FACE, 0, VANITY_Z]} rotation={[0, -Math.PI / 2, 0]}><Vanity /></group>
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

      {/* The ceiling over everything, downlights, and warm cove light round reception */}
      <group position={[0, 0, (ROOM.z0 + ROOM.z1) / 2]}>
        <Ceiling width={w} depth={d} height={H} color="#f8f1ee">
          {[-6, -2, 2, 6].map((x) => <Downlight key={x} x={x} z={(ROOM.z0 + LOBBY_Z1) / 2 - (ROOM.z0 + ROOM.z1) / 2} />)}
          {ROOMS.map((r) => <Downlight key={r.id} x={roomDoorX(r)} z={1.2} />)}
        </Ceiling>
      </group>
      <Cove x0={ROOM.x0} x1={ROOM.x1} z0={ROOM.z0} z1={LOBBY_Z1} />
      <hemisphereLight args={['#fff0ea', '#6a5050', 0.5]} />
      <pointLight position={[0, 2.6, -4]} intensity={5 + 2 * night} distance={14} decay={1.5} color="#ffe6d2" />
      {children}
    </group>
  );
}
