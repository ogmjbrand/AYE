import { useMemo, type ReactNode } from 'react';
import { DoubleSide, LatheGeometry, Vector2 } from 'three';
import type { GameTime } from '../lib/gameState';
import { lightingAt } from './timeOfDay';
import { DESK, FITTING, LOUNGE, MANNEQUINS, RAILS, ROOM, ROOM_HEIGHT, SALON, SHELVES, STAFF } from '../lib/boutique';
import { stockedIn } from '../lib/fashion';
import { marbleTexture } from './venueTextures';
import { neonSign } from './signs';
import { PottedPalm } from './PottedPalm';
import { LuxePiece } from './LuxeFurniture';
import { VenueNpc } from './VenueNpc';
import { UNIFORMS } from '../lib/uniforms';
import { Ceiling, Downlight, GlassDoors, LedRing, PolishedFloor, TrackLight } from './VenueShell';
import { RealModel } from './RealModel';

const GOLD = '#c9a052';
const BLUSH = '#efe2da';
const BLUSH_DEEP = '#d9bfb3';

function Gold({ p, s, round = false }: { p: [number, number, number]; s: [number, number, number]; round?: boolean }) {
  return (
    <mesh position={p} castShadow>
      {round ? <cylinderGeometry args={[s[0], s[0], s[1], 12]} /> : <boxGeometry args={s} />}
      <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.28} />
    </mesh>
  );
}

function Wall({ position, rotationY, size, color = BLUSH }: { position: [number, number, number]; rotationY: number; size: [number, number]; color?: string }) {
  return (
    <mesh position={position} rotation={[0, rotationY, 0]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

const BODY = new LatheGeometry([[0, 0], [0.13, 0], [0.16, 0.12], [0.14, 0.3], [0.17, 0.45], [0.12, 0.6], [0.06, 0.66], [0, 0.68]].map(([x, y]) => new Vector2(x, y)), 24);

/** A dress form in a flared gown, on a brass stand. Decoration: what the rails sell restyles your own outfit. */
function Mannequin({ x, z, facing, dress, trim }: { x: number; z: number; facing: number; dress: string; trim: string }) {
  const skirt = useMemo(() => new LatheGeometry([[0.12, 0.95], [0.2, 0.7], [0.32, 0.25], [0.4, 0.02], [0.38, 0.0]].map(([r, y]) => new Vector2(r, y)), 32), []);
  return (
    <group position={[x, 0, z]} rotation={[0, facing, 0]}>
      <Gold p={[0, 0.01, 0]} s={[0.22, 0.02, 0]} round />
      <Gold p={[0, 0.5, 0]} s={[0.012, 1.0, 0]} round />
      <mesh geometry={skirt} position={[0, 0.06, 0]} castShadow>
        <meshStandardMaterial color={dress} roughness={0.6} side={DoubleSide} />
      </mesh>
      <mesh geometry={BODY} position={[0, 0.95, 0]} castShadow>
        <meshStandardMaterial color={dress} roughness={0.55} />
      </mesh>
      {/* A belt and a neckline in the trim colour */}
      <mesh position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.14, 0.012, 6, 24]} />
        <meshStandardMaterial color={trim} metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.66, 0]} castShadow>
        <sphereGeometry args={[0.1, 16, 12]} />
        <meshStandardMaterial color="#f1ede6" roughness={0.4} />
      </mesh>
      <Gold p={[0, 1.58, 0]} s={[0.025, 0.08, 0]} round />
    </group>
  );
}

