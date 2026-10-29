import { RoundedBox } from '@react-three/drei';
import { Pad } from './LuxeBedroom';

/**
 * The everyday bedroom for homes that aren't Luxe: a wooden bed with a padded
 * headboard, a soft mattress, a duvet folded back over the sheet and two
 * pillows; and a wardrobe with panelled doors, slim handles, a plinth and a
 * cornice. Drawn at the piece's own size; the bed's headboard is on +z, the
 * wardrobe's doors face -z.
 */

const WOOD = '#6b4a33';
const DARK_WOOD = '#3b2c22';
const SHEET = '#f3efe7';

function Wood({ p, s, color = WOOD, radius = 0.012 }: { p: [number, number, number]; s: [number, number, number]; color?: string; radius?: number }) {
  return (
    <RoundedBox args={s} radius={Math.min(radius, ...s.map((v) => v / 2 - 0.001))} smoothness={2} position={p} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.55} />
    </RoundedBox>
  );
}

/** `color` is the duvet's. */
export function PlainBed({ w, d, color }: { w: number; d: number; color: string }) {
  const back = d / 2;
  const mattressTop = 0.54;
  return (
    <>
      {/* Frame on short legs, and the headboard behind */}
      <Wood p={[0, 0.24, 0]} s={[w, 0.16, d]} color={DARK_WOOD} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Wood key={`${sx}${sz}`} p={[sx * (w / 2 - 0.05), 0.08, sz * (d / 2 - 0.05)]} s={[0.07, 0.16, 0.07]} color={DARK_WOOD} />))}
      <Wood p={[0, 0.6, back - 0.04]} s={[w, 1.0, 0.07]} color={DARK_WOOD} />
      {/* A padded linen panel on the headboard */}
      <Pad p={[0, 0.8, back - 0.09]} s={[w - 0.14, 0.56, 0.06]} color="#cfc6b6" radius={0.03} />
      {/* Mattress and sheet */}
      <Pad p={[0, 0.43, -0.02]} s={[w - 0.06, 0.22, d - 0.14]} color={SHEET} radius={0.05} />
      {/* Duvet over the lower two thirds, its turned-back edge a little thicker */}
      <Pad p={[0, mattressTop + 0.02, -d * 0.15]} s={[w - 0.02, 0.07, d * 0.66]} color={color} radius={0.03} />
      <Pad p={[0, mattressTop + 0.045, d * 0.17]} s={[w - 0.02, 0.09, 0.16]} color={color} radius={0.045} />
      {/* Two pillows against the headboard */}
      {[-1, 1].map((s) => <Pad key={s} p={[s * (w / 4), mattressTop + 0.06, back - 0.3]} s={[w / 2 - 0.12, 0.13, 0.34]} color="#fbfaf6" radius={0.06} />)}
    </>
  );
}

export function PlainWardrobe({ w, h, d, color }: { w: number; h: number; d: number; color: string }) {
  const doors = w > 1.4 ? 3 : 2;
  const front = -d / 2;
  const body = h - 0.14;
  const dw = (w - 0.06) / doors;
  return (
    <>
      <Wood p={[0, 0.05, 0.02]} s={[w - 0.04, 0.1, d - 0.04]} color={DARK_WOOD} />
      <Wood p={[0, 0.1 + body / 2, 0]} s={[w, body, d]} color={color} />
      <Wood p={[0, h - 0.02, 0]} s={[w + 0.03, 0.04, d + 0.03]} color={DARK_WOOD} />
      {Array.from({ length: doors }, (_, i) => {
        const cx = -w / 2 + 0.03 + dw * (i + 0.5);
        // Each door: a frame round a recessed panel, and a slim bar handle by the edge it opens from
        const handleSide = i < doors / 2 ? 1 : -1;
        return (
          <group key={i} position={[cx, 0.1 + body / 2, front - 0.006]}>
            <Wood p={[0, 0, 0]} s={[dw - 0.012, body - 0.05, 0.012]} color={color} radius={0.004} />
            <Wood p={[0, 0, -0.007]} s={[dw - 0.12, body - 0.2, 0.006]} color={color} radius={0.002} />
            <mesh position={[handleSide * (dw / 2 - 0.06), 0.05, -0.022]} castShadow>
              <boxGeometry args={[0.014, 0.22, 0.018]} />
              <meshStandardMaterial color="#2a2a2c" metalness={0.8} roughness={0.3} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
