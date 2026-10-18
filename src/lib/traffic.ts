/**
 * Moving traffic: minibuses driving up and down the boulevard on the right,
 * looping beyond the walkable block. They brake for pedestrians and vehicles
 * ahead, then pull away again. Pure, so it can be tested.
 */
import { DANFO_SIZE, type TrafficLane } from './world';

export interface Car {
  lane: number;
  z: number;
  speed: number;
}

export interface TrafficPerson {
  x: number;
  z: number;
}

export interface PedestrianMotion extends TrafficPerson {
  vx: number;
  vz: number;
}

export const TRAFFIC = {
  /** Cruising speed, m/s (about 25 km/h on a busy street). */
  maxSpeed: 7,
  accel: 2.5,
  brake: 9,
  /** Distance kept to the vehicle in front, nose to tail. */
  gap: 3,
  /** Stops this far short of a person standing in its lane. */
  personGap: 3,
  /** Drives from -loop to +loop along Z, then reappears at the other end (out of sight). */
  loop: 75,
  /** How close (sideways) to the lane centre counts as being in the way. */
  laneHalfWidth: DANFO_SIZE[0] / 2 + 0.5,
} as const;

const LENGTH = DANFO_SIZE[2];
const PERSON_RADIUS = 0.35;

let liveCars: readonly Car[] = [];
let liveLanes: readonly TrafficLane[] = [];

export function setTrafficSnapshot(cars: readonly Car[], lanes: readonly TrafficLane[]) {
  liveCars = cars;
  liveLanes = lanes;
}

export function clearTrafficSnapshot() {
  liveCars = [];
  liveLanes = [];
}

export function trafficSnapshot() {
  return { cars: liveCars, lanes: liveLanes };
}

/** Predict pedestrian/car overlap over a short horizon using their current velocities. */
export function pedestrianInTrafficPath(
  pedestrian: PedestrianMotion,
  cars: readonly Car[],
  lanes: readonly TrafficLane[],
  horizon = 1.5,
): boolean {
  const intervals = Math.ceil(horizon / 0.1);
  for (const car of cars) {
    const lane = lanes[car.lane];
    if (!lane) continue;
    const carVx = 0;
    const carVz = lane.dir * car.speed;
    for (let i = 0; i <= intervals; i++) {
      const t = Math.min(horizon, i * 0.1);
      const px = pedestrian.x + pedestrian.vx * t;
      const pz = pedestrian.z + pedestrian.vz * t;
      const cx = lane.x + carVx * t;
      const cz = car.z + carVz * t;
      if (
        Math.abs(px - cx) < TRAFFIC.laneHalfWidth + PERSON_RADIUS
        && Math.abs(pz - cz) < LENGTH / 2 + PERSON_RADIUS
      ) return true;
    }
  }
  return false;
}

export function initTraffic(lanes: readonly TrafficLane[]): Car[] {
  const cars: Car[] = [];
  lanes.forEach((lane, li) => {
    for (let i = 0; i < lane.count; i++) {
      // Spread evenly, with lanes offset from each other
      const z = -TRAFFIC.loop + ((i + 0.5 + li * 0.37) / lane.count) * 2 * TRAFFIC.loop;
      cars.push({ lane: li, z: wrap(z), speed: TRAFFIC.maxSpeed });
    }
  });
  return cars;
}

const wrap = (z: number) => {
  const span = 2 * TRAFFIC.loop;
  return ((((z + TRAFFIC.loop) % span) + span) % span) - TRAFFIC.loop;
};

/** Free road ahead of a car, up to the next car in its lane or a person standing in it. */
export function clearAhead(car: Car, cars: readonly Car[], lanes: readonly TrafficLane[], people: readonly TrafficPerson[]): number {
  const lane = lanes[car.lane];
  let free = Infinity;
  for (const other of cars) {
    if (other === car || other.lane !== car.lane) continue;
    const d = (other.z - car.z) * lane.dir;
    if (d > 0) free = Math.min(free, d - LENGTH);
  }
  for (const person of people) {
    if (Math.abs(person.x - lane.x) >= TRAFFIC.laneHalfWidth) continue;
    const d = (person.z - car.z) * lane.dir;
    if (d > -LENGTH / 2) free = Math.min(free, d - LENGTH / 2 - TRAFFIC.personGap);
  }
  return free;
}

export function stepTraffic(
  cars: readonly Car[],
  lanes: readonly TrafficLane[],
  pedestrians: TrafficPerson | readonly TrafficPerson[] | null,
  dt: number,
): Car[] {
  const people = pedestrians === null ? [] : 'x' in pedestrians ? [pedestrians] : pedestrians;
  return cars.map((car) => {
    const free = clearAhead(car, cars, lanes, people);
    const stopIn = free - TRAFFIC.gap;
    // Speed it could still stop from in the space left
    const safe = stopIn <= 0 ? 0 : Math.sqrt(2 * TRAFFIC.brake * stopIn);
    const target = Math.min(TRAFFIC.maxSpeed, safe);
    const speed = target < car.speed
      ? Math.max(target, car.speed - TRAFFIC.brake * dt)
      : Math.min(target, car.speed + TRAFFIC.accel * dt);
    const z = wrap(car.z + lanes[car.lane].dir * speed * dt);
    return { ...car, z, speed };
  });
}
