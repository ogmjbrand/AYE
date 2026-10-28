import { supabaseClient as supabase } from '../lib/supabase';

/**
 * Player accounts (Supabase Auth) and each player's profile row
 * (public.player_profiles, migration 20261018120000).
 *
 * The database is the authority. A player can read only their own profile
 * row, and can never insert or update it directly: profiles are created and
 * changed through the owner-bound functions `create_player_profile` and
 * `update_player_profile`, which take the id from the signed-in session, so a
 * client can't write someone else's row. Every call here fails softly with a
 * message when no backend is configured, so the game always works offline.
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

export type MessagingPrivacy = 'nobody' | 'friends' | 'everyone';

export interface PlayerProfile {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  discoverable: boolean;
  messaging_privacy: MessagingPrivacy;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileFields {
  username: string;
  display_name: string;
  bio?: string;
  discoverable?: boolean;
  messaging_privacy?: MessagingPrivacy;
}

/** The signed-in player's own profile row, or null if they haven't made one yet. RLS returns nobody else's. */
export async function loadProfile(userId: string) {
  if (!supabase) return OFFLINE;
  return await supabase
    .from('player_profiles')
    .select('id, username, display_name, bio, discoverable, messaging_privacy, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle<PlayerProfile>();
}

/**
 * Creates the signed-in player's profile, or updates it if they already have
 * one. The defaults match the database's: private (not discoverable) and
 * messages from friends only.
 */
export async function saveProfile(fields: ProfileFields, exists: boolean) {
  if (!supabase) return OFFLINE;
  const values = {
    p_username: fields.username.trim().toLowerCase(),
    p_display_name: fields.display_name.trim(),
    p_bio: (fields.bio ?? '').trim(),
    p_discoverable: fields.discoverable ?? false,
    p_messaging_privacy: fields.messaging_privacy ?? 'friends',
  };
  return await supabase.rpc(exists ? 'update_player_profile' : 'create_player_profile', values);
}

/** A username as the database accepts it: 3–24 lowercase letters, digits or underscores. */
export const validUsername = (u: string) => /^[a-z0-9_]{3,24}$/.test(u.trim().toLowerCase());

/** A display name: 1–40 characters once trimmed. */
export const validDisplayName = (n: string) => n.trim().length >= 1 && n.trim().length <= 40;
