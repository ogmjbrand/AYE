import type { Seat } from '../lib/seating';
import type { PlayerHandle } from '../hooks/usePlayerController';
import { WorldNPC } from './WorldNPC';

const MEETING_SEATS: readonly { seat: Seat; lookId: string }[] = [
  { seat: { id: 'office-colleague-a', x: 1.2, z: 2.85, facing: Math.PI, height: 0.45 }, lookId: 'female-adult-06' },
  { seat: { id: 'office-colleague-b', x: 4.2, z: 2.85, facing: Math.PI, height: 0.45 }, lookId: 'male-adult-18' },
  { seat: { id: 'office-workstation-colleague', x: -5.25, z: -2.65, facing: 0, height: 0.45 }, lookId: 'female-adult-11' },
];

export function OfficeScene({ player }: { player: PlayerHandle }) {
  return (
    <>
      <WorldNPC
        npcId="office-marina-receptionist"
        role="office receptionist"
        lookId="female-adult-10"
        position={[0, 0, -3.65]}
        facing={0}
        player={player}
        greetPlayer
      />
      {MEETING_SEATS.map(({ seat, lookId }) => (
        <WorldNPC
          key={seat.id}
          npcId={seat.id}
          role="office colleague"
          lookId={lookId}
          position={[seat.x, seat.height, seat.z]}
          facing={seat.facing}
          seat={seat}
        />
      ))}
      <WorldNPC
        npcId="office-corridor-worker"
        role="office employee"
        lookId="male-adult-10"
        position={[6.2, 0, -1.5]}
        path={[[6.2, 0, -1.5], [6.2, 0, 2.45], [6.2, 0, -1.5]]}
        pathKey="office-corridor"
        loopPath
        walkSpeed={0.62}
      />
      <pointLight position={[4.8, 2.3, -2.1]} intensity={0.65} distance={4} color="#f4c781" />
    </>
  );
}
