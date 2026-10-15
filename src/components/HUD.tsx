import type { PlayerHandle } from '../hooks/usePlayerController';
import type { Character } from './CharacterCreation';
import type { Neighborhood } from '../lib/neighborhoods';
import { useEffect, useState } from 'react';
import { formatGameTime, hungerLabel, HUNGRY_THRESHOLD, isWorkingHours, type GameTime } from '../lib/gameState';
import { DIETS, nearestVendor, type FoodVendor } from '../lib/food';
import { useWorkplaceStatus } from '../hooks/useWorkplaceStatus';
import { perfStats } from '../world/quality';

interface HUDProps {
  controller: PlayerHandle;
  character?: Character;
  balance: number;
  gameTime: GameTime;
  neighborhood?: Neighborhood | null;
  onChangeCharacter?: () => void;
  onRest?: () => void;
  qualityLabel?: string;
  onCycleQuality?: () => void;
  fullness: number;
  onOpenVendor?: (vendor: FoodVendor) => void;
}

export function HUD({
  controller,
  character,
  balance,
  gameTime,
  neighborhood,
  onChangeCharacter,
  onRest,
  qualityLabel,
  onCycleQuality,
  fullness,
  onOpenVendor,
}: HUDProps) {
  // The controller is mutated every frame; refresh the readout ~10 times a second
  const [, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((n) => n + 1), 100);
    return () => clearInterval(id);
  }, []);

  const workplaceStatus = useWorkplaceStatus(character ?? null, controller);
  const vendor = nearestVendor(controller.position.x, controller.position.z);
  const shiftHours = isWorkingHours(gameTime) && character?.career !== 'none';
  const status = !shiftHours
    ? { label: 'Off Duty', className: 'text-gray-500' }
    : workplaceStatus.isAtWorkplace
      ? { label: 'Working', className: 'text-ui-accent' }
      : { label: 'Not at work', className: 'text-ui-warn' };

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
            <h1 className="m-0">
              <img src={`${import.meta.env.BASE_URL}assets/brand/aye-mark.webp`} alt="AYE" className="h-14 w-auto drop-shadow-lg" />
            </h1>
            {character && (
              <p className="text-xs tracking-wide font-semibold mt-2 text-ui-ink">
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
          <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            {onCycleQuality && (
              <button
                onClick={onCycleQuality}
                title="Graphics quality: Auto lowers detail if the frame rate drops"
                className="text-xs uppercase tracking-widest font-bold text-gray-400 hover:text-gray-200 transition px-3 py-1 border border-gray-600 hover:border-gray-400 rounded pointer-events-auto"
              >
                Quality: {qualityLabel}
              </button>
            )}
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
          <p className="text-xs font-mono text-gray-400" aria-label="Frames per second">{perfStats.fps} FPS</p>
          </div>
        </div>
      </div>

      {/* Food prompt when standing at a vendor */}
      {vendor && onOpenVendor && (
        <button
          onClick={() => onOpenVendor(vendor)}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto px-4 py-2 rounded-md bg-ui-panel/90 border border-ui-line text-ui-ink text-sm shadow-lg hover:border-ui-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent"
        >
          <span className="font-mono text-ui-accent mr-2">E</span>Order food at <span className="font-semibold">{vendor.name}</span>
        </button>
      )}

      {/* Location indicator - center bottom */}
      {neighborhood && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 border border-gray-700 rounded text-white text-xs tracking-widest font-bold pointer-events-none">
          <div className="text-center">
            <p className="text-ui-ink">{neighborhood.name.toUpperCase()}</p>
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
                  <span className="capitalize text-ui-ink">
                    {character.lifestyle.replace('-', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Career</span>
                  <span className="capitalize text-ui-ink">
                    {character.career === 'none' ? 'Undecided' : character.career}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-gray-400">Hunger</span>
                  <span className="flex items-center gap-2">
                    <span className="block w-20 h-1.5 rounded-full bg-ui-line overflow-hidden" aria-hidden>
                      <span
                        className={`block h-full ${fullness < HUNGRY_THRESHOLD ? 'bg-ui-danger' : fullness < 50 ? 'bg-ui-warn' : 'bg-ui-accent'}`}
                        style={{ width: `${Math.round(fullness)}%` }}
                      />
                    </span>
                    <span className={fullness < HUNGRY_THRESHOLD ? 'text-ui-danger' : 'text-ui-ink'}>{hungerLabel(fullness)}</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Diet</span>
                  <span className="text-ui-ink">{DIETS.find((d) => d.id === character.diet)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Balance</span>
                  <span className="text-ui-ink">{balance.toLocaleString()} ⓒ</span>
                </div>
                {character.career !== 'none' && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Workplace</span>
                    <span className={workplaceStatus.isAtWorkplace ? 'text-ui-accent' : 'text-gray-500'}>
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
                X: <span className="text-ui-muted">{x}</span> Z:{' '}
                <span className="text-ui-muted">{z}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Direction</span>
              <span className="text-ui-muted">{direction}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Speed</span>
              <span className="text-ui-muted">{speed} m/s</span>
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
