import { Suspense, lazy, useEffect, useState } from 'react';
import type { Character } from './components/CharacterCreation';
import { EntryScreen } from './components/EntryScreen';
import { RotateHint } from './components/RotateHint';
import { loadCharacter, saveCharacter } from './lib/save';
import { enterLandscape } from './lib/orientation';
import { loadSettings, saveSettings, type QualityMode, type Settings } from './lib/settings';

/*
 * The title screen loads first and on its own; the game (the world, its
 * scenes and all their data) and the character creator are separate
 * downloads. The game starts downloading in the background as soon as the
 * title screen is up, so pressing Continue rarely has to wait for it.
 */
const loadGame = () => import('./App');
const Game = lazy(() => loadGame().then((m) => ({ default: m.Game })));
const CharacterCreation = lazy(() => import('./components/CharacterCreation').then((m) => ({ default: m.CharacterCreation })));

/** While a part of the game is still arriving. */
function Opening() {
  return (
    <main className="grid h-dvh place-items-center bg-black text-[#f4efe6]">
      <p className="m-0 text-sm tracking-[0.3em] text-[#d79d3c]" role="status">OPENING AYE…</p>
    </main>
  );
}

export default function AppShell() {
  // The entry screen comes first; 'create' is character creation; a character means playing
  const [screen, setScreen] = useState<'entry' | 'create' | 'edit' | 'play'>('entry');
  // Where to go back to after changing appearance
  const [editFrom, setEditFrom] = useState<'entry' | 'play'>('entry');
  const [character, setCharacter] = useState<Character | null>(() => loadCharacter());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  // Fetch the game while you're on the title screen
  useEffect(() => { void loadGame(); }, []);
  const quality = settings.quality;
  const changeSettings = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };
  const changeQuality = (next: QualityMode) => changeSettings({ quality: next });
  // In-game changes to the character (e.g. new clothes) are saved straight away
  const handleCharacterUpdate = (next: Character) => {
    saveCharacter(next);
    setCharacter(next);
  };

  if (screen === 'create') {
    return (
      <Suspense fallback={<Opening />}>
      <CharacterCreation
        onCharacterCreate={(c) => { setCharacter(c); setScreen('play'); void enterLandscape(); }}
        onBack={() => setScreen('entry')}
      />
      </Suspense>
    );
  }
  if (screen === 'edit' && character) {
    return (
      <Suspense fallback={<Opening />}>
      <CharacterCreation
        editing={character}
        onCharacterCreate={(c) => { setCharacter(c); setScreen(editFrom); }}
        onBack={() => setScreen(editFrom)}
      />
      </Suspense>
    );
  }
  if (screen === 'entry' || !character) {
    return (
      <EntryScreen
        saved={character}
        quality={quality}
        onQualityChange={changeQuality}
        onContinue={() => { setScreen('play'); void enterLandscape(); }}
        onNewLife={() => setScreen('create')}
        onEditLook={() => { setEditFrom('entry'); setScreen('edit'); }}
      />
    );
  }

  // Keyed by id so a new character starts with a fresh clock and ledger
  return (
    <Suspense fallback={<Opening />}>
    <RotateHint />
    <Game
      key={character.id}
      character={character}
      quality={quality}
      onQualityChange={changeQuality}
      showRoute={settings.showRoute}
      onShowRouteChange={(showRoute) => changeSettings({ showRoute })}
      sound={settings.sound}
      onSoundChange={(sound) => changeSettings({ sound })}
      onExitToMenu={() => setScreen('entry')}
      onCharacterUpdate={handleCharacterUpdate}
      onEditLook={() => { setEditFrom('play'); setScreen('edit'); }}
    />
    </Suspense>
  );
}
