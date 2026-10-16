import { Matrix4, type Bone, type Object3D, type Skeleton, type SkinnedMesh } from 'three';
import { girthFactors, type BodyShape } from '../lib/bodyShape';

/**
 * Applies a body shape to a skinned character. Each listed bone's skinning
 * matrix gets an extra scale across its width and depth (its own Y and Z),
 * applied only while the skeleton uploads its matrices. The bones themselves
 * aren't scaled, so child bones, limb lengths and animations are unaffected,
 * and vertices shared between two bones blend smoothly at the joints.
 */

interface Entry { bone: Bone; scale: Matrix4; saved: Matrix4 }

const shaped = new WeakMap<Skeleton, Entry[]>();

/** Biped name without the "Bip01" prefix, whatever separator the loader used ("Bip01_L_Thigh" → "L Thigh"). */
const bipedName = (name: string) => name.replace(/[_\s]+/g, ' ').replace(/^Bip01 /, '');

function wrap(skeleton: Skeleton) {
  if (shaped.has(skeleton)) return;
  shaped.set(skeleton, []);
  const update = skeleton.update.bind(skeleton);
  skeleton.update = () => {
    const entries = shaped.get(skeleton)!;
    for (const e of entries) {
      e.saved.copy(e.bone.matrixWorld);
      e.bone.matrixWorld.multiply(e.scale);
    }
    update();
    for (const e of entries) e.bone.matrixWorld.copy(e.saved);
  };
}

/** Sets (or clears, for the average shape) the shape of every skeleton in a character's scene. */
export function applyBodyShape(scene: Object3D, shape: BodyShape) {
  const factors = girthFactors(shape);
  scene.traverse((o) => {
    const mesh = o as SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    wrap(mesh.skeleton);
    const entries: Entry[] = [];
    for (const bone of mesh.skeleton.bones) {
      const f = factors.get(bipedName(bone.name));
      if (f) entries.push({ bone, scale: new Matrix4().makeScale(1, f[0], f[1]), saved: new Matrix4() });
    }
    shaped.set(mesh.skeleton, entries);
  });
}
