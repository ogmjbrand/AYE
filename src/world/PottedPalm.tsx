import { useMemo } from 'react';
import { DoubleSide, Shape, ShapeGeometry } from 'three';

/** One frond: a long, tapering leaf, curved down by tilting the group it sits in. */
function frondGeometry(length: number, width: number) {
  const s = new Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(width, length * 0.35, width * 0.25, length);
  s.lineTo(-width * 0.25, length);
  s.quadraticCurveTo(-width, length * 0.35, 0, 0);
  return new ShapeGeometry(s, 6);
}

/**
 * A potted palm (kentia-style) in a brass pot: the plant the restaurant is
 * named after, also used by its front door. Scaled by `height` (top of the
 * fronds above the floor).
 */
export function PottedPalm({ position, height = 2.2, pot = '#b88a3e', rotation = 0 }: { position: [number, number, number]; height?: number; pot?: string; rotation?: number }) {
  const frond = useMemo(() => frondGeometry(height * 0.5, height * 0.09), [height]);
  const trunkH = height * 0.55;
  const fronds = 9;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Pot with a darker rim and soil */}
      <mesh position={[0, height * 0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[height * 0.13, height * 0.1, height * 0.24, 24]} />
        <meshStandardMaterial color={pot} metalness={0.75} roughness={0.32} />
      </mesh>
      <mesh position={[0, height * 0.245, 0]}>
        <torusGeometry args={[height * 0.13, height * 0.012, 8, 24]} />
        <meshStandardMaterial color={pot} metalness={0.8} roughness={0.28} />
      </mesh>
      <mesh position={[0, height * 0.235, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[height * 0.125, 20]} />
        <meshStandardMaterial color="#2b2018" roughness={1} />
      </mesh>
      {/* Slim stems */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.cos(i * 2.1) * 0.04, height * 0.24 + trunkH / 2, Math.sin(i * 2.1) * 0.04]} rotation={[Math.cos(i * 2.1) * 0.08, 0, Math.sin(i * 2.1) * 0.08]} castShadow>
          <cylinderGeometry args={[height * 0.012, height * 0.018, trunkH, 6]} />
          <meshStandardMaterial color="#6b5a3a" roughness={0.9} />
        </mesh>
      ))}
      {/* Fronds fanning out and arching down */}
      {Array.from({ length: fronds }, (_, i) => {
        const a = (i / fronds) * Math.PI * 2 + (i % 2) * 0.2;
        const tilt = 0.55 + (i % 3) * 0.22;
        return (
          <group key={i} position={[0, height * 0.24 + trunkH * (0.85 + (i % 3) * 0.06), 0]} rotation={[0, a, 0]}>
            <mesh geometry={frond} rotation={[tilt, 0, 0]} castShadow>
              <meshStandardMaterial color={i % 2 ? '#2f6b34' : '#3b7a3c'} roughness={0.75} side={DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
