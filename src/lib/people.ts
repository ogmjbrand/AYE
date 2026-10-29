/**
 * Residents: computer-controlled people who live in each district. They are
 * always labelled as such; AYE never presents them as other players. Spending
 * time with them builds a relationship, one activity per person per game day.
 * Close friends will put you up on their couch for the night.
 */
import { hashString, pick, placeIn, planFor, slug, TEMPLATES, type CitySeed } from './districts/generate';
import { NIGERIA } from './districts/nigeria';
import { AFRICA } from './districts/africa';
import { WORLD } from './districts/world';
import { isSonghaiDistrict, songhaiText } from './songhai';
import { LOOKS } from './looks';

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
  /** Where they stroll, back and forth, starting at `position`. Omit to stand still. */
  route?: readonly (readonly [number, number])[];
  /** One line per friendship level (index matches FRIENDSHIP_LEVELS). */
  lines: readonly [string, string, string, string, string];
  /** A day that follows the game clock (replaces `route`): weekdays, and optionally weekends. */
  routine?: { weekday: readonly RoutineStep[]; weekend?: readonly RoutineStep[] };
}

/**
 * One part of a resident's day, from its start until the next step starts.
 * With `at` they stand there; with `walk` they walk that path over the step;
 * with neither they're off the street (indoors, or at work).
 */
export interface RoutineStep {
  /** Minute of the day it starts, 0 … 1439. */
  from: number;
  at?: readonly [number, number];
  facing?: number;
  walk?: readonly (readonly [number, number])[];
  /** What they're doing, in a few words. */
  doing: string;
}

export interface RoutineNow { present: boolean; doing: string; pose: Pose | null }

