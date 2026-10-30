/**
 * Alafia Spa, Ayemara: a walk-in day spa past Marina Motors. Two ways to
 * play it:
 *
 *  - As a guest: book a treatment at reception (full body, deep tissue,
 *    Swedish, sports, relaxation, back & neck, foot, hot stone, or a couples
 *    massage with a friend), go to your treatment room and lie on the table.
 *    Time passes and the treatment lifts your energy and mood. Paid in GHAI
 *    (the game's own currency, not real money) like any purchase.
 *
 *  - As a massage therapist: ask the manager for a job, clock in during spa
 *    hours, and take the waiting clients (computer-controlled) one by one.
 *    Every service is its own short routine: each step you choose the oil, the
 *    pressure, the technique or the tool, guided by what the client asked
 *    for. The client's satisfaction decides the tip. You're paid a share of
 *    the treatment's price for each session plus the tip, and good sessions
 *    move you up from trainee to spa lead (a bigger share).
 *
 * Coordinates are the spa's own, centred on the floor; the entrance is in the
 * middle of the near wall (−z), like the other venues.
 */
import { buildLayout, type Building, type DistrictLayout } from './world';
import { run, type WallSeg } from './buildingShell';
import type { Needs } from './needs';
import type { Seat } from './seating';

export const SPA_NAME = 'Alafia Spa';
export const SPA_ID = 'alafia-spa';
export const OPEN_HOUR = 9;
export const CLOSE_HOUR = 21;
export const isOpen = (hour: number) => hour >= OPEN_HOUR && hour < CLOSE_HOUR;
/** Therapists work 10:00 to 20:00. */
export const SHIFT_START = 10;
export const SHIFT_END = 20;
export const onShiftHours = (hour: number) => hour >= SHIFT_START && hour < SHIFT_END;

// ---------------------------------------------------------------- the services

export type ServiceId = 'full-body' | 'deep-tissue' | 'swedish' | 'sports' | 'relaxation' | 'back-neck' | 'foot' | 'hot-stone' | 'couples';

export interface SpaService {
  id: ServiceId;
  name: string;
  /** Price for a guest, in GHAI. */
  price: number;
  minutes: number;
  description: string;
  /** What it does for you as a guest. */
  lift: Partial<Needs>;
  /** Needs a friend to come with you. */
  couples?: boolean;
}

export const SERVICES: readonly SpaService[] = [
  { id: 'full-body', name: 'Full Body Massage', price: 320, minutes: 60, lift: { energy: 30, fun: 15 }, description: 'Head to toe: back, shoulders, arms, legs and feet, with warm oil.' },
  { id: 'deep-tissue', name: 'Deep Tissue Massage', price: 380, minutes: 60, lift: { energy: 35, fun: 8 }, description: 'Slow, firm pressure into the deeper muscles to release tight knots.' },
  { id: 'swedish', name: 'Swedish Massage', price: 300, minutes: 50, lift: { energy: 25, fun: 15 }, description: 'Long gliding strokes and gentle kneading to relax the whole body.' },
  { id: 'sports', name: 'Sports Massage', price: 340, minutes: 45, lift: { energy: 30, fun: 8 }, description: 'For training and recovery: stretching, firm work on the legs and back.' },
  { id: 'relaxation', name: 'Relaxation Massage', price: 260, minutes: 45, lift: { energy: 20, fun: 20 }, description: 'Light pressure, soft music and aromatherapy oil. Good mood, less stress.' },
  { id: 'back-neck', name: 'Back & Neck Massage', price: 180, minutes: 30, lift: { energy: 18, fun: 8 }, description: 'Focused on the shoulders, neck and upper back: eases desk tension.' },
  { id: 'foot', name: 'Foot Massage', price: 150, minutes: 30, lift: { energy: 15, fun: 10 }, description: 'Reflexology on the soles and a warm foot soak. Helps you sleep.' },
  { id: 'hot-stone', name: 'Hot Stone Massage', price: 420, minutes: 70, lift: { energy: 35, fun: 18 }, description: 'Smooth heated basalt stones laid along the back, then massaged in.' },
  { id: 'couples', name: 'Couples Massage', price: 560, minutes: 60, lift: { energy: 28, fun: 20, social: 30 }, couples: true, description: 'Side by side with a friend, two therapists. Together is better.' },
];
export const serviceById = (id: string) => SERVICES.find((s) => s.id === id);

