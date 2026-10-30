import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF, useTexture } from '@react-three/drei';
import { Box3, Color, Euler, LoopOnce, Material as MaterialBase, NoColorSpace, Quaternion, type AnimationAction, type Group, type Material, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { getSeated, type PlayerHandle } from '../hooks/usePlayerController';
import { seatDrop } from '../lib/seating';

import { assetManifest, assetUrl, type AvatarFile } from '../lib/assetManifest';
import { lookById } from '../lib/looks';
import type { Slot, Style } from '../lib/fashion';
import { applySkinShade, applySkinTone, applyStyles, installStyleShader, type StyleUniforms } from './outfitShader';
import { applyBodyShape } from './bodyShapeSkin';
import { createRelaxedHands } from './relaxedHands';
import { withRelaxedHands } from './handPose';
import { Gestures, type GestureActions } from './Gestures';
import { SEAT_TRANSITIONS, conversationGesture, type Gesture, type SeatTransition } from '../lib/bodyLanguage';
import { AVERAGE_SHAPE, type BodyShape } from '../lib/bodyShape';
import { HeldBag } from '../world/HeldBag';
import { Adornments } from '../world/Adornments';
import { HUG_DURATION_MS, type HugSession } from '../lib/hug';
import { GarmentLayer } from './GarmentLoader';
import { getGarmentModel } from '../lib/fashion';
import { DEFAULT_SKIN_TONE, isSkinColor, skinToneById, skinToneDepth, type SkinToneId } from '../lib/skinTone';
import { CC5_SKIN_MATERIALS, cc5GarmentColor, cc5SkinMultiplier, cc5SlotOf } from '../lib/cc5Body';
import { createReachHugClip } from '../lib/hugAnimation';
import { findRigBone } from '../lib/characterRig';

const NO_STYLES: Partial<Record<Slot, Style>> = {};
const maskUrl = (lookId: string, part: 'body' | 'head') => assetUrl(`models/characters/rocketbox/masks/${lookId}-${part}.png`);
const EAT_UPPER_ARM = new Quaternion().setFromEuler(new Euler(-0.16, 0.05, -0.82));
const EAT_FOREARM = new Quaternion().setFromEuler(new Euler(-0.08, 0, -1.05));
const EAT_HAND = new Quaternion().setFromEuler(new Euler(0, 0, -0.22));

interface OutfitStylerProps {
  scene: Object3D;
  lookId: string;
  styles: Partial<Record<Slot, Style>>;
  /** Deeper (to 1) or lighter (to -1) than the person's own skin; 0 keeps it. */
  skinTone?: number;
  /** A skin tint (lib/skinTone.ts); 'original' keeps the authored skin. */
  skinToneId?: SkinToneId;
  skinColor?: string;
}

/** Applies fabrics, hair colour and skin tone using the look's garment maps (built-in looks only). */
export function OutfitStyler({ scene, lookId, styles, skinTone = 0, skinToneId = DEFAULT_SKIN_TONE, skinColor }: OutfitStylerProps) {
  const [bodyMask, headMask] = useTexture([maskUrl(lookId, 'body'), maskUrl(lookId, 'head')]);
  const [uniforms, materials, tinted] = useMemo(() => {
    const list: StyleUniforms[] = [];
    const mats: Material[] = [];
    const tint: StyleUniforms[] = [];
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
        if (u && /_(body|head)$/i.test(mat.name)) tint.push(u);
      }
    });
    return [list, mats, tint] as const;
  }, [scene, bodyMask, headMask]);
  useEffect(() => {
    for (const u of uniforms) applyStyles(u, styles);
  }, [uniforms, styles]);
  useEffect(() => {
    for (const m of materials) applySkinShade(m, skinTone);
  }, [materials, skinTone]);
  useEffect(() => {
    const color = isSkinColor(skinColor) ? skinColor : skinToneById(skinToneId).color;
    for (const u of tinted) applySkinTone(u, color, skinToneId !== 'original');
  }, [tinted, skinToneId, skinColor]);
  return null;
}


