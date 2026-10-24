/**
 * The AYE phone: the in-game smartphone's own data. Everything about your
 * life (money, home, job, cars, friends) lives in the game state
 * (lib/gameState.ts) and the phone's apps read it and change it only through
 * game actions, never by editing it themselves. What's stored here is the
 * phone's own: its settings, the order of its apps, your message threads,
 * photos you took, the notifications it has shown and its battery.
 *
 * Saved on this device (localStorage, one phone per character). There's no
 * online service behind it: messages are with computer-controlled residents,
 * never real players.
 */
import { friendshipLevel, gameDay, type Resident } from './people';
import type { GameState } from './gameState';
import { eventToday } from './life';
import { districtById } from './geography';

// ---------------------------------------------------------------- the apps

export type AppCategory = 'Finance' | 'Shopping & property' | 'Work & transport' | 'Social' | 'Health & services' | 'Entertainment' | 'Utilities';

export type AppId =
  | 'bank' | 'wallet' | 'jobs' | 'messages' | 'contacts' | 'cars' | 'houses' | 'shops' | 'ride' | 'maps' | 'health'
  | 'events' | 'courses' | 'gist' | 'camera' | 'photos' | 'settings' | 'life' | 'phone' | 'travel' | 'spa' | 'calculator' | 'help';

export interface PhoneApp {
  id: AppId;
  name: string;
  category: AppCategory;
  /** One line for search results and the app's header. */
  blurb: string;
  /** Words search also matches. */
  keywords: readonly string[];
}

/** Every app on the phone: each one works (see docs/PHONE.md for exactly what each does). */
export const APPS: readonly PhoneApp[] = [
  { id: 'jobs', name: 'Jobs', category: 'Work & transport', blurb: 'Your career, pay, promotion and job openings', keywords: ['work', 'career', 'salary', 'hire', 'spa'] },
  { id: 'messages', name: 'Messages', category: 'Social', blurb: 'Texts with the people you know', keywords: ['chat', 'sms', 'text', 'friends'] },
  { id: 'cars', name: 'Cars', category: 'Shopping & property', blurb: 'Your garage and the dealer’s showroom', keywords: ['vehicle', 'garage', 'drive', 'buy'] },
  { id: 'bank', name: 'Bank', category: 'Finance', blurb: 'Balance, today’s money and every transaction', keywords: ['money', 'ghai', 'transactions', 'statement'] },
  { id: 'houses', name: 'Houses', category: 'Shopping & property', blurb: 'Homes to rent and to buy from OGM Homes', keywords: ['home', 'rent', 'property', 'ogm', 'buy'] },
  { id: 'shops', name: 'Shops', category: 'Shopping & property', blurb: 'What’s on sale in the city, and where', keywords: ['fashion', 'boutique', 'gadgets', 'furniture', 'store'] },
  { id: 'health', name: 'Health', category: 'Health & services', blurb: 'Needs, mood, sleep and treatments', keywords: ['mood', 'energy', 'hunger', 'wellbeing', 'massage'] },
  { id: 'spa', name: 'Alafia Spa', category: 'Health & services', blurb: 'Treatments, prices and your shifts', keywords: ['massage', 'spa', 'relax', 'therapist'] },
  { id: 'wallet', name: 'Wallet', category: 'Finance', blurb: 'Your GHAI and your savings goal', keywords: ['savings', 'goal', 'money'] },
  { id: 'ride', name: 'Ride', category: 'Work & transport', blurb: 'Book a taxi anywhere in the city', keywords: ['taxi', 'cab', 'transport', 'go'] },
  { id: 'events', name: 'Events', category: 'Social', blurb: 'What’s on in the city today', keywords: ['today', 'festival', 'party', 'what’s on'] },
  { id: 'courses', name: 'Courses', category: 'Work & transport', blurb: 'Your skills and how to grow them', keywords: ['skills', 'learn', 'study', 'education'] },
  { id: 'gist', name: 'Songhai Gist', category: 'Entertainment', blurb: 'The news from your city and your life', keywords: ['news', 'feed', 'headlines'] },
  { id: 'travel', name: 'Travel', category: 'Work & transport', blurb: 'Flights and coaches to other cities', keywords: ['flight', 'coach', 'trip', 'city'] },
  { id: 'life', name: 'Life OS', category: 'Utilities', blurb: 'Goals, skills, dream and achievements', keywords: ['goals', 'missions', 'dream', 'profile'] },
  { id: 'calculator', name: 'Calculator', category: 'Utilities', blurb: 'Add it up', keywords: ['sum', 'maths'] },
  { id: 'photos', name: 'Photos', category: 'Utilities', blurb: 'Pictures you took with the camera', keywords: ['gallery', 'pictures'] },
  { id: 'help', name: 'Help & Guide', category: 'Utilities', blurb: 'How to play: controls, money, homes and work', keywords: ['guide', 'controls', 'how', 'tips'] },
  { id: 'settings', name: 'Settings', category: 'Utilities', blurb: 'Wallpaper, notifications, sound and the dock', keywords: ['wallpaper', 'preferences', 'sound'] },
  // The dock
  { id: 'phone', name: 'Phone', category: 'Social', blurb: 'Call the people you know', keywords: ['call', 'dial'] },
  { id: 'contacts', name: 'Contacts', category: 'Social', blurb: 'Everyone you know, and how well', keywords: ['people', 'friends', 'family'] },
  { id: 'camera', name: 'Camera', category: 'Utilities', blurb: 'Take a picture of the world around you', keywords: ['photo', 'picture', 'snap'] },
  { id: 'maps', name: 'Maps', category: 'Utilities', blurb: 'The city map, and directions', keywords: ['map', 'directions', 'navigate'] },
];
export const appById = (id: string) => APPS.find((a) => a.id === id);

