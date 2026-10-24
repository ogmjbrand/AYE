import type { Dispatch, SetStateAction } from 'react';
import type { Character } from '../CharacterCreation';
import type { District } from '../../lib/geography';
import type { Destination } from '../../lib/cityDirectory';
import type { GameState, PhoneContact } from '../../lib/gameState';
import type { LifeLink } from '../../lib/life';
import { appById, type AppId, type PhoneState } from '../../lib/phone';
import { residentById } from '../../lib/people';

// ---------------------------------------------------------------- what every app is given

export interface PhoneActions {
  phoneFriend: (residentId: string, kind: PhoneContact) => void;
  /** Book a taxi there: an error to show, or null once you're on your way. */
  ride: (d: Destination) => string | null;
  /** Walk there with the route finder: an error, or null. */
  walkTo: (d: Destination) => string | null;
  onGo: (link: LifeLink) => void;
  buyHome: (id: string) => void;
  moveIn: (id: string) => void;
  sellCar: (id: string) => void;
  spaHire: () => void;
  setSavingsGoal: (amount: number | null) => void;
  /** Opens the district map; null without the Smartphone upgrade. */
  openMap: (() => void) | null;
  openTravel: () => void;
  openLifeOS: () => void;
}

export interface AppCtx {
  state: GameState;
  character: Character;
  district: District;
  phone: PhoneState;
  setPhone: Dispatch<SetStateAction<PhoneState>>;
  battery: number;
  charging: boolean;
  whereabouts: { place: string; activity: string };
  destinations: readonly Destination[];
  here: { x: number; z: number };
  /** Out on the street (a taxi can pick you up, walking routes start here). */
  canRide: boolean;
  /** The view inside the app (a thread, a listing…), or null for its first screen. */
  view: string | null;
  push: (view: string) => void;
  pop: () => void;
  /** Opens an app, optionally straight into a view inside it. */
  openApp: (id: AppId, view?: string) => void;
  sound: boolean;
  act: PhoneActions;
}

export const ghai = (n: number) => `${Math.round(n).toLocaleString()} GHAI`;

export const WALLPAPER_CSS: Record<PhoneState['wallpaper'], string> = {
  'lagoon-dusk': 'linear-gradient(170deg,#14263f 0%,#2f4f72 38%,#c56b4a 78%,#f1b46c 100%)',
  emerald: 'radial-gradient(120% 80% at 30% 10%,#1f8a6a 0%,#0c4636 45%,#051c16 100%)',
  midnight: 'linear-gradient(170deg,#070a14 0%,#141a33 55%,#29315a 100%)',
  sunrise: 'linear-gradient(170deg,#f6c66e 0%,#e2775c 48%,#5a2e5e 100%)',
  gold: 'radial-gradient(120% 90% at 70% 0%,#e6c27a 0%,#9a7334 40%,#241b10 100%)',
};

/** The title in an app's header for a view inside it. */
export function viewTitle(id: AppId, view: string | null): string {
  if (view?.startsWith('book:')) return 'Book a taxi';
  if (view?.startsWith('thread:')) return residentById(view.slice(7))?.name ?? 'Messages';
  if (view?.startsWith('call:')) return 'Call';
  if (view?.startsWith('photo:')) return 'Photo';
  if (view === 'arrange') return 'Arrange apps';
  return appById(id)?.name ?? '';
}
