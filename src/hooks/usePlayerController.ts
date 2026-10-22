import { useEffect } from 'react';
import { Vector3 } from 'three';
import { activeLayout, movingObstacles, resolveCollisions } from '../lib/world';
import { movementIntent, type StickInput } from '../lib/movementInput';
import { STUCK_SECONDS, steerTowards, type MoveTarget } from '../lib/clickToMove';
import { buildWalkGrid, findPath, walkGridFor, type Point } from '../lib/pathfinding';
import { seatedSpot, standSpot, type Seat } from '../lib/seating';
import { DEFAULT_DISTRICT_ID, districtById } from '../lib/geography';
import { pedestrianInTrafficPath, trafficSnapshot } from '../lib/traffic';
import { advanceVehicleMotion } from '../lib/vehicleDriving';

export interface PlayerHandle {
  position: Vector3;
  direction: number;
  velocity: Vector3;
  trafficWarning: boolean;
  /** Catalogue id while the player is driving an owned car. */
  drivingVehicleId: string | null;
  vehicleSpeed: number;
  applyMovement: (delta: number) => void;
  faceTowards: (x: number, z: number, delta: number) => void;
  moveToPose: (x: number, z: number, facing: number, blend: number) => void;
}

const MOVE_KEYS = ['w', 'a', 's', 'd', ' ', 'shift'];

/** Metres per second. W jogs; holding Shift walks. Chosen so the motion-captured
 * strides play at about 1.4x their recorded rate rather than sliding. */
export const RUN_SPEED = 4.2;
export const WALK_SPEED = 1.4;
const keysPressed: Record<string, boolean> = {};
const stick: StickInput = { forward: 0, turn: 0 };
let vehicleSpeed = 0;
// Where a click or tap sent the player, until they arrive, steer themselves or get stuck
let moveTarget: MoveTarget | null = null;
// The legs of the route there, around buildings and parked vehicles
let route: Point[] = [];
let replanned = false;
let stuckFor = 0;

/** How the latest trip is going, for the HUD: under way, or how it ended. */
export interface Trip {
  /** Bumps with every new trip, so a message about an old one can be told apart. */
  seq: number;
  status: 'moving' | 'arrived' | 'cancelled' | 'blocked';
  /** Set when the trip was to a place from the city directory. */
  destinationId?: string;
  label?: string;
}
let trip: Trip | null = null;
let tripSeq = 0;
const tripListeners = new Set<() => void>();
function endTrip(status: Trip['status']) {
  moveTarget = null;
  route = [];
  if (trip?.status === 'moving') {
    trip = { ...trip, status };
    tripListeners.forEach((l) => l());
  }
}

// Sitting on a bench or chair: the body stays put on the seat until you get up
let seated: Seat | null = null;
const seatListeners = new Set<() => void>();
const notifySeat = () => seatListeners.forEach((l) => l());

