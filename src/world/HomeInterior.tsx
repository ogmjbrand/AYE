import { RealModel } from './RealModel';
import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, type Group, type MeshStandardMaterial } from 'three';
import type { Furniture, Interior } from '../lib/interiors';
import { WALL_HEIGHT, lightSwitchSpot } from '../lib/interiors';
import { lightingAt } from './timeOfDay';
import { marbleTexture, skyMoodAt, skylineTexture } from './venueTextures';
import { LuxePiece } from './LuxeFurniture';
import { HomeDecor } from './HomeDecor';
import { StudioPiece } from './StudioFurniture';
import { pbr } from './pbr';
import type { GameTime } from '../lib/gameState';
import { interiorFloorMaterial } from './interiorMaterials';
import { LightsOn, useLightsOn } from './lights';
import { PlainBed, PlainWardrobe } from './PlainBedroom';

interface ShellProps {
  interior: Interior;
  gameTime: GameTime;
  /** Furniture you placed yourself, drawn alongside the room's own. */
  extra?: readonly Furniture[];
  /** The front door swung open (venues). */
  doorOpen?: boolean;
  /** Homes: the lights are switched on (the ceiling light and the lamps). */
  lightsOn?: boolean;
  children: ReactNode;
}

/**
 * An interior: your home, or a public venue.
 *
 * Homes are a dolls' house with a roof: the walls face inwards only and the
 * front wall is left out, so from the camera (in front, kept under the
 * ceiling by App.tsx's CameraFollow) you look straight into the room, with
 * the ceiling overhead.
 *
 * Venues (office, restaurant, boutique, dealership, campus, hospital) are an
 * enclosed shell: a ceiling that hides when the camera is above the room,
 * partitions between rooms, and walls that fade when the camera is close.
 */
export function HomeInterior(props: ShellProps) {
  return props.interior.architecture === 'residential' ? <HomeShell {...props} /> : <VenueShell {...props} />;
}

