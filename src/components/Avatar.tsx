import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import { Box3, type AnimationAction, type Group, type Mesh } from 'three';
import type { PlayerHandle } from '../hooks/usePlayerController';

export const AVATAR_URL = '/assets/models/aye-avatar.glb';
/** Target standing height in metres. */
const HEIGHT = 1.72;

type Clip = 'Idle' | 'Walk' | 'Run';

/** Cross-fades to the clip that matches the speed and scales its playback rate. */
function updateLocomotion(
  actions: Partial<Record<string, AnimationAction | null>>,
  current: { current: Clip | null },
  speed: number,
) {
  const next: Clip = speed < 0.35 ? 'Idle' : speed < 3.2 ? 'Walk' : 'Run';
  if (next !== current.current) {
    const prev = current.current ? actions[current.current] : null;
    actions[next]?.reset().fadeIn(0.25).play();
    prev?.fadeOut(0.25);
    current.current = next;
  }
  const action = actions[next];
  if (action) {
    // Keep feet roughly in sync with ground speed
    action.timeScale =
      next === 'Walk' ? Math.min(1.6, Math.max(0.6, speed / 1.5))
        : next === 'Run' ? Math.min(1.4, Math.max(0.8, speed / 5.2))
          : 1;
  }
}

/**
 * Rigged, animated human (see public/assets/CREDITS.md). Picks idle / walk /
 * run from the player's speed and cross-fades between them.
 */
export function Avatar({ controller }: { controller: PlayerHandle }) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(AVATAR_URL, false, true);
  const { actions } = useAnimations(animations, group);
  const current = useRef<Clip | null>(null);

  // Normalise size so the model is a believable adult height whatever its export units
  const scale = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const h = box.max.y - box.min.y;
    return h > 0 ? HEIGHT / h : 1;
  }, [scene]);

  useEffect(() => {
    scene.traverse((o) => {
      const mesh = o as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false; // skinned bounds don't follow the animation
      }
    });
  }, [scene]);

  useFrame(() => updateLocomotion(actions, current, Math.hypot(controller.velocity.x, controller.velocity.z)));

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} scale={scale} />
    </group>
  );
}

useGLTF.preload(AVATAR_URL, false, true);
