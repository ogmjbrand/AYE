import { useEffect } from 'react';
import { Vector3 } from 'three';

export interface PlayerHandle {
  position: Vector3;
  direction: number;
  velocity: Vector3;
  applyMovement: (delta: number) => void;
}

const keysPressed: Record<string, boolean> = {};

const playerHandle: PlayerHandle = {
  position: new Vector3(1.5, 0, 2),
  direction: 0,
  velocity: new Vector3(),
  applyMovement: (delta: number) => {
    const moveSpeed = 15; // units per second
    const rotationSpeed = 3; // radians per second
    const acceleration = 2.5;
    const damping = 0.92;

    // Target velocity from input
    let targetVelX = 0;
    let targetVelZ = 0;

    if (keysPressed['w']) {
      targetVelX += Math.cos(playerHandle.direction) * moveSpeed;
      targetVelZ += Math.sin(playerHandle.direction) * moveSpeed;
    }
    if (keysPressed['s']) {
      targetVelX -= Math.cos(playerHandle.direction) * moveSpeed;
      targetVelZ -= Math.sin(playerHandle.direction) * moveSpeed;
    }

    // Smooth acceleration toward target
    playerHandle.velocity.x += (targetVelX - playerHandle.velocity.x) * acceleration * delta;
    playerHandle.velocity.z += (targetVelZ - playerHandle.velocity.z) * acceleration * delta;

    // Damping when no input
    if (!keysPressed['w'] && !keysPressed['s']) {
      playerHandle.velocity.x *= damping;
      playerHandle.velocity.z *= damping;
    }

    // Rotation
    if (keysPressed['a']) {
      playerHandle.direction += rotationSpeed * delta;
    }
    if (keysPressed['d']) {
      playerHandle.direction -= rotationSpeed * delta;
    }

    // Apply movement
    playerHandle.position.x += playerHandle.velocity.x * delta;
    playerHandle.position.z += playerHandle.velocity.z * delta;

    // Keep player in world bounds
    const maxBound = 45;
    playerHandle.position.x = Math.max(-maxBound, Math.min(maxBound, playerHandle.position.x));
    playerHandle.position.z = Math.max(-maxBound, Math.min(maxBound, playerHandle.position.z));
  },
};

export function usePlayerController(): PlayerHandle {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', ' '].includes(key)) {
        keysPressed[key] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', ' '].includes(key)) {
        keysPressed[key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return playerHandle;
}
