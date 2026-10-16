import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import type { PlayerHandle } from '../hooks/usePlayerController';
import { groundHeightAt } from '../lib/world';
import type { Character } from './CharacterCreation';
import { Avatar } from './Avatar';
import { ErrorBoundary } from './ErrorBoundary';
import { resolveStyles, type Slot } from '../lib/fashion';

interface PlayerProps {
  controller: PlayerHandle;
  character?: Character;
  /** Items being tried on in the shop, shown instead of what's equipped (null = original). */
  tryOn?: Partial<Record<Slot, string | null>>;
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

export function Player({ controller, character, tryOn }: PlayerProps) {
  const groupRef = useRef<Group>(null);

  const bodyColor = character
    ? `rgb(${character.colorR}, ${character.colorG}, ${character.colorB})`
    : '#252a33';

  const equipped = character?.wardrobe.equipped;
  const styles = useMemo(() => resolveStyles(equipped ?? {}, tryOn), [equipped, tryOn]);

  useFrame((_, delta) => {
    // Update controller with frame delta (capped so a background tab can't teleport the player)
    controller.applyMovement(Math.min(delta, 0.1));

    // Apply position and rotation to the visual group, standing on the pavement or road
    if (groupRef.current) {
      groupRef.current.position.set(
        controller.position.x,
        groundHeightAt(controller.position.x, controller.position.z),
        controller.position.z,
      );
      groupRef.current.rotation.y = controller.direction;
    }
  });

  const fallback = <CapsuleFigure color={bodyColor} />;
  return (
    <group ref={groupRef}>
      <ErrorBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <Avatar controller={controller} lookId={character?.lookId} heightCm={character?.heightCm} styles={styles} />
        </Suspense>
      </ErrorBoundary>
    </group>
  );
}
