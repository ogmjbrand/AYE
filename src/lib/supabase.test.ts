import { describe, expect, it } from 'vitest';
import { isPublishableSupabaseKey, isSafeSupabaseUrl } from './supabase';

const encode = (value: string) => btoa(value).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

describe('Supabase client configuration guards', () => {
  it('accepts HTTPS project URLs and local loopback URLs only', () => {
    expect(isSafeSupabaseUrl('https://aye-project.supabase.co')).toBe(true);
    expect(isSafeSupabaseUrl('http://127.0.0.1:54321')).toBe(true);
    expect(isSafeSupabaseUrl('http://localhost:54321')).toBe(true);
    expect(isSafeSupabaseUrl('http://aye-project.supabase.co')).toBe(false);
    expect(isSafeSupabaseUrl('https://user:pass@aye-project.supabase.co')).toBe(false);
  });

  it('accepts publishable and anon keys but rejects secret and service-role keys', () => {
    const anonKey = `header.${encode('{"role":"anon"}')}.signature`;
    const serviceKey = `header.${encode('{"role":"service_role"}')}.signature`;
    expect(isPublishableSupabaseKey('sb_publishable_example')).toBe(true);
    expect(isPublishableSupabaseKey(anonKey)).toBe(true);
    expect(isPublishableSupabaseKey('sb_secret_example')).toBe(false);
    expect(isPublishableSupabaseKey(serviceKey)).toBe(false);
    expect(isPublishableSupabaseKey('not-a-key')).toBe(false);
  });
});
