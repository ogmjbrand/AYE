import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF, useTexture } from '@react-three/drei';
import { Box3, Color, LoopOnce, Material as MaterialBase, NoColorSpace, type AnimationAction, type Group, type Material, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { getSeated, type PlayerHandle } from '../hooks/usePlayerController';
import { seatDrop } from '../lib/seating';

import { assetUrl, playerBodyFor, type AvatarFile } from '../lib/assetManifest';
import { lookById } from '../lib/looks';
import type { Slot, Style } from '../lib/fashion';
import { applySkinPigmentation, applyStyles, installSkinOnlyShader, installStyleShader, type StyleUniforms } from './outfitShader';
import { DEFAULT_VITILIGO, type VitiligoPattern } from '../lib/skinPigmentation';
import { applyBodyShape } from './bodyShapeSkin';
import { withRelaxedHands } from './handPose';
import { Gestures, type GestureActions } from './Gestures';
import { conversationGesture, type Gesture } from '../lib/bodyLanguage';
import { AVERAGE_SHAPE, type BodyShape } from '../lib/bodyShape';
import {
  cc5AlbinismMultiplier, cc5GarmentColor, cc5SkinMultiplier, cc5SlotOf, cc5UndertoneMultiplier,
  CC5_BROW_LASH_MATERIALS, CC5_HAS_SPLIT_MATERIALS, CC5_SKIN_MATERIALS,
} from '../lib/cc5Body';
import { HUG_DURATION_MS, type HugSession } from '../lib/hug';
import { createReachHugClip } from '../lib/hugAnimation';

const NO_STYLES: Partial<Record<Slot, Style>> = {};
const maskUrl = (lookId: string, part: 'body' | 'head') => assetUrl(`models/characters/rocketbox/masks/${lookId}-${part}.png`);

/** Applies fabrics, hair colour and skin pigmentation using the look's garment maps (built-in looks only). */
export function OutfitStyler({ scene, lookId, styles, skinTone, undertone = 0, vitiligo = DEFAULT_VITILIGO }: {
  scene: Object3D; lookId: string; styles: Partial<Record<Slot, Style>>;
  /** -1 lighter … 1 deeper than the person's own skin. */
  skinTone: number;
  /** -1 cool … 1 warm undertone shift, independent of depth. */
  undertone?: number;
  vitiligo?: VitiligoPattern;
}) {
  const [bodyMask, headMask] = useTexture([maskUrl(lookId, 'body'), maskUrl(lookId, 'head')]);
  const [uniforms, materials] = useMemo(() => {
    const list: StyleUniforms[] = [];
    const mats: Material[] = [];
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
        if (u) { list.push(u); mats.push(mat); }
      }
    });
    return [list, mats] as const;
  }, [scene, bodyMask, headMask]);
  useEffect(() => {
    for (const u of uniforms) applyStyles(u, styles);
  }, [uniforms, styles]);
  useEffect(() => {
    for (const m of materials) applySkinPigmentation(m, { depth: skinTone, undertone, vitiligo });
  }, [materials, skinTone, undertone, vitiligo]);
  return null;
}

/**
 * The Character Creator 5 body wears its own modelled clothes: the wardrobe
 * recolours them by material. On the split-material body (aaron), skin gets
 * the full per-pixel pigmentation shader (depth, undertone and vitiligo
 * patches) and brows/lashes lighten for albinism; on the single-material
 * body (the WOMAN.fbx scan), skin tone is a plain colour multiply over her
 * whole material, since her skin and clothes share one texture
 * (lib/cc5Body.ts: CC5_HAS_SPLIT_MATERIALS).
 */
function Cc5Styler({ scene, styles, skinTone, undertone = 0, vitiligo = DEFAULT_VITILIGO, albinismIntensity = 0, splitMaterials }: {
  scene: Object3D; styles: Partial<Record<Slot, Style>>; skinTone: number; undertone?: number; vitiligo?: VitiligoPattern; albinismIntensity?: number; splitMaterials: boolean;
}) {
  useEffect(() => {
    const [sr, sg, sb] = cc5SkinMultiplier(skinTone);
    const [ur, ug, ub] = cc5UndertoneMultiplier(undertone);
    const [ar, ag, ab] = cc5AlbinismMultiplier(albinismIntensity);
    scene.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      for (const m of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as MeshStandardMaterial[]) {
        const slot = cc5SlotOf(m.name);
        const wear = slot ? cc5GarmentColor(styles[slot]) : null;
        if (wear) {
          m.color?.set(wear);
          continue;
        }
        if (splitMaterials && CC5_SKIN_MATERIALS.test(m.name)) {
          const u = installSkinOnlyShader(m);
          if (u) applySkinPigmentation(m, { depth: skinTone, undertone, vitiligo });
          continue;
        }
        if (splitMaterials && CC5_BROW_LASH_MATERIALS.test(m.name)) {
          if (!m.color) continue;
          const base = (m.userData.cc5Base ??= m.color.clone()) as Color;
          m.color.setRGB(base.r * ar, base.g * ag, base.b * ab);
          continue;
        }
        if (!m.color) continue;
        const base = (m.userData.cc5Base ??= m.color.clone()) as Color;
        if (!splitMaterials) m.color.setRGB(base.r * sr * ur, base.g * sg * ug, base.b * sb * ub);
        else m.color.copy(base);
      }
    });
  }, [scene, styles, skinTone, undertone, vitiligo, albinismIntensity, splitMaterials]);
  return null;
}

