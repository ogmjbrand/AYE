/**
 * Parks: a public green in each district with benches where you can sit and
 * let time pass, e.g. until the lounge opens or work starts. Nothing is
 * invented on top: the clock, living costs and hunger carry on as usual.
 */
export interface Park {
  id: string;
  name: string;
  kind: string;
  /** Where you stand to sit down: the middle of the benches. */
  position: readonly [number, number, number];
  description: string;
}

/** Within this distance of the benches you can sit down. */
export const PARK_RADIUS = 3;
/** How long you can sit for, in game minutes. */
export const WAIT_OPTIONS = [30, 60, 120] as const;
export type WaitMinutes = (typeof WAIT_OPTIONS)[number];

export function parkAt(park: Park | undefined, x: number, z: number): Park | undefined {
  return park && Math.hypot(park.position[0] - x, park.position[2] - z) <= PARK_RADIUS ? park : undefined;
}
