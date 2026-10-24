import { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import { CanvasTexture, ExtrudeGeometry, Shape, SRGBColorSpace } from 'three';
import { marbleTexture } from './venueTextures';

/**
 * The Luxe bedroom: upholstered king beds with tall headboards (chevron,
 * royal leather, charcoal arch and teal sunburst), gold-handled nightstands,
 * and a white-marble wardrobe and dressing table. Drawn at the piece's own
 * size; the bed's headboard is on +z and the fronts of storage face -z.
 */

const GOLD = '#c9a052';
type Fabric = 'linen' | 'leather' | 'velvet';

function Gold({ p, s, r }: { p: [number, number, number]; s: [number, number, number]; r?: [number, number, number] }) {
  return (
    <mesh position={p} rotation={r} castShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.22} />
    </mesh>
  );
}

/** Upholstery in the right finish: matt linen, satin leather, or velvet with a soft sheen. */
function Cloth({ color, fabric }: { color: string; fabric: Fabric }) {
  if (fabric === 'leather') return <meshPhysicalMaterial color={color} roughness={0.42} clearcoat={0.35} clearcoatRoughness={0.4} />;
  if (fabric === 'velvet') return <meshPhysicalMaterial color={color} roughness={0.9} sheen={1} sheenRoughness={0.45} sheenColor="#ffffff" />;
  return <meshStandardMaterial color={color} roughness={0.95} />;
}

function Pad({ p, s, color, fabric = 'linen', radius = 0.05 }: { p: [number, number, number]; s: [number, number, number]; color: string; fabric?: Fabric; radius?: number }) {
  return (
    <RoundedBox args={s} radius={Math.min(radius, ...s.map((v) => v / 2 - 0.001))} smoothness={4} position={p} castShadow receiveShadow>
      <Cloth color={color} fabric={fabric} />
    </RoundedBox>
  );
}

/** A mirror with a warm LED strip glowing round its edge. */
function LedMirror({ p, w, h }: { p: [number, number, number]; w: number; h: number }) {
  return (
    <group position={p}>
      <mesh>
        <boxGeometry args={[w + 0.03, h + 0.03, 0.01]} />
        <meshStandardMaterial color="#fff3d6" emissive="#ffe9c2" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.008]}>
        <boxGeometry args={[w, h, 0.012]} />
        <meshStandardMaterial color="#dfe6ea" metalness={0.85} roughness={0.05} emissive="#55626b" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

let chevron: CanvasTexture | null = null;
/** Cream upholstery quilted in chevrons: each V a padded channel with a shadowed seam. */
function chevronTexture() {
  if (chevron) return chevron;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ece4d5';
  g.fillRect(0, 0, 512, 512);
  // Rows of V-shaped stitched seams; between them the padding catches the light
  const cols = 5;
  const rows = 8;
  const cw = 512 / cols;
  const rh = 512 / rows;
  const amp = cw * 0.38;
  const zigzag = (y: number) => {
    g.beginPath();
    for (let k = 0; k <= cols * 2; k++) g.lineTo((k * cw) / 2, y + (k % 2 ? amp : 0));
  };
  for (let r = -1; r <= rows; r++) {
    const y = r * rh;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(255,255,255,0.4)';
    g.lineWidth = rh * 0.42;
    zigzag(y + rh * 0.5);
    g.stroke();
    g.strokeStyle = 'rgba(110,88,58,0.22)';
    g.lineWidth = rh * 0.18;
    zigzag(y + rh * 0.12);
    g.stroke();
    g.strokeStyle = 'rgba(80,62,40,0.75)';
    g.lineWidth = 3;
    zigzag(y);
    g.stroke();
  }
  chevron = new CanvasTexture(c);
  chevron.colorSpace = SRGBColorSpace;
  chevron.anisotropy = 8;
  return chevron;
}