// ---------------------------------------------------------------- the routines (the therapist's game)

/** What a client asks for. */
export type Pressure = 'light' | 'medium' | 'firm';
export type Oil = 'lavender' | 'coconut' | 'eucalyptus' | 'unscented';
export type Focus = 'shoulders' | 'lower back' | 'legs' | 'feet';

export interface StepOption {
  label: string;
  /** How well it serves this client (computed per client by `scoreStep`). */
  tag: string;
}
export interface Step {
  id: string;
  /** What you're doing at this step. */
  prompt: string;
  options: readonly StepOption[];
}

const OILS: readonly StepOption[] = [
  { label: 'Lavender oil', tag: 'oil:lavender' }, { label: 'Coconut oil', tag: 'oil:coconut' },
  { label: 'Eucalyptus oil', tag: 'oil:eucalyptus' }, { label: 'Unscented oil', tag: 'oil:unscented' },
];
const PRESSURES: readonly StepOption[] = [
  { label: 'Light pressure', tag: 'p:light' }, { label: 'Medium pressure', tag: 'p:medium' }, { label: 'Firm pressure', tag: 'p:firm' },
];
const FOCUS: readonly StepOption[] = [
  { label: 'Shoulders and neck', tag: 'f:shoulders' }, { label: 'Lower back', tag: 'f:lower back' }, { label: 'Legs', tag: 'f:legs' }, { label: 'Feet', tag: 'f:feet' },
];
const prep: Step = { id: 'prep', prompt: 'Prepare the room', options: [
  { label: 'Dim the lights, light the candles, warm towels', tag: 'good' },
  { label: 'Bright lights and the radio on', tag: 'bad' },
  { label: 'Start straight away, no preparation', tag: 'bad' },
] };
const oil: Step = { id: 'oil', prompt: 'Choose the oil', options: OILS };
const finish: Step = { id: 'finish', prompt: 'Finish the session', options: [
  { label: 'Warm towel, a glass of water, quiet goodbye', tag: 'good' },
  { label: 'Switch the lights on and leave', tag: 'bad' },
  { label: 'Ask them to book again before they get up', tag: 'meh' },
] };
const step = (id: string, prompt: string, options: readonly StepOption[]): Step => ({ id, prompt, options });

