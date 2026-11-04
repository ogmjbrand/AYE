import type { Mesh, SkinnedMesh } from 'three';

/**
 * Let the renderer skip a person who is off screen (or outside the sun's
 * shadow box). A skinned mesh's bounds are taken in its bind pose, so they're
 * widened by half again to cover arms and legs in any clip; the root still
 * carries them wherever the person walks. Before this, every person in the
 * district was drawn (and drawn again for shadows) every frame.
 */
export function cullAsPerson(mesh: Mesh): void {
  const skinned = mesh as SkinnedMesh;
  if (skinned.isSkinnedMesh) {
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
    const sphere = mesh.geometry.boundingSphere!.clone();
    sphere.radius *= 1.6;
    skinned.boundingSphere = sphere;
  }
  mesh.frustumCulled = true;
}
