import { useEffect } from 'react';
import { Vector3 } from 'three';
import { resolveCollisions } from '../lib/world';
import { movementIntent, type StickInput } from '../lib/movementInput';
import { STUCK_SECONDS, steerTowards, type MoveTarget } from '../lib/clickToMove';
import { DEFAULT_DISTRICT_ID, districtById } from '../lib/geography';

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
// Where a click or tap sent the player, until they arrive, steer themselves or get stuck
let moveTarget: MoveTarget | null = null;
let stuckFor = 0;

const playerHandle: PlayerHandle = {
  position: new Vector3(...districtById(DEFAULT_DISTRICT_ID).spawn),
  direction: 0,
  velocity: new Vector3(),
  applyMovement: (delta: number) => {
    let intent = movementIntent(keysPressed, stick);
    if (intent.forward !== 0 || intent.turn !== 0) moveTarget = null; // steering by hand cancels the trip
    else if (moveTarget) {
      const s = steerTowards(playerHandle.position.x, playerHandle.position.z, playerHandle.direction, moveTarget);
      if (s.arrived) moveTarget = null;
      else intent = s;
    }
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

    // A clicked trip that's blocked (a wall, a parked bus) gives up rather than pushing forever
    if (moveTarget && intent.forward > 0.3 && Math.hypot(playerHandle.velocity.x, playerHandle.velocity.z) < 0.25) {
      stuckFor += delta;
      if (stuckFor > STUCK_SECONDS) moveTarget = null;
    } else stuckFor = 0;
  },
};

function releaseAllKeys() {
  for (const key of MOVE_KEYS) keysPressed[key] = false;
  moveTarget = null;
  stick.forward = 0;
  stick.turn = 0;
}

let inputBlocked = false;
/** Stops movement keys while a menu is open, so the player doesn't walk off mid-order. */
export function setMovementBlocked(blocked: boolean) {
  inputBlocked = blocked;
  if (blocked) releaseAllKeys();
}

/** Sends the player to a spot on the ground (from a click or tap); null cancels. */
export function setMoveTarget(target: MoveTarget | null) {
  moveTarget = inputBlocked ? null : target;
  stuckFor = 0;
}

/** Where the player is heading after a click, if anywhere. */
export const getMoveTarget = (): MoveTarget | null => moveTarget;

/** Whether movement input is ignored right now (a menu is open). */
export const isMovementBlocked = () => inputBlocked;

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

/** Puts the player at a spot (e.g. a district's arrival point), standing still. */
export function placePlayer(spot: readonly [number, number, number], direction = 0) {
  playerHandle.position.set(spot[0], spot[1], spot[2]);
  playerHandle.velocity.set(0, 0, 0);
  playerHandle.direction = direction;
  moveTarget = null;
}
