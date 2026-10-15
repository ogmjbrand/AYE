import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import { Box3, type AnimationAction, type Group, type Mesh } from 'three';
import type { PlayerHandle } from '../hooks/usePlayerController';

import { assetManifest, assetUrl } from '../lib/assetManifest';

const DEFAULT_AVATAR = { url: 'models/aye-avatar.glb', height: 1.72 };

type Clip = 'Idle' | 'Walk' | 'Run';

/** Cross-fades to the clip that matches the speed and scales its playback rate. */
function updateLocomotion(
  actions: Partial<Record<string, AnimationAction | null>>,
  clips: Record<Clip, string | undefined>,
  current: { current: Clip | null },
  speed: number,
) {
  const next: Clip = speed < 0.35 ? 'Idle' : speed < 3.2 ? 'Walk' : 'Run';
  if (next !== current.current) {
    const prevName = current.current ? clips[current.current] : undefined;
    const prev = prevName ? actions[prevName] : null;
    const nextName = clips[next];
    if (prevName === nextName && prev) {
      current.current = next; // same clip serves both states (e.g. walk used for run)
      return;
    }
    if (nextName) actions[nextName]?.reset().fadeIn(0.25).play();
    prev?.fadeOut(0.25);
    current.current = next;
  }
  const name = clips[next];
  const action = name ? actions[name] : undefined;
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
  // A character listed in public/assets/manifest.json replaces the built-in one
  const avatarFile = assetManifest().avatar ?? DEFAULT_AVATAR;
  const { scene, animations } = useGLTF(assetUrl(avatarFile.url), false, true);
  const { actions } = useAnimations(animations, group);
  // Match clips by name (case-insensitive) so downloaded characters work without renaming
  const clips = useMemo(() => {
    const names = animations.map((c) => c.name);
    const find = (re: RegExp) => names.find((n) => re.test(n));
    const idle = find(/idle|stand/i) ?? names[0];
    const walk = find(/walk/i) ?? idle;
    const run = find(/run|jog/i) ?? walk;
    if (!find(/idle/i) || !find(/walk/i) || !find(/run/i)) {
      console.warn('[AYE assets] avatar is missing Idle, Walk or Run animations; found:', names);
    }
    return { Idle: idle, Walk: walk, Run: run } as Record<Clip, string | undefined>;
  }, [animations]);
  const current = useRef<Clip | null>(null);

  // Normalise size so the model is a believable adult height whatever its export units
  const scale = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const h = box.max.y - box.min.y;
    return h > 0 ? avatarFile.height / h : 1;
  }, [scene, avatarFile.height]);

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

  useFrame(() => updateLocomotion(actions, clips, current, Math.hypot(controller.velocity.x, controller.velocity.z)));

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} scale={scale} />
    </group>
  );
}

