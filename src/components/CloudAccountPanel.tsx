import { useEffect, useState, type FormEvent, type RefObject } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowLeft, Cloud, LoaderCircle, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { supabaseClient, supabaseConfigurationMessage } from '../lib/supabase';

interface PlayerProfile {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  discoverable: boolean;
  messaging_privacy: 'nobody' | 'friends' | 'everyone';
}

interface ProfileDraft {
  username: string;
  displayName: string;
  bio: string;
  discoverable: boolean;
  messagingPrivacy: PlayerProfile['messaging_privacy'];
}

interface CloudAccountPanelProps {
  onBack: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}

const EMPTY_PROFILE: ProfileDraft = {
  username: '',
  displayName: '',
  bio: '',
  discoverable: false,
  messagingPrivacy: 'friends',
};

const FIELD = 'mt-1 w-full rounded-lg border border-cc-line bg-cc-bg px-3 py-2 text-sm text-cc-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The request could not be completed. Please try again.';
}

function parseProfile(value: unknown): PlayerProfile | null {
  if (typeof value !== 'object' || value === null) return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== 'string' ||
    typeof row.username !== 'string' ||
    typeof row.display_name !== 'string' ||
    typeof row.bio !== 'string' ||
    typeof row.discoverable !== 'boolean' ||
    !['nobody', 'friends', 'everyone'].includes(String(row.messaging_privacy))
  ) return null;
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    bio: row.bio,
    discoverable: row.discoverable,
    messaging_privacy: row.messaging_privacy as PlayerProfile['messaging_privacy'],
  };
}

async function loadProfile(userId: string): Promise<PlayerProfile | null> {
  if (!supabaseClient) throw new Error('Cloud accounts are not configured.');
  const { data, error } = await supabaseClient
    .from('player_profiles')
    .select('id, username, display_name, bio, discoverable, messaging_privacy')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (data === null) return null;
  const profile = parseProfile(data);
  if (!profile) throw new Error('The profile response was incomplete or invalid.');
  return profile;
}

function draftFromProfile(profile: PlayerProfile): ProfileDraft {
  return {
    username: profile.username,
    displayName: profile.display_name,
    bio: profile.bio,
    discoverable: profile.discoverable,
    messagingPrivacy: profile.messaging_privacy,
  };
}

