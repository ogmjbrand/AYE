import { useMemo } from 'react';
import { Euler, MeshStandardMaterial, Vector3 } from 'three';
import { useDistrict } from './DistrictContext';
import { Instances, type Placement } from './Instances';
import { seeded } from '../lib/world';
import { parkPathSurface } from './materials';

// Dry-season colours: a sun-faded lawn, laterite paths, olive shade trees (muted, never the brand colours)
const LAWN = '#7f7c55';
const PATH = '#b49a78';
const CANOPY = '#5d6b40';
const TRUNK = '#6e5b45';
const WOOD = '#7a5a3c';

/**
 * The district's park: lawn, footpaths, shade trees and benches. Trees and
 * benches are solid (lib/world.ts adds them to the obstacles); the rest is flat.
 */
export function Park() {
  const park = useDistrict().layout.park;
  const mats = useMemo(() => ({
    canopy: new MeshStandardMaterial({ color: CANOPY, roughness: 0.9, flatShading: true }),
    trunk: new MeshStandardMaterial({ color: TRUNK, roughness: 0.95 }),
    wood: new MeshStandardMaterial({ color: WOOD, roughness: 0.8 }),
  }), []);
  // Footpaths in real paving stones when the pavement texture is listed, tiled to each path's size
  const pathMats = useMemo(() => {
    const base = parkPathSurface();
    if (!base || !park) return [];
    const tile = base.userData.tileMeters as number;
    return park.paths.map((p) => {
      const m = base.clone();
      for (const key of ['map', 'normalMap', 'roughnessMap', 'aoMap'] as const) {
        const t = base[key];
        if (!t) continue;
        const c = t.clone();
        c.repeat.set((p.x1 - p.x0) / tile, (p.z1 - p.z0) / tile);
        c.needsUpdate = true;
        m[key] = c;
      }
      return m;
    });
  }, [park]);
  const parts = useMemo(() => {
    if (!park) return null;
    const rand = seeded(57);
    const trunks: Placement[] = [];
    const canopies: Placement[] = [];
    for (const [x, z] of park.trees) {
      const h = 2.6 + rand() * 1.2;
      trunks.push({ position: new Vector3(x, h / 2, z), scale: new Vector3(1, h, 1) });
      // Two overlapping, flattened crowns per tree so they don't all look identical
      for (let i = 0; i < 2; i++) {
        const r = 1.5 + rand() * 0.7;
        canopies.push({
          position: new Vector3(x + (rand() - 0.5) * 0.8, h + 0.3 + i * 0.6, z + (rand() - 0.5) * 0.8),
          scale: new Vector3(r, r * 0.62, r),
          rotation: new Euler(0, rand() * Math.PI, 0),
        });
      }
    }
    const seats: Placement[] = [];
    const backs: Placement[] = [];
    for (const b of park.benches) {
      const fx = Math.sin(b.facing), fz = Math.cos(b.facing);
      seats.push({ position: new Vector3(b.x, 0.45, b.z), scale: new Vector3(1.6, 0.07, 0.42), rotationY: b.facing });
      backs.push({ position: new Vector3(b.x - fx * 0.22, 0.75, b.z - fz * 0.22), scale: new Vector3(1.6, 0.4, 0.06), rotationY: b.facing });
      // Two end supports
      for (const side of [-0.7, 0.7]) {
        const sx = Math.cos(b.facing) * side, sz = -Math.sin(b.facing) * side;
        seats.push({ position: new Vector3(b.x + sx, 0.22, b.z + sz), scale: new Vector3(0.08, 0.44, 0.42), rotationY: b.facing });
      }
    }
    return { trunks, canopies, seats, backs };
  }, [park]);
  if (!park || !parts) return null;
  const { area } = park;
  return (
    <group>
      <mesh position={[(area.minX + area.maxX) / 2, 0.004, (area.minZ + area.maxZ) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[area.maxX - area.minX, area.maxZ - area.minZ]} />
        <meshStandardMaterial color={LAWN} roughness={1} />
      </mesh>
      {park.paths.map((p, i) => (
        <mesh key={i} position={[(p.x0 + p.x1) / 2, 0.008, (p.z0 + p.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={pathMats[i] ?? undefined}>
          <planeGeometry args={[p.x1 - p.x0, p.z1 - p.z0]} />
          {!pathMats[i] && <meshStandardMaterial color={PATH} roughness={0.95} />}
        </mesh>
      ))}
      <Instances items={parts.trunks} material={mats.trunk} geometry={<cylinderGeometry args={[0.14, 0.2, 1, 7]} />} />
      <Instances items={parts.canopies} material={mats.canopy} geometry={<icosahedronGeometry args={[1, 1]} />} />
      <Instances items={parts.seats} material={mats.wood} geometry={<boxGeometry args={[1, 1, 1]} />} />
      <Instances items={parts.backs} material={mats.wood} geometry={<boxGeometry args={[1, 1, 1]} />} />
    </group>
  );
}
