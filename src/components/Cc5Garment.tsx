import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Skeleton, type MeshStandardMaterial, type Object3D, type SkinnedMesh } from 'three';
import { assetUrl } from '../lib/assetManifest';

const findSkinnedMesh = (root: Object3D): SkinnedMesh | null => {
  let found: SkinnedMesh | null = null;
  root.traverse((o) => {
    if (!found && (o as SkinnedMesh).isSkinnedMesh) found = o as SkinnedMesh;
  });
  return found;
};

const findSkinnedMeshes = (root: Object3D): SkinnedMesh[] => {
  const found: SkinnedMesh[] = [];
  root.traverse((o) => {
    if ((o as SkinnedMesh).isSkinnedMesh) found.push(o as SkinnedMesh);
  });
  return found;
};

/**
 * A separate CC5 garment (scripts/cc5/build-garment.mjs): one or more skinned
 * meshes (e.g. a hairstyle's base mesh plus a separate accessory piece), worn by
 * rebinding each one onto the player's own avatar skeleton bone-for-bone by name --
 * not by attaching to one bone (lib/fashion.ts's Rocketbox hairstyle hack), since a
 * garment exported from the same CC_Base rig as the body is already correctly
 * weight-painted to it. Unusable (and silently skipped) on a body whose skeleton
 * doesn't have every bone this garment references, e.g. a different CC5 character.
 */
export function Cc5Garment({ url, avatarScene, color }: { url: string; avatarScene: Object3D; color?: string | null }) {
  const { scene } = useGLTF(assetUrl(url), false, true);
  const sourceMeshes = useMemo(() => findSkinnedMeshes(scene), [scene]);

  useEffect(() => {
    if (!sourceMeshes.length) return;
    const avatarMesh = findSkinnedMesh(avatarScene);
    if (!avatarMesh) return;
    const byName = new Map(avatarMesh.skeleton.bones.map((b) => [b.name, b]));
    const added: SkinnedMesh[] = [];
    for (const sourceMesh of sourceMeshes) {
      const missing = sourceMesh.skeleton.bones.filter((b) => !byName.has(b.name)).map((b) => b.name);
      if (missing.length) {
        console.warn(`[AYE assets] garment ${url} doesn't fit this body; missing bones: ${missing.join(', ')}`);
        continue;
      }
      const remapped = sourceMesh.skeleton.bones.map((b) => byName.get(b.name)!);
      // A clone so unmounting only removes this instance, and so sharing the cached
      // GLTF scene across several wearers never lets one's bind affect another's
      const mesh = sourceMesh.clone() as SkinnedMesh;
      mesh.material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).clone();
      mesh.bind(new Skeleton(remapped, sourceMesh.skeleton.boneInverses), sourceMesh.matrixWorld);
      mesh.frustumCulled = false; // skinned bounds don't follow the animation
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (color) (mesh.material as MeshStandardMaterial).color?.set(color);
      avatarScene.add(mesh);
      added.push(mesh);
    }
    return () => {
      for (const mesh of added) {
        avatarScene.remove(mesh);
        mesh.geometry.dispose();
      }
    };
  }, [sourceMeshes, avatarScene, url, color]);

  return null;
}
