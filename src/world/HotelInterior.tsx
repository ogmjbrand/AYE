import { Suspense, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { DoubleSide, MeshStandardMaterial, type Group, type Mesh, type Texture } from 'three';
import type { GameTime } from '../lib/gameState';
import type { PlayerHandle } from '../hooks/usePlayerController';
import { lightingAt } from './timeOfDay';
import {
  BUILDING, CORRIDOR, DESK, DOOR_W, GUEST_ROOM, HOTEL_NAME, LOBBY, RECEPTIONIST, ROOMS, ROOM_PLAN, STOREY, VENDING, hotelWalls, roomById, roomDoor, roomPoint, type HotelRoom,
} from '../lib/hotel';
import { RealModel } from './RealModel';
import { HotelDish } from './HotelDishes';
import { WALL_T, wallBox, type WallSeg } from '../lib/university';
import {
  bathFloorTexture, curtainTexture, damaskTexture, flowerPrintTexture, hotelPlasterTexture, parquetTexture, rugTexture, stoneTileTexture, tileBorderTexture,
} from './hotelTextures';
import { skyMoodAt, skylineTexture } from './venueTextures';
import { VenueNpc } from './VenueNpc';
import { UNIFORMS } from '../lib/uniforms';
import { Ceiling, Downlight } from './VenueShell';

const H = STOREY;
const DARK_WOOD = '#4a3a30';
const WALNUT = '#5a4636';
const CHROME = '#d4d7da';
/** A wall's inner face, from its centre line (walls are WALL_T thick), plus a hair. */
const FACE = WALL_T / 2 + 0.01;

/** Does the line from the camera to the player cross this box? (Then the wall hides, so you can always see yourself.) */
function crosses(ax: number, az: number, bx: number, bz: number, cx: number, cz: number, hx: number, hz: number) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dz = bz - az;
  for (const [p, d, lo, hi] of [[ax, dx, cx - hx, cx + hx], [az, dz, cz - hz, cz + hz]] as const) {
    if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return false; continue; }
    let ta = (lo - p) / d, tb = (hi - p) / d;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}

/**
 * Things fixed to a wall (a fire, a television, prints): hidden along with the
 * wall whenever it's hidden for the camera, so nothing floats in mid-air.
 */
function OnWall({ player, x0, z0, x1, z1, children }: { player: PlayerHandle; x0: number; z0: number; x1: number; z1: number; children: ReactNode }) {
  const ref = useRef<Group>(null);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hx = Math.abs(x1 - x0) / 2, hz = Math.abs(z1 - z0) / 2;
  useFrame(({ camera }) => {
    if (!ref.current) return;
    const px = player.position.x, pz = player.position.z;
    const len = Math.hypot(camera.position.x - px, camera.position.z - pz) || 1;
    const ex = px + ((camera.position.x - px) / len) * 0.45, ez = pz + ((camera.position.z - pz) / len) * 0.45;
    ref.current.visible = !crosses(ex, ez, camera.position.x, camera.position.z, cx, cz, hx + WALL_SLACK, hz + WALL_SLACK);
  });
  return <group ref={ref}>{children}</group>;
}

/** How far beside the camera's line a wall still hides (inside, the camera sits close behind you). */
const WALL_SLACK = 1.0;

/** Every wall in cream plaster with a white skirting, each hidden while it stands between the camera and you. */
function HotelWalls({ player, walls, plaster }: { player: PlayerHandle; walls: readonly WallSeg[]; plaster: Texture }) {
  const boxes = useMemo(() => walls.map((w) => wallBox(w)), [walls]);
  const refs = useRef<(Group | null)[]>([]);
  const mat = useMemo(() => new MeshStandardMaterial({ map: plaster, roughness: 0.85 }), [plaster]);
  const skirting = useMemo(() => new MeshStandardMaterial({ color: '#f2efe8', roughness: 0.5 }), []);
  useFrame(({ camera }) => {
    const px = player.position.x, pz = player.position.z;
    const len = Math.hypot(camera.position.x - px, camera.position.z - pz) || 1;
    const ex = px + ((camera.position.x - px) / len) * 0.45, ez = pz + ((camera.position.z - pz) / len) * 0.45;
    boxes.forEach((b, i) => {
      const g = refs.current[i];
      if (g) g.visible = !crosses(ex, ez, camera.position.x, camera.position.z, b.x, b.z, b.sx / 2 + WALL_SLACK, b.sz / 2 + WALL_SLACK);
    });
  });
  return (
    <>
      {boxes.map((b, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }} position={[b.x, 0, b.z]}>
          <mesh position={[0, H / 2, 0]} material={mat} castShadow receiveShadow><boxGeometry args={[b.sx, H, b.sz]} /></mesh>
          <mesh position={[0, 0.05, 0]} material={skirting}><boxGeometry args={[b.sx + 0.02, 0.1, b.sz + 0.02]} /></mesh>
        </group>
      ))}
    </>
  );
}