/** What the search box finds: name, blurb, category or keywords. */
export function searchApps(q: string): PhoneApp[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return APPS.filter((a) => a.name.toLowerCase().includes(s) || a.blurb.toLowerCase().includes(s) || a.category.toLowerCase().includes(s) || a.keywords.some((k) => k.includes(s)));
}

// ---------------------------------------------------------------- the phone's own state

export type Wallpaper = 'lagoon-dusk' | 'emerald' | 'midnight' | 'sunrise' | 'gold';
export const WALLPAPERS: readonly { id: Wallpaper; name: string }[] = [
  { id: 'lagoon-dusk', name: 'Lagoon at dusk' }, { id: 'emerald', name: 'Emerald' }, { id: 'midnight', name: 'Midnight' }, { id: 'sunrise', name: 'Sunrise' }, { id: 'gold', name: 'Gold' },
];

export interface PhoneMessage {
  /** Who wrote it: you, or the resident. */
  from: 'me' | 'them';
  text: string;
  /** Game minute it was sent. */
  t: number;
}

export interface PhoneNotification {
  id: string;
  app: AppId;
  title: string;
  body: string;
  t: number;
  read: boolean;
}

export interface PhonePhoto {
  id: string;
  /** A small JPEG, as a data URL. */
  src: string;
  t: number;
  place: string;
}

export interface PhoneState {
  wallpaper: Wallpaper;
  notifications: boolean;
  /** Key clicks and the notification chime. */
  sound: boolean;
  /** The four apps on the dock. */
  dock: AppId[];
  /** The home screen order (apps not in the dock). */
  order: AppId[];
  threads: Record<string, PhoneMessage[]>;
  inbox: PhoneNotification[];
  photos: PhonePhoto[];
  /** 0–100; drains as game time passes, charges while you sleep or at home. */
  battery: number;
  /** Game minute the battery was last worked out. */
  batteryAt: number;
}

export const DEFAULT_DOCK: readonly AppId[] = ['phone', 'contacts', 'camera', 'maps'];
export const MAX_PHOTOS = 24;
export const MAX_NOTIFICATIONS = 40;
export const MAX_THREAD = 60;

export function newPhone(now = 0): PhoneState {
  return {
    wallpaper: 'lagoon-dusk', notifications: true, sound: true,
    dock: [...DEFAULT_DOCK], order: APPS.map((a) => a.id).filter((id) => !DEFAULT_DOCK.includes(id)),
    threads: {}, inbox: [], photos: [], battery: 100, batteryAt: now,
  };
}

