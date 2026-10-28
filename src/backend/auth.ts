import { supabase } from './supabase';

/**
 * Player accounts (Supabase Auth, email and password) and each player's
 * profile row (public.player_profiles, readable and writable only by its
 * owner). Every call fails softly with a message when the game has no backend
 * configured, so the game always works offline.
 */
const OFFLINE = { data: null, error: { message: 'Accounts are not available: the game is offline.' } } as const;

// Register a new player
export async function registerPlayer(email: string, password: string) {
  if (!supabase) return OFFLINE;
  return await supabase.auth.signUp({ email, password });
}

// Sign in an existing player
export async function loginPlayer(email: string, password: string) {
  if (!supabase) return OFFLINE;
  return await supabase.auth.signInWithPassword({ email, password });
}

// Sign out
export async function logoutPlayer() {
  if (!supabase) return { error: null };
  return await supabase.auth.signOut();
}

export interface PlayerProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at?: string;
}

/** The signed-in player's profile row, or null if they haven't made one yet. */
export async function loadProfile(userId: string) {
  if (!supabase) return OFFLINE;
  return await supabase.from('player_profiles').select('id, username, display_name, avatar_url, created_at').eq('id', userId).maybeSingle<PlayerProfile>();
}

/** Creates or updates the signed-in player's own profile (the database only allows their own row). */
export async function saveProfile(userId: string, fields: { username: string; display_name: string }) {
  if (!supabase) return OFFLINE;
  return await supabase.from('player_profiles').upsert({ id: userId, ...fields }).select().single<PlayerProfile>();
}

/** A username: 3–20 letters, digits or underscores. */
export const validUsername = (u: string) => /^[A-Za-z0-9_]{3,20}$/.test(u);
