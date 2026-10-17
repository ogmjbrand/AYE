import { AnimationClip, Bone, Object3D, Quaternion, Vector3, type AnimationAction } from 'three';

/**
 * Relaxed hands for the Rocketbox rig. Its Idle and Walk clips leave the
 * fingers at the splayed rest pose (Run curls them). After the mixer has
 * posed the skeleton, each non-thumb finger segment is topped up to a gentle
 * curl, by the amount its clip doesn't already curl it. The top-up is blended
 * with the clips' own weights, so cross-fades between Idle, Walk and Run stay
 * smooth. The GLB itself is never changed.
 */

const RELAXED_CURL_DEG = [16, 22, 12]; // proximal, middle, distal segment
const FINGER = /^Bip01[ _][LR][ _]Finger[1-4](\d?)$/;
const FLEX = new Vector3(0, 0, 1);

const restCache = new WeakMap<Object3D, Map<string, Quaternion>>();

function restPoses(scene: Object3D) {
  let rest = restCache.get(scene);
  if (!rest) {
    // Captured on first use, before any mixer has posed this shared scene
    rest = new Map();
    scene.traverse((o) => {
      if ((o as Bone).isBone && FINGER.test(o.name)) rest!.set(o.name, o.quaternion.clone());
    });
    restCache.set(scene, rest);
  }
  return rest;
}

/** Flexion (twist about the bone's own Z) of q relative to rest, in degrees. */
function flexionDeg(rest: Quaternion, q: Quaternion) {
  const rel = rest.clone().invert().multiply(q);
  const s = rel.w < 0 ? -1 : 1;
  return (2 * Math.atan2(s * rel.z, s * rel.w) * 180) / Math.PI;
}

/** Per finger bone: how many radians of curl a clip still needs on top of its own. */
function curlTopUp(clip: AnimationClip, rest: Map<string, Quaternion>) {
  const peak = new Map<string, number>();
  for (const track of clip.tracks) {
    if (!track.name.endsWith('.quaternion')) continue;
    const name = track.name.slice(0, -'.quaternion'.length);
    const r = rest.get(name);
    if (!r) continue;
    let p = 0;
    for (let i = 0; i < track.times.length; i++) {
      p = Math.max(p, flexionDeg(r, new Quaternion().fromArray(track.values, i * 4)));
    }
    peak.set(name, p);
  }
  const topUp = new Map<string, number>();
  for (const name of rest.keys()) {
    const segment = Number(FINGER.exec(name)![1] || 0);
    const need = Math.max(0, RELAXED_CURL_DEG[segment] - (peak.get(name) ?? 0));
    topUp.set(name, (need * Math.PI) / 180);
  }
  return topUp;
}

export interface RelaxedHands {
  /** Call after the mixer has updated this frame. */
  update(actions: Partial<Record<string, AnimationAction | null>>): void;
}

export function createRelaxedHands(scene: Object3D, clips: AnimationClip[]): RelaxedHands {
  const rest = restPoses(scene);
  const topUps = new Map(clips.map((c) => [c, curlTopUp(c, rest)]));
  const fingers: { name: string; bone: Bone; base: Quaternion; applied: Quaternion }[] = [];
  scene.traverse((o) => {
    if ((o as Bone).isBone && rest.has(o.name)) {
      fingers.push({ name: o.name, bone: o as Bone, base: new Quaternion(), applied: new Quaternion() });
    }
  });
  const delta = new Quaternion();

  return {
    update(actions) {
      const active = Object.values(actions).filter((a): a is AnimationAction => !!a);
      for (const f of fingers) {
        const q = f.bone.quaternion;
        // Undo last frame's top-up unless the mixer has written this bone since
        if (q.equals(f.applied)) q.copy(f.base);
        else f.base.copy(q);

        let radians = 0;
        for (const a of active) {
          const w = a.getEffectiveWeight();
          if (w > 0) radians += w * (topUps.get(a.getClip())?.get(f.name) ?? 0);
        }
        if (radians > 0) q.multiply(delta.setFromAxisAngle(FLEX, radians));
        f.applied.copy(q);
      }
    },
  };
}