/** A brass rail of garments in the district's own fabrics, on wooden hangers. */
function Rail({ x, z, len, along, colors }: { x: number; z: number; len: number; along: 'x' | 'z'; colors: string[] }) {
  const n = Math.floor(len / 0.16);
  return (
    <group position={[x, 0, z]} rotation={[0, along === 'z' ? Math.PI / 2 : 0, 0]}>
      <Gold p={[-len / 2, 0.8, 0]} s={[0.018, 1.6, 0]} round />
      <Gold p={[len / 2, 0.8, 0]} s={[0.018, 1.6, 0]} round />
      <Gold p={[0, 1.58, 0]} s={[len, 0.03, 0.03]} />
      <Gold p={[0, 0.02, 0]} s={[len + 0.1, 0.03, 0.5]} />
      {Array.from({ length: n }, (_, i) => {
        const c = colors[i % colors.length];
        const long = i % 3 === 0;
        return (
          <group key={i} position={[-len / 2 + 0.12 + i * ((len - 0.24) / Math.max(1, n - 1)), 1.5, 0]} rotation={[0, (i % 2 ? 0.08 : -0.08) + Math.PI / 2, 0]}>
            <mesh position={[0, 0.03, 0]}>
              <torusGeometry args={[0.03, 0.004, 4, 10, Math.PI]} />
              <meshStandardMaterial color="#8a6a48" />
            </mesh>
            <mesh position={[0, long ? -0.5 : -0.32, 0]} castShadow>
              <boxGeometry args={[0.42, long ? 0.95 : 0.6, 0.05]} />
              <meshStandardMaterial color={c} roughness={0.75} />
            </mesh>
            <mesh position={[0, -0.03, 0]}>
              <boxGeometry args={[0.46, 0.04, 0.06]} />
              <meshStandardMaterial color={c} roughness={0.75} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Shelf({ x, z, len, kind }: { x: number; z: number; len: number; kind: 'bags' | 'shoes' }) {
  const colours = ['#1f5a47', '#b4543a', '#2b2622', '#e6d3b0', '#c9a052', '#6a1d2e', '#f1ede6'];
  return (
    <group position={[x, 0, z]}>
      {[0.15, 0.75, 1.35, 1.95].map((y, k) => (
        <group key={y}>
          <mesh position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[len, 0.03, 0.45]} />
            <meshStandardMaterial color="#f4ece4" roughness={0.5} />
          </mesh>
          <mesh position={[0, y - 0.02, -0.2]}>
            <boxGeometry args={[len, 0.012, 0.02]} />
            <meshStandardMaterial color="#fff2d6" emissive="#ffcf8a" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
          {k < 3 && Array.from({ length: kind === 'bags' ? 4 : 6 }, (_, i) => {
            const c = colours[(i + k * 2) % colours.length];
            const n = kind === 'bags' ? 4 : 6;
            const px = -len / 2 + (len / n) * (i + 0.5);
            return kind === 'bags' ? (
              <group key={i} position={[px, y + 0.02, 0]}>
                <mesh position={[0, 0.14, 0]} castShadow>
                  <boxGeometry args={[0.32, 0.26, 0.14]} />
                  <meshStandardMaterial color={c} roughness={0.45} />
                </mesh>
                <mesh position={[0, 0.3, 0]}>
                  <torusGeometry args={[0.08, 0.008, 6, 16, Math.PI]} />
                  <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} />
                </mesh>
              </group>
            ) : (
              <group key={i} position={[px, y + 0.02, 0]} rotation={[0, 0.4, 0]}>
                <mesh position={[0, 0.045, 0]} castShadow>
                  <boxGeometry args={[0.1, 0.09, 0.26]} />
                  <meshStandardMaterial color={c} roughness={0.4} />
                </mesh>
                <mesh position={[0, 0.07, 0.11]}>
                  <boxGeometry args={[0.1, 0.06, 0.04]} />
                  <meshStandardMaterial color={c} roughness={0.4} />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}
      {[-1, 1].map((sx) => <Gold key={sx} p={[sx * len / 2, 1.05, 0]} s={[0.03, 2.1, 0.45]} />)}
    </group>
  );
}

function Desk() {
  const marble = useMemo(() => marbleTexture('white', [1, 1]), []);
  return (
    <group position={[DESK.x, 0, DESK.z]}>
      <mesh position={[0, DESK.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[DESK.w, DESK.h, DESK.d]} />
        <meshStandardMaterial color={BLUSH_DEEP} roughness={0.5} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => (
        <Gold key={i} p={[-DESK.w / 2 + 0.1 + i * ((DESK.w - 0.2) / 13), DESK.h / 2, -DESK.d / 2 - 0.01]} s={[0.02, DESK.h - 0.16, 0.02]} />
      ))}
      <mesh position={[0, DESK.h + 0.025, 0]} castShadow>
        <boxGeometry args={[DESK.w + 0.1, 0.05, DESK.d + 0.1]} />
        <meshStandardMaterial map={marble} roughness={0.15} />
      </mesh>
      {/* A tablet, shopping bags and a vase of flowers on the desk */}
      <mesh position={[-0.5, DESK.h + 0.06, 0]} rotation={[-0.4, 0.3, 0]}><boxGeometry args={[0.26, 0.18, 0.015]} /><meshStandardMaterial color="#111" emissive="#2a3a5a" emissiveIntensity={0.4} /></mesh>
      <mesh position={[0.65, DESK.h + 0.2, 0.05]} castShadow><boxGeometry args={[0.28, 0.32, 0.12]} /><meshStandardMaterial color="#1f5a47" /></mesh>
      <mesh position={[0.35, DESK.h + 0.16, 0.12]} castShadow><boxGeometry args={[0.22, 0.26, 0.1]} /><meshStandardMaterial color="#f4ece4" /></mesh>
      <group position={[0.0, DESK.h + 0.03, 0.15]}><RealModel name="vase-flowers" fit={[0.3, 0.4, 0.3]} /></group>
    </group>
  );
}

function FittingRoom() {
  const { x, z, w, d } = FITTING;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.2, -d / 2]} castShadow><boxGeometry args={[w, 2.4, 0.08]} /><meshStandardMaterial color={BLUSH_DEEP} roughness={0.8} /></mesh>
      <Gold p={[0, 2.42, -d / 2]} s={[w, 0.04, 0.1]} />
      {/* Velvet curtain on the open side, half drawn */}
      <Gold p={[w / 2, 2.38, 0]} s={[0.03, 0.03, d]} />
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[w / 2, 1.2, -d / 2 + 0.15 + i * 0.13]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 2.35, 8]} />
          <meshStandardMaterial color="#1f5a47" roughness={0.9} />
        </mesh>
      ))}
      {/* A tall mirror and a stool inside */}
      <mesh position={[-w / 2 + 0.03, 1.2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.9, 1.9]} />
        <meshStandardMaterial color="#d9e2e6" metalness={0.95} roughness={0.05} />
      </mesh>
      <Gold p={[-w / 2 + 0.05, 1.2, 0]} s={[0.04, 1.96, 0.96]} />
      <mesh position={[0, 0.25, 0.4]} castShadow><cylinderGeometry args={[0.2, 0.2, 0.45, 20]} /><meshStandardMaterial color="#f2b8c6" roughness={0.9} /></mesh>
    </group>
  );
}

function SalonStation() {
  return (
    <group position={[SALON.x, 0, SALON.z]}>
      <mesh position={[0, 0.5, 0.45]} castShadow receiveShadow><boxGeometry args={[1.6, 1.0, 0.4]} /><meshStandardMaterial color="#f4ece4" roughness={0.5} /></mesh>
      {/* Mirror ringed with bulbs */}
      <mesh position={[0, 1.75, 0.64]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.1, 1.3]} />
        <meshStandardMaterial color="#d9e2e6" metalness={0.95} roughness={0.05} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.62, 1.75 + Math.sin(a) * 0.72, 0.6]}>
            <sphereGeometry args={[0.035, 10, 8]} />
            <meshStandardMaterial color="#fff6e0" emissive="#ffe1a8" emissiveIntensity={2.2} toneMapped={false} />
          </mesh>
        );
      })}
      {/* Salon chair */}
      <group position={[0, 0, -0.5]}>
        <Gold p={[0, 0.25, 0]} s={[0.05, 0.5, 0]} round />
        <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.28, 0.3, 0.04, 24]} /><meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} /></mesh>
        <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[0.55, 0.12, 0.5]} /><meshStandardMaterial color="#1f5a47" roughness={0.85} /></mesh>
        <mesh position={[0, 0.95, 0.22]} castShadow><boxGeometry args={[0.52, 0.7, 0.1]} /><meshStandardMaterial color="#1f5a47" roughness={0.85} /></mesh>
      </group>
      {/* Products on the counter */}
      {[-0.55, -0.4, 0.45, 0.6].map((x, i) => <mesh key={x} position={[x, 1.1, 0.45]} castShadow><cylinderGeometry args={[0.035, 0.035, 0.2, 12]} /><meshStandardMaterial color={['#f2b8c6', GOLD, '#2b2622', '#f4ece4'][i]} roughness={0.3} /></mesh>)}
    </group>
  );
}

