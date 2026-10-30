import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Quaternion, Vector3 } from 'three';
import { getSeated, type PlayerHandle } from '../hooks/usePlayerController';
import type { Seat } from '../lib/seating';
import { groundHeightAt } from '../lib/world';
import type { Character } from './CharacterCreation';
import { Avatar } from './Avatar';
import { ErrorBoundary } from './ErrorBoundary';
import { resolveFashionItemId, resolveStyles, type Slot } from '../lib/fashion';
import { LOOKS } from '../lib/looks';
import { residentById, residentPosition } from '../lib/people';
import { SEAT_SECONDS, bedFrame, mattressTop, type Bedtime } from '../lib/bedSleep';
import type { Perch } from './Avatar';
import { HUG_DURATION_MS, hugPathPose, hugPositionBlend, hugSessionDurationMs, type HugSession } from '../lib/hug';

interface PlayerProps {
  controller: PlayerHandle;
  character?: Character;
  /** Items being tried on in the shop, shown instead of what's equipped (null = original). */
  tryOn?: Partial<Record<Slot, string | null>>;
  /** Talking with a resident (gestures in turns). */
  conversing?: boolean;
  conversationTarget?: string | null;
  hugSession?: HugSession | null;
  onHugComplete?: (residentId: string) => void;
  eating?: boolean;
  /** Going to bed or getting up (lib/bedSleep.ts): the body follows that timeline instead of the controls. */
  bedtime?: Bedtime | null;
}

const UP = new Vector3(0, 1, 0);
const yaw = new Quaternion();
const rollAxis = new Vector3();

/** If your own look can't be loaded: the first built-in person, so you're still a real person on screen. */
function DefaultPerson({ controller, sitHeight }: { controller: PlayerHandle; sitHeight?: number }) {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <Avatar controller={controller} lookId={LOOKS[0].id} sitHeight={sitHeight} />
      </Suspense>
    </ErrorBoundary>
  );
}

export function Player({
  controller,
  character,
  tryOn,
  conversing = false,
  conversationTarget = null,
  hugSession = null,
  onHugComplete,
  eating = false,
  bedtime = null,
}: PlayerProps) {
  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  /** On a bed's edge: its height and the clip for the moment (Avatar `perch`). */
  const perch = useRef<Perch | null>(null);
  const lastSeat = useRef<Seat | null>(null);
  const settle = useRef(0);
  const completedHug = useRef<string | null>(null);

  const equipped = character?.wardrobe.equipped;
  const colours = character?.wardrobe.colours;
  const styles = useMemo(() => resolveStyles(equipped ?? {}, tryOn, colours), [equipped, tryOn, colours]);
  const visibleShoeId = resolveFashionItemId(equipped ?? {}, tryOn, 'shoes');
  const visibleHairstyleId = resolveFashionItemId(equipped ?? {}, tryOn, 'hairstyle');

  useFrame((_, delta) => {
    // Update controller with frame delta (capped so a background tab can't teleport the player)
    if (bedtime) {
      // Turning about the pelvis: stepping to the bed, sitting on its edge, tipping over onto your side
      const f = bedFrame(bedtime.pose, (performance.now() - bedtime.startedAt) / 1000, bedtime.up, bedtime.from);
      const top = mattressTop(bedtime.bed);
      controller.velocity.set(0, 0, 0);
      perch.current = f.seated ? { height: top, clip: f.seated, seconds: SEAT_SECONDS } : null;
      const g = groupRef.current;
      if (g) {
        g.position.set(...f.pivot);
        yaw.setFromAxisAngle(UP, f.yaw);
        rollAxis.set(Math.cos(bedtime.pose.heading), 0, -Math.sin(bedtime.pose.heading));
        g.quaternion.setFromAxisAngle(rollAxis, f.roll).multiply(yaw);
      }
      bodyRef.current?.position.set(0, -(bedtime.pose.sitY - bedtime.pose.elevation), 0);
      return;
    }
    perch.current = null;
    bodyRef.current?.position.set(0, 0, 0);
    if (hugSession) {
      const elapsed = Date.now() - hugSession.startedAt;
      const blend = hugPositionBlend(elapsed, hugSession.approachMs);
      const reverse = elapsed >= hugSession.approachMs + HUG_DURATION_MS;
      const pose = hugPathPose(hugSession.playerFrom, hugSession.playerTarget, hugSession.playerPath, blend, reverse);
      const previousX = controller.position.x;
      const previousZ = controller.position.z;
      controller.moveToPose(
        pose.x,
        pose.z,
        pose.facing,
        1,
      );
      const seconds = Math.max(0.001, Math.min(delta, 0.1));
      controller.velocity.set(
        (controller.position.x - previousX) / seconds,
        0,
        (controller.position.z - previousZ) / seconds,
      );
      if (elapsed >= hugSessionDurationMs(hugSession.approachMs) && completedHug.current !== hugSession.residentId) {
        completedHug.current = hugSession.residentId;
        controller.velocity.set(0, 0, 0);
        onHugComplete?.(hugSession.residentId);
      }
    } else {
      completedHug.current = null;
      controller.applyMovement(Math.min(delta, 0.1));
    }
    const resident = conversationTarget ? residentById(conversationTarget) : undefined;
    if (conversing && resident) {
      const target = residentPosition(resident);
      controller.faceTowards(target.x, target.z, delta);
    }

    // Apply position and rotation to the visual group, standing on the pavement or road
    const g = groupRef.current;
    if (g) {
      const seat = getSeated();
      if (seat !== lastSeat.current) {
        // Sitting down or getting up moves the origin a little: glide there for a moment instead of jumping
        lastSeat.current = seat;
        settle.current = 0.8;
      }
      const { x, z } = controller.position;
      const y = groundHeightAt(x, z);
      if (settle.current > 0 && Math.hypot(g.position.x - x, g.position.z - z) < 2) {
        settle.current -= delta;
        const k = Math.min(1, delta * 8);
        g.position.set(g.position.x + (x - g.position.x) * k, y, g.position.z + (z - g.position.z) * k);
        const turn = Math.atan2(Math.sin(controller.direction - g.rotation.y), Math.cos(controller.direction - g.rotation.y));
        g.rotation.set(0, g.rotation.y + turn * k, 0);
      } else {
        g.position.set(x, y, z);
        g.rotation.set(0, controller.direction, 0);
      }
    }
  });

  // Nothing stands in for you while you load: a real person or no one
  return (
    <group ref={groupRef}>
      <group ref={bodyRef}>
        <ErrorBoundary fallback={<DefaultPerson controller={controller} />}>
          <Suspense fallback={null}>
            <Avatar
              controller={controller}
              lookId={character?.lookId}
              heightCm={character?.heightCm}
              styles={styles}
              shape={character?.shape}
              skinTone={character?.skinTone}
              skinToneId={character?.skinToneId}
              skinColor={character?.skinColor}
              conversing={conversing}
              hugSession={hugSession}
              eating={eating}
              shoeItemId={visibleShoeId}
              hairstyleItemId={visibleHairstyleId}
              perch={perch}
            />
          </Suspense>
        </ErrorBoundary>
      </group>
    </group>
  );
}
