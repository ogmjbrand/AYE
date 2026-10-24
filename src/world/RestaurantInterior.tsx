import { useMemo, type ReactNode } from 'react';
import { DoubleSide, type Texture } from 'three';
import type { GameTime } from '../lib/gameState';
import { lightingAt } from './timeOfDay';
import {
  BAR, DINERS, HOST_DESK, PASS, PALMS_MENU, ROOM, ROOM_HEIGHT, STAFF, TABLES, TABLE_RADIUS, WAITER_ROUTE, type DiningTable,
} from '../lib/restaurant';
import type { Seat } from '../lib/seating';
import { marbleTexture, skyMoodAt, skylineTexture } from './venueTextures';
import { palmsSign } from './signs';
import { PottedPalm } from './PottedPalm';
import { DishModel } from './Dishes';
import { VenueNpc } from './VenueNpc';
import { UNIFORMS } from '../lib/uniforms';
import { Ceiling, Downlight, LedRing, PolishedFloor, TrackLight } from './VenueShell';
import { RealModel } from './RealModel';

const GOLD = '#c9a052';
const EMERALD = '#2b1d14';
const EMERALD_DEEP = '#1c130d';
const VELVET = '#1d5a47';
const TABLE_TOP = 0.76;
const DRINKS = new Set(PALMS_MENU.filter((i) => i.course === 'drink').map((i) => i.id));

function Gold({ p, s, emissive = 0 }: { p: [number, number, number]; s: [number, number, number]; emissive?: number }) {
  return (
    <mesh position={p} castShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.28} emissive="#8a6420" emissiveIntensity={emissive} />
    </mesh>
  );
}

/** Inward-facing wall (the camera, often outside the room, sees straight through from behind). */
function Wall({ position, rotationY, size, color = EMERALD }: { position: [number, number, number]; rotationY: number; size: [number, number]; color?: string }) {
  return (
    <mesh position={position} rotation={[0, rotationY, 0]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}

/** Gold-framed panels and a dado rail on a wall, as children of a group placed on the wall's face. */
function Panelling({ length, count }: { length: number; count: number }) {
  const pw = length / count;
  return (
    <group>
      <Gold p={[0, 1.0, 0.02]} s={[length, 0.05, 0.03]} />
      <Gold p={[0, 0.08, 0.02]} s={[length, 0.16, 0.03]} />
      {Array.from({ length: count }, (_, i) => {
        const x = -length / 2 + pw * (i + 0.5);
        return (
          <group key={i} position={[x, 2.45, 0.015]}>
            {[[0, 1.05, pw - 0.5, 0.025], [0, -1.05, pw - 0.5, 0.025], [-(pw - 0.5) / 2, 0, 0.025, 2.1], [(pw - 0.5) / 2, 0, 0.025, 2.1]].map(([x2, y, w, h], k) => (
              <Gold key={k} p={[x2, y, 0]} s={[w, h, 0.02]} />
            ))}
          </group>
        );
      })}
    </group>
  );
}

/** The old box chair: shown while the velvet chair model loads, or if it can't. */
function BoxChair() {
  return (
    <>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.48, 0.09, 0.46]} />
        <meshStandardMaterial color={VELVET} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.8, -0.21]} castShadow>
        <boxGeometry args={[0.46, 0.62, 0.07]} />
        <meshStandardMaterial color={VELVET} roughness={0.85} />
      </mesh>
      <Gold p={[0, 1.12, -0.21]} s={[0.48, 0.03, 0.08]} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Gold key={`${sx}${sz}`} p={[sx * 0.2, 0.2, sz * 0.19]} s={[0.03, 0.4, 0.03]} />))}
    </>
  );
}

/** A plush tan velvet chair, facing the table. */
function Chair({ seat }: { seat: Seat }) {
  return (
    <group position={[seat.x, 0, seat.z]} rotation={[0, seat.facing, 0]}>
      <RealModel name="chair-velvet-mango" fit={[0.78, 0.82, 0.66]} recolor={{ match: /fabric/i, color: '#b08860' }} fallback={<BoxChair />} />
    </group>
  );
}

