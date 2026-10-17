import { describe, expect, it } from 'vitest';
import { DISTRICTS } from '../geography';
import { SUBDIVISIONS } from '../places';
import { generateDistrict, TEMPLATES } from './generate';
import { NIGERIA, SOUTH_WEST } from './nigeria';
import { districtById } from '../geography';
import { travelOptions } from '../travel';

describe('generated districts', () => {
  it('cover every Nigerian state, the Federal Capital Territory included', () => {
    const regions = new Set(DISTRICTS.filter((d) => d.city.country === 'NG').map((d) => d.city.region));
    for (const state of SUBDIVISIONS.NG.names) expect(regions.has(state), state).toBe(true);
  });

  it('have unique ids, cities and homes', () => {
    const ids = DISTRICTS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(DISTRICTS.map((d) => d.city.id)).size).toBe(DISTRICTS.length);
    const homes = DISTRICTS.flatMap((d) => d.homes.map((h) => h.id));
    expect(new Set(homes).size).toBe(homes.length);
    for (const d of DISTRICTS) for (const h of d.homes) expect(h.district).toBe(d.id);
  });

  it('use both street plans, laid every way', () => {
    const seen = new Set(NIGERIA.map((c) => {
      const d = generateDistrict(c);
      return `${d.layout.buildings.length}:${Math.sign(d.layout.crossStreet.minZ)}:${Math.sign(d.travelDesk.position[0])}`;
    }));
    expect(seen.size).toBeGreaterThanOrEqual(6);
  });

  it('are the same every time', () => {
    expect(generateDistrict(NIGERIA[0])).toEqual(generateDistrict(NIGERIA[0]));
  });

  it('turning a plan round keeps buildings, counters and benches in step', () => {
    const seed = { ...NIGERIA[0], style: SOUTH_WEST };
    const asBuilt = generateDistrict({ ...seed, template: 'marina', variant: 'as-built' });
    const turned = generateDistrict({ ...seed, template: 'marina', variant: 'turned' });
    const L = TEMPLATES.marina.spec;
    expect(asBuilt.travelDesk.position).toEqual(L.travelDesk.position);
    expect(turned.travelDesk.position).toEqual([-L.travelDesk.position[0], 0, -L.travelDesk.position[2]]);
    const b = turned.layout.park!.benches[0], o = L.layout.park!.benches[0];
    expect(b.x).toBeCloseTo(-o.x);
    expect(Math.cos(b.facing - o.facing)).toBeCloseTo(-1);
    // Parked buses stay on the right-hand kerb, facing the way the traffic goes
    for (const v of turned.layout.vehicles) expect(Math.cos(v.heading)).toBeCloseTo(Math.sign(v.position[0]));
  });

  it('name the shops and homes after the city, and price them for it', () => {
    const abuja = DISTRICTS.find((d) => d.city.id === 'abuja')!;
    const yenagoa = DISTRICTS.find((d) => d.city.id === 'yenagoa')!;
    expect(abuja.travelDesk.name).toBe('Abuja Travel');
    expect(abuja.layout.buildings.some((b) => b.name === abuja.nightlife.name)).toBe(true);
    expect(Math.max(...abuja.homes.map((h) => h.rentPerNight))).toBeGreaterThan(Math.max(...yenagoa.homes.map((h) => h.rentPerNight)));
  });

  it('reach every African country, and island capitals by air only', () => {
    const AFRICA = ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH',
      'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW'];
    expect(AFRICA).toHaveLength(54);
    const countries = new Set(DISTRICTS.map((d) => d.city.country));
    for (const c of AFRICA) expect(countries.has(c), c).toBe(true);
    const lagos = districtById('lagos.marina').city;
    const city = (id: string) => DISTRICTS.find((d) => d.city.id === id)!.city;
    expect(travelOptions(lagos, city('porto-novo')).map((o) => o.mode)).toEqual(['coach']);
    expect(travelOptions(lagos, city('lome')).map((o) => o.mode)).toEqual(['coach', 'flight']);
    expect(travelOptions(lagos, city('nairobi')).map((o) => o.mode)).toEqual(['flight']);
    expect(travelOptions(city('maputo'), city('antananarivo')).map((o) => o.mode)).toEqual(['flight']);
    expect(travelOptions(city('yaounde'), city('malabo')).map((o) => o.mode)).toEqual(['flight']);
  });
});
