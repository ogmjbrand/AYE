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
    expect(countryName('NG')).toBe('Nigeria');
  });
});

describe('states and regions', () => {
  it('has the official number of subdivisions', () => {
    const counts = Object.fromEntries(Object.entries(SUBDIVISIONS).map(([k, v]) => [k, v.names.length]));
    expect(counts).toEqual({ NG: 37, GH: 16, KE: 47, ZA: 9, US: 51, GB: 4, CA: 13, IN: 36 });
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
    expect(formatHome('NG', 'Lagos')).toBe('Lagos, Nigeria');
    expect(formatHome('FR', '  ')).toBe('France');
  });
});
