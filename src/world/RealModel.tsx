import { Suspense, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Vector3, type Mesh, type MeshPhysicalMaterial } from 'three';
import { assetUrl } from '../lib/assetManifest';
import { ErrorBoundary } from '../components/ErrorBoundary';

/** Photoreal pieces built by scripts/khronos/build-furniture.mjs (CC0 / CC-BY 4.0, see CREDITS.md). */
type FurnitureName = 'sofa-velvet-champagne' | 'sofa-velvet-blush' | 'chair-velvet-peacock' | 'chair-velvet-mango' | 'vase-flowers' | 'plant-potted';
/** Props built by scripts/sketchfab/build-props.mjs (CC-BY 4.0, see CREDITS.md). */
export type PropName = 'sub-sandwich' | 'bento-box' | 'vending-machine' | 'motorhome';
export type RealModelName = FurnitureName | PropName;
const PROPS: ReadonlySet<string> = new Set<PropName>(['sub-sandwich', 'bento-box', 'vending-machine', 'motorhome']);
const modelPath = (name: RealModelName) => `models/${PROPS.has(name) ? 'props' : 'furniture'}/${name}.glb`;

interface Props {
  name: RealModelName;
  /** Fit inside this box (width X, height, depth Z), keeping proportions, standing on y = 0. */
  fit: readonly [number, number, number];
  /** Turn about the vertical axis (radians) after fitting; the models face +z. */
  rotationY?: number;
  /** Re-dye materials whose name matches (the fabric), keeping their weave, sheen and folds. */
  recolor?: { match: RegExp; color: string };
}

function Model({ name, fit, rotationY = 0, recolor }: Props) {
  const { scene } = useGLTF(assetUrl(modelPath(name)), false, true);
  // By value, so a new array with the same size doesn't re-clone the model
  const [fx, fy, fz] = fit;
  const dyeMatch = recolor ? recolor.match.source : null;
  const dyeFlags = recolor ? recolor.match.flags : '';
  const dye = recolor?.color ?? null;
  const { object, scale, offset } = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      if (dyeMatch !== null && dye && !Array.isArray(m.material) && new RegExp(dyeMatch, dyeFlags).test(m.material.name)) {
        const mat = (m.material as MeshPhysicalMaterial).clone();
        // The dye replaces the printed colour; the normal map and sheen keep it reading as velvet
        mat.map = null;
        mat.color.set(dye);
        if (mat.sheenColor) mat.sheenColor.set(dye).offsetHSL(0, -0.1, 0.15);
        m.material = mat;
      }
    });
    const box = new Box3().setFromObject(copy);
    const size = box.getSize(new Vector3());
    // Turned a quarter, width and depth swap
    const quarter = Math.abs(Math.sin(rotationY)) > 0.7;
    const [fw, fh, fd] = quarter ? [fz, fy, fx] : [fx, fy, fz];
    const s = Math.min(fw / size.x, fh / size.y, fd / size.z);
    const c = box.getCenter(new Vector3());
    return { object: copy, scale: s, offset: [-c.x * s, -box.min.y * s, -c.z * s] as [number, number, number] };
  }, [scene, fx, fy, fz, rotationY, dyeMatch, dyeFlags, dye]);
  return (
    <group rotation={[0, rotationY, 0]}>
      <primitive object={object} scale={scale} position={offset} />
    </group>
  );
}

/**
 * A real model fitted to a footprint; `fallback` (the built-in shape) shows while it loads or if it can't.
 * With `suspend`, loading suspends to the nearest Suspense above instead (so a snapshot waits for it).
 */
export function RealModel({ fallback = null, suspend = false, ...props }: Props & { fallback?: ReactNode; suspend?: boolean }) {
  return (
    <ErrorBoundary fallback={fallback}>
      {suspend ? <Model {...props} /> : (
        <Suspense fallback={fallback}>
          <Model {...props} />
        </Suspense>
      )}
    </ErrorBoundary>
  );
}
