import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import { Box3, CanvasTexture, Material, SRGBColorSpace, type Group, type Mesh } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { assetUrl } from '../lib/assetManifest';
import { lookById } from '../lib/looks';
import { NOTICE_RADIUS, STROLL_SPEED, residentPose, residentsIn, setLivePosition, type Resident } from '../lib/people';
import { HUG_DURATION_MS, hugPathPose, hugPositionBlend } from '../lib/hug';
import { pedestrianInTrafficPath, trafficSnapshot } from '../lib/traffic';
import type { PlayerHandle } from '../hooks/usePlayerController';
import { groundHeightAt } from '../lib/world';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useDistrict } from './DistrictContext';
import { withRelaxedHands } from '../components/handPose';
import { Gestures, type GestureActions } from '../components/Gestures';
import { conversationGesture, shouldWave, type Gesture } from '../lib/bodyLanguage';
import type { HugSession } from '../lib/hug';
import { generateNpcAppearance } from '../lib/npcFashion';
import { applyBodyShape } from '../components/bodyShapeSkin';
import { OutfitStyler } from '../components/Avatar';
import { GarmentLayer } from '../components/GarmentLoader';
import { getGarmentModel } from '../lib/fashion';

/** Name tag above a resident: their name and that they are a computer-controlled resident. */
function nameTag(name: string) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(21,24,28,0.78)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 144, 36);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f1ede6';
  ctx.font = "700 56px Manrope, 'DM Sans', sans-serif";
  ctx.fillText(name, 256, 74);
  ctx.fillStyle = '#a4a7ad';
  ctx.font = "500 34px 'DM Sans', sans-serif";
  ctx.fillText('Resident · computer-controlled', 256, 124);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function ResidentFigure({ resident, player, talkingTo, hugSession }: {
  resident: Resident;
  player: PlayerHandle;
  talkingTo: string | null;
  hugSession: HugSession | null;
}) {
  const look = lookById(resident.lookId);
  const appearance = useMemo(
    () => generateNpcAppearance(resident.id, resident.role, look.body === 'feminine'),
    [resident.id, resident.role, look.body],
  );
  const { scene, animations } = useGLTF(assetUrl(look.url), false, true);
  const group = useRef<Group>(null);
  // Own copy of the person: the player may be wearing the same look, with its own clothes and shape
  const figure = useMemo(() => {
    const copy = cloneSkinned(scene);
    // The shared original may already be scaled and placed for the player; measure the copy as authored
    copy.position.set(0, 0, 0);
    copy.rotation.set(0, 0, 0);
    copy.scale.set(1, 1, 1);
    copy.updateMatrixWorld(true);
    copy.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      const fresh = (m: Material) => {
        const c = m.clone();
        // Original clothes: drop any restyling shader the shared material carries
        c.onBeforeCompile = Material.prototype.onBeforeCompile;
        c.customProgramCacheKey = Material.prototype.customProgramCacheKey;
        delete (c.userData as { ayeStyle?: unknown }).ayeStyle;
        return c;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(fresh) : fresh(mesh.material);
    });
    return copy;
  }, [scene]);
  const scale = useMemo(() => {
    const box = new Box3().setFromObject(figure);
    const h = box.max.y - box.min.y;
    return h > 0 ? look.height / h : 1;
  }, [figure, look.height]);
  useEffect(() => applyBodyShape(figure, appearance.shape), [figure, appearance.shape]);
  const clipsWithHands = useMemo(() => withRelaxedHands(animations), [animations]);
  const { actions, names, mixer } = useAnimations(clipsWithHands, group);
  const clips = useMemo(() => ({
    idle: names.find((n) => /idle|stand/i.test(n)) ?? names[0],
    walk: names.find((n) => /walk/i.test(n)),
  }), [names]);
  const state = useRef<'idle' | 'walk' | Gesture>('idle');
  const [gestures, setGestures] = useState<GestureActions>({});
  const idleClip = useMemo(() => clipsWithHands.find((c) => c.name === clips.idle), [clipsWithHands, clips]);
  const wasNear = useRef(false);
  const lastWave = useRef(-Infinity);
  const waveUntil = useRef(0);
  const conversationStart = useRef<number | null>(null);
  useEffect(() => {
    const idle = clips.idle ? actions[clips.idle] : null;
    // Start each resident at a different point of the loop so they don't move in sync
    idle?.reset().startAt(-((resident.id.length * 0.37) % 2)).play();
    const walk = clips.walk ? actions[clips.walk] : null;
    // Play the stride at the rate that matches their strolling speed
    walk?.setEffectiveTimeScale(STROLL_SPEED / look.walkSpeed);
    return () => { idle?.stop(); walk?.stop(); };
  }, [actions, clips, resident.id, look.walkSpeed]);
  const tag = useMemo(() => nameTag(resident.name), [resident.name]);

  // Their own clock only runs while you're not with them, so they stop when you come over
  const root = useRef<Group>(null);
  const clock = useRef((resident.id.charCodeAt(0) % 7) * 1.7);
  const heading = useRef(resident.facing);
  useFrame((_, dt) => {
    const step = Math.min(dt, 0.1);
    const here = residentPose(resident, clock.current);
    const activeHug = hugSession?.residentId === resident.id ? hugSession : null;
    const near = Math.hypot(player.position.x - here.x, player.position.z - here.z) < NOTICE_RADIUS;
    const next = residentPose(resident, clock.current + step);
    const traffic = trafficSnapshot();
    const threatened = next.moving && pedestrianInTrafficPath({
      x: here.x,
      z: here.z,
      vx: (next.x - here.x) / step,
      vz: (next.z - here.z) / step,
    }, traffic.cars, traffic.lanes);
    if (!near && !threatened && !activeHug) clock.current += step;
    const hugElapsed = activeHug ? Date.now() - activeHug.startedAt : 0;
    const hugBlend = activeHug ? hugPositionBlend(hugElapsed, activeHug.approachMs) : 0;
    const hugReleasing = activeHug !== null && hugElapsed >= activeHug.approachMs + HUG_DURATION_MS;
    const hugWalking = activeHug !== null && (hugElapsed < activeHug.approachMs || hugReleasing);
    const pose = activeHug
      ? {
        ...hugPathPose(
          activeHug.residentFrom,
          activeHug.residentTarget,
          activeHug.residentPath,
          hugBlend,
          hugReleasing,
        ),
        moving: hugWalking,
      }
      : near ? { ...here, moving: false } : residentPose(resident, clock.current);
    const want = activeHug ? pose.facing : near ? Math.atan2(player.position.x - pose.x, player.position.z - pose.z) : pose.facing;
    // Turn smoothly along the shortest way round
    const diff = Math.atan2(Math.sin(want - heading.current), Math.cos(want - heading.current));
    heading.current += diff * Math.min(1, step * 6);
    root.current?.position.set(pose.x, groundHeightAt(pose.x, pose.z), pose.z);
    if (group.current) group.current.rotation.y = heading.current;
    setLivePosition(resident.id, pose.x, pose.z, heading.current);
    // Body language: a wave when you come over, then talking and listening in turns while you chat
    const inConversation = talkingTo === resident.id;
    if (inConversation && conversationStart.current === null) conversationStart.current = mixer.time;
    if (!inConversation) conversationStart.current = null;
    const justNoticed = near && !wasNear.current;
    wasNear.current = near;
    if (gestures.Wave && shouldWave(justNoticed, inConversation, mixer.time - lastWave.current)) {
      lastWave.current = mixer.time;
      waveUntil.current = mixer.time + gestures.Wave.getClip().duration;
    }
    const gesture: Gesture | null = activeHug && !hugWalking
      ? 'Hug'
      : conversationStart.current !== null
      ? conversationGesture('resident', mixer.time - conversationStart.current)
      : mixer.time < waveUntil.current ? 'Wave' : null;
    const anim = pose.moving && clips.walk ? 'walk' : gesture && gestures[gesture] ? gesture : 'idle';
    if (anim !== state.current) {
      const get = (s: typeof anim) => (s === 'idle' ? (clips.idle ? actions[clips.idle] : null) : s === 'walk' ? (clips.walk ? actions[clips.walk] : null) : gestures[s]);
      const to = get(anim);
      to?.reset();
      // Long takes: join them part-way through so turns don't repeat the same opening
      if (anim === 'Talk' || anim === 'Listen') to?.startAt(mixer.time - ((resident.id.length * 3.1 + mixer.time) % 15));
      to?.fadeIn(0.35).play();
      get(state.current)?.fadeOut(0.35);
      state.current = anim;
    }
  });
  const [x, , z] = resident.position;

  return (
    <group ref={root} position={[x, groundHeightAt(x, z), z]}>
      <group ref={group} rotation={[0, resident.facing, 0]}>
        <primitive object={figure} scale={scale} />
        <OutfitStyler scene={figure} lookId={look.id} styles={appearance.styles} skinTone={appearance.skinTone} />
        {appearance.hairstyleItemId && getGarmentModel(appearance.hairstyleItemId) && (
          <GarmentLayer
            groupRef={group}
            model={getGarmentModel(appearance.hairstyleItemId)!}
            isEquipped
            avatarScale={scale}
          />
        )}
      </group>
      <Gestures body={look.body} mixer={mixer} root={group} idle={idleClip} onLoad={setGestures} />
      <sprite position={[0, look.height + 0.35, 0]} scale={[0.9, 0.28, 1]}>
        <spriteMaterial map={tag} depthWrite={false} transparent />
      </sprite>
    </group>
  );
}

/** The residents of the current district, strolling their usual routes. */
export function Residents({ player, talkingTo = null, hugSession = null }: {
  player: PlayerHandle;
  talkingTo?: string | null;
  hugSession?: HugSession | null;
}) {
  const district = useDistrict();
  const people = residentsIn(district.id);
  return (
    <>
      {people.map((r) => (
        <ErrorBoundary key={r.id} fallback={null}>
          <Suspense fallback={null}>
            <ResidentFigure resident={r} player={player} talkingTo={talkingTo} hugSession={hugSession} />
          </Suspense>
        </ErrorBoundary>
      ))}
    </>
  );
}
