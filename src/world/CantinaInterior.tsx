import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Path, Shape, type Group, type Texture } from 'three';
import type { GameTime } from '../lib/gameState';
import { lightingAt } from './timeOfDay';
import {
  ARCADE_X, BACK_DOORS, BAR, BAR_RETURN, BRICK_HEIGHT, CANOPY, CANTINA_NAME, DRINK_IDS, PILLARS, REGULARS, ROOM, ROOM_HEIGHT, STAFF, STOOLS,
  TABLES, TABLE_SIZE, WAITER_ROUTE, seatById, type CantinaTable,
} from '../lib/cantina';
import type { Seat } from '../lib/seating';
import {
  brickTexture, brimTexture, cantinaSignTexture, menuCardTexture, paintingTexture, papelPicadoTexture, plasterTexture, plateTexture,
  runnerTexture, shadeBandTexture, songhaiFlagTexture, terracottaTexture,
} from './cantinaTextures';
import { CantinaDish } from './CantinaDishes';
import { VenueNpc } from './VenueNpc';
import { UNIFORMS } from '../lib/uniforms';
import { Ceiling, Downlight, PolishedFloor } from './VenueShell';

const H = ROOM_HEIGHT;
const TABLE_TOP = 0.76;
const RED = '#c42a24';
const GREEN = '#36b43a';
const POST_GREEN = '#2f7a3a';
const WOOD = '#c9a274';
const RUSH = '#b9a684';

/** An inward-facing wall in two parts: brick up to the dado, yellow plaster above. Seen only from inside. */
function BrickWall({ position, rotationY, length, brick, plaster }: { position: [number, number, number]; rotationY: number; length: number; brick: Texture; plaster: Texture }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, BRICK_HEIGHT / 2, 0]} receiveShadow>
        <planeGeometry args={[length, BRICK_HEIGHT]} />
        <meshStandardMaterial map={brick} roughness={0.9} />
      </mesh>
      <mesh position={[0, BRICK_HEIGHT + (H - BRICK_HEIGHT) / 2, 0]} receiveShadow>
        <planeGeometry args={[length, H - BRICK_HEIGHT]} />
        <meshStandardMaterial map={plaster} roughness={0.85} />
      </mesh>
    </group>
  );
}