/** Each service's routine: the steps in order. */
export const ROUTINES: Record<ServiceId, readonly Step[]> = {
  'full-body': [prep, oil, step('pressure', 'Set your pressure', PRESSURES), step('order', 'Work in order', [
    { label: 'Back, then shoulders, arms, legs and feet', tag: 'good' }, { label: 'Feet first, then jump about', tag: 'bad' }, { label: 'Only the back', tag: 'meh' },
  ]), step('focus', 'Spend extra time on', FOCUS), finish],
  'deep-tissue': [prep, oil, step('warm', 'Warm the muscles first', [
    { label: 'Five minutes of broad strokes', tag: 'good' }, { label: 'Go straight to deep pressure', tag: 'bad' },
  ]), step('pressure', 'Set your pressure', PRESSURES), step('tool', 'Choose a tool for the knots', [
    { label: 'Your forearm, slowly along the muscle', tag: 'good' }, { label: 'Wooden roller', tag: 'meh' }, { label: 'Fingertip jabs', tag: 'bad' },
  ]), step('focus', 'Work deeper on', FOCUS), finish],
  swedish: [prep, oil, step('effleurage', 'Long gliding strokes (effleurage)', [
    { label: 'Long, flowing strokes towards the heart', tag: 'good' }, { label: 'Short choppy strokes', tag: 'bad' },
  ]), step('petrissage', 'Kneading (petrissage)', [
    { label: 'Gentle rhythmic kneading', tag: 'good' }, { label: 'Pinching hard', tag: 'bad' },
  ]), step('pressure', 'Set your pressure', PRESSURES), finish],
  sports: [prep, step('oil', 'Choose the oil', OILS), step('stretch', 'Stretch the legs', [
    { label: 'Slow assisted hamstring stretch, hold and breathe', tag: 'good' }, { label: 'Bounce the stretch', tag: 'bad' },
  ]), step('pressure', 'Set your pressure', PRESSURES), step('focus', 'Focus on', FOCUS), finish],
  relaxation: [prep, oil, step('music', 'Choose the music', [
    { label: 'Soft music, low volume', tag: 'good' }, { label: 'Upbeat dance music', tag: 'bad' }, { label: 'Silence', tag: 'meh' },
  ]), step('pressure', 'Set your pressure', PRESSURES), finish],
  'back-neck': [prep, oil, step('position', 'Position the client', [
    { label: 'Face down, face in the head rest', tag: 'good' }, { label: 'Sitting on a stool', tag: 'meh' },
  ]), step('pressure', 'Set your pressure', PRESSURES), step('neck', 'Work the neck', [
    { label: 'Gentle circles at the base of the skull', tag: 'good' }, { label: 'Twist the head', tag: 'bad' },
  ]), finish],
  foot: [prep, step('soak', 'Warm foot soak', [
    { label: 'Warm water with salts, 5 minutes', tag: 'good' }, { label: 'Cold water', tag: 'bad' }, { label: 'Skip the soak', tag: 'meh' },
  ]), oil, step('reflex', 'Reflexology', [
    { label: 'Thumb-walk along the sole, then the toes', tag: 'good' }, { label: 'Tickle', tag: 'bad' },
  ]), step('pressure', 'Set your pressure', PRESSURES), finish],
  'hot-stone': [prep, oil, step('heat', 'Heat the stones', [
    { label: '50 °C, tested on your own wrist', tag: 'good' }, { label: '70 °C, as hot as possible', tag: 'bad' }, { label: '35 °C, barely warm', tag: 'meh' },
  ]), step('place', 'Place the stones', [
    { label: 'Along either side of the spine, on a towel', tag: 'good' }, { label: 'Straight on the spine', tag: 'bad' },
  ]), step('pressure', 'Massage with the stones', PRESSURES), finish],
  couples: [prep, step('sync', 'Work with your colleague', [
    { label: 'Agree the routine and keep the same pace', tag: 'good' }, { label: 'Each do your own thing', tag: 'bad' },
  ]), oil, step('pressure', 'Set your pressure', PRESSURES), finish],
};

// ---------------------------------------------------------------- clients

export interface Client {
  id: string;
  name: string;
  lookId: string;
  service: ServiceId;
  pressure: Pressure;
  oil: Oil;
  focus: Focus;
  /** What they say at reception. */
  note: string;
}

const CLIENT_POOL: readonly Omit<Client, 'id' | 'service' | 'note'>[] = [
  { name: 'Adaeze', lookId: 'female-adult-11', pressure: 'medium', oil: 'lavender', focus: 'shoulders' },
  { name: 'Kwame', lookId: 'male-adult-04', pressure: 'firm', oil: 'eucalyptus', focus: 'legs' },
  { name: 'Halima', lookId: 'female-adult-03', pressure: 'light', oil: 'coconut', focus: 'feet' },
  { name: 'Femi', lookId: 'male-adult-10', pressure: 'firm', oil: 'unscented', focus: 'lower back' },
  { name: 'Ngozi', lookId: 'female-adult-06', pressure: 'medium', oil: 'coconut', focus: 'lower back' },
  { name: 'Yaw', lookId: 'male-adult-15', pressure: 'medium', oil: 'lavender', focus: 'shoulders' },
  { name: 'Zainab', lookId: 'female-adult-10', pressure: 'light', oil: 'lavender', focus: 'shoulders' },
  { name: 'Emeka', lookId: 'male-adult-01', pressure: 'firm', oil: 'eucalyptus', focus: 'legs' },
];
const SERVICE_ORDER: readonly ServiceId[] = ['swedish', 'deep-tissue', 'foot', 'back-neck', 'hot-stone', 'sports', 'relaxation', 'full-body', 'couples'];
export const CLIENTS_PER_DAY = 5;

