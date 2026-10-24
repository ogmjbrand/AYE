import { useMemo, type ReactNode } from 'react';
import { RoundedBox } from '@react-three/drei';
import { DoubleSide } from 'three';
import type { Furniture } from '../lib/interiors';
import { artTexture, marbleTexture, rugTexture } from './venueTextures';
import { PottedPalm } from './PottedPalm';
import { RealModel } from './RealModel';
import { LuxeBed, LuxeNightstand, LuxeVanity, LuxeWardrobe } from './LuxeBedroom';

/**
 * The Luxe collection's designer pieces (lib/furniture.ts), drawn at the
 * piece's own size so they fit the footprint the game places and collides.
 * Like the basic pieces, a long piece has its back to +z (or +x when turned).
 */

const BRASS = '#c9a052';

function Brass({ p, s, round = false }: { p: [number, number, number]; s: [number, number, number]; round?: boolean }) {
  return (
    <mesh position={p} castShadow>
      {round ? <cylinderGeometry args={[s[0], s[0], s[1], 12]} /> : <boxGeometry args={s} />}
      <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.28} />
    </mesh>
  );
}

function Soft({ p, s, color, radius = 0.08, rough = 0.95 }: { p: [number, number, number]; s: [number, number, number]; color: string; radius?: number; rough?: number }) {
  return (
    <RoundedBox args={s} radius={Math.min(radius, ...s.map((v) => v / 2 - 0.001))} smoothness={4} position={p} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={rough} />
    </RoundedBox>
  );
}

/** Swaps x and z when the piece is turned (its back on +x instead of +z). */
function Turned({ turned, children }: { turned: boolean; children: ReactNode }) {
  return <group rotation={[0, turned ? -Math.PI / 2 : 0, 0]}>{children}</group>;
}

function Sofa({ w, d, color }: { w: number; d: number; color: string }) {
  return (
    <>
      <Soft p={[0, 0.24, 0]} s={[w, 0.3, d]} color={color} radius={0.12} />
      {/* Seat cushions */}
      {[-1, 0, 1].map((k) => <Soft key={k} p={[k * (w - 0.5) / 3, 0.45, -0.06]} s={[(w - 0.5) / 3 - 0.02, 0.14, d - 0.3]} color={color} radius={0.06} />)}
      {/* Back, and rounded arms */}
      <Soft p={[0, 0.58, d / 2 - 0.14]} s={[w, 0.46, 0.28]} color={color} radius={0.13} />
      <Soft p={[-w / 2 + 0.13, 0.48, 0]} s={[0.26, 0.34, d]} color={color} radius={0.12} />
      <Soft p={[w / 2 - 0.13, 0.48, 0]} s={[0.26, 0.34, d]} color={color} radius={0.12} />
      {/* Scatter cushions */}
      <Soft p={[-w / 2 + 0.45, 0.66, d / 2 - 0.35]} s={[0.42, 0.36, 0.12]} color="#1f5a47" radius={0.05} />
      <Soft p={[w / 2 - 0.45, 0.66, d / 2 - 0.35]} s={[0.42, 0.36, 0.12]} color="#c9a052" radius={0.05} rough={0.6} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Brass key={`${sx}${sz}`} p={[sx * (w / 2 - 0.15), 0.045, sz * (d / 2 - 0.15)]} s={[0.025, 0.09, 0]} round />))}
    </>
  );
}

function CoffeeTable({ w, d, h }: { w: number; d: number; h: number }) {
  const marble = useMemo(() => marbleTexture('white', [1, 1]), []);
  const r = Math.min(w, d) / 2;
  return (
    <>
      <mesh position={[0, h - 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, 0.04, 48]} />
        <meshStandardMaterial map={marble} roughness={0.12} />
      </mesh>
      <mesh position={[0, (h - 0.04) / 2, 0]} castShadow>
        <cylinderGeometry args={[r * 0.35, r * 0.5, h - 0.04, 32, 1, true]} />
        <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.28} side={DoubleSide} />
      </mesh>
      {/* A stack of books and a small vase */}
      <mesh position={[-r * 0.3, h + 0.03, r * 0.1]} rotation={[0, 0.3, 0]} castShadow><boxGeometry args={[0.26, 0.03, 0.2]} /><meshStandardMaterial color="#1f5a47" /></mesh>
      <mesh position={[-r * 0.3, h + 0.06, r * 0.1]} rotation={[0, 0.1, 0]} castShadow><boxGeometry args={[0.24, 0.03, 0.18]} /><meshStandardMaterial color="#e6d3b0" /></mesh>
      <group position={[r * 0.3, h, -r * 0.1]}><RealModel name="vase-flowers" fit={[0.3, 0.38, 0.3]} /></group>
    </>
  );
}

