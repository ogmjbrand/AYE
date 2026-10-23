import { useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { useDistrict } from './DistrictContext';
import { HOTEL_NAME } from '../lib/hotel';
import { groundHeightAt } from '../lib/world';
import { PottedPalm } from './PottedPalm';

/** The name in gold capitals on a dark band. */
function nameBoard(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 160;
  const g = c.getContext('2d')!;
  g.fillStyle = '#2a2420';
  g.fillRect(0, 0, 1024, 160);
  g.fillStyle = '#d9b46a';
  g.textAlign = 'center';
  g.font = "600 84px 'Cormorant Garamond', Georgia, serif";
  g.fillText(HOTEL_NAME.toUpperCase(), 512, 100);
  g.fillRect(212, 124, 600, 3);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/**
 * The Grand Lagoon Hotel's entrance: warm stone, a dark canopy over glass
 * doors, the name board above and a palm either side. The lobby glows through
 * the glass at night.
 */
export function HotelFront({ night }: { night: number }) {
  const district = useDistrict();
  const r = district.hotel;
  const board = useMemo(() => nameBoard(), []);
  const b = useMemo(() => (r ? district.layout.buildings.find((x) => Math.abs(x.position[0] - r.door[0]) < 0.5 && x.position[2] > r.door[2] && x.position[2] - r.door[2] < 6) : undefined), [district, r]);
  if (!r || !b) return null;
  const faceZ = b.position[2] - b.size[2] / 2 - 0.03;
  const base = groundHeightAt(r.door[0], r.door[2]);
  const glow = 0.25 + 0.8 * night;
  return (
    <group position={[0, base, 0]}>
      {/* Glass doors and side lights in dark bronze frames */}
      <group position={[r.door[0], 0, faceZ - 0.02]}>
        <mesh position={[0, 1.3, 0]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[3.2, 2.6]} />
          <meshStandardMaterial color="#1c1a16" emissive="#ffcf8a" emissiveIntensity={glow * 0.6} roughness={0.08} metalness={0.4} />
        </mesh>
        {[-1.6, -0.55, 0.55, 1.6].map((x) => <mesh key={x} position={[x, 1.3, -0.02]}><boxGeometry args={[0.07, 2.6, 0.05]} /><meshStandardMaterial color="#3a2e24" metalness={0.6} roughness={0.35} /></mesh>)}
        <mesh position={[0, 2.62, -0.02]}><boxGeometry args={[3.3, 0.08, 0.05]} /><meshStandardMaterial color="#3a2e24" metalness={0.6} roughness={0.35} /></mesh>
        {/* Canopy */}
        <mesh position={[0, 3.0, -0.9]} castShadow><boxGeometry args={[4.2, 0.16, 1.8]} /><meshStandardMaterial color="#2a2420" roughness={0.5} /></mesh>
        {[-1.9, 1.9].map((x) => <mesh key={x} position={[x, 1.5, -1.7]}><cylinderGeometry args={[0.05, 0.05, 3, 10]} /><meshStandardMaterial color="#c9a052" metalness={0.85} roughness={0.3} /></mesh>)}
        <mesh position={[0, 2.92, -0.9]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[3.6, 1.4]} /><meshStandardMaterial color="#fff2d6" emissive="#ffd9a0" emissiveIntensity={0.4 + night} toneMapped={false} /></mesh>
        <mesh position={[0, 3.55, -0.05]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[4.6, 0.72]} />
          <meshStandardMaterial map={board} emissiveMap={board} emissive="#ffffff" emissiveIntensity={0.15 + 0.4 * night} />
        </mesh>
      </group>
      <PottedPalm position={[r.door[0] - 2.5, 0, faceZ - 0.7]} height={2.4} />
      <PottedPalm position={[r.door[0] + 2.5, 0, faceZ - 0.7]} height={2.4} rotation={1.1} />
      <pointLight position={[r.door[0], 2.6, faceZ - 1.2]} intensity={1 + 4 * night} distance={8} decay={1.7} color="#ffd9a0" />
    </group>
  );
}