/** A panel with an arched top, bottom edge at y=0, as a soft extruded shape. */
function useArch(halfW: number, height: number, depth: number) {
  return useMemo(() => {
    const r = halfW;
    const straight = Math.max(0.05, height - r);
    const s = new Shape();
    s.moveTo(-halfW, 0);
    s.lineTo(-halfW, straight);
    s.absarc(0, straight, r, Math.PI, 0, true);
    s.lineTo(halfW, 0);
    s.closePath();
    const geo = new ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 4, curveSegments: 40 });
    geo.translate(0, 0, -depth / 2);
    return { geo, straight, r };
  }, [halfW, height, depth]);
}

/** Height of an arch (from useArch) above its base at x. */
const archTop = (x: number, straight: number, r: number) => straight + Math.sqrt(Math.max(0, r * r - x * x));

const LOOK: Record<string, { fabric: Fabric; duvet: string; throw: string; cushion: string }> = {
  chevron: { fabric: 'linen', duvet: '#f6f3ec', throw: '#8d8f93', cushion: '#d9d2c4' },
  royal: { fabric: 'leather', duvet: '#f7f7f5', throw: '#1d3c8c', cushion: '#c9a052' },
  arch: { fabric: 'velvet', duvet: '#eeebe6', throw: '#2b2c30', cushion: '#c9a052' },
  sunburst: { fabric: 'velvet', duvet: '#f3efe6', throw: '#1d5c60', cushion: '#e6c78a' },
};

