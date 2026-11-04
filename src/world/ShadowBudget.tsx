import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Sphere, type Mesh } from 'three';
import { useQuality } from './quality';

/** Things smaller than this (bounding radius, metres) stop casting shadows on the low tier. */
export const SMALL_CASTER = 0.6;
const sphere = new Sphere();

/**
 * On the low tier, small things (bins, bollards, cups, plates, bits of a cart)
 * stop casting shadows: on a 1024 shadow map their shadows are a few pixels,
 * but each is another draw call in the shadow pass. People, cars and
 * buildings keep theirs. Checked every couple of seconds as places load; the
 * high tier gets every shadow back.
 */
export function ShadowBudget() {
  const scene = useThree((s) => s.scene);
  const { quality } = useQuality();
  useEffect(() => {
    const apply = () => {
      scene.traverse((o) => {
        const mesh = o as Mesh;
        if (!mesh.isMesh || (mesh as { isSkinnedMesh?: boolean }).isSkinnedMesh) return;
        if (quality === 'high') {
          if (mesh.userData.ayeShadowTrimmed) { mesh.castShadow = true; delete mesh.userData.ayeShadowTrimmed; }
          return;
        }
        if (!mesh.castShadow || mesh.userData.ayeShadowTrimmed) return;
        if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
        sphere.copy(mesh.geometry.boundingSphere!).applyMatrix4(mesh.matrixWorld);
        // Instanced props stand for many things at once: judge them by one instance
        if (sphere.radius < SMALL_CASTER && !(mesh as { isInstancedMesh?: boolean }).isInstancedMesh) {
          mesh.castShadow = false;
          mesh.userData.ayeShadowTrimmed = true;
        }
      });
    };
    apply();
    const id = window.setInterval(apply, 2000);
    return () => window.clearInterval(id);
  }, [scene, quality]);
  return null;
}