type Clip = 'Idle' | 'Walk' | 'Run';
type State = Clip | Gesture;

/** Sitting on something for now (a bed's edge), set frame by frame: its height, and sitting down, seated or standing up. */
export interface Perch {
  height: number;
  clip: 'Sit' | SeatTransition;
  /** How long sitting down or standing up takes here; the clip's movement is stretched to fit. */
  seconds: number;
}

/** Playing part of a sit-down or stand-up clip: from where, at what rate. */
interface Transition { from: number; to: number; rate: number }

/** Cross-fades to the clip that matches the speed (or the gesture, when standing) and scales its playback rate. */
function updateLocomotion(
  get: (state: State) => AnimationAction | null | undefined,
  current: { current: State | null },
  speed: number,
  avatar: AvatarFile,
  gesture: Gesture | null,
  mixerTime: number,
  seated: 'Sit' | SeatTransition | null = null,
  transition: Transition | null = null,
) {
  const next: State = seated ?? (gesture === 'Hug' && get('Hug') ? 'Hug' : speed < 0.35 ? (gesture && get(gesture) ? gesture : 'Idle') : speed < 3.2 ? 'Walk' : 'Run');
  const seatedState = (s: State | null) => s === 'Sit' || s === 'SitDown' || s === 'StandUp';
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
    } else if ((next === 'SitDown' || next === 'StandUp') && action && transition) {
      // Just the part where the body lowers or rises, once, stretched to the time it takes here
      action.reset();
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      action.time = transition.from;
      action.setEffectiveTimeScale(transition.rate);
      action.fadeIn(0.3).play();
    } else if (seatedState(next) || seatedState(current.current)) {
      // Settling onto a seat or getting up: a slower blend, so the body lowers and rises rather than snapping
      action?.reset().fadeIn(seatedState(next) && seatedState(current.current) ? 0.35 : 0.7).play();
    } else {
      action?.reset().fadeIn(0.25).play();
    }
    prev?.fadeOut(seatedState(next) || seatedState(current.current) ? (seatedState(next) && seatedState(current.current) ? 0.35 : 0.7) : next === 'Walk' || next === 'Run' ? 0.25 : 0.4);
    current.current = next;
  }
  const action = get(next);
  if (action && (next === 'Walk' || next === 'Run')) {
    // Play the stride at the rate that matches ground speed, so feet don't slide
    const clipSpeed = next === 'Walk' ? avatar.walkSpeed : avatar.runSpeed;
    action.setEffectiveTimeScale(clipSpeed > 0 ? Math.min(2, Math.max(0.5, speed / clipSpeed)) : 1);
  }
}

/**
 * The Character Creator 5 body wears its own modelled clothes: the wardrobe
 * recolours them by material, and skin tone tints the skin (lib/cc5Body.ts).
 */
function Cc5Styler({ scene, styles, skinTone }: { scene: Object3D; styles: Partial<Record<Slot, Style>>; skinTone: number }) {
  useEffect(() => {
    const [r, g, b] = cc5SkinMultiplier(skinTone);
    scene.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      for (const m of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as MeshStandardMaterial[]) {
        if (!m.color) continue;
        const base = (m.userData.cc5Base ??= m.color.clone()) as Color;
        const slot = cc5SlotOf(m.name);
        const wear = slot ? cc5GarmentColor(styles[slot]) : null;
        if (wear) m.color.set(wear);
        else if (CC5_SKIN_MATERIALS.test(m.name)) m.color.setRGB(base.r * r, base.g * g, base.b * b);
        else m.color.copy(base);
      }
    });
  }, [scene, styles, skinTone]);
  return null;
}

/**
 * Rigged, animated human: the player body (the Character Creator 5 character,
 * lib/assetManifest.ts) when it's built, else one of the looks in lib/looks.ts (see public/assets/CREDITS.md). Picks idle / walk /
 * run from the player's speed and cross-fades between them.
 */