/** A round black-marble table on a brass pedestal, laid with plates and glasses, a lamp and flowers. */
function Table({ t, dishes, marble }: { t: DiningTable; dishes: { at: 0 | 1; id: string; drink?: string }[]; marble: Texture }) {
  return (
    <group>
      <group position={[t.x, 0, t.z]}>
        <mesh position={[0, TABLE_TOP - 0.02, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[TABLE_RADIUS, TABLE_RADIUS, 0.04, 48]} />
          <meshPhysicalMaterial map={marble} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
        </mesh>
        <mesh position={[0, TABLE_TOP - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[TABLE_RADIUS, 0.012, 8, 48]} />
          <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.37, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.07, 0.7, 12]} />
          <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.28, 0.3, 0.04, 24]} />
          <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} />
        </mesh>
        {/* A little brass table lamp with a glowing shade */}
        <group position={[0.1, TABLE_TOP, 0.22]}>
          <mesh position={[0, 0.01, 0]}><cylinderGeometry args={[0.05, 0.06, 0.02, 20]} /><meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.25} /></mesh>
          <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.008, 0.008, 0.22, 8]} /><meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.25} /></mesh>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.05, 0.08, 0.09, 24, 1, true]} />
            <meshStandardMaterial color="#fff1d6" emissive="#ffc670" emissiveIntensity={2.4} toneMapped={false} side={DoubleSide} />
          </mesh>
        </group>
        <group position={[-0.08, TABLE_TOP, 0.2]}><RealModel name="vase-flowers" fit={[0.22, 0.3, 0.22]} /></group>
      </group>
      {t.seats.map((s) => <Chair key={s.id} seat={s} />)}
      {/* Laid places: a charger plate and a wine glass at each chair */}
      {t.seats.map((s) => {
        const x = t.x + (s.x - t.x) * 0.45;
        const z = t.z + (s.z - t.z) * 0.45;
        return (
          <group key={`lay-${s.id}`}>
            <mesh position={[x, TABLE_TOP + 0.004, z]} receiveShadow>
              <cylinderGeometry args={[0.14, 0.14, 0.008, 32]} />
              <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.3} />
            </mesh>
            <group position={[x - Math.cos(s.facing) * 0.18 + (t.x - s.x) * 0.12, TABLE_TOP, z + Math.sin(s.facing) * 0.18 + (t.z - s.z) * 0.12]}><WineGlass /></group>
          </group>
        );
      })}
      {dishes.map((d) => {
        const s = t.seats[d.at];
        // On the table in front of that chair
        const x = t.x + (s.x - t.x) * 0.38;
        const z = t.z + (s.z - t.z) * 0.38;
        return (
          <group key={`${d.at}-${d.id}`}>
            {d.id && <group position={[x, TABLE_TOP, z]} rotation={[0, s.facing, 0]}><DishModel id={d.id} /></group>}
            {d.drink && <group position={[x + Math.cos(s.facing) * 0.2, TABLE_TOP, z - Math.sin(s.facing) * 0.2]}><DishModel id={d.drink} /></group>}
            {/* Cutlery either side */}
            {[-1, 1].map((side) => (
              <mesh key={side} position={[x + Math.cos(s.facing) * 0.17 * side, TABLE_TOP + 0.002, z - Math.sin(s.facing) * 0.17 * side]} rotation={[0, s.facing, 0]}>
                <boxGeometry args={[0.012, 0.004, 0.19]} />
                <meshStandardMaterial color="#d8d8d8" metalness={0.9} roughness={0.25} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/** A clear wine glass on a stem. */
function WineGlass() {
  return (
    <group>
      <mesh position={[0, 0.003, 0]}><cylinderGeometry args={[0.035, 0.035, 0.004, 20]} /><meshStandardMaterial color="#eef6f6" transparent opacity={0.35} roughness={0.05} /></mesh>
      <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.004, 0.004, 0.11, 8]} /><meshStandardMaterial color="#eef6f6" transparent opacity={0.4} roughness={0.05} /></mesh>
      <mesh position={[0, 0.15, 0]}><sphereGeometry args={[0.04, 20, 14, 0, Math.PI * 2, 0.4, Math.PI - 0.4]} /><meshStandardMaterial color="#eef6f6" transparent opacity={0.25} roughness={0.03} side={DoubleSide} depthWrite={false} /></mesh>
    </group>
  );
}

/** Gold ring chandelier with crystal drops, hung from the dark above on a rod. */
function Chandelier({ x, z, lit }: { x: number; z: number; lit: number }) {
  const drops = 14;
  return (
    <group position={[x, 3.15, z]}>
      <Gold p={[0, (ROOM_HEIGHT - 3.15) / 2 + 0.3, 0]} s={[0.025, ROOM_HEIGHT - 3.15 + 0.4, 0.025]} />
      {[0.55, 0.36].map((r, k) => (
        <mesh key={r} position={[0, k * 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.022, 8, 40]} />
          <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.25} emissive="#8a6420" emissiveIntensity={0.3 * lit} />
        </mesh>
      ))}
      {Array.from({ length: drops }, (_, i) => {
        const a = (i / drops) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * 0.55, -0.12, Math.sin(a) * 0.55]}>
            <mesh>
              <octahedronGeometry args={[0.045, 0]} />
              <meshStandardMaterial color="#fff6e0" emissive="#ffd9a0" emissiveIntensity={1.4 * lit} roughness={0.05} metalness={0.2} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.36, 0.3, Math.sin(a) * 0.36]}>
            <cylinderGeometry args={[0.018, 0.018, 0.1, 8]} />
            <meshStandardMaterial color="#fff2d6" emissive="#ffcf8a" emissiveIntensity={2.5 * lit} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Bottles on the lit back bar. */
function BackBar() {
  const colours = ['#3d6b3a', '#8a3a1a', '#d9b66a', '#2a4a6a', '#6a2a4a', '#e8e0c8', '#4a3a2a', '#c96a2a'];
  const z0 = BAR.z - BAR.d / 2 + 0.4;
  return (
    <group position={[-ROOM.width / 2 + 0.12, 0, 0]}>
      {/* Shelves with a warm strip under each, in front of a mirror */}
      <mesh position={[0.02, 2.05, BAR.z]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[BAR.d, 1.9]} />
        <meshStandardMaterial color="#2a2a26" metalness={0.9} roughness={0.12} />
      </mesh>
      {[1.35, 1.85, 2.35].map((y, k) => (
        <group key={y}>
          <Gold p={[0.17, y, BAR.z]} s={[0.3, 0.035, BAR.d]} />
          <mesh position={[0.17, y - 0.03, BAR.z]}>
            <boxGeometry args={[0.28, 0.01, BAR.d]} />
            <meshStandardMaterial color="#ffd38a" emissive="#ffb85a" emissiveIntensity={2} toneMapped={false} />
          </mesh>
          {Array.from({ length: 16 }, (_, i) => {
            const h = 0.22 + ((i * 7 + k * 3) % 5) * 0.03;
            return (
              <group key={i} position={[0.17, y + 0.02 + h / 2, z0 + i * ((BAR.d - 0.8) / 15)]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.035, 0.038, h, 10]} />
                  <meshStandardMaterial color={colours[(i + k * 3) % colours.length]} roughness={0.15} transparent opacity={0.85} />
                </mesh>
                <mesh position={[0, h / 2 + 0.04, 0]}>
                  <cylinderGeometry args={[0.012, 0.02, 0.08, 8]} />
                  <meshStandardMaterial color={colours[(i + k * 3) % colours.length]} roughness={0.15} />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}
    </group>
  );
}

function Bar({ lit }: { lit: number }) {
  const marble = useMemo(() => marbleTexture('white', [1, 4]), []);
  const front = BAR.x + BAR.w / 2;
  return (
    <group>
      {/* Counter: dark green body, gold fluting on the front, marble top with a warm strip under the lip */}
      <mesh position={[BAR.x, BAR.h / 2, BAR.z]} castShadow receiveShadow>
        <boxGeometry args={[BAR.w, BAR.h, BAR.d]} />
        <meshStandardMaterial color={EMERALD_DEEP} roughness={0.6} />
      </mesh>
      {Array.from({ length: 22 }, (_, i) => (
        <Gold key={i} p={[front + 0.01, BAR.h / 2 - 0.05, BAR.z - BAR.d / 2 + 0.25 + i * ((BAR.d - 0.5) / 21)]} s={[0.025, BAR.h - 0.25, 0.04]} />
      ))}
      <mesh position={[BAR.x + 0.05, BAR.h + 0.03, BAR.z]} castShadow receiveShadow>
        <boxGeometry args={[BAR.w + 0.2, 0.06, BAR.d + 0.15]} />
        <meshStandardMaterial map={marble} roughness={0.15} />
      </mesh>
      <mesh position={[front + 0.12, BAR.h - 0.02, BAR.z]}>
        <boxGeometry args={[0.02, 0.02, BAR.d]} />
        <meshStandardMaterial color="#ffd38a" emissive="#ffb85a" emissiveIntensity={1.5 + lit} toneMapped={false} />
      </mesh>
      {/* Stools */}
      {[-2.4, -0.8, 0.8, 2.4].map((dz) => (
        <group key={dz} position={[front + 0.55, 0, BAR.z + dz]}>
          <Gold p={[0, 0.38, 0]} s={[0.05, 0.76, 0.05]} />
          <mesh position={[0, 0.78, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.18, 0.08, 20]} />
            <meshStandardMaterial color={VELVET} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.18, 0.2, 0.03, 20]} />
            <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.15, 0.012, 6, 20]} />
            <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* Globe pendants over the bar */}
      {[-2.4, 0, 2.4].map((dz) => (
        <group key={dz} position={[BAR.x + 0.2, 2.6, BAR.z + dz]}>
          <Gold p={[0, (ROOM_HEIGHT - 2.6) / 2 + 0.3, 0]} s={[0.015, ROOM_HEIGHT - 2.6 + 0.6, 0.015]} />
          <mesh>
            <sphereGeometry args={[0.16, 20, 16]} />
            <meshStandardMaterial color="#fff2d6" emissive="#ffcf8a" emissiveIntensity={1.2 + lit} toneMapped={false} transparent opacity={0.95} />
          </mesh>
        </group>
      ))}
      <BackBar />
    </group>
  );
}

function HostDesk() {
  const marble = useMemo(() => marbleTexture('white', [1, 1]), []);
  const d = HOST_DESK;
  return (
    <group position={[d.x, 0, d.z]}>
      <mesh position={[0, d.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[d.w, d.h, d.d]} />
        <meshStandardMaterial color={EMERALD_DEEP} roughness={0.55} />
      </mesh>
      <mesh position={[0, d.h + 0.025, 0]} castShadow>
        <boxGeometry args={[d.w + 0.1, 0.05, d.d + 0.1]} />
        <meshStandardMaterial map={marble} roughness={0.15} />
      </mesh>
      <Gold p={[0, d.h - 0.12, -d.d / 2 - 0.01]} s={[d.w, 0.04, 0.02]} />
      <Gold p={[0, 0.06, -d.d / 2 - 0.01]} s={[d.w, 0.12, 0.02]} />
      {/* A small palm emblem and a lamp */}
      <mesh position={[0, d.h * 0.55, -d.d / 2 - 0.012]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[0.16, 24]} />
        <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} />
      </mesh>
      <group position={[0.65, d.h + 0.05, 0.1]}>
        <Gold p={[0, 0.18, 0]} s={[0.02, 0.36, 0.02]} />
        <mesh position={[0, 0.38, 0]}>
          <coneGeometry args={[0.1, 0.12, 16, 1, true]} />
          <meshStandardMaterial color="#f3e2bb" emissive="#ffcf8a" emissiveIntensity={1.2} side={DoubleSide} />
        </mesh>
      </group>
      {/* Reservations book */}
      <mesh position={[-0.35, d.h + 0.065, 0.05]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[0.32, 0.03, 0.24]} />
        <meshStandardMaterial color="#3a1f14" roughness={0.6} />
      </mesh>
    </group>
  );
}

function KitchenPass({ lit }: { lit: number }) {
  return (
    <group>
      {/* Steel counter and heat lamps, the kitchen glowing behind */}
      <mesh position={[PASS.x, PASS.h / 2, PASS.z]} castShadow receiveShadow>
        <boxGeometry args={[PASS.w, PASS.h, PASS.d]} />
        <meshStandardMaterial color="#b9bcbf" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[PASS.x, 1.9, ROOM.depth / 2 - 0.02]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[PASS.w + 0.4, 1.7]} />
        <meshStandardMaterial color="#d9d4c8" emissive="#fff0d0" emissiveIntensity={0.35 + lit * 0.3} roughness={0.6} />
      </mesh>
      {[-1, 0, 1].map((k) => (
        <group key={k} position={[PASS.x + k * 0.95, 1.75, PASS.z - 0.05]}>
          <Gold p={[0, 0.5, 0]} s={[0.015, 1, 0.015]} />
          <mesh>
            <coneGeometry args={[0.13, 0.16, 16, 1, true]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} side={DoubleSide} />
          </mesh>
          <mesh position={[0, -0.06, 0]}>
            <circleGeometry args={[0.1, 16]} />
            <meshStandardMaterial color="#ff9a4a" emissive="#ff7a2a" emissiveIntensity={2} toneMapped={false} side={DoubleSide} />
          </mesh>
        </group>
      ))}
      {/* Plates waiting on the pass */}
      <group position={[PASS.x - 0.8, PASS.h, PASS.z]}><DishModel id="grilled-prawns" /></group>
      <group position={[PASS.x + 0.3, PASS.h, PASS.z]}><DishModel id="vegetable-bowl" /></group>
      <Gold p={[PASS.x, PASS.h + 0.02, PASS.z - PASS.d / 2]} s={[PASS.w, 0.04, 0.03]} />
    </group>
  );
}

/** What each diner is having, and what's on your table. */
const DINER_DISHES: Record<string, { id: string; drink?: string }> = {
  t1: { id: 'grilled-salmon', drink: 'chapman' },
  t3: { id: 'steak-mash', drink: 'zobo' },
  t4: { id: 'jollof-chicken', drink: 'orange-juice' },
  t6: { id: 'seafood-pasta', drink: 'palm-mocktail' },
};

/**
 * Inside The Palms: marble floor, emerald walls with gold panelling, the lit
 * bar along the left, round tables under chandeliers, the kitchen pass at the
 * back, palms in the corners and the city through the back windows. Like the
 * homes there's no ceiling, so the camera can see in. Staff and diners are
 * computer-controlled.
 */
export function RestaurantInterior({ gameTime, served, children }: {
  gameTime: GameTime;
  /** Your table and what's on it. */
  served: { seat: Seat; dishes: string[] } | null;
  children: ReactNode;
}) {
  const { width: w, depth: d } = ROOM;
  const H = ROOM_HEIGHT;
  const l = lightingAt(gameTime.hour, gameTime.minute);
  const lit = 0.6 + 0.4 * l.night;
  const floor = useMemo(() => marbleTexture('cream', [w / 2.2, d / 2.2]), [w, d]);
  const tableMarble = useMemo(() => marbleTexture('black', [1, 1]), []);
  const sky = skylineTexture(skyMoodAt(l.night, gameTime.hour), 41);
  const sign = useMemo(() => palmsSign('THE PALMS', 'Restaurant · Fine dining & lounge'), []);
  const doorW = 1.6;
  const side = (w - doorW) / 2;
  const yourTable = served ? TABLES.find((t) => t.seats.some((s) => s.id === served.seat.id)) : undefined;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#1c1f1e" roughness={1} />
      </mesh>
      <PolishedFloor width={w} depth={d} map={floor} />
      {/* Dark ceiling: downlights, gold rings over the tables, a track over the bar */}
      <Ceiling width={w} depth={d} height={H} color="#18110c">
        {[-6, -2, 2, 6].flatMap((x) => [-4.5, 4.8].map((z) => <Downlight key={`${x},${z}`} x={x} z={z} />))}
        <TrackLight x={BAR.x + 0.6} z={BAR.z} length={BAR.d} along="z" heads={5} />
        <LedRing x={0.8} y={-0.35} z={-1.2} radius={1.6} />
        <LedRing x={0.8} y={-0.35} z={2.6} radius={1.6} />
      </Ceiling>
      {/* A dark inlaid border around the dining floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.8, 0.003, 0.7]}>
        <ringGeometry args={[4.6, 4.75, 4, 1, Math.PI / 4]} />
        <meshStandardMaterial color="#1c2a26" roughness={0.3} />
      </mesh>

      {/* Walls */}
      <Wall position={[0, H / 2, d / 2]} rotationY={Math.PI} size={[w, H]} />
      <Wall position={[-w / 2, H / 2, 0]} rotationY={Math.PI / 2} size={[d, H]} />
      <Wall position={[w / 2, H / 2, 0]} rotationY={-Math.PI / 2} size={[d, H]} />
      <Wall position={[-(doorW / 2 + side / 2), H / 2, -d / 2]} rotationY={0} size={[side, H]} />
      <Wall position={[doorW / 2 + side / 2, H / 2, -d / 2]} rotationY={0} size={[side, H]} />
      <Wall position={[0, (H + 2.4) / 2, -d / 2]} rotationY={0} size={[doorW, H - 2.4]} />
      <group position={[w / 2 - 0.01, 0, 2]} rotation={[0, -Math.PI / 2, 0]}><Panelling length={d - 4} count={3} /></group>
      {/* By the host desk: a wall of brass slats with the name in gold */}
      <group position={[w / 2 - 0.02, 0, -d / 2 + 2]} rotation={[0, -Math.PI / 2, 0]}>
        {Array.from({ length: 22 }, (_, i) => <Gold key={i} p={[-1.9 + i * 0.18, H / 2, 0.03]} s={[0.05, H, 0.05]} emissive={0.15} />)}
        <mesh position={[0, 2.5, 0.07]}>
          <planeGeometry args={[3.2, 0.8]} />
          <meshStandardMaterial map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
      </group>
      {/* The front wall stays bare: the camera usually looks in through it. Glass doors, seen from inside only */}
      <mesh position={[0, 1.2, -d / 2 + 0.02]}>
        <planeGeometry args={[doorW - 0.1, 2.4]} />
        <meshStandardMaterial color="#1a2a26" roughness={0.1} metalness={0.4} transparent opacity={0.7} />
      </mesh>

      {/* Back wall: tall windows onto the city, gold mullions, the name in the middle */}
      {[-6.2, -2.2, 1.8].map((x) => (
        <group key={x} position={[x, 2.15, d / 2 - 0.02]}>
          <mesh rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[3.4, 3.2]} />
            <meshStandardMaterial map={sky} emissiveMap={sky} emissive="#ffffff" emissiveIntensity={0.55} roughness={0.1} toneMapped={false} />
          </mesh>
          {[[-1.7, 0, 0.06, 3.3], [1.7, 0, 0.06, 3.3], [0, 1.62, 3.46, 0.06], [0, -1.62, 3.46, 0.06], [0, 0, 0.035, 3.2], [0, 0.55, 3.4, 0.03]].map(([x2, y, sw, sh], i) => (
            <Gold key={i} p={[x2, y, -0.02]} s={[sw, sh, 0.04]} />
          ))}
        </group>
      ))}
      <mesh position={[-2.2, 4.0, d / 2 - 0.04]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2.6, 0.65]} />
        <meshStandardMaterial map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>

      <Bar lit={lit} />
      <HostDesk />
      <KitchenPass lit={lit} />

      {TABLES.map((t) => {
        const diner = DINERS.find((x) => x.tableId === t.id);
        const dishes: { at: 0 | 1; id: string; drink?: string }[] = [];
        if (diner && DINER_DISHES[t.id]) dishes.push({ at: diner.seat, ...DINER_DISHES[t.id] });
        if (yourTable?.id === t.id && served) {
          const at = t.seats[0].id === served.seat.id ? 0 : 1;
          const food = served.dishes.filter((id) => !DRINKS.has(id));
          const drink = served.dishes.find((id) => DRINKS.has(id));
          if (food.length || drink) dishes.push({ at, id: food[food.length - 1] ?? '', drink });
        }
        return <Table key={t.id} t={t} dishes={dishes} marble={tableMarble} />;
      })}

      {/* Chandeliers over the dining room, globe pendants over the bar */}
      {[[-3.2, -1.2], [0.8, -1.2], [4.8, -1.2], [-3.2, 2.6], [0.8, 2.6], [4.8, 2.6]].map(([x, z]) => <Chandelier key={`${x}${z}`} x={x} z={z} lit={lit} />)}
      {/* Wall sconces */}
      {[-3, 0, 3].map((z) => (
        <group key={z} position={[w / 2 - 0.08, 2.2, z * 1.6]}>
          <Gold p={[0, 0, 0]} s={[0.06, 0.3, 0.12]} />
          <mesh position={[-0.08, 0.15, 0]}>
            <sphereGeometry args={[0.07, 12, 10]} />
            <meshStandardMaterial color="#fff2d6" emissive="#ffcf8a" emissiveIntensity={2} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* Palms in the corners */}
      <PottedPalm position={[-w / 2 + 0.8, 0, -d / 2 + 0.8]} height={2.6} />
      <PottedPalm position={[w / 2 - 0.8, 0, -d / 2 + 0.8]} height={2.6} rotation={0.7} />
      <PottedPalm position={[-w / 2 + 0.8, 0, d / 2 - 0.8]} height={2.6} rotation={1.4} />
      <PottedPalm position={[w / 2 - 0.8, 0, d / 2 - 0.8]} height={2.6} rotation={2.1} />

      {/* Warm light: one over each row of tables, one at the bar, one at the door */}
      <hemisphereLight args={['#ffe6c4', '#2a1f18', 0.25]} />
      <pointLight position={[0.8, 3.2, -1.2]} intensity={10 * lit} distance={14} decay={1.6} color="#ffd29a" />
      <pointLight position={[0.8, 3.2, 2.6]} intensity={10 * lit} distance={14} decay={1.6} color="#ffd29a" />
      <pointLight position={[-6.6, 2.6, 0.5]} intensity={6 * lit} distance={8} decay={1.6} color="#ffbf73" />
      <pointLight position={[1.5, 2.8, -4.8]} intensity={4 * lit} distance={8} decay={1.6} color="#ffd9a8" />

      {/* Staff and diners: computer-controlled */}
      <VenueNpc {...STAFF.host} chatty uniform={UNIFORMS.black} />
      <VenueNpc {...STAFF.bartender} uniform={UNIFORMS.black} />
      <VenueNpc {...STAFF.chef} uniform={UNIFORMS.chef} />
      <VenueNpc lookId={STAFF.waiter.lookId} name={STAFF.waiter.name} role={STAFF.waiter.role} x={WAITER_ROUTE[0][0]} z={WAITER_ROUTE[0][1]} facing={0} route={WAITER_ROUTE} uniform={UNIFORMS.black} />
      {DINERS.map((dn) => {
        const t = TABLES.find((x) => x.id === dn.tableId)!;
        return <VenueNpc key={dn.name} lookId={dn.lookId} name={dn.name} role="Diner" x={0} z={0} facing={0} seat={t.seats[dn.seat]} chatty />;
      })}
      {children}
    </group>
  );
}