export function CloudAccountPanel({ onBack, headingRef }: CloudAccountPanelProps) {
  const client = supabaseClient;
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(!!client);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loadedProfileFor, setLoadedProfileFor] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProfileDraft>(EMPTY_PROFILE);
  const [email, setEmail] = useState('');
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!client) return;
    let mounted = true;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setProfile(null);
      setLoadedProfileFor(null);
      setSentEmail(null);
      setError(null);
      setNotice(null);
      setAuthLoading(false);
    });
    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      setAuthLoading(false);
    }).catch((reason: unknown) => {
      if (!mounted) return;
      setError(errorMessage(reason));
      setAuthLoading(false);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [client]);

  const userId = session?.user.id ?? null;
  const profileLoading = userId !== null && loadedProfileFor !== userId;

  useEffect(() => {
    if (!client || !userId) return;
    let mounted = true;
    void loadProfile(userId).then((loaded) => {
      if (!mounted) return;
      setProfile(loaded);
      setDraft(loaded ? draftFromProfile(loaded) : EMPTY_PROFILE);
      setError(null);
      setLoadedProfileFor(userId);
    }).catch((reason: unknown) => {
      if (!mounted) return;
      setError(errorMessage(reason));
      setLoadedProfileFor(userId);
    });
    return () => { mounted = false; };
  }, [client, userId]);

  const requestSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { error: authError } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (authError) throw authError;
      setSentEmail(email.trim());
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client || !userId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const values = {
      p_username: draft.username.trim().toLowerCase(),
      p_display_name: draft.displayName.trim(),
      p_bio: draft.bio.trim(),
      p_discoverable: draft.discoverable,
      p_messaging_privacy: draft.messagingPrivacy,
    };
    try {
      const result = profile
        ? await client.rpc('update_player_profile', values)
        : await client.rpc('create_player_profile', values);
      if (result.error) throw result.error;
      const updated = await loadProfile(userId);
      if (!updated) throw new Error('The profile was saved but could not be loaded.');
      setProfile(updated);
      setDraft(draftFromProfile(updated));
      setNotice('Profile saved. Your local game save was not changed.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    if (!client) return;
    setBusy(true);
    setError(null);
    try {
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm text-cc-muted hover:text-cc-ink">
        <ArrowLeft size={16} aria-hidden="true" />Back
      </button>
      <div className="flex items-center gap-2">
        <Cloud size={20} aria-hidden="true" className="text-cc-gold" />
        <h2 ref={headingRef} tabIndex={-1} className="m-0 font-display text-xl font-bold">AYE Connect account</h2>
      </div>
      <p className="mt-2 text-sm text-cc-muted">
        This account and profile are separate from the life saved on this device. Nothing is uploaded or merged automatically.
      </p>

      {!client ? (
        <div role="status" className="mt-4 rounded-xl border border-cc-line bg-cc-bg/70 p-4 text-sm text-cc-muted">
          <p className="m-0 flex items-start gap-2">
            <ShieldCheck size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-cc-gold" />
            <span>{supabaseConfigurationMessage}</span>
          </p>
        </div>
      ) : authLoading ? (
        <p role="status" className="mt-4 flex items-center gap-2 text-sm text-cc-muted"><LoaderCircle size={16} className="animate-spin" />Checking account session…</p>
      ) : session ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-cc-line bg-cc-bg/70 p-3">
            <p className="m-0 min-w-0 truncate text-sm"><Mail size={15} aria-hidden="true" className="mr-2 inline text-cc-gold" />{session.user.email ?? 'Signed-in account'}</p>
            <button type="button" onClick={signOut} disabled={busy} className="inline-flex shrink-0 items-center gap-1.5 rounded border border-cc-line px-2.5 py-1.5 text-xs text-cc-muted hover:border-cc-gold disabled:opacity-50">
              <LogOut size={14} aria-hidden="true" />Sign out
            </button>
          </div>

          {profileLoading ? (
            <p role="status" className="mt-4 flex items-center gap-2 text-sm text-cc-muted"><LoaderCircle size={16} className="animate-spin" />Loading your profile…</p>
          ) : (
            <form onSubmit={saveProfile} className="mt-4 space-y-3">
              <h3 className="m-0 flex items-center gap-2 font-display text-lg font-semibold">
                <UserRound size={17} aria-hidden="true" className="text-cc-gold" />
                {profile ? 'Your player profile' : 'Create a player profile'}
              </h3>
              <label className="block text-sm">
                Username
                <input className={FIELD} value={draft.username} onChange={(event) => setDraft({ ...draft, username: event.target.value })} minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" autoComplete="username" required />
                <span className="mt-1 block text-xs text-cc-muted">3–24 letters, numbers or underscores. Unique and stored lowercase.</span>
              </label>
              <label className="block text-sm">
                Display name
                <input className={FIELD} value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} minLength={1} maxLength={40} autoComplete="nickname" required />
              </label>
              <label className="block text-sm">
                Bio <span className="text-cc-muted">(optional)</span>
                <textarea className={FIELD} value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} maxLength={160} rows={2} />
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={draft.discoverable} onChange={(event) => setDraft({ ...draft, discoverable: event.target.checked })} className="mt-1 accent-cc-gold" />
                <span>Let signed-in players find this profile by username. Off by default.</span>
              </label>
              <label className="block text-sm">
                Who may message you <span className="text-cc-muted">(applies when messaging is enabled)</span>
                <select className={FIELD} value={draft.messagingPrivacy} onChange={(event) => setDraft({ ...draft, messagingPrivacy: event.target.value as ProfileDraft['messagingPrivacy'] })}>
                  <option value="nobody">Nobody</option>
                  <option value="friends">Friends only</option>
                  <option value="everyone">Everyone</option>
                </select>
              </label>
              <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cc-gold px-4 py-2.5 font-display font-bold text-cc-bg hover:bg-cc-gold-strong disabled:opacity-50">
                {busy ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {profile ? 'Save profile' : 'Create profile'}
              </button>
            </form>
          )}
        </div>
      ) : (
        <form onSubmit={requestSignIn} className="mt-4 space-y-3">
          <label className="block text-sm">
            Email address
            <input className={FIELD} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>
          <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cc-gold px-4 py-2.5 font-display font-bold text-cc-bg hover:bg-cc-gold-strong disabled:opacity-50">
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Mail size={16} />}
            Email me a sign-in link
          </button>
          <p className="m-0 text-xs text-cc-muted">If email sign-in and new accounts are enabled for this Supabase project, the link will sign you in or create your account.</p>
          {sentEmail && <p role="status" className="m-0 rounded-lg border border-cc-line p-3 text-sm">Check {sentEmail} for your sign-in link.</p>}
        </form>
      )}

      {error && <p role="alert" className="mb-0 mt-4 rounded-lg border border-red-400/40 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="mb-0 mt-4 rounded-lg border border-cc-line bg-cc-bg/70 p-3 text-sm text-cc-ink">{notice}</p>}
    </div>
  );
}
