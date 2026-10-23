import type { Interior } from '../lib/interiors';
import { WALL_HEIGHT } from '../lib/interiors';
import { pbr } from './pbr';
import { RealModel } from './RealModel';
import { useMemo } from 'react';

/**
 * The built-in decor of the homes OGM Homes sells (lib/interiors.ts `solids`):
 * the brick fireplace with red curtains, dining chairs and the study corner of
 * the family house, the villa's marble fireplace, and the starter house's
 * table chairs. Drawn here; their footprints are solid in the interior layout.
 */

const M = ({ color, rough = 0.7, metal = 0, emissive, glow = 0 }: { color: string; rough?: number; metal?: number; emissive?: string; glow?: number }) =>
  <meshStandardMaterial color={color} roughness={rough} metalness={metal} emissive={emissive ?? '#000000'} emissiveIntensity={glow} />;

/** A dining chair facing the given way (radians; 0 = facing +z). */
function DiningChair({ x, z, facing, color = '#5a3b28', seat = '#efe9df' }: { x: number; z: number; facing: number; color?: string; seat?: string }) {
  return (
    <group position={[x, 0, z]} rotation={[0, facing, 0]}>
      <mesh position={[0, 0.46, 0]} castShadow><boxGeometry args={[0.44, 0.06, 0.44]} /><M color={seat} rough={0.9} /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => (
        <mesh key={`${a}${b}`} position={[a * 0.19, 0.22, b * 0.19]}><boxGeometry args={[0.04, 0.44, 0.04]} /><M color={color} rough={0.5} /></mesh>
      ))}
      <mesh position={[0, 0.78, -0.2]} castShadow><boxGeometry args={[0.42, 0.6, 0.05]} /><M color={color} rough={0.5} /></mesh>
    </group>
  );
}

/** A fireplace against an east wall (+x), facing into the room: brick or marble. */
function Fireplace({ x, z, width, kind, night }: { x: number; z: number; width: number; kind: 'brick' | 'marble'; night: number }) {
  const brick = kind === 'brick';
  const face = brick ? '#ffffff' : '#efece6';
  // Real brick (ambientCG Bricks104) on the family house's chimney breast
  const bricks = useMemo(() => (brick ? pbr('bricks', [width / 1.2, WALL_HEIGHT / 1.2]) : null), [brick, width]);
  return (
    <group position={[x, 0, z]} rotation={[0, -Math.PI / 2, 0]}>
      {/* Chimney breast to the ceiling */}
      <mesh position={[0, WALL_HEIGHT / 2, -0.05]} castShadow>
        <boxGeometry args={[width, WALL_HEIGHT, 0.5]} />
        {bricks ? <meshStandardMaterial {...bricks} /> : <M color={face} rough={0.2} />}
      </mesh>
      {/* Mantel, opening and the fire */}
      <mesh position={[0, 1.15, 0.28]} castShadow><boxGeometry args={[width + 0.2, 0.08, 0.3]} /><M color={brick ? '#3e2a1e' : '#d8d2c6'} rough={0.4} /></mesh>
      <mesh position={[0, 0.5, 0.21]}><boxGeometry args={[width * 0.55, 0.8, 0.02]} /><M color="#141210" rough={1} /></mesh>
      <mesh position={[0, 0.25, 0.23]}><boxGeometry args={[width * 0.4, 0.22, 0.02]} /><M color="#ff8a3a" emissive="#ff6a1a" glow={1.2 + night} /></mesh>
      <mesh position={[0, 0.03, 0.45]} receiveShadow><boxGeometry args={[width + 0.3, 0.06, 0.5]} /><M color={brick ? '#5a5048' : '#dcd6cc'} rough={0.6} /></mesh>
      {/* Candlesticks and a mirror over the mantel */}
      {[-0.4, 0.4].map((dx) => <mesh key={dx} position={[dx * width / 2, 1.3, 0.3]}><cylinderGeometry args={[0.03, 0.04, 0.22, 10]} /><M color="#c9a052" metal={0.85} rough={0.3} /></mesh>)}
      <mesh position={[0, 1.85, 0.21]}><boxGeometry args={[width * 0.6, 0.8, 0.03]} /><M color="#c9a052" metal={0.8} rough={0.3} /></mesh>
      <mesh position={[0, 1.85, 0.23]}><planeGeometry args={[width * 0.52, 0.7]} /><M color="#b8c4ca" metal={0.9} rough={0.05} /></mesh>
      <pointLight position={[0, 0.5, 0.9]} intensity={1.5 + 3 * night} distance={5} decay={1.8} color="#ffb070" />
    </group>
  );
}

/** Red curtains drawn back either side of a window strip on an east wall. */
function RedCurtains({ x, z, span }: { x: number; z: number; span: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, -Math.PI / 2, 0]}>
      {[-1, 1].map((k) => (
        <mesh key={k} position={[k * span / 2, 1.45, 0.06]} castShadow><boxGeometry args={[0.55, 2.8, 0.1]} /><M color="#8e1f22" rough={0.95} /></mesh>
      ))}
      <mesh position={[0, 2.82, 0.04]}><cylinderGeometry args={[0.02, 0.02, span + 0.8, 8]} /><M color="#3a2a20" /></mesh>
    </group>
  );
}