function AccentChair({ w, d, color }: { w: number; d: number; color: string }) {
  const r = Math.min(w, d) / 2;
  return (
    <>
      {/* Tub back: an open ring round the seat, open at the front (−z) */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[r, r * 0.92, 0.6, 32, 1, true, -Math.PI * 0.75, Math.PI * 1.5]} />
        <meshStandardMaterial color={color} roughness={0.9} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, Math.PI * 1.75]}>
        <torusGeometry args={[r * 0.96, 0.05, 10, 32, Math.PI * 1.5]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.34, 0]} castShadow>
        <cylinderGeometry args={[r * 0.95, r * 0.9, 0.2, 32]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.47, -0.04]} castShadow>
        <cylinderGeometry args={[r * 0.85, r * 0.85, 0.08, 32]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {[0, 1, 2, 3].map((k) => {
        const a = Math.PI / 4 + (k * Math.PI) / 2;
        return <Brass key={k} p={[Math.cos(a) * r * 0.6, 0.12, Math.sin(a) * r * 0.6]} s={[0.022, 0.24, 0]} round />;
      })}
    </>
  );
}

function TvConsole({ w, d, h, color }: { w: number; d: number; h: number; color: string }) {
  const unit = 0.5;
  return (
    <>
      <mesh position={[0, unit / 2 + 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, unit, d]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      {/* Fluted doors with brass pulls, on brass legs */}
      {[-1, 0, 1].map((k) => (
        <group key={k} position={[k * (w / 3), unit / 2 + 0.08, -d / 2 - 0.005]}>
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={i} position={[(i - 3.5) * (w / 3 / 8.5), 0, 0]}>
              <boxGeometry args={[w / 3 / 10, unit - 0.06, 0.01]} />
              <meshStandardMaterial color="#3a322c" roughness={0.6} />
            </mesh>
          ))}
          <Brass p={[0, 0.05, -0.012]} s={[0.12, 0.015, 0.015]} />
        </group>
      ))}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Brass key={`${sx}${sz}`} p={[sx * (w / 2 - 0.08), 0.04, sz * (d / 2 - 0.08)]} s={[0.02, 0.08, 0]} round />))}
      <Brass p={[0, unit + 0.09, 0]} s={[w, 0.015, d]} />
      {/* The screen, on a slim stand */}
      <Brass p={[0, unit + 0.14, 0.05]} s={[0.3, 0.08, 0.12]} />
      <mesh position={[0, unit + 0.18 + (h - unit - 0.18) / 2, 0.06]} castShadow>
        <boxGeometry args={[w * 0.85, h - unit - 0.22, 0.04]} />
        <meshStandardMaterial color="#0b0c0e" roughness={0.3} />
      </mesh>
      <mesh position={[0, unit + 0.18 + (h - unit - 0.18) / 2, 0.035]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[w * 0.82, h - unit - 0.26]} />
        <meshStandardMaterial color="#10161c" emissive="#1d3550" emissiveIntensity={0.35} roughness={0.15} />
      </mesh>
    </>
  );
}

function Bookshelf({ w, d, h }: { w: number; d: number; h: number }) {
  const shelves = 5;
  const colours = ['#7b2f2f', '#2f5a7b', '#c49a3a', '#3e6b4a', '#e6d3b0', '#2b2622', '#b4543a'];
  return (
    <>
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Brass key={`${sx}${sz}`} p={[sx * (w / 2 - 0.015), h / 2, sz * (d / 2 - 0.015)]} s={[0.03, h, 0.03]} />))}
      {Array.from({ length: shelves }, (_, k) => {
        const y = 0.06 + k * ((h - 0.1) / (shelves - 1));
        return (
          <group key={k}>
            <mesh position={[0, y, 0]} castShadow receiveShadow>
              <boxGeometry args={[w, 0.025, d]} />
              <meshStandardMaterial color="#2b2622" roughness={0.5} />
            </mesh>
            {k < shelves - 1 && Array.from({ length: k % 2 ? 9 : 6 }, (_, i) => {
              const bh = 0.2 + ((i * 5 + k * 3) % 4) * 0.03;
              return (
                <mesh key={i} position={[-w / 2 + 0.1 + i * 0.07, y + 0.0125 + bh / 2, 0]} castShadow>
                  <boxGeometry args={[0.05, bh, d * 0.75]} />
                  <meshStandardMaterial color={colours[(i + k) % colours.length]} roughness={0.8} />
                </mesh>
              );
            })}
            {k % 2 === 0 && k < shelves - 1 && (
              <mesh position={[w / 2 - 0.2, y + 0.12, 0]} castShadow>
                <sphereGeometry args={[0.1, 20, 16]} />
                <meshStandardMaterial color={k ? '#1f5a47' : '#f1ede6'} roughness={0.3} />
              </mesh>
            )}
            {k % 2 === 1 && <Brass p={[w / 2 - 0.2, y + 0.1, 0]} s={[0.06, 0.18, 0]} round />}
          </group>
        );
      })}
    </>
  );
}