/** Today's clients (the same every time for the same day). */
export function clientsFor(day: number): Client[] {
  return Array.from({ length: CLIENTS_PER_DAY }, (_, i) => {
    const base = CLIENT_POOL[(day * 3 + i * 5) % CLIENT_POOL.length];
    const service = SERVICE_ORDER[(day * 2 + i * 4) % SERVICE_ORDER.length];
    const note = `${serviceById(service)!.name}, ${base.pressure} pressure please. I like ${base.oil === 'unscented' ? 'unscented oil' : `${base.oil} oil`}, and my ${base.focus} ${base.focus === 'feet' || base.focus === 'legs' || base.focus === 'shoulders' ? 'need' : 'needs'} the most work.`;
    return { ...base, id: `d${day}-c${i}`, service, note };
  });
}
export const clientById = (day: number, id: string) => clientsFor(day).find((c) => c.id === id);

/** Points for one choice: what the client asked for, or a good habit, scores. */
export function scoreStep(client: Client, option: StepOption): number {
  const [k, v] = option.tag.split(':');
  if (k === 'oil') return v === client.oil ? 2 : 0;
  if (k === 'p') return v === client.pressure ? 2 : (v === 'medium' || client.pressure === 'medium') ? 1 : -1;
  if (k === 'f') return v === client.focus ? 2 : 0;
  return option.tag === 'good' ? 2 : option.tag === 'meh' ? 1 : -1;
}

/** Satisfaction 0–100 for a whole routine (one chosen option index per step). */
export function satisfaction(client: Client, choices: readonly number[]): number | null {
  const steps = ROUTINES[client.service];
  if (choices.length !== steps.length) return null;
  let got = 0;
  for (let i = 0; i < steps.length; i++) {
    const opt = steps[i].options[choices[i]];
    if (!opt) return null;
    got += scoreStep(client, opt);
  }
  return Math.max(0, Math.min(100, Math.round((got / (steps.length * 2)) * 100)));
}

export const stars = (sat: number) => (sat >= 90 ? 5 : sat >= 75 ? 4 : sat >= 55 ? 3 : sat >= 35 ? 2 : 1);

// ---------------------------------------------------------------- the job

export const LEVELS = [
  { title: 'Trainee therapist', share: 0.3, sessions: 0 },
  { title: 'Massage therapist', share: 0.4, sessions: 8 },
  { title: 'Senior therapist', share: 0.5, sessions: 25 },
  { title: 'Spa lead', share: 0.6, sessions: 60 },
] as const;

export interface SpaJob {
  employed: boolean;
  clockedIn: boolean;
  /** Game day the served list is for. */
  day: number;
  served: string[];
  /** Good sessions (3 stars or more), which count towards promotion. */
  goodSessions: number;
  sessionsTotal: number;
  earnedTotal: number;
}
export const emptySpaJob = (): SpaJob => ({ employed: false, clockedIn: false, day: -1, served: [], goodSessions: 0, sessionsTotal: 0, earnedTotal: 0 });

export function levelOf(job: Pick<SpaJob, 'goodSessions'>) {
  let i = 0;
  while (i + 1 < LEVELS.length && job.goodSessions >= LEVELS[i + 1].sessions) i++;
  return i;
}

/** A new day clears who you've served and clocks you out. */
export function rollSpaDay(job: SpaJob, totalMinutes: number): SpaJob {
  const day = Math.floor(totalMinutes / 1440);
  return job.day === day ? job : { ...job, day, served: [], clockedIn: false };
}

