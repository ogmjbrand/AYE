import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF, useTexture } from '@react-three/drei';
import { Box3, NoColorSpace, type AnimationAction, type Group, type Mesh, type Object3D } from 'three';
import type { PlayerHandle } from '../hooks/usePlayerController';

import { assetManifest, assetUrl, type AvatarFile } from '../lib/assetManifest';
import { lookById } from '../lib/looks';
import type { Slot, Style } from '../lib/fashion';
import { applyStyles, installStyleShader, type StyleUniforms } from './outfitShader';
import { applyBodyShape } from './bodyShapeSkin';
import { withRelaxedHands } from './handPose';
import { AVERAGE_SHAPE, type BodyShape } from '../lib/bodyShape';

const maskUrl = (lookId: string, part: 'body' | 'head') => assetUrl(`models/characters/rocketbox/masks/${lookId}-${part}.png`);

/** Applies fabrics and hair colour using the look's garment maps (built-in looks only). */
function OutfitStyler({ scene, lookId, styles }: { scene: Object3D; lookId: string; styles: Partial<Record<Slot, Style>> }) {
  const [bodyMask, headMask] = useTexture([maskUrl(lookId, 'body'), maskUrl(lookId, 'head')]);
  const uniforms = useMemo(() => {
    const list: StyleUniforms[] = [];
    for (const tex of [bodyMask, headMask]) {
      // Garment maps are data in glTF UV space, like the model's own textures
      tex.flipY = false;
      tex.colorSpace = NoColorSpace;
      tex.needsUpdate = true;
    }
    scene.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const u = installStyleShader(mat, /_head$/i.test(mat.name) ? headMask : bodyMask);
        if (u) list.push(u);
      }
    });
    return list;
  }, [scene, bodyMask, headMask]);
  useEffect(() => {
    for (const u of uniforms) applyStyles(u, styles);
  }, [uniforms, styles]);
  return null;
}


type Clip = 'Idle' | 'Walk' | 'Run';

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
export function Avatar({ controller, lookId, heightCm, styles, shape }: {
  controller: PlayerHandle;
  /** Build, muscle, curves and belly (lib/bodyShape.ts); average if omitted. */
  shape?: BodyShape;
  /** Fabrics and hair colour to wear (lib/fashion.ts); original clothes where a slot is empty. */
  styles?: Partial<Record<Slot, Style>>;
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
  const clipsWithHands = useMemo(() => withRelaxedHands(animations), [animations]);
  const { actions } = useAnimations(clipsWithHands, group);
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
      }
    });
  }, [scene]);
  // The GLB scene is cached and shared, so the shape is (re)applied whenever it or the scene changes
  const shapeKey = JSON.stringify(shape ?? AVERAGE_SHAPE);
  useEffect(() => {
    applyBodyShape(scene, JSON.parse(shapeKey) as BodyShape);
  }, [scene, shapeKey]);
  // Garment maps exist only for the built-in looks, not for a model listed in the asset manifest
  const styledLook = assetManifest().avatar ? null : lookById(lookId).id;

  useFrame(() => updateLocomotion(actions, clips, current, Math.hypot(controller.velocity.x, controller.velocity.z), avatarFile));

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} scale={scale} />
      {styledLook && styles && <OutfitStyler scene={scene} lookId={styledLook} styles={styles} />}
    </group>
  );
}

