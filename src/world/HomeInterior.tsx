import { DoubleSide } from 'three';
import type { ReactNode } from 'react';
import type { Furniture, Interior } from '../lib/interiors';
import { WALL_HEIGHT } from '../lib/interiors';
import { lightingAt } from './timeOfDay';
import type { GameTime } from '../lib/gameState';

/**
 * Inside the player's home. The walls face inwards only, so from the camera
 * (often behind the front wall) you look straight into the room, like a
 * dolls' house; there is no ceiling for the same reason.
 */
export function HomeInterior({ interior, gameTime, children }: { interior: Interior; gameTime: GameTime; children: ReactNode }) {
  const { width: w, depth: d } = interior;
  const night = lightingAt(gameTime.hour, gameTime.minute).night;
  const H = WALL_HEIGHT;
  const doorW = 1.4;
  const side = (w - doorW) / 2;
  const windowSize = interior.window === 'full' ? [w * 0.8, H - 0.3] : interior.window === 'wide' ? [Math.min(3.2, w * 0.5), 1.4] : [1.1, 1.0];
  const windowY = interior.window === 'full' ? H / 2 : 1.6;
  // Daylight or a night city outside the window
  const sky = night > 0.5 ? '#1b2536' : night > 0.1 ? '#e0a46c' : '#bcd6e8';

  return (
    <group>
      {/* Ground around the building, so there is no void below */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#2a2c2f" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={interior.floorColor} roughness={0.75} />
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
        <meshStandardMaterial color={sky} emissive={sky} emissiveIntensity={night > 0.5 ? 0.5 : 0.9} roughness={0.2} />
      </mesh>

      {interior.furniture.map((f, i) => <Piece key={i} f={f} />)}

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

/** One piece of furniture, built from simple shapes. */
function Piece({ f }: { f: Furniture }) {
  const [w, h, d] = f.size;
  const [x, z] = f.at;
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
    default:
      // Wardrobe, counter, fridge: a solid unit
      parts = box(w, h, d, h / 2, f.color);
  }
  return <group position={[x, 0, z]}>{parts}</group>;
}