/** A strand of papel picado, gently sagging: a few tilted panels along a wall, placed on the wall's face. */
function Bunting({ length, y, seed }: { length: number; y: number; seed: number }) {
  const n = Math.max(1, Math.round(length / 2.6));
  const seg = length / n;
  const tex = useMemo(() => Array.from({ length: n }, (_, i) => papelPicadoTexture((seed + i) % 6)), [n, seed]);
  return (
    <group position={[0, y, 0.06]}>
      {tex.map((t, i) => (
        <group key={i} position={[-length / 2 + seg * (i + 0.5), 0, 0]}>
          {/* Two halves dipping to the middle of each span */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[(s * seg) / 4, -0.04, 0]} rotation={[0, 0, s * 0.06]}>
              <planeGeometry args={[seg / 2, 0.32]} />
              <meshStandardMaterial map={t} alphaTest={0.5} side={DoubleSide} roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** The green enamel pendant lamp of the reference: a wide shade with a white key band, glowing underneath. */
function GreenPendant({ x, z, drop = 1.0, lit }: { x: number; z: number; drop?: number; lit: number }) {
  const band = useMemo(() => shadeBandTexture(), []);
  const ref = useRef<Group>(null);
  // Hidden when the camera is right by it, so a lamp (or just its cord) never fills the view
  useFrame(({ camera }) => {
    if (ref.current) ref.current.visible = Math.hypot(camera.position.x - x, camera.position.z - z) > 2.2;
  });
  return (
    <group ref={ref} position={[x, H, z]}>
      <mesh position={[0, -drop / 2, 0]}><cylinderGeometry args={[0.006, 0.006, drop, 6]} /><meshStandardMaterial color="#111" /></mesh>
      <group position={[0, -drop, 0]}>
        <mesh position={[0, -0.04, 0]}><cylinderGeometry args={[0.05, 0.08, 0.1, 16]} /><meshStandardMaterial color="#1a1a1a" roughness={0.4} /></mesh>
        <mesh position={[0, -0.18, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.32, 0.2, 32, 1, true]} />
          <meshStandardMaterial color="#1f8a3e" roughness={0.3} metalness={0.2} side={DoubleSide} />
        </mesh>
        <mesh position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.28, 0.32, 0.07, 32, 1, true]} />
          <meshStandardMaterial map={band} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.27, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.3, 32]} />
          <meshStandardMaterial color="#fffbe8" emissive="#fff1c8" emissiveIntensity={1.4 + lit} toneMapped={false} side={DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

/** A small black bell pendant over the bar. */
function BlackPendant({ x, z, drop }: { x: number; z: number; drop: number }) {
  return (
    <group position={[x, CANOPY.y + 0.42, z]}>
      <mesh position={[0, -drop / 2, 0]}><cylinderGeometry args={[0.005, 0.005, drop, 6]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh position={[0, -drop - 0.08, 0]} castShadow><cylinderGeometry args={[0.05, 0.09, 0.2, 20]} /><meshStandardMaterial color="#141414" roughness={0.3} metalness={0.4} /></mesh>
      <mesh position={[0, -drop - 0.185, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.08, 20]} />
        <meshStandardMaterial color="#fff6dd" emissive="#ffe0a8" emissiveIntensity={3} toneMapped={false} side={DoubleSide} />
      </mesh>
    </group>
  );
}

/** A ladder-back chair with a woven rush seat, painted red or green, facing its seat's way. */
function Chair({ seat, color }: { seat: Seat; color: string }) {
  const leg = (x: number, z: number, h: number, y = h / 2) => (
    <mesh position={[x, y, z]} castShadow><boxGeometry args={[0.04, h, 0.04]} /><meshStandardMaterial color={color} roughness={0.45} /></mesh>
  );
  return (
    <group position={[seat.x, 0, seat.z]} rotation={[0, seat.facing, 0]}>
      <mesh position={[0, 0.44, 0]} castShadow receiveShadow><boxGeometry args={[0.44, 0.06, 0.42]} /><meshStandardMaterial color={RUSH} roughness={1} /></mesh>
      <mesh position={[0, 0.41, 0]}><boxGeometry args={[0.47, 0.04, 0.45]} /><meshStandardMaterial color={color} roughness={0.45} /></mesh>
      {leg(-0.2, 0.19, 0.42)}{leg(0.2, 0.19, 0.42)}
      {/* Back posts run up into the back */}
      {leg(-0.2, -0.19, 1.0)}{leg(0.2, -0.19, 1.0)}
      {[0.66, 0.84, 0.97].map((y) => <mesh key={y} position={[0, y, -0.19]} castShadow><boxGeometry args={[0.4, y > 0.9 ? 0.07 : 0.05, 0.025]} /><meshStandardMaterial color={color} roughness={0.45} /></mesh>)}
      {/* Stretchers between the legs */}
      {[-0.2, 0.2].map((x) => <mesh key={x} position={[x, 0.14, 0]}><boxGeometry args={[0.025, 0.025, 0.38]} /><meshStandardMaterial color={color} roughness={0.45} /></mesh>)}
    </group>
  );
}

/** A white bar stool with splayed legs and a round green seat. */
function Stool({ seat }: { seat: Seat }) {
  return (
    <group position={[seat.x, 0, seat.z]}>
      <mesh position={[0, 0.72, 0]} castShadow><cylinderGeometry args={[0.2, 0.19, 0.06, 28]} /><meshStandardMaterial color="#7cc23a" roughness={0.55} /></mesh>
      {[0, 1, 2].map((k) => {
        const a = (k / 3) * Math.PI * 2;
        return (
          <mesh key={k} position={[Math.cos(a) * 0.13, 0.35, Math.sin(a) * 0.13]} rotation={[Math.sin(a) * 0.14, 0, -Math.cos(a) * 0.14]} castShadow>
            <boxGeometry args={[0.05, 0.72, 0.05]} />
            <meshStandardMaterial color="#f4f2ec" roughness={0.5} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.13, 0.155, 3]} /><meshStandardMaterial color="#f4f2ec" side={DoubleSide} /></mesh>
    </group>
  );
}

/** A square white table with a pink woven runner, a menu stand and a sauce bottle, and what's been served. */
function Table({ t, runner, card, dishes, flip }: { t: CantinaTable; runner: Texture; card: Texture; dishes: { seat: Seat; id: string }[]; flip: boolean }) {
  const s = TABLE_SIZE;
  return (
    <group>
      <group position={[t.x, 0, t.z]}>
        <mesh position={[0, TABLE_TOP - 0.025, 0]} castShadow receiveShadow><boxGeometry args={[s, 0.05, s]} /><meshStandardMaterial color="#f6f5f0" roughness={0.45} /></mesh>
        <mesh position={[0, TABLE_TOP - 0.09, 0]}><boxGeometry args={[s - 0.08, 0.08, s - 0.08]} /><meshStandardMaterial color="#f0eee8" roughness={0.5} /></mesh>
        {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (s / 2 - 0.05), (TABLE_TOP - 0.05) / 2, sz * (s / 2 - 0.05)]} castShadow>
            <boxGeometry args={[0.06, TABLE_TOP - 0.05, 0.06]} />
            <meshStandardMaterial color="#f0eee8" roughness={0.5} />
          </mesh>
        )))}
        {/* The runner, laid on the diagonal and hanging over two corners */}
        <mesh position={[0, TABLE_TOP + 0.002, 0]} rotation={[-Math.PI / 2, 0, flip ? Math.PI / 4 : -Math.PI / 4]}>
          <planeGeometry args={[0.46, s * 1.32]} />
          <meshStandardMaterial map={runner} roughness={0.95} side={DoubleSide} />
        </mesh>
        {/* Menu stand */}
        <group position={[0.18, TABLE_TOP, 0.2]} rotation={[0, flip ? 0.6 : -0.6, 0]}>
          <mesh position={[0, 0.015, 0]}><boxGeometry args={[0.14, 0.03, 0.06]} /><meshStandardMaterial color="#2f8a3e" roughness={0.5} /></mesh>
          <mesh position={[0, 0.12, 0]}><planeGeometry args={[0.12, 0.18]} /><meshStandardMaterial map={card} side={DoubleSide} roughness={0.8} /></mesh>
        </group>
        {/* Hot sauce */}
        <group position={[-0.24, TABLE_TOP, 0.22]}>
          <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.018, 0.02, 0.1, 12]} /><meshStandardMaterial color="#c8201c" roughness={0.2} /></mesh>
          <mesh position={[0, 0.11, 0]}><cylinderGeometry args={[0.008, 0.012, 0.03, 10]} /><meshStandardMaterial color="#f2efe6" /></mesh>
        </group>
      </group>
      {t.seats.map((seat, i) => <Chair key={seat.id} seat={seat} color={(i + (flip ? 1 : 0)) % 2 ? GREEN : RED} />)}
      {dishes.map(({ seat, id }, i) => {
        // On the table in front of the chair, drinks a little to the side
        const x = t.x + (seat.x - t.x) * 0.42, z = t.z + (seat.z - t.z) * 0.42;
        const drink = DRINK_IDS.has(id);
        const ox = drink ? Math.cos(seat.facing) * 0.14 : 0, oz = drink ? -Math.sin(seat.facing) * 0.14 : 0;
        return <group key={`${id}-${i}`} position={[x + ox, TABLE_TOP + 0.003, z + oz]} rotation={[0, seat.facing, 0]}><CantinaDish id={id} /></group>;
      })}
    </group>
  );
}