export function LuxeBed({ w, d, color, design = 'chevron' }: { w: number; d: number; color: string; design?: string }) {
  const look = LOOK[design] ?? LOOK.chevron;
  const back = d / 2;
  const front = -d / 2;
  const arched = design === 'arch' || design === 'sunburst';
  const arch = useArch(w / 2 - 0.04, 1.62, 0.12);
  return (
    <>
      {/* Upholstered storage frame with a gold trim line */}
      <Pad p={[0, 0.2, 0]} s={[w, 0.36, d]} color={color} fabric={look.fabric} radius={0.05} />
      <Gold p={[0, 0.375, front - 0.002]} s={[w - 0.06, 0.012, 0.012]} />
      {[-1, 1].map((sx) => <Gold key={sx} p={[sx * (w / 2 + 0.002), 0.375, 0]} s={[0.012, 0.012, d - 0.06]} />)}
      <Gold p={[0, 0.03, front + 0.02]} s={[w, 0.02, 0.02]} />

      {/* Footboard: a bench (arch), gold ring handles (sunburst) or gold bars */}
      {design === 'arch' ? (
        <>
          <Pad p={[0, 0.47, front + 0.2]} s={[w, 0.16, 0.4]} color={color} fabric="velvet" radius={0.06} />
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={i} position={[-w / 2 + (w / 7) * (i + 0.5), 0.555, front + 0.2]}>
              <sphereGeometry args={[0.012, 8, 6]} />
              <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.25} />
            </mesh>
          ))}
        </>
      ) : design === 'sunburst' ? (
        [-1, 1].map((sx) => (
          <group key={sx} position={[sx * w * 0.25, 0.22, front - 0.02]}>
            <mesh castShadow>
              <torusGeometry args={[0.055, 0.008, 10, 28]} />
              <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.22} />
            </mesh>
            <Gold p={[0, 0.055, 0.01]} s={[0.03, 0.02, 0.02]} />
          </group>
        ))
      ) : (
        [0.12, 0.28].map((y) => <Gold key={y} p={[0, y, front - 0.003]} s={[w * (design === 'royal' ? 0.9 : 0.6), 0.014, 0.008]} />)
      )}
      {design === 'sunburst' && [-1, 1].map((sx) => <Gold key={`bar${sx}`} p={[sx * (w / 2 + 0.003), 0.2, 0]} s={[0.008, 0.014, d * 0.7]} />)}

      {/* Mattress, duvet, a throw across the foot and the pillows */}
      <Pad p={[0, 0.5, -0.04]} s={[w - 0.1, 0.24, d - 0.2]} color="#fbfaf7" radius={0.07} />
      <Pad p={[0, 0.635, -0.2]} s={[w - 0.06, 0.07, d * 0.64]} color={look.duvet} radius={0.03} />
      <Pad p={[0, 0.675, front + (design === 'arch' ? 0.62 : 0.42)]} s={[w - 0.02, 0.025, 0.38]} color={look.throw} fabric={look.fabric === 'leather' ? 'velvet' : look.fabric} radius={0.01} />
      {[-1, 1].map((sx) => <Pad key={sx} p={[sx * w * 0.23, 0.7, back - 0.38]} s={[w * 0.4, 0.16, 0.3]} color="#ffffff" radius={0.07} />)}
      {[-1, 1].map((sx) => <Pad key={`c${sx}`} p={[sx * w * 0.14, 0.73, back - 0.6]} s={[w * 0.24, 0.2, 0.1]} color={look.cushion} fabric="velvet" radius={0.05} />)}

      {/* The headboard */}
      {design === 'chevron' && (
        <>
          <RoundedBox args={[w, 1.15, 0.12]} radius={0.04} smoothness={4} position={[0, 0.95, back - 0.06]} castShadow receiveShadow>
            <meshStandardMaterial map={chevronTexture()} bumpMap={chevronTexture()} bumpScale={1.5} roughness={0.95} />
          </RoundedBox>
          {[-0.5, -1 / 6, 1 / 6, 0.5].map((t) => <Gold key={t} p={[t * (w - 0.02), 0.95, back - 0.125]} s={[0.02, 1.15, 0.012]} />)}
          <Gold p={[0, 1.53, back - 0.06]} s={[w + 0.02, 0.02, 0.13]} />
          {/* Grey wings, each with a tall LED mirror */}
          {[-1, 1].map((sx) => (
            <group key={sx}>
              <Pad p={[sx * (w / 2 + 0.26), 0.82, back + 0.02]} s={[0.5, 1.6, 0.07]} color="#8d8f93" radius={0.03} />
              <LedMirror p={[sx * (w / 2 + 0.26), 1.15, back - 0.02]} w={0.3} h={0.8} />
            </group>
          ))}
        </>
      )}
      {design === 'royal' && (
        <>
          {Array.from({ length: 9 }, (_, i) => (
            <Pad key={i} p={[-w / 2 + (w / 9) * (i + 0.5), 0.98, back - 0.06]} s={[w / 9 - 0.012, 1.2, 0.12]} color={color} fabric="leather" radius={0.055} />
          ))}
          {[0.62, 1.6].map((y) => <Gold key={y} p={[0, y, back - 0.06]} s={[w + 0.03, 0.035, 0.14]} />)}
          {/* Fluted white wings with brass sconces */}
          {[-1, 1].map((sx) => (
            <group key={sx} position={[sx * (w / 2 + 0.27), 0, back + 0.02]}>
              <Pad p={[0, 0.84, 0]} s={[0.52, 1.66, 0.06]} color="#f2f0ec" radius={0.02} />
              {Array.from({ length: 8 }, (_, i) => (
                <mesh key={i} position={[-0.23 + i * 0.066, 0.84, -0.035]} castShadow>
                  <cylinderGeometry args={[0.028, 0.028, 1.6, 12]} />
                  <meshStandardMaterial color="#f5f3ef" roughness={0.6} />
                </mesh>
              ))}
              <Gold p={[0, 1.2, -0.11]} s={[0.02, 0.02, 0.14]} />
              <mesh position={[0, 1.24, -0.18]}>
                <cylinderGeometry args={[0.05, 0.07, 0.12, 20, 1, true]} />
                <meshStandardMaterial color="#fff2d8" emissive="#ffe2b0" emissiveIntensity={1.6} toneMapped={false} side={2} />
              </mesh>
            </group>
          ))}
        </>
      )}
      {arched && (
        <>
          <mesh geometry={arch.geo} position={[0, 0.38, back - 0.08]} castShadow receiveShadow>
            <Cloth color={color} fabric="velvet" />
          </mesh>
          {design === 'arch' &&
            [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75].map((t) => {
              const x = t * (w / 2 - 0.04);
              const top = archTop(x, arch.straight, arch.r) - 0.12;
              return <Gold key={t} p={[x, 0.38 + top / 2 + 0.06, back - 0.165]} s={[0.018, top - 0.12, 0.01]} />;
            })}
          {design === 'sunburst' && (
            <group position={[0, 0.82, back - 0.165]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.13, 0.13, 0.012, 32, 1, false, -Math.PI / 2, Math.PI]} />
                <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.22} />
              </mesh>
              {Array.from({ length: 15 }, (_, i) => {
                const a = (Math.PI * (i + 0.5)) / 15;
                const len = (i % 2 ? 0.48 : 0.72) * Math.min(1, w / 2);
                const mid = 0.15 + len / 2;
                return <Gold key={i} p={[Math.cos(a) * mid, Math.sin(a) * mid, 0]} s={[len, 0.016, 0.01]} r={[0, 0, a]} />;
              })}
            </group>
          )}
          {design === 'sunburst' && [0.5, 0.64].map((y) => <Gold key={y} p={[0, y, back - 0.165]} s={[w - 0.12, 0.016, 0.01]} />)}
          {/* Tufted wings for the charcoal arch */}
          {design === 'arch' &&
            [-1, 1].map((sx) => (
              <group key={sx} position={[sx * (w / 2 + 0.25), 0, back + 0.01]}>
                <Pad p={[0, 0.7, 0]} s={[0.48, 1.36, 0.09]} color={color} fabric="velvet" radius={0.04} />
                {Array.from({ length: 12 }, (_, i) => (
                  <mesh key={i} position={[-0.12 + (i % 3) * 0.12, 0.22 + Math.floor(i / 3) * 0.32, -0.048]}>
                    <sphereGeometry args={[0.014, 8, 6]} />
                    <meshStandardMaterial color="#26272b" roughness={0.6} />
                  </mesh>
                ))}
                <Gold p={[0, 1.39, 0]} s={[0.48, 0.016, 0.1]} />
              </group>
            ))}
        </>
      )}
    </>
  );
}