/** Pay for one session: a share of the price by level, plus a tip by satisfaction (up to a quarter of the price). */
export function sessionPay(job: SpaJob, service: SpaService, sat: number): { fee: number; tip: number } {
  const fee = Math.round(service.price * LEVELS[levelOf(job)].share);
  const tip = sat >= 55 ? Math.round(service.price * 0.25 * ((sat - 55) / 45)) : 0;
  return { fee, tip };
}

export function sanitiseSpaJob(v: unknown): SpaJob {
  if (!v || typeof v !== 'object') return emptySpaJob();
  const o = v as Record<string, unknown>;
  const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);
  return {
    employed: o.employed === true,
    clockedIn: o.clockedIn === true && o.employed === true,
    day: typeof o.day === 'number' && Number.isInteger(o.day) ? o.day : -1,
    served: Array.isArray(o.served) ? o.served.filter((s): s is string => typeof s === 'string').slice(0, CLIENTS_PER_DAY) : [],
    goodSessions: n(o.goodSessions),
    sessionsTotal: n(o.sessionsTotal),
    earnedTotal: n(o.earnedTotal),
  };
}

// ---------------------------------------------------------------- the building

export const STOREY = 3.2;
export const ROOM = { x0: -9, x1: 9, z0: -7, z1: 7 } as const;
/** Reception at the front (z −7 … −1); three treatment rooms behind (z −1 … 7). */
export const LOBBY_Z1 = -1;
export const DOOR_SPOT = [0, ROOM.z0 + 0.8] as const;
export const DESK = { x: 4.2, z: -4.2, w: 3.0, d: 0.8, h: 1.05 } as const;
export const DESK_SPOT = [DESK.x, DESK.z - 0.95] as const;
export const MANAGER_SPOT = [-5.5, -2.4] as const;
export const ROOM_DOOR_W = 1.6;

export interface TreatmentRoom {
  id: string;
  name: string;
  x0: number;
  x1: number;
  /** Massage tables: centre, along z, head at +z. */
  tables: readonly { x: number; z: number }[];
}
export const ROOMS: readonly TreatmentRoom[] = [
  { id: 'lotus', name: 'Lotus Room', x0: -9, x1: -3, tables: [{ x: -6, z: 3.4 }] },
  { id: 'jasmine', name: 'Jasmine Room', x0: -3, x1: 3, tables: [{ x: 0, z: 3.4 }] },
  { id: 'baobab', name: 'Baobab Couples Suite', x0: 3, x1: 9, tables: [{ x: 4.9, z: 3.4 }, { x: 7.9, z: 3.4 }] },
];
export const TABLE = { w: 0.75, l: 1.95, h: 0.78 } as const;
export const roomDoorX = (r: TreatmentRoom) => (r.x0 + r.x1) / 2;
/** Where you stand beside a table (on its −x side). */
export const tableSpot = (t: { x: number; z: number }) => [t.x - TABLE.w / 2 - 0.55, t.z] as const;
/** Where each bed's magnifier lamp stands: past the head, on the side you work from (the other side is the colleague's). */
export const lampSpot = (t: { x: number; z: number }) => [t.x - 0.6, t.z + 1.05] as const;
/** The waiting area's shell chair and side table, and the vanity on the far wall (its console, then its stool). */
export const SHELL_CHAIR = [-3.85, -5.95] as const;
export const SIDE_TABLE = [-4.75, -6.05] as const;
export const VANITY_Z = -4.4;
/** The room for a service: couples go to the suite, the rest to the first two rooms. */
export const roomFor = (service: ServiceId, alt = 0) => (service === 'couples' ? ROOMS[2] : ROOMS[alt % 2]);

