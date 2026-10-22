import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, type Group, type MeshStandardMaterial } from 'three';
import type { ReactNode } from 'react';
import type { Furniture, Interior } from '../lib/interiors';
import { WALL_HEIGHT } from '../lib/interiors';
import { lightingAt } from './timeOfDay';
import type { GameTime } from '../lib/gameState';
import { interiorFloorMaterial } from './interiorMaterials';

/**
 * Shared enclosed interior shell for homes and public venues. Roof and wall
 * visibility adapt to the indoor camera so the architecture remains built
 * without blocking the player's view.
 */
export function HomeInterior({ interior, gameTime, doorOpen = false, children }: { interior: Interior; gameTime: GameTime; doorOpen?: boolean; children: ReactNode }) {
  const ceiling = useRef<Group>(null);
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
  const windowFrame = interior.architecture === 'office' ? '#343a3d'
    : interior.architecture === 'boutique' ? '#b99658'
      : interior.architecture === 'restaurant' ? '#4b3829'
        : interior.architecture === 'dealership' ? '#9a8760' : '#60452f';
  const ceilingColor = interior.architecture === 'restaurant' ? '#382d26'
    : interior.architecture === 'boutique' ? '#24201e'
      : interior.architecture === 'office' ? '#e1e0dc'
        : interior.architecture === 'dealership' ? '#e3e0d8' : '#eeeae2';
  // Daylight or a night city outside the window
  const sky = night > 0.5 ? '#1b2536' : night > 0.1 ? '#e0a46c' : '#bcd6e8';

  useFrame(({ camera }) => {
    if (!ceiling.current) return;
    const cameraIsAboveTheRoom = camera.position.y > H
      && Math.abs(camera.position.x) < w / 2
      && Math.abs(camera.position.z) < d / 2;
    ceiling.current.visible = !cameraIsAboveTheRoom;
  });

  return (
    <group>
      <mesh position={[0, -0.09, 0]} receiveShadow castShadow>
        <boxGeometry args={[w + 0.36, 0.18, d + 0.36]} />
        <meshStandardMaterial color={interior.architecture === 'office' ? '#4e504d' : '#403b35'} roughness={0.86} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <primitive object={interiorFloorMaterial(interior)} attach="material" />
      </mesh>

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

      <mesh position={[0, windowY, d / 2 - 0.09]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[windowWidth - 0.12, windowHeight - 0.12]} />
        <meshStandardMaterial
          color={sky}
          emissive={sky}
          emissiveIntensity={night > 0.5 ? 0.28 : 0.14}
          roughness={0.16}
          metalness={0.28}
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, windowY, d / 2 - 0.14]} castShadow>
        <boxGeometry args={[0.055, windowHeight - 0.08, 0.08]} />
        <meshStandardMaterial color={windowFrame} roughness={0.42} metalness={interior.architecture === 'office' || interior.architecture === 'boutique' ? 0.65 : 0.12} />
      </mesh>
      {[-1, 1].map((sideSign) => (
        <mesh key={sideSign} position={[sideSign * (windowWidth / 2 - 0.035), windowY, d / 2 - 0.14]} castShadow>
          <boxGeometry args={[0.07, windowHeight, 0.09]} />
          <meshStandardMaterial color={windowFrame} roughness={0.42} metalness={interior.architecture === 'office' || interior.architecture === 'boutique' ? 0.65 : 0.12} />
        </mesh>
      ))}
      {[-1, 1].map((verticalSign) => (
        <mesh key={verticalSign} position={[0, windowY + verticalSign * (windowHeight / 2 - 0.035), d / 2 - 0.14]} castShadow>
          <boxGeometry args={[windowWidth, 0.07, 0.09]} />
          <meshStandardMaterial color={windowFrame} roughness={0.42} metalness={interior.architecture === 'office' || interior.architecture === 'boutique' ? 0.65 : 0.12} />
        </mesh>
      ))}
      <mesh position={[0, windowY, d / 2 - 0.15]} castShadow>
        <boxGeometry args={[0.045, windowHeight - 0.12, 0.09]} />
        <meshStandardMaterial color={windowFrame} roughness={0.42} metalness={0.55} />
      </mesh>
      <mesh position={[0, windowY, d / 2 - 0.15]} castShadow>
        <boxGeometry args={[windowWidth - 0.08, 0.045, 0.09]} />
        <meshStandardMaterial color={windowFrame} roughness={0.42} metalness={0.55} />
      </mesh>

      {interior.partitions.map((wall, i) => (
        wall.material === 'glass'
          ? <GlassPartition key={i} wall={wall} frame={windowFrame} />
          : <mesh key={i} position={wall.position} castShadow receiveShadow>
              <boxGeometry args={wall.size} />
              <meshStandardMaterial color={interior.wallColor} roughness={0.9} />
            </mesh>
      ))}

      <group ref={ceiling}>
        <mesh position={[0, H + 0.06, 0]} castShadow receiveShadow>
          <boxGeometry args={[w + 0.36, 0.16, d + 0.36]} />
          <meshStandardMaterial color={ceilingColor} roughness={0.82} />
        </mesh>
        <mesh position={[0, H - 0.1, 0]}>
          <boxGeometry args={[w, 0.035, 0.06]} />
          <meshStandardMaterial color={interior.architecture === 'boutique' ? '#b99658' : windowFrame} metalness={0.6} roughness={0.36} />
        </mesh>
        {interior.architecture === 'office' && (
          <>
            {[-w / 3, w / 3].map((x) => (
              <mesh key={x} position={[x, H - 0.12, 0]}>
                <boxGeometry args={[0.035, 0.035, d]} />
                <meshStandardMaterial color="#c4c5c1" roughness={0.82} />
              </mesh>
            ))}
            {[-1, 1].map((sideSign) => (
              <mesh key={sideSign} position={[sideSign * w / 4, H - 0.1, 0]}>
                <boxGeometry args={[1.9, 0.045, 0.36]} />
                <meshStandardMaterial color="#f9f7ef" emissive="#e6dfc7" emissiveIntensity={0.35} roughness={0.32} />
              </mesh>
            ))}
          </>
        )}
        {interior.architecture === 'boutique' && (
          <mesh position={[0, H - 0.1, -d / 4]}>
            <boxGeometry args={[w - 1, 0.035, 0.045]} />
            <meshStandardMaterial color="#c9a35e" emissive="#c9a35e" emissiveIntensity={0.35} metalness={0.62} roughness={0.32} />
          </mesh>
        )}
      </group>

      {interior.window === 'full' && (
        <pointLight position={[0, windowY, d / 2 - 0.4]} intensity={night > 0.5 ? 0.5 : 1.4} distance={w * 0.8} color={sky} />
      )}

      {interior.furniture.map((f, i) => <InteriorFurniturePiece key={i} f={f} />)}

      {/* Warm practical lights make each room legible without flattening the daylight. */}
      <ambientLight intensity={interior.architecture === 'office' ? 0.38 : 0.48} />
      {[
        [-w / 4, H - 0.25, -d / 4],
        [w / 4, H - 0.25, -d / 4],
        [-w / 4, H - 0.25, d / 4],
        [w / 4, H - 0.25, d / 4],
      ].map((position, index) => (
        <group key={index} position={position as [number, number, number]}>
          <mesh>
            <boxGeometry args={[0.32, 0.035, 0.32]} />
            <meshStandardMaterial color="#fff8e8" emissive="#ffe3b5" emissiveIntensity={0.55} roughness={0.28} />
          </mesh>
          <pointLight position={[0, -0.15, 0]} intensity={interior.architecture === 'office' ? 1.5 + night * 2 : 1.8 + night * 3} distance={Math.max(w, d) * 0.5} decay={1.7} color="#ffdfb4" />
        </group>
      ))}
      {children}
    </group>
  );
}