function HomeShell({ interior, gameTime, extra = [], lightsOn = true, children }: ShellProps) {
  const { width: w, depth: d } = interior;
  const night = lightingAt(gameTime.hour, gameTime.minute).night;
  const H = WALL_HEIGHT;
  const doorW = 1.4;
  const side = (w - doorW) / 2;
  const windowSize = interior.window === 'full' ? [w * 0.8, H - 0.3] : interior.window === 'wide' ? [Math.min(3.2, w * 0.5), 1.4] : [1.1, 1.0];
  const windowY = interior.window === 'full' ? H / 2 : 1.6;
  // The city outside the window, by time of day
  const sky = skylineTexture(skyMoodAt(night, gameTime.hour), 23);
  const luxe = interior.tier === 'penthouse' || interior.tier === 'apartment' || interior.tier === 'villa';
  const floor = useMemo(() => (interior.tier === 'penthouse' || interior.tier === 'villa' ? marbleTexture('cream', [w / 2.4, d / 2.4]) : null), [interior.tier, w, d]);
  // Every other home has real oak floorboards (ambientCG WoodFloor051), a little warmer or cooler by the home's colour
  const boards = useMemo(() => (floor ? null : pbr('wood-floor', [w / 2.2, d / 2.2])), [floor, w, d]);
  // Pendant lights over the kitchen island and the dining table
  const pendants = luxe ? [...interior.furniture, ...extra].filter((f) => (f.kind === 'counter' || (f.kind === 'table' && f.size[0] * f.size[2] > 2)) && f.style === 'luxe') : [];

  return (
    <group>
      {/* Ground around the building, so there is no void below */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#2a2c2f" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        {floor ? <meshStandardMaterial map={floor} roughness={0.14} /> : <meshStandardMaterial {...boards} />}
      </mesh>

      {/* Ceramic tiles under the shower, bath and kitchen counters (ambientCG Tiles035) */}
      {[...interior.furniture, ...extra].filter((f) => f.kind === 'shower' || f.kind === 'bathtub' || f.kind === 'counter').map((f, i) => (
        <TiledPatch key={i} x={f.at[0]} z={f.at[1]} w={f.size[0] + 0.5} d={f.size[2] + 0.5} />
      ))}

      {/* Walls, facing inwards */}
      <HomeWall brick={interior.brick} color={interior.wallColor} position={[0, H / 2, d / 2]} rotationY={Math.PI} size={[w, H]} />
      <HomeWall brick={interior.brick} color={interior.wallColor} position={[-w / 2, H / 2, 0]} rotationY={Math.PI / 2} size={[d, H]} />
      <HomeWall brick={interior.brick} color={interior.wallColor} position={[w / 2, H / 2, 0]} rotationY={-Math.PI / 2} size={[d, H]} />
      <HomeWall brick={interior.brick} color={interior.wallColor} position={[-(doorW / 2 + side / 2), H / 2, -d / 2]} rotationY={0} size={[side, H]} />
      <HomeWall brick={interior.brick} color={interior.wallColor} position={[doorW / 2 + side / 2, H / 2, -d / 2]} rotationY={0} size={[side, H]} />
      <HomeWall brick={interior.brick} color={interior.wallColor} position={[0, (H + 2.1) / 2, -d / 2]} rotationY={0} size={[doorW, H - 2.1]} />
      {/* Front door, closed behind you (faces inwards like the walls, so the camera sees past it) */}
      <mesh position={[0, 1.05, -d / 2 + 0.01]}>
        <planeGeometry args={[doorW - 0.2, 2.1]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.6} />
      </mesh>

      {/* Window on the far wall */}
      <mesh position={[0, windowY, d / 2 - 0.02]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={windowSize as [number, number]} />
        <meshStandardMaterial map={sky} emissiveMap={sky} emissive="#ffffff" emissiveIntensity={night > 0.5 ? 0.7 : 0.85} roughness={0.2} toneMapped={false} />
      </mesh>
      {interior.window === 'full' && Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[-windowSize[0] / 2 + (i * windowSize[0]) / 4, windowY, d / 2 - 0.04]}>
          <boxGeometry args={[0.05, windowSize[1], 0.04]} />
          <meshStandardMaterial color="#2b2622" roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
      {/* Warm cove light along the top of the walls */}
      {luxe && [[0, d / 2 - 0.03, w, 0], [-w / 2 + 0.03, 0, d, Math.PI / 2], [w / 2 - 0.03, 0, d, -Math.PI / 2]].map(([x, z, len, ry], i) => (
        <mesh key={i} position={[x, H - 0.12, z]} rotation={[0, ry, 0]}>
          <boxGeometry args={[len, 0.035, 0.03]} />
          <meshStandardMaterial color="#fff2d6" emissive="#ffcf8a" emissiveIntensity={1.4 + night * 1.5} toneMapped={false} />
        </mesh>
      ))}
      {pendants.map((p, i) => (
        <group key={i} position={[p.at[0], 0, p.at[1]]}>
          {[-1, 0, 1].map((k) => {
            const along = p.size[0] >= p.size[2];
            const off = k * Math.max(p.size[0], p.size[2]) * 0.28;
            return (
              <group key={k} position={[along ? off : 0, 2.05, along ? 0 : off]}>
                <mesh position={[0, (H - 2.05) / 2 + 0.2, 0]}>
                  <cylinderGeometry args={[0.006, 0.006, H - 2.05 + 0.4, 6]} />
                  <meshStandardMaterial color="#c9a052" metalness={0.85} roughness={0.3} />
                </mesh>
                <mesh>
                  <sphereGeometry args={[0.13, 20, 16]} />
                  <meshStandardMaterial color="#fff2d6" emissive="#ffcf8a" emissiveIntensity={1 + night} toneMapped={false} transparent opacity={0.95} />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}

      <LightsOn.Provider value={lightsOn}>
        {interior.furniture.map((f, i) => <Piece key={i} f={f} />)}
        <HomeDecor interior={interior} night={night} />
        {/* Furniture you bought */}
        {extra.map((f, i) => <Piece key={`own-${i}`} f={f} />)}
      </LightsOn.Provider>

      {/* The ceiling: a plaster slab over the whole room with a cornice along the back and side walls, and a flush light in the middle */}
      <mesh position={[0, H + 0.08, 0]} receiveShadow>
        <boxGeometry args={[w + 0.24, 0.16, d + 0.24]} />
        <meshStandardMaterial color="#f1ece3" roughness={0.9} />
      </mesh>
      {[[0, d / 2 - 0.04, w, 0], [-w / 2 + 0.04, 0, d, Math.PI / 2], [w / 2 - 0.04, 0, d, Math.PI / 2]].map(([x, z, length, turn], i) => (
        <mesh key={i} position={[x, H - 0.05, z]} rotation={[0, turn, 0]}>
          <boxGeometry args={[length, 0.1, 0.08]} />
          <meshStandardMaterial color="#e9e2d6" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, H - 0.015, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 32]} />
        <meshStandardMaterial color="#fff6e4" emissive="#ffd9a8" emissiveIntensity={lightsOn ? 1.2 : 0} roughness={0.4} side={DoubleSide} />
      </mesh>
      {/* Ceiling light: warm, brighter after dark; switched off, only a little spill from outside */}
      <pointLight position={[0, H - 0.2, 0]} intensity={lightsOn ? 4 + night * 14 : 0.6} distance={Math.max(w, d) * 1.6} decay={1.6} color="#ffd9a8" />
      <LightSwitch spot={lightSwitchSpot(interior)} halfWidth={w / 2} on={lightsOn} />
      {children}
    </group>
  );
}


function VenueShell({ interior, gameTime, doorOpen = false, extra = [], children }: ShellProps) {
  const ceiling = useRef<Group>(null);
  const { width: w, depth: d } = interior;
  const night = lightingAt(gameTime.hour, gameTime.minute).night;
  const H = WALL_HEIGHT;
  const doorW = 1.4;
  const side = (w - doorW) / 2;
  const windowWidth = interior.window === 'full' ? w * 0.48 : interior.window === 'wide' ? Math.min(3.2, w * 0.32) : 1.35;
  const windowHeight = interior.window === 'full' ? H - 0.45 : interior.window === 'wide' ? 1.55 : 1.1;
  const windowY = interior.window === 'full' ? H / 2 : 1.95;
  const windowSide = (w - windowWidth) / 2;
  const windowTop = H - (windowY + windowHeight / 2);
  const windowBottom = windowY - windowHeight / 2;
  const windowFrame = interior.architecture === 'office' ? '#343a3d'
    : interior.architecture === 'boutique' ? '#b99658'
      : interior.architecture === 'restaurant' ? '#4b3829'
        : interior.architecture === 'dealership' ? '#9a8760' : '#60452f';
  const ceilingColor = interior.architecture === 'restaurant' ? '#382d26'
    : interior.architecture === 'boutique' ? '#24201e'
      : interior.architecture === 'office' ? '#e1e0dc'
        : interior.architecture === 'dealership' ? '#e3e0d8' : '#eeeae2';
  // Daylight or a night city outside the window
  const sky = night > 0.5 ? '#1b2536' : night > 0.1 ? '#e0a46c' : '#bcd6e8';

  useFrame(({ camera }) => {
    if (!ceiling.current) return;
    const cameraIsAboveTheRoom = camera.position.y > H
      && Math.abs(camera.position.x) < w / 2
      && Math.abs(camera.position.z) < d / 2;
    ceiling.current.visible = !cameraIsAboveTheRoom;
  });

  return (
    <group>
      <mesh position={[0, -0.09, 0]} receiveShadow castShadow>
        <boxGeometry args={[w + 0.36, 0.18, d + 0.36]} />
        <meshStandardMaterial color={interior.architecture === 'office' ? '#4e504d' : '#403b35'} roughness={0.86} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <primitive object={interiorFloorMaterial(interior)} attach="material" />
      </mesh>

      <VenueWall color={interior.wallColor} position={[-(w + windowWidth) / 4, H / 2, d / 2]} rotationY={Math.PI} size={[windowSide, H]} />
      <VenueWall color={interior.wallColor} position={[(w + windowWidth) / 4, H / 2, d / 2]} rotationY={Math.PI} size={[windowSide, H]} />
      <VenueWall color={interior.wallColor} position={[0, windowY + windowHeight / 2 + windowTop / 2, d / 2]} rotationY={Math.PI} size={[windowWidth, windowTop]} />
      <VenueWall color={interior.wallColor} position={[0, windowBottom / 2, d / 2]} rotationY={Math.PI} size={[windowWidth, windowBottom]} />
      <VenueWall color={interior.wallColor} position={[-w / 2, H / 2, 0]} rotationY={Math.PI / 2} size={[d, H]} />
      <VenueWall color={interior.wallColor} position={[w / 2, H / 2, 0]} rotationY={-Math.PI / 2} size={[d, H]} />
      <VenueWall color={interior.wallColor} position={[-(doorW / 2 + side / 2), H / 2, -d / 2]} rotationY={0} size={[side, H]} />
      <VenueWall color={interior.wallColor} position={[doorW / 2 + side / 2, H / 2, -d / 2]} rotationY={0} size={[side, H]} />
      <VenueWall color={interior.wallColor} position={[0, (H + 2.1) / 2, -d / 2]} rotationY={0} size={[doorW, H - 2.1]} />
      {/* The door is a visible entry point; E opens it and exits through the same doorway. */}
      <group position={[-(doorW - 0.2) / 2, 0, -d / 2 + 0.06]} rotation={[0, doorOpen ? -Math.PI / 2 : 0, 0]}>
        <mesh position={[(doorW - 0.2) / 2, 1.05, 0]} castShadow>
          <boxGeometry args={[doorW - 0.2, 2.1, 0.08]} />
          <meshStandardMaterial color="#5a3d28" roughness={0.6} />
        </mesh>
        <mesh position={[(doorW - 0.2) / 2 + 0.48, 1.02, 0.055]} castShadow>
          <sphereGeometry args={[0.045, 12, 10]} />
          <meshStandardMaterial color="#c7a35c" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      <mesh position={[0, windowY, d / 2 - 0.09]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[windowWidth - 0.12, windowHeight - 0.12]} />
        <meshStandardMaterial
          color={sky}
          emissive={sky}
          emissiveIntensity={night > 0.5 ? 0.28 : 0.14}
          roughness={0.16}
          metalness={0.28}
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, windowY, d / 2 - 0.14]} castShadow>
        <boxGeometry args={[0.055, windowHeight - 0.08, 0.08]} />
        <meshStandardMaterial color={windowFrame} roughness={0.42} metalness={interior.architecture === 'office' || interior.architecture === 'boutique' ? 0.65 : 0.12} />
      </mesh>
      {[-1, 1].map((sideSign) => (
        <mesh key={sideSign} position={[sideSign * (windowWidth / 2 - 0.035), windowY, d / 2 - 0.14]} castShadow>
          <boxGeometry args={[0.07, windowHeight, 0.09]} />
          <meshStandardMaterial color={windowFrame} roughness={0.42} metalness={interior.architecture === 'office' || interior.architecture === 'boutique' ? 0.65 : 0.12} />
        </mesh>
      ))}
      {[-1, 1].map((verticalSign) => (
        <mesh key={verticalSign} position={[0, windowY + verticalSign * (windowHeight / 2 - 0.035), d / 2 - 0.14]} castShadow>
          <boxGeometry args={[windowWidth, 0.07, 0.09]} />
          <meshStandardMaterial color={windowFrame} roughness={0.42} metalness={interior.architecture === 'office' || interior.architecture === 'boutique' ? 0.65 : 0.12} />
        </mesh>
      ))}
      <mesh position={[0, windowY, d / 2 - 0.15]} castShadow>
        <boxGeometry args={[0.045, windowHeight - 0.12, 0.09]} />
        <meshStandardMaterial color={windowFrame} roughness={0.42} metalness={0.55} />
      </mesh>
      <mesh position={[0, windowY, d / 2 - 0.15]} castShadow>
        <boxGeometry args={[windowWidth - 0.08, 0.045, 0.09]} />
        <meshStandardMaterial color={windowFrame} roughness={0.42} metalness={0.55} />
      </mesh>

      {interior.partitions.map((wall, i) => (
        wall.material === 'glass'
          ? <GlassPartition key={i} wall={wall} frame={windowFrame} />
          : <mesh key={i} position={wall.position} castShadow receiveShadow>
              <boxGeometry args={wall.size} />
              <meshStandardMaterial color={interior.wallColor} roughness={0.9} />
            </mesh>
      ))}

      <group ref={ceiling}>
        <mesh position={[0, H + 0.06, 0]} castShadow receiveShadow>
          <boxGeometry args={[w + 0.36, 0.16, d + 0.36]} />
          <meshStandardMaterial color={ceilingColor} roughness={0.82} />
        </mesh>
        <mesh position={[0, H - 0.1, 0]}>
          <boxGeometry args={[w, 0.035, 0.06]} />
          <meshStandardMaterial color={interior.architecture === 'boutique' ? '#b99658' : windowFrame} metalness={0.6} roughness={0.36} />
        </mesh>
        {interior.architecture === 'office' && (
          <>
            {[-w / 3, w / 3].map((x) => (
              <mesh key={x} position={[x, H - 0.12, 0]}>
                <boxGeometry args={[0.035, 0.035, d]} />
                <meshStandardMaterial color="#c4c5c1" roughness={0.82} />
              </mesh>
            ))}
            {[-1, 1].map((sideSign) => (
              <mesh key={sideSign} position={[sideSign * w / 4, H - 0.1, 0]}>
                <boxGeometry args={[1.9, 0.045, 0.36]} />
                <meshStandardMaterial color="#f9f7ef" emissive="#e6dfc7" emissiveIntensity={0.35} roughness={0.32} />
              </mesh>
            ))}
          </>
        )}
        {interior.architecture === 'boutique' && (
          <mesh position={[0, H - 0.1, -d / 4]}>
            <boxGeometry args={[w - 1, 0.035, 0.045]} />
            <meshStandardMaterial color="#c9a35e" emissive="#c9a35e" emissiveIntensity={0.35} metalness={0.62} roughness={0.32} />
          </mesh>
        )}
      </group>

      {interior.window === 'full' && (
        <pointLight position={[0, windowY, d / 2 - 0.4]} intensity={night > 0.5 ? 0.5 : 1.4} distance={w * 0.8} color={sky} />
      )}

      {[...interior.furniture, ...extra].map((f, i) => <Piece key={i} f={f} />)}

      {/* Warm practical lights make each room legible without flattening the daylight. */}
      <ambientLight intensity={interior.architecture === 'office' ? 0.38 : 0.48} />
      {[
        [-w / 4, H - 0.25, -d / 4],
        [w / 4, H - 0.25, -d / 4],
        [-w / 4, H - 0.25, d / 4],
        [w / 4, H - 0.25, d / 4],
      ].map((position, index) => (
        <group key={index} position={position as [number, number, number]}>
          <mesh>
            <boxGeometry args={[0.32, 0.035, 0.32]} />
            <meshStandardMaterial color="#fff8e8" emissive="#ffe3b5" emissiveIntensity={0.55} roughness={0.28} />
          </mesh>
          <pointLight position={[0, -0.15, 0]} intensity={interior.architecture === 'office' ? 1.5 + night * 2 : 1.8 + night * 3} distance={Math.max(w, d) * 0.5} decay={1.7} color="#ffdfb4" />
        </group>
      ))}
      {children}
    </group>
  );
}


function TiledPatch({ x, z, w, d }: { x: number; z: number; w: number; d: number }) {
  const tiles = useMemo(() => pbr('tiles', [w / 0.9, d / 0.9]), [w, d]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.004, z]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial {...tiles} />
    </mesh>
  );
}

function HomeWall({ color, position, rotationY, size, brick = false }: { color: string; position: [number, number, number]; rotationY: number; size: [number, number]; brick?: boolean }) {
  // Exposed brick (ambientCG Bricks104), tiled at its real size (about 1.2 m a repeat)
  const bricks = useMemo(() => (brick ? pbr('bricks', [size[0] / 1.2, size[1] / 1.2]) : null), [brick, size]);
  // Painted walls: the home's colour over real plaster relief (ambientCG PaintedPlaster003), about 2 m a repeat
  const plaster = useMemo(() => {
    if (brick) return null;
    const { normalMap, roughnessMap } = pbr('plaster', [size[0] / 2, size[1] / 2]);
    return { normalMap, roughnessMap };
  }, [brick, size]);
  return (
    <mesh position={position} rotation={[0, rotationY, 0]} receiveShadow>
      <planeGeometry args={size} />
      {bricks ? <meshStandardMaterial {...bricks} /> : <meshStandardMaterial color={color} roughness={0.95} {...plaster} normalScale={[0.6, 0.6]} />}
    </mesh>
  );
}

function VenueWall({ color, position, rotationY, size }: { color: string; position: readonly [number, number, number]; rotationY: number; size: readonly [number, number] }) {
  const material = useRef<MeshStandardMaterial>(null);
  useFrame(({ camera }) => {
    if (!material.current) return;
    const rotated = Math.abs(Math.sin(rotationY)) > 0.5;
    const halfWidthX = (rotated ? 0.08 : size[0] / 2) + 0.55;
    const halfWidthZ = (rotated ? size[0] / 2 : 0.08) + 0.55;
    const near = Math.abs(camera.position.x - position[0]) < halfWidthX
      && Math.abs(camera.position.z - position[2]) < halfWidthZ
      && camera.position.y > position[1] - size[1] / 2 - 0.35
      && camera.position.y < position[1] + size[1] / 2 + 0.35;
    material.current.opacity = near ? 0.14 : 1;
    material.current.depthWrite = !near;
  });
  return (
    <mesh position={position} rotation={[0, rotationY, 0]} receiveShadow castShadow>
      <boxGeometry args={[size[0], size[1], 0.16]} />
      <meshStandardMaterial ref={material} color={color} roughness={0.86} transparent />
    </mesh>
  );
}

function GlassPartition({ wall, frame }: { wall: Interior['partitions'][number]; frame: string }) {
  const [width, height, depth] = wall.size;
  const [x, y, z] = wall.position;
  return (
    <group position={[x, y, z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#91abb0" transparent opacity={0.18} metalness={0.45} roughness={0.16} depthWrite={false} />
      </mesh>
      <mesh position={[0, height / 2 - 0.04, 0]}>
        <boxGeometry args={[width + 0.04, 0.08, depth + 0.05]} />
        <meshStandardMaterial color={frame} metalness={0.62} roughness={0.36} />
      </mesh>
      <mesh position={[0, -height / 2 + 0.04, 0]}>
        <boxGeometry args={[width + 0.04, 0.08, depth + 0.05]} />
        <meshStandardMaterial color={frame} metalness={0.62} roughness={0.36} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 0, side * (depth / 2 - 0.035)]}>
          <boxGeometry args={[width + 0.04, height, 0.07]} />
          <meshStandardMaterial color={frame} metalness={0.62} roughness={0.36} />
        </mesh>
      ))}
    </group>
  );
}

const box = (w: number, h: number, d: number, y: number, color: string, x = 0, z = 0, key?: string) => (
  <mesh key={key} position={[x, y, z]} castShadow receiveShadow>
    <boxGeometry args={[w, h, d]} />
    <meshStandardMaterial color={color} roughness={0.7} />
  </mesh>
);

/** A plain floor lamp: its shade glows while the lights are on. */
function PlainLamp({ w, h, color }: { w: number; h: number; color: string }) {
  const on = useLightsOn();
  return (
    <>
      {box(0.05, h - 0.3, 0.05, (h - 0.3) / 2, '#2b2b2d')}
      <mesh position={[0, h - 0.15, 0]}>
        <cylinderGeometry args={[w * 0.35, w * 0.5, 0.3, 16, 1, true]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={on ? 0.6 : 0} side={DoubleSide} />
      </mesh>
    </>
  );
}

/** The switch plate on the side wall by where you stand, its rocker up when on. */
function LightSwitch({ spot, halfWidth, on }: { spot: readonly [number, number]; halfWidth: number; on: boolean }) {
  const side = spot[0] < 0 ? -1 : 1;
  return (
    <group position={[side * (halfWidth - 0.012), 1.2, spot[1]]} rotation={[0, -side * Math.PI / 2, 0]}>
      <mesh><boxGeometry args={[0.09, 0.13, 0.012]} /><meshStandardMaterial color="#f1eee8" roughness={0.5} /></mesh>
      <mesh position={[0, on ? 0.015 : -0.015, 0.009]} rotation={[on ? -0.25 : 0.25, 0, 0]}>
        <boxGeometry args={[0.035, 0.05, 0.012]} />
        <meshStandardMaterial color="#e6e1d8" roughness={0.45} />
      </mesh>
    </group>
  );
}

/** One piece of furniture, built from simple shapes (also used for the catalogue's 3D preview). */
export function Piece({ f }: { f: Furniture }) {
  const [w, h, d] = f.size;
  const [x, z] = f.at;
  if (f.design?.startsWith('studio-')) return <group position={[x, f.elevation ?? 0, z]} rotation={[0, f.rotation ?? 0, 0]}><StudioPiece f={f} /></group>;
  if (f.style === 'luxe' || f.kind === 'art') return <group position={[x, f.elevation ?? 0, z]} rotation={[0, f.rotation ?? 0, 0]}><LuxePiece f={f} /></group>;
  let parts: ReactNode;
  switch (f.kind) {
    case 'bed':
      // Headboard on +z, duvet in the bed's colour
      parts = <PlainBed w={w} d={d} color={f.color} />;
      break;
    case 'wardrobe': {
      // Against a wall, so its doors face into the room across its thin side
      const alongX = d <= w;
      const turn = alongX ? (z > 0 ? 0 : Math.PI) : (x > 0 ? Math.PI / 2 : -Math.PI / 2);
      parts = <group rotation={[0, turn, 0]}><PlainWardrobe w={alongX ? w : d} h={h} d={alongX ? d : w} color={f.color} /></group>;
      break;
    }
    case 'sofa': {
      const long = w >= d;
      const blocks = (
        <>
          {box(w, 0.42, d, 0.21, f.color)}
          {long ? box(w, 0.5, 0.25, 0.6, f.color, 0, d / 2 - 0.12) : box(0.25, 0.5, d, 0.6, f.color, w / 2 - 0.12, 0)}
        </>
      );
      // The real velvet sofa (Khronos sample, see CREDITS.md) dyed this sofa's colour, its back where the block sofa's is: +z, or +x when it stands turned
      parts = (
        <group rotation={[0, long ? 0 : Math.PI / 2, 0]}>
          <RealModel name="sofa-velvet-champagne" fit={long ? [w, h, d] : [d, h, w]} rotationY={Math.PI} recolor={{ match: /fabric/i, color: f.color }}
            fallback={<group rotation={[0, long ? 0 : -Math.PI / 2, 0]}>{blocks}</group>} />
        </group>
      );
      break;
    }
    case 'table':
    case 'desk':
      parts = (
        <>
          {box(w, 0.05, d, h - 0.025, f.color)}
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.05, h - 0.05, 0.05, (h - 0.05) / 2, '#2b2b2d', sx * (w / 2 - 0.06), sz * (d / 2 - 0.06), `${sx}${sz}`)))}
        </>
      );
      break;
    case 'tv':
      parts = (
        <>
          {box(w, 0.45, d, 0.225, '#3a3a3c')}
          {box(w * 0.95, h - 0.5, 0.05, 0.45 + (h - 0.5) / 2, '#0d0e10')}
        </>
      );
      break;
    case 'rug':
      parts = (
        <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial color={f.color} roughness={1} />
        </mesh>
      );
      break;
    case 'plant':
      parts = (
        <RealModel name="plant-potted" fit={[w, h, d]} fallback={<>
          {box(w * 0.7, 0.4, d * 0.7, 0.2, '#8a5a3c')}
          <mesh position={[0, 0.4 + (h - 0.4) / 2, 0]} castShadow>
            <sphereGeometry args={[Math.max(w, d) * 0.6, 12, 10]} />
            <meshStandardMaterial color={f.color} roughness={0.9} />
          </mesh>
        </>} />
      );
      break;
    case 'lamp':
      parts = <PlainLamp w={w} h={h} color={f.color} />;
      break;
    case 'armchair':
      // The real velvet armchair (Khronos sample, see CREDITS.md) dyed this chair's colour, its back to +z like the block one
      parts = (
        <RealModel name="chair-velvet-peacock" fit={[w, h, d]} rotationY={Math.PI} recolor={{ match: /fabric|velvet/i, color: f.color }} fallback={<>
          {box(w, 0.4, d, 0.2, f.color)}
          {box(w, 0.5, 0.18, 0.6, f.color, 0, d / 2 - 0.09)}
          {box(0.14, 0.25, d, 0.52, f.color, -w / 2 + 0.07)}
          {box(0.14, 0.25, d, 0.52, f.color, w / 2 - 0.07)}
        </>} />
      );
      break;
    case 'shower':
      parts = (
        <>
          {box(w, 0.08, d, 0.04, '#e8eaea')}
          {/* Glass screen on the open sides, a tiled back */}
          <mesh position={[0, h / 2, -d / 2 + 0.01]}>
            <boxGeometry args={[w, h, 0.02]} />
            <meshStandardMaterial color={f.color} transparent opacity={0.35} roughness={0.05} />
          </mesh>
          <mesh position={[w / 2 - 0.01, h / 2, 0]}>
            <boxGeometry args={[0.02, h, d]} />
            <meshStandardMaterial color={f.color} transparent opacity={0.35} roughness={0.05} />
          </mesh>
          {box(w, h, 0.04, h / 2, '#dfe3e2', 0, d / 2 - 0.02)}
          {box(0.04, h, d, h / 2, '#dfe3e2', -w / 2 + 0.02)}
          {box(0.18, 0.04, 0.18, h - 0.2, '#b8bcbf', 0, d / 2 - 0.25)}
        </>
      );
      break;
    case 'bathtub':
      parts = (
        <>
          {box(w, h * 0.85, d, (h * 0.85) / 2, f.color)}
          {box(w - 0.14, 0.02, d - 0.14, h * 0.85 + 0.005, '#9fc3d1')}
          {box(0.05, 0.25, 0.05, h + 0.1, '#b8bcbf', -w / 2 + 0.12)}
        </>
      );
      break;
    case 'bookshelf':
      parts = (
        <>
          {box(w, h, 0.04, h / 2, f.color, 0, d / 2 - 0.02)}
          {box(0.04, h, d, h / 2, f.color, -w / 2 + 0.02)}
          {box(0.04, h, d, h / 2, f.color, w / 2 - 0.02)}
          {[0, 1, 2, 3, 4].map((k) => box(w, 0.03, d, 0.02 + k * (h / 4.4), f.color, 0, 0, `s${k}`))}
          {[0, 1, 2, 3].map((k) => box(w * 0.8, h / 4.4 - 0.08, d * 0.7, 0.04 + k * (h / 4.4) + (h / 4.4 - 0.08) / 2, ['#7b2f2f', '#2f5a7b', '#c49a3a', '#3e6b4a'][k], 0, 0, `b${k}`))}
        </>
      );
      break;
    case 'stove':
      parts = (
        <>
          {box(w, h, d, h / 2, f.color)}
          {box(w * 0.8, 0.4, 0.02, 0.4, '#1c1d20', 0, -d / 2 - 0.01)}
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.14, 0.02, 0.14, h + 0.01, '#2a2a2a', sx * w * 0.22, sz * d * 0.22, `h${sx}${sz}`)))}
        </>
      );
      break;
    case 'speaker':
      parts = (
        <>
          {box(w, h, d, h / 2, f.color)}
          <mesh position={[0, h * 0.62, -d / 2 - 0.005]}>
            <circleGeometry args={[w * 0.32, 20]} />
            <meshStandardMaterial color="#111" roughness={0.6} />
          </mesh>
        </>
      );
      break;
    case 'console':
      parts = (
        <>
          {box(w, 0.45, d, 0.225, '#3a3a3c')}
          {box(w * 0.95, h - 0.5, 0.05, 0.45 + (h - 0.5) / 2, '#0d0e10')}
          {box(0.3, 0.06, 0.2, 0.48, f.color, -w * 0.3, -d * 0.1)}
        </>
      );
      break;
    case 'dresser':
      parts = (
        <>
          {box(w, h, d, h / 2, f.color)}
          {[0, 1, 2, 3].map((k) => box(w * 0.9, 0.02, 0.02, 0.12 + k * (h / 4.2), '#3b2c22', 0, -d / 2 - 0.01, `d${k}`))}
        </>
      );
      break;
    case 'wall-art':
      parts = (
        <>
          {box(w, h, d, h / 2, '#5a3f2b')}
          {box(w - 0.12, h - 0.12, 0.025, h / 2, '#c9a35e', 0, d / 2 + 0.014)}
          {box(w - 0.22, h - 0.22, 0.025, h / 2, '#1e2936', 0, d / 2 + 0.03)}
          <mesh position={[0, h / 2, d / 2 + 0.05]}>
            <circleGeometry args={[Math.min(w, h) * 0.18, 20]} />
            <meshStandardMaterial color="#d2b36f" roughness={0.6} />
          </mesh>
        </>
      );
      break;
    case 'conference-table':
    case 'reception':
    case 'host-stand':
      parts = (
        <>
          {box(w, 0.05, d, h - 0.025, f.color)}
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.05, h - 0.05, 0.05, (h - 0.05) / 2, '#2b2b2d', sx * (w / 2 - 0.06), sz * (d / 2 - 0.06), `${sx}${sz}`)))}
        </>
      );
      break;
    case 'dining-table':
      parts = (
        <>
          {box(w, 0.1, d, h - 0.05, f.color)}
          {box(w * 0.16, h - 0.12, d * 0.16, (h - 0.12) / 2, '#3c3027')}
          {box(w * 0.88, 0.025, d * 0.82, h + 0.012, '#c9a86a')}
        </>
      );
      break;
    case 'chair':
    case 'dining-chair':
      parts = (
        <>
          {box(w * 0.9, 0.12, d * 0.88, 0.45, f.color)}
          {box(w * 0.88, h * 0.52, 0.12, 0.66, f.color, 0, -d * 0.4)}
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.06, 0.4, 0.06, 0.2, '#332a25', sx * w * 0.36, sz * d * 0.34, `${sx}${sz}`)))}
        </>
      );
      break;
    case 'clothing-rack':
      parts = (
        <>
          {box(w, 0.045, d, h - 0.08, f.color)}
          {[-1, 1].map((side) => box(0.055, h - 0.08, 0.055, (h - 0.08) / 2, '#302823', side * (w / 2 - 0.08), 0, `upright-${side}`))}
          {box(0.045, 0.06, d, h - 0.06, '#d7d1c6')}
          {[-0.38, -0.13, 0.13, 0.38].map((offset, index) => (
            <group key={offset} position={[offset * w, 0, 0]}>
              <mesh position={[0, h * 0.52, 0]} castShadow>
                <capsuleGeometry args={[0.14, 0.42, 3, 8]} />
                <meshStandardMaterial color={['#8b292c', '#315a60', '#d0b382', '#24252b'][index]} roughness={0.88} />
              </mesh>
              <mesh position={[0, h * 0.78, 0]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[0.095, 0.012, 6, 12, Math.PI]} />
                <meshStandardMaterial color="#c9a35e" metalness={0.65} roughness={0.3} />
              </mesh>
            </group>
          ))}
        </>
      );
      break;
    case 'mannequin':
      parts = (
        <>
          {box(0.08, 0.7, 0.08, 0.35, '#9c835e')}
          <mesh position={[0, h * 0.68, 0]} castShadow>
            <capsuleGeometry args={[w * 0.32, h * 0.28, 4, 10]} />
            <meshStandardMaterial color={f.color} roughness={0.8} />
          </mesh>
          <mesh position={[0, h * 0.9, 0]} castShadow>
            <sphereGeometry args={[w * 0.23, 16, 12]} />
            <meshStandardMaterial color={f.color} roughness={0.8} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * w * 0.38, h * 0.66, 0]} rotation={[0, 0, side * 0.1]} castShadow>
              <capsuleGeometry args={[w * 0.09, h * 0.27, 3, 8]} />
              <meshStandardMaterial color={f.color} roughness={0.8} />
            </mesh>
          ))}
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * w * 0.18, h * 0.28, 0]} castShadow>
              <capsuleGeometry args={[w * 0.11, h * 0.28, 3, 8]} />
              <meshStandardMaterial color={f.color} roughness={0.8} />
            </mesh>
          ))}
        </>
      );
      break;
    case 'display-shelf':
      parts = (
        <>
          {box(w, 0.08, d, 0.04, '#c9a35e')}
          {box(0.08, h, d, h / 2, f.color, -w / 2 + 0.04, 0)}
          {box(0.08, h, d, h / 2, f.color, w / 2 - 0.04, 0)}
          {[0.58, 1.13, 1.7].map((height) => (
            <group key={height}>
              {box(w, 0.055, d, height, '#c9a35e')}
              {[-1, 0, 1].map((side) => (
                <mesh key={side} position={[side * w * 0.28, height + 0.12, 0]} castShadow>
                  <boxGeometry args={[0.34, 0.2, 0.27]} />
                  <meshStandardMaterial color={['#8b292c', '#d7c8ad', '#315a60'][(side + 1)]} roughness={0.9} />
                </mesh>
              ))}
            </group>
          ))}
          {box(0.08, h, d, h / 2, f.color, 0, -d / 2 + 0.04)}
        </>
      );
      break;
    case 'checkout-counter':
      parts = (
        <>
          {box(w, h, d, h / 2, f.color)}
          {box(w + 0.08, 0.06, d + 0.08, h, '#c9a35e')}
          {box(w * 0.9, h * 0.48, 0.035, h * 0.43, '#514035', 0, d / 2 + 0.02)}
          {box(w * 0.38, h * 0.18, 0.12, h + 0.11, '#191b1d', 0, -d * 0.1)}
        </>
      );
      break;
    case 'computer':
      parts = (
        <>
          {box(w, 0.06, d, 0.03, f.color)}
          {box(w * 0.12, h * 0.22, 0.08, h * 0.2, '#252a30', 0, -d * 0.25)}
          {box(w * 0.72, h * 0.58, 0.08, h * 0.55, '#252a30', 0, -d * 0.25)}
          {box(w * 0.62, h * 0.43, 0.025, h * 0.56, '#6f9da1', 0, -d * 0.2)}
          {box(w * 0.5, 0.035, d * 0.32, h * 0.1, '#b8bdc0', 0, d * 0.2)}
        </>
      );
      break;
    case 'file-cabinet':
      parts = (
        <>
          {box(w, h, d, h / 2, f.color)}
          {[0.25, 0.5, 0.75].map((p) => (
            <group key={p}>
              {box(w * 0.78, 0.015, 0.018, h * p, '#4c5154', 0, d / 2 + 0.012)}
              {box(w * 0.22, 0.035, 0.04, h * p + 0.12, '#b5b4ad', 0, d / 2 + 0.025)}
            </group>
          ))}
        </>
      );
      break;
    case 'cabinet':
      parts = (
        <>
          {box(w, h, d, h / 2, f.color)}
          {[-1, 1].map((side) => box(w * 0.44, h * 0.86, 0.035, h / 2, '#b6a58f', side * w * 0.25, d / 2 + 0.02, `door-${side}`))}
          {[-1, 1].map((side) => box(0.035, 0.16, 0.035, h / 2, '#d2b36f', side * 0.12, d / 2 + 0.05, `handle-${side}`))}
        </>
      );
      break;
    case 'mirror':
      parts = (
        <>
          {box(w, h, d, h / 2, '#574536')}
          <mesh position={[w / 2 + 0.012, h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[d * 0.84, h * 0.82]} />
            <meshStandardMaterial color="#a8c1c6" metalness={0.55} roughness={0.18} />
          </mesh>
        </>
      );
      break;
    case 'sink':
      parts = (
        <>
          {box(w * 0.78, h * 0.75, d * 0.78, h * 0.38, '#80684e')}
          {box(w, 0.12, d, h * 0.8, '#e0ddd4')}
          <mesh position={[0, h * 0.89, 0]} castShadow>
            <cylinderGeometry args={[w * 0.32, w * 0.4, 0.1, 24]} />
            <meshStandardMaterial color="#bfc7c7" metalness={0.45} roughness={0.25} />
          </mesh>
          <mesh position={[0, h * 0.98, -d * 0.25]} castShadow>
            <torusGeometry args={[0.12, 0.025, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#aeb8ba" metalness={0.7} roughness={0.22} />
          </mesh>
        </>
      );
      break;
    case 'toilet':
      parts = (
        <>
          {box(w * 0.72, h * 0.42, d * 0.34, h * 0.78, '#e5e5e1', 0, d * 0.3)}
          <mesh position={[0, h * 0.35, -d * 0.12]} castShadow>
            <cylinderGeometry args={[w * 0.48, w * 0.4, h * 0.35, 24]} />
            <meshStandardMaterial color="#e5e5e1" roughness={0.28} />
          </mesh>
          <mesh position={[0, h * 0.54, -d * 0.12]} castShadow>
            <torusGeometry args={[w * 0.38, 0.045, 10, 24]} />
            <meshStandardMaterial color="#d0d0cc" roughness={0.3} />
          </mesh>
        </>
      );
      break;
    case 'fridge':
      // A real retro fridge (Sketchfab, CC-BY 4.0), fitted to the unit's space; the plain unit shows while it loads
      parts = <RealModel name="fridge-retro" fit={[w, h, d]} fallback={box(w, h, d, h / 2, f.color)} />;
      break;
    default:
      // Wardrobe, counter: a solid unit
      parts = box(w, h, d, h / 2, f.color);
  }
  return <group position={[x, f.elevation ?? 0, z]} rotation={[0, f.rotation ?? 0, 0]}>{parts}</group>;
}

/** The same piece under the name the venues use. */
export const InteriorFurniturePiece = Piece;
