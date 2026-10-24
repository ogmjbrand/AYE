/**
 * Player preferences that belong to this device rather than to a character
 * (graphics quality, the route line and sound). Validated on load so a bad
 * value falls back to the defaults.
 */
export type QualityMode = 'auto' | 'high' | 'low';

export interface Settings {
  /** 'auto' starts high and drops to low on sustained low frame rates. */
  quality: QualityMode;
  /** Dotted line on the ground along a click-to-move route. */
  showRoute: boolean;
  /** Game sounds (the engine while you drive). */
  sound: boolean;
}

const SETTINGS_KEY = 'aye_settings';
export const DEFAULT_SETTINGS: Settings = { quality: 'auto', showRoute: true, sound: true };
export const QUALITY_MODES: readonly QualityMode[] = ['auto', 'high', 'low'];

export function parseSettings(data: unknown): Settings {
  const s = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  return {
    quality: QUALITY_MODES.includes(s.quality as QualityMode) ? (s.quality as QualityMode) : DEFAULT_SETTINGS.quality,
    showRoute: typeof s.showRoute === 'boolean' ? s.showRoute : DEFAULT_SETTINGS.showRoute,
    sound: typeof s.sound === 'boolean' ? s.sound : DEFAULT_SETTINGS.sound,
  };
}

export function loadSettings(storage: Storage = localStorage): Settings {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    return parseSettings(raw === null ? null : JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings, storage: Storage = localStorage) {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be full or blocked (private mode); the setting still applies this session
  }
}

export const nextQualityMode = (m: QualityMode): QualityMode => QUALITY_MODES[(QUALITY_MODES.indexOf(m) + 1) % QUALITY_MODES.length];
