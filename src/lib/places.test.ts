import { describe, expect, it } from 'vitest';
import { COUNTRY_CODES, countryName, countryOptions, formatHome, regionTerm, SUBDIVISIONS } from './places';

describe('countries', () => {
  it('every code is a real region the browser can name', () => {
    for (const code of COUNTRY_CODES) {
      expect(code).toMatch(/^[A-Z]{2}$/);
      expect(countryName(code), code).not.toBe(code);
    }
  });

  it('covers all 193 UN member states plus extras, with no duplicates', () => {
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length);
    expect(COUNTRY_CODES.length).toBe(193 + 7);
  });

  it('lists countries by name', () => {
    const names = countryOptions().map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    // AYE's own country keeps the code NG
    expect(countryName('NG')).toBe('Songhai');
    expect(countryName('GH')).toBe('Ghana');
  });
});

describe('states and regions', () => {
  it('has the official number of subdivisions (Songhai: its 12 states)', () => {
    const counts = Object.fromEntries(Object.entries(SUBDIVISIONS).map(([k, v]) => [k, v.names.length]));
    expect(counts).toEqual({ NG: 12, GH: 16, KE: 47, ZA: 9, US: 51, GB: 4, CA: 13, IN: 36 });
  });

  it('has no duplicate names and only lists known countries', () => {
    for (const [code, s] of Object.entries(SUBDIVISIONS)) {
      expect(COUNTRY_CODES).toContain(code);
      expect(new Set(s.names).size, code).toBe(s.names.length);
    }
  });

  it('labels and formats a home', () => {
    expect(regionTerm('KE')).toBe('County');
    expect(regionTerm('FR')).toBe('State / region');
    expect(formatHome('NG', 'Aderan')).toBe('Aderan, Songhai');
    // A home saved as a former real state shows its Songhai state
    expect(formatHome('NG', 'Lagos')).toBe('Aderan, Songhai');
    expect(formatHome('NG', 'Enugu')).toBe('Darsuna, Songhai');
    expect(formatHome('FR', '  ')).toBe('France');
  });
});
