/**
 * Moving traffic: minibuses driving up and down the boulevard on the right,
 * looping beyond the walkable block. They brake for the player and for the
 * vehicle in front, then pull away again. Pure, so it can be tested.
 */
import { DANFO_SIZE, type TrafficLane } from './world';

export interface Car {
  lane: number;
  z: number;
  speed: number;
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
export function clearAhead(car: Car, cars: readonly Car[], lanes: readonly TrafficLane[], person: { x: number; z: number } | null): number {
  const lane = lanes[car.lane];
  let free = Infinity;
  for (const other of cars) {
    if (other === car || other.lane !== car.lane) continue;
    const d = (other.z - car.z) * lane.dir;
    if (d > 0) free = Math.min(free, d - LENGTH);
  }
  if (person && Math.abs(person.x - lane.x) < TRAFFIC.laneHalfWidth) {
    const d = (person.z - car.z) * lane.dir;
    if (d > -LENGTH / 2) free = Math.min(free, d - LENGTH / 2);
  }
  return free;
}

export function stepTraffic(cars: readonly Car[], lanes: readonly TrafficLane[], person: { x: number; z: number } | null, dt: number): Car[] {
  return cars.map((car) => {
    const free = clearAhead(car, cars, lanes, person);
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
