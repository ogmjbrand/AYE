import { useEffect, useId, useRef } from 'react';
import { BODY_RADIUS, avoidStep, removeBody, setBody, type Avoidance } from '../lib/bodies';
import { nearObstacles, overlaps } from '../lib/collision';
import { activeLayout } from '../lib/world';

/** Clear of the room's or street's solids, for a body at (x, z). */
const clearOfSolids = (x: number, z: number) => {
  const near = nearObstacles(x, z, x, z, BODY_RADIUS + 0.05, activeLayout().obstacles);
  return !overlaps(x, z, BODY_RADIUS, near);
};

/**
 * An NPC's body in the world (lib/bodies.ts): the player can't walk through it, and other NPCs keep
 * their distance from it. `walk` is for someone moving along a path: it returns where to draw them
 * this frame, stepped aside from their path when someone is in the way. `stand` is for someone
 * who stays put (seated, serving, lying): others go round them. Removed when the NPC leaves.
 */
export function useNpcBody(name: string) {
  const reactId = useId();
  const id = `npc:${name}:${reactId}`;
  const aside = useRef<Avoidance>({ ox: 0, oz: 0 });
  useEffect(() => () => removeBody(id), [id]);
  return {
    walk: (x: number, z: number, heading: number, moving: boolean, delta: number) =>
      avoidStep(aside.current, id, x, z, moving ? Math.sin(heading) : 0, moving ? Math.cos(heading) : 0, delta, clearOfSolids),
    stand: (x: number, z: number) => setBody(id, x, z, { still: true }),
    /** Not in the way for now (off the street, or in a hug with the player). */
    leave: () => removeBody(id),
  };
}
