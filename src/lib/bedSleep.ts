/**
 * Going to bed and getting up, as a timeline: where the sleeper's body is at
 * each moment, and the shape of the duvet over them.
 *
 * Beds are drawn with the headboard on +z (world/PlainBedroom.tsx,
 * world/LuxeBedroom.tsx); you stand in the aisle on the bed's +x side
 * (lib/interiors.ts bedSpot). Going to bed is what people do:
 *
 *   1. turn your back to the bed,
 *   2. sit down on its edge (the Rocketbox seated pose, *_sit_chair_idle),
 *   3. lie down on your side: the seated body tips over onto its right side
 *      as the legs come up, so it ends curled on its side, knees drawn up,
 *      head on the pillow, facing out into the room,
 *   4. pull the duvet up over your shoulder.
 *
 * Waking up plays the same timeline backwards, to standing beside the bed.
 *
 * The seated pose has its pelvis right above the character's origin
 * (lib/seating.ts), so the whole movement is the body turning about the
 * pelvis: the lying pose is the seated pose laid on its side.
 */
import type { SeatTransition } from './bodyLanguage';
import type { Furniture } from './interiors';

export type SeatClip = SeatTransition | 'Sit';

/** Top of the mattress for each bed style (matches the drawn beds). */
export function mattressTop(bed: Pick<Furniture, 'style'>): number {
  return bed.style === 'luxe' ? 0.62 : 0.54;
}

/** Top of the bed's own folded duvet, which the drawn-up duvet lies above. */
export function bedSurface(bed: Pick<Furniture, 'style'>): number {
  return bed.style === 'luxe' ? 0.68 : 0.6;
}

/** The pelvis rests this far above the seat when seated (the turning point of the whole movement). */
export const PELVIS_ABOVE_SEAT = 0.08;
/** Lying on your side, the pelvis is about half a hip's width above the mattress. */
const PELVIS_ABOVE_MATTRESS_LYING = 0.16;

// Where the body lies, as shares of standing height from the character's origin, measured from the bones of a
// Rocketbox look lying in bed (female-adult-08, 168 cm): hip joint, shoulders, top of the head, knee, ankle and toes
const HIP_ALONG = 0.065;
const SHOULDER_ALONG = 0.3;
/** Head bone (0.42) plus the skull above it. */
const CROWN_ALONG = 0.53;
const KNEE_ACROSS = 0.21;
const KNEE_ALONG = -0.07;
const ANKLE_ACROSS = 0.155;
const ANKLE_ALONG = -0.29;
const TOES_ACROSS = 0.21;
const TOES_ALONG = -0.36;

/** Where everything is, in the bed's own frame (x across, z along to the headboard), for a sleeper of a given height. */
export interface SidePose {
  /** Lying: the body's origin on the bed (its pelvis), and where the hip, shoulder, knee, ankle and toes come to. */
  pelvis: readonly [number, number];
  hip: readonly [number, number];
  shoulder: readonly [number, number];
  knee: readonly [number, number];
  ankle: readonly [number, number];
  toes: readonly [number, number];
  /** Where the duvet's top edge comes to: just below the shoulder. */
  coverTo: number;
  /** Sitting on the edge: the pelvis's x, and where you stand beside the bed. */
  edgeX: number;
  standX: number;
  /** Heights above the floor: the seated pelvis, and the lying pelvis. */
  sitY: number;
  lieY: number;
  /** The bed in the room: centre and turn. */
  centre: readonly [number, number];
  elevation: number;
  heading: number;
}

export function sideSleepPose(bed: Furniture, heightCm = 170): SidePose {
  const [w, , d] = bed.size;
  const h = heightCm / 100;
  const back = d / 2;
  // Head a hand's width short of the headboard, toes inside the foot of the bed
  const pz = Math.max(-d / 2 + 0.05 - TOES_ALONG * h, back - 0.1 - CROWN_ALONG * h);
  // Knees drawn up towards the near edge, but the back of the body still on the mattress
  const px = Math.min(w / 2 - 0.3, Math.max(-w / 2 + 0.2, w / 2 - 0.08 - KNEE_ACROSS * h));
  const at = (across: number, along: number): [number, number] => [px + across * h, pz + along * h];
  const top = mattressTop(bed);
  const elevation = bed.elevation ?? 0;
  return {
    pelvis: [px, pz],
    hip: at(0, HIP_ALONG),
    shoulder: at(0, SHOULDER_ALONG),
    knee: at(KNEE_ACROSS, KNEE_ALONG),
    ankle: at(ANKLE_ACROSS, ANKLE_ALONG),
    toes: at(TOES_ACROSS, TOES_ALONG),
    coverTo: pz + SHOULDER_ALONG * h - 0.02,
    edgeX: w / 2 - 0.12,
    // The aisle beside the bed, as lib/interiors.ts bedSpot
    standX: w / 2 + 0.45,
    sitY: elevation + top + PELVIS_ABOVE_SEAT,
    lieY: elevation + top + PELVIS_ABOVE_MATTRESS_LYING,
    centre: bed.at,
    elevation,
    heading: bed.rotation ?? 0,
  };
}

/** A point in the bed's frame, in the room. */
export function bedToRoom(pose: Pick<SidePose, 'centre' | 'heading'>, x: number, z: number): [number, number] {
  const c = Math.cos(pose.heading), s = Math.sin(pose.heading);
  return [pose.centre[0] + x * c + z * s, pose.centre[1] - x * s + z * c];
}