/** A wall sombrero: a wide painted brim and crown, hung flat against the wall. */
function WallSombrero({ seed }: { seed: number }) {
  const brim = useMemo(() => brimTexture(seed), [seed]);
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.42, 0.42, 0.03, 40]} /><meshStandardMaterial map={brim} roughness={0.7} /></mesh>
      <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.1, 0.17, 0.16, 28]} /><meshStandardMaterial color={seed % 2 ? '#3a3a3a' : '#1f1f1f'} roughness={0.7} /></mesh>
      <mesh position={[0, 0.17, 0]}><sphereGeometry args={[0.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#2a2a2a" roughness={0.7} /></mesh>
    </group>
  );
}

/** A painted plate hung on the wall (y up, facing out along +z). */
function WallPlate({ seed, r = 0.2 }: { seed: number; r?: number }) {
  const tex = useMemo(() => plateTexture(seed), [seed]);
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.02]}><cylinderGeometry args={[r, r * 0.86, 0.035, 36]} /><meshStandardMaterial color="#f5efe0" roughness={0.3} /></mesh>
      <mesh position={[0, 0, 0.039]}><circleGeometry args={[r * 0.97, 36]} /><meshStandardMaterial map={tex} roughness={0.25} /></mesh>
    </group>
  );
}

/** One wall of the left arcade: yellow plaster with arched openings between brick pillars. */
function Arcade({ plaster, brick }: { plaster: Texture; brick: Texture }) {
  const d = ROOM.depth;
  const spring = 2.15;
  const geom = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-d / 2, -0.01); shape.lineTo(d / 2, -0.01); shape.lineTo(d / 2, H); shape.lineTo(-d / 2, H); shape.closePath();
    const edges = [-d / 2 + 0.15, ...PILLARS.flatMap((z) => [z - 0.28, z + 0.28]), d / 2 - 0.15];
    for (let i = 0; i < edges.length; i += 2) {
      const a = edges[i], b = edges[i + 1], r = (b - a) / 2;
      const top = Math.min(spring, H - 0.3 - r);
      const hole = new Path();
      hole.moveTo(a, 0); hole.lineTo(a, top); hole.absarc((a + b) / 2, top, r, Math.PI, 0, true); hole.lineTo(b, 0); hole.closePath();
      shape.holes.push(hole);
    }
    return shape;
  }, [d]);
  return (
    <group position={[ARCADE_X, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
      {/* The arch face: local x runs along the room's z; seen from both sides */}
      <mesh>
        <shapeGeometry args={[geom]} />
        <meshStandardMaterial map={plaster} roughness={0.85} side={DoubleSide} />
      </mesh>
      {PILLARS.map((z) => (
        <mesh key={z} position={[z, BRICK_HEIGHT + 0.4, 0]} castShadow>
          <boxGeometry args={[0.56, (BRICK_HEIGHT + 0.4) * 2, 0.56]} />
          <meshStandardMaterial map={brick} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** The bar: pale brick front, a timber top, the timber canopy on green posts, and the back counter with the coffee machine, till and shelves. */
function Bar({ lit }: { lit: number }) {
  const pale = useMemo(() => brickTexture([2.5, 1], true), []);
  const paleSide = useMemo(() => brickTexture([0.6, 1], true), []);
  const flag = useMemo(() => songhaiFlagTexture(), []);
  const card = useMemo(() => menuCardTexture(), []);
  const len = BAR.x1 - BAR.x0, cx = (BAR.x0 + BAR.x1) / 2, cz = BAR.front + BAR.depth / 2;
  const retLen = BAR_RETURN.z1 - BAR_RETURN.z0;
  const backZ = ROOM.depth / 2 - 0.32;
  const bottles = ['#2f7a3a', '#c8201c', '#e8e2c8', '#2a5a2a', '#d94a2a', '#e8d27a', '#3a6a2a', '#c8201c', '#f2efe6', '#5a8a3a', '#d63a2f', '#e9e4d6'];
  return (
    <group>
      {/* Counter and its return */}
      <mesh position={[cx, BAR.h / 2, cz]} castShadow receiveShadow><boxGeometry args={[len, BAR.h, BAR.depth]} /><meshStandardMaterial map={pale} roughness={0.9} /></mesh>
      <mesh position={[BAR_RETURN.x, BAR.h / 2, (BAR_RETURN.z0 + BAR_RETURN.z1) / 2]} castShadow><boxGeometry args={[0.7, BAR.h, retLen]} /><meshStandardMaterial map={paleSide} roughness={0.9} /></mesh>
      <mesh position={[cx + 0.2, BAR.h + 0.03, cz - 0.04]} castShadow><boxGeometry args={[len + 0.5, 0.06, BAR.depth + 0.22]} /><meshStandardMaterial color={WOOD} roughness={0.55} /></mesh>
      <mesh position={[BAR_RETURN.x, BAR.h + 0.03, (BAR_RETURN.z0 + BAR_RETURN.z1) / 2 - 0.05]}><boxGeometry args={[0.92, 0.06, retLen + 0.1]} /><meshStandardMaterial color={WOOD} roughness={0.55} /></mesh>
      {/* Dark kick plate */}
      <mesh position={[cx, 0.04, BAR.front - 0.005]}><boxGeometry args={[len, 0.08, 0.02]} /><meshStandardMaterial color="#2a2018" /></mesh>
      {/* On the counter: a bottle, a plate of nachos, a napkin pot */}
      <group position={[BAR.x0 + 0.5, BAR.h + 0.06, cz - 0.05]}>
        <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.035, 0.04, 0.24, 14]} /><meshStandardMaterial color="#4a2a10" roughness={0.15} /></mesh>
      </group>
      <group position={[BAR.x0 + 1.3, BAR.h + 0.06, cz]}><CantinaDish id="flatbread" /></group>
      <group position={[BAR.x1 - 0.4, BAR.h + 0.06, cz]}>
        <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.045, 0.04, 0.12, 14]} /><meshStandardMaterial color="#e8e4da" roughness={0.3} /></mesh>
      </group>
      {/* Little desk flag of Songhai */}
      <group position={[BAR_RETURN.x - 0.15, BAR.h + 0.06, BAR_RETURN.z0 + 0.25]}>
        <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[0.004, 0.004, 0.32, 6]} /><meshStandardMaterial color="#d4b26a" metalness={1} roughness={0.3} /></mesh>
        <mesh position={[0.075, 0.26, 0]}><planeGeometry args={[0.15, 0.1]} /><meshStandardMaterial map={flag} side={DoubleSide} /></mesh>
        <mesh position={[0, 0.01, 0]}><cylinderGeometry args={[0.03, 0.03, 0.02, 12]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
      </group>

      {/* The timber canopy: a deep front beam and side beams back to the wall, on two green posts */}
      <mesh position={[(CANOPY.x0 + CANOPY.x1) / 2, CANOPY.y + 0.22, CANOPY.z0 + 0.2]} castShadow><boxGeometry args={[CANOPY.x1 - CANOPY.x0, 0.44, 0.4]} /><meshStandardMaterial color={WOOD} roughness={0.7} /></mesh>
      {[CANOPY.x0 + 0.1, CANOPY.x1 - 0.1].map((x) => (
        <group key={x}>
          <mesh position={[x, CANOPY.y + 0.22, (CANOPY.z0 + CANOPY.z1) / 2]} castShadow><boxGeometry args={[0.3, 0.4, CANOPY.z1 - CANOPY.z0]} /><meshStandardMaterial color={WOOD} roughness={0.7} /></mesh>
          <mesh position={[x, CANOPY.y / 2, CANOPY.z0 + 0.1]} castShadow><boxGeometry args={[0.22, CANOPY.y, 0.22]} /><meshStandardMaterial color={POST_GREEN} roughness={0.55} /></mesh>
        </group>
      ))}
      <mesh position={[(CANOPY.x0 + CANOPY.x1) / 2, CANOPY.y + 0.44, (CANOPY.z0 + CANOPY.z1) / 2]}><boxGeometry args={[CANOPY.x1 - CANOPY.x0, 0.04, CANOPY.z1 - CANOPY.z0]} /><meshStandardMaterial color="#b88f60" roughness={0.8} /></mesh>
      {[1.6, 3.5, 5.4].map((x) => <BlackPendant key={x} x={x} z={BAR.front + 0.3} drop={0.8} />)}

      {/* Back counter */}
      <mesh position={[cx + 0.3, 0.47, backZ]} castShadow><boxGeometry args={[len + 0.6, 0.94, 0.6]} /><meshStandardMaterial color="#6a4a32" roughness={0.6} /></mesh>
      <mesh position={[cx + 0.3, 0.95, backZ]}><boxGeometry args={[len + 0.65, 0.04, 0.64]} /><meshStandardMaterial color="#3a2a1e" roughness={0.4} /></mesh>
      {/* Espresso machine with cups on top */}
      <group position={[1.6, 0.97, backZ]}>
        <mesh position={[0, 0.24, 0]} castShadow><boxGeometry args={[0.75, 0.48, 0.45]} /><meshStandardMaterial color="#c9ccce" metalness={0.85} roughness={0.25} /></mesh>
        <mesh position={[0, 0.28, -0.226]}><boxGeometry args={[0.7, 0.3, 0.01]} /><meshStandardMaterial color="#1a1a1a" roughness={0.4} /></mesh>
        {[-0.2, 0.2].map((x) => <mesh key={x} position={[x, 0.12, -0.26]}><cylinderGeometry args={[0.03, 0.03, 0.08, 12]} /><meshStandardMaterial color="#d4b26a" metalness={1} roughness={0.3} /></mesh>)}
        {[-0.24, -0.08, 0.08, 0.24].map((x) => <mesh key={x} position={[x, 0.53, 0]}><cylinderGeometry args={[0.04, 0.03, 0.07, 14]} /><meshStandardMaterial color="#f4f2ec" roughness={0.3} /></mesh>)}
      </group>
      {/* The till: a till drawer and a touch screen of coloured buttons */}
      <group position={[3.6, 0.97, backZ]}>
        <mesh position={[0, 0.05, 0]}><boxGeometry args={[0.42, 0.1, 0.36]} /><meshStandardMaterial color="#1e1e1e" roughness={0.4} /></mesh>
        <mesh position={[0, 0.3, 0]} rotation={[-0.15, 0, 0]}><boxGeometry args={[0.32, 0.24, 0.03]} /><meshStandardMaterial color="#1e1e1e" /></mesh>
        <mesh position={[0, 0.3, -0.02]} rotation={[-0.15, Math.PI, 0]}><planeGeometry args={[0.28, 0.2]} /><meshStandardMaterial color="#8ad0ff" emissive="#6ab8f0" emissiveIntensity={0.6} /></mesh>
      </group>
      {/* Shelf of bottles on the back wall */}
      <mesh position={[3.4, 1.95, ROOM.depth / 2 - 0.13]}><boxGeometry args={[2.6, 0.04, 0.24]} /><meshStandardMaterial color={WOOD} roughness={0.6} /></mesh>
      {bottles.map((c, i) => (
        <group key={i} position={[2.25 + i * 0.2, 1.97, ROOM.depth / 2 - 0.13]}>
          <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.035, 0.038, 0.24, 12]} /><meshStandardMaterial color={c} roughness={0.15} /></mesh>
          <mesh position={[0, 0.28, 0]}><cylinderGeometry args={[0.012, 0.02, 0.08, 10]} /><meshStandardMaterial color={c} roughness={0.15} /></mesh>
        </group>
      ))}
      {/* Menu board */}
      <group position={[5.6, 1.75, ROOM.depth / 2 - 0.02]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 0, -0.005]}><planeGeometry args={[0.7, 0.55]} /><meshStandardMaterial color="#2f7a3a" /></mesh>
        {[-0.22, 0, 0.22].map((x) => <mesh key={x} position={[x, 0, 0.001]}><planeGeometry args={[0.2, 0.46]} /><meshStandardMaterial map={card} /></mesh>)}
      </group>
      {/* Warm light over the counter */}
      <pointLight position={[3.5, 2.2, BAR.front + 0.5]} intensity={5 * lit} distance={6} decay={1.6} color="#ffd9a0" />
    </group>
  );
}

