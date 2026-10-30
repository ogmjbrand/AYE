import { type ReactNode } from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import type { Texture } from 'three';
import { WALL_T, type Doorway } from '../lib/buildingShell';
import { useQuality } from './quality';

/**
 * A polished floor: on the high quality tier it reflects the room (lamps,
 * chandeliers, people) softly, like real marble; on the low tier it's the
 * same marble without the reflection pass.
 */
export function PolishedFloor({ width, depth, map }: { width: number; depth: number; map: Texture }) {
  const quality = useQuality();
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      {quality.quality === 'high' ? (
        <MeshReflectorMaterial map={map} blur={[260, 90]} resolution={512} mixBlur={1} mixStrength={0.55} mirror={0.35} roughness={0.35} depthScale={0.6} minDepthThreshold={0.4} maxDepthThreshold={1.2} metalness={0.05} />
      ) : (
        <meshStandardMaterial map={map} roughness={0.12} metalness={0.05} />
      )}
    </mesh>
  );
}

/**
 * A ceiling seen only from below: from inside the room it's there, with its
 * lights; from the camera above (looking in like a dolls' house) it vanishes,
 * the same way the near walls do. Children are placed on its underside
 * (y = 0 is the ceiling, negative is down into the room).
 */
export function Ceiling({ width, depth, height, color, children }: { width: number; depth: number; height: number; color: string; children?: ReactNode }) {
  return (
    <group position={[0, height, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {children}
    </group>
  );
}

/** A recessed spotlight in a black trim: a glowing disc on the ceiling's underside. */
export function Downlight({ x, z, warm = '#ffd9a0' }: { x: number; z: number; warm?: string }) {
  return (
    <group position={[x, -0.005, z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.06, 0.09, 20]} />
        <meshStandardMaterial color="#141414" roughness={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
        <circleGeometry args={[0.06, 20]} />
        <meshStandardMaterial color="#fff6e6" emissive={warm} emissiveIntensity={4} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** A black track with adjustable spot heads, as in a boutique or a bar. */
export function TrackLight({ x, z, length, along = 'x', heads = 4 }: { x: number; z: number; length: number; along?: 'x' | 'z'; heads?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, along === 'z' ? Math.PI / 2 : 0, 0]}>
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[length, 0.03, 0.04]} />
        <meshStandardMaterial color="#121212" roughness={0.4} metalness={0.4} />
      </mesh>
      {Array.from({ length: heads }, (_, i) => (
        <group key={i} position={[-length / 2 + (length / heads) * (i + 0.5), -0.09, 0]} rotation={[0.5, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.045, 0.035, 0.14, 14]} />
            <meshStandardMaterial color="#121212" roughness={0.35} metalness={0.5} />
          </mesh>
          <mesh position={[0, -0.071, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.04, 14]} />
            <meshStandardMaterial color="#fff6e6" emissive="#ffe2b0" emissiveIntensity={5} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** A slim glowing gold ring, hung flat (the lounge rings in the reference). */
export function LedRing({ x, y, z, radius }: { x: number; y: number; z: number; radius: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.035, 10, 64]} />
        <meshStandardMaterial color="#c9a052" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <torusGeometry args={[radius, 0.018, 8, 64]} />
        <meshStandardMaterial color="#fff2d6" emissive="#ffcf8a" emissiveIntensity={3.5} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Turns a doorway's own frame (x along the wall, +z out of one face) into place in the room. */
function AtDoor({ door, children }: { door: Doorway; children: ReactNode }) {
  return <group position={[door.x, 0, door.z]} rotation={[0, door.alongX ? 0 : Math.PI / 2, 0]}>{children}</group>;
}

/**
 * A doorway finished like a real one: the wall carried on over the door up to
 * the ceiling (the lintel), and a painted frame round the opening. `wall` is
 * the wall's own material (a map, or a colour).
 */
export function DoorFrame({ door, wallHeight, height = 2.2, wallMap, wallColor = '#ffffff', frame = '#f4efe8', jambs = true }: {
  door: Doorway; wallHeight: number; height?: number; wallMap?: Texture; wallColor?: string; frame?: string;
  /** False where the door brings its own frame (only the lintel is needed). */
  jambs?: boolean;
}) {
  const t = WALL_T;
  const w = door.width;
  return (
    <AtDoor door={door}>
      <mesh position={[0, (wallHeight + height) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.02, wallHeight - height, t]} />
        <meshStandardMaterial map={wallMap} color={wallMap ? '#ffffff' : wallColor} roughness={0.85} />
      </mesh>
      {jambs && [-1, 1].map((k) => <mesh key={k} position={[k * (w / 2 - 0.03), height / 2, 0]}><boxGeometry args={[0.06, height, t + 0.04]} /><meshStandardMaterial color={frame} roughness={0.5} /></mesh>)}
      {jambs && <mesh position={[0, height - 0.03, 0]}><boxGeometry args={[w, 0.06, t + 0.04]} /><meshStandardMaterial color={frame} roughness={0.5} /></mesh>}
    </AtDoor>
  );
}

/** A pair of closed glass doors in dark metal frames with long push bars: the way in from the street, shut behind you. */
export function GlassDoors({ door, height = 2.2, metal = '#2b2b2b' }: { door: Doorway; height?: number; metal?: string }) {
  const leaf = door.width / 2 - 0.07;
  return (
    <AtDoor door={door}>
      {[-1, 1].map((k) => (
        <group key={k} position={[k * (leaf / 2 + 0.01), 0, 0]}>
          <mesh position={[0, height / 2 - 0.03, 0]}><boxGeometry args={[leaf - 0.1, height - 0.2, 0.012]} /><meshStandardMaterial color="#a9c2c4" transparent opacity={0.35} roughness={0.05} metalness={0.3} /></mesh>
          {/* Frame: stiles, top rail and a deeper kick rail */}
          {[-1, 1].map((s) => <mesh key={s} position={[s * (leaf / 2 - 0.03), height / 2 - 0.03, 0]}><boxGeometry args={[0.06, height - 0.06, 0.05]} /><meshStandardMaterial color={metal} metalness={0.6} roughness={0.35} /></mesh>)}
          <mesh position={[0, height - 0.09, 0]}><boxGeometry args={[leaf, 0.06, 0.05]} /><meshStandardMaterial color={metal} metalness={0.6} roughness={0.35} /></mesh>
          <mesh position={[0, 0.08, 0]}><boxGeometry args={[leaf, 0.16, 0.05]} /><meshStandardMaterial color={metal} metalness={0.6} roughness={0.35} /></mesh>
          {/* Push bars on both faces, by the meeting stiles */}
          {[-1, 1].map((f) => <mesh key={f} position={[-k * (leaf / 2 - 0.12), 1.05, f * 0.06]}><boxGeometry args={[0.03, 0.9, 0.03]} /><meshStandardMaterial color="#c9c9c9" metalness={0.9} roughness={0.2} /></mesh>)}
        </group>
      ))}
    </AtDoor>
  );
}

/**
 * Doors standing open into a room: one leaf for a narrow doorway, a pair for
 * a wide one, swung back square to the wall on the `into` side (+1 is the
 * doorway's +z, or +x for a wall along z).
 */
export function OpenDoors({ door, into, height = 2.2, color = '#f4efe8' }: { door: Doorway; into: 1 | -1; height?: number; color?: string }) {
  const pair = door.width > 1.2;
  const leaf = pair ? door.width / 2 - 0.06 : door.width - 0.1;
  const hinges = pair ? [-1, 1] : [-1];
  return (
    <AtDoor door={door}>
      {hinges.map((k) => (
        <group key={k} position={[k * (door.width / 2 - 0.06), 0, into * (WALL_T / 2)]}>
          <mesh position={[0, height / 2 - 0.02, into * (leaf / 2)]} castShadow>
            <boxGeometry args={[0.045, height - 0.04, leaf]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
          <mesh position={[-k * 0.04, 1.0, into * (leaf - 0.08)]}><boxGeometry args={[0.03, 0.025, 0.12]} /><meshStandardMaterial color="#c9a25a" metalness={0.8} roughness={0.3} /></mesh>
        </group>
      ))}
    </AtDoor>
  );
}
