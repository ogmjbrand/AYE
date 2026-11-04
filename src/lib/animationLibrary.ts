/**
 * Which motion plays for each thing a person does in AYE, and where it comes
 * from. Only clips that exist in the shipped files are named here; the test
 * (animationLibrary.test.ts) opens the GLBs and checks every one. Activities
 * with no captured clip yet say so, and say what would fill them
 * (docs/ANIMATION_PIPELINE.md).
 *
 * Sources:
 * - 'look': in each person's own GLB (Idle, Walk, Run), Rocketbox, MIT.
 * - 'gestures': the shared gestures-<body>.glb, Rocketbox clips added with
 *   scripts/rocketbox/add-gestures.mjs, MIT.
 * - 'procedural': posed in code from those clips (lying in bed, eating,
 *   hugging, a seat's approach), no captured clip of its own.
 * - 'missing': nothing plays yet beyond the fallback; needs a capture.
 */

/** Clips in the gesture files that a player activity can call on (Avatar `activity`). */
export type ActivityClip = 'Stretch' | 'PhoneText' | 'Drink';
/** Activity clips that play once and end, rather than loop while the activity lasts. */
export const ONE_SHOT: ReadonlySet<ActivityClip> = new Set<ActivityClip>(['Stretch', 'Drink']);

export interface Motion {
  activity: string;
  source: 'look' | 'gestures' | 'procedural' | 'missing';
  /** The clip's name in its file (for look and gestures sources). */
  clip?: string;
  /** Where it's used in the game, or what would use it. */
  where: string;
}

export const MOTIONS: readonly Motion[] = [
  { activity: 'Idle, with breathing', source: 'look', clip: 'Idle', where: 'Standing anywhere (the Rocketbox idle carries its own breathing)' },
  { activity: 'Walk', source: 'look', clip: 'Walk', where: 'Moving under run speed; playback rate matched to ground speed' },
  { activity: 'Run', source: 'look', clip: 'Run', where: 'Moving fast; rate matched to ground speed' },
  { activity: 'Turn on the spot', source: 'gestures', clip: 'TurnLeft', where: 'Turning while standing (TurnLeft / TurnRight)' },
  { activity: 'Turn on the spot (right)', source: 'gestures', clip: 'TurnRight', where: 'Turning right while standing' },
  { activity: 'Stop walking', source: 'gestures', clip: 'WalkStop', where: 'Coming to a stop from a walk or run' },
  { activity: 'Sit down', source: 'gestures', clip: 'SitDown', where: 'Chairs, sofas, benches, bed edges (lib/seating.ts)' },
  { activity: 'Sit', source: 'gestures', clip: 'Sit', where: 'Seated anywhere' },
  { activity: 'Stand up', source: 'gestures', clip: 'StandUp', where: 'Leaving a seat' },
  { activity: 'Talk', source: 'gestures', clip: 'Talk', where: 'Conversations with residents' },
  { activity: 'Listen', source: 'gestures', clip: 'Listen', where: 'Conversations with residents' },
  { activity: 'Wave', source: 'gestures', clip: 'Wave', where: 'Residents greeting you' },
  { activity: 'Morning stretch', source: 'gestures', clip: 'Stretch', where: 'Getting up from bed' },
  { activity: 'Using the phone', source: 'gestures', clip: 'PhoneText', where: 'While your phone is open and you stand still' },
  { activity: 'Drinking', source: 'gestures', clip: 'Drink', where: 'A drink from the hotel vending machine' },
  { activity: 'Hug', source: 'procedural', where: 'Hugging a friend (lib/hugAnimation.ts, posed from the idle)' },
  { activity: 'Eating', source: 'procedural', where: 'Meals: the right arm raised to the mouth over the clip (Avatar)' },
  { activity: 'Getting into bed, lying, getting up', source: 'procedural', where: 'Bed timeline (lib/bedSleep.ts): sit on the edge with SitDown, then a posed side-sleep' },
  { activity: 'Sleeping', source: 'procedural', where: 'The side-sleep pose under the duvet; no breathing clip lying down' },
  { activity: 'Changing clothes', source: 'missing', where: 'Wardrobe Confirm (plays nothing yet)' },
  { activity: 'Showering', source: 'missing', where: 'The shower (stands idle under it)' },
  { activity: 'Lying down / getting out of bed', source: 'missing', where: 'Would replace the procedural bed timeline' },
  { activity: 'Picking up / reaching for objects', source: 'missing', where: 'Shop counters, food handed over at stalls' },
  { activity: 'Typing at a desk', source: 'missing', where: 'Office desks (sit idle for now)' },
];

/** Clips a capture (RGB MoCap, or another Rocketbox clip) would add, named as the game would call them. */
export const WANTED: readonly { name: string; length: string; loops: boolean; for: string }[] = [
  { name: 'ChangeClothes', length: '4–6 s', loops: false, for: 'Wardrobe Confirm: pull a top over the head, smooth it down' },
  { name: 'Shower', length: '8–12 s', loops: true, for: 'Standing under the shower: rinse hair and arms' },
  { name: 'LieDown', length: '3–4 s', loops: false, for: 'From sitting on a bed edge to lying on the side' },
  { name: 'SleepBreathe', length: '6–10 s', loops: true, for: 'Lying on the side, slow breathing' },
  { name: 'GetUpFromBed', length: '3–4 s', loops: false, for: 'From lying to sitting on the edge (then StandUp)' },
  { name: 'PickUp', length: '2–3 s', loops: false, for: 'Reach to a counter at waist height and take something' },
  { name: 'TypeAtDesk', length: '8–10 s', loops: true, for: 'Seated, typing on a keyboard' },
];
