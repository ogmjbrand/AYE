import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import { Box3, Color, type AnimationAction, type Group, type Material, type Mesh, type MeshStandardMaterial } from 'three';
import type { PlayerHandle } from '../hooks/usePlayerController';

import { assetManifest, assetUrl, type AvatarFile, type OutfitKey } from '../lib/assetManifest';
import { lookById } from '../lib/looks';

/** How strongly a texel counts as outfit fabric, per avatar. */
const FABRIC_MASK: Record<Exclude<OutfitKey, 'none'>, string> = {
  // The old built-in model's saturated yellow trousers
  yellow: 'smoothstep(0.12, 0.3, min(c.r, c.g) - c.b)',
  // Denim: clearly bluer than it is red; skin and white trainers stay untouched
  // (faded denim is only slightly blue, so the threshold is low to recolour it evenly)
  blue: 'smoothstep(0.0, 0.035, c.b - c.r)',
};

type Clip = 'Idle' | 'Walk' | 'Run';

/**
 * Recolours the outfit fabric without touching skin or hair: texels that match
 * the avatar's fabric mask take on the chosen colour, keeping the fabric's
 * shading and texture. Installed once per material.
 */
function outfitTint(material: Material, key: Exclude<OutfitKey, 'none'>): { value: Color } {
  const m = material as MeshStandardMaterial & { userData: { outfit?: { value: Color } } };
  if (m.userData.outfit) return m.userData.outfit;
  const uniform = { value: new Color('#ffffff') };
  m.userData.outfit = uniform;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uOutfit = uniform;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uOutfit;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          vec3 c = diffuseColor.rgb;
          float fabric = ${FABRIC_MASK[key]};
          float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
          diffuseColor.rgb = mix(c, uOutfit * clamp(lum * 2.2, 0.0, 1.2), fabric);
        }`,
      );
  };
  m.customProgramCacheKey = () => `aye-outfit-tint-${key}`;
  m.needsUpdate = true;
  return uniform;
}

/** Cross-fades to the clip that matches the speed and scales its playback rate. */
function updateLocomotion(
  actions: Partial<Record<string, AnimationAction | null>>,
  clips: Record<Clip, string | undefined>,
  current: { current: Clip | null },
  speed: number,
  avatar: AvatarFile,
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
    // Play the stride at the rate that matches ground speed, so feet don't slide
    const clipSpeed = next === 'Walk' ? avatar.walkSpeed : next === 'Run' ? avatar.runSpeed : 0;
    action.timeScale = clipSpeed > 0 ? Math.min(2, Math.max(0.5, speed / clipSpeed)) : 1;
  }
}

/**
 * Rigged, animated human: one of the looks in lib/looks.ts (see public/assets/CREDITS.md). Picks idle / walk /
 * run from the player's speed and cross-fades between them.
 */
export function Avatar({ controller, outfitColor, lookId, heightCm }: {
  controller: PlayerHandle;
  outfitColor?: string;
  /** Which person to show (lib/looks.ts); the default look if omitted. */
  lookId?: string;
  /** Standing height; the look's own height if omitted. */
  heightCm?: number;
}) {
  const group = useRef<Group>(null);
  // A character listed in public/assets/manifest.json replaces the built-in looks
  const avatarFile: AvatarFile = assetManifest().avatar ?? lookById(lookId);
  const targetHeight = heightCm ? heightCm / 100 : avatarFile.height;
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
    return h > 0 ? targetHeight / h : 1;
  }, [scene, targetHeight]);

  useEffect(() => {
    scene.traverse((o) => {
      const mesh = o as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false; // skinned bounds don't follow the animation
        if (outfitColor && avatarFile.outfit !== 'none') {
          for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            outfitTint(mat, avatarFile.outfit).value.set(outfitColor);
          }
        }
      }
    });
  }, [scene, outfitColor, avatarFile.outfit]);

  useFrame(() => updateLocomotion(actions, clips, current, Math.hypot(controller.velocity.x, controller.velocity.z), avatarFile));

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} scale={scale} />
    </group>
  );
}

