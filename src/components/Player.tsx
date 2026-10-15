import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { Group } from 'three';
import type { PlayerHandle } from '../hooks/usePlayerController';
import type { Character } from './CharacterCreation';

interface PlayerProps {
  controller: PlayerHandle;
  character?: Character;
}

export function Player({ controller, character }: PlayerProps) {
  const groupRef = useRef<Group>(null);

  const bodyColor = character
    ? `rgb(${character.colorR}, ${character.colorG}, ${character.colorB})`
    : '#252a33';

  useFrame((_, delta) => {
    // Update controller with frame delta
    controller.applyMovement(delta);

    // Apply position and rotation to the visual group
    if (groupRef.current) {
      groupRef.current.position.copy(controller.position);
      groupRef.current.rotation.y = controller.direction;
    }
  });

  return (
    <RigidBody
      type="kinematicPosition"
      position={[controller.position.x, controller.position.y, controller.position.z]}
      rotation={[0, controller.direction, 0]}
    >
      <CapsuleCollider args={[0.325, 0.28]} />
      <group ref={groupRef}>
        {/* Body */}
        <mesh position={[0, 0.9, 0]} castShadow>
          <capsuleGeometry args={[0.28, 0.65, 4, 8]} />
          <meshStandardMaterial color={bodyColor} roughness={0.8} />
        </mesh>

        {/* Head */}
        <mesh position={[0, 1.65, 0]} castShadow>
          <sphereGeometry args={[0.22, 12, 10]} />
          <meshStandardMaterial color="#8b593e" roughness={0.8} />
        </mesh>

        {/* Direction indicator */}
        <mesh position={[0, 1.65, 0.25]} scale={0.08}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial color="#f5e7bd" roughness={0.5} />
        </mesh>
      </group>
    </RigidBody>
  );
}
