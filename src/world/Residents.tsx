import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { Box3, CanvasTexture, Material, SRGBColorSpace, type Group, type Mesh } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { assetUrl } from '../lib/assetManifest';
import { lookById } from '../lib/looks';
import { residentsIn, type Resident } from '../lib/people';
import { groundHeightAt } from '../lib/world';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useDistrict } from './DistrictContext';

/** Name tag above a resident: their name and that they are a computer-controlled resident. */
function nameTag(name: string) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(21,24,28,0.78)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 144, 36);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f1ede6';
  ctx.font = "700 56px Manrope, 'DM Sans', sans-serif";
  ctx.fillText(name, 256, 74);
  ctx.fillStyle = '#a4a7ad';
  ctx.font = "500 34px 'DM Sans', sans-serif";
  ctx.fillText('Resident · computer-controlled', 256, 124);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function ResidentFigure({ resident }: { resident: Resident }) {
  const look = lookById(resident.lookId);
  const { scene, animations } = useGLTF(assetUrl(look.url), false, true);
  const group = useRef<Group>(null);
  // Own copy of the person: the player may be wearing the same look, with its own clothes and shape
  const figure = useMemo(() => {
    const copy = cloneSkinned(scene);
    // The shared original may already be scaled and placed for the player; measure the copy as authored
    copy.position.set(0, 0, 0);
    copy.rotation.set(0, 0, 0);
    copy.scale.set(1, 1, 1);
    copy.updateMatrixWorld(true);
    copy.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      const fresh = (m: Material) => {
        const c = m.clone();
        // Original clothes: drop any restyling shader the shared material carries
        c.onBeforeCompile = Material.prototype.onBeforeCompile;
        c.customProgramCacheKey = Material.prototype.customProgramCacheKey;
        delete (c.userData as { ayeStyle?: unknown }).ayeStyle;
        return c;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(fresh) : fresh(mesh.material);
    });
    return copy;
  }, [scene]);
  const scale = useMemo(() => {
    const box = new Box3().setFromObject(figure);
    const h = box.max.y - box.min.y;
    return h > 0 ? look.height / h : 1;
  }, [figure, look.height]);
  const { actions, names } = useAnimations(animations, group);
  useEffect(() => {
    const idle = names.find((n) => /idle|stand/i.test(n)) ?? names[0];
    const action = idle ? actions[idle] : null;
    // Start each resident at a different point of the loop so they don't move in sync
    action?.reset().startAt(-((resident.id.length * 0.37) % 2)).play();
    return () => { action?.stop(); };
  }, [actions, names, resident.id]);
  const tag = useMemo(() => nameTag(resident.name), [resident.name]);
  const [x, , z] = resident.position;

  return (
    <group position={[x, groundHeightAt(x, z), z]}>
      <group ref={group} rotation={[0, resident.facing, 0]}>
        <primitive object={figure} scale={scale} />
      </group>
      <sprite position={[0, look.height + 0.35, 0]} scale={[0.9, 0.28, 1]}>
        <spriteMaterial map={tag} depthWrite={false} transparent />
      </sprite>
    </group>
  );
}

/** The residents of the current district, each standing at their usual spot. */
export function Residents() {
  const district = useDistrict();
  const people = residentsIn(district.id);
  return (
    <>
      {people.map((r) => (
        <ErrorBoundary key={r.id} fallback={null}>
          <Suspense fallback={null}>
            <ResidentFigure resident={r} />
          </Suspense>
        </ErrorBoundary>
      ))}
    </>
  );
}
