import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Mesh, Vector3 } from 'three';
import type { Vehicle } from '../lib/world';
import { assetUrl, type VehicleFile } from '../lib/assetManifest';

/**
 * A real vehicle model listed in public/assets/manifest.json, turned by
 * `rotateY` so its front faces +Z, with its wheels put on the ground; it is scaled to `file.length` metres
 * and centred on the parking spot, so collision boxes still line up.
 * meshopt-compressed GLBs are supported (see docs/ASSET_CHECKLIST.md).
 */
export function VehicleModel({ vehicle, file }: { vehicle: Vehicle; file: VehicleFile }) {
  const { scene } = useGLTF(assetUrl(file.url), false, true);

  const { object, offset } = useMemo(() => {
    const object = scene.clone(true);
    object.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    // Turn first so the front faces +Z, then measure the turned model
    object.rotation.y = (file.rotateY * Math.PI) / 180;
    object.updateMatrixWorld(true);
    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3());
    const scale = size.z > 0 ? file.length / size.z : 1;
    object.scale.setScalar(scale);
    const centre = box.getCenter(new Vector3());
    // Put the wheels on y = 0 and the footprint centre on the origin
    const offset = new Vector3(-centre.x * scale, -box.min.y * scale, -centre.z * scale);
    return { object, offset };
  }, [scene, file.length, file.rotateY]);

  return (
    <group position={vehicle.position} rotation={[0, vehicle.heading, 0]}>
      <primitive object={object} position={offset} />
    </group>
  );
}
