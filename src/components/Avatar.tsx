import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF, useTexture } from '@react-three/drei';
import { Box3, Euler, NoColorSpace, Quaternion, type AnimationAction, type Group, type Mesh, type Object3D } from 'three';
import { getSeated, type PlayerHandle } from '../hooks/usePlayerController';
import { seatDrop } from '../lib/seating';

import { assetManifest, assetUrl, type AvatarFile } from '../lib/assetManifest';
import { lookById } from '../lib/looks';
import type { Slot, Style } from '../lib/fashion';
import { applySkinTone, applyStyles, installStyleShader, type StyleUniforms } from './outfitShader';
import { applyBodyShape } from './bodyShapeSkin';
import { createRelaxedHands } from './relaxedHands';
import { withRelaxedHands } from './handPose';
import { Gestures, type GestureActions } from './Gestures';
import { conversationGesture, type Gesture } from '../lib/bodyLanguage';
import { AVERAGE_SHAPE, type BodyShape } from '../lib/bodyShape';
import { HUG_DURATION_MS, type HugSession } from '../lib/hug';
import { GarmentLayer } from './GarmentLoader';
import { getGarmentModel } from '../lib/fashion';
import { DEFAULT_SKIN_TONE, isSkinColor, skinToneById, type SkinToneId } from '../lib/skinTone';
import { findRigBone } from '../lib/characterRig';

const maskUrl = (lookId: string, part: 'body' | 'head') => assetUrl(`models/characters/rocketbox/masks/${lookId}-${part}.png`);
const EAT_UPPER_ARM = new Quaternion().setFromEuler(new Euler(-0.16, 0.05, -0.82));
const EAT_FOREARM = new Quaternion().setFromEuler(new Euler(-0.08, 0, -1.05));
const EAT_HAND = new Quaternion().setFromEuler(new Euler(0, 0, -0.22));

interface OutfitStylerProps {
  scene: Object3D;
  lookId: string;
  styles: Partial<Record<Slot, Style>>;
  skinTone?: SkinToneId;
  skinColor?: string;
}

/** Applies fabrics, hair colour and skin tint using the look's garment maps (built-in looks only). */
export function OutfitStyler({ scene, lookId, styles, skinTone = DEFAULT_SKIN_TONE, skinColor }: OutfitStylerProps) {
  const [bodyMask, headMask] = useTexture([maskUrl(lookId, 'body'), maskUrl(lookId, 'head')]);
  const materials = useMemo(() => {
    const list: { uniforms: StyleUniforms }[] = [];
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
        if (u && /_(body|head)$/i.test(mat.name)) {
          list.push({ uniforms: u });
        }
      }
    });
    return list;
  }, [scene, bodyMask, headMask]);
  useEffect(() => {
    const tone = skinToneById(skinTone);
    const color = isSkinColor(skinColor) ? skinColor : tone.color;
    for (const { uniforms } of materials) {
      applyStyles(uniforms, styles);
      applySkinTone(uniforms, color, skinTone !== 'original');
    }
  }, [materials, styles, skinTone, skinColor]);
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
  const next: State = sitting ? 'Sit' : gesture === 'Hug' && get('Hug') ? 'Hug' : speed < 0.35 ? (gesture && get(gesture) ? gesture : 'Idle') : speed < 3.2 ? 'Walk' : 'Run';
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

/**
 * Rigged, animated human: one of the looks in lib/looks.ts (see public/assets/CREDITS.md). Picks idle / walk /
 * run from the player's speed and cross-fades between them.
 */
export function Avatar({ controller, lookId, heightCm, styles, shape, skinTone = DEFAULT_SKIN_TONE, skinColor, conversing = false, hugSession = null, eating = false, shoeItemId = null, hairstyleItemId = null }: {
  controller: PlayerHandle;
  /** Talking with a resident: the player talks and listens in turns while standing. */
  conversing?: boolean;
  hugSession?: HugSession | null;
  eating?: boolean;
  /** Build, muscle, curves and belly (lib/bodyShape.ts); average if omitted. */
  shape?: BodyShape;
  /** Skin-only tint layered over the model's existing texture; original keeps its authored skin. */
  skinTone?: SkinToneId;
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
  const { scene, animations } = useGLTF(assetUrl(avatarFile.url), false, true);
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
  // Garment maps exist only for the built-in looks, not for a model listed in the asset manifest
  const styledLook = assetManifest().avatar ? null : lookById(lookId).id;

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

  // Gestures (talk, listen) arrive in their own file after the person is on screen
  const [gestures, setGestures] = useState<GestureActions>({});
  const body = assetManifest().avatar ? null : lookById(lookId).body;
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
    const seat = getSeated();
    const sitting = !!seat && !!gestures.Sit;
    updateLocomotion(get, current, Math.hypot(controller.velocity.x, controller.velocity.z), avatarFile, gesture, mixer.time, sitting);
    const g = group.current;
    if (g) {
      const drop = sitting ? seatDrop(seat, targetHeight) : 0;
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
      {styledLook && <OutfitStyler scene={scene} lookId={styledLook} styles={styles ?? {}} skinTone={skinTone} skinColor={skinColor} />}
      {body && <Gestures body={body} mixer={mixer} root={group} idle={idleClip} onLoad={setGestures} />}
      {garmentModel && <GarmentLayer groupRef={group} model={garmentModel} isEquipped />}
      {hairstyleModel && <GarmentLayer groupRef={group} model={hairstyleModel} isEquipped avatarScale={scale} />}
    </group>
  );
}