/** A two-drawer upholstered nightstand with gold handles and a little lamp. */
export function LuxeNightstand({ w, h, d, color }: { w: number; h: number; d: number; color: string }) {
  return (
    <>
      <Pad p={[0, h / 2 + 0.04, 0]} s={[w, h - 0.08, d]} color={color} radius={0.03} />
      {[0.3, 0.7].map((t) => (
        <group key={t}>
          <Pad p={[0, 0.04 + (h - 0.08) * t, -d / 2 - 0.005]} s={[w - 0.06, (h - 0.08) * 0.42, 0.02]} color={color} radius={0.008} />
          <Gold p={[0, 0.04 + (h - 0.08) * t, -d / 2 - 0.025]} s={[w * 0.4, 0.014, 0.014]} />
        </group>
      ))}
      <Gold p={[0, h - 0.035, 0]} s={[w + 0.01, 0.012, d + 0.01]} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Gold key={`${sx}${sz}`} p={[sx * (w / 2 - 0.04), 0.02, sz * (d / 2 - 0.04)]} s={[0.025, 0.04, 0.025]} />))}
      {/* Table lamp */}
      <mesh position={[w * 0.12, h + 0.1, d * 0.1]} castShadow>
        <cylinderGeometry args={[0.025, 0.05, 0.2, 16]} />
        <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[w * 0.12, h + 0.27, d * 0.1]}>
        <cylinderGeometry args={[0.07, 0.1, 0.15, 24, 1, true]} />
        <meshStandardMaterial color="#f4ead6" emissive="#ffdca0" emissiveIntensity={0.9} side={2} />
      </mesh>
    </>
  );
}

function useMarble(repeat: [number, number]) {
  return useMemo(() => marbleTexture('white', repeat), [repeat]);
}

