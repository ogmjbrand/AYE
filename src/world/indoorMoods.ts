/** How each kind of interior is lit (world/IndoorEnvironment.tsx, world/SceneLighting.tsx). */
export type IndoorMood = 'restaurant' | 'boutique' | 'home';

export interface Mood {
  background: string;
  sky: string;
  ground: string;
  hemi: number;
  key: string;
  keyIntensity: number;
  env: number;
  envBase: string;
  panel: string;
  ring: string;
  wall: string;
  window: string;
}

export const INDOOR: Record<IndoorMood, Mood> = {
  restaurant: { background: '#0e0a07', sky: '#ffdcb0', ground: '#2a1c12', hemi: 0.35, key: '#ffd7a6', keyIntensity: 1.3, env: 0.9, envBase: '#1a120b', panel: '#ffd29a', ring: '#ffc070', wall: '#8a5a2a', window: '#8a7262' },
  boutique: { background: '#16110d', sky: '#fff1e2', ground: '#4a3a30', hemi: 0.55, key: '#fff0dc', keyIntensity: 1.6, env: 1.1, envBase: '#2a2018', panel: '#fff3e0', ring: '#ffd28a', wall: '#c9a07a', window: '#d8e4ee' },
  home: { background: '#0e0b09', sky: '#ffe2c0', ground: '#2a2018', hemi: 0.45, key: '#ffe0b8', keyIntensity: 1.4, env: 1.0, envBase: '#1c150f', panel: '#ffdcae', ring: '#ffc878', wall: '#a07850', window: '#6a7a9a' },
};
