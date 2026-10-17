import { QuaternionKeyframeTrack, type AnimationClip } from 'three';

const FINGER_ROTATION = /Finger\d*\.quaternion$/;

/**
 * Rocketbox's walk clip holds the fingers still, so the FBX conversion left out their
 * rotation tracks, and three.js then shows the bind pose: flat, splayed hands. This gives
 * any clip without finger rotations the idle clip's relaxed hand (its first frame, held).
 * Only finger bones are touched; wrists and every other track stay as authored.
 */
export function withRelaxedHands(clips: AnimationClip[]): AnimationClip[] {
  const idle = clips.find((c) => /idle|stand/i.test(c.name));
  const pose = idle?.tracks.filter((t) => FINGER_ROTATION.test(t.name)) ?? [];
  if (pose.length === 0) return clips;
  return clips.map((clip) => {
    if (clip === idle) return clip;
    const has = new Set(clip.tracks.map((t) => t.name));
    const missing = pose.filter((t) => !has.has(t.name));
    if (missing.length === 0) return clip;
    const out = clip.clone();
    for (const t of missing) {
      const q = Array.from(t.values.slice(0, 4));
      out.tracks.push(new QuaternionKeyframeTrack(t.name, [0, Math.max(clip.duration, 1e-3)], [...q, ...q]));
    }
    return out;
  });
}
