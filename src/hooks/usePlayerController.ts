import { useEffect } from 'react';
import { Vector3 } from 'three';
import { resolveCollisions } from '../lib/world';
import { movementIntent, type StickInput } from '../lib/movementInput';
import { CURRENT_DISTRICT } from '../lib/geography';

export interface PlayerHandle {
  position: Vector3;
  direction: number;
  velocity: Vector3;
  applyMovement: (delta: number) => void;
}

const MOVE_KEYS = ['w', 'a', 's', 'd', ' ', 'shift'];

/** Metres per second. W jogs; holding Shift walks. Chosen so the motion-captured
 * strides play at about 1.4x their recorded rate rather than sliding. */
export const RUN_SPEED = 4.2;
export const WALK_SPEED = 1.4;
const keysPressed: Record<string, boolean> = {};
const stick: StickInput = { forward: 0, turn: 0 };

const playerHandle: PlayerHandle = {
  position: new Vector3(...CURRENT_DISTRICT.spawn),
  direction: 0,
  velocity: new Vector3(),
  applyMovement: (delta: number) => {
    const intent = movementIntent(keysPressed, stick);
    const moveSpeed = intent.walk ? WALK_SPEED : RUN_SPEED;
    const rotationSpeed = 3; // radians per second
    const acceleration = 6;
    const damping = 0.92;

    // Forward matches the model's facing: rotation.y = θ points local +Z at (sin θ, cos θ).
    const forwardX = Math.sin(playerHandle.direction);
    const forwardZ = Math.cos(playerHandle.direction);

    // Target velocity from input; a half-pushed stick moves at half speed
    const targetVelX = forwardX * moveSpeed * intent.forward;
    const targetVelZ = forwardZ * moveSpeed * intent.forward;

    // Smooth acceleration toward target
    playerHandle.velocity.x += (targetVelX - playerHandle.velocity.x) * acceleration * delta;
    playerHandle.velocity.z += (targetVelZ - playerHandle.velocity.z) * acceleration * delta;

    // Damping when no input
    if (intent.forward === 0) {
      playerHandle.velocity.x *= damping;
      playerHandle.velocity.z *= damping;
    }

    // Rotation
    playerHandle.direction += rotationSpeed * intent.turn * delta;

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
  stick.forward = 0;
  stick.turn = 0;
}

let inputBlocked = false;
/** Stops movement keys while a menu is open, so the player doesn't walk off mid-order. */
export function setMovementBlocked(blocked: boolean) {
  inputBlocked = blocked;
  if (blocked) releaseAllKeys();
}

/** Analog input from the on-screen stick; pass zeros when the thumb lifts. */
export function setStickInput(input: StickInput) {
  stick.forward = inputBlocked ? 0 : input.forward;
  stick.turn = inputBlocked ? 0 : input.turn;
}

export function usePlayerController(): PlayerHandle {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't steer the character while typing in a form field
      if (inputBlocked || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
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