/**
 * Inside the Fashion House: white marble, blush walls with gold, mannequins in
 * gowns, rails of clothes in this city's fabrics, shelves of bags and shoes,
 * a lounge, the fitting room and the salon, under the "Style Your Life" neon.
 * The assistant and the stylist are computer-controlled. No ceiling, as at home.
 */
export function BoutiqueInterior({ gameTime, districtId, children }: { gameTime: GameTime; districtId: string; children: ReactNode }) {
  const { width: w, depth: d } = ROOM;
  const H = ROOM_HEIGHT;
  const night = lightingAt(gameTime.hour, gameTime.minute).night;
  const lit = 0.75 + 0.25 * night;
  const floor = useMemo(() => marbleTexture('white', [w / 2.5, d / 2.5]), [w, d]);
  const neon = useMemo(() => neonSign(), []);
  // The rails show this city's own fabrics
  const colors = useMemo(() => stockedIn(districtId).filter((i) => i.slot === 'top' || i.slot === 'bottom').map((i) => i.style.colors[0]), [districtId]);
  const doorW = 1.6;
  const side = (w - doorW) / 2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#1c1f1e" roughness={1} />
      </mesh>
      <PolishedFloor width={w} depth={d} map={floor} />
      {/* White ceiling: tracks of spotlights over the rails and glowing gold rings over the lounge */}
      <Ceiling width={w} depth={d} height={H} color="#f2ebe4">
        <TrackLight x={-4.5} z={0} length={8} along="z" heads={6} />
        <TrackLight x={4.8} z={0} length={8} along="z" heads={6} />
        <TrackLight x={0} z={d / 2 - 1.6} length={9} heads={7} />
        <LedRing x={LOUNGE.x} y={-0.6} z={LOUNGE.z} radius={1.1} />
        <LedRing x={LOUNGE.x} y={-0.85} z={LOUNGE.z} radius={0.75} />
        {[-2, 1].flatMap((x) => [-3, 0].map((z) => <Downlight key={`${x},${z}`} x={x} z={z} />))}
      </Ceiling>
      {/* Behind the neon: a dark panel framed by lit brass slats */}
      <group position={[0.6, 0, d / 2 - 0.02]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 2.4, 0]}>
          <planeGeometry args={[3.6, 2.6]} />
          <meshStandardMaterial color="#1a1512" roughness={0.6} />
        </mesh>
        {[-2.2, -2.06, -1.92, 1.92, 2.06, 2.2].map((x) => <Gold key={x} p={[x, 1.9, 0.03]} s={[0.05, 3.8, 0.05]} />)}
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[LOUNGE.x, 0.004, LOUNGE.z]}>
        <circleGeometry args={[1.6, 48]} />
        <meshStandardMaterial color="#e6d3c8" roughness={1} />
      </mesh>

      <Wall position={[0, H / 2, d / 2]} rotationY={Math.PI} size={[w, H]} />
      <Wall position={[-w / 2, H / 2, 0]} rotationY={Math.PI / 2} size={[d, H]} />
      <Wall position={[w / 2, H / 2, 0]} rotationY={-Math.PI / 2} size={[d, H]} />
      <Wall position={[-(doorW / 2 + side / 2), H / 2, -d / 2]} rotationY={0} size={[side, H]} />
      <Wall position={[doorW / 2 + side / 2, H / 2, -d / 2]} rotationY={0} size={[side, H]} />
      <Wall position={[0, (H + 2.4) / 2, -d / 2]} rotationY={0} size={[doorW, H - 2.4]} />
      {/* Glass doors onto the street, closed behind you */}
      <GlassDoors door={{ x: 0, z: -d / 2 + 0.04, width: doorW, alongX: true }} height={2.4} metal="#b8975c" />
      {/* Gold skirting and a picture rail on the back and side walls */}
      {[[0, d / 2 - 0.01, w, Math.PI], [-w / 2 + 0.01, 0, d, Math.PI / 2], [w / 2 - 0.01, 0, d, -Math.PI / 2]].map(([x, z, len, ry], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, ry, 0]}>
          <Gold p={[0, 0.06, 0.01]} s={[len, 0.12, 0.02]} />
          <Gold p={[0, 3.1, 0.01]} s={[len, 0.04, 0.02]} />
        </group>
      ))}

      {/* The neon on the back wall, between the shelves */}
      <mesh position={[0.6, 2.7, d / 2 - 0.03]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2.6, 0.98]} />
        <meshStandardMaterial map={neon} emissiveMap={neon} emissive="#ffffff" emissiveIntensity={1.1} toneMapped={false} />
      </mesh>
      {/* Arched mirrors on the side walls */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * (w / 2 - 0.03), 1.5, -3.2]} rotation={[0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
          <mesh>
            <planeGeometry args={[1.1, 2.4]} />
            <meshStandardMaterial color="#dfe6ea" metalness={0.95} roughness={0.05} />
          </mesh>
          <Gold p={[0, 0, -0.01]} s={[1.18, 2.48, 0.02]} />
        </group>
      ))}

      {MANNEQUINS.map((m, i) => <Mannequin key={i} {...m} />)}
      {RAILS.map((r, i) => <Rail key={i} {...r} colors={colors.slice(i * 5).concat(colors)} />)}
      {SHELVES.map((s, i) => <Shelf key={i} {...s} />)}
      <Desk />
      <FittingRoom />
      <SalonStation />

      {/* The lounge */}
      <group position={[LOUNGE.x, 0, LOUNGE.z + 0.9]}><LuxePiece f={{ kind: 'sofa', at: [LOUNGE.x, LOUNGE.z + 0.9], size: [2.4, 0.8, 0.9], color: '#f2d6dc', style: 'luxe' }} /></group>
      <group position={[LOUNGE.x, 0, LOUNGE.z - 0.2]}><LuxePiece f={{ kind: 'table', at: [LOUNGE.x, LOUNGE.z - 0.2], size: [0.9, 0.42, 0.9], color: '#f1ede6', style: 'luxe' }} /></group>

      <PottedPalm position={[-w / 2 + 0.7, 0, -d / 2 + 0.7]} height={2.3} />
      <PottedPalm position={[w / 2 - 0.7, 0, -d / 2 + 0.7]} height={2.3} rotation={0.8} />
      <PottedPalm position={[w / 2 - 0.7, 0, d / 2 - 0.7]} height={2.3} rotation={1.6} />

      {/* Globe pendants in a row down the middle */}
      {[-3.5, -0.5, 2.5].map((zz) => (
        <group key={zz} position={[0, 2.9, zz]}>
          <Gold p={[0, (H - 2.9) / 2 + 0.2, 0]} s={[0.008, H - 2.9 + 0.4, 0]} round />
          <mesh>
            <sphereGeometry args={[0.22, 24, 18]} />
            <meshStandardMaterial color="#fff6e8" emissive="#ffe1b8" emissiveIntensity={1.3} toneMapped={false} transparent opacity={0.95} />
          </mesh>
        </group>
      ))}

      <hemisphereLight args={['#fff1ea', '#3a2a28', 0.4]} />
      <pointLight position={[0, 3.2, -2]} intensity={9 * lit} distance={13} decay={1.6} color="#ffe2c8" />
      <pointLight position={[0, 3.2, 3]} intensity={9 * lit} distance={13} decay={1.6} color="#ffe2c8" />
      <pointLight position={[0.6, 2.4, d / 2 - 0.8]} intensity={3} distance={5} decay={1.8} color="#ff9ec2" />

      <VenueNpc {...STAFF.assistant} chatty uniform={UNIFORMS.black} />
      <VenueNpc {...STAFF.stylist} uniform={UNIFORMS.stylist} />
      {children}
    </group>
  );
}
