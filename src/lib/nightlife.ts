/**
 * Nightlife: one live-music lounge per district, open in the evening. A
 * night out is something you do with a friend (a resident you've got to
 * know): you pay both covers, spend two hours there and grow closer. It
 * counts as your time together for the day, like a chat or a hang-out.
 */
import type { GameTime } from './gameState';

export interface Venue {
  id: string;
  name: string;
  kind: string;
  /** Where you stand to go in (the front door on the pavement). */
  position: readonly [number, number, number];
  /** Cover charge per person, in ⓒ. */
  cover: number;
  /** One line about the place, shown in the panel. */
  description: string;
}

/** Doors open at 20:00 and close at 03:00; the last night out starts by 01:00 so it ends before closing. */
export const OPENS_HOUR = 20;
export const CLOSES_HOUR = 3;
export const LAST_ENTRY_HOUR = 1;
/** A night out lasts this long, in game minutes. */
export const NIGHT_OUT_MINUTES = 120;
/** Friendship points for a night out together (more than a hang-out, and it costs). */
export const NIGHT_OUT_POINTS = 20;
/** Within this distance of the door you can go in. */
export const VENUE_RADIUS = 2.5;

export const isOpen = (t: Pick<GameTime, 'hour'>) => t.hour >= OPENS_HOUR || t.hour < CLOSES_HOUR;
/** Whether a two-hour night out can start now (open, and before last entry). */
export const canStartNightOut = (t: Pick<GameTime, 'hour'>) => t.hour >= OPENS_HOUR || t.hour < LAST_ENTRY_HOUR;
/** What a night out costs: your cover and your friend's. */
export const nightOutCost = (v: Venue) => v.cover * 2;

export function venueAt(venue: Venue | undefined, x: number, z: number): Venue | undefined {
  return venue && Math.hypot(venue.position[0] - x, venue.position[2] - z) <= VENUE_RADIUS ? venue : undefined;
}
