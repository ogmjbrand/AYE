import { describe, expect, it } from 'vitest';
import { DISTRICTS, districtById, placeById } from './geography';
import { homeById } from './homes';
import { RESIDENTS, residentById } from './people';
import { CITY_NAMES, LEGACY_STATE, SONGHAI, STATES, isSonghaiDistrict, songhaiRegion, stateOfCity, validateSonghai } from './songhai';
import { countryName } from './places';

const songhai = DISTRICTS.filter((d) => d.city.country === SONGHAI.code);
const REAL = ['Nigeria', 'Nigerian', 'Lagos', 'Abuja', 'Ikoyi', 'Victoria Island', 'Eko', 'Apapa', 'Onikan', 'Wuse', 'Sabon Gari', 'Dugbe', 'Taiwo Road', 'Ogui Road', 'Wetheral Road', 'Marian Road', 'Oke-Ilewo', 'Ahmadu Bello', ...Object.keys(CITY_NAMES).map((id) => id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '))]
  .filter((n) => n !== 'Ado Ekiti').concat(['Ado-Ekiti']);
const hasReal = (s: string) => REAL.find((r) => new RegExp(`\\b${r}\\b`).test(s));

describe('Songhai', () => {
  it('is the country name shown for the home country', () => {
    expect(SONGHAI.name).toBe('Songhai');
    expect(countryName(SONGHAI.code)).toBe('Songhai');
  });

  it('has the 12 states, each with a unique ID, a unique name and a capital among its playable cities', () => {
    expect(STATES.map((s) => s.name)).toEqual(['Aderan', 'Zunara', 'Kembala', 'Oruma', 'Velora', 'Nambara', 'Talenga', 'Maruva', 'Darsuna', 'Elumba', 'Korava', 'Yandora']);
    expect(validateSonghai(songhai.map((d) => d.city.id))).toEqual([]);
  });

  it('puts the national capital, the city a new life starts in, in Aderan', () => {
    const capital = districtById(null);
    expect(capital.city.id).toBe(SONGHAI.capitalCityId);
    expect(capital.city.name).toBe('Ayemara');
    expect(capital.city.region).toBe('Aderan');
    expect(stateOfCity(capital.city.id)?.id).toBe(SONGHAI.capitalStateId);
  });

  it('every Songhai district is a playable city in exactly one state, shown by its Songhai names', () => {
    expect(songhai.length).toBe(37);
    for (const d of songhai) {
      const state = stateOfCity(d.city.id)!;
      expect(state, d.id).toBeTruthy();
      expect(d.city.region).toBe(state.name);
      expect(d.city.name).toBe(CITY_NAMES[d.city.id]);
      expect(isSonghaiDistrict(d.id)).toBe(true);
    }
    expect(isSonghaiDistrict('accra.osu')).toBe(false);
  });

  it('shows no real Nigerian place names anywhere in a Songhai district or its residents', () => {
    for (const d of songhai) {
      const shown = [
        d.city.name, d.city.region, d.name, ...d.neighborhoods.flatMap((n) => [n.name, n.description]), ...d.vendors.map((v) => v.name),
        d.fashionHouse.name, d.gadgetHub.name, d.travelDesk.name, d.park.name, d.nightlife.name, d.restaurant?.name ?? '', d.dealership?.name ?? '',
        ...d.homes.flatMap((h) => [h.name, h.building, h.description]), ...Object.values(d.workplaces).map((w) => w.name),
        ...d.places.map((p) => p.name), ...d.layout.buildings.map((b) => b.name ?? ''),
      ];
      for (const s of shown) expect(hasReal(s), `${d.id}: "${s}"`).toBeUndefined();
    }
    for (const r of RESIDENTS.filter((x) => isSonghaiDistrict(x.district))) {
      for (const s of [r.role, ...r.lines]) expect(hasReal(s), `${r.id}: "${s}"`).toBeUndefined();
    }
  });

  it('keeps every ID saves refer to: districts, homes, places and residents', () => {
    expect(districtById('lagos.marina').id).toBe('lagos.marina');
    expect(districtById('abuja.wuse-2').id).toBe('abuja.wuse-2');
    expect(homeById('marina-court-room')?.district).toBe('lagos.marina');
    expect(homeById('marina-heights-penthouse')).toBeTruthy();
    expect(placeById('lagos.marina.cars.eko-motors')?.name).toBe('Ayemara Motors');
    expect(placeById('lagos.marina.restaurant.the-palms')).toBeTruthy();
    expect(residentById('tunde')?.district).toBe('lagos.marina');
    // An unknown or retired district falls back to the capital instead of failing
    expect(districtById('no-such.place').id).toBe('lagos.marina');
  });

  it('maps every former real state to a Songhai state', () => {
    expect(Object.keys(LEGACY_STATE)).toHaveLength(37);
    expect(songhaiRegion('Lagos')).toBe('Aderan');
    expect(songhaiRegion('Kembala')).toBe('Kembala');
    expect(songhaiRegion('Unknown')).toBe('Unknown');
  });
});
