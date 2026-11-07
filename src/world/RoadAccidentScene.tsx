import { CarBody } from './CarBody';
import { WorldNPC } from './WorldNPC';
import { groundHeightAt } from '../lib/world';
import type { ActiveIncident } from '../lib/incidents';

/** A reasonable, not-too-grim stand-in for "hurt and needs help": standing, not lying down (no such pose exists yet). */
const VICTIM_LOOK_ID = 'male-adult-10';

/**
 * The 3D presentation of a road-accident incident: a damaged, stopped car
 * and a victim waiting for help, built entirely from assets and techniques
 * already in the game (CarBody, WorldNPC, a point light) rather than new
 * models. Mounted directly in the outdoor City scene, at the incident's
 * position, for as long as it's active in this district.
 */
export function RoadAccidentScene({ incident }: { incident: ActiveIncident }) {
  const [x, , z] = incident.position;
  const y = groundHeightAt(x, z);
  const carFacing = 0.45;
  const victimOffset: readonly [number, number] = [1.8, 0.6];

  return (
    <>
      <group position={[x, y, z]} rotation={[0, carFacing, 0]}>
        <CarBody model="hatch" color="#6b1f1f" lightsOn />
      </group>
      <pointLight position={[x, y + 1.2, z]} color="#ff3b30" intensity={6} distance={6} decay={2} />
      <WorldNPC
        npcId={incident.id}
        role="accident victim"
        lookId={VICTIM_LOOK_ID}
        position={[x + victimOffset[0], y, z + victimOffset[1]]}
        facing={carFacing + Math.PI}
      />
    </>
  );
}