/** A dark wood door with a chrome lever and its number, open or shut, set in the corridor wall. */
function RoomDoor({ room, open, dnd }: { room: HotelRoom; open: boolean; dnd: boolean }) {
  const [x, z] = roomDoor(room);
  // The leaf hinges on the corridor side and swings into the room
  const face = room.side > 0 ? -1 : 1;
  return (
    <group position={[x, 0, z]}>
      {/* Frame */}
      {[-(DOOR_W / 2 + 0.02), DOOR_W / 2 + 0.02].map((dz) => <mesh key={dz} position={[0, 1.08, dz]}><boxGeometry args={[0.2, 2.16, 0.06]} /><meshStandardMaterial color={DARK_WOOD} roughness={0.5} /></mesh>)}
      <mesh position={[0, 2.18, 0]}><boxGeometry args={[0.2, 0.06, DOOR_W + 0.1]} /><meshStandardMaterial color={DARK_WOOD} roughness={0.5} /></mesh>
      <group position={[0, 0, DOOR_W / 2]} rotation={[0, open ? -room.side * Math.PI / 2 : 0, 0]}>
        <mesh position={[0, 1.05, -DOOR_W / 2]} castShadow><boxGeometry args={[0.05, 2.1, DOOR_W - 0.04]} /><meshStandardMaterial color={WALNUT} roughness={0.45} /></mesh>
        {/* Two inlaid grooves, as in the reference */}
        {[-DOOR_W * 0.7, -DOOR_W * 0.3].map((dz) => <mesh key={dz} position={[face * 0.027, 1.05, dz]}><boxGeometry args={[0.004, 1.9, 0.015]} /><meshStandardMaterial color="#2a201a" /></mesh>)}
        <mesh position={[face * 0.05, 1.0, -DOOR_W + 0.12]}><boxGeometry args={[0.04, 0.03, 0.16]} /><meshStandardMaterial color={CHROME} metalness={0.9} roughness={0.2} /></mesh>
        {dnd && <mesh position={[face * 0.07, 0.86, -DOOR_W + 0.12]}><boxGeometry args={[0.005, 0.22, 0.08]} /><meshStandardMaterial color="#c8202a" /></mesh>}
      </group>
      {/* Room number on the wall beside the door */}
      <mesh position={[face * 0.09, 1.55, -(DOOR_W / 2 + 0.25)]} rotation={[0, face * Math.PI / 2, 0]}>
        <planeGeometry args={[0.18, 0.1]} />
        <meshStandardMaterial color="#c9a052" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

/** A wall-hung fire: a black frame with glowing flames, on the damask wall. */
function WallFire({ lit }: { lit: number }) {
  const flames = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (flames.current) flames.current.scale.y = 0.85 + Math.sin(clock.elapsedTime * 7) * 0.08 + Math.sin(clock.elapsedTime * 13) * 0.05;
  });
  return (
    <group>
      <mesh position={[0, 0, 0.05]} castShadow><boxGeometry args={[1.3, 0.55, 0.1]} /><meshStandardMaterial color="#161616" roughness={0.4} /></mesh>
      <mesh position={[0, 0, 0.101]}><planeGeometry args={[1.05, 0.32]} /><meshStandardMaterial color="#2a2a2a" roughness={0.1} metalness={0.4} /></mesh>
      <mesh ref={flames} position={[0, -0.04, 0.104]}>
        <planeGeometry args={[0.95, 0.18]} />
        <meshStandardMaterial color="#ffb24a" emissive="#ff8a20" emissiveIntensity={2.2 + lit} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, -0.13, 0.104]}><planeGeometry args={[0.95, 0.04]} /><meshStandardMaterial color="#cfc6b6" /></mesh>
    </group>
  );
}

/** A bench in tan buttoned leather on a slim dark steel frame. */
function LeatherBench({ length = 1.3 }: { length?: number }) {
  return (
    <group>
      <RoundedBox args={[length, 0.12, 0.42]} radius={0.04} smoothness={3} position={[0, 0.44, 0]} castShadow><meshStandardMaterial color="#a8724a" roughness={0.55} /></RoundedBox>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (length / 2 - 0.05), 0, 0]}>
          <mesh position={[0, 0.19, -0.18]}><boxGeometry args={[0.025, 0.38, 0.025]} /><meshStandardMaterial color="#3a3d42" metalness={0.6} roughness={0.4} /></mesh>
          <mesh position={[0, 0.19, 0.18]}><boxGeometry args={[0.025, 0.38, 0.025]} /><meshStandardMaterial color="#3a3d42" metalness={0.6} roughness={0.4} /></mesh>
          <mesh position={[0, 0.02, 0]}><boxGeometry args={[0.025, 0.025, 0.4]} /><meshStandardMaterial color="#3a3d42" metalness={0.6} roughness={0.4} /></mesh>
        </group>
      ))}
    </group>
  );
}

/** A teal ceramic table lamp with a white drum shade, lit. */
function TealLamp({ lit }: { lit: number }) {
  return (
    <group>
      <mesh position={[0, 0.15, 0]} castShadow><sphereGeometry args={[0.11, 20, 14]} /><meshStandardMaterial color="#3fa59a" roughness={0.2} /></mesh>
      <mesh position={[0, 0.29, 0]}><cylinderGeometry args={[0.025, 0.04, 0.08, 12]} /><meshStandardMaterial color="#3fa59a" roughness={0.2} /></mesh>
      <mesh position={[0, 0.43, 0]}>
        <cylinderGeometry args={[0.15, 0.17, 0.22, 28, 1, true]} />
        <meshStandardMaterial color="#f4efe4" emissive="#ffe2b0" emissiveIntensity={0.35 + lit * 0.7} side={DoubleSide} />
      </mesh>
    </group>
  );
}

