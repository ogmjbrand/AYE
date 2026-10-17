import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Plane, Raycaster, Vector2, Vector3, type Mesh, type MeshBasicMaterial } from 'three';
import { getMoveTarget, isMovementBlocked, setMoveTarget, type PlayerHandle } from '../hooks/usePlayerController';
import { isClick, makeTarget } from '../lib/clickToMove';
import { groundHeightAt, resolveCollisions } from '../lib/world';

/**
 * Click or tap the ground to walk there. A press that turns into a drag
 * orbits the camera as before; a second finger (pinch zoom) never moves you.
 * A ring marks the spot until you arrive.
 */
export function ClickToMove({ player }: { player: PlayerHandle }) {
  const { camera, gl } = useThree();
  const ring = useRef<Mesh>(null);

  useEffect(() => {
    const el = gl.domElement;
    const down = new Map<number, { x: number; y: number; t: number }>();
    let multiTouch = false;
    const raycaster = new Raycaster();
    const ground = new Plane(new Vector3(0, 1, 0), -0.1);
    const hit = new Vector3();

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      down.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
      if (down.size > 1) multiTouch = true;
    };
    const onUp = (e: PointerEvent) => {
      const start = down.get(e.pointerId);
      down.delete(e.pointerId);
      const wasMulti = multiTouch;
      if (down.size === 0) multiTouch = false;
      if (!start || wasMulti || isMovementBlocked()) return;
      if (!isClick(e.clientX - start.x, e.clientY - start.y, performance.now() - start.t)) return;
      const rect = el.getBoundingClientRect();
      const ndc = new Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(ground, hit)) return;
      // Not too far, and not inside a building: the nearest free spot
      const far = Math.hypot(hit.x - player.position.x, hit.z - player.position.z);
      if (far > 60) return;
      const spot = resolveCollisions(hit.x, hit.z);
      setMoveTarget(makeTarget(player.position.x, player.position.z, spot.x, spot.z, e.shiftKey));
    };
    const onCancel = (e: PointerEvent) => { down.delete(e.pointerId); if (down.size === 0) multiTouch = false; };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
    };
  }, [camera, gl, player]);

  useFrame(({ clock }) => {
    const m = ring.current;
    if (!m) return;
    const target = getMoveTarget();
    m.visible = target !== null;
    if (!target) return;
    m.position.set(target.x, groundHeightAt(target.x, target.z) + 0.04, target.z);
    const pulse = 1 + 0.12 * Math.sin(clock.elapsedTime * 6);
    m.scale.setScalar(pulse);
    (m.material as MeshBasicMaterial).opacity = 0.55 + 0.25 * Math.sin(clock.elapsedTime * 6);
  });

  return (
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false} renderOrder={2}>
      <ringGeometry args={[0.28, 0.4, 40]} />
      <meshBasicMaterial color="#8ab4d8" transparent opacity={0.7} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