export function spaWalls(): WallSeg[] {
  const { x0, x1, z0, z1 } = ROOM;
  return [
    ...run('x', z0, x0, x1, [[0, 1.8]], { outer: true }),
    ...run('x', z1, x0, x1, [], { outer: true }),
    ...run('z', x0, z0, z1, [], { outer: true }),
    ...run('z', x1, z0, z1, [], { outer: true }),
    // Reception to the treatment rooms, a door into each
    ...run('x', LOBBY_Z1, x0, x1, ROOMS.map((r) => [roomDoorX(r), ROOM_DOOR_W] as const)),
    // Between the rooms
    ...run('z', -3, LOBBY_Z1, z1, []),
    ...run('z', 3, LOBBY_Z1, z1, []),
  ];
}

const WALL_T = 0.3;

export function spaLayout(): DistrictLayout {
  const solid = (x: number, z: number, sx: number, sz: number, h = STOREY): Building =>
    ({ position: [x, 0, z], size: [sx, h, sz], color: '#000', style: 'residential' });
  const buildings: Building[] = [
    ...spaWalls().map((w) => {
      const alongX = w.z0 === w.z1;
      return solid((w.x0 + w.x1) / 2, (w.z0 + w.z1) / 2, alongX ? Math.abs(w.x1 - w.x0) : WALL_T, alongX ? WALL_T : Math.abs(w.z1 - w.z0));
    }),
    solid(0, ROOM.z0 - 0.3, 1.8, 0.2),
    solid(DESK.x, DESK.z, DESK.w, DESK.d, DESK.h),
    solid(DESK.x, DESK.z + 0.9, DESK.w, 0.8, 2),
    // Waiting sofa and the product shelf
    solid(-6.2, -5.9, 2.2, 0.9, 0.8),
    solid(-8.6, -4.0, 0.5, 1.8, 1.8),
    // The shell chair, side table and vanity
    solid(SHELL_CHAIR[0], SHELL_CHAIR[1], 0.75, 0.7, 0.9),
    solid(SIDE_TABLE[0], SIDE_TABLE[1], 0.45, 0.45, 0.6),
    solid(ROOM.x1 - 0.16 - 0.22, VANITY_Z, 0.45, 1.1, 0.8),
    solid(ROOM.x1 - 0.16 - 0.72, VANITY_Z, 0.4, 0.4, 0.48),
    // Beds, their trolleys and magnifier lamps
    ...ROOMS.flatMap((r) => r.tables.flatMap((t) => [
      solid(t.x, t.z, TABLE.w, TABLE.l, TABLE.h),
      solid(t.x + 0.8, t.z + 0.9, 0.45, 0.45, 0.8),
      solid(lampSpot(t)[0], lampSpot(t)[1], 0.4, 0.4, 1.4),
    ])),
  ];
  return buildLayout({
    id: `venue.${SPA_ID}`,
    roadHalfWidth: 1000,
    pavementWidth: 0,
    crossStreet: { minZ: 5000, maxZ: 5001 },
    buildings,
    palms: null,
    lamps: { x: 0, spacing: 1000, offset: 5000 },
    powerPoles: [],
    vehicles: [],
    stalls: [],
    traffic: [],
    billboard: null,
    park: null,
    terraceChairs: [],
    skyline: { seed: 1, warm: ['#000'], glass: ['#000'], towerChance: 0 },
  });
}

// ---------------------------------------------------------------- people

/** The waiting sofa: three places, facing the desk side. */
export const WAITING_SEATS: readonly Seat[] = [-6.9, -6.2, -5.5].map((x, i) => ({ id: `wait-${i}`, x, z: -5.75, facing: 0, height: 0.45 }));

export const SPA_STAFF = {
  receptionist: { lookId: 'female-adult-04', name: 'Kemi', role: 'Receptionist', x: DESK.x, z: DESK.z + 0.8, facing: Math.PI },
  manager: { lookId: 'female-adult-08', name: 'Ifeoma', role: 'Spa manager', x: MANAGER_SPOT[0], z: MANAGER_SPOT[1] - 0.9, facing: 0 },
  therapist: { lookId: 'male-adult-12', name: 'Tunde', role: 'Massage therapist' },
} as const;
