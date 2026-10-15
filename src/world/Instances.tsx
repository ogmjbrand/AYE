import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Matrix4, Quaternion, Vector3, type Color, type Euler, type InstancedMesh, type Material } from 'three';

export interface Placement {
  position: Vector3;
  scale: Vector3;
  rotationY?: number;
  /** Full rotation; overrides rotationY. */
  rotation?: Euler;
  color?: Color;
}

/** One InstancedMesh for many copies of the same part. */
export function Instances({
  items, geometry, material, castShadow = true, visible = true,
}: { items: Placement[]; geometry: ReactNode; material: Material; castShadow?: boolean; visible?: boolean }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new Matrix4(), q = new Quaternion(), up = new Vector3(0, 1, 0);
    items.forEach((it, i) => {
      if (it.rotation) q.setFromEuler(it.rotation);
      else q.setFromAxisAngle(up, it.rotationY ?? 0);
      m.compose(it.position, q, it.scale);
      mesh.setMatrixAt(i, m);
      if (it.color) mesh.setColorAt(i, it.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, material, items.length]} castShadow={castShadow} receiveShadow visible={visible}>
      {geometry}
    </instancedMesh>
  );
}

