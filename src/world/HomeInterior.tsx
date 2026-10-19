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
export function HomeInterior({ interior, gameTime, doorOpen = false, children }: { interior: Interior; gameTime: GameTime; doorOpen?: boolean; children: ReactNode }) {
  const { width: w, depth: d } = interior;
  const night = lightingAt(gameTime.hour, gameTime.minute).night;
  const H = WALL_HEIGHT;
  const doorW = 1.4;
  const side = (w - doorW) / 2;
  const windowWidth = interior.window === 'full' ? w * 0.48 : interior.window === 'wide' ? Math.min(3.2, w * 0.32) : 1.35;
  const windowHeight = interior.window === 'full' ? H - 0.45 : interior.window === 'wide' ? 1.55 : 1.1;
  const windowY = interior.window === 'full' ? H / 2 : 1.95;
  const windowSide = (w - windowWidth) / 2;
  const windowTop = H - (windowY + windowHeight / 2);
  const windowBottom = windowY - windowHeight / 2;
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

      {/* Walls, with a real opening for the rear window */}
      <Wall color={interior.wallColor} position={[-(w + windowWidth) / 4, H / 2, d / 2]} rotationY={Math.PI} size={[windowSide, H]} />
      <Wall color={interior.wallColor} position={[(w + windowWidth) / 4, H / 2, d / 2]} rotationY={Math.PI} size={[windowSide, H]} />
      <Wall color={interior.wallColor} position={[0, windowY + windowHeight / 2 + windowTop / 2, d / 2]} rotationY={Math.PI} size={[windowWidth, windowTop]} />
      <Wall color={interior.wallColor} position={[0, windowBottom / 2, d / 2]} rotationY={Math.PI} size={[windowWidth, windowBottom]} />
      <Wall color={interior.wallColor} position={[-w / 2, H / 2, 0]} rotationY={Math.PI / 2} size={[d, H]} />
      <Wall color={interior.wallColor} position={[w / 2, H / 2, 0]} rotationY={-Math.PI / 2} size={[d, H]} />
      <Wall color={interior.wallColor} position={[-(doorW / 2 + side / 2), H / 2, -d / 2]} rotationY={0} size={[side, H]} />
      <Wall color={interior.wallColor} position={[doorW / 2 + side / 2, H / 2, -d / 2]} rotationY={0} size={[side, H]} />
      <Wall color={interior.wallColor} position={[0, (H + 2.1) / 2, -d / 2]} rotationY={0} size={[doorW, H - 2.1]} />
      {/* The door is a visible entry point; E opens it and exits through the same doorway. */}
      <group position={[-(doorW - 0.2) / 2, 0, -d / 2 + 0.06]} rotation={[0, doorOpen ? -Math.PI / 2 : 0, 0]}>
        <mesh position={[(doorW - 0.2) / 2, 1.05, 0]} castShadow>
          <boxGeometry args={[doorW - 0.2, 2.1, 0.08]} />
          <meshStandardMaterial color="#5a3d28" roughness={0.6} />
        </mesh>
        <mesh position={[(doorW - 0.2) / 2 + 0.48, 1.02, 0.055]} castShadow>
          <sphereGeometry args={[0.045, 12, 10]} />
          <meshStandardMaterial color="#c7a35c" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Glazed rear window with timber surround and a central mullion. */}
      <mesh position={[0, windowY, d / 2 - 0.04]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[windowWidth - 0.12, windowHeight - 0.12]} />
        <meshStandardMaterial color={sky} emissive={sky} emissiveIntensity={night > 0.5 ? 0.5 : 0.9} roughness={0.18} metalness={0.08} />
      </mesh>
      <mesh position={[0, windowY, d / 2 - 0.065]} castShadow>
        <boxGeometry args={[0.07, windowHeight, 0.07]} />
        <meshStandardMaterial color="#60452f" roughness={0.7} />
      </mesh>
      {[-1, 1].map((sideSign) => (
        <mesh key={sideSign} position={[sideSign * (windowWidth / 2 - 0.035), windowY, d / 2 - 0.065]} castShadow>
          <boxGeometry args={[0.07, windowHeight, 0.07]} />
          <meshStandardMaterial color="#60452f" roughness={0.7} />
        </mesh>
      ))}
      {[-1, 1].map((verticalSign) => (
        <mesh key={verticalSign} position={[0, windowY + verticalSign * (windowHeight / 2 - 0.035), d / 2 - 0.065]} castShadow>
          <boxGeometry args={[windowWidth, 0.07, 0.07]} />
          <meshStandardMaterial color="#60452f" roughness={0.7} />
        </mesh>
      ))}

      {interior.partitions.map((wall, i) => (
        <mesh key={i} position={wall.position} castShadow receiveShadow>
          <boxGeometry args={wall.size} />
          <meshStandardMaterial color={interior.wallColor} roughness={0.9} />
        </mesh>
      ))}

      {interior.window === 'full' && (
        <pointLight position={[0, windowY, d / 2 - 0.4]} intensity={night > 0.5 ? 0.5 : 2.2} distance={w * 0.8} color={sky} />
      )}

      {interior.furniture.map((f, i) => <Piece key={i} f={f} />)}

      {/* Warm practical lights make each room legible without flattening the daylight. */}
      <ambientLight intensity={0.55} />
      {[
        [-w / 4, H - 0.18, -d / 4],
        [w / 4, H - 0.18, -d / 4],
        [-w / 4, H - 0.18, d / 4],
        [w / 4, H - 0.18, d / 4],
      ].map((position, index) => (
        <pointLight key={index} position={position as [number, number, number]} intensity={2.4 + night * 5} distance={Math.max(w, d) * 0.55} decay={1.7} color="#ffdfb4" />
      ))}
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
          {box(w, 0.3, d, 0.2, '#342f2c')}
          {box(w - 0.18, 0.28, d - 0.2, 0.46, f.color)}
          {long ? box(w, 0.48, 0.22, 0.65, f.color, 0, d / 2 - 0.1) : box(0.22, 0.48, d, 0.65, f.color, w / 2 - 0.1, 0)}
          {long
            ? [-1, 1].map((side) => box(w / 2 - 0.08, 0.22, d - 0.28, 0.62, '#777a76', side * w / 4, -d / 2 + 0.1))
            : [-1, 1].map((side) => box(w - 0.28, 0.22, d / 2 - 0.08, 0.62, '#777a76', -w / 2 + 0.1, side * d / 4))}
        </>
      );
      break;
    }
    case 'table':
    case 'desk':
    case 'conference-table':
    case 'reception':
      parts = (
        <>
          {box(w, 0.05, d, h - 0.025, f.color)}
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.05, h - 0.05, 0.05, (h - 0.05) / 2, '#2b2b2d', sx * (w / 2 - 0.06), sz * (d / 2 - 0.06), `${sx}${sz}`)))}
        </>
      );
      break;
    case 'computer':
      parts = (
        <>
          {box(w, 0.06, d, 0.03, f.color)}
          {box(w * 0.12, h * 0.22, 0.08, h * 0.2, '#252a30', 0, -d * 0.25)}
          {box(w * 0.72, h * 0.58, 0.08, h * 0.55, '#252a30', 0, -d * 0.25)}
          {box(w * 0.62, h * 0.43, 0.025, h * 0.56, '#6f9da1', 0, -d * 0.2)}
          {box(w * 0.5, 0.035, d * 0.32, h * 0.1, '#b8bdc0', 0, d * 0.2)}
        </>
      );
      break;
    case 'file-cabinet':
      parts = (
        <>
          {box(w, h, d, h / 2, f.color)}
          {[0.25, 0.5, 0.75].map((p) => (
            <group key={p}>
              {box(w * 0.78, 0.015, 0.018, h * p, '#4c5154', 0, d / 2 + 0.012)}
              {box(w * 0.22, 0.035, 0.04, h * p + 0.12, '#b5b4ad', 0, d / 2 + 0.025)}
            </group>
          ))}
        </>
      );
      break;
    case 'tv':
      parts = (
        <>
          {box(w * 0.58, 0.5, d * 0.9, 0.25, '#403b35')}
          {box(w * 0.08, 0.32, 0.08, 0.68, '#383a3b')}
          {box(w, h - 0.25, 0.08, (h + 0.25) / 2, '#111416')}
          {box(w * 0.92, h - 0.38, 0.025, (h + 0.22) / 2, '#263b43')}
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
    case 'cabinet':
      parts = (
        <>
          {box(w, h, d, h / 2, f.color)}
          {[-1, 1].map((side) => box(w * 0.44, h * 0.86, 0.035, h / 2, '#b6a58f', side * w * 0.25, d / 2 + 0.02))}
          {[-1, 1].map((side) => box(0.035, 0.16, 0.035, h / 2, '#d2b36f', side * 0.12, d / 2 + 0.05))}
        </>
      );
      break;
    case 'mirror':
      parts = (
        <>
          {box(w, h, d, h / 2, '#574536')}
          <mesh position={[w / 2 + 0.012, h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[d * 0.84, h * 0.82]} />
            <meshStandardMaterial color="#a8c1c6" metalness={0.55} roughness={0.18} />
          </mesh>
        </>
      );
      break;
    case 'sink':
      parts = (
        <>
          {box(w * 0.78, h * 0.75, d * 0.78, h * 0.38, '#80684e')}
          {box(w, 0.12, d, h * 0.8, '#e0ddd4')}
          <mesh position={[0, h * 0.89, 0]} castShadow>
            <cylinderGeometry args={[w * 0.32, w * 0.4, 0.1, 24]} />
            <meshStandardMaterial color="#bfc7c7" metalness={0.45} roughness={0.25} />
          </mesh>
          <mesh position={[0, h * 0.98, -d * 0.25]} castShadow>
            <torusGeometry args={[0.12, 0.025, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#aeb8ba" metalness={0.7} roughness={0.22} />
          </mesh>
        </>
      );
      break;
    case 'toilet':
      parts = (
        <>
          {box(w * 0.72, h * 0.42, d * 0.34, h * 0.78, '#e5e5e1', 0, d * 0.3)}
          <mesh position={[0, h * 0.35, -d * 0.12]} castShadow>
            <cylinderGeometry args={[w * 0.48, w * 0.4, h * 0.35, 24]} />
            <meshStandardMaterial color="#e5e5e1" roughness={0.28} />
          </mesh>
          <mesh position={[0, h * 0.54, -d * 0.12]} castShadow>
            <torusGeometry args={[w * 0.38, 0.045, 10, 24]} />
            <meshStandardMaterial color="#d0d0cc" roughness={0.3} />
          </mesh>
        </>
      );
      break;
    case 'shower':
      parts = (
        <>
          {box(w, 0.08, d, 0.04, '#d4d7d3')}
          {box(0.06, h, d, h / 2, '#9ab3b7', -w / 2, 0, 'left-glass')}
          {box(w, h, 0.06, h / 2, '#9ab3b7', 0, -d / 2, 'back-glass')}
          <mesh position={[w * 0.2, h - 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.18, 0.025, 8, 24]} />
            <meshStandardMaterial color="#aeb8ba" metalness={0.65} roughness={0.25} />
          </mesh>
        </>
      );
      break;
    default:
      // Wardrobe, counter, fridge: a solid unit
      parts = box(w, h, d, h / 2, f.color);
  }
  return <group position={[x, f.elevation ?? 0, z]}>{parts}</group>;
}