const playerHandle: PlayerHandle = {
  position: new Vector3(...districtById(DEFAULT_DISTRICT_ID).spawn),
  direction: 0,
  velocity: new Vector3(),
  trafficWarning: false,
  drivingVehicleId: null,
  vehicleSpeed: 0,
  faceTowards: (x: number, z: number, delta: number) => {
    const facing = Math.atan2(x - playerHandle.position.x, z - playerHandle.position.z);
    const turn = Math.atan2(Math.sin(facing - playerHandle.direction), Math.cos(facing - playerHandle.direction));
    playerHandle.direction += turn * Math.min(1, delta * 5);
  },
  moveToPose: (x: number, z: number, facing: number, blend: number) => {
    const amount = Math.max(0, Math.min(1, blend));
    playerHandle.velocity.set(0, 0, 0);
    playerHandle.position.x += (x - playerHandle.position.x) * amount;
    playerHandle.position.z += (z - playerHandle.position.z) * amount;
    const turn = Math.atan2(Math.sin(facing - playerHandle.direction), Math.cos(facing - playerHandle.direction));
    playerHandle.direction += turn * amount;
  },
  applyMovement: (delta: number) => {
    if (playerHandle.drivingVehicleId) {
      applyVehicleMovement(delta);
      return;
    }
    let intent = movementIntent(keysPressed, stick);
    if (seated) {
      // Pressing a direction gets you up; otherwise you stay exactly on the seat (no collision push off the bench)
      playerHandle.velocity.set(0, 0, 0);
      if (intent.forward !== 0 || intent.turn !== 0) standUp();
      return;
    }
    if (intent.forward !== 0 || intent.turn !== 0) {
      if (moveTarget) endTrip('cancelled'); // steering by hand cancels the trip
    } else if (moveTarget && route.length) {
      const final = route.length === 1;
      const s = steerTowards(playerHandle.position.x, playerHandle.position.z, playerHandle.direction, { ...route[0], walk: moveTarget.walk }, final);
      if (s.arrived) {
        route.shift();
        if (route.length === 0) endTrip('arrived');
      } else intent = s;
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

    const traffic = trafficSnapshot();
    const trafficRisk = pedestrianInTrafficPath({
      x: playerHandle.position.x,
      z: playerHandle.position.z,
      vx: targetVelX,
      vz: targetVelZ,
    }, traffic.cars, traffic.lanes);
    playerHandle.trafficWarning = trafficRisk;
    if (trafficRisk) {
      playerHandle.velocity.set(0, 0, 0);
    } else {
      // Smooth acceleration toward target
      playerHandle.velocity.x += (targetVelX - playerHandle.velocity.x) * acceleration * delta;
      playerHandle.velocity.z += (targetVelZ - playerHandle.velocity.z) * acceleration * delta;
    }

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
    if (!trafficRisk && moveTarget && intent.forward > 0.3 && Math.hypot(playerHandle.velocity.x, playerHandle.velocity.z) < 0.25) {
      stuckFor += delta;
      if (stuckFor > STUCK_SECONDS) {
        // Probably traffic in the way: plan once more around where vehicles are now, else give up
        const again = replanned ? null : planRoute(moveTarget, [...activeLayout().obstacles, ...movingObstacles]);
        replanned = true;
        stuckFor = 0;
        if (again) route = again;
        else endTrip('blocked');
      }
    } else stuckFor = 0;
  },
};

function applyVehicleMovement(delta: number) {
  const intent = movementIntent(keysPressed, stick);
  const previousX = playerHandle.position.x;
  const previousZ = playerHandle.position.z;
  const next = advanceVehicleMotion(
    { x: previousX, z: previousZ, direction: playerHandle.direction, speed: vehicleSpeed },
    { forward: intent.forward, turn: intent.turn, delta },
  );
  vehicleSpeed = next.speed;
  playerHandle.position.set(next.x, playerHandle.position.y, next.z);
  playerHandle.direction = next.direction;
  playerHandle.velocity.set(
    (next.x - previousX) / Math.max(delta, 0.001),
    0,
    (next.z - previousZ) / Math.max(delta, 0.001),
  );
  playerHandle.vehicleSpeed = vehicleSpeed;
  playerHandle.trafficWarning = false;
}

function releaseAllKeys() {
  for (const key of MOVE_KEYS) keysPressed[key] = false;
  if (moveTarget) endTrip('cancelled');
  stick.forward = 0;
  stick.turn = 0;
}

let inputBlocked = false;
/** Stops movement keys while a menu is open, so the player doesn't walk off mid-order. */
export function setMovementBlocked(blocked: boolean) {
  inputBlocked = blocked;
  if (blocked) releaseAllKeys();
}

export function enterVehicle(vehicleId: string, spot?: readonly [number, number, number], direction?: number) {
  if (inputBlocked || playerHandle.drivingVehicleId) return false;
  if (spot) playerHandle.position.set(spot[0], spot[1], spot[2]);
  if (direction !== undefined) playerHandle.direction = direction;
  playerHandle.velocity.set(0, 0, 0);
  vehicleSpeed = 0;
  playerHandle.vehicleSpeed = 0;
  playerHandle.drivingVehicleId = vehicleId;
  if (moveTarget) endTrip('cancelled');
  return true;
}

/** Stops the car beside a clear spot so the player does not exit into a wall. */
export function exitVehicle() {
  if (!playerHandle.drivingVehicleId) return false;
  const { x, z } = playerHandle.position;
  const direction = playerHandle.direction;
  const rightX = Math.cos(direction);
  const rightZ = -Math.sin(direction);
  const forwardX = Math.sin(direction);
  const forwardZ = Math.cos(direction);
  const candidates = [
    [x + rightX * 1.55, z + rightZ * 1.55],
    [x - rightX * 1.55, z - rightZ * 1.55],
    [x - forwardX * 2.3, z - forwardZ * 2.3],
    [x + forwardX * 2.3, z + forwardZ * 2.3],
  ];
  const clear = candidates.map(([cx, cz]) => {
    const resolved = resolveCollisions(cx, cz, 0.32);
    return Math.hypot(resolved.x - cx, resolved.z - cz) < 0.2 ? resolved : null;
  }).find((spot) => spot !== null);
  if (!clear) return false;
  playerHandle.position.set(clear.x, playerHandle.position.y, clear.z);
  playerHandle.velocity.set(0, 0, 0);
  vehicleSpeed = 0;
  playerHandle.vehicleSpeed = 0;
  playerHandle.drivingVehicleId = null;
  playerHandle.direction = direction;
  return true;
}

function planRoute(target: MoveTarget, obstacles = activeLayout().obstacles): Point[] | null {
  const grid = obstacles === activeLayout().obstacles ? walkGridFor(obstacles) : buildWalkGrid(obstacles);
  return findPath(grid, { x: playerHandle.position.x, z: playerHandle.position.z }, target);
}

/**
 * Sends the player to a spot on the ground (from a click or tap), routing
 * round anything in the way; null cancels. Returns false if there's no way there.
 */
export function setMoveTarget(target: MoveTarget | null, about?: { destinationId?: string; label?: string }): boolean {
  if (playerHandle.drivingVehicleId) return target === null;
  if (target && seated) standUp(); // clicking somewhere else gets you up first
  stuckFor = 0;
  replanned = false;
  const path = target && !inputBlocked ? planRoute(target) : null;
  if (!path) {
    if (moveTarget) endTrip('cancelled');
    return target === null;
  }
  moveTarget = target;
  route = path;
  trip = { seq: ++tripSeq, status: 'moving', ...about };
  tripListeners.forEach((l) => l());
  // Nothing left to walk: you're already there
  if (route.length === 0) endTrip('arrived');
  return true;
}

/** Sits down on a seat: the character's origin goes just behind the cushion, facing the way the seat does. */
export function sitAt(seat: Seat) {
  if (moveTarget) endTrip('cancelled');
  const p = seatedSpot(seat);
  playerHandle.position.x = p.x;
  playerHandle.position.z = p.z;
  playerHandle.velocity.set(0, 0, 0);
  playerHandle.direction = seat.facing;
  seated = seat;
  notifySeat();
}

/** Gets up and steps in front of the seat, facing the same way. Does nothing if not seated. */
export function standUp() {
  if (!seated) return;
  const p = standSpot(seated);
  playerHandle.position.x = p.x;
  playerHandle.position.z = p.z;
  seated = null;
  notifySeat();
}

export const getSeated = (): Seat | null => seated;
export function subscribeSeated(listener: () => void) {
  seatListeners.add(listener);
  return () => { seatListeners.delete(listener); };
}

/** The number the next trip will get (so a caller can listen for its end before starting it). */
export const nextTripSeq = () => tripSeq + 1;

/** The latest trip (null before the first). */
export const getTrip = (): Trip | null => trip;

/** Calls `listener` whenever a trip starts or ends; returns the unsubscribe. */
export function subscribeTrip(listener: () => void) {
  tripListeners.add(listener);
  return () => { tripListeners.delete(listener); };
}

/** The route still to walk after a click: the remaining waypoints. */
export const getRoute = (): readonly Point[] => route;

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
  if (moveTarget) endTrip('cancelled');
  if (seated) { seated = null; notifySeat(); }
}