const KEY = (characterId: string) => `aye_phone_${characterId}`;

/** Reads a saved phone, keeping only what's valid (new apps are added, unknown ones dropped). */
export function sanitisePhone(data: unknown, now = 0): PhoneState {
  const base = newPhone(now);
  if (!data || typeof data !== 'object') return base;
  const o = data as Record<string, unknown>;
  const known = (id: unknown): id is AppId => typeof id === 'string' && !!appById(id);
  const dock = Array.isArray(o.dock) ? [...new Set(o.dock.filter(known))].slice(0, 4) : base.dock;
  const saved = Array.isArray(o.order) ? [...new Set(o.order.filter(known))].filter((id) => !dock.includes(id)) : [];
  const order = [...saved, ...APPS.map((a) => a.id).filter((id) => !dock.includes(id) && !saved.includes(id))];
  const threads: Record<string, PhoneMessage[]> = {};
  if (o.threads && typeof o.threads === 'object') {
    for (const [k, v] of Object.entries(o.threads as Record<string, unknown>)) {
      if (!Array.isArray(v)) continue;
      threads[k] = v.filter((m): m is PhoneMessage => !!m && typeof m === 'object' && ((m as PhoneMessage).from === 'me' || (m as PhoneMessage).from === 'them') && typeof (m as PhoneMessage).text === 'string' && Number.isFinite((m as PhoneMessage).t)).slice(-MAX_THREAD);
    }
  }
  const inbox = Array.isArray(o.inbox)
    ? o.inbox.filter((n): n is PhoneNotification => !!n && typeof n === 'object' && typeof (n as PhoneNotification).id === 'string' && known((n as PhoneNotification).app) && typeof (n as PhoneNotification).title === 'string').slice(-MAX_NOTIFICATIONS)
    : [];
  const photos = Array.isArray(o.photos)
    ? o.photos.filter((p): p is PhonePhoto => !!p && typeof p === 'object' && typeof (p as PhonePhoto).src === 'string' && (p as PhonePhoto).src.startsWith('data:image/')).slice(-MAX_PHOTOS)
    : [];
  const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
  return {
    wallpaper: WALLPAPERS.some((w) => w.id === o.wallpaper) ? (o.wallpaper as Wallpaper) : base.wallpaper,
    notifications: o.notifications !== false,
    sound: o.sound !== false,
    dock, order, threads, inbox, photos,
    battery: num(o.battery, 0, 100, 100),
    batteryAt: num(o.batteryAt, 0, Number.MAX_SAFE_INTEGER, now),
  };
}

export function loadPhone(characterId: string, now: number, storage: Storage = localStorage): PhoneState {
  try {
    const raw = storage.getItem(KEY(characterId));
    return sanitisePhone(raw ? JSON.parse(raw) : null, now);
  } catch {
    return newPhone(now);
  }
}

export function savePhone(characterId: string, phone: PhoneState, storage: Storage = localStorage) {
  try { storage.setItem(KEY(characterId), JSON.stringify(phone)); } catch { /* storage full or blocked: the phone still works this session */ }
}

// ---------------------------------------------------------------- battery

/** Per game hour: a phone lasts about a day and a half away from a charger. */
export const DRAIN_PER_HOUR = 2.5;
export const CHARGE_PER_HOUR = 40;

/** The battery now: it drains as game time passes, and charges when you're at home (or asleep in your bed). */
export function batteryNow(phone: Pick<PhoneState, 'battery' | 'batteryAt'>, now: number, charging: boolean): number {
  const hours = Math.max(0, now - phone.batteryAt) / 60;
  const b = charging ? phone.battery + hours * CHARGE_PER_HOUR : phone.battery - hours * DRAIN_PER_HOUR;
  return Math.max(0, Math.min(100, b));
}

// ---------------------------------------------------------------- messages

