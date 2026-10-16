import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, nextQualityMode, parseSettings, saveSettings } from './settings';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(k: string) { return this.data.get(k) ?? null; }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  removeItem(k: string) { this.data.delete(k); }
  setItem(k: string, v: string) { this.data.set(k, v); }
}

describe('settings', () => {
  it('round-trips the quality preference', () => {
    const s = new MemoryStorage();
    saveSettings({ quality: 'low' }, s);
    expect(loadSettings(s)).toEqual({ quality: 'low' });
  });

  it('falls back to defaults for missing, corrupt or unknown values', () => {
    const s = new MemoryStorage();
    expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS);
    s.setItem('aye_settings', '{not json');
    expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ quality: 'ultra' })).toEqual(DEFAULT_SETTINGS);
  });

  it('cycles auto → high → low → auto', () => {
    expect([nextQualityMode('auto'), nextQualityMode('high'), nextQualityMode('low')]).toEqual(['high', 'low', 'auto']);
  });
});