type Clip = 'Idle' | 'Walk' | 'Run';
type State = Clip | Gesture;

/** Cross-fades to the clip that matches the speed (or the gesture, when standing) and scales its playback rate. */
function updateLocomotion(
  get: (state: State) => AnimationAction | null | undefined,
  current: { current: State | null },
  speed: number,
  avatar: AvatarFile,
  gesture: Gesture | null,
  mixerTime: number,
  sitting = false,
) {
  const next: State = sitting ? 'Sit' : speed < 0.35 ? (gesture && get(gesture) ? gesture : 'Idle') : speed < 3.2 ? 'Walk' : 'Run';
  if (next !== current.current) {
    const prev = current.current ? get(current.current) : null;
    const action = get(next);
    if (prev === action && prev) {
      current.current = next; // same clip serves both states (e.g. walk used for run)
      return;
    }
    if (next === 'Talk' || next === 'Listen') {
      // Long takes: join them part-way through so turns don't repeat the same opening
      action?.reset().startAt(mixerTime - ((mixerTime * 7.3) % 20)).fadeIn(0.4).play();
    } else if (next === 'Sit' || current.current === 'Sit') {
      // Settling onto a seat or getting up: a slower blend, so the body lowers and rises rather than snapping
      action?.reset().fadeIn(0.7).play();
    } else {
      action?.reset().fadeIn(0.25).play();
    }
    prev?.fadeOut(next === 'Sit' || current.current === 'Sit' ? 0.7 : next === 'Walk' || next === 'Run' ? 0.25 : 0.4);
    current.current = next;
  }
  const action = get(next);
  if (action && (next === 'Walk' || next === 'Run')) {
    // Play the stride at the rate that matches ground speed, so feet don't slide
    const clipSpeed = next === 'Walk' ? avatar.walkSpeed : avatar.runSpeed;
    action.setEffectiveTimeScale(clipSpeed > 0 ? Math.min(2, Math.max(0.5, speed / clipSpeed)) : 1);
  }
}

/** A copy of the cached model with its own materials and none of the shared styling installed. */
function privateCopy(shared: Object3D): Object3D {
  const copy = cloneSkinned(shared);
  copy.position.set(0, 0, 0);
  copy.rotation.set(0, 0, 0);
  copy.scale.set(1, 1, 1);
  copy.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const fresh = (m: Material) => {
      const c = m.clone();
      c.onBeforeCompile = MaterialBase.prototype.onBeforeCompile;
      c.customProgramCacheKey = MaterialBase.prototype.customProgramCacheKey;
      delete (c.userData as { ayeStyle?: unknown; ayePigment?: unknown; cc5Base?: unknown }).ayeStyle;
      delete (c.userData as { ayeStyle?: unknown; ayePigment?: unknown; cc5Base?: unknown }).ayePigment;
      delete (c.userData as { ayeStyle?: unknown; ayePigment?: unknown; cc5Base?: unknown }).cc5Base;
      return c;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(fresh) : fresh(mesh.material);
  });
  return copy;
}

/**
 * Rigged, animated human: the player body (the Character Creator 5 character,
 * lib/assetManifest.ts) or one of the built-in looks in lib/looks.ts. Picks
 * idle / walk / run from the speed and cross-fades between them.
 */