function Wall({ color, position, rotationY, size }: { color: string; position: readonly [number, number, number]; rotationY: number; size: readonly [number, number] }) {
  const material = useRef<MeshStandardMaterial>(null);
  useFrame(({ camera }) => {
    if (!material.current) return;
    const rotated = Math.abs(Math.sin(rotationY)) > 0.5;
    const halfWidthX = (rotated ? 0.08 : size[0] / 2) + 0.55;
    const halfWidthZ = (rotated ? size[0] / 2 : 0.08) + 0.55;
    const near = Math.abs(camera.position.x - position[0]) < halfWidthX
      && Math.abs(camera.position.z - position[2]) < halfWidthZ
      && camera.position.y > position[1] - size[1] / 2 - 0.35
      && camera.position.y < position[1] + size[1] / 2 + 0.35;
    material.current.opacity = near ? 0.14 : 1;
    material.current.depthWrite = !near;
  });
  return (
    <mesh position={position} rotation={[0, rotationY, 0]} receiveShadow castShadow>
      <boxGeometry args={[size[0], size[1], 0.16]} />
      <meshStandardMaterial ref={material} color={color} roughness={0.86} transparent />
    </mesh>
  );
}

function GlassPartition({ wall, frame }: { wall: Interior['partitions'][number]; frame: string }) {
  const [width, height, depth] = wall.size;
  const [x, y, z] = wall.position;
  return (
    <group position={[x, y, z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#91abb0" transparent opacity={0.18} metalness={0.45} roughness={0.16} depthWrite={false} />
      </mesh>
      <mesh position={[0, height / 2 - 0.04, 0]}>
        <boxGeometry args={[width + 0.04, 0.08, depth + 0.05]} />
        <meshStandardMaterial color={frame} metalness={0.62} roughness={0.36} />
      </mesh>
      <mesh position={[0, -height / 2 + 0.04, 0]}>
        <boxGeometry args={[width + 0.04, 0.08, depth + 0.05]} />
        <meshStandardMaterial color={frame} metalness={0.62} roughness={0.36} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 0, side * (depth / 2 - 0.035)]}>
          <boxGeometry args={[width + 0.04, height, 0.07]} />
          <meshStandardMaterial color={frame} metalness={0.62} roughness={0.36} />
        </mesh>
      ))}
    </group>
  );
}

