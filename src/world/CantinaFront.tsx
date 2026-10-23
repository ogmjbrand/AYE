import { useMemo } from 'react';
import { DoubleSide } from 'three';
import { useDistrict } from './DistrictContext';
import { CANTINA_NAME, isOpen } from '../lib/cantina';
import { groundHeightAt } from '../lib/world';
import { brickTexture, cantinaSignTexture, papelPicadoTexture } from './cantinaTextures';

/** A potted cactus by the door: a terracotta pot, a ribbed column and two arms. */
function Cactus({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.22, 0]} castShadow><cylinderGeometry args={[0.24, 0.18, 0.44, 18]} /><meshStandardMaterial color="#b85e34" roughness={0.8} /></mesh>
      <mesh position={[0, 0.95, 0]} castShadow><capsuleGeometry args={[0.13, 0.9, 6, 12]} /><meshStandardMaterial color="#3f8a46" roughness={0.7} /></mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.2, 1.0 + s * 0.1, 0]}>
          <mesh rotation={[0, 0, (s * Math.PI) / 2]}><capsuleGeometry args={[0.07, 0.16, 6, 10]} /><meshStandardMaterial color="#3f8a46" roughness={0.7} /></mesh>
          <mesh position={[s * 0.1, 0.16, 0]}><capsuleGeometry args={[0.07, 0.2, 6, 10]} /><meshStandardMaterial color="#3f8a46" roughness={0.7} /></mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Cantina Ayé's street front: yellow stucco over a red brick base, arched
 * windows and an arched double door in green, the colourful name above,
 * papel picado across the front and a cactus either side of the door. The
 * windows glow warm while it's open.
 */
export function CantinaFront({ hour, night }: { hour: number; night: number }) {
  const district = useDistrict();
  const r = district.bar;
  const sign = useMemo(() => cantinaSignTexture(CANTINA_NAME), []);
  const papel = useMemo(() => papelPicadoTexture(5), []);
  const brick = useMemo(() => brickTexture([4, 0.6]), []);
  const b = useMemo(() => (r ? district.layout.buildings.find((x) => Math.abs(x.position[0] - r.door[0]) < 0.5 && x.position[2] > r.door[2] && x.position[2] - r.door[2] < 6) : undefined), [district, r]);
  if (!r || !b) return null;
  const open = isOpen(hour);
  const glow = open ? 0.35 + 0.8 * night : 0.03;
  // The front faces −z; everything sits a hair in front of it
  const faceZ = b.position[2] - b.size[2] / 2 - 0.03;
  const x0 = b.position[0];
  const w = b.size[0];
  const base = groundHeightAt(r.door[0], r.door[2]);
  const archWindow = (x: number) => (
    <group key={x} position={[x, 0, faceZ - 0.02]}>
      <mesh position={[0, 1.45, 0]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.5, 1.7]} />
        <meshStandardMaterial color="#2a1a10" emissive="#ffb35a" emissiveIntensity={glow * 0.6} roughness={0.1} metalness={0.3} />
      </mesh>
      <mesh position={[0, 2.3, 0]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[0.75, 24, 0, Math.PI]} />
        <meshStandardMaterial color="#2a1a10" emissive="#ffb35a" emissiveIntensity={glow * 0.6} roughness={0.1} metalness={0.3} side={DoubleSide} />
      </mesh>
      {/* Green frame and glazing bars */}
      {[[-0.78, 1.45, 0.08, 1.8], [0.78, 1.45, 0.08, 1.8], [0, 0.58, 1.64, 0.1], [0, 1.45, 0.05, 1.7]].map(([x2, y, sw, sh], i) => (
        <mesh key={i} position={[x2, y, -0.02]}><boxGeometry args={[sw, sh, 0.05]} /><meshStandardMaterial color="#2f7a3a" roughness={0.5} /></mesh>
      ))}
      <mesh position={[0, 2.3, -0.02]}><torusGeometry args={[0.78, 0.045, 8, 24, Math.PI]} /><meshStandardMaterial color="#2f7a3a" roughness={0.5} /></mesh>
    </group>
  );
  return (
    <group position={[0, base, 0]}>
      {/* Yellow stucco with a red brick base */}
      <mesh position={[x0, 2.6, faceZ]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[w, 5.2]} />
        <meshStandardMaterial color="#efc14e" roughness={0.85} />
      </mesh>
      <mesh position={[x0, 0.45, faceZ - 0.01]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[w, 0.9]} />
        <meshStandardMaterial map={brick} roughness={0.9} />
      </mesh>
      {archWindow(x0 - 2.6)}
      {archWindow(x0 + 2.6)}
      {/* Arched double door in green with glass, glowing when open */}
      <group position={[r.door[0], 0, faceZ - 0.02]}>
        {[-0.45, 0.45].map((x) => (
          <group key={x} position={[x, 1.15, 0]}>
            <mesh rotation={[0, Math.PI, 0]}><planeGeometry args={[0.86, 2.3]} /><meshStandardMaterial color="#1f5a3a" roughness={0.5} /></mesh>
            <mesh position={[0, 0.1, -0.01]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.6, 1.8]} /><meshStandardMaterial color="#2a1a10" emissive="#ffb35a" emissiveIntensity={glow * 0.7} roughness={0.1} /></mesh>
          </group>
        ))}
        <mesh position={[0, 2.3, 0]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.9, 24, 0, Math.PI]} />
          <meshStandardMaterial color="#1f5a3a" roughness={0.5} side={DoubleSide} />
        </mesh>
        <mesh position={[0, 2.3, -0.02]}><torusGeometry args={[0.95, 0.07, 8, 28, Math.PI]} /><meshStandardMaterial color="#d9a84a" roughness={0.8} /></mesh>
      </group>
      {/* The name, and papel picado strung across the front */}
      <mesh position={[x0, 4.25, faceZ - 0.05]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[4.4, 1.83]} />
        <meshStandardMaterial map={sign} transparent alphaTest={0.05} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={0.15 + 0.35 * night} roughness={0.5} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[x0 + (s * w) / 4, 3.25, faceZ - 0.08]} rotation={[0, Math.PI, s * -0.05]}>
          <planeGeometry args={[w / 2, 0.36]} />
          <meshStandardMaterial map={papel} alphaTest={0.5} side={DoubleSide} roughness={0.9} />
        </mesh>
      ))}
      <Cactus x={r.door[0] - 1.35} z={faceZ - 0.45} />
      <Cactus x={r.door[0] + 1.35} z={faceZ - 0.45} />
      {open && <pointLight position={[r.door[0], 2.9, faceZ - 1]} intensity={1.5 + 4 * night} distance={7} decay={1.7} color="#ffc27a" />}
    </group>
  );
}
