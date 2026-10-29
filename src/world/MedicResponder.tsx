import { useMemo } from 'react';
import { groundHeightAt } from '../lib/world';
import { lookById } from '../lib/looks';
import { WorldNPC } from './WorldNPC';
import { nameTag } from './nameTag';

/** Metres away the paramedic starts walking from. */
const APPROACH = 8;

/**
 * The paramedic you called: computer-controlled, in uniform, walking up to
 * where you called from and staying beside you while they treat you.
 */
export function MedicResponder({ at, arrived }: { at: { x: number; z: number; facing: number }; arrived: boolean }) {
  // Approach from in front of you, and stop just beside you
  const start = useMemo(() => [at.x + Math.sin(at.facing) * APPROACH, groundHeightAt(at.x, at.z), at.z + Math.cos(at.facing) * APPROACH] as const, [at]);
  const stop = useMemo(() => [at.x + Math.sin(at.facing + 0.5) * 0.95, groundHeightAt(at.x, at.z), at.z + Math.cos(at.facing + 0.5) * 0.95] as const, [at]);
  const path = useMemo(() => [start, stop] as const, [start, stop]);
  const tag = useMemo(() => nameTag('Ifeoma', arrived ? 'Paramedic, treating you · computer-controlled' : 'Paramedic · computer-controlled'), [arrived]);
  const height = lookById('medical-female-02').height;
  const facingYou = Math.atan2(at.x - stop[0], at.z - stop[2]);
  return (
    <group>
      {arrived
        ? <WorldNPC npcId="medic-responder" role="Paramedic" lookId="medical-female-02" position={stop} facing={facingYou} styles={{}} />
        : <WorldNPC npcId="medic-responder" role="Paramedic" lookId="medical-female-02" position={start} path={path} pathKey={`medic-${at.x}-${at.z}`} walkSpeed={1.3} styles={{}} />}
      {arrived && (
        <sprite position={[stop[0], stop[1] + height + 0.35, stop[2]]} scale={[1.1, 0.3, 1]}>
          <spriteMaterial map={tag} depthWrite={false} transparent />
        </sprite>
      )}
    </group>
  );
}
