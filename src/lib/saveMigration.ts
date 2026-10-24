/**
 * Moves data saved by earlier versions into today's systems, so a player's
 * progress carries over instead of disappearing.
 */
import { CARS, type OwnedCar } from './cars';
import { VEHICLE_CATALOG, vehicleColourById } from './vehicleCatalog';

/** The dealers' model closest in class to each earlier catalogue category. */
const CAR_FOR_CATEGORY: Record<string, string> = {
  economy: 'hatch',
  sedan: 'saloon',
  suv: 'suv',
  pickup: 'suv',
  luxury: 'executive',
  sports: 'coupe',
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const distance = (a: string, b: string) => {
  const [x, y] = [rgb(a), rgb(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};

/** Cars bought from the earlier vehicle catalogue, as cars in today's garage (one per model). */
export function migrateOwnedVehicles(data: unknown): OwnedCar[] {
  if (!Array.isArray(data)) return [];
  const out: OwnedCar[] = [];
  for (const raw of data) {
    if (typeof raw !== 'object' || raw === null) continue;
    const { modelId, colour } = raw as Record<string, unknown>;
    const old = VEHICLE_CATALOG.find((v) => v.id === modelId);
    const car = old && CARS.find((c) => c.id === CAR_FOR_CATEGORY[old.category]);
    if (!car || out.some((o) => o.id === car.id)) continue;
    const hex = typeof colour === 'string' ? vehicleColourById(colour)?.hex : undefined;
    const color = hex ? car.colors.reduce((best, c) => (distance(c, hex) < distance(best, hex) ? c : best)) : car.colors[0];
    out.push({ id: car.id, color });
  }
  return out;
}
