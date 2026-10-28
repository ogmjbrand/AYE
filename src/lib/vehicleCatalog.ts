export type VehicleCategory = 'economy' | 'sedan' | 'suv' | 'luxury' | 'sports' | 'pickup';
export type VehicleBodyStyle = 'hatchback' | 'sedan' | 'suv' | 'luxury' | 'sports' | 'pickup';

export interface VehicleColour {
  id: string;
  name: string;
  hex: string;
}

export interface VehicleListing {
  id: string;
  name: string;
  category: VehicleCategory;
  price: number;
  bodyStyle: VehicleBodyStyle;
  colours: readonly string[];
  topSpeedKph: number;
  accelerationSeconds: number;
  seats: number;
}

export interface OwnedVehicle {
  modelId: string;
  colour: string;
}

export const VEHICLE_COLOURS: readonly VehicleColour[] = [
  { id: 'pearl-white', name: 'Pearl white', hex: '#e7e2d7' },
  { id: 'lagoon-blue', name: 'Lagoon blue', hex: '#427b91' },
  { id: 'obsidian', name: 'Obsidian', hex: '#292d32' },
  { id: 'copper', name: 'Copper', hex: '#a96643' },
];

export const VEHICLE_CATALOG: readonly VehicleListing[] = [
  { id: 'epe-city', name: 'Epe City', category: 'economy', price: 4_500, bodyStyle: 'hatchback', colours: ['pearl-white', 'lagoon-blue', 'obsidian'], topSpeedKph: 145, accelerationSeconds: 11.8, seats: 5 },
  { id: 'marina-sedan', name: 'Marina S', category: 'sedan', price: 12_000, bodyStyle: 'sedan', colours: ['pearl-white', 'lagoon-blue', 'obsidian', 'copper'], topSpeedKph: 185, accelerationSeconds: 9.1, seats: 5 },
  { id: 'ikorodu-sport', name: 'Ikorodu Sport', category: 'suv', price: 22_000, bodyStyle: 'suv', colours: ['pearl-white', 'obsidian', 'copper'], topSpeedKph: 175, accelerationSeconds: 9.8, seats: 5 },
  { id: 'lekki-grand', name: 'Lekki Grand', category: 'luxury', price: 68_000, bodyStyle: 'luxury', colours: ['pearl-white', 'lagoon-blue', 'obsidian'], topSpeedKph: 225, accelerationSeconds: 6.9, seats: 5 },
  { id: 'victoria-coupe', name: 'Victoria Coupe', category: 'sports', price: 92_000, bodyStyle: 'sports', colours: ['pearl-white', 'lagoon-blue', 'copper'], topSpeedKph: 265, accelerationSeconds: 4.8, seats: 2 },
  { id: 'badagry-workmate', name: 'Badagry Workmate', category: 'pickup', price: 31_000, bodyStyle: 'pickup', colours: ['pearl-white', 'obsidian', 'copper'], topSpeedKph: 160, accelerationSeconds: 10.5, seats: 5 },
];

export const vehicleById = (id: string): VehicleListing | undefined =>
  VEHICLE_CATALOG.find((vehicle) => vehicle.id === id);

export const vehicleColourById = (id: string): VehicleColour | undefined =>
  VEHICLE_COLOURS.find((colour) => colour.id === id);

export function sanitiseOwnedVehicles(value: unknown): OwnedVehicle[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const owned: OwnedVehicle[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const record = item as Record<string, unknown>;
    if (typeof record.modelId !== 'string' || typeof record.colour !== 'string') continue;
    const model = vehicleById(record.modelId);
    if (!model || seen.has(model.id) || !model.colours.includes(record.colour)) continue;
    seen.add(model.id);
    owned.push({ modelId: model.id, colour: record.colour });
    if (owned.length === VEHICLE_CATALOG.length) break;
  }
  return owned;
}