/** Where a resident with a routine is, `minute` (may be fractional) into the day; `dayOfWeek` 0 = Monday. */
export function routineNow(r: Resident, minute: number, dayOfWeek: number): RoutineNow | null {
  if (!r.routine) return null;
  const steps = (dayOfWeek >= 5 && r.routine.weekend) || r.routine.weekday;
  const m = ((minute % 1440) + 1440) % 1440;
  let i = steps.length - 1;
  for (let k = 0; k < steps.length; k++) if (steps[k].from <= m) i = k;
  const step = steps[i];
  if (step.walk && step.walk.length > 1) {
    const next = steps[(i + 1) % steps.length].from;
    const span = ((next - step.from) + 1440) % 1440 || 1440;
    const f = Math.min(1, (((m - step.from) + 1440) % 1440) / span);
    const legs = step.walk.slice(1).map((b, j) => ({ a: step.walk![j], b, len: Math.hypot(b[0] - step.walk![j][0], b[1] - step.walk![j][1]) }));
    let along = f * legs.reduce((sum, l) => sum + l.len, 0);
    for (const { a, b, len } of legs) {
      if (along <= len || b === legs[legs.length - 1].b) {
        const t = len ? Math.min(1, along / len) : 1;
        return { present: true, doing: step.doing, pose: { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, facing: Math.atan2(b[0] - a[0], b[1] - a[1]), moving: f < 1 } };
      }
      along -= len;
    }
  }
  if (step.at) return { present: true, doing: step.doing, pose: { x: step.at[0], z: step.at[1], facing: step.facing ?? r.facing, moving: false } };
  return { present: false, doing: step.doing, pose: null };
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

/** The residents of the hand-built districts. */
// Emeka's front step at Palm View, and the walk down the boulevard pavement to his office
const EMEKA_STEP = [-6.2, 22] as const;
// The lane between the café tables (x -6.9 … -5.5) and the lamp posts (x -4.5)
const EMEKA_COMMUTE = [EMEKA_STEP, [-5.05, 21], [-5.05, -30]] as const;
const at = (h: number, m = 0) => h * 60 + m;
const EMEKA_WEEKDAY: readonly RoutineStep[] = [
  { from: 0, doing: 'Asleep at home in Palm View' },
  { from: at(6, 50), at: EMEKA_STEP, facing: Math.PI / 2, doing: 'Having his morning coffee on the front step' },
  { from: at(7, 30), walk: EMEKA_COMMUTE, doing: 'Walking to the office' },
  { from: at(7, 50), doing: 'At work at the office' },
  { from: at(18), walk: [...EMEKA_COMMUTE].reverse(), doing: 'Walking home from work' },
  { from: at(18, 20), at: EMEKA_STEP, facing: Math.PI / 2, doing: 'Chatting on the front step' },
  { from: at(22), doing: 'Gone in for the night' },
];
const EMEKA_WEEKEND: readonly RoutineStep[] = [
  { from: 0, doing: 'Asleep at home in Palm View' },
  { from: at(9), at: EMEKA_STEP, facing: Math.PI / 2, doing: 'Taking it easy on the front step' },
  { from: at(13), doing: 'Out for lunch with family' },
  { from: at(16), at: EMEKA_STEP, facing: Math.PI / 2, doing: 'Chatting on the front step' },
  { from: at(22, 30), doing: 'Gone in for the night' },
];

const HAND_BUILT: readonly Resident[] = [
  // Lagos, Marina Boulevard: people at work in their uniforms
  {
    id: 'captain-ade', district: 'lagos.marina', name: 'Captain Ade Martins', role: 'Airline captain', lookId: 'pilot-male-01',
    position: [37, 0, 8.6], facing: Math.PI, route: [[37, 8.6], [41, 8.6]],
    lines: [
      'Just landed from Accra. Smooth flight, for once.',
      'You should book a trip at the travel desk. The lagoon looks beautiful from the air.',
      'Twenty years flying and I still get a thrill at take-off.',
      'If you ever want to train as a pilot, I will put a word in at the airport.',
      'My friend! Come, let me tell you about the storm over Abidjan.',
    ],
  },
  {
    id: 'officer-musa', district: 'lagos.marina', name: 'Officer Musa Danjuma', role: 'Police officer', lookId: 'police-male-01',
    position: [-5.2, 0, -14.2], facing: Math.PI / 2, route: [[-5.2, -14.2], [-5.2, -12.6]],
    lines: [
      'Good day. Keep to the pavement, the danfos do not slow down.',
      'Quiet morning on the boulevard. I like it that way.',
      'If anyone gives you trouble, you come and find me.',
      'Between us: the best suya on this street is from the market stall by Mama Put.',
      'You are always welcome here. Stay safe out there, my friend.',
    ],
  },
  {
    id: 'kelechi', district: 'lagos.marina', name: 'Kelechi Obi', role: 'Site foreman', lookId: 'construction-male-03',
    position: [-6.0, 0, 44.0], facing: Math.PI / 2,
    lines: [
      'Hard hats on past this point, please.',
      'We are fixing the drainage before the rains come.',
      'Long days, but I like building something people will use.',
      'If you ever buy a house, call me before you renovate.',
      'My friend! Come, I will show you the plans for the new tower.',
    ],
  },
  {
    id: 'ngozi-exec', district: 'lagos.marina', name: 'Ngozi Adeyemi', role: 'Investment banker', lookId: 'business-female-02',
    position: [6.2, 0, 8.0], facing: -Math.PI / 2, route: [[6.2, 8.0], [6.2, 14.0]],
    lines: [
      'Sorry, I have a call in five minutes.',
      'Markets were wild this morning. Coffee helps.',
      'Save a little every month; it adds up faster than you think.',
      'If you start a business, I would love to hear the pitch.',
      'You! Lunch is on me today, no arguments.',
    ],
  },
  {
    id: 'emeka-exec', district: 'lagos.marina', name: 'Emeka Nwosu', role: 'Company director', lookId: 'business-male-05',
    position: [-6.2, 0, 22.0], facing: Math.PI / 2,
    // Your neighbour at Palm View: coffee on the step, the walk to the office, home for the evening
    routine: { weekday: EMEKA_WEEKDAY, weekend: EMEKA_WEEKEND },
    lines: [
      'Good afternoon.',
      'The new office on the boulevard opens next month.',
      'Hard work and good people: that is the whole secret.',
      'We are hiring soon. Keep an eye out.',
      'My friend, you must come to the company dinner.',
    ],
  },
  {
    id: 'tunde', district: 'lagos.marina', name: 'Tunde Bakare', role: 'Danfo conductor', lookId: 'male-adult-04',
    position: [5.2, 0, 29.5], facing: -Math.PI / 2, route: [[5.2, 29.5], [5.2, 34.5]],
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
    position: [5.2, 0, -2], facing: -Math.PI / 2, route: [[5.2, -2], [5.2, -10]],
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
    position: [-5.2, 0, 14], facing: Math.PI / 2, route: [[-5.2, 14], [-5.2, 19]],
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
    position: [7.2, 0, 32], facing: -Math.PI / 2, route: [[7.2, 32], [7.2, 36]],
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
    position: [-7, 0, -9], facing: Math.PI / 2, route: [[-7, -9], [-7.4, -12]],
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
    position: [19, 0, 1.5], facing: Math.PI, route: [[19, 1.5], [19, -10]],
    lines: [
      'Training starts soon. You play?',
      'Hey! Come and watch us on Saturday.',
      'Coach finally put me in the first team. Let us celebrate.',
      'My place is near the arena. The couch is yours whenever.',
      'When I go pro, you are coming with me.',
    ],
  },
];

/**
 * Generated cities (lib/districts/generate.ts) get residents in the same spots
 * as their street plan's own residents, with local names and their own looks.
 */
const TEMPLATE_PEOPLE: Record<'marina' | 'osu', readonly { role: string; lines: Resident['lines'] }[]> = {
  marina: [
    {
      role: '{bus}',
      lines: [
        'Getting on? No? Then mind the door, I am working.',
        'Ah, you again. This road never sleeps, I tell you.',
        'Sit down a minute. Traffic this morning was something else.',
        'You are family now. If you ever need somewhere to sleep, my couch is yours.',
        'Best person on this whole road. Anything you need, just call me.',
      ],
    },
    {
      role: 'Nurse at {hospital}',
      lines: [
        'Sorry, I am between shifts. Did you need directions?',
        'Hello again. Remember to drink some water today.',
        'Night shift was long. Tell me something good that happened today.',
        'You are welcome at mine any time you need a bed.',
        'You are the first person I call after a hard shift. Thank you for that.',
      ],
    },
    {
      role: 'Developer at {tech}',
      lines: [
        'Hey. Just getting some air before stand-up.',
        'Oh hi. Still stuck on the same bug, believe it or not.',
        'Shipped it! Come, let me show you what we built.',
        'My flat is small but the sofa is yours if you ever need it.',
        'Honestly, you are the reason I did not quit last month.',
      ],
    },
  ],
  osu: [
    {
      role: '{bus}',
      lines: [
        'Last stop! Ah, you are not going? Okay, okay.',
        'How far? You are getting used to this place now.',
        'Come and sit. Let me tell you about the driver who forgot his own bus.',
        'You are family now. If you need a place to sleep, come, my mother will cook.',
        'Me and you, we are one. Anything at all.',
      ],
    },
    {
      role: 'Fashion designer',
      lines: [
        'Welcome. The fashion house is just there if you like good fabric.',
        'Hello again. I am finishing a new outfit for a wedding.',
        'Look at this pattern. Every colour in it means something.',
        'If you ever need a bed, my studio has a daybed. You are always welcome.',
        'I am naming my next design after you. Do not tell anyone.',
      ],
    },
    {
      role: 'Footballer',
      lines: [
        'Training starts soon. You play?',
        'Hey! Come and watch us on Saturday.',
        'Coach finally put me in the first team. Let us celebrate.',
        'My place is near the sports centre. The couch is yours whenever.',
        'When I go pro, you are coming with me.',
      ],
    },
  ],
};

/** In Nigeria the conductor speaks pidgin. */
const NAIJA_CONDUCTOR = {
  role: 'Bus conductor',
  lines: [
    'You dey enter? No? Then shift small, I dey work.',
    'Ah, you again. This road no dey sleep, I tell you.',
    'Sit down small. Traffic this morning was something else.',
    'You be family now. If you ever need where to sleep, my couch dey for you.',
    'Best person on this whole road. Anything you need, just call me.',
  ] as Resident['lines'],
};

function generatedResidents(seed: CitySeed): Resident[] {
  const plan = planFor(seed);
  const used = new Set<string>();
  return TEMPLATES[plan.template].people.map((r, i) => {
    const female = r.female;
    const pool = female ? seed.style.names.female : seed.style.names.male;
    let k = hashString(`${seed.id}:${i}`);
    while (used.has(pool[k % pool.length])) k++;
    const first = pool[k % pool.length];
    used.add(first);
    const family = pick(seed.style.names.family, `${seed.id}:${i}:family`);
    const looks = LOOKS.filter((l) => l.body === (female ? 'feminine' : 'masculine'));
    const { position, facing } = placeIn(seed, r.position, r.facing);
    // The avenue has the same three kinds of people as Marina
    const roles = TEMPLATE_PEOPLE[plan.template === 'osu' ? 'osu' : 'marina'];
    const slot = seed.country === 'NG' && plan.template !== 'osu' && i === 0 ? NAIJA_CONDUCTOR : roles[i];
    return {
      id: `${seed.id}-${slug(first)}`,
      district: plan.id,
      name: `${first} ${family}`,
      role: slot.role.replace('{bus}', seed.style.busRole ?? 'Bus conductor').replace('{hospital}', `${seed.name} General Hospital`).replace('{tech}', `${seed.name} Tech Hub`),
      lookId: pick(looks, `${seed.id}:${i}:look`).id,
      position,
      facing,
      route: r.route?.map(([x, z]) => {
        const p = placeIn(seed, [x, 0, z]).position;
        return [p[0], p[2]] as const;
      }),
      lines: slot.lines,
    };
  });
}

/** Everyone, in every district. Always computer-controlled, and labelled so. */
export const RESIDENTS: readonly Resident[] = [...HAND_BUILT, ...[...NIGERIA, ...AFRICA, ...WORLD].flatMap(generatedResidents)]
  // In Songhai, what they say and do uses Songhai's place names (their IDs stay the same)
  .map((r) => (isSonghaiDistrict(r.district) ? { ...r, role: songhaiText(r.role), lines: r.lines.map(songhaiText) as unknown as Resident['lines'] } : r));

export const residentById = (id: string) => RESIDENTS.find((r) => r.id === id);
export const residentsIn = (districtId: string) => RESIDENTS.filter((r) => r.district === districtId);
/** Every resident drawn from an adult look: the everyday adults and the people at work in uniform (business, pilot, police…). Never a child or teen look. */
export const isAdultResident = (resident: Resident) =>
  /^(?:female|male)-adult-|^(?:business|construction|medical|pilot|police)-(?:female|male)-/i.test(resident.lookId)
  && !/child|kid|teen/i.test(resident.lookId);

export interface Relationship {
  points: number;
  /** Game day (totalMinutes / 1440) of the last activity, or -1. */
  lastDay: number;
  /** Game day you last texted or called them, if ever (one a day). */
  lastPhone?: number;
  /** Game day of the last completed hug, or -1 for older saves. */
  lastHugDay?: number;
}

export function friendshipLevel(points: number): number {
  let i = 0;
  while (i + 1 < FRIENDSHIP_LEVELS.length && points >= FRIENDSHIP_LEVELS[i + 1].points) i++;
  return i;
}

export const gameDay = (totalMinutes: number) => Math.floor(totalMinutes / 1440);

/** Strolling speed (m/s) and how long they stop at each end of their route (s). */
export const STROLL_SPEED = 0.9;
export const STROLL_PAUSE = 4;
/** Residents stop and turn to you within this distance. */
export const NOTICE_RADIUS = 3.2;

export interface Pose { x: number; z: number; facing: number; moving: boolean }

/**
 * Where a resident is after `t` seconds of strolling: there and back along
 * their route, pausing at each end. Pure, so it can be tested and replayed.
 */
export function residentPose(r: Resident, t: number): Pose {
  const pts = r.route && r.route.length > 1 ? r.route : null;
  if (!pts) return { x: r.position[0], z: r.position[2], facing: r.facing, moving: false };
  // Out along the route then back, as one list of legs
  const path = [...pts, ...pts.slice(0, -1).reverse()];
  const legs = path.slice(1).map((p, i) => {
    const a = path[i];
    return { a, b: p, len: Math.hypot(p[0] - a[0], p[1] - a[1]) };
  });
  const turnAt = pts.length - 1; // index of the leg that starts the way back
  const segTime = (i: number) => legs[i].len / STROLL_SPEED + (i === turnAt - 1 || i === legs.length - 1 ? STROLL_PAUSE : 0);
  const cycle = legs.reduce((sum, _, i) => sum + segTime(i), 0);
  let rem = ((t % cycle) + cycle) % cycle;
  for (let i = 0; i < legs.length; i++) {
    const { a, b, len } = legs[i];
    const walk = len / STROLL_SPEED;
    const facing = Math.atan2(b[0] - a[0], b[1] - a[1]);
    if (rem < walk) {
      const f = rem / walk;
      return { x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, facing, moving: true };
    }
    rem -= walk;
    const pause = segTime(i) - walk;
    if (rem < pause) return { x: b[0], z: b[1], facing, moving: false };
    rem -= pause;
  }
  return { x: pts[0][0], z: pts[0][1], facing: r.facing, moving: false };
}

// Where each resident is right now (written by the 3D world each frame), so talking uses their real spot
const livePositions = new Map<string, { x: number; z: number; facing: number }>();
export function setLivePosition(id: string, x: number, z: number, facing?: number) {
  const resident = residentById(id);
  offStreet.delete(id);
  livePositions.set(id, { x, z, facing: facing ?? resident?.facing ?? 0 });
}
/** Residents keeping a routine who are off the street right now (indoors, or at work). */
const offStreet = new Set<string>();
/** The 3D world marks someone off the street while their routine has them away. */
export function clearLivePosition(id: string) {
  livePositions.delete(id);
  offStreet.add(id);
}
export const residentPosition = (r: Resident) => livePositions.get(r.id) ?? { x: r.position[0], z: r.position[2] };
export const residentFacing = (r: Resident) => livePositions.get(r.id)?.facing ?? r.facing;
export function residentPositionsIn(districtId: string): { x: number; z: number }[] {
  return residentsIn(districtId).flatMap((resident) => {
    const position = livePositions.get(resident.id);
    return position ? [position] : [];
  });
}

/** The resident within talking distance in this district, if any. */
export function residentNear(districtId: string, x: number, z: number): Resident | undefined {
  return residentsIn(districtId).find((r) => {
    // Someone keeping a routine is only here while they're out on the street
    if (offStreet.has(r.id)) return false;
    const p = residentPosition(r);
    return Math.hypot(p.x - x, p.z - z) <= TALK_RADIUS;
  });
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
    const lastHugDay = typeof r.lastHugDay === 'number' && Number.isInteger(r.lastHugDay) && r.lastHugDay >= -1 ? r.lastHugDay : -1;
    out[id] = { points, lastDay, lastHugDay };
    if (typeof r.lastPhone === 'number' && Number.isInteger(r.lastPhone) && r.lastPhone >= 0) out[id].lastPhone = r.lastPhone;
  }
  return out;
}
