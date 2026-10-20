import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { getSeated, type PlayerHandle } from '../hooks/usePlayerController';
import type { Seat } from '../lib/seating';
import { groundHeightAt } from '../lib/world';
import type { Character } from './CharacterCreation';
import { Avatar } from './Avatar';
import { ErrorBoundary } from './ErrorBoundary';
import { resolveStyles, type Slot } from '../lib/fashion';
import { residentById, residentPosition } from '../lib/people';
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
}

/** Simple capsule figure: shown while the avatar loads, or if it fails to load. */
function CapsuleFigure({ color }: { color: string }) {
  return (
    <>
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.28, 0.65, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.65, 0]} castShadow>
        <sphereGeometry args={[0.22, 12, 10]} />
        <meshStandardMaterial color="#8b593e" roughness={0.8} />
      </mesh>
    </>
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
}: PlayerProps) {
  const groupRef = useRef<Group>(null);
  const lastSeat = useRef<Seat | null>(null);
  const settle = useRef(0);
  const completedHug = useRef<string | null>(null);

  const bodyColor = character
    ? `rgb(${character.colorR}, ${character.colorG}, ${character.colorB})`
    : '#252a33';

  const equipped = character?.wardrobe.equipped;
  const styles = useMemo(() => resolveStyles(equipped ?? {}, tryOn), [equipped, tryOn]);

  useFrame((_, delta) => {
    // Update controller with frame delta (capped so a background tab can't teleport the player)
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
        g.rotation.y += turn * k;
      } else {
        g.position.set(x, y, z);
        g.rotation.y = controller.direction;
      }
    }
  });

  const fallback = <CapsuleFigure color={bodyColor} />;
  return (
    <group ref={groupRef}>
      <ErrorBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <Avatar
            controller={controller}
            lookId={character?.lookId}
            heightCm={character?.heightCm}
            styles={styles}
            shape={character?.shape}
            conversing={conversing}
            hugSession={hugSession}
            eating={eating}
          />
        </Suspense>
      </ErrorBoundary>
    </group>
  );
}
