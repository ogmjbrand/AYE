import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from 'three';
import type { PlayerHandle } from '../hooks/usePlayerController';
import { useQuality } from './quality';

const COUNT = 450;
/** Metres either side of the player the drops spawn within. */
const SPREAD = 7;
/** Metres a drop falls before looping back to the top. */
const FALL_HEIGHT = 6;
const FALL_SPEED = 11;

const BASE_OPACITY = 0.3;
const geometry = new BoxGeometry(0.015, 0.5, 0.015);
const material = new MeshBasicMaterial({ color: '#cdd9e6', transparent: true, opacity: BASE_OPACITY, depthWrite: false, toneMapped: false });

// One shared drop layout and scratch objects: rain never shows more than one instance
// at a time, and these are animated imperatively every frame rather than through state.
const drops = Array.from({ length: COUNT }, () => ({
  x: (Math.random() - 0.5) * SPREAD * 2,
  z: (Math.random() - 0.5) * SPREAD * 2,
  y: Math.random() * FALL_HEIGHT,
  speed: FALL_SPEED * (0.85 + Math.random() * 0.3),
}));
const matrix = new Matrix4();
const position = new Vector3();
const noRotation = new Quaternion();
const noScale = new Vector3(1, 1, 1);

/**
 * Falling rain streaks around the player, following them like the sun's
 * shadow camera does. High quality tier only (spec: don't cost mobile FPS
 * for a decorative effect); mounted only while SceneLighting says it's
 * raining and the player is outdoors. `amount` (0..1) fades the streaks in
 * and out across the dawn/dusk weather transition instead of popping.
 */
export function Rain({ player, amount }: { player: PlayerHandle; amount: number }) {
  const quality = useQuality();
  const mesh = useRef<InstancedMesh>(null);

  useFrame((_, delta) => {
    material.opacity = BASE_OPACITY * amount;
    const inst = mesh.current;
    if (!inst) return;
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      // True modulo, not a single conditional add: a frame hitch (asset streaming, a
      // backgrounded tab) can produce a large delta that a single += FALL_HEIGHT can't
      // catch up from in one step, which would otherwise leave drops falling forever.
      d.y = (((d.y - d.speed * delta) % FALL_HEIGHT) + FALL_HEIGHT) % FALL_HEIGHT;
      position.set(player.position.x + d.x, player.position.y + d.y, player.position.z + d.z);
      matrix.compose(position, noRotation, noScale);
      inst.setMatrixAt(i, matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  });

  if (quality.quality !== 'high') return null;

  return <instancedMesh ref={mesh} args={[geometry, material, COUNT]} frustumCulled={false} castShadow={false} receiveShadow={false} />;
}
