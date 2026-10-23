import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { MeshPhysicalMaterial, MeshStandardMaterial, Vector3, type Bone, type Group, type Object3D } from 'three';
import type { BagShape, Style } from '../lib/fashion';

/** Grip, body size (width front-to-back, height, depth side-to-side) and where the body's top sits below the hand, in metres. */
const BAG: Record<BagShape, { w: number; h: number; d: number; top: number; handle: 'straps' | 'arch' | 'none' | 'cord' }> = {
  tote: { w: 0.38, h: 0.32, d: 0.13, top: -0.2, handle: 'straps' },
  'top-handle': { w: 0.28, h: 0.21, d: 0.12, top: -0.1, handle: 'arch' },
  clutch: { w: 0.26, h: 0.13, d: 0.045, top: 0.05, handle: 'none' },
  bucket: { w: 0.24, h: 0.26, d: 0.24, top: -0.18, handle: 'cord' },
  mini: { w: 0.18, h: 0.13, d: 0.07, top: -0.09, handle: 'arch' },
};

const HAND = /L[_ ]?Hand$/;
// Scratch vector for the hand's position each frame
const HAND_AT = new Vector3();

/** A handbag in your left hand: its body hangs below the grip and moves with your arm. Original shapes, no brand marks. */
export function HeldBag({ scene, style }: { scene: Object3D; style: Style }) {
  const group = useRef<Group>(null);
  const hand = useMemo(() => {
    let found: Bone | null = null;
    scene.traverse((o) => { if (!found && (o as Bone).isBone && HAND.test(o.name)) found = o as Bone; });
    return found as Bone | null;
  }, [scene]);
  useFrame(() => {
    const v = HAND_AT;
    const g = group.current;
    if (!g || !hand || !g.parent) return;
    hand.getWorldPosition(v);
    g.parent.worldToLocal(v);
    // A little out from the leg so the bag doesn't pass through it
    v.x += Math.sign(v.x || 1) * 0.05;
    g.position.copy(v);
  });
  const shape = BAG[style.bag ?? 'tote'];
  const fabric = style.fabric;
  const body = useMemo(() => new MeshPhysicalMaterial({
    color: style.colors[0], roughness: fabric ? fabric.roughness : 0.5, metalness: fabric?.metalness ?? 0, clearcoat: fabric?.name === 'leather' ? 0.4 : 0, clearcoatRoughness: 0.4,
  }), [style.colors, fabric]);
  const gold = useMemo(() => new MeshStandardMaterial({ color: '#d4b26a', roughness: 0.25, metalness: 1 }), []);
  if (!hand) return null;
  const { w, h, d, top } = shape;
  const cy = top - h / 2;
  return (
    <group ref={group}>
      <RoundedBox args={[d, h, w]} radius={Math.min(0.03, d / 2 - 0.002)} smoothness={3} position={[0, cy, 0]} material={body} castShadow />
      {/* Flap edge and clasp */}
      {shape.handle !== 'cord' && <mesh position={[d / 2 + 0.002, top - Math.min(0.05, h * 0.35), 0]} material={gold}><boxGeometry args={[0.006, 0.02, Math.min(0.05, w * 0.25)]} /></mesh>}
      {shape.handle === 'straps' && [-1, 1].map((s) => (
        <mesh key={s} position={[s * d * 0.3, top / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={body}>
          <torusGeometry args={[Math.abs(top) / 2 + 0.02, 0.008, 6, 18, Math.PI]} />
        </mesh>
      ))}
      {shape.handle === 'arch' && (
        <mesh position={[0, top, 0]} rotation={[0, Math.PI / 2, 0]} material={body}>
          <torusGeometry args={[Math.max(0.05, Math.abs(top) + 0.01), 0.011, 8, 20, Math.PI]} />
        </mesh>
      )}
      {shape.handle === 'cord' && (
        <>
          <mesh position={[0, top + 0.004, 0]} rotation={[Math.PI / 2, 0, 0]} material={gold}><torusGeometry args={[w / 2 - 0.01, 0.006, 6, 24]} /></mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0, top / 2, s * w * 0.22]} rotation={[0, 0, 0]} material={body}>
              <cylinderGeometry args={[0.005, 0.005, Math.abs(top), 6]} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}
