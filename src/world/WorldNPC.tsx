import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import { Box3, Material, type Group, type Mesh } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { PlayerHandle } from '../hooks/usePlayerController';
import type { Slot, Style } from '../lib/fashion';
import { lookById, type Look } from '../lib/looks';
import { assetUrl } from '../lib/assetManifest';
import { conversationGesture, shouldWave, type Gesture } from '../lib/bodyLanguage';
import { SEAT_CONTACT_RATIO, type Seat } from '../lib/seating';
import { Gestures, type GestureActions } from '../components/Gestures';
import { OutfitStyler } from '../components/Avatar';
import { withRelaxedHands } from '../components/handPose';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { generateNpcAppearance } from '../lib/npcFashion';
import { applyBodyShape } from '../components/bodyShapeSkin';
import { GarmentLayer } from '../components/GarmentLoader';
import { getGarmentModel } from '../lib/fashion';

export type NPCPath = readonly (readonly [number, number, number])[];

export interface WorldNPCProps {
  /** Stable NPC key; derived from role, look and location if omitted. */
  npcId?: string;
  role?: string;
  lookId: string;
  position: readonly [number, number, number];
  facing?: number;
  player?: PlayerHandle;
  greetPlayer?: boolean;
  seat?: Seat;
  path?: NPCPath;
  pathKey?: string;
  loopPath?: boolean;
  walkSpeed?: number;
  onArrive?: () => void;
  styles?: Partial<Record<Slot, Style>>;
}

function segmentLengths(path: NPCPath): number[] {
  return path.slice(1).map((point, index) => {
    const previous = path[index];
    return Math.hypot(point[0] - previous[0], point[2] - previous[2]);
  });
}

function routePose(path: NPCPath, distance: number, lengths: readonly number[]) {
  let remaining = distance;
  for (let i = 0; i < lengths.length; i += 1) {
    const length = lengths[i];
    if (remaining <= length || i === lengths.length - 1) {
      const from = path[i];
      const to = path[i + 1];
      const t = length > 0 ? Math.min(1, remaining / length) : 1;
      return {
        position: [
          from[0] + (to[0] - from[0]) * t,
          from[1] + (to[1] - from[1]) * t,
          from[2] + (to[2] - from[2]) * t,
        ] as const,
        facing: Math.atan2(to[0] - from[0], to[2] - from[2]),
      };
    }
    remaining -= length;
  }
  return { position: path[0] ?? [0, 0, 0] as const, facing: 0 };
}

type AnimationState = 'idle' | 'walk' | Gesture;

interface NPCRoute {
  key: string;
  points: NPCPath;
  lengths: number[];
  length: number;
  distance: number;
  done: boolean;
}