// The timeline, in seconds. Down: turn, sit down on the edge (the sit-down clip, stepping back onto the bed),
// settle, lie down, pull the duvet up. Up runs it backwards, with the stand-up clip for rising off the edge.
const TURN_END = 0.7;
const SIT_END = 2.5;
/** How long sitting down onto the bed's edge, or standing up from it, takes. */
export const SEAT_SECONDS = SIT_END - TURN_END;
const SETTLE_END = 3.2;
const LIE_END = 4.8;
const COVER_START = 4.4;
export const BED_DOWN_SECONDS = 5.4;
/** Getting up: the same movement backwards, from under the duvet to standing beside the bed. */
export const BED_UP_SECONDS = BED_DOWN_SECONDS - TURN_END;

const ease = (k: number) => {
  const c = Math.min(1, Math.max(0, k));
  return c * c * (3 - 2 * c);
};
const phase = (t: number, a: number, b: number) => ease((t - a) / (b - a));

export interface BedFrame {
  /** The pelvis (the turning point), in the room. */
  pivot: readonly [number, number, number];
  /** Facing (about the vertical, 0 = +z) and the tip onto the side (radians, about the bed's x axis). */
  yaw: number;
  roll: number;
  /** On the bed's edge, and which clip the body plays: sitting down onto it, seated, or standing up; null standing. */
  seated: SeatClip | null;
  /** How far the duvet is pulled up, 0 to 1. */
  cover: number;
}

/**
 * Where the body is `t` seconds into going to bed (`up` false) or getting up
 * (`up` true). `from` is where you stood when you went to bed, in the room,
 * and which way you faced.
 */
export function bedFrame(pose: SidePose, t: number, up: boolean, from: { x: number; z: number; direction: number }): BedFrame {
  const time = up ? BED_DOWN_SECONDS - Math.min(t, BED_UP_SECONDS) : Math.min(t, BED_DOWN_SECONDS);
  const pz = pose.pelvis[1];
  // Back to the bed: facing its +x side
  const facing = pose.heading + Math.PI / 2;
  const turn = phase(time, 0, TURN_END);
  const sit = phase(time, TURN_END, SIT_END);
  const lie = phase(time, SETTLE_END, LIE_END);
  const cover = phase(time, COVER_START, BED_DOWN_SECONDS);

  let x: number, z: number, y: number;
  if (time <= TURN_END) {
    // Step to the stand-off beside the bed, level with where you'll lie, turning as you go
    const [sx, sz] = bedToRoom(pose, pose.standX, pz);
    x = from.x + (sx - from.x) * turn;
    z = from.z + (sz - from.z) * turn;
    y = pose.sitY;
  } else {
    // Back onto the edge, then over onto your side with the legs coming up onto the bed
    const lx = pose.standX + (pose.edgeX - pose.standX) * sit + (pose.pelvis[0] - pose.edgeX) * lie;
    [x, z] = bedToRoom(pose, lx, pz);
    y = pose.sitY + (pose.lieY - pose.sitY) * lie + 0.06 * Math.sin(Math.PI * lie);
  }
  const yaw = time <= TURN_END ? from.direction + shortestTurn(from.direction, facing) * turn : facing;
  // (a hair of tolerance: getting up ends exactly on the turn's end, give or take rounding)
  const seated: SeatClip | null = time <= TURN_END + 1e-6 ? null : time < SIT_END ? (up ? 'StandUp' : 'SitDown') : 'Sit';
  return { pivot: [x, y, z], yaw, roll: (Math.PI / 2) * lie, seated, cover };
}

function shortestTurn(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/** The duvet's top edge across the bed (bed frame z), however far it is pulled up. */
export function duvetTop(pose: SidePose, d: number, cover: number): number {
  const foot = -d / 2 - 0.12;
  return foot + (pose.coverTo - foot) * (0.15 + 0.85 * cover);
}

/** Distance from point (x, z) to the segment a–b. */
function toSegment(x: number, z: number, a: readonly [number, number], b: readonly [number, number]) {
  const vx = b[0] - a[0], vz = b[1] - a[1];
  const k = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz || 1)));
  return Math.hypot(x - (a[0] + vx * k), z - (a[1] + vz * k));
}

/**
 * Height of the duvet above the bed's own surface at bed-frame (x, z), over
 * someone lying on their side: soft ridges over the torso (highest at the
 * hip and shoulder), the drawn-up thighs and the shins, flat elsewhere, and
 * hanging down over the sides and the foot of the bed.
 */
export function duvetHeight(x: number, z: number, w: number, d: number, pose: SidePose): number {
  const bump = (height: number, width: number, dist: number) => height * Math.exp(-((dist / width) ** 2));
  const lift = 0.02 + Math.max(
    bump(0.34, 0.22, toSegment(x, z, pose.hip, pose.shoulder)),
    // Lying on the side the legs are stacked, knee on knee and foot on foot, so they stand nearly as high as the hip
    bump(0.32, 0.2, toSegment(x, z, pose.hip, pose.knee)),
    bump(0.32, 0.18, toSegment(x, z, pose.knee, pose.ankle)),
    bump(0.3, 0.16, toSegment(x, z, pose.ankle, pose.toes)),
  );
  const edge = w / 2 + 0.01;
  const overSide = Math.max(0, Math.abs(x) - edge);
  const overFoot = Math.max(0, -d / 2 + 0.03 - z);
  const hang = Math.min(0.32, (overSide + overFoot) * 4);
  return lift * Math.max(0, 1 - (overSide + overFoot) * 8) - hang;
}

/** Someone going to bed or getting up: the bed, how they lie in it, which way the timeline runs and when it started. */
export interface Bedtime {
  bed: Furniture;
  pose: SidePose;
  /** Getting up (the timeline backwards) rather than going to bed. */
  up: boolean;
  /** performance.now() when this half started. */
  startedAt: number;
  /** Where you stood when you went to bed, and which way you faced. */
  from: { x: number; z: number; direction: number };
}