/** A grey fabric armchair with a red cushion, on dark wood legs. */
function Armchair() {
  return (
    <group>
      <RoundedBox args={[0.56, 0.1, 0.52]} radius={0.04} smoothness={3} position={[0, 0.44, 0]} castShadow><meshStandardMaterial color="#9a958c" roughness={0.95} /></RoundedBox>
      <RoundedBox args={[0.58, 0.5, 0.1]} radius={0.05} smoothness={3} position={[0, 0.72, -0.24]} castShadow><meshStandardMaterial color="#9a958c" roughness={0.95} /></RoundedBox>
      {[-1, 1].map((s) => <RoundedBox key={s} args={[0.08, 0.22, 0.46]} radius={0.03} smoothness={2} position={[s * 0.27, 0.58, -0.02]}><meshStandardMaterial color="#9a958c" roughness={0.95} /></RoundedBox>)}
      <RoundedBox args={[0.32, 0.26, 0.1]} radius={0.04} smoothness={2} position={[0, 0.64, -0.15]} rotation={[-0.25, 0, 0]}><meshStandardMaterial color="#b8443a" roughness={0.9} /></RoundedBox>
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} position={[sx * 0.22, 0.2, sz * 0.2]} rotation={[sz * 0.08, 0, -sx * 0.08]}><cylinderGeometry args={[0.018, 0.014, 0.4, 8]} /><meshStandardMaterial color={DARK_WOOD} /></mesh>
      )))}
    </group>
  );
}

