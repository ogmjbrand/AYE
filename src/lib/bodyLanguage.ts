/**
 * Body language: which gesture a person plays when they're not walking.
 * In a conversation the resident speaks first and the two take turns; a
 * resident who notices you coming over gives a wave (not too often).
 * The gesture clips are motion capture from Microsoft Rocketbox (MIT),
 * one file per body type (scripts/rocketbox/build-gestures.mjs).
 */
import type { BodyType } from './looks';

export type Gesture = 'Talk' | 'Listen' | 'Wave' | 'Sit' | 'Hug';

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
