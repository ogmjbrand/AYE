import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Plane, Raycaster, Vector2, Vector3, type Group, type MeshBasicMaterial } from 'three';
import type { OrbitControls } from 'three-stdlib';
import { asFurniture, dragSpot, pieceOnRay, type OwnedFurniture } from '../lib/furniture';
import type { Interior } from '../lib/interiors';
import { Piece } from './HomeInterior';

const OK = '#5fd39a';
const BLOCKED = '#e0645c';

/**
 * Drag furniture you own across the floor with a mouse or a finger (while the
 * Home Decor catalogue is open). The piece follows the pointer, snapped to
 * 5 cm, over a green footprint where it fits and a red one where it doesn't;
 * letting go somewhere red puts it back where it was. A press that misses
 * every piece still turns the camera.
 */
export function FurnitureDrag({ interior, owned, controlsRef, onPlace, onDragging, onBlocked }: {
  interior: Interior;
  owned: readonly OwnedFurniture[];
  controlsRef: React.RefObject<OrbitControls | null>;
  onPlace: (uid: string, at: readonly [number, number], rot: 0 | 1) => void;
  /** The piece being dragged (hidden from the room while its copy follows the pointer), or null. */
  onDragging: (uid: string | null) => void;
  /** Let go where it can't stand. */
  onBlocked: (uid: string) => void;
}) {
  const { camera, gl } = useThree();
  const [held, setHeld] = useState<OwnedFurniture | null>(null);
  const ghost = useRef<Group>(null);
  const footprintMat = useRef<MeshBasicMaterial>(null);
  // Latest values for the native listeners, without re-adding them each render
  const live = useRef({ interior, owned, onPlace, onDragging, onBlocked });
  useLayoutEffect(() => {
    live.current = { interior, owned, onPlace, onDragging, onBlocked };
  });

  useEffect(() => {
    const el = gl.domElement;
    const controls = () => controlsRef.current;
    const raycaster = new Raycaster();
    const floor = new Plane(new Vector3(0, 1, 0), 0);
    const hit = new Vector3();
    let drag: { o: OwnedFurniture; pointerId: number; offset: [number, number]; spot: { at: [number, number]; ok: boolean } } | null = null;

    const aimAt = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      raycaster.setFromCamera(new Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera);
    };
    const floorAt = (e: PointerEvent) => {
      aimAt(e);
      return raycaster.ray.intersectPlane(floor, hit) ? ([hit.x, hit.z] as const) : null;
    };
    /** The piece you're pointing at (its box, not the floor behind it). */
    const pieceUnder = (e: PointerEvent) => {
      aimAt(e);
      const { origin: a, direction: v } = raycaster.ray;
      return pieceOnRay(live.current.owned, [a.x, a.y, a.z], [v.x, v.y, v.z]);
    };
    const show = (spot: { at: [number, number]; ok: boolean }) => {
      ghost.current?.position.set(spot.at[0], 0, spot.at[1]);
      footprintMat.current?.color.set(spot.ok ? OK : BLOCKED);
    };
    const onDown = (e: PointerEvent) => {
      if (drag || e.button !== 0) return;
      const o = pieceUnder(e);
      const p = o && floorAt(e);
      if (!p || !o?.at) return;
      // Ours, not the camera's: the orbit controls listen on the same element
      e.stopImmediatePropagation();
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      { const c = controls(); if (c) c.enabled = false; }
      drag = { o, pointerId: e.pointerId, offset: [o.at[0] - p[0], o.at[1] - p[1]], spot: { at: [o.at[0], o.at[1]], ok: true } };
      setHeld(o);
      live.current.onDragging(o.uid);
      el.style.cursor = 'grabbing';
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) {
        // Show that pieces can be picked up
        el.style.cursor = e.pointerType === 'mouse' && pieceUnder(e) ? 'grab' : '';
        return;
      }
      if (e.pointerId !== drag.pointerId) return;
      const p = floorAt(e);
      if (!p) return;
      drag.spot = dragSpot(live.current.interior, live.current.owned, drag.o.uid, [p[0] + drag.offset[0], p[1] + drag.offset[1]]);
      show(drag.spot);
    };
    const end = (e: PointerEvent, commit: boolean) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const { o, spot } = drag;
      drag = null;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      { const c = controls(); if (c) c.enabled = true; }
      el.style.cursor = '';
      const moved = o.at && (spot.at[0] !== o.at[0] || spot.at[1] !== o.at[1]);
      if (commit && moved && spot.ok) live.current.onPlace(o.uid, spot.at, o.rot);
      else if (commit && moved) live.current.onBlocked(o.uid);
      setHeld(null);
      live.current.onDragging(null);
    };
    const onUp = (e: PointerEvent) => end(e, true);
    const onCancel = (e: PointerEvent) => end(e, false);

    // Capture phase, so a press on a piece is handled before the camera controls see it
    el.addEventListener('pointerdown', onDown, true);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    return () => {
      el.removeEventListener('pointerdown', onDown, true);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
      el.style.cursor = '';
      { const c = controls(); if (c) c.enabled = true; }
      if (drag) live.current.onDragging(null);
    };
  }, [camera, gl, controlsRef]);

  // The held piece, drawn at the origin of a group that follows the pointer
  const f = useMemo(() => {
    const piece = held && asFurniture(held);
    return piece ? { ...piece, at: [0, 0] as const } : null;
  }, [held]);
  if (!held?.at || !f) return null;
  return (
    <group ref={ghost} position={[held.at[0], 0, held.at[1]]}>
      <group position={[0, f.kind === 'art' ? 0 : 0.03, 0]}>
        <Piece f={f} />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} renderOrder={2}>
        <planeGeometry args={[f.size[0] + 0.3, f.size[2] + 0.3]} />
        <meshBasicMaterial ref={footprintMat} color={OK} transparent opacity={0.6} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
