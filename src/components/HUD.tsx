import type { PlayerHandle } from '../hooks/usePlayerController';
import type { Character } from './CharacterCreation';
import type { Neighborhood } from '../lib/neighborhoods';

interface HUDProps {
  controller: PlayerHandle;
  character?: Character;
  neighborhood?: Neighborhood | null;
  onChangeCharacter?: () => void;
}

export function HUD({
  controller,
  character,
  neighborhood,
  onChangeCharacter,
}: HUDProps) {
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
          </div>
          {onChangeCharacter && (
            <button
              onClick={onChangeCharacter}
              className="text-xs uppercase tracking-widest font-bold text-gray-400 hover:text-gray-200 transition px-3 py-1 border border-gray-600 hover:border-gray-400 rounded pointer-events-auto"
            >
              CHANGE
            </button>
          )}
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
                  <span className="text-gray-400">Balance</span>
                  <span className="text-aye-gold">0 ⓒ</span>
                </div>
              </>
            )}
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