const box = (w: number, h: number, d: number, y: number, color: string, x = 0, z = 0, key?: string) => (
  <mesh key={key} position={[x, y, z]} castShadow receiveShadow>
    <boxGeometry args={[w, h, d]} />
    <meshStandardMaterial color={color} roughness={0.7} />
  </mesh>
);

/** One piece of furniture, built from simple shapes. */
export function InteriorFurniturePiece({ f }: { f: Furniture }) {
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
    case 'wall-art':
      parts = (
        <>
          {box(w, h, d, h / 2, '#5a3f2b')}
          {box(w - 0.12, h - 0.12, 0.025, h / 2, '#c9a35e', 0, d / 2 + 0.014)}
          {box(w - 0.22, h - 0.22, 0.025, h / 2, '#1e2936', 0, d / 2 + 0.03)}
          <mesh position={[0, h / 2, d / 2 + 0.05]}>
            <circleGeometry args={[Math.min(w, h) * 0.18, 20]} />
            <meshStandardMaterial color="#d2b36f" roughness={0.6} />
          </mesh>
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
            ? [-1, 1].map((side) => box(w / 2 - 0.08, 0.22, d - 0.28, 0.62, '#777a76', side * w / 4, -d / 2 + 0.1, `arm-${side}`))
            : [-1, 1].map((side) => box(w - 0.28, 0.22, d / 2 - 0.08, 0.62, '#777a76', -w / 2 + 0.1, side * d / 4, `arm-${side}`))}
        </>
      );
      break;
    }
    case 'table':
    case 'desk':
    case 'conference-table':
    case 'reception':
    case 'host-stand':
      parts = (
        <>
          {box(w, 0.05, d, h - 0.025, f.color)}
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.05, h - 0.05, 0.05, (h - 0.05) / 2, '#2b2b2d', sx * (w / 2 - 0.06), sz * (d / 2 - 0.06), `${sx}${sz}`)))}
        </>
      );
      break;
    case 'dining-table':
      parts = (
        <>
          {box(w, 0.1, d, h - 0.05, f.color)}
          {box(w * 0.16, h - 0.12, d * 0.16, (h - 0.12) / 2, '#3c3027')}
          {box(w * 0.88, 0.025, d * 0.82, h + 0.012, '#c9a86a')}
        </>
      );
      break;
    case 'chair':
    case 'dining-chair':
      parts = (
        <>
          {box(w * 0.9, 0.12, d * 0.88, 0.45, f.color)}
          {box(w * 0.88, h * 0.52, 0.12, 0.66, f.color, 0, -d * 0.4)}
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.06, 0.4, 0.06, 0.2, '#332a25', sx * w * 0.36, sz * d * 0.34, `${sx}${sz}`)))}
        </>
      );
      break;
    case 'clothing-rack':
      parts = (
        <>
          {box(w, 0.045, d, h - 0.08, f.color)}
          {[-1, 1].map((side) => box(0.055, h - 0.08, 0.055, (h - 0.08) / 2, '#302823', side * (w / 2 - 0.08), 0, `upright-${side}`))}
          {box(0.045, 0.06, d, h - 0.06, '#d7d1c6')}
          {[-0.38, -0.13, 0.13, 0.38].map((offset, index) => (
            <group key={offset} position={[offset * w, 0, 0]}>
              <mesh position={[0, h * 0.52, 0]} castShadow>
                <capsuleGeometry args={[0.14, 0.42, 3, 8]} />
                <meshStandardMaterial color={['#8b292c', '#315a60', '#d0b382', '#24252b'][index]} roughness={0.88} />
              </mesh>
              <mesh position={[0, h * 0.78, 0]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[0.095, 0.012, 6, 12, Math.PI]} />
                <meshStandardMaterial color="#c9a35e" metalness={0.65} roughness={0.3} />
              </mesh>
            </group>
          ))}
        </>
      );
      break;
    case 'mannequin':
      parts = (
        <>
          {box(0.08, 0.7, 0.08, 0.35, '#9c835e')}
          <mesh position={[0, h * 0.68, 0]} castShadow>
            <capsuleGeometry args={[w * 0.32, h * 0.28, 4, 10]} />
            <meshStandardMaterial color={f.color} roughness={0.8} />
          </mesh>
          <mesh position={[0, h * 0.9, 0]} castShadow>
            <sphereGeometry args={[w * 0.23, 16, 12]} />
            <meshStandardMaterial color={f.color} roughness={0.8} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * w * 0.38, h * 0.66, 0]} rotation={[0, 0, side * 0.1]} castShadow>
              <capsuleGeometry args={[w * 0.09, h * 0.27, 3, 8]} />
              <meshStandardMaterial color={f.color} roughness={0.8} />
            </mesh>
          ))}
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * w * 0.18, h * 0.28, 0]} castShadow>
              <capsuleGeometry args={[w * 0.11, h * 0.28, 3, 8]} />
              <meshStandardMaterial color={f.color} roughness={0.8} />
            </mesh>
          ))}
        </>
      );
      break;
    case 'display-shelf':
      parts = (
        <>
          {box(w, 0.08, d, 0.04, '#c9a35e')}
          {box(0.08, h, d, h / 2, f.color, -w / 2 + 0.04, 0)}
          {box(0.08, h, d, h / 2, f.color, w / 2 - 0.04, 0)}
          {[0.58, 1.13, 1.7].map((height) => (
            <group key={height}>
              {box(w, 0.055, d, height, '#c9a35e')}
              {[-1, 0, 1].map((side) => (
                <mesh key={side} position={[side * w * 0.28, height + 0.12, 0]} castShadow>
                  <boxGeometry args={[0.34, 0.2, 0.27]} />
                  <meshStandardMaterial color={['#8b292c', '#d7c8ad', '#315a60'][(side + 1)]} roughness={0.9} />
                </mesh>
              ))}
            </group>
          ))}
          {box(0.08, h, d, h / 2, f.color, 0, -d / 2 + 0.04)}
        </>
      );
      break;
    case 'checkout-counter':
      parts = (
        <>
          {box(w, h, d, h / 2, f.color)}
          {box(w + 0.08, 0.06, d + 0.08, h, '#c9a35e')}
          {box(w * 0.9, h * 0.48, 0.035, h * 0.43, '#514035', 0, d / 2 + 0.02)}
          {box(w * 0.38, h * 0.18, 0.12, h + 0.11, '#191b1d', 0, -d * 0.1)}
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
          {[-1, 1].map((side) => box(w * 0.44, h * 0.86, 0.035, h / 2, '#b6a58f', side * w * 0.25, d / 2 + 0.02, `door-${side}`))}
          {[-1, 1].map((side) => box(0.035, 0.16, 0.035, h / 2, '#d2b36f', side * 0.12, d / 2 + 0.05, `handle-${side}`))}
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
  return <group position={[x, f.elevation ?? 0, z]} rotation={[0, f.rotation ?? 0, 0]}>{parts}</group>;
}