/** Four tall doors in white marble laminate with long gold handles. */
export function LuxeWardrobe({ w, h, d }: { w: number; h: number; d: number }) {
  const map = useMarble(MARBLE_TALL);
  const doors = w > 1.4 ? 4 : 2;
  const dw = (w - 0.04) / doors;
  return (
    <>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[w - 0.04, 0.1, d - 0.04]} />
        <meshStandardMaterial color="#2a2622" roughness={0.6} />
      </mesh>
      <mesh position={[0, h / 2 + 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h - 0.1, d]} />
        <meshStandardMaterial map={map} roughness={0.18} metalness={0.05} />
      </mesh>
      {Array.from({ length: doors - 1 }, (_, i) => <Gold key={i} p={[-w / 2 + 0.02 + dw * (i + 1), h / 2 + 0.05, -d / 2 - 0.002]} s={[0.006, h - 0.14, 0.004]} />)}
      {/* Handles pair up at the middle of each pair of doors */}
      {Array.from({ length: doors }, (_, i) => {
        const seam = -w / 2 + 0.02 + dw * (i % 2 ? i : i + 1);
        const x = seam + (i % 2 ? 0.05 : -0.05);
        return <Gold key={`h${i}`} p={[x, h * 0.55, -d / 2 - 0.02]} s={[0.014, h * 0.42, 0.02]} />;
      })}
      <Gold p={[0, h + 0.005, 0]} s={[w + 0.01, 0.02, d + 0.01]} />
    </>
  );
}

const MARBLE_TALL: [number, number] = [1, 2];
const MARBLE_LOW: [number, number] = [1, 1];

/** A white-marble dressing table: drawers, a lit mirror and open shelves either side. */
export function LuxeVanity({ w, h, d }: { w: number; h: number; d: number }) {
  const map = useMarble(MARBLE_LOW);
  const desk = 0.78;
  const towerW = Math.min(0.28, w * 0.22);
  return (
    <>
      <mesh position={[0, desk / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, desk, d]} />
        <meshStandardMaterial map={map} roughness={0.18} />
      </mesh>
      {[-1, 0, 1].map((k) => (
        <Gold key={k} p={[k * w * 0.32, desk - 0.12, -d / 2 - 0.012]} s={[w * 0.14, 0.014, 0.014]} />
      ))}
      <Gold p={[0, desk + 0.006, 0]} s={[w + 0.01, 0.012, d + 0.01]} />
      {/* Mirror on a marble back panel */}
      <mesh position={[0, desk + (h - desk) / 2, d / 2 - 0.03]} castShadow>
        <boxGeometry args={[w - 2 * towerW - 0.04, h - desk, 0.04]} />
        <meshStandardMaterial map={map} roughness={0.2} />
      </mesh>
      <LedMirror p={[0, desk + (h - desk) * 0.52, d / 2 - 0.06]} w={w - 2 * towerW - 0.2} h={(h - desk) * 0.72} />
      {/* Open shelf towers with a few things on them */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * (w / 2 - towerW / 2), desk, d / 2 - towerW / 2 - 0.02]}>
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[0, 0.02 + k * ((h - desk - 0.04) / 2), 0]} receiveShadow>
              <boxGeometry args={[towerW, 0.025, towerW]} />
              <meshStandardMaterial map={map} roughness={0.2} />
            </mesh>
          ))}
          {[-1, 1].map((ex) => <Gold key={ex} p={[ex * (towerW / 2 - 0.008), (h - desk) / 2, 0]} s={[0.012, h - desk, 0.012]} />)}
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.035, 0.04, 0.15, 16]} />
            <meshStandardMaterial color={sx > 0 ? '#e9d6c8' : '#1f5a47'} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.06 + (h - desk - 0.04) / 2, 0]}>
            <boxGeometry args={[towerW * 0.7, 0.07, towerW * 0.6]} />
            <meshStandardMaterial color="#d9cdb8" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </>
  );
}