/** What you can text a resident (the game's own dialogue; these are not real people). */
export const TEXTS: readonly { id: string; text: string }[] = [
  { id: 'hi', text: 'Hey! How are you doing?' },
  { id: 'news', text: 'Any news today?' },
  { id: 'meet', text: 'Fancy meeting up soon?' },
  { id: 'thanks', text: 'Thanks for the other day 🙏' },
];

/** Their reply: something they'd say at your friendship level (and they reply to a meet-up offer by friendship). */
export function replyFrom(r: Resident, points: number, textId: string): string {
  const level = friendshipLevel(points);
  if (textId === 'meet') return level >= 2 ? 'Yes! Find me in town and we’ll hang out.' : 'Maybe another time, I’m a bit busy.';
  return r.lines[level];
}

export const unreadCount = (phone: Pick<PhoneState, 'inbox'>) => phone.inbox.filter((n) => !n.read).length;

// ---------------------------------------------------------------- notifications

/** Ledger lines that run all day (one line each) and would only be noise as alerts. */
const QUIET_LINES = new Set(['Wages', 'Living costs', 'Fuel']);

function appForLine(label: string): AppId {
  if (label.startsWith('Taxi')) return 'ride';
  if (label.includes('Spa')) return 'spa';
  if (label.startsWith('Car:') || label.startsWith('Sold car')) return 'cars';
  if (label.startsWith('Rent') || label.startsWith('Move-in') || label.startsWith('Bought:')) return 'houses';
  if (label.startsWith('Travel')) return 'travel';
  return 'bank';
}

const ghai = (n: number) => `${n > 0 ? '+' : '−'}${Math.abs(Math.round(n)).toLocaleString()} GHAI`;

/** What the phone tells you about a change in your life: money in or out, the morning statement, promotions, achievements and today's event. */
export function notificationsFor(prev: GameState, next: GameState): Omit<PhoneNotification, 'id' | 'read'>[] {
  if (prev === next) return [];
  const t = next.time.totalMinutes;
  const out: Omit<PhoneNotification, 'id' | 'read'>[] = [];
  const key = (e: { t: number; label: string; amount: number }) => `${e.t}|${e.label}|${e.amount}`;
  const had = new Set(prev.life.ledger.map(key));
  for (const e of next.life.ledger) {
    if (had.has(key(e)) || QUIET_LINES.has(e.label) || e.label.startsWith('Rent') || !e.amount) continue;
    out.push({ app: appForLine(e.label), title: ghai(e.amount), body: e.label, t });
  }
  if (!prev.summary && next.summary) {
    const s = next.summary;
    out.push({ app: 'bank', title: 'Good morning', body: `Yesterday: ${ghai(s.netChange)}${s.rent ? ` · rent ${s.rent.toLocaleString()} GHAI` : ''}`, t });
    if (s.promotedTo) out.push({ app: 'jobs', title: 'Promoted!', body: `You're now ${s.promotedTo}.`, t });
    if (s.evicted) out.push({ app: 'houses', title: 'You lost your home', body: 'The rent couldn’t be paid. Find a place in Houses.', t });
  }
  const seen = new Set(prev.life.celebrations.map((c) => c.id));
  for (const c of next.life.celebrations) if (!seen.has(c.id)) out.push({ app: 'life', title: c.kind, body: c.text, t });
  const day = gameDay(t);
  if (day !== gameDay(prev.time.totalMinutes) || prev.districtId !== next.districtId) {
    const e = eventToday(next.districtId, day);
    if (e) out.push({ app: 'events', title: 'On today', body: `${e.title(districtById(next.districtId))}, ${String(e.from).padStart(2, '0')}:00–${String(e.to % 24).padStart(2, '0')}:00`, t });
  }
  return out;
}

/** Adds notifications to the inbox (newest last, the oldest dropped). */
export function deliver(phone: PhoneState, items: readonly Omit<PhoneNotification, 'id' | 'read'>[]): PhoneState {
  if (!items.length || !phone.notifications) return phone;
  const stamp = Date.now().toString(36);
  const added = items.map((n, i) => ({ ...n, id: `${stamp}-${i}-${phone.inbox.length}`, read: false }));
  return { ...phone, inbox: [...phone.inbox, ...added].slice(-MAX_NOTIFICATIONS) };
}
