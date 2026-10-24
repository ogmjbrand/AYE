import { type ReactNode } from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import type { Texture } from 'three';
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
