import type { PlayerHandle } from '../hooks/usePlayerController';
import type { Character } from './CharacterCreation';
import type { Neighborhood } from '../lib/neighborhoods';
import { useEffect, useState } from 'react';
import { formatGameTime, isWorkingHours, type GameTime } from '../lib/gameState';
import { useWorkplaceStatus } from '../hooks/useWorkplaceStatus';

interface HUDProps {
  controller: PlayerHandle;
  character?: Character;
  balance: number;
  gameTime: GameTime;
  neighborhood?: Neighborhood | null;
  onChangeCharacter?: () => void;
  onRest?: () => void;
}

export function HUD({
  controller,
  character,
  balance,
  gameTime,
  neighborhood,
  onChangeCharacter,
  onRest,
}: HUDProps) {
  // The controller is mutated every frame; refresh the readout ~10 times a second
  const [, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((n) => n + 1), 100);
    return () => clearInterval(id);
  }, []);

  const workplaceStatus = useWorkplaceStatus(character ?? null, controller);
  const shiftHours = isWorkingHours(gameTime) && character?.career !== 'none';
  const status = !shiftHours
    ? { label: 'Off Duty', className: 'text-gray-500' }
    : workplaceStatus.isAtWorkplace
      ? { label: 'Working', className: 'text-aye-green' }
      : { label: 'Not at work', className: 'text-aye-red' };

  const x = controller.position.x.toFixed(1);
  const z = controller.position.z.toFixed(1);
  const direction = (controller.direction * (180 / Math.PI)).toFixed(0);
  const speed = Math.sqrt(
    controller.velocity.x ** 2 + controller.velocity.z ** 2
  ).toFixed(1);

  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Status bar - top */}
      <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/48 to-transparent text-white">
        <div className="flex justify-between items-start max-w-full">
          <div>
            <h1 className="font-display font-bold text-2xl tracking-wider">
              AYE<span className="font-normal text-xs ml-2">WORLD</span>
            </h1>
            {character && (
              <p className="text-xs tracking-wide font-semibold mt-2 text-aye-gold">
                {character.name}
              </p>
            )}
            <p className="text-xs tracking-widest font-bold mt-1 text-gray-400">
              EARLY WORLD BUILD · 001
            </p>
            <p className="text-xs tracking-widest font-bold mt-2 text-gray-500">
              {formatGameTime(gameTime)} • {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][gameTime.dayOfWeek]}
            </p>
          </div>
          <div className="flex gap-2">
            {onRest && (
              <button
                onClick={onRest}
                className="text-xs uppercase tracking-widest font-bold text-gray-400 hover:text-gray-200 transition px-3 py-1 border border-gray-600 hover:border-gray-400 rounded pointer-events-auto"
              >
                Rest
              </button>
            )}
            {onChangeCharacter && (
              <button
                onClick={onChangeCharacter}
                className="text-xs uppercase tracking-widest font-bold text-gray-400 hover:text-gray-200 transition px-3 py-1 border border-gray-600 hover:border-gray-400 rounded pointer-events-auto"
              >
                Change
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Location indicator - center bottom */}
      {neighborhood && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 border border-gray-700 rounded text-white text-xs tracking-widest font-bold pointer-events-none">
          <div className="text-center">
            <p className="text-aye-gold">{neighborhood.name.toUpperCase()}</p>
            <p className="text-gray-500 text-xs mt-1">{neighborhood.description}</p>
          </div>
        </div>
      )}

      {/* Player state panel - bottom left */}
      <div className="absolute bottom-0 left-0 p-6 bg-gradient-to-t from-black/60 to-transparent text-white max-w-80">
        <div className="space-y-3">
          {/* Stats */}
          <div className="space-y-1 font-mono text-sm">
            {character && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-400">Lifestyle</span>
                  <span className="capitalize text-aye-green">
                    {character.lifestyle.replace('-', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Career</span>
                  <span className="capitalize text-aye-red">
                    {character.career === 'none' ? 'Undecided' : character.career}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Balance</span>
                  <span className="text-aye-gold">{balance.toLocaleString()} ⓒ</span>
                </div>
                {character.career !== 'none' && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Workplace</span>
                    <span className={workplaceStatus.isAtWorkplace ? 'text-aye-green' : 'text-gray-500'}>
                      {workplaceStatus.isAtWorkplace ? 'Here' : `${workplaceStatus.distanceToWorkplace}u`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className={status.className}>{status.label}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Period</span>
              <span className="capitalize text-gray-300">{gameTime.period}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Position</span>
              <span>
                X: <span className="text-aye-green">{x}</span> Z:{' '}
                <span className="text-aye-green">{z}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Direction</span>
              <span className="text-aye-gold">{direction}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Speed</span>
              <span className="text-aye-red">{speed} u/s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls hint - bottom right */}
      <div className="absolute bottom-0 right-0 p-6 text-right text-white text-xs tracking-widest font-bold pointer-events-auto">
        <div className="space-y-1">
          <p className="text-gray-400">W/A/S/D • MOVE</p>
          <p className="text-gray-400">DRAG • ORBIT</p>
          <p className="text-gray-400">SCROLL • ZOOM</p>
        </div>
      </div>
    </div>
  );
}