/** A blue panelled door with a round porthole, in a brick-lined arch on the back wall. */
function BlueDoor({ x }: { x: number }) {
  const z = ROOM.depth / 2 - 0.02;
  return (
    <group position={[x, 0, z]} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 1.05, 0.01]}><planeGeometry args={[0.95, 2.1]} /><meshStandardMaterial color="#2a8fd6" roughness={0.45} /></mesh>
      <mesh position={[0, 2.1, 0.01]}><circleGeometry args={[0.475, 24, 0, Math.PI]} /><meshStandardMaterial color="#2a8fd6" roughness={0.45} /></mesh>
      <mesh position={[0, 1.55, 0.02]}><circleGeometry args={[0.14, 24]} /><meshStandardMaterial color="#cfe8f2" roughness={0.1} metalness={0.3} /></mesh>
      <mesh position={[0, 1.55, 0.022]}><ringGeometry args={[0.14, 0.17, 24]} /><meshStandardMaterial color="#d9dcdf" metalness={0.9} roughness={0.2} /></mesh>
      <mesh position={[0.32, 1.0, 0.03]}><boxGeometry args={[0.03, 0.22, 0.03]} /><meshStandardMaterial color="#d9dcdf" metalness={0.9} roughness={0.2} /></mesh>
      {/* Arch trim */}
      <mesh position={[0, 2.1, 0.005]}><ringGeometry args={[0.48, 0.62, 28, 1, 0, Math.PI]} /><meshStandardMaterial color="#d9a84a" roughness={0.8} side={DoubleSide} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.55, 1.05, 0.005]}><planeGeometry args={[0.14, 2.1]} /><meshStandardMaterial color="#d9a84a" roughness={0.8} /></mesh>)}
    </group>
  );
}