function NPCModel({
  npcId,
  role = 'city resident',
  look,
  position,
  facing = 0,
  player,
  greetPlayer = false,
  seat,
  path,
  pathKey,
  loopPath = false,
  walkSpeed = 0.9,
  onArrive,
  styles,
}: WorldNPCProps & { look: Look }) {
  const { scene, animations } = useGLTF(assetUrl(look.url), false, true);
  const appearance = useMemo(
    () => generateNpcAppearance(
      npcId ?? `world:${role}:${look.id}:${position.join(',')}`,
      role,
      look.body === 'feminine',
    ),
    [npcId, role, look.id, look.body, position],
  );
  const root = useRef<Group>(null);
  const rig = useRef<Group>(null);
  const route = useRef<NPCRoute | null>(null);
  const lastPosition = useRef(position);
  const state = useRef<AnimationState | null>(null);
  const heading = useRef(facing);
  const wasNear = useRef(false);
  const lastWave = useRef(-Infinity);
  const waveUntil = useRef(0);
  const conversationStart = useRef<number | null>(null);
  const [gestures, setGestures] = useState<GestureActions>({});
  const setGestureActions = useCallback((actions: GestureActions) => setGestures(actions), []);

  const figure = useMemo(() => {
    const copy = cloneSkinned(scene);
    copy.position.set(0, 0, 0);
    copy.rotation.set(0, 0, 0);
    copy.scale.set(1, 1, 1);
    copy.updateMatrixWorld(true);
    copy.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      const cloneMaterial = (material: Material) => {
        const copyMaterial = material.clone();
        copyMaterial.onBeforeCompile = Material.prototype.onBeforeCompile;
        copyMaterial.customProgramCacheKey = Material.prototype.customProgramCacheKey;
        delete (copyMaterial.userData as { ayeStyle?: unknown }).ayeStyle;
        return copyMaterial;
      };
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(cloneMaterial)
        : cloneMaterial(mesh.material);
    });
    return copy;
  }, [scene]);
  const scale = useMemo(() => {
    const box = new Box3().setFromObject(figure);
    const height = box.max.y - box.min.y;
    return height > 0 ? look.height / height : 1;
  }, [figure, look.height]);
  useEffect(() => applyBodyShape(figure, appearance.shape), [figure, appearance.shape]);
  const clips = useMemo(() => withRelaxedHands(animations), [animations]);
  const { actions, mixer } = useAnimations(clips, rig);
  const idleClip = useMemo(() => clips.find((clip) => /idle|stand/i.test(clip.name)), [clips]);
  const idleName = idleClip?.name;
  const walkName = useMemo(() => clips.find((clip) => /walk/i.test(clip.name))?.name, [clips]);
  const lengths = useMemo(() => path ? segmentLengths(path) : [], [path]);
  const routeLength = useMemo(() => lengths.reduce((total, length) => total + length, 0), [lengths]);
  const bodyDrop = seat ? seat.height - SEAT_CONTACT_RATIO * look.height : 0;

  useEffect(() => {
    return () => {
      for (const action of Object.values(actions)) action?.stop();
    };
  }, [actions]);

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.1);
    let currentPosition = position;
    let currentFacing = facing;
    let walking = false;

    if (path && path.length > 1 && routeLength > 0) {
      const key = pathKey ?? path.map((point) => point.join(',')).join(';');
      if (route.current?.key !== key) {
        const start = lastPosition.current;
        const first = path[0];
        const gap = Math.hypot(start[0] - first[0], start[2] - first[2]);
        const points: NPCPath = gap > 0.05 ? [start, ...path] : path;
        const routeLengths = segmentLengths(points);
        route.current = {
          key,
          points,
          lengths: routeLengths,
          length: routeLengths.reduce((total, length) => total + length, 0),
          distance: 0,
          done: false,
        };
      }
      const activeRoute = route.current;
      if (!activeRoute.done) {
        activeRoute.distance += walkSpeed * step;
        if (activeRoute.distance >= activeRoute.length) {
          activeRoute.distance = loopPath ? activeRoute.distance % activeRoute.length : activeRoute.length;
          if (!loopPath) onArrive?.();
          activeRoute.done = !loopPath;
        }
      }
      const pose = routePose(activeRoute.points, activeRoute.distance, activeRoute.lengths);
      currentPosition = pose.position;
      currentFacing = pose.facing;
      walking = !activeRoute.done;
    }

    const near = !!(greetPlayer && player
      && Math.hypot(player.position.x - currentPosition[0], player.position.z - currentPosition[2]) < 3.2);
    if (near && conversationStart.current === null) conversationStart.current = mixer.time;
    if (!near) conversationStart.current = null;
    const justNoticed = near && !wasNear.current;
    wasNear.current = near;
    if (gestures.Wave && shouldWave(justNoticed, near, mixer.time - lastWave.current)) {
      lastWave.current = mixer.time;
      waveUntil.current = mixer.time + gestures.Wave.getClip().duration;
    }

    const desiredFacing = near && player
      ? Math.atan2(player.position.x - currentPosition[0], player.position.z - currentPosition[2])
      : currentFacing;
    const turn = Math.atan2(Math.sin(desiredFacing - heading.current), Math.cos(desiredFacing - heading.current));
    heading.current += turn * Math.min(1, step * 6);
    lastPosition.current = currentPosition;
    root.current?.position.set(currentPosition[0], currentPosition[1], currentPosition[2]);
    if (rig.current) {
      rig.current.rotation.y = heading.current;
      rig.current.position.y += ((seat ? bodyDrop : 0) - rig.current.position.y) * Math.min(1, step * 5);
    }

    const nextState: AnimationState = seat && gestures.Sit
      ? 'Sit'
      : walking && walkName
        ? 'walk'
        : near && mixer.time < waveUntil.current && gestures.Wave
          ? 'Wave'
          : near && conversationStart.current !== null
            ? conversationGesture('resident', mixer.time - conversationStart.current)
            : 'idle';

    if (nextState !== state.current) {
      const getAction = (animation: AnimationState | null) => {
        if (!animation) return null;
        if (animation === 'idle') return idleName ? actions[idleName] : null;
        if (animation === 'walk') return walkName ? actions[walkName] : null;
        return gestures[animation] ?? null;
      };
      const previous = getAction(state.current);
      const next = getAction(nextState);
      next?.reset().fadeIn(nextState === 'Sit' || state.current === 'Sit' ? 0.6 : 0.3).play();
      previous?.fadeOut(nextState === 'Sit' || state.current === 'Sit' ? 0.6 : 0.3);
      state.current = nextState;
    }
  });

  return (
    <group ref={root} position={position} dispose={null}>
      <group ref={rig} rotation={[0, facing, 0]}>
        <primitive object={figure} scale={scale} />
        <OutfitStyler scene={figure} lookId={look.id} styles={styles ?? appearance.styles} skinToneId={appearance.skinTone} />
        {!styles && appearance.hairstyleItemId && getGarmentModel(appearance.hairstyleItemId) && (
          <GarmentLayer
            groupRef={rig}
            model={getGarmentModel(appearance.hairstyleItemId)!}
            isEquipped
            avatarScale={scale}
          />
        )}
      </group>
      <Gestures body={look.body} mixer={mixer} root={rig} idle={idleClip} onLoad={setGestureActions} />
    </group>
  );
}

export function WorldNPC(props: WorldNPCProps) {
  const look = lookById(props.lookId);
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <NPCModel {...props} look={look} />
      </Suspense>
    </ErrorBoundary>
  );
}