export function Avatar({ controller, lookId, heightCm, styles, shape, skinTone = 0, undertone = 0, vitiligo, albinismIntensity = 0, conversing = false, own = false, hugSession = null }: {
  controller: PlayerHandle;
  /** Sharing a hug with a resident: the embrace plays once the two have met (lib/hug.ts). */
  hugSession?: HugSession | null;
  /** Use a private copy of the model (a picture of the character elsewhere), so styling it never touches the player's. */
  own?: boolean;
  /** Talking with a resident: the player talks and listens in turns while standing. */
  conversing?: boolean;
  /** Build, muscle, curves and belly (lib/bodyShape.ts); average if omitted. */
  shape?: BodyShape;
  /** Deeper (to 1) or lighter (to -1) than the person's own skin; 0 keeps it. */
  skinTone?: number;
  /** -1 cool … 1 warm undertone shift, independent of depth. */
  undertone?: number;
  /** Patchy depigmentation (lib/skinPigmentation.ts); off by default. */
  vitiligo?: VitiligoPattern;
  /** 0 fully pigmented … 1 fully depigmented hair, brows and lashes (where the model supports it). */
  albinismIntensity?: number;
  /** Fabrics and hair colour to wear (lib/fashion.ts); original clothes where a slot is empty. */
  styles?: Partial<Record<Slot, Style>>;
  /** Which person to show (lib/looks.ts); the default look if omitted. */
  lookId?: string;
  /** Standing height; the look's own height if omitted. */
  heightCm?: number;
}) {
  const group = useRef<Group>(null);
  // The CC5 body for this body type (or one listed in public/assets/manifest.json) replaces the built-in looks
  const bodyType = lookById(lookId).body;
  const avatarFile: AvatarFile = useMemo(() => playerBodyFor(bodyType) ?? lookById(lookId), [bodyType, lookId]);
  const targetHeight = heightCm ? heightCm / 100 : avatarFile.height;
  const { scene: shared, animations } = useGLTF(assetUrl(avatarFile.url), false, true);
  const scene = useMemo(() => (own ? privateCopy(shared) : shared), [shared, own]);
  const clipsWithHands = useMemo(() => withRelaxedHands(animations), [animations]);
  const { actions, mixer } = useAnimations(clipsWithHands, group);
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
  const current = useRef<State | null>(null);

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
  // Garment maps exist only for the built-in looks; the player body (CC5) is styled by material
  const playerBody = playerBodyFor(bodyType) !== null;
  const styledLook = playerBody ? null : lookById(lookId).id;

  // Built-in looks: gestures (talk, listen, wave, sit, hug) arrive in their own file after the person is on screen
  const [loadedGestures, setGestures] = useState<GestureActions>({});
  const body = playerBody ? null : lookById(lookId).body;
  // The player body carries its gestures in its own file, retargeted to its skeleton (scripts/cc5);
  // set up once mounted, when the animation root exists
  const [ownGestures, setOwnGestures] = useState<GestureActions | null>(null);
  useEffect(() => {
    const root = group.current;
    if (!playerBody || !root) return;
    const out: GestureActions = {};
    for (const name of ['Talk', 'Listen', 'Wave', 'Sit'] as const) {
      const clip = clipsWithHands.find((c) => c.name === name);
      if (!clip) continue;
      const action = mixer.clipAction(clip, root);
      if (name === 'Wave') {
        action.setLoop(LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      out[name] = action;
    }
    const hugClip = createReachHugClip(scene, clipsWithHands.find((c) => c.name === clips.Idle));
    if (hugClip) {
      const hug = mixer.clipAction(hugClip, root);
      hug.setLoop(LoopOnce, 1);
      out.Hug = hug;
    }
    setOwnGestures(out);
    return () => {
      for (const a of Object.values(out)) a?.stop();
      setOwnGestures(null);
    };
  }, [playerBody, clipsWithHands, clips, mixer, scene]);
  const gestures = ownGestures ?? loadedGestures;
  const idleClip = useMemo(() => clipsWithHands.find((c) => c.name === clips.Idle), [clipsWithHands, clips]);
  const conversationStart = useRef<number | null>(null);

  useFrame((_, delta) => {
    if (conversing && conversationStart.current === null) conversationStart.current = mixer.time;
    if (!conversing) conversationStart.current = null;
    // Hugging: the embrace plays from when the two meet until the hug's time is up
    const hugElapsed = hugSession ? Date.now() - hugSession.startedAt : -1;
    const embracing = hugSession !== null && hugElapsed >= hugSession.approachMs && hugElapsed < hugSession.approachMs + HUG_DURATION_MS;
    const gesture = embracing
      ? 'Hug'
      : conversationStart.current === null ? null : conversationGesture('player', mixer.time - conversationStart.current);
    const get = (state: State) => {
      if (state === 'Idle' || state === 'Walk' || state === 'Run') {
        const name = clips[state];
        return name ? actions[name] : undefined;
      }
      return gestures[state];
    };
    // Seated: play the sitting clip and lower the body onto the seat (only if the clip is here; otherwise stay standing)
    const seat = getSeated();
    const sitting = !!seat && !!gestures.Sit;
    updateLocomotion(get, current, Math.hypot(controller.velocity.x, controller.velocity.z), avatarFile, gesture, mixer.time, sitting);
    const g = group.current;
    if (g) {
      const drop = sitting ? seatDrop(seat, targetHeight) : 0;
      g.position.y += (drop - g.position.y) * Math.min(1, delta * 5);
    }
  });

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} scale={scale} />
      {styledLook && <OutfitStyler scene={scene} lookId={styledLook} styles={styles ?? NO_STYLES} skinTone={skinTone} undertone={undertone} vitiligo={vitiligo} />}
      {playerBody && (
        <Cc5Styler scene={scene} styles={styles ?? NO_STYLES} skinTone={skinTone} undertone={undertone} vitiligo={vitiligo} albinismIntensity={albinismIntensity} splitMaterials={CC5_HAS_SPLIT_MATERIALS[bodyType]} />
      )}
      {body && <Gestures body={body} mixer={mixer} root={group} idle={idleClip} onLoad={setGestures} />}
    </group>
  );
}

