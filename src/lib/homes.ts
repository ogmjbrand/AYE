/**
 * Homes to rent. A home is a flat in one of a district's residential
 * buildings (listed with each district in lib/districts); you rent it at its
 * front door (E), pay a move-in fee, and then pay rent each night you go to
 * sleep. Sleeping at home is a proper night's rest; sleeping anywhere else
 * is sleeping rough.
 */
import { DISTRICTS } from './geography';

export interface Home {
  id: string;
  /** The district it's in (lib/geography.ts). */
  district: string;
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

/** Every home in every district. */
export const allHomes = (): Home[] => DISTRICTS.flatMap((d) => d.homes);
export const homeById = (id: string | null | undefined) => allHomes().find((h) => h.id === id);
export const moveInFee = (home: Home) => home.rentPerNight * MOVE_IN_NIGHTS;

export const distanceToDoor = (home: Home, x: number, z: number) => Math.hypot(home.door[0] - x, home.door[2] - z);

/** The home whose front door the player is standing at in this district, if any. */
export function homeAtDoor(districtId: string, x: number, z: number): Home | undefined {
  return allHomes().find((h) => h.district === districtId && distanceToDoor(h, x, z) <= HOME_RADIUS);
}
