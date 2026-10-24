import { DoubleSide } from 'three';
import { useMemo, type ReactNode } from 'react';
import type { Furniture, Interior } from '../lib/interiors';
import { WALL_HEIGHT } from '../lib/interiors';
import { lightingAt } from './timeOfDay';
import { marbleTexture, skyMoodAt, skylineTexture } from './venueTextures';
import { LuxePiece } from './LuxeFurniture';
import type { GameTime } from '../lib/gameState';

/**
 * Inside the player's home. The walls face inwards only, so from the camera
 * (often behind the front wall) you look straight into the room, like a
 * dolls' house; there is no ceiling for the same reason.
 */
export function HomeInterior({ interior, gameTime, extra = [], children }: { interior: Interior; gameTime: GameTime; extra?: readonly Furniture[]; children: ReactNode }) {
  const { width: w, depth: d } = interior;
  const night = lightingAt(gameTime.hour, gameTime.minute).night;
  const H = WALL_HEIGHT;
  const doorW = 1.4;
  const side = (w - doorW) / 2;
  const windowSize = interior.window === 'full' ? [w * 0.8, H - 0.3] : interior.window === 'wide' ? [Math.min(3.2, w * 0.5), 1.4] : [1.1, 1.0];
  const windowY = interior.window === 'full' ? H / 2 : 1.6;
  // The city outside the window, by time of day
  const sky = skylineTexture(skyMoodAt(night, gameTime.hour), 23);
  const luxe = interior.tier === 'penthouse' || interior.tier === 'apartment';
  const floor = useMemo(() => (interior.tier === 'penthouse' ? marbleTexture('cream', [w / 2.4, d / 2.4]) : null), [interior.tier, w, d]);
  // Pendant lights over the kitchen island and the dining table
  const pendants = luxe ? [...interior.furniture, ...extra].filter((f) => (f.kind === 'counter' || (f.kind === 'table' && f.size[0] * f.size[2] > 2)) && f.style === 'luxe') : [];

  return (
    <group>
      {/* Ground around the building, so there is no void below */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#2a2c2f" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        {floor ? <meshStandardMaterial map={floor} roughness={0.14} /> : <meshStandardMaterial color={interior.floorColor} roughness={0.75} />}
      </mesh>

      {/* Walls, facing inwards */}
      <Wall color={interior.wallColor} position={[0, H / 2, d / 2]} rotationY={Math.PI} size={[w, H]} />
      <Wall color={interior.wallColor} position={[-w / 2, H / 2, 0]} rotationY={Math.PI / 2} size={[d, H]} />
      <Wall color={interior.wallColor} position={[w / 2, H / 2, 0]} rotationY={-Math.PI / 2} size={[d, H]} />
      <Wall color={interior.wallColor} position={[-(doorW / 2 + side / 2), H / 2, -d / 2]} rotationY={0} size={[side, H]} />
      <Wall color={interior.wallColor} position={[doorW / 2 + side / 2, H / 2, -d / 2]} rotationY={0} size={[side, H]} />
      <Wall color={interior.wallColor} position={[0, (H + 2.1) / 2, -d / 2]} rotationY={0} size={[doorW, H - 2.1]} />
      {/* Front door, closed behind you (faces inwards like the walls, so the camera sees past it) */}
      <mesh position={[0, 1.05, -d / 2 + 0.01]}>
        <planeGeometry args={[doorW - 0.2, 2.1]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.6} />
      </mesh>

      {/* Window on the far wall */}
      <mesh position={[0, windowY, d / 2 - 0.02]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={windowSize as [number, number]} />
        <meshStandardMaterial map={sky} emissiveMap={sky} emissive="#ffffff" emissiveIntensity={night > 0.5 ? 0.7 : 0.85} roughness={0.2} toneMapped={false} />
      </mesh>
      {interior.window === 'full' && Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[-windowSize[0] / 2 + (i * windowSize[0]) / 4, windowY, d / 2 - 0.04]}>
          <boxGeometry args={[0.05, windowSize[1], 0.04]} />
          <meshStandardMaterial color="#2b2622" roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
      {/* Warm cove light along the top of the walls */}
      {luxe && [[0, d / 2 - 0.03, w, 0], [-w / 2 + 0.03, 0, d, Math.PI / 2], [w / 2 - 0.03, 0, d, -Math.PI / 2]].map(([x, z, len, ry], i) => (
        <mesh key={i} position={[x, H - 0.12, z]} rotation={[0, ry, 0]}>
          <boxGeometry args={[len, 0.035, 0.03]} />
          <meshStandardMaterial color="#fff2d6" emissive="#ffcf8a" emissiveIntensity={1.4 + night * 1.5} toneMapped={false} />
        </mesh>
      ))}
      {pendants.map((p, i) => (
        <group key={i} position={[p.at[0], 0, p.at[1]]}>
          {[-1, 0, 1].map((k) => {
            const along = p.size[0] >= p.size[2];
            const off = k * Math.max(p.size[0], p.size[2]) * 0.28;
            return (
              <group key={k} position={[along ? off : 0, 2.05, along ? 0 : off]}>
                <mesh position={[0, (H - 2.05) / 2 + 0.2, 0]}>
                  <cylinderGeometry args={[0.006, 0.006, H - 2.05 + 0.4, 6]} />
                  <meshStandardMaterial color="#c9a052" metalness={0.85} roughness={0.3} />
                </mesh>
                <mesh>
                  <sphereGeometry args={[0.13, 20, 16]} />
                  <meshStandardMaterial color="#fff2d6" emissive="#ffcf8a" emissiveIntensity={1 + night} toneMapped={false} transparent opacity={0.95} />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}

      {interior.furniture.map((f, i) => <Piece key={i} f={f} />)}
      {/* Furniture you bought */}
      {extra.map((f, i) => <Piece key={`own-${i}`} f={f} />)}

      {/* Ceiling light: warm, brighter after dark */}
      <pointLight position={[0, H - 0.2, 0]} intensity={4 + night * 14} distance={Math.max(w, d) * 1.6} decay={1.6} color="#ffd9a8" />
      {children}
    </group>
  );
}

function Wall({ color, position, rotationY, size }: { color: string; position: [number, number, number]; rotationY: number; size: [number, number] }) {
  return (
    <mesh position={position} rotation={[0, rotationY, 0]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

const box = (w: number, h: number, d: number, y: number, color: string, x = 0, z = 0, key?: string) => (
  <mesh key={key} position={[x, y, z]} castShadow receiveShadow>
    <boxGeometry args={[w, h, d]} />
    <meshStandardMaterial color={color} roughness={0.7} />
  </mesh>
);

/** One piece of furniture, built from simple shapes (also used for the catalogue's 3D preview). */
export function Piece({ f }: { f: Furniture }) {
  const [w, h, d] = f.size;
  const [x, z] = f.at;
  if (f.style === 'luxe' || f.kind === 'art') return <group position={[x, 0, z]}><LuxePiece f={f} /></group>;
  let parts: ReactNode;
  switch (f.kind) {
    case 'bed':
      parts = (
        <>
          {box(w, 0.3, d, 0.15, '#3b2c22')}
          {box(w - 0.05, 0.22, d - 0.1, 0.41, '#f1ede6')}
          {box(w - 0.05, 0.06, d * 0.6, 0.55, f.color, 0, -d * 0.18)}
          {box(w * 0.8, 0.12, 0.35, 0.58, '#ffffff', 0, d / 2 - 0.3)}
          {box(w, 0.9, 0.08, 0.45, '#3b2c22', 0, d / 2 - 0.04)}
        </>
      );
      break;
    case 'sofa': {
      const long = w >= d;
      parts = (
        <>
          {box(w, 0.42, d, 0.21, f.color)}
          {long ? box(w, 0.5, 0.25, 0.6, f.color, 0, d / 2 - 0.12) : box(0.25, 0.5, d, 0.6, f.color, w / 2 - 0.12, 0)}
        </>
      );
      break;
    }
    case 'table':
    case 'desk':
      parts = (
        <>
          {box(w, 0.05, d, h - 0.025, f.color)}
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.05, h - 0.05, 0.05, (h - 0.05) / 2, '#2b2b2d', sx * (w / 2 - 0.06), sz * (d / 2 - 0.06), `${sx}${sz}`)))}
        </>
      );
      break;
    case 'tv':
      parts = (
        <>
          {box(w, 0.45, d, 0.225, '#3a3a3c')}
          {box(w * 0.95, h - 0.5, 0.05, 0.45 + (h - 0.5) / 2, '#0d0e10')}
        </>
      );
      break;
    case 'rug':
      parts = (
        <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial color={f.color} roughness={1} />
        </mesh>
      );
      break;
    case 'plant':
      parts = (
        <>
          {box(w * 0.7, 0.4, d * 0.7, 0.2, '#8a5a3c')}
          <mesh position={[0, 0.4 + (h - 0.4) / 2, 0]} castShadow>
            <sphereGeometry args={[Math.max(w, d) * 0.6, 12, 10]} />
            <meshStandardMaterial color={f.color} roughness={0.9} />
          </mesh>
        </>
      );
      break;
    case 'lamp':
      parts = (
        <>
          {box(0.05, h - 0.3, 0.05, (h - 0.3) / 2, '#2b2b2d')}
          <mesh position={[0, h - 0.15, 0]}>
            <cylinderGeometry args={[w * 0.35, w * 0.5, 0.3, 16, 1, true]} />
            <meshStandardMaterial color={f.color} emissive={f.color} emissiveIntensity={0.6} side={DoubleSide} />
          </mesh>
        </>
      );
      break;
    case 'armchair':
      parts = (
        <>
          {box(w, 0.4, d, 0.2, f.color)}
          {box(w, 0.5, 0.18, 0.6, f.color, 0, d / 2 - 0.09)}
          {box(0.14, 0.25, d, 0.52, f.color, -w / 2 + 0.07)}
          {box(0.14, 0.25, d, 0.52, f.color, w / 2 - 0.07)}
        </>
      );
      break;
    case 'shower':
      parts = (
        <>
          {box(w, 0.08, d, 0.04, '#e8eaea')}
          {/* Glass screen on the open sides, a tiled back */}
          <mesh position={[0, h / 2, -d / 2 + 0.01]}>
            <boxGeometry args={[w, h, 0.02]} />
            <meshStandardMaterial color={f.color} transparent opacity={0.35} roughness={0.05} />
          </mesh>
          <mesh position={[w / 2 - 0.01, h / 2, 0]}>
            <boxGeometry args={[0.02, h, d]} />
            <meshStandardMaterial color={f.color} transparent opacity={0.35} roughness={0.05} />
          </mesh>
          {box(w, h, 0.04, h / 2, '#dfe3e2', 0, d / 2 - 0.02)}
          {box(0.04, h, d, h / 2, '#dfe3e2', -w / 2 + 0.02)}
          {box(0.18, 0.04, 0.18, h - 0.2, '#b8bcbf', 0, d / 2 - 0.25)}
        </>
      );
      break;
    case 'bathtub':
      parts = (
        <>
          {box(w, h * 0.85, d, (h * 0.85) / 2, f.color)}
          {box(w - 0.14, 0.02, d - 0.14, h * 0.85 + 0.005, '#9fc3d1')}
          {box(0.05, 0.25, 0.05, h + 0.1, '#b8bcbf', -w / 2 + 0.12)}
        </>
      );
      break;
    case 'bookshelf':
      parts = (
        <>
          {box(w, h, 0.04, h / 2, f.color, 0, d / 2 - 0.02)}
          {box(0.04, h, d, h / 2, f.color, -w / 2 + 0.02)}
          {box(0.04, h, d, h / 2, f.color, w / 2 - 0.02)}
          {[0, 1, 2, 3, 4].map((k) => box(w, 0.03, d, 0.02 + k * (h / 4.4), f.color, 0, 0, `s${k}`))}
          {[0, 1, 2, 3].map((k) => box(w * 0.8, h / 4.4 - 0.08, d * 0.7, 0.04 + k * (h / 4.4) + (h / 4.4 - 0.08) / 2, ['#7b2f2f', '#2f5a7b', '#c49a3a', '#3e6b4a'][k], 0, 0, `b${k}`))}
        </>
      );
      break;
    case 'stove':
      parts = (
        <>
          {box(w, h, d, h / 2, f.color)}
          {box(w * 0.8, 0.4, 0.02, 0.4, '#1c1d20', 0, -d / 2 - 0.01)}
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.14, 0.02, 0.14, h + 0.01, '#2a2a2a', sx * w * 0.22, sz * d * 0.22, `h${sx}${sz}`)))}
        </>
      );
      break;
    case 'speaker':
      parts = (
        <>
          {box(w, h, d, h / 2, f.color)}
          <mesh position={[0, h * 0.62, -d / 2 - 0.005]}>
            <circleGeometry args={[w * 0.32, 20]} />
            <meshStandardMaterial color="#111" roughness={0.6} />
          </mesh>
        </>
      );
      break;
    case 'console':
      parts = (
        <>
          {box(w, 0.45, d, 0.225, '#3a3a3c')}
          {box(w * 0.95, h - 0.5, 0.05, 0.45 + (h - 0.5) / 2, '#0d0e10')}
          {box(0.3, 0.06, 0.2, 0.48, f.color, -w * 0.3, -d * 0.1)}
        </>
      );
      break;
    case 'dresser':
      parts = (
        <>
          {box(w, h, d, h / 2, f.color)}
          {[0, 1, 2, 3].map((k) => box(w * 0.9, 0.02, 0.02, 0.12 + k * (h / 4.2), '#3b2c22', 0, -d / 2 - 0.01, `d${k}`))}
        </>
      );
      break;
    default:
      // Wardrobe, counter, fridge: a solid unit
      parts = box(w, h, d, h / 2, f.color);
  }
  return <group position={[x, 0, z]}>{parts}</group>;
}
