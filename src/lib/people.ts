/**
 * Residents: computer-controlled people who live in each district. They are
 * always labelled as such; AYE never presents them as other players. Spending
 * time with them builds a relationship, one activity per person per game day.
 * Close friends will put you up on their couch for the night.
 */

export type Activity = 'chat' | 'treat' | 'hangout';

export interface Resident {
  id: string;
  district: string;
  name: string;
  /** What they do, e.g. "Danfo conductor". */
  role: string;
  /** Which 3D person (lib/looks.ts). */
  lookId: string;
  /** Where they stand, and which way they face (radians, 0 = +Z). */
  position: readonly [number, number, number];
  facing: number;
  /** One line per friendship level (index matches FRIENDSHIP_LEVELS). */
  lines: readonly [string, string, string, string, string];
}

export const FRIENDSHIP_LEVELS = [
  { name: 'Stranger', points: 0 },
  { name: 'Acquaintance', points: 10 },
  { name: 'Friend', points: 30 },
  { name: 'Close friend', points: 60 },
  { name: 'Best friend', points: 90 },
] as const;
export const MAX_POINTS = 100;
/** From this level they let you sleep on their couch. */
export const COUCH_LEVEL = 3;
/** From this level you can hang out. */
export const HANGOUT_LEVEL = 2;

export const ACTIVITIES: Record<Activity, { label: string; points: number; cost: number; minutes: number; description: string }> = {
  chat: { label: 'Chat', points: 6, cost: 0, minutes: 0, description: 'Stop and catch up for a few minutes.' },
  treat: { label: 'Treat them', points: 12, cost: 150, minutes: 0, description: 'Buy them a drink and something to eat.' },
  hangout: { label: 'Hang out for an hour', points: 15, cost: 0, minutes: 60, description: 'Spend an hour together. Friends only.' },
};

export const TALK_RADIUS = 2.2;

export const RESIDENTS: readonly Resident[] = [
  // Lagos, Marina Boulevard
  {
    id: 'tunde', district: 'lagos.marina', name: 'Tunde Bakare', role: 'Danfo conductor', lookId: 'male-adult-04',
    position: [5.2, 0, 32], facing: -Math.PI / 2,
    lines: [
      'Marina! Obalende! You dey enter? No? Then shift small, I dey work.',
      'Ah, you again. This road no dey sleep, I tell you.',
      'My guy! Sit down small. Today traffic from Ikorodu was something else.',
      'You be family now. If you ever need where to sleep, my couch dey Ebute Metta, no wahala.',
      'Best person on this whole boulevard. Anything you need, just call me.',
    ],
  },
  {
    id: 'adaeze', district: 'lagos.marina', name: 'Adaeze Okoro', role: 'Nurse at General Hospital', lookId: 'female-adult-11',
    position: [5.2, 0, -2], facing: -Math.PI / 2,
    lines: [
      'Sorry, I am between shifts. Did you need directions?',
      'Hello again. Remember to drink water in this heat.',
      'Night shift was long. Tell me something good that happened today.',
      'You are welcome at mine any time you need a bed. Just bring suya.',
      'You are the first person I call after a hard shift. Thank you for that.',
    ],
  },
  {
    id: 'bayo', district: 'lagos.marina', name: 'Bayo Adewale', role: 'Developer at Tech Campus', lookId: 'male-adult-18',
    position: [-5.2, 0, 16], facing: Math.PI / 2,
    lines: [
      'Hey. Just getting some air before stand-up.',
      'Oh hi. Still stuck on the same bug, believe it or not.',
      'Shipped it! Come, let me show you what we built.',
      'My flat is small but the sofa is yours if you ever need it.',
      'Honestly, you are the reason I did not quit last month.',
    ],
  },
  // Accra, Oxford Street, Osu
  {
    id: 'kojo', district: 'accra.osu', name: 'Kojo Asante', role: 'Tro-tro mate', lookId: 'male-adult-15',
    position: [7.2, 0, 34], facing: -Math.PI / 2,
    lines: [
      'Circle! Circle! Ah, you are not going? Okay, okay.',
      'Charley, how far? You are getting used to Osu now.',
      'Come and sit. Let me tell you about the driver who forgot his own bus.',
      'You are my brother now. If you need a place to sleep, come to Nima, my mother will cook.',
      'Me and you, we are one. Anything at all.',
    ],
  },
  {
    id: 'akosua', district: 'accra.osu', name: 'Akosua Boateng', role: 'Kente designer', lookId: 'female-adult-06',
    position: [-7, 0, -10], facing: Math.PI / 2,
    lines: [
      'Welcome to Osu. The Loft is just there if you like kente.',
      'Akwaaba again. I am finishing a new pattern for a wedding.',
      'Look at this weave. Each colour means something. Gold is for royalty.',
      'If you ever need a bed, my studio has a daybed. You are always welcome.',
      'I am naming my next design after you. Do not tell anyone.',
    ],
  },
  {
    id: 'yaw', district: 'accra.osu', name: 'Yaw Darko', role: 'Footballer', lookId: 'male-adult-10',
    position: [19, 0, 1.5], facing: Math.PI,
    lines: [
      'Training starts soon. You play?',
      'Hey! Come and watch us on Saturday.',
      'Coach finally put me in the first team. Let us celebrate.',
      'My place is near the arena. The couch is yours whenever.',
      'When I go pro, you are coming with me.',
    ],
  },
];

export const residentById = (id: string) => RESIDENTS.find((r) => r.id === id);
export const residentsIn = (districtId: string) => RESIDENTS.filter((r) => r.district === districtId);

export interface Relationship {
  points: number;
  /** Game day (totalMinutes / 1440) of the last activity, or -1. */
  lastDay: number;
}

export function friendshipLevel(points: number): number {
  let i = 0;
  while (i + 1 < FRIENDSHIP_LEVELS.length && points >= FRIENDSHIP_LEVELS[i + 1].points) i++;
  return i;
}

export const gameDay = (totalMinutes: number) => Math.floor(totalMinutes / 1440);

/** The resident within talking distance in this district, if any. */
export function residentNear(districtId: string, x: number, z: number): Resident | undefined {
  return residentsIn(districtId).find((r) => Math.hypot(r.position[0] - x, r.position[2] - z) <= TALK_RADIUS);
}

/** Keeps known residents only, with points in range. */
export function sanitiseRelationships(data: unknown): Record<string, Relationship> {
  const out: Record<string, Relationship> = {};
  if (typeof data !== 'object' || data === null) return out;
  for (const [id, v] of Object.entries(data as Record<string, unknown>)) {
    if (!residentById(id) || typeof v !== 'object' || v === null) continue;
    const r = v as Record<string, unknown>;
    const points = typeof r.points === 'number' && Number.isFinite(r.points) ? Math.max(0, Math.min(MAX_POINTS, Math.round(r.points))) : 0;
    const lastDay = typeof r.lastDay === 'number' && Number.isInteger(r.lastDay) && r.lastDay >= -1 ? r.lastDay : -1;
    out[id] = { points, lastDay };
  }
  return out;
}
