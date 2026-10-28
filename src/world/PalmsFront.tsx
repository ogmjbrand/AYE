import { useMemo } from 'react';
import { useDistrict } from './DistrictContext';
import { isOpen } from '../lib/palms';
import { groundHeightAt } from '../lib/world';
import { PottedPalm } from './PottedPalm';
import { palmsSign } from './signs';
import { Lamp } from './LampPool';

/**
 * The Palms' street front on the cross street: dark green and gold, big
 * windows either side of a double door under a canopy, the name board above,
 * and a palm in a brass pot either side. Lit warm while it's open.
 */
export function PalmsFront({ hour, night }: { hour: number; night: number }) {
  const district = useDistrict();
  const r = district.restaurant;
  const sign = useMemo(() => palmsSign('THE PALMS', 'Restaurant · Fine dining & lounge'), []);
  const b = useMemo(() => (r ? district.layout.buildings.find((x) => Math.abs(x.position[0] - r.door[0]) < 0.5 && x.position[2] > r.door[2] && x.position[2] - r.door[2] < 6) : undefined), [district, r]);
  if (!r || !b) return null;
  const open = isOpen(hour);
  const lit = open ? 0.35 + 0.9 * night : 0.04;
  // The front wall faces −z; everything sits a hair in front of it
  const faceZ = b.position[2] - b.size[2] / 2 - 0.03;
  const x0 = b.position[0];
  const w = b.size[0];
  const base = groundHeightAt(r.door[0], r.door[2]);
  const winW = (w - 3.4) / 2 - 0.6;
  const gold = '#c9a052';
  return (
    <group position={[0, base, 0]} rotation={[0, 0, 0]}>
      {/* Facade panel and a gold band at the top of the ground floor */}
      <mesh position={[x0, 2.1, faceZ]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[w, 4.2]} />
        <meshStandardMaterial color="#173029" roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[x0, 4.25, faceZ - 0.02]}>
        <boxGeometry args={[w, 0.12, 0.08]} />
        <meshStandardMaterial color={gold} metalness={0.85} roughness={0.3} />
      </mesh>
      {/* Windows: dark glass by day, warm dining room light when open in the evening */}
      {[-1, 1].map((side) => (
        <group key={side} position={[x0 + side * (1.7 + 0.3 + winW / 2), 1.55, faceZ - 0.02]}>
          <mesh rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[winW, 2.4]} />
            <meshStandardMaterial color="#10201c" emissive="#c9873e" emissiveIntensity={lit * 0.45} roughness={0.08} metalness={0.4} />
          </mesh>
          {/* Gold frame and mullions */}
          {[[-winW / 2, 0, 0.06, 2.5], [winW / 2, 0, 0.06, 2.5], [0, 1.22, winW + 0.06, 0.06], [0, -1.22, winW + 0.06, 0.06], [-winW / 6, 0, 0.03, 2.4], [winW / 6, 0, 0.03, 2.4]].map(([x, y, sw, sh], i) => (
            <mesh key={i} position={[x, y, -0.01]}>
              <boxGeometry args={[sw, sh, 0.04]} />
              <meshStandardMaterial color={gold} metalness={0.85} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Double door: glass panels in gold frames, glowing from inside */}
      <group position={[r.door[0], 0, faceZ - 0.02]}>
        <mesh position={[0, 1.2, 0]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[1.8, 2.4]} />
          <meshStandardMaterial color="#1a1410" emissive="#e0a050" emissiveIntensity={open ? 0.3 + 0.5 * night : 0} roughness={0.2} />
        </mesh>
        {[-0.9, 0, 0.9].map((x) => (
          <mesh key={x} position={[x, 1.2, -0.02]}>
            <boxGeometry args={[0.07, 2.45, 0.05]} />
            <meshStandardMaterial color={gold} metalness={0.85} roughness={0.3} />
          </mesh>
        ))}
        {[-0.18, 0.18].map((x) => (
          <mesh key={x} position={[x, 1.15, -0.06]}>
            <boxGeometry args={[0.03, 0.6, 0.03]} />
            <meshStandardMaterial color="#f0d08a" metalness={0.9} roughness={0.2} />
          </mesh>
        ))}
        {/* Canopy over the door, gold-edged */}
        <mesh position={[0, 2.85, -0.6]} castShadow>
          <boxGeometry args={[3.0, 0.12, 1.2]} />
          <meshStandardMaterial color="#0f231e" roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.85, -1.21]}>
          <boxGeometry args={[3.02, 0.14, 0.03]} />
          <meshStandardMaterial color={gold} metalness={0.85} roughness={0.3} emissive="#7a5a20" emissiveIntensity={lit * 0.4} />
        </mesh>
        {/* Down-lights under the canopy */}
        {[-0.9, 0.9].map((x) => (
          <mesh key={x} position={[x, 2.78, -0.7]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.07, 12]} />
            <meshStandardMaterial color="#fff2d6" emissive="#ffd99a" emissiveIntensity={open ? 1.5 + 2 * night : 0} toneMapped={false} />
          </mesh>
        ))}
        <Lamp position={[0, 2.5, -1.2]} intensity={open && night > 0.2 ? 6 * night : 0} distance={7} decay={1.8} color="#ffcf8a" />
      </group>
      {/* Name board above the canopy */}
      <mesh position={[r.door[0], 3.55, faceZ - 0.05]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[5.2, 1.3]} />
        <meshStandardMaterial map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={open ? 0.25 + 0.6 * night : 0.12} roughness={0.5} />
      </mesh>
      {/* Brass-potted palms either side of the door */}
      <PottedPalm position={[r.door[0] - 2.0, 0, faceZ - 0.55]} height={2.3} />
      <PottedPalm position={[r.door[0] + 2.0, 0, faceZ - 0.55]} height={2.3} rotation={1.1} />
      {/* A warm pool of light on the pavement in the evening */}
      {open && night > 0.1 && (
        <mesh position={[r.door[0], 0.012, faceZ - 1.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.2, 32]} />
          <meshBasicMaterial color="#ffb860" transparent opacity={0.16 * night} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
