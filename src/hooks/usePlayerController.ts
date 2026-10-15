import { useEffect } from 'react';
import { Vector3 } from 'three';
import { resolveCollisions } from '../lib/world';

export interface PlayerHandle {
  position: Vector3;
  direction: number;
  velocity: Vector3;
  applyMovement: (delta: number) => void;
}

const MOVE_KEYS = ['w', 'a', 's', 'd', ' '];
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

    // Forward matches the model's facing: rotation.y = θ points local +Z at (sin θ, cos θ).
    const forwardX = Math.sin(playerHandle.direction);
    const forwardZ = Math.cos(playerHandle.direction);

    // Target velocity from input
    let targetVelX = 0;
    let targetVelZ = 0;

    if (keysPressed['w']) {
      targetVelX += forwardX * moveSpeed;
      targetVelZ += forwardZ * moveSpeed;
    }
    if (keysPressed['s']) {
      targetVelX -= forwardX * moveSpeed;
      targetVelZ -= forwardZ * moveSpeed;
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

    // Move, then push out of buildings and keep inside the world bounds
    const prevX = playerHandle.position.x;
    const prevZ = playerHandle.position.z;
    const resolved = resolveCollisions(
      prevX + playerHandle.velocity.x * delta,
      prevZ + playerHandle.velocity.z * delta,
    );
    playerHandle.position.x = resolved.x;
    playerHandle.position.z = resolved.z;

    // Lose the speed that was absorbed by a wall so the player doesn't "stick" to it
    if (delta > 0) {
      playerHandle.velocity.x = (resolved.x - prevX) / delta;
      playerHandle.velocity.z = (resolved.z - prevZ) / delta;
    }
  },
};

function releaseAllKeys() {
  for (const key of MOVE_KEYS) keysPressed[key] = false;
}

export function usePlayerController(): PlayerHandle {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't steer the character while typing in a form field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (MOVE_KEYS.includes(key)) {
        keysPressed[key] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (MOVE_KEYS.includes(key)) {
        keysPressed[key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    // A key released while the window is unfocused never fires keyup
    window.addEventListener('blur', releaseAllKeys);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', releaseAllKeys);
      releaseAllKeys();
    };
  }, []);

  return playerHandle;
}
