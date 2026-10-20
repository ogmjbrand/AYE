import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

function Colleague({ position, color, phase = 0 }: { position: [number, number, number]; color: string; phase?: number }) {
  const figure = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (figure.current) figure.current.position.y = Math.sin(clock.elapsedTime * 1.45 + phase) * 0.012;
  });
  return (
    <group position={position}>
      <group ref={figure}>
        <mesh position={[0, 0.77, 0]} castShadow>
          <capsuleGeometry args={[0.2, 0.48, 3, 8]} />
          <meshStandardMaterial color={color} roughness={0.82} />
        </mesh>
        <mesh position={[0, 1.19, 0.02]} castShadow>
          <sphereGeometry args={[0.15, 12, 10]} />
          <meshStandardMaterial color="#845b43" roughness={0.9} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.24, 0.73, 0.02]} rotation={[0, 0, side * 0.12]} castShadow>
            <capsuleGeometry args={[0.055, 0.38, 3, 6]} />
            <meshStandardMaterial color={color} roughness={0.82} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function WalkingColleague() {
  const figure = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime * 0.18) % 1;
    const z = -3.7 + t * 7.2;
    if (figure.current) {
      figure.current.position.set(0.3, 0, z);
      figure.current.rotation.y = t < 0.5 ? 0 : Math.PI;
    }
  });
  return (
    <group ref={figure}>
      <mesh position={[0, 0.86, 0]} castShadow>
        <capsuleGeometry args={[0.18, 0.62, 3, 8]} />
        <meshStandardMaterial color="#4e6658" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.34, 0.02]} castShadow>
        <sphereGeometry args={[0.14, 12, 10]} />
        <meshStandardMaterial color="#79543d" roughness={0.9} />
      </mesh>
      <mesh position={[0.23, 0.82, 0.12]} rotation={[0.08, 0, -0.12]} castShadow>
        <boxGeometry args={[0.3, 0.36, 0.08]} />
        <meshStandardMaterial color="#a58a5d" roughness={0.75} />
      </mesh>
    </group>
  );
}

export function OfficeScene() {
  return (
    <>
      <Colleague position={[1.2, 0.45, 2.85]} color="#49626a" phase={0.4} />
      <Colleague position={[4.2, 0.45, 2.85]} color="#895a43" phase={1.8} />
      <WalkingColleague />
      <pointLight position={[4.8, 2.3, -2.1]} intensity={0.65} distance={4} color="#f4c781" />
    </>
  );
}