/** Framed certificates on a wall facing +z. */
function Certificates({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 1.65, z]}>
      {[-0.45, 0.45].flatMap((dx) => [0, 0.55].map((dy) => (
        <group key={`${dx}${dy}`} position={[dx, dy - 0.25, 0]}>
          <mesh><boxGeometry args={[0.4, 0.3, 0.03]} /><M color="#2a1c14" rough={0.5} /></mesh>
          <mesh position={[0, 0, 0.017]}><planeGeometry args={[0.32, 0.22]} /><M color="#f4efe2" rough={0.9} /></mesh>
          <mesh position={[0, -0.05, 0.019]}><circleGeometry args={[0.03, 16]} /><M color="#c9a052" metal={0.6} rough={0.4} /></mesh>
        </group>
      )))}
    </group>
  );
}

/** On the kitchen counter: a bowl of real fruit and a loaf on a bread board (ambientCG scans, CC0). */
function KitchenFood({ x, y, z, along }: { x: number; y: number; z: number; along: boolean }) {
  return (
    <group position={[x, y, z]} rotation={[0, along ? 0 : Math.PI / 2, 0]}>
      <group position={[-0.35, 0, 0]}>
        <mesh position={[0, 0.045, 0]} castShadow><sphereGeometry args={[0.13, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><meshStandardMaterial color="#efe9df" roughness={0.3} side={2} /></mesh>
        <group position={[-0.04, 0.05, 0.02]}><RealModel name="apple-red" /></group>
        <group position={[0.05, 0.05, -0.03]}><RealModel name="apple" /></group>
        <group position={[0.0, 0.06, 0.06]}><RealModel name="pear" /></group>
        <group position={[0.02, 0.1, -0.01]}><RealModel name="kiwi" /></group>
      </group>
      <group position={[0.3, 0, 0]}>
        <mesh position={[0, 0.01, 0]} castShadow receiveShadow><boxGeometry args={[0.36, 0.02, 0.24]} /><meshStandardMaterial color="#9a6a3c" roughness={0.6} /></mesh>
        <group position={[0, 0.02, 0]}><RealModel name="bread-loaf" /></group>
      </group>
    </group>
  );
}

export function HomeDecor({ interior, night }: { interior: Interior; night: number }) {
  const w = interior.width, d = interior.depth;
  const counter = interior.furniture.find((f) => f.kind === 'counter');
  const food = counter ? <KitchenFood x={counter.at[0]} y={counter.size[1]} z={counter.at[1]} along={counter.size[0] >= counter.size[2]} /> : null;
  return <>{food}<TierDecor interior={interior} night={night} w={w} d={d} /></>;
}

function TierDecor({ interior, night, w, d }: { interior: Interior; night: number; w: number; d: number }) {
  switch (interior.tier) {
    case 'house':
      return (
        <>
          <DiningChair x={1.55} z={-1.7} facing={Math.PI / 2} />
          <DiningChair x={3.05} z={-1.7} facing={-Math.PI / 2} />
        </>
      );
    case 'family':
      return (
        <>
          <Fireplace x={w / 2 - 0.25} z={1.5} width={2.0} kind="brick" night={night} />
          <RedCurtains x={w / 2 - 0.02} z={1.5} span={3.9} />
          {[2.45, 3.1, 3.75].flatMap((x) => [
            <DiningChair key={`a${x}`} x={x} z={-3.55} facing={0} />,
            <DiningChair key={`b${x}`} x={x} z={-1.95} facing={Math.PI} />,
          ])}
          {/* Wire pendants over the dining table */}
          {[2.6, 3.6].map((x) => (
            <group key={x} position={[x, 0, -2.75]}>
              <mesh position={[0, 2.45, 0]}><cylinderGeometry args={[0.005, 0.005, 0.9, 6]} /><M color="#222" /></mesh>
              <mesh position={[0, 1.95, 0]}><sphereGeometry args={[0.16, 12, 8]} /><meshStandardMaterial color="#2a2a2a" wireframe /></mesh>
              <mesh position={[0, 1.95, 0]}><sphereGeometry args={[0.05, 10, 8]} /><M color="#fff2d6" emissive="#ffcf8a" glow={1 + night} /></mesh>
            </group>
          ))}
          {/* Study: the desk's return, a leather chair, certificates on the wall, and the coat stand by the door */}
          <mesh position={[-5.1, 0.38, -2.95]} castShadow><boxGeometry args={[0.65, 0.76, 1.05]} /><M color="#5a3424" rough={0.45} /></mesh>
          <group position={[-4.0, 0, -3.0]} rotation={[0, Math.PI, 0]}>
            <mesh position={[0, 0.48, 0]} castShadow><boxGeometry args={[0.55, 0.12, 0.55]} /><M color="#2a1a14" rough={0.4} /></mesh>
            <mesh position={[0, 0.9, -0.24]}><boxGeometry args={[0.55, 0.75, 0.1]} /><M color="#2a1a14" rough={0.4} /></mesh>
            <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.03, 0.03, 0.42, 8]} /><M color="#888" metal={0.8} /></mesh>
          </group>
          <Certificates x={-4.15} z={-d / 2 + 0.02} />
          <group position={[-1.6, 0, -4.1]}>
            <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.025, 0.04, 1.8, 8]} /><M color="#3a2a20" /></mesh>
            <mesh position={[0, 1.6, 0.1]}><boxGeometry args={[0.35, 0.6, 0.12]} /><M color="#3a4a5a" rough={0.9} /></mesh>
          </group>
        </>
      );
    case 'villa':
      return <Fireplace x={w / 2 - 0.25} z={-3.6} width={2.0} kind="marble" night={night} />;
    default:
      return null;
  }
}
