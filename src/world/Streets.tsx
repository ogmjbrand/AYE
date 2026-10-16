import { useMemo } from 'react';
import { Vector3 } from 'three';
import { PAVEMENT_HEIGHT, STREET_LENGTH } from '../lib/world';
import { useLayout } from './DistrictContext';
import { Instances, type Placement } from './Instances';
import { materials } from './materials';

const HALF = STREET_LENGTH / 2;
/** How far the (visual-only) boulevard extends, matching the skyline and ground. */
const FAR = 150;
const KERB_LEN = 2;

/** A flat textured strip lying on the ground, with texture tiling in metres. */
function Strip({
  x0, x1, z0, z1, y, material, tile: tileDefault, alongX = false,
}: {
  x0: number; x1: number; z0: number; z1: number; y: number;
  material: import('three').MeshStandardMaterial; tile: number; alongX?: boolean;
}) {
  const w = x1 - x0, d = z1 - z0;
  // Real textures from the asset manifest declare their own size in metres
  const tile = (material.userData.tileMeters as number | undefined) ?? tileDefault;
  // Clone the material per strip so each gets its own texture repeat
  const mat = useMemo(() => {
    const m = material.clone();
    for (const key of ['map', 'roughnessMap', 'metalnessMap', 'normalMap'] as const) {
      const t = material[key];
      if (t) {
        const c = t.clone();
        c.repeat.set((alongX ? d : w) / tile, (alongX ? w : d) / tile);
        c.needsUpdate = true;
        m[key] = c;
      }
    }
    return m;
  }, [material, w, d, tile, alongX]);
  return (
    <mesh
      position={[(x0 + x1) / 2, y, (z0 + z1) / 2]}
      rotation={[-Math.PI / 2, 0, alongX ? Math.PI / 2 : 0]}
      material={mat}
      receiveShadow
    >
      <planeGeometry args={alongX ? [d, w] : [w, d]} />
    </mesh>
  );
}

/** Raised paver slab with its top at PAVEMENT_HEIGHT. */
function Pavement(props: { x0: number; x1: number; z0: number; z1: number }) {
  return <Strip {...props} y={PAVEMENT_HEIGHT} material={materials().pavement} tile={2} />;
}

function useKerbsAndMarkings(ROAD_HALF_WIDTH: number, CROSS_STREET: { minZ: number; maxZ: number }) {
  return useMemo(() => {
    const kerbs: Placement[] = [];
    const kerbX = (x: number, z0: number, z1: number) => {
      for (let z = z0 + KERB_LEN / 2; z < z1; z += KERB_LEN) {
        kerbs.push({ position: new Vector3(x, PAVEMENT_HEIGHT / 2 + 0.02, z), scale: new Vector3(0.22, PAVEMENT_HEIGHT + 0.04, KERB_LEN) });
      }
    };
    const kerbZ = (z: number, x0: number, x1: number) => {
      for (let x = x0 + KERB_LEN / 2; x < x1; x += KERB_LEN) {
        kerbs.push({ position: new Vector3(x, PAVEMENT_HEIGHT / 2 + 0.02, z), scale: new Vector3(0.22, PAVEMENT_HEIGHT + 0.04, KERB_LEN), rotationY: Math.PI / 2 });
      }
    };
    for (const side of [-1, 1]) {
      kerbX(side * ROAD_HALF_WIDTH, -HALF, CROSS_STREET.minZ);
      kerbX(side * ROAD_HALF_WIDTH, CROSS_STREET.maxZ, HALF);
      kerbZ(CROSS_STREET.minZ, side > 0 ? ROAD_HALF_WIDTH : -HALF, side > 0 ? HALF : -ROAD_HALF_WIDTH);
      kerbZ(CROSS_STREET.maxZ, side > 0 ? ROAD_HALF_WIDTH : -HALF, side > 0 ? HALF : -ROAD_HALF_WIDTH);
    }

    const dashes: Placement[] = [];
    const inJunction = (z: number) => z > CROSS_STREET.minZ - 4 && z < CROSS_STREET.maxZ + 4;
    for (let z = -HALF; z < HALF; z += 6) {
      if (!inJunction(z)) dashes.push({ position: new Vector3(0, 0.012, z), scale: new Vector3(0.14, 1, 3) });
    }
    for (let x = -HALF; x < HALF; x += 6) {
      if (Math.abs(x) > ROAD_HALF_WIDTH + 4) {
        dashes.push({ position: new Vector3(x, 0.012, (CROSS_STREET.minZ + CROSS_STREET.maxZ) / 2), scale: new Vector3(3, 1, 0.14) });
      }
    }

    const edges: Placement[] = [];
    for (const x of [-ROAD_HALF_WIDTH + 0.35, ROAD_HALF_WIDTH - 0.35]) {
      for (const [z0, z1] of [[-HALF, CROSS_STREET.minZ - 4], [CROSS_STREET.maxZ + 4, HALF]]) {
        edges.push({ position: new Vector3(x, 0.012, (z0 + z1) / 2), scale: new Vector3(0.12, 1, z1 - z0) });
      }
    }

    // Zebra crossings across the boulevard either side of the junction
    const zebra: Placement[] = [];
    for (const zc of [CROSS_STREET.maxZ + 2, CROSS_STREET.minZ - 2]) {
      for (let x = -ROAD_HALF_WIDTH + 0.5; x < ROAD_HALF_WIDTH; x += 0.9) {
        zebra.push({ position: new Vector3(x, 0.013, zc), scale: new Vector3(0.5, 1, 2.6) });
      }
      zebra.push({ position: new Vector3(0, 0.013, zc + (zc > 0 ? 1.8 : 1.8) * Math.sign(zc - (CROSS_STREET.minZ + CROSS_STREET.maxZ) / 2)), scale: new Vector3(ROAD_HALF_WIDTH * 2 - 0.4, 1, 0.3) });
    }
    return { kerbs, dashes, edges, zebra };
  }, [ROAD_HALF_WIDTH, CROSS_STREET]);
}

