import { createClient } from '@supabase/supabase-js';

export function isSafeSupabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    return (url.protocol === 'https:' || (local && url.protocol === 'http:')) &&
      !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export function isPublishableSupabaseKey(value: string): boolean {
  if (value.startsWith('sb_publishable_')) return true;
  if (value.startsWith('sb_secret_')) return false;

  const payload = value.split('.')[1];
  if (!payload) return false;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    return JSON.parse(decoded).role === 'anon';
  } catch {
    return false;
  }
}

const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
// Either name works: Supabase's dashboard now calls it the publishable key.
const publishableKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)?.trim() ?? '';

export const supabaseConfigurationMessage = !projectUrl || !publishableKey
  ? 'Cloud accounts are not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) to the ignored .env.local file, then restart Vite.'
  : !isSafeSupabaseUrl(projectUrl)
    ? 'VITE_SUPABASE_URL must be an HTTPS project URL. HTTP is allowed only for a local Supabase instance.'
    : !isPublishableSupabaseKey(publishableKey)
      ? 'The Supabase key must be a Supabase publishable or anon key. Secret and service-role keys are rejected.'
      : null;

export const supabaseClient = supabaseConfigurationMessage === null
  ? createClient(projectUrl, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  })
  : null;
