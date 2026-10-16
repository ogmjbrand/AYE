/**
 * Homes to rent in the district. A home is a flat in one of the residential
 * buildings in lib/world.ts; you rent it at its front door (E), pay a move-in
 * fee, and then pay rent each night you go to sleep. Sleeping at home is a
 * proper night's rest; sleeping anywhere else is sleeping rough.
 */

export interface Home {
  id: string;
  name: string;
  /** Short line for the listing, e.g. "Room in a shared flat". */
  kind: string;
  building: string;
  /** Front door, on the pavement in front of the building (district coordinates). */
  door: readonly [number, number, number];
  /** Charged each night you sleep while you rent it. */
  rentPerNight: number;
  description: string;
}

/** Move-in fee in nights of rent (agency fee and deposit, not refunded). */
export const MOVE_IN_NIGHTS = 5;
export const HOME_RADIUS = 2.5;
/** Fullness lost on top of the usual overnight drop when sleeping rough. */
export const ROUGH_SLEEP_FULLNESS_LOSS = 15;

export const HOMES: readonly Home[] = [
  {
    id: 'marina-court-room',
    name: 'Marina Court, room 4B',
    kind: 'Room in a shared flat',
    building: 'Marina Court',
    door: [-5.5, 0, 9],
    rentPerNight: 80,
    description: 'A single room with a fan. Shared kitchen and bathroom with three flatmates.',
  },
  {
    id: 'palm-view-mini',
    name: 'Palm View, mini flat',
    kind: 'Mini flat',
    building: 'Palm View',
    door: [-5.5, 0, 24],
    rentPerNight: 180,
    description: 'Your own bedroom, kitchenette and bathroom, two minutes from the boulevard.',
  },
  {
    id: 'eko-gardens-2bed',
    name: 'Eko Gardens, flat 12',
    kind: 'Two-bedroom apartment',
    building: 'Eko Gardens',
    door: [24, 0, 20.5],
    rentPerNight: 400,
    description: 'Two bedrooms, a balcony and a backup generator. Room for a flatmate or a home office.',
  },
  {
    id: 'marina-heights-penthouse',
    name: 'Marina Heights penthouse',
    kind: 'Penthouse',
    building: 'Marina Heights',
    door: [5.5, 0, -36],
    rentPerNight: 1200,
    description: 'Top floor of the tower with views over the lagoon, a concierge and a pool.',
  },
];

export const homeById = (id: string | null | undefined) => HOMES.find((h) => h.id === id);
export const moveInFee = (home: Home) => home.rentPerNight * MOVE_IN_NIGHTS;

export const distanceToDoor = (home: Home, x: number, z: number) => Math.hypot(home.door[0] - x, home.door[2] - z);

/** The home whose front door the player is standing at, if any. */
export function homeAtDoor(x: number, z: number): Home | undefined {
  return HOMES.find((h) => distanceToDoor(h, x, z) <= HOME_RADIUS);
}
