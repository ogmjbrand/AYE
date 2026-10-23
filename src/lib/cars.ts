/**
 * Cars: buy one at a dealership, then drive it anywhere on the streets.
 * Driving is much faster than walking and costs fuel by the kilometre, paid
 * from your GHAI as you go. A car is yours for good (it comes with you when
 * you travel to another city) and can be sold back for half.
 *
 * The models are the game's own generic cars, not real brands.
 */

export interface CarModel {
  id: string;
  name: string;
  kind: string;
  price: number;
  /** Top speed on the street, in metres per second (running is 4.2). */
  speed: number;
  /** Fuel in GHAI per kilometre. */
  fuelPerKm: number;
  /** Body length in metres (for the model and collisions). */
  length: number;
  colors: readonly string[];
  description: string;
}

export const CARS: readonly CarModel[] = [
  { id: 'hatch', name: 'City Hatch', kind: 'Compact hatchback', price: 18000, speed: 9, fuelPerKm: 4, length: 3.8, colors: ['#c8c8c4', '#b0283a', '#1f4f8a', '#f2f0ea'], description: 'Small, thrifty and easy to park. The sensible first car.' },
  { id: 'saloon', name: 'Family Saloon', kind: 'Four-door saloon', price: 32000, speed: 10.5, fuelPerKm: 6, length: 4.4, colors: ['#e9e7e2', '#2b2d31', '#5a6e7f', '#7a1f2b'], description: 'Room for four, a big boot and a smooth ride.' },
  { id: 'suv', name: 'City SUV', kind: 'Sport utility', price: 55000, speed: 11, fuelPerKm: 9, length: 4.6, colors: ['#111214', '#f2f0ea', '#3d4a3a', '#8a6a48'], description: 'High seats, tough suspension and presence on any road.' },
  { id: 'executive', name: 'Executive', kind: 'Executive saloon', price: 90000, speed: 12.5, fuelPerKm: 11, length: 4.9, colors: ['#0d0e10', '#3a3d42', '#e8e4dc', '#1d2a44'], description: 'Leather, quiet and quick. Arrive like you mean it.' },
  { id: 'ev-suv', name: 'Volta EV', kind: 'Electric SUV', price: 72000, speed: 11.5, fuelPerKm: 2, length: 4.7, colors: ['#0f4a3c', '#f2f0ea', '#2b2d31', '#5a6e7f'], description: 'Quiet, quick and charged at home: a sleek electric SUV with a light-bar nose, a black roof and two-tone wheels. Pennies a kilometre.' },
  { id: 'limousine', name: 'Sovereign', kind: 'Flagship saloon', price: 210000, speed: 13, fuelPerKm: 14, length: 5.3, colors: ['#11141c', '#0d0e10', '#e8e4dc', '#3a3d42'], description: 'The long-wheelbase flagship: a tall chrome-slatted grille, chrome window line, rear seats like an armchair. Arrive.' },
  { id: 'coupe', name: 'Grand Coupé', kind: 'Luxury coupé', price: 150000, speed: 14, fuelPerKm: 15, length: 4.7, colors: ['#c9a052', '#b0283a', '#0d0e10', '#1f5a47'], description: 'Two doors, a long bonnet and a lot of power.' },
];

export const carById = (id: string | null | undefined) => CARS.find((c) => c.id === id);

/** Where a car was left on the street: the district, the spot and which way it faces (radians, as the player's heading). */
export interface ParkedSpot {
  districtId: string;
  x: number;
  z: number;
  heading: number;
}

/** A car you own, in the colour you chose. Parked somewhere, or (no spot) with you, ready to drive wherever you are. */
export interface OwnedCar {
  id: string;
  color: string;
  parked?: ParkedSpot;
}

/** How close you need to be to your parked car to get in, in metres. */
export const PICKUP_RADIUS = 4;

/** The car you'd get into here: a parked one within reach first, otherwise the newest one that's with you. */
export function carToDrive(cars: readonly OwnedCar[], districtId: string, x: number, z: number): OwnedCar | null {
  let near: OwnedCar | null = null;
  let best = PICKUP_RADIUS;
  for (const c of cars) {
    if (!c.parked || c.parked.districtId !== districtId) continue;
    const d = Math.hypot(c.parked.x - x, c.parked.z - z);
    if (d <= best) { best = d; near = c; }
  }
  if (near) return near;
  for (let i = cars.length - 1; i >= 0; i--) if (!cars[i].parked) return cars[i];
  return null;
}

function sanitiseSpot(data: unknown): ParkedSpot | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  const { districtId, x, z, heading } = data as Record<string, unknown>;
  const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
  if (typeof districtId !== 'string' || !districtId || !finite(x) || !finite(z) || !finite(heading)) return undefined;
  return { districtId, x, z, heading };
}

export const CAR_RESALE_SHARE = 0.5;
export const carResale = (c: CarModel) => Math.round(c.price * CAR_RESALE_SHARE);

/** Fuel for a distance driven, in GHAI (rounded to whole GHAI, never below zero). */
export const fuelCost = (car: CarModel, metres: number) => Math.max(0, Math.round((car.fuelPerKm * metres) / 1000));

/** Keeps known cars in known colours, one of each model; a parked spot in a district that doesn't exist (any more) is dropped, so the car is with you. */
export function sanitiseCars(data: unknown, knownDistrict: (id: string) => boolean = () => true): OwnedCar[] {
  if (!Array.isArray(data)) return [];
  const out: OwnedCar[] = [];
  for (const raw of data.slice(0, 10)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const { id, color, parked } = raw as Record<string, unknown>;
    const car = carById(typeof id === 'string' ? id : null);
    if (!car || out.some((o) => o.id === car.id)) continue;
    const left = sanitiseSpot(parked);
    const spot = left && knownDistrict(left.districtId) ? left : undefined;
    out.push({ id: car.id, color: typeof color === 'string' && car.colors.includes(color) ? color : car.colors[0], ...(spot ? { parked: spot } : {}) });
  }
  return out;
}

/** How fast the car turns (radians per second) at a given speed: slower at a crawl, like steering a real car. */
export const carTurnRate = (speed: number) => Math.min(1.8, 0.5 + Math.abs(speed) * 0.18);