function FloorLamp({ w, h }: { w: number; h: number }) {
  return (
    <>
      <Brass p={[0, 0.015, 0]} s={[w * 0.45, 0.03, 0]} round />
      <Brass p={[0, h / 2, 0]} s={[0.012, h - 0.1, 0]} round />
      <mesh position={[0, h - 0.17, 0]}>
        <cylinderGeometry args={[w * 0.42, w * 0.48, 0.32, 32, 1, true]} />
        <meshStandardMaterial color="#efe3c8" emissive="#ffcf8a" emissiveIntensity={0.9} roughness={0.9} side={DoubleSide} />
      </mesh>
    </>
  );
}

function Rug({ w, d }: { w: number; d: number }) {
  const tex = useMemo(() => rugTexture(9), []);
  return (
    <mesh position={[0, 0.007, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial map={tex} roughness={1} />
    </mesh>
  );
}

/** Framed canvas on whichever wall it's nearest, facing into the room. */
function WallArt({ f }: { f: Furniture }) {
  const tex = useMemo(() => artTexture(11), []);
  const [w, h, d] = f.size;
  const turned = d > w;
  const len = turned ? d : w;
  // Facing away from the wall it hangs on: towards the room's middle
  const ry = turned ? (f.at[0] >= 0 ? -Math.PI / 2 : Math.PI / 2) : f.at[1] >= 0 ? Math.PI : 0;
  return (
    <group position={[0, 1.55, 0]} rotation={[0, ry, 0]}>
      <mesh castShadow>
        <boxGeometry args={[len, h, 0.04]} />
        <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0, 0.022]}>
        <planeGeometry args={[len - 0.1, h - 0.1]} />
        <meshStandardMaterial map={tex} roughness={0.8} />
      </mesh>
    </group>
  );
}

function DiningTable({ w, d, h }: { w: number; d: number; h: number }) {
  const marble = useMemo(() => marbleTexture('white', [1, 1]), []);
  const tw = w - 0.1;
  const td = Math.min(1.0, d - 0.7);
  return (
    <>
      <RoundedBox args={[tw, 0.05, td]} radius={0.02} smoothness={3} position={[0, h - 0.025, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={marble} roughness={0.12} />
      </RoundedBox>
      {[-1, 1].map((sx) => <Brass key={sx} p={[sx * (tw / 2 - 0.3), (h - 0.05) / 2, 0]} s={[0.06, h - 0.05, td * 0.6]} />)}
      {/* Four velvet chairs, two each side */}
      {[-1, 1].flatMap((sz) => [-1, 1].map((sx) => (
        <group key={`${sx}${sz}`} position={[sx * tw * 0.24, 0, sz * (td / 2 + 0.28)]} rotation={[0, sz > 0 ? Math.PI : 0, 0]}>
          <Soft p={[0, 0.46, 0]} s={[0.46, 0.08, 0.44]} color="#1f5a47" radius={0.03} />
          <Soft p={[0, 0.78, 0.2]} s={[0.44, 0.56, 0.06]} color="#1f5a47" radius={0.03} />
          {[-1, 1].flatMap((lx) => [-1, 1].map((lz) => <Brass key={`${lx}${lz}`} p={[lx * 0.19, 0.21, lz * 0.18]} s={[0.012, 0.42, 0]} round />))}
        </group>
      )))}
      <group position={[0, h, 0]}><RealModel name="vase-flowers" fit={[0.34, 0.42, 0.34]} /></group>
    </>
  );
}

function KitchenIsland({ w, d, h }: { w: number; d: number; h: number }) {
  const marble = useMemo(() => marbleTexture('white', [1, 1]), []);
  return (
    <>
      <mesh position={[0, (h - 0.05) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w - 0.1, h - 0.05, d - 0.06]} />
        <meshStandardMaterial color="#1c2a26" roughness={0.5} />
      </mesh>
      <mesh position={[0, h - 0.025, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.05, d]} />
        <meshStandardMaterial map={marble} roughness={0.12} />
      </mesh>
      {/* Waterfall marble ends */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (w / 2 - 0.025), (h - 0.05) / 2, 0]} castShadow>
          <boxGeometry args={[0.05, h - 0.05, d]} />
          <meshStandardMaterial map={marble} roughness={0.12} />
        </mesh>
      ))}
      <mesh position={[-w * 0.2, h + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.6, 0.5]} />
        <meshStandardMaterial color="#0b0c0e" roughness={0.15} />
      </mesh>
      <Brass p={[0, h - 0.07, -d / 2 + 0.01]} s={[w - 0.12, 0.02, 0.02]} />
      <mesh position={[w * 0.25, h + 0.08, 0.1]} castShadow><cylinderGeometry args={[0.12, 0.09, 0.12, 20]} /><meshStandardMaterial color="#f1ede6" roughness={0.3} /></mesh>
      {[0, 1, 2].map((i) => <mesh key={i} position={[w * 0.25 + (i - 1) * 0.05, h + 0.17, 0.1]}><sphereGeometry args={[0.035, 10, 8]} /><meshStandardMaterial color={['#f2a52a', '#d63a2a', '#9cc455'][i]} roughness={0.5} /></mesh>)}
    </>
  );
}

