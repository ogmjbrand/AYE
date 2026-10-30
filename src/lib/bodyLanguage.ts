/**
 * Body language: which gesture a person plays when they're not walking.
 * In a conversation the resident speaks first and the two take turns; a
 * resident who notices you coming over gives a wave (not too often).
 * The gesture clips are motion capture from Microsoft Rocketbox (MIT),
 * one file per body type (scripts/rocketbox/build-gestures.mjs and
 * add-gestures.mjs).
 */
import type { BodyType } from './looks';

export type Gesture = 'Talk' | 'Listen' | 'Wave' | 'Sit' | 'Hug' | SeatTransition | StepClip;

/** Sitting down onto a seat and standing up from it: Rocketbox *_sit_down_chair_01 and *_sit_stand_up_chair_01. */
export type SeatTransition = 'SitDown' | 'StandUp';

/**
 * The part of each transition clip where the body actually lowers or rises,
 * in clip seconds, measured from the height of the root over the clip: the
 * women's sit-down stands still for its first 1.2 s and settles by 3.1 s;
 * the men's drops between 0.3 and 1.3 s. The game plays just this part,
 * stretched to the time the movement takes in the game.
 */
/** Footwork: turning on the spot (*_turn_left_90 and *_turn_right_90, their own turn taken out) and stopping from a walk (*_walk_stop). */
export type StepClip = 'TurnLeft' | 'TurnRight' | 'WalkStop';

/**
 * How long the 90° turn clips take to step through their turn (measured from
 * the root's heading: the women's turn between 0.4 and 1.9 s, the men's
 * between 0.2 and 1.55 s). Turning on the spot plays them at the rate that
 * matches how fast the character is actually turning.
 */
export const TURN_CLIP_SECONDS: Record<BodyType, number> = { feminine: 1.5, masculine: 1.35 };

/**
 * The end of the walk-stop clip, where the trailing foot comes up beside the
 * other: by then the clip has covered almost all its ground (the women's 60
 * of 69 cm by 0.6 s, the men's 121 of 139 cm by 1.0 s), so played on the
 * spot the feet barely slide.
 */
export const WALK_STOP: Record<BodyType, { from: number; to: number }> = {
  feminine: { from: 0.6, to: 1.6 },
  masculine: { from: 1.0, to: 2.0 },
};

export const SEAT_TRANSITIONS: Record<BodyType, Record<SeatTransition, { from: number; to: number }>> = {
  feminine: { SitDown: { from: 1.2, to: 3.1 }, StandUp: { from: 0.8, to: 2.7 } },
  masculine: { SitDown: { from: 0, to: 1.6 }, StandUp: { from: 0.2, to: 1.8 } },
};

/** Seconds each person speaks before the other takes a turn. */
export const TURN_SECONDS = 5;
/** A resident waves at most this often, in seconds. */
export const WAVE_COOLDOWN = 45;

export const gesturesUrl = (body: BodyType) => `models/characters/rocketbox/gestures-${body}.glb`;

/** Talk or listen, by whose turn it is `secondsIn` seconds into the conversation. */
export function conversationGesture(role: 'player' | 'resident', secondsIn: number): Gesture {
  const residentSpeaking = Math.floor(Math.max(0, secondsIn) / TURN_SECONDS) % 2 === 0;
  return (role === 'resident') === residentSpeaking ? 'Talk' : 'Listen';
}

/** Whether a resident should wave now: you have just come near and they haven't waved lately. */
export function shouldWave(justNoticed: boolean, inConversation: boolean, secondsSinceLastWave: number): boolean {
  return justNoticed && !inConversation && secondsSinceLastWave >= WAVE_COOLDOWN;
}