export function Streets() {
  const m = materials();
  const { roadHalfWidth: ROAD_HALF_WIDTH, pavementWidth: PAVEMENT_WIDTH, crossStreet: CROSS_STREET } = useLayout();
  const PAVE_OUT = ROAD_HALF_WIDTH + PAVEMENT_WIDTH;
  const k = useKerbsAndMarkings(ROAD_HALF_WIDTH, CROSS_STREET);
  return (
    <group>
      {/* Laterite verges and open ground */}
      <Strip x0={-150} x1={150} z0={-150} z1={150} y={-0.02} material={m.ground} tile={8} />

      {/* Boulevard and cross street */}
      <Strip x0={-ROAD_HALF_WIDTH} x1={ROAD_HALF_WIDTH} z0={-HALF} z1={HALF} y={0} material={m.road} tile={ROAD_HALF_WIDTH * 2} />
      <Strip x0={-HALF} x1={-ROAD_HALF_WIDTH} z0={CROSS_STREET.minZ} z1={CROSS_STREET.maxZ} y={0.001} material={m.road} tile={8} alongX />
      <Strip x0={ROAD_HALF_WIDTH} x1={HALF} z0={CROSS_STREET.minZ} z1={CROSS_STREET.maxZ} y={0.001} material={m.road} tile={8} alongX />

      {/* The boulevard carries on past the walkable block towards the skyline (flat, no kerbs: only seen from afar) */}
      {[-1, 1].map((dir) => {
        const [za, zb] = dir > 0 ? [HALF, FAR] : [-FAR, -HALF];
        return (
          <group key={dir}>
            <Strip x0={-ROAD_HALF_WIDTH} x1={ROAD_HALF_WIDTH} z0={za} z1={zb} y={0} material={m.road} tile={ROAD_HALF_WIDTH * 2} />
            <Strip x0={-PAVE_OUT} x1={-ROAD_HALF_WIDTH} z0={za} z1={zb} y={0.002} material={m.pavement} tile={2} />
            <Strip x0={ROAD_HALF_WIDTH} x1={PAVE_OUT} z0={za} z1={zb} y={0.002} material={m.pavement} tile={2} />
          </group>
        );
      })}

      {/* Pavements */}
      {[-1, 1].map((side) => {
        const [xa, xb] = side > 0 ? [ROAD_HALF_WIDTH, PAVE_OUT] : [-PAVE_OUT, -ROAD_HALF_WIDTH];
        const [xc, xd] = side > 0 ? [PAVE_OUT, HALF] : [-HALF, -PAVE_OUT];
        return (
          <group key={side}>
            <Pavement x0={xa} x1={xb} z0={-HALF} z1={CROSS_STREET.minZ} />
            <Pavement x0={xa} x1={xb} z0={CROSS_STREET.maxZ} z1={HALF} />
            <Pavement x0={xc} x1={xd} z0={CROSS_STREET.minZ - PAVEMENT_WIDTH} z1={CROSS_STREET.minZ} />
            <Pavement x0={xc} x1={xd} z0={CROSS_STREET.maxZ} z1={CROSS_STREET.maxZ + PAVEMENT_WIDTH} />
          </group>
        );
      })}

      <Instances items={k.kerbs} material={m.kerb} geometry={<boxGeometry args={[1, 1, 1]} />} castShadow={false} />
      <Instances items={k.dashes} material={m.marking} geometry={<boxGeometry args={[1, 0.01, 1]} />} castShadow={false} />
      <Instances items={k.edges} material={m.yellowMarking} geometry={<boxGeometry args={[1, 0.01, 1]} />} castShadow={false} />
      <Instances items={k.zebra} material={m.marking} geometry={<boxGeometry args={[1, 0.01, 1]} />} castShadow={false} />
    </group>
  );
}