function Bathtub({ w, d, h, color }: { w: number; d: number; h: number; color: string }) {
  return (
    <>
      <mesh position={[0, h / 2, 0]} scale={[w / 2, 1, d / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[1, 0.88, h, 40]} />
        <meshStandardMaterial color={color} roughness={0.35} />
      </mesh>
      <mesh position={[0, h - 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[w / 2 - 0.06, d / 2 - 0.06, 1]}>
        <circleGeometry args={[1, 40]} />
        <meshStandardMaterial color="#b9d8e2" roughness={0.05} transparent opacity={0.85} />
      </mesh>
      <Brass p={[w / 2 - 0.12, h + 0.15, 0]} s={[0.018, 0.4, 0]} round />
      <Brass p={[w / 2 - 0.2, h + 0.34, 0]} s={[0.16, 0.025, 0.025]} />
    </>
  );
}

/** The Luxe version of a piece, or null if this kind has no Luxe look. */
export function LuxePiece({ f }: { f: Furniture }) {
  const [w, h, d] = f.size;
  const turned = d > w;
  // Drawn unturned (long side along x), then turned into place
  const L = turned ? d : w;
  const D = turned ? w : d;
  switch (f.kind) {
    // Real velvet sofa (faces +z as modelled: turned round so its back is to +z like ours)
    case 'sofa': return <Turned turned={turned}><RealModel name={f.color.toLowerCase() === '#f2d6dc' ? 'sofa-velvet-blush' : 'sofa-velvet-champagne'} fit={[L, h, D]} rotationY={Math.PI} recolor={{ match: /fabric/i, color: f.color }} fallback={<Sofa w={L} d={D} color={f.color} />} /></Turned>;
    case 'table': return w * d > 2 ? <Turned turned={turned}><DiningTable w={L} d={D} h={h} /></Turned> : <CoffeeTable w={w} d={d} h={h} />;
    case 'armchair': return <RealModel name="chair-velvet-peacock" fit={[w, h, d]} rotationY={Math.PI} fallback={<AccentChair w={w} d={d} color={f.color} />} />;
    // A screen faces into the room, whichever wall it stands against
    case 'tv': return <group rotation={[0, turned ? (f.at[0] >= 0 ? Math.PI / 2 : -Math.PI / 2) : f.at[1] >= 0 ? 0 : Math.PI, 0]}><TvConsole w={L} d={D} h={h} color={f.color} /></group>;
    case 'bookshelf': return <Turned turned={turned}><Bookshelf w={L} d={D} h={h} /></Turned>;
    case 'lamp': return <FloorLamp w={w} h={h} />;
    case 'rug': return <Rug w={w} d={d} />;
    // Tall corner plants are palms; smaller ones a real potted plant
    case 'plant': return h > 1.2 ? <PottedPalm position={[0, 0, 0]} height={h} /> : <RealModel name="plant-potted" fit={[w, h, d]} fallback={<PottedPalm position={[0, 0, 0]} height={h} />} />;
    case 'art': return <WallArt f={f} />;
    case 'counter': return <Turned turned={turned}><KitchenIsland w={L} d={D} h={h} /></Turned>;
    // Like the basic bed, the headboard is always on +z
    case 'bed': return <LuxeBed w={w} d={d} color={f.color} design={f.design} />;
    case 'wardrobe': return <Turned turned={turned}><LuxeWardrobe w={L} h={h} d={D} /></Turned>;
    case 'dresser': return f.design === 'vanity' ? <Turned turned={turned}><LuxeVanity w={L} h={h} d={D} /></Turned> : <LuxeNightstand w={w} h={h} d={d} color={f.color} />;
    case 'bathtub': return <Turned turned={turned}><Bathtub w={L} d={D} h={h} color={f.color} /></Turned>;
    default: return null;
  }
}
