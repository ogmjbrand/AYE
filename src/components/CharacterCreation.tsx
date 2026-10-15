import { useState } from 'react';

export type Lifestyle = 'student' | 'ordinary' | 'middle-class' | 'luxury';
export type Career =
  | 'none'
  | 'student'
  | 'artist'
  | 'entrepreneur'
  | 'athlete'
  | 'engineer'
  | 'doctor'
  | 'pilot';

export interface Character {
  id: string;
  name: string;
  lifestyle: Lifestyle;
  career: Career;
  colorR: number;
  colorG: number;
  colorB: number;
  balance: number;
  createdAt: number;
  lastBalanceUpdate: number;
}

interface CharacterCreationProps {
  onCharacterCreate: (character: Character) => void;
  onLoadCharacter?: (character: Character) => void;
}

export function CharacterCreation({
  onCharacterCreate,
  onLoadCharacter,
}: CharacterCreationProps) {
  const [mode, setMode] = useState<'menu' | 'create'>('menu');
  const [name, setName] = useState('');
  const [lifestyle, setLifestyle] = useState<Character['lifestyle']>('ordinary');
  const [career, setCareer] = useState<Character['career']>('none');
  const [colorR, setColorR] = useState(139);
  const [colorG, setColorG] = useState(93);
  const [colorB, setColorB] = useState(62);

  const savedCharacter = localStorage.getItem('aye_character');
  const hasSavedCharacter = !!savedCharacter;

  const getInitialBalance = (lifestyleType: Lifestyle): number => {
    const balances: Record<Lifestyle, number> = {
      'student': 2500,
      'ordinary': 5000,
      'middle-class': 12500,
      'luxury': 25000,
    };
    return balances[lifestyleType];
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const now = Date.now();
    const character: Character = {
      id: Math.random().toString(36).substring(7),
      name: name.trim(),
      lifestyle,
      career,
      colorR,
      colorG,
      colorB,
      balance: getInitialBalance(lifestyle),
      createdAt: now,
      lastBalanceUpdate: now,
    };

    localStorage.setItem('aye_character', JSON.stringify(character));
    onCharacterCreate(character);
  };

  const handleLoad = () => {
    if (!savedCharacter) return;
    const character = JSON.parse(savedCharacter) as Character;
    onLoadCharacter?.(character);
    onCharacterCreate(character);
  };

  const handleNewGame = () => {
    setMode('create');
    setName('');
    setLifestyle('ordinary');
  };

  if (mode === 'menu' && hasSavedCharacter) {
    const char = JSON.parse(savedCharacter) as Character;
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center pointer-events-auto z-50">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-md w-full mx-4 text-white">
          <h1 className="font-display text-3xl font-bold mb-2">AYE</h1>
          <p className="text-gray-400 text-sm mb-6 tracking-wider">
            YOUR LIFE. YOUR CHOICES. YOUR WORLD.
          </p>

          <div className="bg-gray-800 rounded p-4 mb-6">
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
              Saved Character
            </p>
            <p className="text-lg font-semibold">{char.name}</p>
            <p className="text-sm text-gray-400 capitalize">
              {char.lifestyle.replace('-', ' ')} Life
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleLoad}
              className="w-full bg-aye-green hover:bg-green-600 text-black font-bold py-3 rounded transition"
            >
              CONTINUE
            </button>
            <button
              onClick={handleNewGame}
              className="w-full border border-gray-600 hover:border-gray-400 text-white py-3 rounded transition"
            >
              NEW GAME
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center pointer-events-auto z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-md w-full mx-4 text-white">
        <h1 className="font-display text-3xl font-bold mb-2">AYE</h1>
        <p className="text-gray-400 text-sm mb-6 tracking-wider">
          CREATE YOUR CHARACTER
        </p>

        <form onSubmit={handleCreate} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
              Character Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={32}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:border-aye-green focus:outline-none"
            />
          </div>

          {/* Lifestyle */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
              Lifestyle
            </label>
            <select
              value={lifestyle}
              onChange={(e) =>
                setLifestyle(e.target.value as Character['lifestyle'])
              }
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-aye-green focus:outline-none"
            >
              <option value="student">Student</option>
              <option value="ordinary">Ordinary</option>
              <option value="middle-class">Middle Class</option>
              <option value="luxury">Luxury</option>
            </select>
          </div>

          {/* Career */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
              Career
            </label>
            <select
              value={career}
              onChange={(e) =>
                setCareer(e.target.value as Character['career'])
              }
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-aye-green focus:outline-none"
            >
              <option value="none">Undecided</option>
              <option value="artist">Artist</option>
              <option value="entrepreneur">Entrepreneur</option>
              <option value="athlete">Athlete</option>
              <option value="engineer">Engineer</option>
              <option value="doctor">Doctor</option>
              <option value="pilot">Pilot</option>
              <option value="student">Student</option>
            </select>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
              Appearance Color
            </label>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-gray-500">Red</span>
                  <span className="text-xs text-gray-400">{colorR}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={colorR}
                  onChange={(e) => setColorR(parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-700 rounded cursor-pointer accent-aye-red"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-gray-500">Green</span>
                  <span className="text-xs text-gray-400">{colorG}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={colorG}
                  onChange={(e) => setColorG(parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-700 rounded cursor-pointer accent-aye-green"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-gray-500">Blue</span>
                  <span className="text-xs text-gray-400">{colorB}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={colorB}
                  onChange={(e) => setColorB(parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-700 rounded cursor-pointer accent-aye-gold"
                />
              </div>
            </div>

            {/* Color Preview */}
            <div className="mt-3 p-3 rounded border border-gray-600 flex items-center justify-between">
              <span className="text-xs text-gray-400">Preview</span>
              <div
                className="w-8 h-8 rounded border border-gray-500"
                style={{
                  backgroundColor: `rgb(${colorR}, ${colorG}, ${colorB})`,
                }}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-aye-green hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold py-3 rounded transition mt-6"
          >
            CREATE & PLAY
          </button>
        </form>

        {hasSavedCharacter && (
          <button
            onClick={() => setMode('menu')}
            className="w-full text-xs text-gray-500 hover:text-gray-400 mt-4 py-2 transition"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