/** A copy of the cached model with its own materials and none of the shared styling installed. */
function privateCopy(shared: Object3D): Object3D {
  const copy = cloneSkinned(shared);
  copy.position.set(0, 0, 0);
  copy.rotation.set(0, 0, 0);
  copy.scale.set(1, 1, 1);
  // Bones carry the original's world matrices until updated: measure the copy as authored
  copy.updateMatrixWorld(true);
  copy.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const fresh = (m: Material) => {
      const c = m.clone();
      c.onBeforeCompile = MaterialBase.prototype.onBeforeCompile;
      c.customProgramCacheKey = MaterialBase.prototype.customProgramCacheKey;
      delete (c.userData as { ayeStyle?: unknown }).ayeStyle;
      return c;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(fresh) : fresh(mesh.material);
  });
  return copy;
}

export function Avatar({ controller, lookId, heightCm, styles, shape, skinTone = 0, skinToneId = DEFAULT_SKIN_TONE, skinColor, conversing = false, own = false, sitHeight, perch, hugSession = null, eating = false, shoeItemId = null, hairstyleItemId = null }: {
  controller: PlayerHandle;
  /** Use a private copy of the model (a picture of the character elsewhere), so styling it never touches the player's. */
  own?: boolean;
  /** Always seated on a seat this high (metres), e.g. at the wheel of a car. */
  sitHeight?: number;
  /** Seated for now on something, set frame by frame, e.g. on the edge of a bed; null when not. */
  perch?: { readonly current: Perch | null };
  /** Talking with a resident: the player talks and listens in turns while standing. */
  conversing?: boolean;
  hugSession?: HugSession | null;
  eating?: boolean;
  /** Build, muscle, curves and belly (lib/bodyShape.ts); average if omitted. */
  shape?: BodyShape;
  /** Deeper (to 1) or lighter (to -1) than the person's own skin; 0 keeps it. */
  skinTone?: number;
  /** Skin-only tint layered over the model's existing texture; original keeps its authored skin. */
  skinToneId?: SkinToneId;
  /** Optional player-selected colour layered over a complexion or source skin texture. */
  skinColor?: string;
  /** Fabrics and hair colour to wear (lib/fashion.ts); original clothes where a slot is empty. */
  styles?: Partial<Record<Slot, Style>>;
  /** Which person to show (lib/looks.ts); the default look if omitted. */
  lookId?: string;
  /** Standing height; the look's own height if omitted. */
  heightCm?: number;
  /** Visible shoe item (equipped or tried on); rendered when its model is available. */
  shoeItemId?: string | null;
  /** Visible 3D hairstyle item (equipped or tried on). */
  hairstyleItemId?: string | null;
}) {
  const group = useRef<Group>(null);
  // A character listed in public/assets/manifest.json replaces the built-in looks
  const avatarFile: AvatarFile = assetManifest().avatar ?? lookById(lookId);
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
  const playerBody = assetManifest().avatar !== null;
  const styledLook = playerBody ? null : lookById(lookId).id;

  const relaxed = useMemo(() => createRelaxedHands(scene, clipsWithHands), [scene, clipsWithHands]);
  const eatingBones = useMemo(() => ({
    upperArm: findRigBone(scene, 'rightUpperArm'),
    forearm: findRigBone(scene, 'rightForearm'),
    hand: findRigBone(scene, 'rightHand'),
  }), [scene]);
  const eatingStart = useRef<number | null>(null);
  const eatingWasActive = useRef(false);
  const eatingWeight = useRef(0);
  const eatingOffset = useRef(new Quaternion());
  const forearmOffset = useRef(new Quaternion());
  const handOffset = useRef(new Quaternion());

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
    const hugElapsed = hugSession ? Date.now() - hugSession.startedAt : -1;
    const embracing = hugSession !== null
      && hugElapsed >= hugSession.approachMs
      && hugElapsed < hugSession.approachMs + HUG_DURATION_MS;
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
    const perched = perch?.current ?? null;
    const seat = sitHeight !== undefined ? { height: sitHeight } : perched ? { height: perched.height } : getSeated();
    const sitting = !!seat && !!gestures.Sit;
    // Sitting down onto a bed's edge or standing up from it: the motion-captured transition, where this body has it
    const clipWindow = perched && perched.clip !== 'Sit' && body && gestures[perched.clip] ? SEAT_TRANSITIONS[body][perched.clip] : null;
    const seatClip = !sitting ? null : clipWindow && perched ? perched.clip : 'Sit';
    const transition = clipWindow && perched ? { ...clipWindow, rate: (clipWindow.to - clipWindow.from) / perched.seconds } : null;
    updateLocomotion(get, current, Math.hypot(controller.velocity.x, controller.velocity.z), avatarFile, gesture, mixer.time, seatClip, transition);
    const g = group.current;
    if (g) {
      // Lowered onto the seat once down on it: during a transition, as far as its body has gone
      const transitionAction = transition && seatClip ? gestures[seatClip as SeatTransition] : null;
      const progress = transitionAction && transition ? Math.min(1, Math.max(0, (transitionAction.time - transition.from) / (transition.to - transition.from))) : 1;
      const down = seatClip === 'StandUp' ? 1 - progress : progress;
      const drop = sitting && seat ? seatDrop(seat, targetHeight) * down : 0;
      // At a wheel, wait for the sitting pose rather than stand up through the roof
      g.visible = sitHeight === undefined || sitting;
      g.position.y += (drop - g.position.y) * Math.min(1, delta * 5);
    }
    relaxed.update(actions);
    if (eating && !eatingWasActive.current) eatingStart.current = mixer.time;
    if (!eating) eatingStart.current = null;
    eatingWasActive.current = eating;
    const targetEatingWeight = eating && eatingStart.current !== null
      ? 0.18 + 0.82 * (0.5 - 0.5 * Math.cos(((mixer.time - eatingStart.current) / 0.9) * Math.PI * 2))
      : 0;
    eatingWeight.current += (targetEatingWeight - eatingWeight.current) * Math.min(1, delta * 8);
    const cycle = eatingWeight.current;
    if (cycle > 0) {
      eatingOffset.current.identity().slerp(EAT_UPPER_ARM, cycle);
      forearmOffset.current.identity().slerp(EAT_FOREARM, cycle);
      handOffset.current.identity().slerp(EAT_HAND, cycle);
      eatingBones.upperArm?.quaternion.multiply(eatingOffset.current);
      eatingBones.forearm?.quaternion.multiply(forearmOffset.current);
      eatingBones.hand?.quaternion.multiply(handOffset.current);
    }
  });

  const garmentModel = shoeItemId ? getGarmentModel(shoeItemId) : null;
  const hairstyleModel = hairstyleItemId ? getGarmentModel(hairstyleItemId) : null;

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} scale={scale} />
      {styledLook && <OutfitStyler scene={scene} lookId={styledLook} styles={styles ?? NO_STYLES} skinTone={skinTone} skinToneId={skinToneId} skinColor={skinColor} />}
      {/* The CC5 body has no garment maps: its own clothes are recoloured, and a chosen swatch deepens or lightens its skin */}
      {playerBody && <Cc5Styler scene={scene} styles={styles ?? NO_STYLES} skinTone={Math.max(-1, Math.min(1, skinTone + skinToneDepth(skinToneId)))} />}
      {styles?.bag && <HeldBag scene={scene} style={styles.bag} />}
      {styles && (styles.neck || styles.ears || styles.wrist || styles.eyes || styles.nails || styles.rings) && <Adornments scene={scene} styles={styles} />}
      {body && <Gestures body={body} mixer={mixer} root={group} idle={idleClip} onLoad={setGestures} />}
      {garmentModel && <GarmentLayer groupRef={group} model={garmentModel} isEquipped />}
      {hairstyleModel && <GarmentLayer groupRef={group} model={hairstyleModel} isEquipped avatarScale={scale} />}
    </group>
  );
}
