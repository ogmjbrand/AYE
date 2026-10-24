import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The connection to the AYE backend (Supabase). Configured from
 * `.env.local` (git-ignored), never from code:
 *
 *   VITE_SUPABASE_URL=https://<project>.supabase.co
 *   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
 *
 * Only the publishable key belongs in the game: it can do no more than the
 * database's row-level security allows a signed-in player. The service-role
 * (secret) key must never be put here. Without the settings there is no
 * client and the game plays offline, saving in the browser as before.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

/** Refuses a secret key by mistake: those start "sb_secret_" (or are a service_role JWT). */
function isSecret(k: string) {
  if (k.startsWith('sb_secret_')) return true;
  try {
    const payload = JSON.parse(atob(k.split('.')[1] ?? ''));
    return payload?.role === 'service_role';
  } catch {
    return false;
  }
}

export const backendConfigured = !!url && !!key && !isSecret(key);

export const supabase: SupabaseClient | null = backendConfigured
  ? createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

if (url && key && isSecret(key)) console.error('[AYE backend] A secret key was put in the game settings. It has been ignored; use the publishable key.');