/** The guest room, furnished: every room in the hotel is built from this same plan and these same materials. */
function GuestRoom({ room, player, gameTime, lit, tray }: { room: HotelRoom; player: PlayerHandle; gameTime: GameTime; lit: number; tray: readonly string[] }) {
  const P = ROOM_PLAN;
  const at = (u: number, v: number, y = 0): [number, number, number] => { const [x, z] = roomPoint(room, u, v); return [x, y, z]; };
  // Facing the room's +u (towards the window) and +v (towards the bed wall), in the building's frame
  const faceU = room.side > 0 ? Math.PI / 2 : -Math.PI / 2;
  const faceV = 0;
  const damask = useMemo(() => damaskTexture([2, 2.5]), []);
  const tiles = useMemo(() => stoneTileTexture([2, 1]), []);
  const border = useMemo(() => tileBorderTexture([5, 1]), []);
  const bathFloor = useMemo(() => bathFloorTexture([4, 4]), []);
  const rug = useMemo(() => rugTexture(), []);
  const curtain = useMemo(() => curtainTexture(), []);
  const prints = useMemo(() => [flowerPrintTexture(0), flowerPrintTexture(1), flowerPrintTexture(2)], []);
  const l = lightingAt(gameTime.hour, gameTime.minute);
  const sky = skylineTexture(skyMoodAt(l.night, gameTime.hour), 23);
  const s = room.side;
  /** The wall at v (along the room) or at u (across it), as a box in the building's frame, for OnWall. */
  const wallAtV = (v: number, u0: number, u1: number) => { const [ax, az] = roomPoint(room, u0, v), [bx, bz] = roomPoint(room, u1, v); return { x0: ax, z0: az, x1: bx, z1: bz }; };
  const wallAtU = (u: number, v0: number, v1: number) => { const [ax, az] = roomPoint(room, u, v0), [bx, bz] = roomPoint(room, u, v1); return { x0: ax, z0: az, x1: bx, z1: bz }; };
  return (
    <group>
      {/* Bathroom floor tiles */}
      <mesh position={at((P.bath.u0 + P.bath.u1) / 2, (P.bath.v0 + P.bath.v1) / 2, 0.004)} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[P.bath.u1 - P.bath.u0, P.bath.v1 - P.bath.v0]} />
        <meshStandardMaterial map={bathFloor} roughness={0.35} />
      </mesh>
      {/* Bathroom walls: stone tiles to the dado and the carved border, on every side of the room */}
      {[
        { p: at(P.bath.u1 - FACE, (P.bath.v0 + P.bath.v1) / 2), r: s > 0 ? -Math.PI / 2 : Math.PI / 2, w: P.bath.v1 - P.bath.v0 },
        { p: at(FACE, (P.bath.v0 + P.bath.v1) / 2), r: s > 0 ? Math.PI / 2 : -Math.PI / 2, w: P.bath.v1 - P.bath.v0 },
        { p: at((P.bath.u0 + P.bath.u1) / 2, P.bath.v1 - FACE), r: Math.PI, w: P.bath.u1 - P.bath.u0 },
      ].map((wall, i) => (
        <group key={i} position={wall.p} rotation={[0, wall.r, 0]}>
          <mesh position={[0, 0.6, 0]}><planeGeometry args={[wall.w - 0.04, 1.2]} /><meshStandardMaterial map={tiles} roughness={0.4} /></mesh>
          <mesh position={[0, 1.25, 0.002]}><planeGeometry args={[wall.w - 0.04, 0.1]} /><meshStandardMaterial map={border} roughness={0.5} /></mesh>
        </group>
      ))}
      {/* Toilet */}
      <group position={at(P.toilet.u, P.toilet.v - 0.12)} rotation={[0, Math.PI, 0]}>
        <RoundedBox args={[0.38, 0.4, 0.5]} radius={0.12} smoothness={4} position={[0, 0.2, 0.05]} castShadow><meshStandardMaterial color="#f6f6f2" roughness={0.15} /></RoundedBox>
        <RoundedBox args={[0.4, 0.06, 0.48]} radius={0.03} smoothness={3} position={[0, 0.43, 0.06]}><meshStandardMaterial color="#f6f6f2" roughness={0.15} /></RoundedBox>
        <RoundedBox args={[0.42, 0.42, 0.18]} radius={0.06} smoothness={3} position={[0, 0.62, -0.18]} castShadow><meshStandardMaterial color="#f6f6f2" roughness={0.15} /></RoundedBox>
      </group>
      {/* Vanity: walnut cabinet, white basin and chrome tap, mirror in a textured white frame */}
      <group position={at(P.bath.u1 - FACE - 0.26, P.basin.v)} rotation={[0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
        <mesh position={[0, 0.55, 0.03]} castShadow><boxGeometry args={[0.9, 0.5, 0.46]} /><meshStandardMaterial color="#8a5a32" roughness={0.5} /></mesh>
        <RoundedBox args={[0.94, 0.08, 0.5]} radius={0.03} smoothness={3} position={[0, 0.84, 0.03]}><meshStandardMaterial color="#f6f6f2" roughness={0.15} /></RoundedBox>
        <mesh position={[0, 0.875, 0.06]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.5, 0.3]} /><meshStandardMaterial color="#e8e8e4" roughness={0.1} /></mesh>
        <mesh position={[0, 0.95, -0.15]}><cylinderGeometry args={[0.015, 0.02, 0.14, 12]} /><meshStandardMaterial color={CHROME} metalness={0.95} roughness={0.15} /></mesh>
        <mesh position={[0, 1.6, -0.21]}><boxGeometry args={[0.72, 0.9, 0.05]} /><meshStandardMaterial color="#efece4" roughness={0.9} /></mesh>
        <mesh position={[0, 1.6, -0.18]}><planeGeometry args={[0.58, 0.76]} /><meshStandardMaterial color="#c9d4da" metalness={0.9} roughness={0.05} /></mesh>
      </group>
      {/* Heated towel rail with towels */}
      <group position={at(FACE, 1.6)} rotation={[0, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
        {[0.6, 0.85, 1.1, 1.35].map((y) => <mesh key={y} position={[0, y, 0.08]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.012, 0.012, 0.6, 8]} /><meshStandardMaterial color={CHROME} metalness={0.9} roughness={0.25} /></mesh>)}
        {[-0.3, 0.3].map((x) => <mesh key={x} position={[x, 0.95, 0.08]}><cylinderGeometry args={[0.015, 0.015, 0.95, 8]} /><meshStandardMaterial color={CHROME} metalness={0.9} roughness={0.25} /></mesh>)}
        <mesh position={[0, 0.8, 0.11]}><boxGeometry args={[0.5, 0.6, 0.04]} /><meshStandardMaterial color="#f4f2ee" roughness={1} /></mesh>
      </group>

      {/* Entrance: the damask feature wall with the wall fire and a leather bench below */}
      <OnWall player={player} {...wallAtV(-3, 0, 2.4)}>
        <group position={at(1.2, -3 + FACE)} rotation={[0, faceV, 0]}>
          <mesh position={[0, H / 2, 0]}><planeGeometry args={[2.3, H - 0.02]} /><meshStandardMaterial map={damask} roughness={0.8} /></mesh>
          <group position={[0, 1.35, 0]}><WallFire lit={lit} /></group>
        </group>
      </OnWall>
      <group position={at(1.2, -3 + FACE + 0.3)}><LeatherBench /></group>
      {/* Wardrobe with sliding walnut doors on the corridor wall */}
      <OnWall player={player} {...wallAtU(0, P.wardrobe.v0, P.wardrobe.v1)}>
      <group position={at(P.wardrobe.depth / 2 + FACE, (P.wardrobe.v0 + P.wardrobe.v1) / 2)} rotation={[0, faceU, 0]}>
        <mesh position={[0, 1.1, 0]} castShadow><boxGeometry args={[P.wardrobe.v1 - P.wardrobe.v0, 2.2, P.wardrobe.depth]} /><meshStandardMaterial color="#5c4130" roughness={0.45} /></mesh>
        {[-1, 1].map((k) => <mesh key={k} position={[k * 0.01, 1.1, P.wardrobe.depth / 2 + 0.005]}><boxGeometry args={[0.02, 2.15, 0.01]} /><meshStandardMaterial color={CHROME} metalness={0.9} roughness={0.2} /></mesh>)}
      </group>
      </OnWall>

      {/* Rug under the bed */}
      <mesh position={at(4.7, 0.8, 0.006)} rotation={[-Math.PI / 2, 0, room.side > 0 ? 0 : Math.PI]} receiveShadow>
        <planeGeometry args={[3.0, 3.6]} />
        <meshStandardMaterial map={rug} roughness={1} />
      </mesh>
      {/* The bed: grey upholstered base, white sheets, a lavender cover and a deep purple throw, four pillows; headboard on the wall */}
      <group position={at(P.bed.u, (P.bed.v0 + P.bed.v1) / 2)} rotation={[0, Math.PI, 0]}>
        <RoundedBox args={[P.bed.w + 0.1, 0.32, 2.15]} radius={0.05} smoothness={3} position={[0, 0.2, 0]} castShadow><meshStandardMaterial color="#c9c3ba" roughness={0.95} /></RoundedBox>
        <RoundedBox args={[P.bed.w - 0.04, 0.22, 2.0]} radius={0.08} smoothness={3} position={[0, 0.47, 0.02]}><meshStandardMaterial color="#f4f2ee" roughness={0.9} /></RoundedBox>
        <RoundedBox args={[P.bed.w + 0.02, 0.06, 1.25]} radius={0.03} smoothness={3} position={[0, 0.6, 0.38]}><meshStandardMaterial color="#8f8fcf" roughness={0.9} /></RoundedBox>
        <RoundedBox args={[0.7, 0.07, 1.35]} radius={0.03} smoothness={2} position={[0.05, 0.64, 0.4]} rotation={[0, 0.08, 0]}><meshStandardMaterial color="#5f5aa8" roughness={0.9} /></RoundedBox>
        {[-0.42, 0.42].flatMap((x) => [[-0.82, 0.62, 0.0], [-0.62, 0.68, 0.3]].map(([z, y, tilt]) => (
          <RoundedBox key={`${x}${z}`} args={[0.7, 0.16, 0.4]} radius={0.07} smoothness={3} position={[x, y, z]} rotation={[-tilt, 0, 0]}><meshStandardMaterial color="#f7f6f2" roughness={0.9} /></RoundedBox>
        )))}
      </group>
      <OnWall player={player} {...wallAtV(3, 2.4, 7)}>
      <group position={at(P.bed.u, 3 - FACE - 0.05)} rotation={[0, Math.PI, 0]}>
        <RoundedBox args={[P.bed.w + 0.3, 1.0, 0.1]} radius={0.04} smoothness={3} position={[0, 0.9, 0]}><meshStandardMaterial color="#d8d2c8" roughness={0.95} /></RoundedBox>
        {/* White panels either side, behind the nightstands */}
        {[-1, 1].map((k) => <mesh key={k} position={[k * (P.bed.w / 2 + 0.75), 0.75, 0.02]}><boxGeometry args={[0.9, 1.3, 0.04]} /><meshStandardMaterial color="#f4f2ee" roughness={0.4} /></mesh>)}
      </group>
      {/* Nightstands with teal lamps; three flower prints over the bed */}
      {[3.35, 6.05].map((u) => (
        <group key={u} position={at(u, 3 - FACE - 0.25)} rotation={[0, Math.PI, 0]}>
          <mesh position={[0, 0.42, 0]} castShadow><boxGeometry args={[0.5, 0.18, 0.42]} /><meshStandardMaterial color="#f4f2ee" roughness={0.3} /></mesh>
          <mesh position={[0, 0.27, 0]}><boxGeometry args={[0.5, 0.12, 0.42]} /><meshStandardMaterial color={DARK_WOOD} roughness={0.5} /></mesh>
          <group position={[0, 0.51, 0]}><TealLamp lit={lit} /></group>
        </group>
      ))}
      {[3.7, 4.7, 5.75].map((u, i) => (
        <group key={u} position={at(u, 3 - FACE - 0.02, i === 2 ? 1.95 : 1.9)} rotation={[0, Math.PI, 0]}>
          <mesh position={[0, 0, -0.01]}><boxGeometry args={i === 2 ? [0.6, 0.78, 0.03] : [0.48, 0.64, 0.03]} /><meshStandardMaterial color="#141414" /></mesh>
          <mesh position={[0, 0, 0.007]}><planeGeometry args={i === 2 ? [0.54, 0.72] : [0.42, 0.58]} /><meshStandardMaterial map={prints[i]} /></mesh>
        </group>
      ))}
      </OnWall>

      {/* Dresser: white doors under a dark wood top, a telephone and a bottle of water; the television above */}
      <OnWall player={player} {...wallAtV(-3, P.dresser.u0, P.dresser.u1)}>
      <group position={at((P.dresser.u0 + P.dresser.u1) / 2, -3 + P.dresser.depth / 2 + FACE)} rotation={[0, faceV, 0]}>
        <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[P.dresser.u1 - P.dresser.u0, 0.72, P.dresser.depth]} /><meshStandardMaterial color="#f4f2ee" roughness={0.3} /></mesh>
        <mesh position={[0, 0.79, 0]}><boxGeometry args={[P.dresser.u1 - P.dresser.u0 + 0.04, 0.05, P.dresser.depth + 0.04]} /><meshStandardMaterial color={DARK_WOOD} roughness={0.5} /></mesh>
        {[-0.45, 0, 0.45].map((x) => <mesh key={x} position={[x + 0.18, 0.5, P.dresser.depth / 2 + 0.01]}><boxGeometry args={[0.02, 0.24, 0.02]} /><meshStandardMaterial color={CHROME} metalness={0.9} roughness={0.2} /></mesh>)}
        <mesh position={[-0.6, 0.86, 0]}><boxGeometry args={[0.22, 0.07, 0.18]} /><meshStandardMaterial color="#1a1a1a" roughness={0.4} /></mesh>
        <mesh position={[0.7, 0.93, -0.08]}><cylinderGeometry args={[0.035, 0.035, 0.22, 12]} /><meshStandardMaterial color="#cfe0f0" roughness={0.1} transparent opacity={0.75} /></mesh>
        <mesh position={[0, 1.75, -P.dresser.depth / 2 + 0.03]}><boxGeometry args={[1.3, 0.75, 0.05]} /><meshStandardMaterial color="#141414" roughness={0.3} /></mesh>
        <mesh position={[0, 1.75, -P.dresser.depth / 2 + 0.056]}><planeGeometry args={[1.24, 0.69]} /><meshStandardMaterial color="#26282c" roughness={0.1} metalness={0.4} /></mesh>
        {/* Room service, left on the dresser top between the telephone and the water */}
        <Suspense fallback={null}>
          {tray.slice(-3).map((id, i) => <group key={`${id}${i}`} position={[-0.25 + i * 0.36, 0.815, 0.02]}><HotelDish id={id} /></group>)}
        </Suspense>
      </group>
      </OnWall>
      {/* Luggage bench in dark wood with a duffel bag */}
      <group position={at((P.bench.u0 + P.bench.u1) / 2, -3 + FACE + 0.22)} rotation={[0, faceV, 0]}>
        <mesh position={[0, 0.42, 0]} castShadow><boxGeometry args={[P.bench.u1 - P.bench.u0, 0.05, 0.42]} /><meshStandardMaterial color={DARK_WOOD} roughness={0.5} /></mesh>
        {[-1, 1].map((k) => <mesh key={k} position={[k * ((P.bench.u1 - P.bench.u0) / 2 - 0.03), 0.21, 0]}><boxGeometry args={[0.05, 0.42, 0.42]} /><meshStandardMaterial color={DARK_WOOD} roughness={0.5} /></mesh>)}
        <RoundedBox args={[0.62, 0.28, 0.3]} radius={0.12} smoothness={4} position={[0, 0.6, 0]} castShadow><meshStandardMaterial color="#3e4150" roughness={0.9} /></RoundedBox>
        <mesh position={[0, 0.78, 0]} rotation={[0, 0, 0]}><torusGeometry args={[0.16, 0.012, 6, 16, Math.PI]} /><meshStandardMaterial color="#6a4628" /></mesh>
      </group>

      {/* The window wall: floor-to-ceiling glass onto the city, dark frames, brown curtains drawn back */}
      <OnWall player={player} {...wallAtU(P.window, -3, 3)}>
      <group position={at(P.window - FACE, 0)} rotation={[0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
        <mesh position={[0, 1.45, 0]}><planeGeometry args={[3.2, 2.7]} /><meshStandardMaterial map={sky} emissiveMap={sky} emissive="#ffffff" emissiveIntensity={0.6} roughness={0.1} toneMapped={false} /></mesh>
        {[-1.6, -0.55, 0.55, 1.6].map((x) => <mesh key={x} position={[x, 1.45, 0.02]}><boxGeometry args={[0.06, 2.7, 0.05]} /><meshStandardMaterial color="#1e1e1e" roughness={0.4} /></mesh>)}
        {[0.12, 2.78].map((y) => <mesh key={y} position={[0, y, 0.02]}><boxGeometry args={[3.24, 0.06, 0.05]} /><meshStandardMaterial color="#1e1e1e" roughness={0.4} /></mesh>)}
        {[-1, 1].map((k) => (
          <mesh key={k} position={[k * 2.1, 1.45, 0.1]}><boxGeometry args={[0.9, 2.85, 0.12]} /><meshStandardMaterial map={curtain} roughness={0.95} /></mesh>
        ))}
      </group>
      </OnWall>
      {/* Two armchairs and a round side table with flowers by the window */}
      {P.armchairs.map((a, i) => (
        <group key={i} position={at(a.u, a.v)} rotation={[0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}><Armchair /></group>
      ))}
      <group position={at(P.sideTable.u, P.sideTable.v)}>
        <mesh position={[0, 0.52, 0]}><cylinderGeometry args={[0.24, 0.24, 0.03, 28]} /><meshStandardMaterial color="#2a2c30" roughness={0.3} /></mesh>
        <mesh position={[0, 0.26, 0]}><cylinderGeometry args={[0.018, 0.018, 0.5, 8]} /><meshStandardMaterial color="#2a2c30" metalness={0.6} /></mesh>
        <mesh position={[0, 0.02, 0]}><torusGeometry args={[0.2, 0.012, 6, 24]} /><meshStandardMaterial color="#2a2c30" metalness={0.6} /></mesh>
        <mesh position={[0, 0.64, 0]}><cylinderGeometry args={[0.04, 0.05, 0.2, 14]} /><meshStandardMaterial color="#f4f2ee" roughness={0.2} /></mesh>
        {[-0.03, 0.02, 0.05].map((x, k) => (
          <group key={k} position={[x, 0.85 + k * 0.04, 0]}>
            <mesh><cylinderGeometry args={[0.004, 0.004, 0.3, 5]} /><meshStandardMaterial color="#4f7a3a" /></mesh>
            <mesh position={[0, 0.17, 0]}><coneGeometry args={[0.03, 0.08, 10, 1, true]} /><meshStandardMaterial color="#f7f6f0" side={DoubleSide} /></mesh>
          </group>
        ))}
      </group>

      {/* The tray ceiling over the bedroom: a lit, recessed panel with downlights round it */}
      <group position={at(4.7, 0, 0)}>
        <Ceiling width={4.4} depth={5.6} height={H} color="#f0ebe2">
          <mesh position={[0, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2.6, 3.4]} />
            <meshStandardMaterial color="#ffffff" emissive="#fff4e0" emissiveIntensity={0.5 + 0.6 * lit} />
          </mesh>
          {[-1, 1].flatMap((a) => [-1, 1].map((b) => <Downlight key={`${a}${b}`} x={a * 1.7} z={b * 2.3} />))}
        </Ceiling>
      </group>
      {/* Lamps light the room warmly; the window brings in the day */}
      <pointLight position={at(4.7, 0.4, 2.5)} intensity={5 * lit + 2} distance={8} decay={1.6} color="#ffe6c4" />
      <pointLight position={at(6.4, -0.5, 2.0)} intensity={3 * (1 - l.night) + 1} distance={6} decay={1.6} color="#e8f0ff" />
      <pointLight position={at(1.2, -1.8, 2.2)} intensity={2.5 * lit + 1} distance={5} decay={1.6} color="#ffd9a0" />
      <pointLight position={at(1.2, 1.8, 2.3)} intensity={2 * lit + 1.5} distance={4} decay={1.6} color="#fff4e6" />
    </group>
  );
}

/**
 * Inside the Grand Lagoon Hotel: the lobby with its front desk, the corridor
 * of identical rooms, and your room (102) furnished when you have its key.
 * Every floor is the same oak parquet and every wall the same cream plaster,
 * with the same damask, doors and lights throughout. The receptionist is
 * computer-controlled.
 */
export function HotelInterior({ gameTime, player, hasKey, tray = [], children }: {
  gameTime: GameTime; player: PlayerHandle; hasKey: boolean;
  /** Room service waiting in your room (menu ids, oldest first). */
  tray?: readonly string[];
  children: ReactNode;
}) {
  const l = lightingAt(gameTime.hour, gameTime.minute);
  const lit = 0.6 + 0.4 * l.night;
  const w = BUILDING.x1 - BUILDING.x0, d = BUILDING.z1 - BUILDING.z0;
  const parquet = useMemo(() => parquetTexture([w / 1.6, d / 1.6]), [w, d]);
  const plaster = useMemo(() => hotelPlasterTexture([1, 1]), []);
  const damask = useMemo(() => damaskTexture([5, 2.5]), []);
  const walls = useMemo(() => hotelWalls(), []);
  const guest = roomById(GUEST_ROOM)!;
  const sign = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 200;
    const g = c.getContext('2d')!;
    g.fillStyle = '#c9a052';
    g.textAlign = 'center';
    g.font = "600 92px 'Cormorant Garamond', Georgia, serif";
    g.fillText(HOTEL_NAME.toUpperCase(), 512, 110);
    g.font = "500 34px 'DM Sans', sans-serif";
    g.fillStyle = '#8a7046';
    g.fillText('AYEMARA · RECEPTION', 512, 170);
    return c;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#1c1f1e" roughness={1} />
      </mesh>
      {/* One parquet floor right through: lobby, corridor and every room */}
      <mesh position={[(BUILDING.x0 + BUILDING.x1) / 2, 0.001, (BUILDING.z0 + BUILDING.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={parquet} roughness={0.45} />
      </mesh>
      <HotelWalls player={player} walls={walls} plaster={plaster} />

      {/* Lobby: damask on the wall behind the desk with the hotel's name, the desk, sofas and a wall fire */}
      <group position={[BUILDING.x1 - FACE, 0, (LOBBY.z0 + LOBBY.z1) / 2]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, H / 2, 0]}><planeGeometry args={[LOBBY.z1 - LOBBY.z0 - 0.2, H - 0.02]} /><meshStandardMaterial map={damask} roughness={0.8} /></mesh>
        <mesh position={[0, 2.25, 0.01]}>
          <planeGeometry args={[3.2, 0.62]} />
          <meshStandardMaterial transparent alphaTest={0.05} roughness={0.4} metalness={0.4}>
            <canvasTexture attach="map" args={[sign]} />
          </meshStandardMaterial>
        </mesh>
      </group>
      <group position={[DESK.x, 0, DESK.z]}>
        <mesh position={[0, DESK.h / 2, 0]} castShadow receiveShadow><boxGeometry args={[DESK.w, DESK.h, DESK.d]} /><meshStandardMaterial color={WALNUT} roughness={0.45} /></mesh>
        <mesh position={[0, DESK.h + 0.03, 0]}><boxGeometry args={[DESK.w + 0.1, 0.06, DESK.d + 0.1]} /><meshStandardMaterial color="#e9dfcf" roughness={0.25} /></mesh>
        {[-0.9, 0, 0.9].map((x) => <mesh key={x} position={[x, DESK.h / 2, -DESK.d / 2 - 0.005]}><boxGeometry args={[0.02, DESK.h - 0.1, 0.01]} /><meshStandardMaterial color="#c9a052" metalness={0.8} roughness={0.3} /></mesh>)}
        <mesh position={[0.7, DESK.h + 0.18, 0.15]}><boxGeometry args={[0.4, 0.28, 0.03]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        <mesh position={[-0.7, DESK.h + 0.12, 0]}><cylinderGeometry args={[0.07, 0.09, 0.18, 16]} /><meshStandardMaterial color="#f4f2ee" roughness={0.2} /></mesh>
      </group>
      <VenueNpc {...RECEPTIONIST} chatty uniform={UNIFORMS.black} />
      {[-7.6, -4.4].map((z) => (
        <group key={z} position={[-4.6, 0, z]} rotation={[0, z < -6 ? 0 : Math.PI, 0]}>
          <RoundedBox args={[2.2, 0.42, 0.85]} radius={0.06} smoothness={3} position={[0, 0.25, 0]} castShadow><meshStandardMaterial color="#a8724a" roughness={0.6} /></RoundedBox>
          <RoundedBox args={[2.2, 0.5, 0.2]} radius={0.06} smoothness={3} position={[0, 0.62, -0.34]} castShadow><meshStandardMaterial color="#a8724a" roughness={0.6} /></RoundedBox>
        </group>
      ))}
      {/* The drinks machine by the door (a CC-BY model with our own artwork, see CREDITS.md) */}
      <group position={[VENDING.x, 0, VENDING.z]}>
        <RealModel name="vending-machine" fit={[VENDING.w, VENDING.h, VENDING.d]} fallback={(
          <mesh position={[0, VENDING.h / 2, 0]} castShadow><boxGeometry args={[VENDING.w, VENDING.h, VENDING.d]} /><meshStandardMaterial color="#1d6fd0" roughness={0.4} /></mesh>
        )} />
        <pointLight position={[0, 1.4, VENDING.d / 2 + 0.4]} intensity={0.8 + lit} distance={3} decay={1.8} color="#e8f2ff" />
      </group>
      <mesh position={[-4.6, 0.22, -6]} castShadow><boxGeometry args={[1.0, 0.44, 0.7]} /><meshStandardMaterial color={DARK_WOOD} roughness={0.4} /></mesh>
      <group position={[BUILDING.x0 + FACE, 0, -6]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, H / 2, 0]}><planeGeometry args={[4.5, H - 0.02]} /><meshStandardMaterial map={damask} roughness={0.8} /></mesh>
        <group position={[0, 1.35, 0]}><WallFire lit={lit} /></group>
      </group>
      <group position={[0, 0, (LOBBY.z0 + LOBBY.z1) / 2]}>
        <Ceiling width={w} depth={LOBBY.z1 - LOBBY.z0} height={H} color="#f0ebe2">
          {[-5, -1.5, 1.5, 5].flatMap((x) => [-1.8, 1.8].map((z) => <Downlight key={`${x}${z}`} x={x} z={z} />))}
        </Ceiling>
      </group>

      {/* Corridor: downlights, and a door into every room (yours open once you have the key) */}
      <group position={[0, 0, (CORRIDOR.z0 + CORRIDOR.z1) / 2]}>
        <Ceiling width={CORRIDOR.x1 - CORRIDOR.x0} depth={CORRIDOR.z1 - CORRIDOR.z0} height={H} color="#f0ebe2">
          {[-1, 2, 5, 8, 11, 14].map((z) => <Downlight key={z} x={0} z={z - (CORRIDOR.z0 + CORRIDOR.z1) / 2} />)}
        </Ceiling>
      </group>
      {ROOMS.map((r) => <RoomDoor key={r.id} room={r} open={hasKey && r.id === GUEST_ROOM} dnd={r.id === '104' || r.id === '106'} />)}

      {hasKey && <GuestRoom room={guest} player={player} gameTime={gameTime} lit={lit} tray={tray} />}

      <hemisphereLight args={['#fff4e2', '#6a5a48', 0.55]} />
      <pointLight position={[0, 2.6, -6.5]} intensity={6 * lit + 2} distance={14} decay={1.5} color="#ffe6c4" />
      <pointLight position={[0, 2.6, 3]} intensity={3 * lit + 1.5} distance={10} decay={1.6} color="#ffe6c4" />
      <pointLight position={[0, 2.6, 11]} intensity={3 * lit + 1.5} distance={10} decay={1.6} color="#ffe6c4" />
      {children}
    </group>
  );
}