/**
 * Inside Cantina Ayé: terracotta floor, red brick under yellow plaster,
 * papel picado along every wall, green enamel lamps over square white tables
 * with red and green rush chairs, the brick bar under its timber canopy with
 * green-topped stools, blue kitchen doors, an arcade of arches on the left with
 * painted plates and sombreros, and the colourful name on the right wall.
 * Staff and customers are computer-controlled.
 */
export function CantinaInterior({ gameTime, served, children }: {
  gameTime: GameTime;
  /** Your seat and what you've ordered there. */
  served: { seat: Seat; dishes: string[] } | null;
  children: ReactNode;
}) {
  const { width: w, depth: d } = ROOM;
  const l = lightingAt(gameTime.hour, gameTime.minute);
  const lit = 0.6 + 0.4 * l.night;
  const floor = useMemo(() => terracottaTexture([w / 2.4, d / 2.4]), [w, d]);
  const brickLong = useMemo(() => brickTexture([w / 1.6, BRICK_HEIGHT / 1.6]), [w]);
  const brickShort = useMemo(() => brickTexture([d / 1.6, BRICK_HEIGHT / 1.6]), [d]);
  const brickPillar = useMemo(() => brickTexture([0.4, 1.6]), []);
  const plasterLong = useMemo(() => plasterTexture([w / 3, 1]), [w]);
  const plasterShort = useMemo(() => plasterTexture([d / 3, 1]), [d]);
  const sign = useMemo(() => cantinaSignTexture(CANTINA_NAME), []);
  const runner = useMemo(() => runnerTexture(), []);
  const card = useMemo(() => menuCardTexture(), []);
  const art = useMemo(() => [paintingTexture(0), paintingTexture(1)], []);
  const doorW = 1.6;
  const side = (w - doorW) / 2;

  // What's on each table: the regulars' plates, and yours
  const REGULAR_ORDERS = ['burrito', 'horchata', 'tacos', 'flatbread', 'agua-jamaica', 'virgin-margarita'];
  const onTable = (t: CantinaTable) => {
    const out: { seat: Seat; id: string }[] = [];
    REGULARS.forEach((r, i) => {
      const seat = t.seats.find((s) => s.id === r.seatId);
      if (seat) out.push({ seat, id: REGULAR_ORDERS[i % REGULAR_ORDERS.length] });
    });
    if (served && t.seats.some((s) => s.id === served.seat.id)) {
      const food = served.dishes.filter((id) => !DRINK_IDS.has(id));
      const drink = served.dishes.filter((id) => DRINK_IDS.has(id));
      if (food.length) out.push({ seat: served.seat, id: food[food.length - 1] });
      if (drink.length) out.push({ seat: served.seat, id: drink[drink.length - 1] });
    }
    return out;
  };
  // Served at the bar: on the counter in front of your stool
  const atBar = served && STOOLS.some((s) => s.id === served.seat.id) ? served : null;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#1c1f1e" roughness={1} />
      </mesh>
      <PolishedFloor width={w} depth={d} map={floor} />
      {/* A plain warm ceiling with an air-conditioning cassette and downlights */}
      <Ceiling width={w} depth={d} height={H} color="#efe4d2">
        {[[-2.5, -3], [2.5, -3]].map(([x, z]) => (
          <group key={`${x}${z}`} position={[x, -0.03, z]}>
            <mesh><boxGeometry args={[0.85, 0.06, 0.85]} /><meshStandardMaterial color="#f4f2ec" roughness={0.6} /></mesh>
            <mesh position={[0, -0.031, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[0.5, 0.5]} /><meshStandardMaterial color="#b9b6ae" roughness={0.8} /></mesh>
          </group>
        ))}
        {[-6, 0, 6].map((x) => <Downlight key={x} x={x} z={-4.8} />)}
      </Ceiling>

      {/* Walls: brick below, yellow plaster above (the near wall leaves the doorway) */}
      <BrickWall position={[0, 0, d / 2]} rotationY={Math.PI} length={w} brick={brickLong} plaster={plasterLong} />
      <BrickWall position={[-w / 2, 0, 0]} rotationY={Math.PI / 2} length={d} brick={brickShort} plaster={plasterShort} />
      <BrickWall position={[w / 2, 0, 0]} rotationY={-Math.PI / 2} length={d} brick={brickShort} plaster={plasterShort} />
      <BrickWall position={[-(doorW / 2 + side / 2), 0, -d / 2]} rotationY={0} length={side} brick={brickLong} plaster={plasterLong} />
      <BrickWall position={[doorW / 2 + side / 2, 0, -d / 2]} rotationY={0} length={side} brick={brickLong} plaster={plasterLong} />
      <mesh position={[0, (H + 2.4) / 2, -d / 2]}><planeGeometry args={[doorW, H - 2.4]} /><meshStandardMaterial map={plasterLong} /></mesh>
      {/* Green glass doors and the exit sign above, seen from inside only (flat, so they never block the view in) */}
      <group position={[0, 0, -d / 2 + 0.02]}>
        {[-0.4, 0.4].map((x) => (
          <group key={x} position={[x, 1.2, 0]}>
            <mesh><planeGeometry args={[0.78, 2.4]} /><meshStandardMaterial color="#1f5a3a" roughness={0.5} /></mesh>
            <mesh position={[0, 0.05, 0.005]}><planeGeometry args={[0.6, 2.05]} /><meshStandardMaterial color="#cfe0e4" roughness={0.1} metalness={0.3} transparent opacity={0.55} /></mesh>
          </group>
        ))}
        <mesh position={[0, 2.62, 0.01]}><planeGeometry args={[0.5, 0.18]} /><meshStandardMaterial color="#1fa34a" emissive="#1fa34a" emissiveIntensity={0.8} /></mesh>
      </group>

      {/* Papel picado strung round the room */}
      <group position={[0, 0, d / 2]} rotation={[0, Math.PI, 0]}><Bunting length={w} y={H - 0.3} seed={0} /></group>
      <group position={[w / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}><Bunting length={d} y={H - 0.3} seed={2} /></group>
      <group position={[-w / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}><Bunting length={d} y={H - 0.3} seed={4} /></group>
      <group position={[ARCADE_X + 0.02, 0, 0]} rotation={[0, Math.PI / 2, 0]}><Bunting length={d} y={H - 0.25} seed={1} /></group>
      <group position={[0, 0, -d / 2]}><Bunting length={w} y={H - 0.3} seed={3} /></group>

      {/* The name on the right wall, sombrero over it, with the bunting above */}
      <mesh position={[w / 2 - 0.03, 2.2, 0.6]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[4.6, 1.92]} />
        <meshStandardMaterial map={sign} transparent alphaTest={0.05} roughness={0.5} />
      </mesh>
      {/* Painted plates by the door on the right wall */}
      <group position={[w / 2 - 0.02, 0, -3.9]} rotation={[0, -Math.PI / 2, 0]}>
        {[[-0.55, 2.35], [0, 2.4], [0.55, 2.35], [-0.55, 1.8], [0, 1.85], [0.55, 1.8]].map(([x, y], i) => (
          <group key={i} position={[x, y, 0]}><WallPlate seed={i + 1} /></group>
        ))}
      </group>

      {/* The arcade on the left, and what hangs in its alcoves */}
      <Arcade plaster={plasterShort} brick={brickPillar} />
      <group position={[-w / 2 + 0.02, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <group position={[2.4, 1.95, 0.05]}><WallSombrero seed={1} /></group>
        <group position={[-2.4, 1.95, 0.05]}><WallSombrero seed={2} /></group>
        {[[0.6, art[0]], [-0.6, art[1]]].map(([x, t], i) => (
          <group key={i} position={[x as number, 1.9, 0.03]}>
            <mesh position={[0, 0, -0.005]}><boxGeometry args={[0.72, 0.94, 0.03]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
            <mesh position={[0, 0, 0.012]}><planeGeometry args={[0.64, 0.86]} /><meshStandardMaterial map={t as Texture} roughness={0.6} /></mesh>
          </group>
        ))}
        {/* A third sombrero, red, white and green, in the far bay */}
        <group position={[4.8, 1.95, 0.05]}><WallSombrero seed={4} /></group>
      </group>

      <Bar lit={lit} />
      {BACK_DOORS.map((x) => <BlueDoor key={x} x={x} />)}
      {STOOLS.map((s) => <Stool key={s.id} seat={s} />)}
      {atBar && atBar.dishes.length > 0 && (
        <group position={[atBar.seat.x, BAR.h + 0.063, BAR.front + 0.25]}><CantinaDish id={atBar.dishes[atBar.dishes.length - 1]} /></group>
      )}
      {TABLES.map((t, i) => <Table key={t.id} t={t} runner={runner} card={card} dishes={onTable(t)} flip={i % 2 === 1} />)}

      {/* Green pendants: one over each table */}
      {TABLES.map((t) => <GreenPendant key={t.id} x={t.x} z={t.z} drop={1.15} lit={l.night} />)}

      {/* Warm, bright light: the room in the reference is lit like a sunny afternoon */}
      <hemisphereLight args={['#fff0d0', '#6a3a20', 0.55]} />
      {TABLES.map((t) => <pointLight key={t.id} position={[t.x, 2.0, t.z]} intensity={3.2 * lit} distance={5} decay={1.7} color="#ffe4b8" />)}
      <pointLight position={[0, 2.8, -3.5]} intensity={6 * lit} distance={12} decay={1.5} color="#ffe9c8" />

      {/* Staff and customers: computer-controlled */}
      <VenueNpc {...STAFF.bartender} uniform={UNIFORMS.black} />
      <VenueNpc lookId={STAFF.waiter.lookId} name={STAFF.waiter.name} role={STAFF.waiter.role} x={WAITER_ROUTE[0][0]} z={WAITER_ROUTE[0][1]} facing={0} route={WAITER_ROUTE} uniform={UNIFORMS.black} />
      {REGULARS.map((r) => {
        const seat = seatById(r.seatId);
        return seat ? <VenueNpc key={r.name} lookId={r.lookId} name={r.name} role="Customer" x={0} z={0} facing={0} seat={seat} chatty /> : null;
      })}
      {children}
    </group>
  );
}
