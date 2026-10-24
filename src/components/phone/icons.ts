import { ICON_PATHS } from '../os/iconPaths';
import type { AppId } from '../../lib/phone';

/** Line glyphs for the phone's app icons (24×24, drawn with a stroke). */
const EXTRA = {
  bank: 'M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18',
  wallet: 'M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 7V6a2 2 0 0 1 2-2h10v3M15 13.5h2.5',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M9 7h6',
  news: 'M4 5h13v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2zM17 9h3v10a2 2 0 0 1-2 2M7 9h7M7 13h7M7 17h4',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  photos: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5h.01',
  plane: 'M3 13l7-1 4-8h2l-1.5 8 5 .5 1.5-2h1.5l-1 3.5 1 3.5H21l-1.5-2-5 .5L16 20h-2l-4-8-7-1z',
  lotus: 'M12 20c-4 0-8-2.5-8-6 2.5 0 5 1 8 6zM12 20c4 0 8-2.5 8-6-2.5 0-5 1-8 6zM12 20c-2-3-2.5-7 0-12 2.5 5 2 9 0 12z',
  calc: 'M6 3h12v18H6zM8.5 6h7v3h-7zM9 12h.01M12 12h.01M15 12h.01M9 15h.01M12 15h.01M15 15h.01M9 18h.01M12 18h.01M15 18h.01',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  taxi: 'M3 16v-3l2-5h14l2 5v3zM3 16v2h3v-2M18 16v2h3v-2M6.5 13h.01M17.5 13h.01M5 13h14M10 5h4v3h-4z',
} as const;

export const PATHS = { ...ICON_PATHS, ...EXTRA };
export type GlyphName = keyof typeof PATHS;

/** Each app's icon: a glyph on its own colour. */
export const APP_ICON: Record<AppId, { glyph: GlyphName; bg: string }> = {
  jobs: { glyph: 'career', bg: 'linear-gradient(145deg,#3a6ea8,#1f3f6b)' },
  messages: { glyph: 'social', bg: 'linear-gradient(145deg,#4cc38a,#1f8a5a)' },
  cars: { glyph: 'car', bg: 'linear-gradient(145deg,#d9534f,#8a2622)' },
  bank: { glyph: 'bank', bg: 'linear-gradient(145deg,#1f7a5c,#0d3f30)' },
  houses: { glyph: 'home', bg: 'linear-gradient(145deg,#e09b4a,#a35a1c)' },
  shops: { glyph: 'cart', bg: 'linear-gradient(145deg,#c46bb0,#7a2f6c)' },
  health: { glyph: 'heart', bg: 'linear-gradient(145deg,#f07a7a,#b23a4a)' },
  spa: { glyph: 'lotus', bg: 'linear-gradient(145deg,#c9a77a,#7a5a36)' },
  wallet: { glyph: 'wallet', bg: 'linear-gradient(145deg,#d4a85a,#8a6224)' },
  ride: { glyph: 'taxi', bg: 'linear-gradient(145deg,#f2c94c,#c08a12)' },
  events: { glyph: 'calendar', bg: 'linear-gradient(145deg,#ef8354,#b2442a)' },
  courses: { glyph: 'book', bg: 'linear-gradient(145deg,#5b8def,#2c4fa8)' },
  gist: { glyph: 'news', bg: 'linear-gradient(145deg,#4a4f57,#22262b)' },
  travel: { glyph: 'plane', bg: 'linear-gradient(145deg,#4fb3d9,#1d6d8f)' },
  life: { glyph: 'today', bg: 'linear-gradient(145deg,#2f8f6f,#d4a85a)' },
  calculator: { glyph: 'calc', bg: 'linear-gradient(145deg,#5a5f66,#2b2f34)' },
  photos: { glyph: 'photos', bg: 'linear-gradient(145deg,#f6d365,#fda085)' },
  settings: { glyph: 'settings', bg: 'linear-gradient(145deg,#8a9099,#4a5059)' },
  help: { glyph: 'help', bg: 'linear-gradient(145deg,#3fbf8e,#1d6b50)' },
  phone: { glyph: 'phone', bg: 'linear-gradient(145deg,#52d17c,#239a4a)' },
  contacts: { glyph: 'people', bg: 'linear-gradient(145deg,#9aa3ad,#5a636d)' },
  camera: { glyph: 'camera', bg: 'linear-gradient(145deg,#3b3f45,#16181b)' },
  maps: { glyph: 'map', bg: 'linear-gradient(145deg,#6fcf97,#2d8a9a)' },
};
